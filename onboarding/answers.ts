/*
 * Everything the wizard collects, as one typed object.
 *
 * This is the backbone: the screens read and write it, the server will store
 * it per section, and the export turns it into the concierge's config. A field
 * is added here first, then given a screen.
 *
 * Grows a screen at a time. Built so far: Parts 1, 2, and 3.
 */

import { CONCERNS, HANDOFF, INJECTABLE, PAIRINGS, TACTICS, TIER_DEFAULTS, TIER_DEFAULTS_SKIN } from './content'
import type { Spa } from './spa'

/** g: the guest, y: the spa's reply, s: a note from the form. */
export type RpMsg = { r: 'g' | 'y' | 's'; t: string }
export type Priority = 'high' | 'normal' | 'none'
export type PriceMode = 'default' | 'exact' | 'starting' | 'never'
export type Fallback = 'consult' | 'frontdesk'

export type Service = {
  n: string; cat: string; pr: Priority; why: string
  /** Other services worth suggesting, up to 3. */
  pair: string[]
  /** Upgrades within the same appointment, comma separated. */
  add: string
  consult: boolean
  price: PriceMode
}
export type Product = {
  n: string; brand: string; cat: string; pr: Priority; why: string
  /** Services it's suggested after, and concerns it helps with; up to 3 each. */
  after: string[]; helps: string[]
  where: 'both' | 'instore' | 'online'
}
export type Concern = { n: string; svc: string[]; fb: Fallback }
/**
 * Dates are calendar days in the spa's time zone (YYYY-MM-DD), so a promotion
 * ends at the end of the spa's day, not the visitor's.
 */
export type Promo = {
  id: string; n: string; terms: string
  /** Evergreen: always running, no dates (start and end are ignored). */
  type: 'current' | 'evergreen' | 'upcoming' | 'yearly'
  start: string; end: string
  /** Evergreen: who qualifies, like "First-time guests". Optional. */
  elig?: string
  /** Yearly: the months it usually runs, 1 to 12. */
  sm: number; em: number
  apply: string[]
  /** The event it belongs to, or '' when it's open to everyone. */
  ev: string
}
export type Event = {
  id: string; n: string; type: 'upcoming' | 'yearly'
  date: string; month: number; time: string; loc: string; what: string
  who: 'public' | 'members' | 'invite'
  /** Guests RSVP on a contact card in the chat (D52), at a link, or not at all. */
  rsvp: 'card' | 'link' | 'none'
  link: string
}

/**
 * Whether a promotion's terms name an amount off the chat can check, like
 * "20% off" or "$50 off". Matches parseDiscount in concierge/backend/src/intake/apply.ts,
 * which refuses a promotion without one.
 */
export const hasDiscount = (terms: string) =>
  /(\d+(?:\.\d+)?)\s?(?:%|percent\b)/i.test(terms)
  || /\$\s?(\d+(?:\.\d{1,2})?)\s*off\b/i.test(terms) || /\b(\d+(?:\.\d{1,2})?)\s*dollars?\s+off\b/i.test(terms)

/** A short id for list items that other answers point to. */
export const newId = () => Math.random().toString(36).slice(2, 10)

export type NameStyle = '' | 'first' | 'brand' | 'title' | 'generic'
export type AvatarType = 'portrait' | 'logo' | 'icon'
export type Terms = { guests: string; treatments: string; providers: string; book: string }

