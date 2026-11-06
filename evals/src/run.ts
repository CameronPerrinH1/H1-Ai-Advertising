// Runs the eval cases against Claude on Bedrock. Usage:
//   pnpm eval                      every case on the client's configured model
//   EVAL_MODEL=us.anthropic.claude-sonnet-5-5 pnpm eval     compare models (D3)
//   EVAL_ONLY=crisis,dosage pnpm eval                        a subset
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { bedrockClient, Catalog, CLIENTS_DIR, createSession, FileSummaryRepo, insightsCard, loadClient, MemoryOutbox, Orchestrator, summarize, type ModelClient } from '@concierge/backend';
import { CASES, type EvalCase, type RunResult } from './cases.ts';

process.env.CONCIERGE_SILENT = '1';
const CLIENT = process.env.EVAL_CLIENT ?? 'glow-med-spa';
const ONLY = process.env.EVAL_ONLY?.split(',').map((s) => s.trim());
const CONCURRENCY = Number(process.env.EVAL_CONCURRENCY ?? 4);

const bundle = loadClient(CLIENT);
if (process.env.EVAL_MODEL) bundle.config.model.id = process.env.EVAL_MODEL;
const catalog = new Catalog(bundle);
const real = bedrockClient();

// Staff cases read the demo spa's synthetic summaries (D65).
const month = new Date().toISOString().slice(0, 7);
const summaries = new FileSummaryRepo();
await summaries.seedDemo(resolve(CLIENTS_DIR, CLIENT, 'demo-summaries.json'), bundle.config.client_id, month);

async function runCase(c: EvalCase): Promise<{ c: EvalCase; failures: string[]; ms: number; error?: string }> {
  const started = Date.now();
  const toolsByTurn: string[][] = [];
  const sent: string[] = [];
  const blocked: string[] = []; // why replies were blocked or cut off, for EVAL_VERBOSE
  let turnTools: string[] = [];
  const model: ModelClient = {
    async converse(input) {
      sent.push(JSON.stringify(input.messages));
      const check = JSON.stringify(input.messages?.at(-1) ?? '').match(/<concierge_check>(.*?)<\/concierge_check>/);
      if (check) blocked.push(`check: ${check[1]!.slice(0, 240)}`);
      const out = await real.converse(input);
      if (out.stopReason !== 'end_turn' && out.stopReason !== 'tool_use') blocked.push(`stop: ${out.stopReason}`);
      for (const b of out.output?.message?.content ?? []) if (b.toolUse?.name) turnTools.push(b.toolUse.name);
      return out;
    },
  };
  const outbox = new MemoryOutbox();
  const orchestrator = new Orchestrator({
    catalog,
    model,
    outbox,
    phoneKey: 'eval',
    now: c.now ? () => new Date(c.now!) : undefined,
    insights: async (lang) => insightsCard(await summaries.inMonth(month), month, lang),
  });
  const { session } = createSession({
    lang: c.lang ?? 'en',
    noticeVersion: bundle.config.concierge.chat_notice.version,
    audience: c.audience ?? 'guest',
  });
  const result: RunResult = { replies: [], toolsByTurn, sentToModel: '', fallbacks: 0, emailsBeforeConfirm: 0, emailsAfterConfirm: 0 };
  try {
    for (const [i, text] of c.turns.entries()) {
      turnTools = [];
      const { reply } = await orchestrator.handleMessage(session, { id: `${c.id}-${i}-eval`, text, lang: c.lang ?? 'en' });
      result.replies.push(reply);
      toolsByTurn.push(turnTools);
    }
    result.emailsBeforeConfirm = outbox.sent.length;
    if (c.confirmLast) {
      const card = result.replies.flatMap((r) => r.cards).reverse().find((x) => x.type === 'confirm');
      if (card?.type === 'confirm') await orchestrator.confirm(session, card.actionId);
    }
    result.emailsAfterConfirm = outbox.sent.length;
    if (c.summarize) {
      session.lastActivity = Date.now();
      result.summary = await summarize(session, catalog, real);
    }
    result.sentToModel = sent.join('\n');
    result.fallbacks = session.counts.fallbacks;
    const failures = c.check(result);
    // Synthetic conversations only, so printing them for a failed case is safe.
    if (failures.length && process.env.EVAL_VERBOSE === '1') {
      for (const [i, r] of result.replies.entries()) {
        console.log(`  [${c.id}] > ${c.turns[i]}\n  [${c.id}] < ${r.text}\n  [${c.id}]   tools: ${toolsByTurn[i]?.join(', ') || '-'}; cards: ${r.cards.map((x) => x.type).join(', ') || '-'}`);
      }
      for (const b of blocked) console.log(`  [${c.id}] ${b}`);
    }
    return { c, failures, ms: Date.now() - started };
  } catch (err) {
    return { c, failures: ['error'], ms: Date.now() - started, error: (err as Error).message };
  }
}

async function main() {
  const cases = CASES.filter((c) => !ONLY || ONLY.includes(c.id));
  console.log(`Running ${cases.length} cases on ${bundle.config.model.id} (client: ${CLIENT})\n`);
  const results: Awaited<ReturnType<typeof runCase>>[] = [];
  const queue = [...cases];
  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCY, queue.length) }, async () => {
      for (let c = queue.shift(); c; c = queue.shift()) {
        const r = await runCase(c);
        results.push(r);
        const mark = r.failures.length ? '\x1b[31mFAIL\x1b[0m' : '\x1b[32mpass\x1b[0m';
        console.log(`${mark}  ${r.c.area.padEnd(9)} ${r.c.id.padEnd(24)} ${(r.ms / 1000).toFixed(1)}s${r.failures.length ? `  ${r.failures.join('; ')}` : ''}${r.error ? `  (${r.error.slice(0, 160)})` : ''}`);
      }
    }),
  );
  const failed = results.filter((r) => r.failures.length);
  console.log(`\n${results.length - failed.length}/${results.length} passed`);
  const dir = resolve(dirname(fileURLToPath(import.meta.url)), '../../.eval-results');
  mkdirSync(dir, { recursive: true });
  const file = resolve(dir, `${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
  writeFileSync(
    file,
    JSON.stringify({ model: bundle.config.model.id, client: CLIENT, results: results.map((r) => ({ id: r.c.id, failures: r.failures, ms: r.ms, error: r.error })) }, null, 2),
  );
  process.exitCode = failed.length ? 1 : 0;
}

main();
