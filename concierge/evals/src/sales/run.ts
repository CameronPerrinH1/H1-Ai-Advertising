// The sales review: plays guest conversations through the real orchestrator (same prompt, tools,
// output checks and early stop as production), checks every reply against the house rules in code,
// has a stronger model grade each conversation, and writes results.json and report.html.
//
//   pnpm eval:sales                                   Plumb + Pine on its configured model, graded by Opus 5.5
//   EVAL_THINKING=off pnpm eval:sales                 the same with thinking off
//   EVAL_MODEL=us.anthropic.claude-sonnet-5-5 ...     another chat model (EVAL_EFFORT=low|medium|high)
//   EVAL_ONLY=thinning-chip,price-steep-scalp ...     a subset; EVAL_REPEAT=3 runs each one three times
//   EVAL_GRADER=none ...                              skip grading (code checks only)
// Synthetic guests only, so transcripts are safe to save and share.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { bedrockClient, Catalog, catalogBlock, createSession, FixedAvailability, fixedBlock, loadClient, MemoryOutbox, Orchestrator, type ModelClient } from '@concierge/backend';
import { SCENARIOS, type Scenario, type Step } from './scenarios.ts';
import { codeChecks } from './checks.ts';
import { describeCards, type Run, type Turn } from './types.ts';
import { grade } from './grade.ts';
import { renderReport } from './report.ts';

process.env.CONCIERGE_SILENT = '1';
const CLIENT = process.env.EVAL_CLIENT ?? 'plumb-and-pine';
const ONLY = process.env.EVAL_ONLY?.split(',').map((s) => s.trim());
const REPEAT = Number(process.env.EVAL_REPEAT ?? 1);
const CONCURRENCY = Number(process.env.EVAL_CONCURRENCY ?? 6);
const GRADER = process.env.EVAL_GRADER ?? 'us.anthropic.claude-opus-5-5';
const GUEST_MODEL = process.env.EVAL_GUEST_MODEL ?? 'us.anthropic.claude-haiku-5-5';

const bundle = loadClient(CLIENT);
const m = bundle.config.model;
if (process.env.EVAL_MODEL) m.id = process.env.EVAL_MODEL;
if (process.env.EVAL_EFFORT) m.effort = process.env.EVAL_EFFORT as typeof m.effort;
if (process.env.EVAL_THINKING) m.thinking = process.env.EVAL_THINKING as typeof m.thinking;
const catalog = new Catalog(bundle);
const real = bedrockClient();
const TODAY = new Date().toISOString().slice(0, 10);
const tomorrow = () => new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);

const GUEST_SYSTEM = (persona: string) =>
  [
    "You are role-playing a guest chatting with the website chat of Plumb + Pine, a skin and scalp studio. Stay in character.",
    `Your character: ${persona}`,
    'Write only your next message: short and casual, like a real person typing on a phone (usually under 20 words).',
    'The chat shows tappable reply chips after some messages. If one says what you would say, you may reply with exactly that chip text.',
    'If a request card asks you to confirm and you want to go ahead, reply exactly [CONFIRM].',
    "When you would stop chatting (you'd book now, or you'd leave), reply exactly [DONE].",
  ].join('\n');

async function guestSays(persona: string, turns: Turn[], opener: string): Promise<string> {
  if (!turns.length) return opener;
  const lines: string[] = [];
  for (const t of turns) {
    lines.push(`You: ${t.guest}`);
    lines.push(`Chat: ${t.reply.text}`);
    for (const d of describeCards(t.reply.cards)) lines.push(`Chat shows: ${d}`);
  }
  const chips = turns.at(-1)!.reply.quickReplies;
  if (chips.length) lines.push(`Chips you can tap: ${chips.map((c) => `"${c}"`).join(', ')}`);
  const out = await real.converse({
    modelId: GUEST_MODEL,
    system: [{ text: GUEST_SYSTEM(persona) }],
    messages: [{ role: 'user', content: [{ text: `${lines.join('\n')}\n\nYour next message:` }] }],
    inferenceConfig: { maxTokens: 300 },
    additionalModelRequestFields: { thinking: { type: 'disabled' } } as never,
  });
  return (out.output?.message?.content ?? []).map((b) => b.text ?? '').join('').trim().replace(/^"|"$/g, '');
}