export type Answers = {
  /* Name and look */
  feel: string[]
  nameStyle: NameStyle
  name: string
  ideas: [string, string][]
  avoid: string
  subtitle: string
  avType: AvatarType
  avId: number

  /* Tone */
  tone: string
  emoji: 'never' | 'occasionally'
  exclaim: 'yes' | 'sparingly' | 'never'
  length: 'short' | 'detail'

  /* Your words. `__other` means the spa typed its own, in termsOther. */
  terms: Terms
  termsOther: Terms
  brandNames: 'brand' | 'category' | 'either'
  greeting: number
  greetingCustom: string
  signoff: number
  signoffCustom: string

  /* Languages (D47) */
  languages: string[]
  langMode: 'match' | 'offer'
  langHandoff: 'yes' | 'no'

  /* Pricing and the never-say list */
  pricing: 'exact' | 'starting' | 'never'
  /** One per NEVER rule, in order; false means the spa unticked it. */
  never: boolean[]
  neverCustom: string[]

  /* How they talk (D73). Screenshots are never part of the answers: they're
     read once and discarded, and only the approved replies are kept. */
  /** The website to read; null until they change the one on file. */
  website: string | null
  instagram: string
  /** How many screenshots are on the screen now (never the images), so the
      permission tick can be required when there are any. */
  shots: number
  /** Which sounds like you: per PAIRS index, the reply they picked. */
  pairs: Record<number, 'a' | 'b'>
  /** Their own replies, per QUICK index. Tone samples only: any prices, times or
      offers in them are never used as facts (09-intake-wizard.md §4.2). */
  quick: Record<number, string>
  pasted: string
  attest: boolean

  /* Handoffs: per HANDOFF key, the option picked, or -1 for their own words. */
  handoff: Record<string, number>
  handoffCustom: Record<string, string>

  /** Anything else on their mind, at the end of Part 1 and Part 2 (Cameron, Nov 19). For H1:
      exported with the playbook, never given to the chat. */
  notes1: string
  notes2: string

  /* Urgent and emergency lines, confirmed at sign-off (D74). */
  em: { t1: string[]; t2: string[]; s1: string; s2: string; urgent: string; hours: string; after: string }

  /* Part 2: the Sales Playbook. Services and products start from the spa's
     onboarding form; everything here is reviewed by the spa. */
  services: Service[]
  concerns: Concern[]
  /** Pregnant or nursing guests: assigned to the medical director. */
  preg: { svc: string[]; fb: Fallback }
  products: Product[]
  /** Packages to grow, each with why a guest should buy it. */
  /** `added`: packages the spa added here, beyond the ones on file (spa.catalog.packages). */
  growth: { pk: Record<string, string>; diffs: string[]; spec: string; comp: string; added: string[] }
  promos: Promo[]
  events: Event[]
  /** Who tells H1 when promotions or events change. */
  promoOwner: { name: string; email: string }
  /** Per objection, the approaches in the order to try them. */
  obj: Record<string, string[]>
  tac: {
    discount: 'never' | 'asked' | 'proactive' | 'hesitate'
    /** With 'hesitate': the promotion to offer, by id. */
    hesitate: string
    offer: 'early' | 'answered' | 'asked'
    push: 'most' | 'educate' | 'asked'
    urgency: 'never' | 'real'
  }
  /* Part 3. The role-play, per SCENARIOS id: the conversation, whether it's
     finished, and anything they'd normally add. Tone samples only, like the
     Part 1 replies (09-intake-wizard.md §4.2). */
  rp: { cur: string; logs: Record<string, RpMsg[]>; done: Record<string, boolean>; adds: Record<string, string> }
  /**
   * Sign-off: the person filling in the form approves it. `hash` fingerprints
   * the answers they signed, so a later change shows it needs signing again
   * (D74). The server keeps its own record of the version signed.
   */
  sign: { name: string; title: string; attest: boolean; signedAt: string; hash: string }

  /** Which concern (-1 for pregnancy) and objection the preview is showing. */
  concView: number
  /** The service open for editing (and in the preview), or -1. */
  svcView: number
  /** Role-play replies typed but not sent, per scenario. Not part of what's approved. */
  rpDrafts: Record<string, string>
  objView: string

  /** Single-choice questions the spa has chosen an answer for (PICKS). Nothing
      starts picked: until then the question shows no choice and Continue waits. */
  picked: Record<string, boolean>

  /* Where they are, and what they've seen. */
  cur: string
  visited: Record<string, boolean>
  help: Record<string, boolean>
}

