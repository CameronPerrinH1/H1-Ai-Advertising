// The client's catalog: menu, details, providers, promotions, and the facts cards and checks rely on.
import type { EstimateView, Lang, Price, ProviderView, ServiceView } from '@concierge/shared';
import type { ClientBundle } from './config/load.ts';
import type { Localized, LocalizedList, PriceMode } from './config/schema.ts';

export function pick(value: Localized | undefined, lang: Lang): string {
  if (value === undefined) return '';
  if (typeof value === 'string') return value;
  return (lang === 'es' ? value.es : undefined) ?? value.en;
}

export function pickList(value: LocalizedList | undefined, lang: Lang): string[] {
  if (value === undefined) return [];
  if (Array.isArray(value)) return value;
  return (lang === 'es' ? value.es : undefined) ?? value.en;
}

export function money(amount: number): string {
  return Number.isInteger(amount) ? `$${amount}` : `$${amount.toFixed(2)}`;
}

const UNIT_LABEL: Record<Price['unit'], string> = { session: 'per session', unit: 'per unit', syringe: 'per syringe', area: 'per area' };

export function priceText(p: Price): string {
  if (p.consult) return 'priced at consultation';
  if (p.amount === 0) return 'free';
  return `${p.from ? 'from ' : ''}${money(p.amount)} ${UNIT_LABEL[p.unit]}`;
}

const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;
export type DayKey = (typeof DAY_KEYS)[number];

export interface LocalClock {
  date: string; // YYYY-MM-DD in the location's zone
  weekday: string; // "Friday"
  dayKey: DayKey;
  time: string; // "3:42 PM"
  zone: string; // "PDT"
  minutes: number; // minutes since local midnight
  longDate: string; // "October 23, 2026"
}

export function localClock(timezone: string, now: Date): LocalClock {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long',
      hour: 'numeric',
      minute: '2-digit',
      hourCycle: 'h12',
      timeZoneName: 'short',
    })
      .formatToParts(now)
      .map((p) => [p.type, p.value]),
  );
  const iso = new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
  const h24 = Number(new Intl.DateTimeFormat('en-US', { timeZone: timezone, hour: 'numeric', hourCycle: 'h23' }).format(now));
  const minute = Number(parts.minute);
  const dayIndex = new Date(`${iso}T12:00:00Z`).getUTCDay();
  return {
    date: iso,
    weekday: parts.weekday ?? '',
    dayKey: DAY_KEYS[dayIndex] ?? 'sun',
    time: `${parts.hour}:${parts.minute} ${parts.dayPeriod}`,
    zone: parts.timeZoneName ?? '',
    minutes: h24 * 60 + minute,
    longDate: `${parts.month} ${parts.day}, ${parts.year}`,
  };
}

export interface ServiceEntry {
  id: string;
  name: string;
  category: string;
  price: Price; // as guests see it, after the spa's price display choice
  listPrice: Price; // from the price list, for promotion math only
  priceMode: PriceMode;
  durationMinutes?: number; // none: the spa hasn't given it
  lastVerified: string;
  details: ClientBundle['details'][string];
}

export interface ActivePromo {
  id: string;
  description: string;
  terms?: string;
  ends?: string; // none: evergreen
  eligibility?: string;
  percentOff?: number;
  amountOff?: number;
  thirdPartyFunded: boolean;
  event?: string; // only for guests at this event
  prices: { serviceId: string; was: number; now: number }[];
}

// "45 minutes", "90-minute", "24 hours", "2 hrs" → minutes. Shared with the output checks.
export const TIME_SPAN = /(\d+(?:\.\d+)?)\s?-?\s?(minutes?|mins?|hours?|hrs?)\b/gi;
export const minutesOf = (m: RegExpMatchArray) => Number(m[1]) * (/^h/i.test(m[2] ?? '') ? 60 : 1);

export class Catalog {
  readonly services = new Map<string, ServiceEntry>();
  readonly addOns = new Map<string, { id: string; name: string; price: Price; durationMinutes: number }>();
  readonly providers = new Map<string, ClientBundle['providers'][number]>();

