// Output checks (D13): every reply, card reason, and chip is checked in code before it's shown.
import { type Catalog, minutesOf, money, TIME_SPAN } from '../catalog.ts';
import { containsCardNumber } from '../safety/cardNumbers.ts';

export interface CheckResult {
  ok: boolean;
  problems: string[];
  promotionsMentioned: string[];
}

const PRICE = /\$\s?(\d{1,3}(?:,\d{3})+|\d+)(?:\.(\d{1,2}))?/g;
const PERCENT = /(\d{1,3}(?:\.\d+)?)\s?(?:%|percent\b|por ciento\b)/gi;
const URL_RE = /\b(?:https?:\/\/|www\.)[^\s<>"'()[\]]+/gi;
const PHONE = /(?<!\d)(?:\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}(?!\d)/g;
export const MAX_REPLY_CHARS = 1500;
const DOWNTIME_CLAIM = /\b(?:no|zero|minimal|little(?: to no)?|without(?: any)?|hardly any|almost no)\s+(?:real\s+)?downtime\b|\bno recovery time\b|\bback to (?:your )?(?:normal|day|routine) (?:right away|immediately|the same day)\b/i;
const FREE_CONSULT = /\b(?:free|complimentary|no[- ]cost|no[- ]charge)\b[^.!?\n]{0,25}\bconsult|\bconsult(?:ation)?s?\b[^.!?\n]{0,20}\b(?:is|are)\s+(?:always\s+)?(?:free|complimentary|no[- ]cost)\b/i;

// extraAmounts: totals a planning tool computed this turn (an estimate, a membership comparison).
// Staff mode (D64) skips the price, discount, and phone checks: practice calls role-play guests who
// get prices wrong on purpose. Links, card numbers, and length are always checked.
export function checkText(
  text: string,
  catalog: Catalog,
  today: string,
  maxLength = MAX_REPLY_CHARS,
  extraAmounts?: Set<number>,
  audience: 'guest' | 'staff' = 'guest',
): CheckResult {
  const problems: string[] = [];
  const guest = audience === 'guest';

  const amounts = [...catalog.allowedAmounts(today), ...(extraAmounts ?? [])];
  for (const m of guest ? text.matchAll(PRICE) : []) {
    const value = Number(`${(m[1] ?? '').replace(/,/g, '')}${m[2] ? `.${m[2]}` : ''}`);
    if (!amounts.some((a) => Math.abs(a - value) < 0.005)) problems.push(`the price ${money(value)} isn't in the catalog or an active promotion`);
  }

  const percents = catalog.allowedPercents(today);
  for (const m of guest ? text.matchAll(PERCENT) : []) {
    const value = Number(m[1]);
    if (!percents.has(value)) problems.push(`${value}% doesn't match an active promotion`);
  }

  const allowedUrls = catalog.allowedUrls();
  const allowedDomains = new Set(catalog.config.security.allowed_domains);
  for (const m of text.matchAll(URL_RE)) {
    const raw = m[0].replace(/[.,;:!?]+$/, '');
    const url = raw.startsWith('www.') ? `https://${raw}` : raw;
    let host = '';
    try {
      host = new URL(url).hostname;
    } catch {
      host = '';
    }
    const ok = allowedUrls.some((a) => url === a || url.startsWith(`${a}/`)) || allowedDomains.has(host);
    if (!ok) problems.push(`the link ${raw} isn't one of the business's links`);
  }

  // A length of time must come from the spa's own data, never a guess. In a sentence that names a
  // treatment, it must be that treatment's own length (or a time in its own details).
  const anyMinutes = catalog.allowedMinutes();
  const services = [...catalog.services.values()];
  for (const sentence of guest ? text.split(/(?<=[.!?])\s+|\n+/) : []) {
    const named = services.filter((s) => sentence.toLowerCase().includes(s.name.toLowerCase()));
    const allowed = named.length ? new Set(named.flatMap((s) => [...catalog.minutesFor(s.id)])) : anyMinutes;
    for (const m of sentence.matchAll(TIME_SPAN)) {
      if (!allowed.has(minutesOf(m))) problems.push(`"${m[0]}" isn't a length of time the spa gave${named.length ? ` for ${named.map((s) => s.name).join(' or ')}` : ''}; leave the length out or offer to have the team answer`);
    }
  }

  // Downtime is said only for treatments whose downtime the spa gave (never "no downtime" by default).
  for (const sentence of guest ? text.split(/(?<=[.!?])\s+|\n+/) : []) {
    if (!DOWNTIME_CLAIM.test(sentence)) continue;
    const named = services.filter((s) => sentence.toLowerCase().includes(s.name.toLowerCase()));
    const unknown = named.length ? named.filter((s) => !s.details.downtime) : [];
    if (!named.length || unknown.length) {
      problems.push(`it describes downtime${unknown.length ? ` for ${unknown.map((s) => s.name).join(' and ')}` : ''}, which the spa hasn't listed; leave it out or offer to have the team answer`);
    }
  }

  // A consultation is free only if the spa lists it at $0.
  if (guest && FREE_CONSULT.test(text)) {
    const consults = services.filter((s) => /consult/i.test(s.name));
    if (!consults.some((s) => s.price.amount === 0)) {
      problems.push(`it calls a consultation free or complimentary; ${consults.length ? consults.map((s) => `${s.name} is ${money(s.price.amount ?? 0)}`).join(', ') : "the spa hasn't said it is"}`);
    }
  }

  // Words the spa asked never to use (quoted in its voice rules), for example "painless".
  for (const word of guest ? catalog.avoidWords() : []) {
    if (new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(text)) problems.push(`it uses "${word}", which the spa asked never to use`);
  }

  const phones = catalog.allowedPhoneDigits();
  for (const m of guest ? text.matchAll(PHONE) : []) {
    const digits = m[0].replace(/\D/g, '').replace(/^1(?=\d{10}$)/, '');
    if (!phones.has(digits)) problems.push(`the phone number ${m[0].trim()} isn't the business phone or urgent line`);
  }

  if (containsCardNumber(text)) problems.push('it contains a card number');
  if (text.length > maxLength) problems.push(`it's too long (${text.length} characters; the limit is ${maxLength})`);

  const promotionsMentioned = catalog
    .activePromotions(today)
    .filter((p) => (p.percentOff !== undefined && text.includes(`${p.percentOff}%`)) || p.prices.some((pr) => text.includes(money(pr.now))))
    .map((p) => p.id);

  return { ok: problems.length === 0, problems, promotionsMentioned };
}