async function play(s: Scenario, copy: number): Promise<Run> {
  let calls = 0;
  let blocked: string[] = []; // why replies were blocked this turn (the output checks' feedback)
  const model: ModelClient = {
    async converse(input) {
      calls++;
      const check = JSON.stringify(input.messages?.at(-1) ?? '').match(/<concierge_check>(.*?)<\/concierge_check>/);
      if (check) blocked.push(check[1]!.replace(/\\"/g, '"').slice(0, 300));
      return real.converse(input);
    },
  };
  // Openings come from fixed data, never the spa's real calendar (D41).
  const availability = catalog.config.booking.availability ? new FixedAvailability(() => tomorrow()) : undefined;
  const holdsOn = !!availability && !!catalog.config.booking.availability?.holds.enabled && process.env.EVAL_HOLDS !== 'off';
  const orchestrator = new Orchestrator({ catalog, model, outbox: new MemoryOutbox(), phoneKey: 'eval', availability, ...(holdsOn ? { holds: availability, holdMode: 'on' as const } : {}) });
  const { session } = createSession({ lang: 'en', noticeVersion: bundle.config.concierge.chat_notice.version, audience: 'guest' });
  const run: Run = { scenario: s, copy, turns: [], flags: [] };
  const page = s.page ?? '/home-chat';

  const send = async (text: string, via: Turn['via']) => {
    calls = 0;
    blocked = [];
    const before = session.counts.fallbacks;
    const t0 = Date.now();
    const { reply } = await orchestrator.handleMessage(session, { id: `${s.id}-${copy}-${run.turns.length}-eval`, text, lang: 'en', page });
    run.turns.push({ guest: text, via, reply, ms: Date.now() - t0, modelCalls: calls, fellBack: session.counts.fallbacks > before, blocked: [...blocked], flags: [] });
  };
  const confirm = async () => {
    const card = run.turns.flatMap((t) => t.reply.cards).reverse().find((c) => c.type === 'confirm');
    if (card?.type !== 'confirm') {
      run.flags.push({ rule: 'confirm-missing', severity: 'major', note: 'The guest went to tap Confirm, but no request card was shown.' });
      return false;
    }
    const t0 = Date.now();
    const res = await orchestrator.confirm(session, card.actionId);
    run.turns.push({ guest: '[taps Confirm]', via: 'confirm', reply: res.reply, ms: Date.now() - t0, modelCalls: 0, flags: [] });
    return true;
  };
  const step = async (st: Step) => {
    if (typeof st === 'string') return send(st, 'typed');
    if ('confirm' in st) return void (await confirm());
    const chips = run.turns.at(-1)?.reply.quickReplies ?? [];
    const chip = typeof st.chip === 'number' ? chips[st.chip] : chips.find((c) => c.toLowerCase().includes(String(st.chip).toLowerCase()));
    if (!chip) {
      run.flags.push({ rule: 'chip-missing', severity: 'minor', note: `No chip matching "${st.chip}" (chips: ${chips.join(' | ') || 'none'}); typed it instead.` });
      return send(String(st.chip), 'typed');
    }
    return send(chip, 'chip');
  };

  try {
    if (s.turns) for (const st of s.turns) await step(st);
    if (s.guest) {
      for (let i = 0; i < (s.guest.maxTurns ?? 6); i++) {
        const said = await guestSays(s.guest.persona, run.turns, s.guest.opener);
        if (!said || /^\[DONE\]/i.test(said)) break;
        if (/^\[CONFIRM\]/i.test(said)) {
          if (!(await confirm())) break;
          continue;
        }
        const chips = run.turns.at(-1)?.reply.quickReplies ?? [];
        await send(said, chips.includes(said) ? 'chip' : 'typed');
      }
    }
    codeChecks(run, catalog);
  } catch (err) {
    run.error = (err as Error).message;
  }
  return run;
}

async function main() {
  const picked = SCENARIOS.filter((s) => !ONLY || ONLY.includes(s.id));
  const jobs = picked.flatMap((s) => Array.from({ length: REPEAT }, (_, i) => ({ s, copy: i + 1 })));
  const label = `${m.id} · effort ${m.effort} · thinking ${m.thinking}`;
  console.log(`Sales review: ${jobs.length} conversations on ${label}; grader ${GRADER}\n`);

  // The grader sees the same instructions and facts the coordinator does.
  const openings = !!catalog.config.booking.availability;
  const holds = openings && !!catalog.config.booking.availability?.holds.enabled && process.env.EVAL_HOLDS !== 'off';
  const reference = { instructions: fixedBlock(catalog, { openings }), facts: catalogBlock(catalog, TODAY, { openings, holds }) };
  const runs: Run[] = [];
  const queue = [...jobs];
  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCY, queue.length) }, async () => {
      for (let j = queue.shift(); j; j = queue.shift()) {
        const run = await play(j.s, j.copy);
        if (GRADER !== 'none' && !run.error) {
          try {
            run.grade = await grade(real, GRADER, run, reference);
          } catch (err) {
            run.error = `grading failed: ${(err as Error).message}`;
          }
        }
        runs.push(run);
        const flags = [...run.flags, ...run.turns.flatMap((t) => t.flags)];
        const majors = flags.filter((f) => f.severity === 'major').length + (run.grade?.replies.filter((r) => r.verdict === 'major').length ?? 0);
        const avg = run.turns.length ? run.turns.reduce((a, t) => a + t.ms, 0) / run.turns.length / 1000 : 0;
        const mark = run.error ? '\x1b[31mERR \x1b[0m' : majors ? '\x1b[31mFIX \x1b[0m' : flags.length || (run.grade && run.grade.score < 4) ? '\x1b[33mOK? \x1b[0m' : '\x1b[32mgood\x1b[0m';
        console.log(`${mark} ${`${run.scenario.id}${REPEAT > 1 ? ` #${run.copy}` : ''}`.padEnd(28)} ${run.grade ? `${run.grade.score}/5` : '   '}  ${avg.toFixed(1)}s/reply  ${run.error ?? run.grade?.summary ?? ''}`);
      }
    }),
  );
  runs.sort((a, b) => picked.indexOf(a.scenario) - picked.indexOf(b.scenario) || a.copy - b.copy);

  const replies = runs.flatMap((r) => r.turns.filter((t) => t.via !== 'confirm'));
  const waits = replies.map((t) => t.ms).sort((a, b) => a - b);
  const stats = {
    conversations: runs.length,
    replies: replies.length,
    medianMs: waits[Math.floor(waits.length / 2)] ?? 0,
    p90Ms: waits[Math.floor(waits.length * 0.9)] ?? 0,
    avgScore: runs.filter((r) => r.grade).reduce((a, r) => a + r.grade!.score, 0) / Math.max(1, runs.filter((r) => r.grade).length),
    needsFix: runs.filter((r) => [...r.flags, ...r.turns.flatMap((t) => t.flags)].some((f) => f.severity === 'major') || r.grade?.replies.some((x) => x.verdict === 'major')).length,
  };
  console.log(`\nMedian wait ${(stats.medianMs / 1000).toFixed(1)}s, p90 ${(stats.p90Ms / 1000).toFixed(1)}s · average grade ${stats.avgScore.toFixed(1)}/5 · ${stats.needsFix} of ${runs.length} need a fix`);

  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const dir = resolve(dirname(fileURLToPath(import.meta.url)), '../../../.eval-results', `sales-${stamp}`);
  mkdirSync(dir, { recursive: true });
  const meta = { client: CLIENT, model: m.id, effort: m.effort, thinking: m.thinking, grader: GRADER, date: new Date().toISOString(), stats };
  writeFileSync(resolve(dir, 'results.json'), JSON.stringify({ meta, runs }, null, 2));
  writeFileSync(resolve(dir, 'report.html'), renderReport(meta, runs));
  console.log(`Report: ${resolve(dir, 'report.html')}`);
}

main();