  constructor(readonly bundle: ClientBundle) {
    for (const s of bundle.services.services) {
      const details = bundle.details[s.id];
      if (!details) continue; // loader guarantees this exists
      const priceMode = bundle.config.sales.pricing.services[s.id] ?? bundle.config.sales.pricing.default;
      this.services.set(s.id, {
        id: s.id,
        name: s.name,
        category: s.category,
        price: displayPrice(s.price, priceMode),
        listPrice: s.price,
        priceMode,
        durationMinutes: s.duration_minutes,
        lastVerified: s.last_verified,
        details,
      });
    }
    for (const a of bundle.services.add_ons) {
      this.addOns.set(a.id, { id: a.id, name: a.name, price: a.price, durationMinutes: a.duration_minutes });
    }
    for (const p of bundle.providers) this.providers.set(p.id, p);
  }

  get config() {
    return this.bundle.config;
  }

  // A one-person business (business.team): the one provider, and the name the chat calls her by.
  get solo(): { name: string; fullName: string } | null {
    const { team, solo_name } = this.config.business;
    const only = this.providers.size === 1 ? [...this.providers.values()][0] : undefined;
    if (team === 'team' || (team === 'auto' && !only)) return null;
    const fullName = only?.name ?? solo_name;
    if (!fullName) return null;
    return { name: solo_name ?? fullName.split(/\s+/)[0]!, fullName };
  }

  // Active means today's local date is within the promotion's dates (no end date: always, once started). For covered entities,
  // third-party-funded promotions stay out unless approved (D58); the pilot has no approvals yet.
  activePromotions(today: string): ActivePromo[] {
    const covered = this.config.compliance_profile.hipaa_covered_entity;
    return this.config.sales.promotions
      .filter((p) => p.starts <= today && (!p.ends || today <= p.ends))
      .filter((p) => !(covered && p.third_party_funded))
      .map((p) => ({
        id: p.id,
        description: p.description,
        terms: p.terms,
        ends: p.ends,
        eligibility: p.eligibility,
        percentOff: p.percent_off,
        amountOff: p.amount_off,
        thirdPartyFunded: p.third_party_funded,
        event: p.event,
        // A treatment priced at consultation keeps its price private even on promotion.
        prices: p.services.flatMap((sid) => {
          const s = this.services.get(sid);
          if (!s || s.price.consult) return [];
          const list = s.listPrice.amount;
          const now = p.percent_off !== undefined ? list * (1 - p.percent_off / 100) : list - (p.amount_off ?? 0);
          return [{ serviceId: sid, was: list, now: Math.max(0, Math.round(now * 100) / 100) }];
        }),
      }));
  }

  // Every dollar amount the concierge may state today (D13).
  allowedAmounts(today: string): Set<number> {
    const amounts = new Set<number>([0]);
    for (const s of this.services.values()) amounts.add(s.price.amount);
    for (const a of this.addOns.values()) amounts.add(a.price.amount);
    for (const p of this.bundle.products) amounts.add(p.price);
    for (const promo of this.activePromotions(today)) {
      if (promo.amountOff !== undefined) amounts.add(promo.amountOff);
      for (const pr of promo.prices) amounts.add(pr.now);
    }
    for (const text of Object.values(this.config.knowledge.policies)) {
      for (const m of text.matchAll(/\$\s?(\d+(?:\.\d{1,2})?)/g)) amounts.add(Number(m[1]));
    }
    for (const m of this.config.sales.memberships) amounts.add(m.monthly_price);
    return amounts;
  }

  // Lengths of time, in minutes, the chat may state: service and add-on lengths, the arrival and
  // notice times, and any time written in the spa's own approved text (details, FAQs, policies,
  // fit rules). Nothing else, so the chat can't guess how long something takes.
  allowedMinutes(): Set<number> {
    const out = new Set<number>();
    for (const s of this.services.values()) if (s.durationMinutes) out.add(s.durationMinutes);
    for (const a of this.addOns.values()) out.add(a.durationMinutes);
    const c = this.config;
    if (c.first_visit) out.add(c.first_visit.arrive_minutes_early);
    out.add(c.booking.rules.min_notice_hours * 60);
    const texts: unknown[] = [Object.values(c.knowledge.policies), this.bundle.faqs, this.bundle.details, this.bundle.fitRules, c.first_visit];
    for (const m of JSON.stringify(texts).matchAll(TIME_SPAN)) out.add(minutesOf(m));
    return out;
  }

