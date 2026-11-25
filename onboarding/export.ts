/*
 * The export (09-intake-wizard.md, Section 5): a spa's approved answers as a
 * playbook file the concierge reads. Everything is resolved here, where the
 * wizard's wording lives: picks become the text the spa approved, `{…}`
 * placeholders are filled, and names stay names. The concierge's importer
 * matches names to its own ids, checks the result against its config schema,
 * and writes the spa's client folder (concierge/backend/src/intake/).
 *
 * Pure: answers and spa in, playbook out. scripts/export-playbook.ts reads the
 * database and writes the file.
 *
 * Tone only, never facts (§4.2): the spa's own replies become voice examples,
 * with any price, date, time, contact detail, or discount swapped for a
 * placeholder, so the concierge can't repeat one to a guest.
 */
import type { Answers } from './answers'
import { DIFFS, GREETINGS, HANDOFF, ICONS, LANGS, NEVER, OBJ, PAIRS, QUICK, SCENARIOS, SIGNOFFS } from './content'
import type { Spa } from './spa'
import { coordName, terms, toneReply, voice } from './voice'

export const PLAYBOOK_VERSION = 1

export type PriceMode = 'exact' | 'starting_at' | 'at_consult'
type Fallback = 'consult' | 'front_desk'

export type Playbook = {
  version: typeof PLAYBOOK_VERSION
  /** The intake spa, and the fingerprint of the answers the approvers saw (D74). */
  spa: { id: string; name: string; timeZone: string }
  contentHash: string
  /** Approvals of exactly these answers. Names and credentials only, no emails. */
  approvals: { role: 'owner' | 'md'; name: string; credential: string; approvedOn: string }[]
  exportedOn: string
  identity: {
    name: string
    /** The label beside the avatar; always contains "AI" (D45). */
    label: string
    avatar: { mode: 'portrait' | 'brand_mark' | 'illustrated'; id?: string }
    greeting: string
  }
  terminology: { guests: string; treatments: string; providers: string; booking: string }
  voice: {
    tone: string
    emoji: 'never' | 'occasionally'
    exclamation: 'yes' | 'sparingly' | 'never'
    length: 'short' | 'detail'
    signOff?: string
    dos: string[]
    neverSay: string[]
    /** Tone samples: what a guest said, and how the spa answers. */
    examples: { guest?: string; reply: string }[]
  }
  languages: ('en' | 'es')[]
  pricing: PriceMode
  services: {
    name: string; category: string
    priority: 'high' | 'normal' | 'none'
    /** Why it's high priority; for H1, never said to guests. */
    why: string
    pairsWith: string[]
    /** Upgrades within the same visit, as the spa named them. */
    upgrades: string[]
    consultFirst: boolean
    /** null: the spa's default (`pricing`). */
    price: PriceMode | null
  }[]
  concerns: { name: string; services: string[]; otherwise: Fallback }[]
  pregnancy: { services: string[]; otherwise: Fallback }
  products: {
    name: string; brand: string; category: string
    priority: 'high' | 'normal' | 'none'; why: string
    after: string[]; helpsWith: string[]
    sold: 'both' | 'in_store' | 'online'
  }[]
  growth: { packages: { name: string; why: string }[]; differentiators: string[]; inTheirWords: string; competitors: string }
  promotions: {
    key: string; name: string; terms: string
    /** Dated, yearly by month (1 to 12), or evergreen (always on, no dates). Dates are the spa's calendar days. */
    starts?: string; ends?: string; startMonth?: number; endMonth?: number
    evergreen?: true
    /** Evergreen: who qualifies, like "First-time guests". */
    eligibility?: string
    services: string[]
    /** Applies to everything the spa offers. */
    everything: boolean
    event?: string
  }[]
  events: {
    key: string; name: string; date?: string; month?: number; time: string; location: string; description: string
    audience: 'public' | 'members' | 'invite'
    rsvp: 'card' | 'link' | 'none'; link?: string
  }[]
  objections: { objection: string; answer: string }[]
  tactics: {
    promotions: 'never' | 'when_asked' | 'when_relevant' | 'on_hesitation'
    hesitationPromotion?: string
    offerContact: 'early' | 'after_first_answer' | 'when_asked'
    suggestBooking: 'most_replies' | 'after_educating' | 'when_asked'
    urgency: 'never' | 'real_deadlines_only'
  }
  /** `{response_time}` is the spa's callback promise, filled in by the concierge. */
  handoff: Record<'cant_answer' | 'medical' | 'not_offered' | 'consult_required' | 'callback' | 'complaint', string>
  /** The spa's own comments at the end of Part 1 and Part 2, for H1 to read. The chat never uses them. */
  notes?: { personalityProtocol?: string; salesPlaybook?: string }
  /** Medical director approved. `{urgent_line}` is filled in by the concierge. */
  urgent: { line: string; hours: string; afterHours: string; emergencySymptoms: string[]; urgentSymptoms: string[]; emergencyMessage: string; urgentMessage: string }
}

