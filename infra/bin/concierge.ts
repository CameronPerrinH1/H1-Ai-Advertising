// CDK app. Examples:
//   pnpm --filter @concierge/infra synth -c deployment=glow-med-spa-staging
//   pnpm --filter @concierge/infra deploy -c deployment=glow-med-spa-staging -c handoffEmail=test@agency.example
// handoffEmail (staging only): a verified address that receives the demo spa's handoff emails.
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { App } from 'aws-cdk-lib';
import { loadClient } from '@concierge/backend';
import { ConciergeStack } from '../lib/concierge-stack.ts';
import { DEPLOYMENTS } from '../lib/deployments.ts';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const app = new App();
const deploymentName: string = app.node.tryGetContext('deployment') ?? 'glow-med-spa-staging';
const d = DEPLOYMENTS[deploymentName];
if (!d) throw new Error(`Unknown deployment "${deploymentName}". Known: ${Object.keys(DEPLOYMENTS).join(', ')}`);

const c = loadClient(d.clientId).config;
const handoffEmail: string | undefined = app.node.tryGetContext('handoffEmail');
if (handoffEmail && (d.stage !== 'staging' || !c.demo)) throw new Error('handoffEmail is only for staging stacks of demo clients.');
const senderDomain = c.handoff.email_from.split('@')[1]!;

new ConciergeStack(app, `Concierge-${deploymentName}`, {
  // WAF for CloudFront lives in us-east-1, and so does everything else (3.1).
  env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: 'us-east-1' },
  clientId: d.clientId,
  stage: d.stage,
  repoRoot,
  widgetDist: join(repoRoot, 'widget/dist'),
  modelIds: [...new Set([c.model.id, c.model.summarizer_id].filter((m): m is string => !!m))],
  business: { name: c.business.name, phone: c.business.phone, bookingUrl: c.booking.direct_links.default },
  embedOrigins: c.security.allowed_domains.flatMap((domain) => [`https://${domain}`, `https://www.${domain}`]),
  domain: d.domain,
  alarmEmail: app.node.tryGetContext('alarmEmail') ?? d.alarmEmail,
  monthlyBudgetUsd: d.monthlyBudgetUsd,
  audit: d.audit,
  sesIdentity: handoffEmail ? { email: handoffEmail } : c.demo ? undefined : { domain: senderDomain },
  handoffOverride: handoffEmail ? { from: handoffEmail, to: handoffEmail } : undefined,
});