  // Words the spa asked never to use: anything quoted in its voice rules (for example “painless”).
  avoidWords(): string[] {
    return [...new Set(this.config.voice.donts.flatMap((d) => [...d.matchAll(/[“"]([^”"]{2,30})[”"]/g)].map((m) => m[1]!.trim())))];
  }

  // The lengths one service may be described with: its own length and any time in its own details.
  minutesFor(serviceId: string): Set<number> {
    const s = this.services.get(serviceId);
    const out = new Set<number>();
    if (!s) return out;
    if (s.durationMinutes) out.add(s.durationMinutes);
    for (const m of JSON.stringify(s.details).matchAll(TIME_SPAN)) out.add(minutesOf(m));
    return out;
  }

  allowedPercents(today: string): Set<number> {
    const promos = this.activePromotions(today).flatMap((p) => (p.percentOff !== undefined ? [p.percentOff] : []));
    const members = this.config.sales.memberships.flatMap((m) => (m.member_discount_percent !== undefined ? [m.member_discount_percent] : []));
    return new Set([...promos, ...members]);
  }

  // A rough visit estimate (D62). Code adds it up; the model never does. Per-unit and per-syringe
  // treatments are listed but left out of the total, since the provider decides the amount (D15).
  estimate(serviceIds: string[], addOnIds: string[], today: string): EstimateView {
    const promos = this.activePromotions(today);
    const lines: EstimateView['lines'] = [];
    const perUnit: string[] = [];
    let total = 0;
    let totalIsFrom = false;
    for (const id of serviceIds) {
      const s = this.services.get(id);
      if (!s) continue;
      const promoPrice = promos.flatMap((p) => p.prices).find((pr) => pr.serviceId === id)?.now;
      const counted = !s.price.consult && (s.price.unit === 'session' || s.price.unit === 'area');
      if (counted) {
        total += promoPrice ?? s.price.amount;
        if (s.price.from) totalIsFrom = true;
      } else {
        perUnit.push(s.name);
      }
      lines.push({ name: s.name, price: s.price, promoPrice, counted });
    }
    for (const id of addOnIds) {
      const a = this.addOns.get(id);
      if (!a) continue;
      total += a.price.amount;
      lines.push({ name: a.name, price: a.price, counted: true, addOn: true });
    }
    return { lines, total: Math.round(total * 100) / 100, totalIsFrom, perUnit };
  }

  // Yearly cost with and without a membership, in whole dollars. Honest when it doesn't save money.
  membershipSavings(membershipId: string | undefined, visitsPerYear: number) {
    const m = membershipId ? this.config.sales.memberships.find((x) => x.id === membershipId) : this.config.sales.memberships[0];
    if (!m) return undefined;
    const service = this.services.get(m.includes.service_id);
    if (!service || service.price.consult) return undefined;
    const price = service.price.amount;
    const included = 12 * m.includes.per_month;
    const extra = Math.max(0, visitsPerYear - included);
    const payAsYouGo = Math.round(visitsPerYear * price);
    const member = Math.round(12 * m.monthly_price + extra * price * (1 - (m.member_discount_percent ?? 0) / 100));
    return { membership: m, service, payAsYouGo, member, savings: payAsYouGo - member };
  }

  allowedUrls(): string[] {
    const links = this.config.booking.direct_links;
    return [
      links.default,
      ...Object.values(links.services),
      ...Object.values(links.providers),
      this.config.booking.self_service_link,
      this.config.business.privacy_policy_url,
      this.config.business.consumer_health_privacy_policy_url,
      this.config.first_visit?.intake_form_url,
      ...this.config.sales.events.map((e) => e.rsvp_link),
    ].filter((u): u is string => typeof u === 'string');
  }

  allowedPhoneDigits(): Set<string> {
    const digits = (s: string) => s.replace(/\D/g, '').replace(/^1(?=\d{10}$)/, '');
    return new Set([digits(this.config.business.phone), digits(this.config.business.urgent_line)]);
  }

  bookUrl(serviceId?: string, providerId?: string): string {
    const links = this.config.booking.direct_links;
    return (serviceId && links.services[serviceId]) || (providerId && links.providers[providerId]) || links.default;
  }

  // The consultation a service needs first: its configured prerequisite.
  consultFor(serviceId: string): ServiceEntry | undefined {
    const req = this.config.booking.rules.prerequisites.find((p) => p.service === serviceId)?.requires;
    return req ? this.services.get(req) : undefined;
  }

  providersFor(serviceId: string) {
    return [...this.providers.values()].filter((p) => p.services.includes(serviceId));
  }

  serviceView(id: string, lang: Lang, today: string): ServiceView | undefined {
    const s = this.services.get(id);
    if (!s) return undefined;
    const d = s.details;
    // A promotion only some guests qualify for (first-time guests) stays off the card, which every guest sees.
    const promo = this.activePromotions(today).find((p) => !p.eligibility && p.prices.some((pr) => pr.serviceId === id));
    const promoPrice = promo?.prices.find((pr) => pr.serviceId === id);
    const consult = d.requires_assessment ? this.consultFor(id) : undefined;
    return {
      id: s.id,
      name: s.name,
      category: s.category,
      price: s.price,
      promo: promo && promoPrice ? { id: promo.id, label: promo.description, price: promoPrice.now, ends: promo.ends } : undefined,
      durationMinutes: s.durationMinutes,
      downtime: d.downtime ? pick(d.downtime, lang) : undefined,
      results: d.results ? pick(d.results, lang) : undefined,
      summary: pick(d.summary, lang),
      ...(d.good_for.length ? { goodFor: d.good_for } : {}),
      image: d.image,
      requiresAssessment: d.requires_assessment,
      action: consult
        ? { kind: 'consult', url: this.bookUrl(consult.id), consultName: consult.name }
        : { kind: 'book', url: this.bookUrl(s.id) },
    };
  }

  providerView(id: string, lang: Lang): ProviderView | undefined {
    const p = this.providers.get(id);
    if (!p) return undefined;
    return {
      id: p.id,
      name: p.name,
      credentials: p.credentials,
      title: pick(p.title, lang),
      bio: pick(p.bio, lang),
      specialties: p.specialties,
      languages: p.languages,
      initials: p.name
        .split(/\s+/)
        .map((w) => w[0] ?? '')
        .join('')
        .slice(0, 2)
        .toUpperCase(),
      serviceNames: p.services.map((sid) => this.services.get(sid)?.name).filter((n): n is string => !!n),
      bookUrl: this.bookUrl(undefined, p.id),
    };
  }

  // By appointment only: no set hours, so never "open" or "closed".
  get byAppointment(): boolean {
    return !!this.config.business.locations[0]?.by_appointment;
  }

  openStatus(clock: LocalClock): { open: boolean; todayHours?: string } {
    const location = this.config.business.locations[0];
    const today = location?.hours[clock.dayKey];
    if (!today) return { open: false };
    const [start = '', end = ''] = today.split('-');
    return { open: clock.minutes >= toMinutes(start) && clock.minutes < toMinutes(end), todayHours: today };
  }

  isOpenDay(isoDate: string): boolean {
    if (this.byAppointment) return true;
    const key = DAY_KEYS[new Date(`${isoDate}T12:00:00Z`).getUTCDay()] ?? 'sun';
    return !!this.config.business.locations[0]?.hours[key];
  }

  // When the spa next opens, e.g. { day: 'Tuesday', time: '09:00', today: false }.
  nextOpening(clock: LocalClock): { dayKey: DayKey; time: string; today: boolean } | undefined {
    const hours = this.config.business.locations[0]?.hours ?? {};
    const startIndex = DAY_KEYS.indexOf(clock.dayKey);
    for (let i = 0; i < 8; i++) {
      const key = DAY_KEYS[(startIndex + i) % 7]!;
      const range = hours[key];
      if (!range) continue;
      const start = range.split('-')[0] ?? '';
      if (i === 0 && clock.minutes >= toMinutes(start)) continue;
      return { dayKey: key, time: start, today: i === 0 };
    }
    return undefined;
  }
}

// How a price is shown: "starting at" marks it as a from-price; at consultation hides the amount.
function displayPrice(p: Price, mode: PriceMode): Price {
  if (mode === 'at_consult') return { amount: 0, unit: p.unit, from: false, consult: true };
  if (mode === 'starting_at') return { ...p, from: true };
  return p;
}

function toMinutes(hhmm: string): number {
  return Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));
}
