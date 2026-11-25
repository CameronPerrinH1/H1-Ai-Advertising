/*
 * The copy engine: turns the spa's answers into the sample replies shown in
 * the preview. Pure functions of (answers, spa), carried over from the
 * prototype. These are style previews, not the concierge (D71).
 */
import type { Answers } from './answers'
import type { Spa } from './spa'
import { DONTKNOW, GREETINGS, HANDOFF, PRICING, SIGNOFFS, SINGULAR, TONE_TEXT } from './content'

export type Msg = { r: 'bot' | 'gst' | 'meta' | 'alert'; t: string }

const FALLBACK_TERMS = { guests: 'guests', treatments: 'treatments', providers: 'providers', book: 'book a consult' }

/** The spa's words, with "Other" resolved to what they typed. */
export function terms(a: Answers) {
  const out = { ...FALLBACK_TERMS }
  for (const k of Object.keys(FALLBACK_TERMS) as (keyof typeof FALLBACK_TERMS)[]) {
    const v = a.terms[k]
    out[k] = v === '__other' ? (a.termsOther[k].trim() || FALLBACK_TERMS[k]) : v
  }
  return out
}

export const singular = (w: string) => SINGULAR[w] ?? w.replace(/ies$/, 'y').replace(/s$/, '')

/**
 * The coordinator's name as guests see it, however it was typed: each word
 * starts with a capital and the rest is lowercase ("mIA rose" → "Mia Rose",
 * "anne-marie" → "Anne-Marie").
 */
export const displayName = (name: string) =>
  name.trim().replace(/\s+/g, ' ').toLowerCase().replace(/(^|[\s-])(\p{L})/gu, (_, sep: string, c: string) => sep + c.toUpperCase())

/** The name shown in chat; the no-name option keeps "AI Treatment Coordinator" as written. */
export const coordName = (a: Answers) => (a.nameStyle === 'generic' ? a.name : displayName(a.name))

export const fillShort = (s: string, spa: Spa) => s.replace(/\{short\}/g, spa.short)

/** Fill every placeholder, then apply the exclamation and emoji settings. */
export function voice(a: Answers, spa: Spa, str: string, opts: { noBang?: boolean } = {}) {
  const t = terms(a)
  const generic = a.nameStyle === 'generic'
  let s = String(str)
    .replace(/\{disclosureYour\}/g, generic ? 'I’m your AI Treatment Coordinator.' : 'I’m {name}, your AI Treatment Coordinator.')
    .replace(/\{disclosure\}/g, generic ? 'I’m {spa}’s AI Treatment Coordinator.' : 'I’m {name}, {spa}’s AI Treatment Coordinator.')
    .replace(/\{dontknow\}/g, DONTKNOW[0]!)
    .replace(/\{name\}/g, coordName(a) || '[Name]')
    .replace(/\{spa\}/g, spa.name)
    .replace(/\{C\}/g, spa.commitment)
    .replace(/\{urgent\}/g, a.em.urgent.trim() || spa.urgent)
    .replace(/\{guests\}/g, t.guests).replace(/\{guest\}/g, singular(t.guests))
    .replace(/\{treatments\}/g, t.treatments).replace(/\{treatment\}/g, singular(t.treatments))
    .replace(/\{providers\}/g, t.providers).replace(/\{provider\}/g, singular(t.providers))
    .replace(/\{book\}/g, t.book)
    .replace(/\{botox\}/g, a.brandNames !== 'category' ? 'Botox' : 'neurotoxin')
    .replace(/\{promo\}/g, 'ask us about current offers')
  let bang = 0, emo = 0
  s = s.replace(/\{!\}/g, () => {
    bang++
    if (a.exclaim === 'yes') return '!'
    if (a.exclaim === 'sparingly' && bang === 1 && !opts.noBang) return '!'
    return '.'
  })
  s = s.replace(/\{e\}/g, () => (++emo === 1 && a.emoji === 'occasionally' ? ' 😊' : ''))
  return s.replace(/\.\./g, '.').replace(/\s+([.!?])/g, '$1')
}

export function greetingText(a: Answers, spa: Spa) {
  const raw = a.greeting === -1 && a.greetingCustom.trim() ? a.greetingCustom : GREETINGS[a.greeting] ?? GREETINGS[0]!
  return voice(a, spa, raw).replace(/([.!?])(\s|$)/, (_m, p: string, ws: string) => p + (a.emoji === 'occasionally' ? ' 😊' : '') + ws)
}

export function toneReply(a: Answers, spa: Spa) {
  const lines = TONE_TEXT[a.tone] ?? TONE_TEXT.balanced!
  return voice(a, spa, (a.length === 'short' ? [lines[0], lines[1], lines[3]] : lines).join(' '))
}

/** The default preview: a greeting, a lip filler question, and a polite exit. */
export function genericConvo(a: Answers, spa: Spa): Msg[] {
  const signoff = a.signoff === -1 || (a.signoff === -2 && !a.signoffCustom.trim())
    ? voice(a, spa, 'Of course. I’m here if you have more questions.')
    : voice(a, spa, 'Of course. ' + (a.signoff === -2 ? a.signoffCustom.trim() : SIGNOFFS[a.signoff] ?? SIGNOFFS[0]))
  return [
    { r: 'bot', t: greetingText(a, spa) },
    { r: 'gst', t: 'Do you do lip filler?' },
    { r: 'bot', t: voice(a, spa, 'Yes{!} Lip filler is one of our most-requested {treatments}.') + ' ' + pricingLine(a, spa) + ' ' + voice(a, spa, 'Would you like to {book}?') },
    { r: 'gst', t: 'Not yet, thank you.' },
    { r: 'bot', t: signoff },
  ]
}

/** How a price is said: the Part 1 rule, or a service's own (Part 2). */
export function pricingLine(a: Answers, spa: Spa, mode?: string) {
  const v = !mode || mode === 'default' ? a.pricing : mode
  return voice(a, spa, (PRICING.find((p) => p.v === v) ?? PRICING[1]).r)
}

export function handoffText(a: Answers, spa: Spa, k: string) {
  const i = a.handoff[k] ?? 0
  return voice(a, spa, i === -1 ? (a.handoffCustom[k] ?? '') : HANDOFF[k]!.o[i] ?? HANDOFF[k]!.o[0]!)
}
