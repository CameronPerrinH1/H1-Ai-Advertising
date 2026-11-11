// Builds everything the API needs from environment settings. With the stack's settings (table
// names, SES configuration set, secrets) it runs on AWS services; without them it uses the local
// stand-ins: in-memory sessions (flagged chats also in a file), a summaries file, the .outbox/
// folder, and a kill-switch file.
import { randomBytes } from 'node:crypto';
import { join } from 'node:path';
import { GetSecretValueCommand, SecretsManagerClient } from '@aws-sdk/client-secrets-manager';
import type { Card, Lang } from '@concierge/shared';
import { CLIENTS_DIR, loadClient, type ClientBundle } from './config/load.ts';
import { Catalog, localClock } from './catalog.ts';
import { Orchestrator } from './orchestrator.ts';
import { bedrockClient, type ModelClient } from './model/bedrock.ts';
import { FileOutbox, type Outbox } from './handoff/email.ts';
import { SesOutbox } from './handoff/ses.ts';
import { controlFromEnv, type Control } from './control.ts';
import { MemorySessionRepo, type SessionRepo } from './session/store.ts';
import { DynamoSessionRepo } from './session/dynamo.ts';
import { FileSummaryRepo, LOCAL_DATA_DIR, type SummaryRepo } from './summary/store.ts';
import { DynamoSummaryRepo } from './summary/dynamo.ts';
import { insightsCard } from './summary/insights.ts';
import { log } from './log.ts';
import { VagaroAvailability, type AvailabilitySource, type HoldWriter, type VagaroCredentials } from './booking/availability.ts';

export interface Runtime {
  bundle: ClientBundle;
  catalog: Catalog;
  model: ModelClient;
  outbox: Outbox;
  orchestrator: Orchestrator;
  sessions: SessionRepo;
  summaries: SummaryRepo;
  control: Control;
  staffCode?: string; // staff mode passcode (D64); undefined turns staff mode off
  originVerify?: string; // deployed: CloudFront sends this header, so the API can't be reached around the firewall
  currentMonth: () => string;
  onAws: boolean;
  holds?: { writer: HoldWriter; mode: 'on' | 'test' }; // where the deployment switched holds on
  today: () => string; // the spa's local date
}

type Env = Record<string, string | undefined>;

async function secret(arn: string): Promise<string> {
  const r = await new SecretsManagerClient({}).send(new GetSecretValueCommand({ SecretId: arn }));
  if (!r.SecretString) throw new Error(`Secret ${arn} is empty`);
  return r.SecretString;
}