export type ExportMeta = {
  contentHash: string
  approvals: Playbook['approvals']
  /** The spa's today, YYYY-MM-DD. */
  today: string
}

/* Placeholders the concierge fills, kept through voice(), which would fill
   {C} and {urgent} with the spa's own values. */
const RESPONSE_TIME = '\u0001RT\u0001'
const URGENT_LINE = '\u0001UL\u0001'
const keep = (s: string) => s.replace(/\{C\}/g, RESPONSE_TIME).replace(/\{urgent\}/g, URGENT_LINE)
const restore = (s: string) => s.replaceAll(RESPONSE_TIME, '{response_time}').replaceAll(URGENT_LINE, '{urgent_line}')

const TONE_TEXT: Record<string, string> = {
  warm: 'Warm and casual, like texting a friend who works there.',
  'warm-bal': 'Warm and relaxed, while still clear and professional.',
  balanced: 'Balanced: friendly, clear, and professional.',
  'bal-pol': 'Professional and a little elevated, while still friendly.',
  polished: 'Polished: elevated and precise, like a luxury concierge.',
}

const HANDOFF_KEYS = { cant: 'cant_answer', medical: 'medical', notoffered: 'not_offered', consult: 'consult_required', callback: 'callback', complaint: 'complaint' } as const
const PRICE: Record<string, PriceMode | null> = { default: null, exact: 'exact', starting: 'starting_at', never: 'at_consult' }
const FB: Record<string, Fallback> = { consult: 'consult', frontdesk: 'front_desk' }
const LANG_CODE: Record<string, 'en' | 'es'> = { English: 'en', Spanish: 'es' }

const clean = (s: string) => s.trim().replace(/\s+/g, ' ')

/** A readable, unique id for promotions and events ("Fall Glow" → fall-glow). */
function keyer() {
  const used = new Set<string>()
  return (name: string, fallback: string) => {
    const base = name.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || fallback
    let key = base
    for (let i = 2; used.has(key); i++) key = `${base}-${i}`
    used.add(key)
    return key
  }
}

const MONTH = '(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)'
const WEEKDAY = '(?:mon|tues?|wed(?:nes)?|thu(?:rs)?|fri|sat(?:ur)?|sun)(?:day)?'

/**
 * Tone only (§4.2): swaps anything factual in a sample for a placeholder:
 * prices, discounts, dates, times, contact details, free offers, and any
 * other number (units and syringes would read as dosing).
 * Over-eager on purpose: a lost number in a tone sample costs nothing.
 */
export function toneOnly(text: string): string {
  return clean(text)
    .replace(/\bhttps?:\/\/\S+|\bwww\.\S+/gi, '{link}')
    .replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, '{email}')
    .replace(/(?:\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}\b/g, '{phone}')
    .replace(/\$\s?\d[\d,]*(?:\.\d{1,2})?(?:\s?(?:-|–|to)\s?\$?\s?\d[\d,]*(?:\.\d{1,2})?)?/g, '{price}')
    .replace(/\b\d+(?:\.\d+)?\s?(?:%|percent\b)/gi, '{percent}')
    .replace(/\b(?:bogo|buy one,? get one)\b/gi, '{offer}')
    .replace(new RegExp(`\\b${MONTH}\\.? \\d{1,2}(?:st|nd|rd|th)?\\b`, 'gi'), '{date}')
    .replace(/\b\d{1,2}\/\d{1,2}(?:\/\d{2,4})?\b/g, '{date}')
    .replace(/\b\d{1,2}(?::\d{2})?\s?(?:am|pm|a\.m\.|p\.m\.)/gi, '{time}')
    .replace(/\b\d{1,2}:\d{2}\b/g, '{time}')
    .replace(new RegExp(`\\b(?:this |next )?${WEEKDAY}\\b`, 'gi'), '{day}')
    .replace(/\b(?:today|tomorrow|tonight)\b/gi, '{day}')
    .replace(/\b(?<!feel )(?:free|complimentary)\b(?! to\b)/gi, '{offer}')
    /* Anything numeric left, like units or syringes, which would read as dosing. */
    .replace(/\b\d+(?:\.\d+)?(?:\s?(?:-|–|to)\s?\d+(?:\.\d+)?)?\b/g, '{number}')
}