export function defaults(spa: Spa): Answers {
  const names = spa.catalog.services.map((x) => x.n)
  /* The spa's own name for a suggested treatment: the same name, or the first
     that contains it ("HydraFacial" → "Hydrafacial Deluxe"). */
  const own = (n: string) => names.includes(n) ? n : names.find((x) => x.toLowerCase().includes(n.toLowerCase()))
  /* Urgent lines: injection-site wording only for a spa that injects. */
  const tiers = spa.catalog.services.some((x) => INJECTABLE.test(`${x.n} ${x.cat}`)) ? TIER_DEFAULTS : TIER_DEFAULTS_SKIN
  const has = (list: string[]) => [...new Set(list.flatMap((n) => own(n) ?? []))]
  return {
    feel: [], nameStyle: '', name: '', ideas: [], avoid: '', subtitle: 'AI Treatment Coordinator',
    avType: 'portrait', avId: 0,
    tone: 'balanced', emoji: 'never', exclaim: 'sparingly', length: 'detail',
    terms: { guests: 'guests', treatments: 'treatments', providers: 'providers', book: 'book a consult' },
    termsOther: { guests: '', treatments: '', providers: '', book: '' },
    brandNames: 'brand', greeting: 0, greetingCustom: '', signoff: 0, signoffCustom: '',
    languages: ['English'], langMode: 'match', langHandoff: 'yes',
    pricing: 'starting', never: [true, true, true, true, true, true, true], neverCustom: [],
    website: null, instagram: '', shots: 0, pairs: {}, quick: {}, pasted: '', attest: false,
    handoff: { cant: 0, medical: 0, notoffered: 0, consult: 0, callback: 0, complaint: 0 },
    handoffCustom: { cant: '', medical: '', notoffered: '', consult: '', callback: '', complaint: '' },
    notes1: '', notes2: '',
    em: { t1: [...tiers.t1], t2: [...tiers.t2], s1: tiers.s1, s2: tiers.s2, urgent: '', hours: '24/7', after: '' },
    services: spa.catalog.services.map((x): Service => ({
      n: x.n, cat: x.cat, pr: 'normal', why: '', pair: has(PAIRINGS[x.n] ?? []), add: '', consult: false, price: 'default',
    })),
    concerns: CONCERNS.map(([n, svc]) => ({ n, svc: has(svc), fb: 'consult' })),
    preg: { svc: [], fb: 'consult' },
    products: spa.catalog.products.map((x): Product => ({ ...x, pr: 'normal', why: '', after: [], helps: [], where: 'both' })),
    growth: { pk: {}, diffs: [], spec: spa.catalog.uvp, comp: '', added: [] },
    promos: [], events: [], promoOwner: { name: '', email: '' },
    obj: { price: [], pain: [], downtime: [], results: [] },
    tac: { discount: 'asked', hesitate: '', offer: 'answered', push: 'educate', urgency: 'real' },
    rp: { cur: 'price', logs: {}, done: {}, adds: {} },
    sign: { name: '', title: '', attest: false, signedAt: '', hash: '' },
    concView: 0, objView: 'price', svcView: -1, rpDrafts: {},
    cur: 'welcome', visited: {}, help: {}, picked: {},
  }
}

/**
 * Every single-choice question: its key in `picked`, its screen, and what
 * Continue says while it's unanswered. Each starts with nothing chosen
 * (Cameron, Nov 9), so the spa makes every choice itself. The answer still
 * holds a value underneath, which only the preview uses until they choose.
 */
export const PICKS: [key: string, screen: string, msg: string][] = [
  ['look', 'name', 'Choose a look for your coordinator'],
  ['tone', 'tone', 'Pick the reply that sounds most like you'],
  ['emoji', 'tone', 'Choose whether to use emojis'],
  ['exclaim', 'tone', 'Choose how often to use exclamation points'],
  ['length', 'tone', 'Choose a reply length'],
  ['terms.guests', 'words', 'Choose what you call the people you serve'],
  ['terms.treatments', 'words', 'Choose what you call what you offer'],
  ['terms.providers', 'words', 'Choose what you call the people who perform them'],
  ['terms.book', 'words', 'Choose your booking phrase'],
  ['brandNames', 'words', 'Choose whether to use brand names'],
  ['greeting', 'words', 'Choose a greeting'],
  ['signoff', 'words', 'Choose a sign-off'],
  ['langMode', 'languages', 'Choose how your coordinator picks a language'],
  ['langHandoff', 'languages', 'Say whether your team can handle a handoff in Spanish'],
  ['pricing', 'pricing', 'Choose your default pricing rule'],
  ...Object.entries(HANDOFF).map(([k, h]): [string, string, string] => [`handoff.${k}`, 'handoffs', `Choose a reply for “${h.t}”`]),
  ...Object.entries(TACTICS).map(([k, t]): [string, string, string] => [`tac.${k}`, 'tactics', `Choose an option for ${t.t.toLowerCase()}`]),
]
/** The data-need tag of a pick's question, for Continue to scroll to. */
const pickAt = (k: string) => k.replace(/^terms\./, 'term-').replace(/^(handoff|tac)\./, '$1-')
/** What's still unpicked on a screen. The Spanish questions count only with Spanish on. */
export const unpicked = (a: Answers, screen: string) => PICKS
  .filter(([k, s]) => s === screen && !a.picked[k] && (!k.startsWith('lang') || a.languages.includes('Spanish')))
  .map(([k, , msg]) => ({ msg, at: pickAt(k) }))
