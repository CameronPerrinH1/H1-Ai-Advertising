// Releasing holds nobody turned into an appointment (Cameron, Nov 11). Vagaro is the record: each
// hold the chat places carries HOLD_MARK and the time it was placed in its comment, so the sweep
// finds them on the calendar itself; no second copy of the guest's details is kept anywhere.
import type { Catalog } from '../catalog.ts';
import type { Outbox } from '../handoff/email.ts';
import { log } from '../log.ts';
import type { HoldWriter } from './availability.ts';

export const HOLD_MARK = '[h1-hold';
const PLACED = /\[h1-hold (\S+?)\]/;
const TEST_RELEASE_MS = 10 * 60_000;

const addDays = (date: string, n: number) => new Date(new Date(`${date}T12:00:00Z`).getTime() + n * 86_400_000).toISOString().slice(0, 10);

export async function releaseHolds(deps: {
  catalog: Catalog;
  holds: HoldWriter;
  outbox: Outbox;
  mode: 'on' | 'test';
  today: string; // the spa's local date
  now?: number;
}): Promise<number> {
  const cfg = deps.catalog.config.booking.availability;
  if (!cfg?.holds.enabled) return 0;
  const now = deps.now ?? Date.now();
  const limit = deps.mode === 'test' ? TEST_RELEASE_MS : cfg.holds.release_after_hours * 3_600_000;
  const to = addDays(deps.today, deps.catalog.config.booking.rules.max_days_ahead + 1);
  let released = 0;
  for (const providerId of Object.values(cfg.provider_ids)) {
    for (const h of await deps.holds.listHolds(providerId, addDays(deps.today, -1), to)) {
      const placed = Date.parse(h.comment.match(PLACED)?.[1] ?? '');
      if (!Number.isFinite(placed) || now - placed < limit) continue;
      await deps.holds.deleteHold(h.id);
      released += 1;
      // The release stands even if the email fails (found Nov 11: the sweep couldn't send email);
      // logged, and the next hold is still handled.
      await deps.outbox.send({
        from: deps.catalog.config.handoff.email_from,
        to: deps.catalog.config.handoff.email_to,
        subject: `Released: ${h.name.replace(/^TEST – /, '')}`,
        body: [
          `A hold from your website chat wasn't turned into an appointment in time, so it was released and the time is open again:`,
          '',
          `${h.name}, ${h.date} ${h.start}-${h.end}`,
          h.comment.replace(PLACED, '').trim(),
          '',
          'If you already booked this guest in Vagaro, nothing else is needed.',
        ].join('\n'),
      }).catch((err: Error) => log('hold_release_email_failed', { error: err?.name ?? 'Error' }));
    }
  }
  if (released) log('holds_released', { count: released });
  return released;
}
