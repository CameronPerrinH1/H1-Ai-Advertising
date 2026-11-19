// Booking rules a spa sets (booking.rules.screening and .reminders; Plumb + Pine, Nov 19).
//
// Screening: a question asked before any openings are shown or an appointment is prepared, like
// "Have you had Botox or filler in the last 14 days?". A "yes" means the appointment has to be at
// least wait_days_after_yes days after it, so code keeps every offered or requested date on or after
// that day. Answers are kept in the session for the rest of the chat.
//
// Reminders: said when a time is picked and printed on the confirmation card, like "Please stop
// vitamin A and retinol products 72 hours before your facial".
import { z } from 'zod';
import type { Catalog } from '../catalog.ts';
import type { Session } from '../session/store.ts';

/** What the model passes with show_openings or request_appointment once the guest has answered. */
export const screeningInput = z
  .array(
    z.object({
      id: z.string(),
      answer: z.enum(['yes', 'no']),
      // With "yes": how many days ago, if the guest said. Unknown counts as today, the safe side.
      days_ago: z.number().int().min(0).max(365).optional(),
    }),
  )
  .max(5)
  .optional();
export type ScreeningAnswers = z.infer<typeof screeningInput>;

/** The tool-definition property for the same input. */
export const screeningProperty = {
  type: 'array',
  description:
    "The guest's answers to the spa's booking questions (see Booking rules in your instructions), once they've answered: {id, answer: yes|no, days_ago if they said how long ago}.",
  items: {
    type: 'object',
    properties: { id: { type: 'string' }, answer: { type: 'string', enum: ['yes', 'no'] }, days_ago: { type: 'integer' } },
    required: ['id', 'answer'],
  },
} as const;

const addDays = (date: string, n: number) => new Date(new Date(`${date}T12:00:00Z`).getTime() + n * 86_400_000).toISOString().slice(0, 10);
const appliesTo = (services: string[] | undefined, ids: string[]) => !services || ids.some((id) => services.includes(id));

export type ScreeningResult =
  | { ask: { id: string; question: string } }
  | { ask?: undefined; notBefore?: string };

/**
 * Records any answers given, then says what's still to ask for these services, or the earliest
 * date an appointment may be on.
 */
export function screen(catalog: Catalog, session: Session, serviceIds: string[], answers: ScreeningAnswers, today: string): ScreeningResult {
  const rules = catalog.config.booking.rules.screening;
  for (const a of answers ?? []) {
    const rule = rules.find((r) => r.id === a.id);
    if (!rule) continue;
    const ago = Math.min(a.days_ago ?? 0, rule.wait_days_after_yes);
    (session.screening ??= {})[rule.id] = a.answer === 'yes' ? { answer: 'yes', notBefore: addDays(today, rule.wait_days_after_yes - ago) } : { answer: 'no' };
  }
  let notBefore: string | undefined;
  for (const rule of rules) {
    if (!appliesTo(rule.services, serviceIds)) continue;
    const got = session.screening?.[rule.id];
    if (!got) return { ask: { id: rule.id, question: rule.question } };
    if (got.notBefore && (!notBefore || got.notBefore > notBefore)) notBefore = got.notBefore;
  }
  return notBefore ? { notBefore } : {};
}

/** The reminders for these services, to say when a time is picked and print on the card. */
export function remindersFor(catalog: Catalog, serviceIds: string[]): string[] {
  return catalog.config.booking.rules.reminders.filter((r) => appliesTo(r.services, serviceIds)).map((r) => r.text);
}

/** What the model is told to do when a question hasn't been answered yet. */
export const askFirst = (q: { id: string; question: string }, tool: string) =>
  `Before showing times or preparing a request, ask the guest exactly this, as its own short question: "${q.question}" Then call ${tool} again with screening [{id: "${q.id}", answer, days_ago if they said}]. Don't ask anything else about their health.`;
