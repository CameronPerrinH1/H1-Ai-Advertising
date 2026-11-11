// Tool handlers. Every tool call is validated in code before it does anything (D10). Card tools
// render from catalog data (D59); request tools only prepare a confirmation card (D52); planning
// tools (countdown, estimate, membership) compute in code, never in the model (D62).
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import type { Card, ConfirmField, Lang } from '@concierge/shared';
import { type Catalog, pick, pickList } from '../catalog.ts';
import { checkText } from '../checks/output.ts';
import { normalizePhone, formatPhone, phoneHash } from '../safety/phone.ts';
import { redactCardNumbers } from '../safety/cardNumbers.ts';
import { planEvent, PlanError } from '../planning.ts';
import { strings } from '../i18n.ts';
import type { AppointmentPayload, Session } from '../session/store.ts';
import { dayLabel, timeLabel } from './openings.ts';

import type { AvailabilitySource, HoldWriter } from '../booking/availability.ts';

export interface ToolContext {
  catalog: Catalog;
  session: Session;
  lang: Lang;
  today: string;
  phoneKey: string;
  // Amounts a planning tool computed this turn; the reply may repeat them (D13).
  extraAmounts: Set<number>;
  // Phone numbers the guest typed in this chat (digits only); the reply may read them back.
  guestPhones?: Set<string>;
  // Live openings from the booking platform, where it's connected (show_openings).
  availability?: AvailabilitySource;
  holds?: HoldWriter; // where holds are on: a confirmed time is blocked on the calendar
  // In-chat booking (holds on, test, or preview): times are picked in the chat, never a booking link.
  // In preview the confirm card is shown with Confirm greyed out, and nothing is held or sent.
  inChat?: 'hold' | 'preview';
  now?: () => number;
  // Staff mode only: this month's report of what visitors asked (D65).
  insights?: () => Card;
}

export interface ToolOutcome {
  result: Record<string, unknown>;
  isError?: boolean;
  cards?: Card[];
  quickReplies?: string[];
  urgent?: boolean;
}

