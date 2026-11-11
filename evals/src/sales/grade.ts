// The grader: a stronger model reads one conversation and judges each reply against the house
// rules, with the same instructions and facts the coordinator had. For a reply that falls short it
// writes a better one, so a reviewer can see what good looks like.
import type { ModelClient } from '@concierge/backend';
import { describeCards, type Run } from './types.ts';

export interface ReplyGrade {
  turn: number; // 1-based, matching the transcript
  verdict: 'good' | 'minor' | 'major';
  issues: string[];
  better?: string;
}
export interface Grade {
  score: number; // 1-5 for the whole conversation
  summary: string; // one sentence
  replies: ReplyGrade[];
}

// What H1 and the spa have asked for, in their words where possible (Nov 9-10, 2026).
export const HOUSE_RULES = [
  "R1 Understand first (Cameron, Nov 10). The coordinator's goal is to solve the guest's concern with a service. Before recommending anything or offering the phone, a callback, or booking, it learns what the guest is concerned about: reflects it back so they feel understood, asks ONE question per reply (what they notice, how long, what they've tried, the result they want, limits like downtime or an event). Two or three questions is typical. Direct questions get a direct answer first. Exception: a guest who already knows what they want and asks to book it goes straight to booking. Recommending, or pushing booking, before understanding is a miss; so is interrogating with more questions than needed.",
  "R2 Recommend what solves it: the treatment that best fits what this guest said, explained in their terms (what it does for their concern, what to expect), from the facts only. Generic menu descriptions are a miss.",
  "R3 Upsell once (Erin Silva: always try to upsell when possible): with the recommendation, suggest ONE listed pairing or add-on with a reason from its description, and ask. Only listed pairings; drop it if declined.",
  "R4 Expect hesitation: on a no or a doubt (price, time, nerves, unsure), acknowledge it, find out what's holding them back, answer with facts or the approved answers, and offer the option that fits better. Not giving up after one no, and not pushing; after a second no, the consultation or a callback.",
  'R5 Prices: a price question gets the listed price in the first sentence. A steep price gets what it covers plus the lower-priced option that still fits, with its price. Never "free consultation" unless listed at $0.',
  "R6 Book it: once the guest wants a treatment, ask which days or times work (unless known), then show openings that fit (or the booking card), or offer request_appointment with their preferred time. Booking is a card, never a chip. Never claim a time is held or booked.",
  "R7 Short and warm: usually one or two sentences plus a question or next step; every reply ends with a question or clear next step.",
  "R8 Never say the same thing twice in a reply, even in other words.",
  "R9 Never guess facts: no lengths, downtime, results, dates or openings that aren't in the facts or a tool result; no medical advice, candidacy calls or diagnoses; urgent or medical concerns get the safety path, not selling.",
  "R10 Reply chips are things the guest would say next, from the guest's point of view; they fit right after the reply and never repeat a card's own buttons.",
  'R11 Never asks whether the guest is just looking or researching. Follows the spa\'s voice rules (no "cheap", "discount", "painless", guarantees, or competitor names).',
];

const SYSTEM = [
  'You review conversations between guests and the AI treatment coordinator on a skin and scalp studio\'s website, for the agency that builds it. Judge each coordinator reply against the house rules below and the coordinator\'s own instructions and facts (included after the rules).',
  'Be a demanding but fair reviewer: flag real problems a spa owner would care about, not nitpicks. A reply is "good" if it follows the rules, "minor" if it has a small miss, "major" if it breaks a rule in a way that loses a sale, misleads, or is unsafe.',
  'For every reply that is not good, write "better": the reply you would want instead, in the coordinator\'s voice, short, using only facts given. Mention the card or chips it should show in brackets if that matters.',
  'Score the whole conversation 1-5 (5: would happily ship this; 3: works but leaves sales on the table; 1: harmful or broken).',
  'Answer with only JSON, no other text: {"score": n, "summary": "one sentence", "replies": [{"turn": n, "verdict": "good|minor|major", "issues": ["R2: ..."], "better": "..."}]}. Include every coordinator reply, in order. Omit "better" for good replies.',
  '',
  '# House rules',
  ...HOUSE_RULES,
].join('\n');

export function transcript(run: Run): string {
  const L: string[] = [`Page: ${run.scenario.page ?? '/home-chat'}`];
  for (const [i, t] of run.turns.entries()) {
    L.push(`\nGuest${t.via === 'chip' ? ' (tapped a chip)' : ''}: ${t.guest}`);
    L.push(`Coordinator reply ${i + 1}: ${t.reply.text || '(no text)'}`);
    for (const d of describeCards(t.reply.cards)) L.push(`  shows ${d}`);
    if (t.reply.quickReplies.length) L.push(`  chips: ${t.reply.quickReplies.map((q) => `"${q}"`).join(', ')}`);
  }
  return L.join('\n');
}

// One retry: now and then the JSON comes back malformed.
export async function grade(model: ModelClient, modelId: string, run: Run, ref: { instructions: string; facts: string }): Promise<Grade> {
  try {
    return await gradeOnce(model, modelId, run, ref);
  } catch {
    return gradeOnce(model, modelId, run, ref);
  }
}

async function gradeOnce(model: ModelClient, modelId: string, run: Run, ref: { instructions: string; facts: string }): Promise<Grade> {
  const out = await model.converse({
    modelId,
    system: [
      { text: SYSTEM },
      { text: `# The coordinator's instructions\n${ref.instructions}\n\n# The facts it had\n${ref.facts}` },
      { cachePoint: { type: 'default' } },
    ],
    messages: [{ role: 'user', content: [{ text: `${run.scenario.why ? `What this conversation tests: ${run.scenario.why}\n\n` : ''}${transcript(run)}` }] }],
    inferenceConfig: { maxTokens: 8000 },
    additionalModelRequestFields: { output_config: { effort: 'medium' } } as never,
  });
  const text = (out.output?.message?.content ?? []).map((b) => b.text ?? '').join('');
  const json = text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1);
  const g = JSON.parse(json) as Grade;
  if (typeof g.score !== 'number' || !Array.isArray(g.replies)) throw new Error('grader returned an unexpected shape');
  return g;
}
