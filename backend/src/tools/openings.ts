// show_openings: the soonest real openings for a treatment (or the consultation it needs first),
// from the booking platform. Times respect the spa's notice and how-far-ahead rules, and tapping one
// opens the booking page, where the guest confirms it: the chat never holds or books a time. Any
// failure, a service with no platform id, or the per-session cap falls back to the booking link (D22, D23).
import { z } from 'zod';
import type { Card, Lang } from '@concierge/shared';
import { zonedToUtc, type OpeningDay } from '../booking/availability.ts';
import { log } from '../log.ts';
import { handleTool, type ToolContext, type ToolOutcome } from './handlers.ts';

const input = z.object({
  service_id: z.string(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  time_of_day: z.enum(['morning', 'afternoon', 'evening']).optional(),
  weekday: z.enum(['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'weekday', 'weekend']).optional(),
});
const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const weekdayOf = (date: string) => new Date(`${date}T12:00:00Z`).getUTCDay();
// The first date on or after `date` that falls on the weekday.
const onOrAfter = (date: string, weekday: number) => addDays(date, (weekday - weekdayOf(date) + 7) % 7);

// The guest's preferred part of the day, in the spa's local time.
const PART: Record<string, (t: string) => boolean> = {
  morning: (t) => t < '12:00',
  afternoon: (t) => t >= '12:00' && t < '17:00',
  evening: (t) => t >= '17:00',
};

const MAX_SEARCHES = 4; // platform calls for one card
const MAX_FILTERED = 6; // with a day or time filter, more days are skipped
const DEFAULT_CHECKS_PER_SESSION = 6;

export const dayLabel = (date: string, lang: Lang) =>
  new Date(`${date}T12:00:00Z`).toLocaleDateString(lang === 'es' ? 'es-US' : 'en-US', { timeZone: 'UTC', weekday: 'short', month: 'short', day: 'numeric' });
export const timeLabel = (time: string, lang: Lang) => {
  const [h, m] = time.split(':').map(Number) as [number, number];
  return new Date(Date.UTC(2000, 0, 1, h, m)).toLocaleTimeString(lang === 'es' ? 'es-US' : 'en-US', { timeZone: 'UTC', hour: 'numeric', minute: '2-digit' });
};
// Up to n times spread through the day (at least an hour apart where the day allows), so a guest
// sees real choices instead of 10:00, 10:15, 10:30, 10:45.
const mins = (t: string) => +t.slice(0, 2) * 60 + +t.slice(3, 5);
export function spread(times: string[], n: number): string[] {
  const picked: string[] = [];
  for (const gap of [60, 30, 0]) {
    for (const t of times) if (picked.length < n && !picked.includes(t) && picked.every((p) => Math.abs(mins(p) - mins(t)) >= gap)) picked.push(t);
    if (picked.length >= n) break;
  }
  return picked.sort((a, b) => mins(a) - mins(b));
}
const addDays = (date: string, n: number) => new Date(new Date(`${date}T12:00:00Z`).getTime() + n * 86_400_000).toISOString().slice(0, 10);

export async function showOpenings(raw: unknown, ctx: ToolContext): Promise<ToolOutcome> {
  const p = input.safeParse(raw);
  if (!p.success) return { result: { error: p.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ') }, isError: true };
  const { catalog, session, lang } = ctx;
  const service = catalog.services.get(p.data.service_id);
  if (!service) return { result: { error: `Unknown service_id "${p.data.service_id}".` }, isError: true };
  const consult = service.details.requires_assessment ? catalog.consultFor(service.id) : undefined;
  const target = consult ?? service;

  const link = (why: string): ToolOutcome => {
    const out = handleTool('get_booking_link', { service_id: service.id }, ctx);
    return { ...out, result: { ...out.result, openings_shown: false, why } };
  };
  const config = catalog.config.booking.availability;
  const platformId = config?.service_ids[target.id];
  if (!config || !ctx.availability || !platformId) return link('live openings are not available for this service; the booking button shows them');
  const cap = catalog.config.booking.limits.max_availability_checks_per_session ?? DEFAULT_CHECKS_PER_SESSION;
  if ((session.counts.openings ?? 0) >= cap) return link('openings were already checked several times in this chat');
  session.counts.openings = (session.counts.openings ?? 0) + 1;

  const tz = catalog.config.business.locations[0]!.timezone;
  const now = ctx.now ? ctx.now() : Date.now();
  const { min_notice_hours, max_days_ahead } = catalog.config.booking.rules;
  const earliest = now + min_notice_hours * 3_600_000;
  const lastDate = addDays(ctx.today, max_days_ahead);
  const from = p.data.date && p.data.date > ctx.today ? p.data.date : undefined;

  const fits = p.data.time_of_day ? PART[p.data.time_of_day]! : () => true;
  // One named day is searched directly (the platform returns the first openings on or after a
  // date); "weekday" and "weekend" just filter the days found.
  const wd = p.data.weekday ? WEEKDAYS.indexOf(p.data.weekday) : -1;
  const daySet = p.data.weekday === 'weekday' ? [1, 2, 3, 4, 5] : p.data.weekday === 'weekend' ? [0, 6] : wd >= 0 ? [wd] : undefined;
  const firstSearch = wd >= 0 ? onOrAfter(from ?? addDays(ctx.today, 1), wd) : from;
  const days: OpeningDay[] = [];
  const anyTime: OpeningDay[] = []; // if nothing fits their part of the day, the soonest others
  let next = firstSearch;
  try {
    const searches = daySet || p.data.time_of_day ? MAX_FILTERED : MAX_SEARCHES;
    for (let i = 0; i < searches && days.length < config.days_shown; i++) {
      const found = await ctx.availability.search(platformId, next);
      if (!found.length) break;
      for (const d of found) {
        if (d.date > lastDate || days.some((x) => x.date === d.date)) continue;
        if (daySet && !daySet.includes(weekdayOf(d.date))) continue;
        const allowed = d.times.filter((t) => zonedToUtc(d.date, t, tz) >= earliest);
        const times = allowed.filter(fits);
        if (times.length) days.push({ ...d, times });
        else if (allowed.length && anyTime.length < config.days_shown) anyTime.push({ ...d, times: allowed });
      }
      next = wd >= 0 ? onOrAfter(addDays(found.at(-1)!.date, 1), wd) : addDays(found.at(-1)!.date, 1);
      if (next > lastDate) break;
    }
  } catch (err) {
    log('availability_error', { session: session.hash.slice(0, 8), error: (err as Error).name });
    return link('the booking system could not be reached just now; the booking button shows the openings');
  }
  const noFit = !days.length && anyTime.length > 0;
  if (noFit) days.push(...anyTime);
  if (!days.length) return link('no openings were found in the next few days; the booking button shows later dates');

  session.outcomes.add('link_provided');
  const shown = days.slice(0, config.days_shown).map((d) => ({
    date: d.date,
    label: dayLabel(d.date, lang),
    times: spread(d.times, config.times_per_day).map((t) => ({ time: t, label: timeLabel(t, lang) })),
  }));
  const provider = days.every((d) => d.provider === days[0]!.provider) ? days[0]!.provider : undefined;
  // Remember every open time on the days shown (not only the buttons), so the guest can pick one
  // they name; a hold is only ever placed on one of these (D11).
  session.shownSlots = [
    ...(session.shownSlots ?? []).filter((s) => s.serviceId !== target.id),
    ...days.slice(0, config.days_shown).flatMap((d) => d.times.map((time) => ({ serviceId: target.id, date: d.date, time, providerId: d.providerId, minutes: d.durationMinutes }))),
  ].slice(-80);
  const card: Card = {
    type: 'openings',
    url: catalog.bookUrl(target.id),
    serviceName: target.name,
    providerName: provider,
    consult: !!consult,
    durationMinutes: target.durationMinutes,
    days: shown,
    ...(ctx.holds ? { selectable: true } : {}),
  };
  return {
    cards: [card],
    result: {
      openings_shown: true,
      service: target.name,
      consultation_first: !!consult,
      ...(provider ? { with: provider } : {}),
      soonest: `${shown[0]!.label} at ${shown[0]!.times[0]!.label}`,
      ...(noFit ? { no_openings_in: p.data.time_of_day, showing: 'the soonest times at other parts of the day; say so' } : {}),
      days: shown.map((d) => `${d.label} (${d.date}): ${d.times.map((t) => `${t.label} [${t.time}]`).join(', ')}`),
      note: ctx.holds
        ? "The card shows these times; the guest can tap one (or name one from these days) to pick it. Then collect first and last name and phone (email optional) and call request_appointment with slot {date, time}; the time is held on the calendar only after they tap Confirm. Mention at most the soonest time, and only from this list."
        : "The card shows these times; tapping one opens the booking page, where the guest confirms it. You can't hold or book a time. Mention at most the soonest time, and only from this list.",
    },
  };
}