const fail = (error: string): ToolOutcome => ({ result: { error }, isError: true });
const NAME = /^[\p{L}][\p{L}\p{M}' .-]{0,49}$/u;

// A chip that states something only the guest can know (Plumb + Pine test, Nov 9: "My last name is Lee").
const PERSONAL = [
  /\bmy\s+(?:first\s+|last\s+|full\s+|middle\s+)?name\b/i,
  /\bmy\s+(?:phone|number|cell|mobile|email|e-mail|address|birthday|date of birth|dob|insurance)\b/i,
  /\b(?:i'?m|i am)\s+\d{1,3}\b/i, // an age
  /\b(?:i'?m|i am)\s+(?:pregnant|allergic|breastfeeding)\b/i,
  /\bmi\s+(?:nombre|apellido|tel[eé]fono|n[uú]mero|correo)\b/i,
  /@|\d{3}[\s.-]?\d{3,4}/, // an email or a phone number
];
export const speaksForGuest = (r: string) => PERSONAL.some((re) => re.test(r));

function badText(text: string, ctx: ToolContext, max: number): string | null {
  const r = checkText(text, ctx.catalog, ctx.today, max);
  return r.ok ? null : r.problems.join('; ');
}

function parse<T>(schema: z.ZodType<T>, input: unknown): { ok: true; data: T } | { ok: false; error: string } {
  const r = schema.safeParse(input);
  if (r.success) return { ok: true, data: r.data };
  return { ok: false, error: r.error.issues.map((i) => `${i.path.join('.') || 'input'}: ${i.message}`).join('; ') };
}

function shortDate(iso: string, lang: Lang): string {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString(lang === 'es' ? 'es-US' : 'en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'use YYYY-MM-DD');

const schemas = {
  show_treatment_options: z.object({
    headline: z.string().trim().max(80).optional(),
    options: z.array(z.object({ service_id: z.string(), reason: z.string().trim().min(1).max(140) })).min(1).max(3),
  }),
  show_service_card: z.object({ service_id: z.string() }),
  compare_services: z.object({ service_ids: z.array(z.string()).min(2).max(3) }),
  show_provider: z.object({ staff_id: z.string() }),
  suggest_replies: z.object({ replies: z.array(z.string()).min(1).max(3) }), // one row (Cameron, Nov 11)
  get_booking_link: z.object({
    service_id: z.string().optional(),
    staff_id: z.string().optional(),
    purpose: z.enum(['book', 'manage', 'rsvp']).optional(),
    event_id: z.string().optional(),
  }),
  request_callback: z.object({
    first_name: z.string().trim().min(1).max(50),
    phone: z.string().trim().min(7).max(40),
    preferred_time: z.string().trim().max(60).optional(),
    category: z.string(),
  }),
  request_appointment: z
    .object({
      service_id: z.string().optional(),
      use_event_plan: z.boolean().optional(),
      staff_id: z.string().optional(),
      preferred_times: z.string().trim().max(80).optional(),
      first_name: z.string().trim().min(1).max(50),
      last_name: z.string().trim().min(1).max(50),
      phone: z.string().trim().min(7).max(40),
      email: z.string().trim().email().optional(),
      slot: z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), time: z.string().regex(/^\d{2}:\d{2}$/) }).optional(),
    })
    .refine((d) => d.use_event_plan || d.service_id, { message: 'service_id is required unless use_event_plan is true' }),
  show_urgent_help: z.object({ kind: z.enum(['post_treatment', 'emergency', 'crisis']) }),
  plan_event_timeline: z.object({
    event_date: date,
    event_label: z.string().trim().max(40).optional(),
    service_ids: z.array(z.string()).min(1).max(4),
  }),
  show_care_guide: z.object({ service_id: z.string(), focus: z.enum(['before', 'after', 'all']).optional() }),
  estimate_visit: z.object({ service_ids: z.array(z.string()).min(1).max(5), add_on_ids: z.array(z.string()).max(3).optional() }),
  show_membership_savings: z.object({ membership_id: z.string().optional(), visits_per_year: z.number().int().min(1).max(24).optional() }),
  show_first_visit: z.object({}),
  show_unanswered_questions: z.object({}),
};

type Handler = (input: unknown, ctx: ToolContext) => ToolOutcome;

function serviceCard(id: string, ctx: ToolContext) {
  return ctx.catalog.serviceView(id, ctx.lang, ctx.today);
}

// Free text that ends up on a card or in an email: no card numbers, no stray phone numbers.
function cleanFreeText(text: string): string {
  return redactCardNumbers(text).text.replace(/(?<!\d)(?:\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}(?!\d)/g, '').trim();
}

// Supersede earlier unconfirmed requests of the same kind, so only the latest card can be confirmed.
function expirePending(session: Session, kind: 'appointment' | 'callback'): void {
  for (const a of session.pendingActions.values()) if (a.kind === kind && a.status === 'pending') a.status = 'expired';
}

export function firstVisitCard(catalog: Catalog, lang: Lang): Card | undefined {
  const fv = catalog.config.first_visit;
  if (!fv) return undefined;
  return {
    type: 'first_visit',
    arriveMinutes: fv.arrive_minutes_early,
    parking: fv.parking ? pick(fv.parking, lang) : undefined,
    bring: pickList(fv.bring, lang),
    notes: pickList(fv.notes, lang),
    formUrl: fv.intake_form_url,
  };
}

const handlers: Record<string, Handler> = {
  show_treatment_options(input, ctx) {
    const p = parse(schemas.show_treatment_options, input);
    if (!p.ok) return fail(p.error);
    const ids = p.data.options.map((o) => o.service_id);
    if (new Set(ids).size !== ids.length) return fail('Each treatment can appear only once.');
    const items: { service: NonNullable<ReturnType<typeof serviceCard>>; reason: string }[] = [];
    for (const o of p.data.options) {
      const service = serviceCard(o.service_id, ctx);
      if (!service) return fail(`Unknown service_id "${o.service_id}". Use IDs from the catalog.`);
      // Checked with the treatment's name, so claims about it (downtime, length) are judged against its facts.
      const problem = badText(`${service.name}: ${o.reason}`, ctx, 142 + service.name.length);
      if (problem) return fail(`The reason for ${service.name} was blocked: ${problem}. Rewrite it without prices or claims.`);
      items.push({ service, reason: o.reason });
    }
    if (p.data.headline) {
      const problem = badText(p.data.headline, ctx, 80);
      if (problem) return fail(`The headline was blocked: ${problem}.`);
    }
    return {
      result: { shown: true, treatments: items.map((i) => i.service.name), note: 'The card is visible to the guest. Introduce it in one short sentence.' },
      cards: [{ type: 'treatment_options', headline: p.data.headline, items, ...(ctx.availability ? { bookInChat: true } : {}) }],
    };
  },

  show_service_card(input, ctx) {
    const p = parse(schemas.show_service_card, input);
    if (!p.ok) return fail(p.error);
    const service = serviceCard(p.data.service_id, ctx);
    if (!service) return fail(`Unknown service_id "${p.data.service_id}".`);
    return { result: { shown: true, treatment: service.name }, cards: [{ type: 'service', service, ...(ctx.availability ? { bookInChat: true } : {}) }] };
  },

  compare_services(input, ctx) {
    const p = parse(schemas.compare_services, input);
    if (!p.ok) return fail(p.error);
    if (new Set(p.data.service_ids).size !== p.data.service_ids.length) return fail('Compare different treatments.');
    const services = [];
    for (const id of p.data.service_ids) {
      const s = serviceCard(id, ctx);
      if (!s) return fail(`Unknown service_id "${id}".`);
      services.push(s);
    }
    return { result: { shown: true, treatments: services.map((s) => s.name) }, cards: [{ type: 'compare', services, ...(ctx.availability ? { bookInChat: true } : {}) }] };
  },

  show_provider(input, ctx) {
    const p = parse(schemas.show_provider, input);
    if (!p.ok) return fail(p.error);
    const provider = ctx.catalog.providerView(p.data.staff_id, ctx.lang);
    if (!provider) return fail(`Unknown staff_id "${p.data.staff_id}".`);
    return { result: { shown: true, provider: provider.name }, cards: [{ type: 'provider', provider }] };
  },

  suggest_replies(input, ctx) {
    // A chip is sent as if the guest typed it, so it must never put words about themselves in
    // their mouth: a made-up name, number, email, birthday, or health detail.
    const p = parse(schemas.suggest_replies, input);
    if (!p.ok) return fail(p.error);
    const replies = [...new Set(p.data.replies.map((r) => r.trim()).filter((r) => r.length > 0 && r.length <= 40))].filter(
      (r) => badText(r, ctx, 40) === null && !speaksForGuest(r),
    );
    return { result: { shown: replies.length > 0, count: replies.length }, quickReplies: replies };
  },

  get_booking_link(input, ctx) {
    const p = parse(schemas.get_booking_link, input);
    if (!p.ok) return fail(p.error);
    const { catalog } = ctx;
    ctx.session.outcomes.add('link_provided');
    if (p.data.purpose === 'manage') {
      const url = catalog.config.booking.self_service_link ?? catalog.config.booking.direct_links.default;
      return { result: { shown: true, purpose: 'manage' }, cards: [{ type: 'booking_link', purpose: 'manage', url }] };
    }
    if (p.data.purpose === 'rsvp') {
      const event = catalog.config.sales.events.find((e) => e.id === p.data.event_id);
      if (!event) return fail(`Unknown event_id "${p.data.event_id ?? ''}".`);
      if (event.rsvp !== 'link' || !event.rsvp_link) return fail(`${event.name} has no RSVP link.${event.rsvp === 'card' ? ' Use request_callback with category other.' : ''}`);
      return { result: { shown: true, purpose: 'rsvp' }, cards: [{ type: 'booking_link', purpose: 'rsvp', url: event.rsvp_link, eventName: event.name }] };
    }
    const service = p.data.service_id ? catalog.services.get(p.data.service_id) : undefined;
    if (p.data.service_id && !service) return fail(`Unknown service_id "${p.data.service_id}".`);
    const provider = p.data.staff_id ? catalog.providers.get(p.data.staff_id) : undefined;
    if (p.data.staff_id && !provider) return fail(`Unknown staff_id "${p.data.staff_id}".`);
    if (service && provider && !provider.services.includes(service.id)) return fail(`${provider.name} doesn't do ${service.name}.`);

    const consult = service && service.details.requires_assessment ? catalog.consultFor(service.id) : undefined;
    const target = consult ?? service;
    return {
      result: { shown: true, purpose: 'book', consultation_first: !!consult },
      cards: [
        {
          type: 'booking_link',
          purpose: 'book',
          url: catalog.bookUrl(target?.id, provider?.id),
          serviceName: target?.name,
          providerName: provider?.name,
          consult: !!consult,
        },
      ],
    };
  },

  request_callback(input, ctx) {
    const p = parse(schemas.request_callback, input);
    if (!p.ok) return fail(p.error);
    const { catalog, session, lang } = ctx;
    const S = strings(lang);
    if (!NAME.test(p.data.first_name)) return fail('Ask the guest for their first name as they write it.');
    const phone = normalizePhone(p.data.phone, catalog.config.booking.allowed_phone_countries);
    if (!phone) return fail("That phone number isn't valid. Ask the guest to check it.");
    if (!catalog.config.handoff.categories.includes(p.data.category)) return fail(`Unknown category "${p.data.category}".`);
    if (session.counts.callbacks >= catalog.config.booking.limits.max_callbacks_per_session) {
      return fail(`The callback limit for this chat is reached. Give the guest the business phone, ${catalog.config.business.phone}.`);
    }
    const preferred = p.data.preferred_time ? cleanFreeText(p.data.preferred_time) : undefined;
    session.phoneHashes.add(phoneHash(phone, ctx.phoneKey));
    expirePending(session, 'callback');
    const id = randomUUID();
    session.pendingActions.set(id, {
      id,
      kind: 'callback',
      payload: { firstName: p.data.first_name, phone, preferredTime: preferred || undefined, category: p.data.category },
      createdAt: Date.now(),
      status: 'pending',
    });
    const fields: { key: ConfirmField; value: string }[] = [
      { key: 'name', value: p.data.first_name },
      { key: 'phone', value: formatPhone(phone) },
      ...(preferred ? [{ key: 'callback_time' as const, value: preferred }] : []),
      { key: 'reason', value: S.categories[p.data.category] ?? p.data.category },
    ];
    const time = pick(catalog.config.handoff.callback_response_time, lang);
    return {
      result: { status: 'awaiting_confirmation', note: 'A confirmation card is shown. Ask the guest to review it and tap Confirm.' },
      cards: [{ type: 'confirm', actionId: id, kind: 'callback', fields, note: S.callbackNote(time), status: 'pending' }],
    };
  },

  request_appointment(input, ctx) {
    const p = parse(schemas.request_appointment, input);
    if (!p.ok) return fail(p.error);
    const { catalog, session, lang } = ctx;
    const S = strings(lang);

    // One treatment, or every treatment in this chat's countdown plan (D62).
    let serviceIds: string[];
    let emailTimes: string;
    let cardTimes: string;
    let hold: AppointmentPayload['hold'];
    const extra = p.data.preferred_times ? cleanFreeText(p.data.preferred_times) : '';
    if (p.data.use_event_plan) {
      const plan = session.lastPlan;
      if (!plan || plan.items.length === 0) return fail('There is no countdown plan in this chat yet. Build one with plan_event_timeline first.');
      serviceIds = plan.items.map((i) => i.serviceId);
      const line = (l: Lang) => plan.items.map((i) => `${catalog.services.get(i.serviceId)?.name} ~${shortDate(i.date, l)}`).join(' · ');
      emailTimes = `Countdown plan for ${plan.label} on ${shortDate(plan.eventDate, 'en')}: ${line('en')}${extra ? `. Guest note: ${extra}` : ''}`;
      cardTimes = `${line(lang)}${extra ? ` · ${extra}` : ''}`;
    } else {
      const service = catalog.services.get(p.data.service_id!);
      if (!service) return fail(`Unknown service_id "${p.data.service_id}".`);
      serviceIds = [service.id];
      if (p.data.slot) {
        // Only a time the openings showed in this chat (D11); for a treatment that needs a
        // consultation first, the openings (and the hold) are the consultation's.
        const target = (service.details.requires_assessment ? catalog.consultFor(service.id) : undefined) ?? service;
        const { date, time } = p.data.slot;
        const shown = session.shownSlots?.find((s) => s.serviceId === target.id && s.date === date && s.time === time);
        if (!shown) return fail("That time isn't one of the openings shown in this chat. Show openings with show_openings and let the guest pick one.");
        const label = (l: Lang) => `${dayLabel(date, l)} at ${timeLabel(time, l)}`;
        emailTimes = `${label('en')}${target.id !== service.id ? ` (${target.name})` : ''}${extra ? `. Guest note: ${extra}` : ''}`;
        cardTimes = label(lang);
        if (ctx.inChat) {
          const minutes = shown.minutes ?? target.durationMinutes ?? 30;
          const [h, m] = time.split(':').map(Number) as [number, number];
          const endMin = Math.min(h * 60 + m + minutes, 23 * 60 + 59);
          const end = `${String(Math.floor(endMin / 60)).padStart(2, '0')}:${String(endMin % 60).padStart(2, '0')}`;
          hold = { serviceId: target.id, date, start: time, end, providerId: shown.providerId, label: label('en') };
        }
      } else {
        if (!extra) return fail('Ask the guest when they would like to come in.');
        emailTimes = extra;
        cardTimes = extra;
      }
    }

    const provider = p.data.staff_id ? catalog.providers.get(p.data.staff_id) : undefined;
    if (p.data.staff_id && !provider) return fail(`Unknown staff_id "${p.data.staff_id}".`);
    if (provider && !serviceIds.some((id) => provider.services.includes(id))) return fail(`${provider.name} doesn't do these treatments.`);
    if (!NAME.test(p.data.first_name) || !NAME.test(p.data.last_name)) return fail('Ask the guest for their first and last name.');
    const phone = normalizePhone(p.data.phone, catalog.config.booking.allowed_phone_countries);
    if (!phone) return fail("That phone number isn't valid. Ask the guest to check it.");
    if (session.counts.requests >= catalog.config.booking.limits.max_bookings_per_session) {
      return fail(`The request limit for this chat is reached. Offer the booking link or the business phone, ${catalog.config.business.phone}.`);
    }

    session.phoneHashes.add(phoneHash(phone, ctx.phoneKey));
    expirePending(session, 'appointment');
    const id = randomUUID();
    session.pendingActions.set(id, {
      id,
      kind: 'appointment',
      payload: {
        serviceIds,
        staffId: provider?.id,
        preferredTimes: emailTimes,
        firstName: p.data.first_name,
        lastName: p.data.last_name,
        phone,
        email: p.data.email,
        ...(hold ? { hold } : {}),
      },
      createdAt: Date.now(),
      status: 'pending',
    });
    const needsConsult = serviceIds.some((sid) => catalog.services.get(sid)?.details.requires_assessment || !!catalog.consultFor(sid));
    const time = pick(catalog.config.handoff.callback_response_time, lang);
    const fields: { key: ConfirmField; value: string }[] = [
      { key: 'treatment', value: serviceIds.map((sid) => catalog.services.get(sid)?.name ?? sid).join(', ') },
      { key: 'provider', value: provider?.name ?? S.anyProvider },
      { key: 'times', value: cardTimes },
      { key: 'name', value: `${p.data.first_name} ${p.data.last_name}` },
      { key: 'phone', value: formatPhone(phone) },
      ...(p.data.email ? [{ key: 'email' as const, value: p.data.email }] : []),
    ];
    return {
      result: {
        status: 'awaiting_confirmation',
        note: hold && ctx.inChat === 'preview'
          ? "A summary card is shown, but booking in the chat is in preview: Confirm is greyed out and nothing is held or sent. Tell the guest their details are ready and that booking in the chat is coming soon; don't ask them to tap Confirm. Offer a callback if they'd like the team to book it now."
          : hold
          ? "A confirmation card is shown. Ask the guest to review it and tap Confirm, which holds the time on the calendar; the team then texts to confirm the appointment. Until they tap Confirm, nothing is held."
          : "A confirmation card is shown. Ask the guest to review it and tap Confirm. It's a request; the team confirms the appointment.",
      },
      cards: [
        {
          type: 'confirm',
          actionId: id,
          kind: 'appointment',
          fields,
          note: hold && ctx.inChat === 'preview' ? S.previewNote : hold ? S.holdNote(time) : needsConsult ? `${S.appointmentNote(time)} ${S.consultNote}` : S.appointmentNote(time),
          status: 'pending',
          ...(hold && ctx.inChat === 'preview' ? { preview: true } : {}),
        },
      ],
    };
  },

  show_urgent_help(input, ctx) {
    const p = parse(schemas.show_urgent_help, input);
    if (!p.ok) return fail(p.error);
    ctx.session.outcomes.add('urgent_redirect');
    return {
      result: { shown: true, note: "The approved message and phone numbers are shown. Don't repeat the numbers; add one short, kind sentence." },
      cards: [urgentCard(p.data.kind, ctx.catalog, ctx.lang)],
      urgent: true,
    };
  },

  plan_event_timeline(input, ctx) {
    const p = parse(schemas.plan_event_timeline, input);
    if (!p.ok) return fail(p.error);
    const { catalog, lang, today } = ctx;
    const ids = p.data.service_ids;
    if (new Set(ids).size !== ids.length) return fail('Each treatment can appear only once.');
    for (const sid of ids) if (!catalog.services.get(sid)) return fail(`Unknown service_id "${sid}".`);
    const given = p.data.event_label?.trim() ?? '';
    const rawLabel = cleanFreeText(given);
    // A label that loses a phone or card number to cleaning would read oddly on the card; ask again.
    if (given && (rawLabel !== given || badText(rawLabel, ctx, 40))) return fail('Use a short plain label for the event, like "your wedding".');
    const label = rawLabel || strings(lang).yourEvent;

    let plan;
    try {
      plan = planEvent(catalog, ids, p.data.event_date, today);
    } catch (err) {
      if (err instanceof PlanError) return fail(err.message);
      throw err;
    }
    const estimate = catalog.estimate(plan.items.map((i) => i.serviceId), [], today);
    ctx.extraAmounts.add(estimate.total);
    ctx.session.lastPlan = { label, eventDate: p.data.event_date, items: plan.items.map((i) => ({ serviceId: i.serviceId, date: i.date })) };
    const view = (sid: string) => catalog.serviceView(sid, lang, today)!;
    return {
      result: {
        shown: true,
        days_to_go: plan.daysToGo,
        plan: plan.items.map((i) => ({ treatment: catalog.services.get(i.serviceId)?.name, date: i.date, days_before: i.daysBefore, less_lead_time_than_ideal: i.tight })),
        left_out_too_close: plan.skipped.map((s) => ({ treatment: catalog.services.get(s.serviceId)?.name, needs_days_before: s.minDays })),
        estimated_total: estimate.total,
        note: "The card shows every date and a rough estimate; don't repeat the dates in a list. In one or two sentences, mention anything left out and that it's a plan to confirm with the team. The card has Request this plan and Save image buttons; don't add chips for those.",
      },
      cards: [
        {
          type: 'event_plan',
          label,
          eventDate: p.data.event_date,
          daysToGo: plan.daysToGo,
          items: plan.items.map((i) => ({ service: view(i.serviceId), date: i.date, daysBefore: i.daysBefore, tight: i.tight })),
          skipped: plan.skipped.map((s) => ({ service: view(s.serviceId), minDays: s.minDays })),
          estimate,
        },
      ],
    };
  },

  show_care_guide(input, ctx) {
    const p = parse(schemas.show_care_guide, input);
    if (!p.ok) return fail(p.error);
    const s = ctx.catalog.services.get(p.data.service_id);
    if (!s) return fail(`Unknown service_id "${p.data.service_id}".`);
    const care = s.details.care;
    const before = pickList(care?.before, ctx.lang);
    const after = pickList(care?.after, ctx.lang);
    return {
      result: { shown: true, treatment: s.name, note: "The guide is shown. Don't go beyond it; personal health questions go to a provider." },
      cards: [
        {
          type: 'care_guide',
          service: ctx.catalog.serviceView(s.id, ctx.lang, ctx.today)!,
          before: before.length ? before : s.details.prep ? [pick(s.details.prep, ctx.lang)] : [],
          dayOf: pickList(care?.day_of, ctx.lang),
          after: after.length ? after : s.details.aftercare ? [pick(s.details.aftercare, ctx.lang)] : [],
          focus: p.data.focus ?? 'all',
        },
      ],
    };
  },

  estimate_visit(input, ctx) {
    const p = parse(schemas.estimate_visit, input);
    if (!p.ok) return fail(p.error);
    const { catalog } = ctx;
    const all = [...p.data.service_ids, ...(p.data.add_on_ids ?? [])];
    const services = all.filter((id) => catalog.services.has(id));
    const addOns = all.filter((id) => catalog.addOns.has(id));
    const unknown = all.filter((id) => !catalog.services.has(id) && !catalog.addOns.has(id));
    if (unknown.length) return fail(`Unknown IDs: ${unknown.join(', ')}.`);
    if (!services.length) return fail('Include at least one treatment.');
    const estimate = catalog.estimate([...new Set(services)], [...new Set(addOns)], ctx.today);
    ctx.extraAmounts.add(estimate.total);
    return {
      result: {
        shown: true,
        estimated_total: estimate.total,
        total_starts_from: estimate.totalIsFrom,
        priced_at_the_visit: estimate.perUnit,
        note: "This is a rough estimate, not a quote: say so in a few words. Treatments priced per unit or syringe aren't in the total; the provider sets the amount at the visit.",
      },
      cards: [{ type: 'estimate', estimate }],
    };
  },

  show_membership_savings(input, ctx) {
    const p = parse(schemas.show_membership_savings, input);
    if (!p.ok) return fail(p.error);
    const visits = p.data.visits_per_year ?? 12;
    const r = ctx.catalog.membershipSavings(p.data.membership_id, visits);
    if (!r) return fail('No membership is offered.');
    for (const v of [r.payAsYouGo, r.member, Math.abs(r.savings)]) ctx.extraAmounts.add(v);
    return {
      result: {
        shown: true,
        visits_per_year: visits,
        yearly_savings: r.savings,
        note:
          r.savings > 0
            ? "Savings are shown on the card as an estimate based on regular prices. Don't pressure; one sentence is enough."
            : 'At this many visits the membership costs more than paying per visit. Say so honestly.',
      },
      cards: [
        {
          type: 'membership',
          name: r.membership.name,
          monthlyPrice: r.membership.monthly_price,
          includedService: r.service.name,
          perMonth: r.membership.includes.per_month,
          discountPercent: r.membership.member_discount_percent,
          visitsPerYear: visits,
          payAsYouGo: r.payAsYouGo,
          member: r.member,
          savings: r.savings,
          terms: r.membership.terms,
        },
      ],
    };
  },

  show_first_visit(input, ctx) {
    const p = parse(schemas.show_first_visit, input);
    if (!p.ok) return fail(p.error);
    const card = firstVisitCard(ctx.catalog, ctx.lang);
    if (!card) return fail('No first-visit information is set up.');
    return { result: { shown: true, note: 'The first-visit card is shown, including the new-guest form button.' }, cards: [card] };
  },

  show_unanswered_questions(input, ctx) {
    const p = parse(schemas.show_unanswered_questions, input);
    if (!p.ok) return fail(p.error);
    if (!ctx.insights) return fail('The report is only available in staff mode.');
    const card = ctx.insights();
    const counts = card.type === 'insights' ? { conversations: card.conversations, unanswered: card.unanswered.length } : {};
    return { result: { shown: true, ...counts, note: 'The report card is shown. Suggest sending answers to the agency so the concierge can learn them.' }, cards: [card] };
  },
};

export function urgentCard(kind: 'post_treatment' | 'emergency' | 'crisis', catalog: Catalog, lang: Lang): Card {
  const S = strings(lang);
  const b = catalog.config.business;
  const msg = catalog.bundle.urgent[kind];
  const fill = (s: string) =>
    s.replaceAll('{urgent_line}', b.urgent_line).replaceAll('{crisis_line}', b.crisis_line).replaceAll('{business_name}', b.name);
  const urgentTel = `tel:${normalizePhone(b.urgent_line, catalog.config.booking.allowed_phone_countries) ?? b.urgent_line.replace(/[^\d+]/g, '')}`;
  const crisisDigits = b.crisis_line.replace(/\D/g, '');
  const actions =
    kind === 'crisis'
      ? [
          { label: S.call988.replace('988', b.crisis_line), href: `tel:${crisisDigits}` },
          { label: S.text988.replace('988', b.crisis_line), href: `sms:${crisisDigits}` },
          { label: S.call911, href: 'tel:911' },
        ]
      : kind === 'emergency'
        ? [
            { label: S.call911, href: 'tel:911' },
            { label: S.callUrgent, href: urgentTel },
          ]
        : [
            { label: S.callUrgent, href: urgentTel },
            { label: S.call911, href: 'tel:911' },
          ];
  return { type: 'urgent', kind, title: fill(pick(msg.title, lang)), body: fill(pick(msg.body, lang)), actions };
}

// Models sometimes send null or "" for optional fields; treat those as not given.
function dropEmpty(input: unknown): unknown {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return input;
  return Object.fromEntries(Object.entries(input).filter(([, v]) => v !== null && v !== ''));
}

export function handleTool(name: string, input: unknown, ctx: ToolContext): ToolOutcome {
  const handler = handlers[name];
  if (!handler) return fail(`Unknown tool "${name}".`);
  return handler(dropEmpty(input), ctx);
}