export function buildPlaybook(a: Answers, spa: Spa, meta: ExportMeta): Playbook {
  const V = (s: string) => restore(voice(a, spa, keep(s)))
  const t = terms(a)
  const promoKey = keyer()
  const eventKey = keyer()
  const eventKeys = new Map(a.events.filter((e) => e.n.trim()).map((e) => [e.id, eventKey(e.n, 'event')]))
  const promos = a.promos.filter((p) => p.n.trim() && p.terms.trim())
  const promoKeys = new Map(promos.map((p) => [p.id, promoKey(p.n, 'promotion')]))
  const hesitate = a.tac.discount === 'hesitate' ? promos.find((p) => p.id === a.tac.hesitate && !p.ev) : undefined
  /* Objection answers are fixed text, so they never name a promotion: one
     would go stale when it ends. The concierge offers the running one itself
     (tactics, and only while it's active). */
  const PROMO = 'I can tell you about the offers running right now'

  /* Voice examples: the role-play, the five quick replies, pasted messages,
     and the replies picked in "Which sounds like you?". */
  const examples: Playbook['voice']['examples'] = []
  const add = (reply: string, guest?: string) => {
    const r = toneOnly(reply)
    if (r) examples.push(guest ? { guest: toneOnly(guest), reply: r } : { reply: r })
  }
  for (const sc of SCENARIOS) {
    const log = a.rp.logs[sc.id] ?? []
    log.forEach((m, i) => { if (m.r === 'y' && m.t.trim()) add(m.t, [...log.slice(0, i)].reverse().find((x) => x.r === 'g')?.t) })
  }
  QUICK.forEach((g, i) => { const r = a.quick[i]; if (r?.trim()) add(r, g) })
  for (const part of a.pasted.split(/\n\s*\n/)) if (part.trim()) add(part)
  PAIRS.forEach((p, i) => { const pick = a.pairs[i]; if (pick) add(pick === 'a' ? p.a : p.b, p.g) })

  const dos: string[] = []
  if (a.brandNames === 'brand') dos.push('Use brand names, like Botox, when guests do.')
  if (a.brandNames === 'category') dos.push('Say the treatment type (for example, neurotoxin) rather than brand names.')
  if (a.languages.includes('Spanish') && a.langMode === 'offer') dos.push('If a guest seems more comfortable in Spanish, offer to continue in Spanish.')
  if (a.feel.length) dos.push(`Leave guests feeling ${a.feel.map((f) => f.toLowerCase()).join(', ')}.`)

  const signOff = a.signoff === -1 ? undefined
    : a.signoff === -2 ? (a.signoffCustom.trim() ? V(a.signoffCustom.trim()) : undefined)
    : V(SIGNOFFS[a.signoff] ?? SIGNOFFS[0]!)

  const avatar: Playbook['identity']['avatar'] = a.avType === 'logo' ? { mode: 'brand_mark' }
    : a.avType === 'icon' ? { mode: 'illustrated', id: ICONS[a.avId]?.[0] ?? ICONS[0]![0] }
    : { mode: 'portrait', id: `look-${a.avId + 1}` }

  const neverSay = [
    ...NEVER.filter((_, i) => a.never[i] !== false),
    ...a.neverCustom.map(clean).filter(Boolean),
  ]
  if (a.growth.comp.trim()) neverSay.push(`We never mention other med spas by name, including ${clean(a.growth.comp)}`)

  const greetingRaw = a.greeting === -1 && a.greetingCustom.trim() ? a.greetingCustom : GREETINGS[a.greeting] ?? GREETINGS[0]!

  return {
    version: PLAYBOOK_VERSION,
    spa: { id: spa.id, name: spa.name, timeZone: spa.timeZone },
    contentHash: meta.contentHash,
    approvals: meta.approvals,
    exportedOn: meta.today,
    identity: {
      name: coordName(a),
      label: clean(a.subtitle) || 'AI Treatment Coordinator',
      avatar,
      /* As greetingText(), with the emoji setting applied the same way. */
      greeting: V(greetingRaw).replace(/([.!?])(\s|$)/, (_m, p: string, ws: string) => p + (a.emoji === 'occasionally' ? ' 😊' : '') + ws),
    },
    terminology: { guests: t.guests, treatments: t.treatments, providers: t.providers, booking: t.book },
    voice: {
      tone: [TONE_TEXT[a.tone] ?? TONE_TEXT.balanced!, `For example: "${toneReply(a, spa)}"`].join(' '),
      emoji: a.emoji, exclamation: a.exclaim, length: a.length,
      ...(signOff ? { signOff } : {}),
      dos, neverSay, examples,
    },
    languages: LANGS.filter((l) => a.languages.includes(l)).map((l) => LANG_CODE[l]!),
    pricing: PRICE[a.pricing]!,
    services: a.services.filter((s) => s.n.trim()).map((s) => ({
      name: clean(s.n), category: clean(s.cat), priority: s.pr, why: clean(s.why),
      pairsWith: s.pair, upgrades: s.add.split(',').map(clean).filter(Boolean),
      consultFirst: s.consult, price: PRICE[s.price] ?? null,
    })),
    concerns: a.concerns.filter((c) => c.n.trim()).map((c) => ({ name: clean(c.n), services: c.svc, otherwise: FB[c.fb]! })),
    pregnancy: { services: a.preg.svc, otherwise: FB[a.preg.fb]! },
    products: a.products.filter((p) => p.n.trim()).map((p) => ({
      name: clean(p.n), brand: clean(p.brand), category: clean(p.cat), priority: p.pr, why: clean(p.why),
      after: p.after, helpsWith: p.helps, sold: p.where === 'instore' ? 'in_store' : p.where,
    })),
    growth: {
      packages: Object.entries(a.growth.pk).map(([name, why]) => ({ name, why: clean(why) })),
      differentiators: DIFFS.filter((d) => a.growth.diffs.includes(d)),
      inTheirWords: clean(a.growth.spec), competitors: clean(a.growth.comp),
    },
    promotions: promos.map((p) => ({
      key: promoKeys.get(p.id)!, name: clean(p.n), terms: clean(p.terms),
      ...(p.type === 'evergreen' ? { evergreen: true as const, ...(p.elig?.trim() ? { eligibility: clean(p.elig) } : {}) }
        : p.type === 'yearly' ? { startMonth: p.sm, endMonth: p.em } : { starts: p.start, ends: p.end }),
      services: p.apply.filter((x) => x !== 'Everything'),
      everything: p.apply.includes('Everything'),
      ...(p.ev && eventKeys.has(p.ev) ? { event: eventKeys.get(p.ev)! } : {}),
    })),
    events: a.events.filter((e) => e.n.trim()).map((e) => ({
      key: eventKeys.get(e.id)!, name: clean(e.n),
      ...(e.type === 'yearly' ? { month: e.month } : { date: e.date }),
      time: clean(e.time), location: clean(e.loc), description: clean(e.what),
      audience: e.who, rsvp: e.rsvp, ...(e.rsvp === 'link' ? { link: e.link.trim() } : {}),
    })),
    objections: Object.entries(a.obj).flatMap(([k, picks]) => {
      const o = OBJ[k]
      const approach = o?.o.find(([v]) => v === picks[0])
      if (!o || !approach) return []
      return [{ objection: o.g, answer: V(approach[2].replace(/\{promo\}/g, PROMO)) }]
    }),
    tactics: {
      promotions: ({ never: 'never', asked: 'when_asked', proactive: 'when_relevant', hesitate: hesitate ? 'on_hesitation' : 'when_asked' } as const)[a.tac.discount],
      ...(hesitate ? { hesitationPromotion: promoKeys.get(hesitate.id)! } : {}),
      offerContact: ({ early: 'early', answered: 'after_first_answer', asked: 'when_asked' } as const)[a.tac.offer],
      suggestBooking: ({ most: 'most_replies', educate: 'after_educating', asked: 'when_asked' } as const)[a.tac.push],
      urgency: a.tac.urgency === 'never' ? 'never' : 'real_deadlines_only',
    },
    handoff: Object.fromEntries(Object.entries(HANDOFF_KEYS).map(([k, key]) => {
      const i = a.handoff[k] ?? 0
      const raw = i === -1 ? a.handoffCustom[k] ?? '' : HANDOFF[k]!.o[i] ?? HANDOFF[k]!.o[0]!
      /* The sample names lip filler; the approved wording covers every treatment that needs a consult. */
      return [key, V(key === 'consult_required' ? raw.replace(/\bFor lip filler,/g, 'For this treatment,') : raw)]
    })) as Playbook['handoff'],
    ...(a.notes1.trim() || a.notes2.trim() ? { notes: {
      ...(a.notes1.trim() ? { personalityProtocol: a.notes1.trim() } : {}),
      ...(a.notes2.trim() ? { salesPlaybook: a.notes2.trim() } : {}),
    } } : {}),
    urgent: {
      line: clean(a.em.urgent) || spa.urgent,
      hours: clean(a.em.hours), afterHours: clean(a.em.after),
      emergencySymptoms: a.em.t1.map(clean).filter(Boolean),
      urgentSymptoms: a.em.t2.map(clean).filter(Boolean),
      emergencyMessage: V(a.em.s1), urgentMessage: V(a.em.s2),
    },
  }
}
