// Output checks (D13): every reply, card reason, and chip is checked in code before it's shown.
import { type Catalog, money } from '../catalog.ts';
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