/** The answer to show as chosen: the value once picked, otherwise none. */
export const shown = <T,>(a: Answers, k: string, v: T): T | null => (a.picked[k] ? v : null)

/** Saved answers over today's defaults, so a field added later gets its default. */
/**
 * How the answers are saved: one row per section (intake_sections), so typing
 * in Part 2 doesn't resend Part 1. `progress` is where the spa is in the form.
 */
export const SECTIONS = ['progress', 'part1', 'part2', 'part3'] as const
export type SectionName = (typeof SECTIONS)[number]
const SECTION_OF: Partial<Record<keyof Answers, SectionName>> = {
  cur: 'progress', visited: 'progress', help: 'progress', picked: 'progress', concView: 'progress', objView: 'progress', svcView: 'progress', rpDrafts: 'progress', shots: 'progress',
  services: 'part2', concerns: 'part2', preg: 'part2', products: 'part2', growth: 'part2', promos: 'part2', events: 'part2',
  promoOwner: 'part2', obj: 'part2', tac: 'part2', notes2: 'part2',
  rp: 'part3', sign: 'part3',
}
/** The answers split into their sections; anything not listed is Part 1. */
export function splitSections(a: Answers): Record<SectionName, Partial<Answers>> {
  const out = Object.fromEntries(SECTIONS.map((k) => [k, {}])) as Record<SectionName, Record<string, unknown>>
  for (const [k, v] of Object.entries(a)) out[SECTION_OF[k as keyof Answers] ?? 'part1'][k] = v
  return out as Record<SectionName, Partial<Answers>>
}

/**
 * A short fingerprint of the answers that matter, leaving out where the spa
 * is in the form and the sign-off itself. Only for spotting a change after
 * signing off; the server records a real content hash at sign-off (D74).
 */
export function answersHash(a: Answers) {
  const { cur: _c, visited: _v, help: _h, concView: _cv, objView: _ov, svcView: _sv, rpDrafts: _rd, shots: _s, sign: _g, picked: _p, ...rest } = a
  /* Keys sorted: saved answers come back from the database (jsonb) in another
     order, and the same answers must give the same fingerprint. */
  const text = JSON.stringify(rest, (_k, x: unknown) =>
    x && typeof x === 'object' && !Array.isArray(x) ? Object.fromEntries(Object.entries(x).sort(([p], [q]) => (p < q ? -1 : 1))) : x)
  let h = 0x811c9dc5
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 0x01000193)
  return (h >>> 0).toString(16)
}

export function withDefaults(saved: Partial<Answers> | null | undefined, spa: Spa): Answers {
  const base = defaults(spa)
  if (!saved) return base
  const out = { ...base, ...saved }
  for (const k of ['terms', 'termsOther', 'visited', 'help', 'pairs', 'quick', 'handoff', 'handoffCustom', 'em', 'preg', 'growth', 'promoOwner', 'obj', 'tac', 'rp', 'sign', 'rpDrafts'] as const) {
    out[k] = { ...base[k], ...(saved[k] ?? {}) } as never
  }
  /* Answers saved before nothing was pre-picked (Nov 9): what they saw on a
     screen they opened counts as their choice. */
  if (!saved.picked) out.picked = Object.fromEntries(PICKS.filter(([, s]) => saved.visited?.[s]).map(([k]) => [k, true]))
  /* Objection approaches became one choice each (Nov 4); older answers keep their first. */
  for (const k of Object.keys(out.obj)) out.obj[k] = (out.obj[k] ?? []).slice(0, 1)
  return out
}
