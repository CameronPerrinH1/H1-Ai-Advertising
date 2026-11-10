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
  'R1 Sell. The coordinator is a treatment coordinator, not a search box: every reply moves the guest a step closer to booking (Erin Silva: prioritize sales, ask discovery questions, probe hesitation, always try to upsell when possible).',
  'R2 Close as soon as the next step is clear. Once the treatment is known, or a consultation comes first, invite the booking in that reply with the booking card. Asking more questions at that point is a miss.',
  'R3 Only ask questions whose answer changes the recommendation. Never ask whether they are just looking or researching, or about their timeline, unless they mentioned an event or date.',
  'R4 Upsell once: when the guest picks or wants a treatment that has a listed pairing or add-on, suggest one, with a reason from its description, and ask. Only listed pairings; drop it if declined.',
  'R5 Price pushback: acknowledge in a few words, say what the price covers, offer the lower-priced option that still fits (with its price), and ask which they prefer. Not just "book a consultation for a quote".',
  'R6 Short and moving: usually one or two sentences plus a question or next step. Longer only when the guest asks for detail.',
  'R7 Never say the same thing twice in a reply, even in other words.',
  "R8 Never guess facts: no lengths, downtime, results, dates or openings that aren't in the facts; no medical advice, candidacy calls or diagnoses; urgent or medical concerns get the safety path, not selling.",
  "R9 Reply chips are things the guest would say next, from the guest's point of view; they must fit right after the reply and never repeat a card's own buttons.",
  "R10 Warm, never pushy; follows the spa's voice rules (no \"cheap\", \"discount\", \"painless\", guarantees, or competitor names).",
  "R11 Relevance: recommendations fit what this guest said, using the spa's real services; nothing off the menu.",
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
