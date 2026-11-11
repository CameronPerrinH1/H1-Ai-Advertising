// House rules a program can check on every reply (the judgment calls are left to the grader).
import type { Catalog } from '@concierge/backend';
import type { Run } from './types.ts';

export interface Flag {
  rule: string;
  severity: 'major' | 'minor';
  note: string;
}

const STOP = new Set('a an and are as at be but by can for from has have i if in is it its me my of on or our so that the their them they this to was we what when which will with you your'.split(' '));
const words = (s: string) => new Set((s.toLowerCase().match(/[a-z0-9$']+/g) ?? []).filter((w) => !STOP.has(w)));
const overlap = (a: string, b: string) => {
  const x = words(a), y = words(b);
  if (x.size < 4 || y.size < 4) return 0;
  let both = 0;
  for (const w of x) if (y.has(w)) both++;
  return both / Math.min(x.size, y.size);
};
const sentences = (t: string) => t.split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter(Boolean);

const BROWSING = /\bjust (looking|browsing|starting|researching|exploring)|\b(time ?line|time ?frame)\b|\bhow soon (are you|do you|would you)|\bready to (book|commit)\b\?/i;
const EVENT = /\b(wedding|event|party|reunion|vacation|trip|photos?|date|graduation|birthday|holiday)\b/i;
const LEAK = /\b(suggest_replies|show_[a-z_]+|get_booking_link|request_(appointment|callback))\b|<\/?[a-z_]+>/;
const BOOKING_WORDS = /\b(book|schedule|reserve|grab (a|her|your) (spot|time|opening)|request an appointment)\b/i;

export function codeChecks(run: Run, catalog: Catalog) {
  const guestMentionsEvent = run.turns.some((t) => EVENT.test(t.guest));
  const consultFree = [...catalog.services.values()].some((s) => /consult/i.test(s.name) && s.price.amount === 0);

  for (const t of run.turns) {
    if (t.via === 'confirm') continue;
    const text = t.reply.text;
    const ss = sentences(text);
    const add = (rule: string, severity: Flag['severity'], note: string) => t.flags.push({ rule, severity, note });

    for (let a = 0; a < ss.length; a++)
      for (let b = a + 1; b < ss.length; b++)
        if (overlap(ss[a]!, ss[b]!) >= 0.5) add('repeats', 'major', `Says the same thing twice: "${ss[a]}" / "${ss[b]}"`);

    if (BROWSING.test(text) && !guestMentionsEvent) add('browsing-question', 'major', 'Asks about a timeline or whether they are just looking.');
    if (ss.length > 4 || text.length > 420) add('too-long', 'minor', `${ss.length} sentences, ${text.length} characters.`);
    if (LEAK.test(text)) add('leaked-markup', 'major', 'Tool names or tags appear in the reply text.');
    if (!consultFree && /\b(complimentary|free)\s+(consult|consultation)/i.test(text)) add('free-consult', 'major', 'Calls the consultation free; it is not.');
    if (/\b(cheap|discount)\b/i.test(text)) add('voice', 'minor', 'Uses "cheap" or "discount" (on the spa\'s list of words to avoid).');
    if (!text.trim() && !t.reply.cards.length) add('empty', 'major', 'Nothing was said or shown.');
    if (t.ms > 8000) add('slow', 'minor', `Took ${(t.ms / 1000).toFixed(1)}s.`);
    if (t.fellBack) add('fallback', 'major', `Fell back to the safe reply.${t.blocked?.length ? ` Blocked because: ${t.blocked.join(' / ')}` : ' (a tool limit was hit)'}`);
  }

  const e = run.scenario.expect;
  if (!e) return;
  const replies = run.turns.filter((t) => t.via !== 'confirm');
  const all = replies.map((t) => t.reply.text).join('\n').toLowerCase();
  if (e.booksBy) {
    const at = replies.findIndex(
      (t) => t.reply.cards.some((c) => c.type === 'booking_link' || c.type === 'openings' || c.type === 'confirm') || BOOKING_WORDS.test(t.reply.text) || t.reply.quickReplies.some((q) => BOOKING_WORDS.test(q)),
    );
    if (at === -1 || at + 1 > e.booksBy) run.flags.push({ rule: 'slow-to-book', severity: 'major', note: `No booking step by reply ${e.booksBy}${at === -1 ? ' (never offered)' : ` (first at reply ${at + 1})`}.` });
  }
  for (const want of e.mentions ?? []) if (!all.includes(want.toLowerCase())) run.flags.push({ rule: 'missing', severity: 'major', note: `Never mentions "${want}".` });
  if (e.urgent && !replies.some((t) => t.reply.cards.some((c) => c.type === 'urgent'))) run.flags.push({ rule: 'no-urgent-card', severity: 'major', note: 'The urgent help card was not shown.' });
}