export async function createRuntime(env: Env = process.env): Promise<Runtime> {
  const clientId = env.CLIENT_ID ?? 'glow-med-spa';
  const clientsDir = env.CONCIERGE_CLIENTS_DIR ?? CLIENTS_DIR;
  const bundle = loadClient(clientId, clientsDir);
  // Staging only: handoff emails go to a verified test address instead of the (fictional) spa.
  if (bundle.config.demo && env.HANDOFF_EMAIL_FROM && env.HANDOFF_EMAIL_TO) {
    bundle.config.handoff.email_from = env.HANDOFF_EMAIL_FROM;
    bundle.config.handoff.email_to = env.HANDOFF_EMAIL_TO;
  }
  const catalog = new Catalog(bundle);
  const model = bedrockClient();
  const tz = bundle.config.business.locations[0]!.timezone;
  const currentMonth = () => localClock(tz, new Date()).date.slice(0, 7);

  const onAws = !!env.CONCIERGE_SESSIONS_TABLE;
  if (onAws && !(env.CONCIERGE_RECORDS_TABLE && env.SES_CONFIGURATION_SET && env.PHONE_HASH_SECRET_ARN)) {
    throw new Error('Deployed settings are incomplete: records table, SES configuration set, and phone-hash secret are all required.');
  }

  const { retention } = bundle.config;
  const sessions: SessionRepo = onAws
    ? new DynamoSessionRepo(env.CONCIERGE_SESSIONS_TABLE!, { transcriptDays: retention.transcripts_days, flaggedDays: retention.flagged_transcripts_days })
    : new MemorySessionRepo({ file: join(LOCAL_DATA_DIR, `flagged-${clientId}.json`), flaggedDays: retention.flagged_transcripts_days });
  const summaries: SummaryRepo = onAws
    ? new DynamoSummaryRepo(env.CONCIERGE_RECORDS_TABLE!, bundle.config.retention.summaries_months, currentMonth)
    : FileSummaryRepo.forClient(clientId);
  const outbox: Outbox = onAws ? new SesOutbox(env.SES_CONFIGURATION_SET!) : new FileOutbox();
  // The key that hashes phone numbers for the per-phone limits and deletion requests (7.2). A fresh
  // key per process is fine locally; deployed stacks keep one in Secrets Manager.
  const phoneKey = onAws ? await secret(env.PHONE_HASH_SECRET_ARN!) : (env.PHONE_HASH_KEY ?? randomBytes(32).toString('hex'));
  // Staff mode (D64): the demo client has a local default; real clients need a code from a secret.
  const staffCode = env.STAFF_CODE_SECRET_ARN
    ? await secret(env.STAFF_CODE_SECRET_ARN)
    : (env.STAFF_ACCESS_CODE ?? (bundle.config.demo && !onAws ? 'glow-team' : undefined));

  const originVerify = env.ORIGIN_VERIFY_SECRET_ARN ? await secret(env.ORIGIN_VERIFY_SECRET_ARN) : undefined;

  if (bundle.config.demo) {
    const seeded = await summaries.seedDemo(join(clientsDir, clientId, 'demo-summaries.json'), clientId, currentMonth());
    if (seeded) log('demo_summaries_seeded', { count: seeded });
  }

  // The staff report reads this month's summaries; a one-minute cache keeps that to one read a minute.
  const cache = new Map<Lang, { at: number; card: Card }>();
  const insights = async (lang: Lang): Promise<Card> => {
    const hit = cache.get(lang);
    if (hit && Date.now() - hit.at < 60_000) return hit.card;
    const card = insightsCard(await summaries.inMonth(currentMonth()), currentMonth(), lang);
    cache.set(lang, { at: Date.now(), card });
    return card;
  };

  // Live openings (booking.availability), when the deployment names the secret with the platform's
  // API keys (BOOKING_SECRET_ID, set by the stack). Read lazily and once per container.
  const availCfg = bundle.config.booking.availability;
  let availability: AvailabilitySource | undefined;
  // Holds also need the deployment's switch: BOOKING_HOLDS=on, or test (marked "TEST –", released
  // after 10 minutes). Off by default, so a staging chat never blocks a spa's real calendar.
  // preview: the whole in-chat flow with Confirm greyed out; nothing is held or sent.
  const holdMode = env.BOOKING_HOLDS === 'on' || env.BOOKING_HOLDS === 'test' || env.BOOKING_HOLDS === 'preview' ? env.BOOKING_HOLDS : undefined;
  const writes = holdMode === 'on' || holdMode === 'test';
  let holds: Runtime['holds'];
  if (availCfg && env.BOOKING_SECRET_ID) {
    let creds: Promise<VagaroCredentials> | undefined;
    const load = () => (creds ??= secret(env.BOOKING_SECRET_ID!).then((s) => JSON.parse(s) as VagaroCredentials).catch((err) => {
      creds = undefined; // retried on the next search
      throw err;
    }));
    const vagaro = new VagaroAvailability(availCfg.business_id, load, fetch, writes && availCfg.holds.enabled ? 'read access,write employee' : 'read access');
    availability = vagaro;
    if (writes && availCfg.holds.enabled) holds = { writer: vagaro, mode: holdMode as 'on' | 'test' };
  }

  const orchestrator = new Orchestrator({ catalog, model, outbox, phoneKey, insights, availability, holds: holds?.writer, holdMode });
  const today = () => localClock(tz, new Date()).date;
  return { bundle, catalog, model, outbox, orchestrator, sessions, summaries, control: controlFromEnv(clientId), staffCode, originVerify, currentMonth, onAws, holds, today };
}
