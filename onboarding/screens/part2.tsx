'use client'
/*
 * Part 2: the Sales Playbook. Which services and products to lead with, what
 * to suggest for each concern, what to grow, the promotions and events, how
 * to handle hesitation, and how assertive to be. Wording follows the
 * prototype, with 09-intake-wizard.md §4.1 applied (D72): no "urgency
 * allowed", promotions only from this screen's list, a booking or callback
 * offered on a card instead of asking for a phone number, and promotion dates
 * read in the spa's own time zone.
 */
import { useRef, useState } from 'react'
import { type Answers, type Event, type Fallback, hasDiscount, newId, type Priority, type Product, type Promo, type Service, shown, unpicked } from '../answers'
import { CONCERN_OPEN, DIFFS, OBJ, PRICE_OVR, PRIORITY, PROD_CATS, PWHY, SVC_CATS, TACTICS, TREAT_WHY, WHY } from '../content'
import type { Spa } from '../spa'
import { Btn, Cards, Check, ChipToggle, Field, Head, Picker, Q, Reveal, Seg, Select, Summary, Text, usePendingAdd } from '../ui'
import { genericConvo, greetingText, type Msg, pricingLine, voice } from '../voice'
import { needList, type Screen } from './types'

export const P2 = 'Part 2 of 3: Sales Playbook'

/* ---------- Dates, in the spa's time zone ---------- */

export const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const MONTH_OPTS = MONTHS.map((m, k): [number, string] => [k + 1, m])

/** Today in the spa's time zone, as YYYY-MM-DD. */
const today = (spa: Spa) => new Intl.DateTimeFormat('en-CA', { timeZone: spa.timeZone }).format(new Date())
const thisMonth = (spa: Spa) => Number(new Intl.DateTimeFormat('en-US', { timeZone: spa.timeZone, month: 'numeric' }).format(new Date()))
/** "Mountain Time" */
const zoneName = (spa: Spa) =>
  new Intl.DateTimeFormat('en-US', { timeZone: spa.timeZone, timeZoneName: 'longGeneric' as 'long' })
    .formatToParts(new Date()).find((p) => p.type === 'timeZoneName')?.value ?? spa.timeZone
/** A calendar day, written for a guest: "Nov 30". */
export const fmtDate = (d: string) => (d ? new Date(`${d}T12:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }) : '')

/** Concern Logic's sample: a warm opener, why the first treatment helps, then the consult. */
function concernReply(concern: string, svc: string[]) {
  const open = CONCERN_OPEN[concern] ?? 'Thanks for sharing that{!} It’s something we help with often.'
  const [first, ...rest] = svc
  const why = TREAT_WHY.find(([re]) => re.test(first!))?.[1]
  const lead = why
    ? `For ${lc1(concern)}, we often recommend ${first}, because ${why}.`
    : `For ${lc1(concern)}, many {guests} start with ${first}.`
  const more = rest.length === 1 ? ` ${rest[0]} is also a great option, depending on your skin.`
    : rest.length ? ` ${rest.slice(0, -1).join(', ')} and ${rest.at(-1)} are also great options, depending on your skin.` : ''
  return `${open} ${lead}${more} Your {provider} will recommend the best fit for you at a consult. Would you like to {book}?`
}

type PromoState = 'live' | 'evergreen' | 'upcoming' | 'expired' | 'yearly'
export function promoState(p: Promo, spa: Spa): PromoState {
  if (p.type === 'evergreen') return 'evergreen'
  if (p.type === 'yearly') {
    const m = thisMonth(spa)
    return (p.sm <= p.em ? m >= p.sm && m <= p.em : m >= p.sm || m <= p.em) ? 'live' : 'yearly'
  }
  const t = today(spa)
  if (p.end && p.end < t) return 'expired'
  if (p.start && p.start > t) return 'upcoming'
  return 'live'
}
/** Promotions open to everyone and running today. */
export const runningPromos = (a: Answers, spa: Spa) => a.promos.filter((p) => p.n.trim() && p.terms.trim() && !p.ev && ['live', 'evergreen'].includes(promoState(p, spa)))
/** "Always, for first-time guests": an evergreen promotion's When. */
export const evergreenWhen = (p: Promo) => `Always${p.elig?.trim() ? `, for ${lc1(p.elig.trim())}` : ''}`
export const eventState = (e: Event, spa: Spa) => (e.type === 'yearly' ? 'yearly' : e.date && e.date < today(spa) ? 'past' : 'upcoming')
export const evWhen = (e: Event) => (e.type === 'yearly' ? `every ${MONTHS[e.month - 1] ?? ''}` : fmtDate(e.date)) + (e.time ? `, ${e.time}` : '')
function nextEvent(a: Answers, spa: Spa) {
  const named = a.events.filter((e) => e.n.trim())
  return named.filter((e) => eventState(e, spa) === 'upcoming').sort((x, y) => (x.date || '9').localeCompare(y.date || '9'))[0]
    ?? named.find((e) => e.type === 'yearly')
}

/* ---------- Small helpers ---------- */

const lc1 = (s: string) => s.charAt(0).toLowerCase() + s.slice(1)
/** "A", "A or B", "A, B, or C" */
const orList = (l: string[]) => (l.length < 2 ? l[0] ?? '' : `${l.slice(0, -1).join(', ')}${l.length > 2 ? ',' : ''} or ${l.at(-1)}`)
export const productLabel = (p: Product) => (p.brand ? `${p.brand} ${p.n}` : p.n)
const serviceNames = (a: Answers) => a.services.map((s) => s.n.trim()).filter(Boolean)

/**
 * Renames (or, with '', removes) a service or product everywhere other answers
 * point to it: pairings, concerns, products, and what promotions apply to.
 */
function relabel(d: Answers, from: string, to: string) {
  if (!from) return
  const swap = (l: string[]) => [...new Set(l.map((x) => (x === from ? to : x)).filter(Boolean))]
  d.services.forEach((s) => { s.pair = swap(s.pair) })
  d.concerns.forEach((c) => { c.svc = swap(c.svc) })
  d.preg.svc = swap(d.preg.svc)
  d.products.forEach((p) => { p.after = swap(p.after) })
  d.promos.forEach((p) => { p.apply = swap(p.apply) })
}

function PriorityPill({ v }: { v: Priority }) {
  return <span className={`pill${v === 'high' ? ' hi' : v === 'none' ? ' dn' : ''}`}>{PRIORITY.find(([k]) => k === v)?.[1] ?? v}</span>
}

/**
 * Renames a category for one service or product, and when no other item is
 * left in the old one, moves promotions' "All <old>" to "All <new>".
 */
function recategorize(d: Answers, from: string, to: string) {
  const old = from.trim(), next = to.trim()
  const stillUsed = [...d.services, ...d.products].some((x) => x.cat.trim() === old)
  if (old && next && old !== next && !stillUsed) relabel(d, `All ${old}`, `All ${next}`)
}

/** A text box that suggests categories, but takes any. */
function Category({ value, onChange, onCommit, options }: {
  value: string; onChange: (v: string) => void; onCommit: (from: string, to: string) => void; options: string[]
}) {
  const [id] = useState(() => `cat-${newId()}`)
  const start = useRef(value)
  return (
    <>
      <input className="in" list={id} value={value} placeholder="Pick or type a category" aria-label="Category" autoComplete="off"
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => { start.current = value }} onBlur={() => { if (start.current !== value) onCommit(start.current, value) }} />
      <datalist id={id}>{options.map((o) => <option key={o} value={o} />)}</datalist>
    </>
  )
}
const categories = (base: string[], list: { cat: string }[]) => [...new Set([...base, ...list.map((x) => x.cat.trim()).filter(Boolean)])]

/** After a product's name or brand changes: promotions follow its new label, unless another product has it. */
function renameProduct(d: Answers, i: number, before: Product) {
  const from = productLabel(before).trim(), to = productLabel(d.products[i]!).trim()
  const taken = d.products.some((x, k) => k !== i && productLabel(x).trim() === to)
  if (before.n.trim() && d.products[i]!.n.trim() && from !== to && !taken) relabel(d, from, to)
}

const FB_OPTS: [Fallback, string][] = [['consult', 'A consult'], ['frontdesk', 'The front desk']]

/* ---------- Service logic ---------- */

const PRICE_SAY: Record<string, (n: string) => string> = {
  exact: (n) => `${n} is [your listed price].`,
  starting: (n) => `${n} starts at [your listed starting price], depending on your plan.`,
  never: () => 'Pricing depends on your goals, so our {providers} give exact quotes at a consult.',
}
/** A service's price rule in plain words, with "default" resolved to the Part 1 rule. */
const priceRule = (a: Answers, s: Service) => {
  const v = s.price === 'default' ? a.pricing : s.price
  return { v, label: { exact: 'Exact price', starting: 'Starting-at price', never: 'Priced at consultation' }[v] ?? '' }
}

/** One line a person can read: what the coordinator does with this service. */
function serviceSummary(a: Answers, s: Service): string[] {
  const out: string[] = []
  if (s.pair.length) out.push(`Suggests ${orList(s.pair).replace(' or ', ' and ')}`)
  if (s.add.trim()) out.push(`Add-ons: ${s.add.trim()}`)
  if (s.consult) out.push('Consult first')
  out.push(priceRule(a, s).label + (s.price === 'default' ? ' (your default)' : ''))
  return out
}

/** How the coordinator answers "Tell me about X", from this service's settings. */
function serviceConvo(a: Answers, spa: Spa, s: Service): Msg[] {
  const V = (t: string) => voice(a, spa, t)
  const n = s.n.trim() || 'this treatment'
  if (s.pr === 'none') {
    return [{ r: 'gst', t: `Do you offer ${n}?` }, { r: 'bot', t: V(`We do. Our team can tell you more about ${n} and whether it’s right for you. Would you like someone to reach out?`) },
      { r: 'meta', t: 'Don’t promote: answered when asked, never suggested' }]
  }
  let t = V(`Great choice{!} ${n} is ${s.pr === 'high' ? 'one of our most popular' : 'one of our'} {treatments}.`)
  if (s.consult) t += V(' We start with a quick consult so your {provider} can plan it with you.')
  t += ` ${V(PRICE_SAY[priceRule(a, s).v]!(n))}`
  const add = s.add.split(',')[0]?.trim()
  if (add) t += ` Many {guests} add ${lc1(add)}, too.`
  t += V(' Would you like to {book}?')
  const msgs: Msg[] = [{ r: 'gst', t: `Tell me about ${n}.` }, { r: 'bot', t: V(t) }]
  if (s.pair[0]) msgs.push({ r: 'gst', t: 'Anything else you’d recommend?' }, { r: 'bot', t: V(`A lot of {guests} pair ${n} with ${s.pair[0]}. Want me to tell you more about it?`) })
  return msgs
}

/** The service the preview shows: the one open, else the first High one, else the first. */
const previewService = (a: Answers) => a.services[a.svcView] ?? a.services.find((x) => x.pr === 'high') ?? a.services[0]

const services: Screen = {
  id: 'services', part: 1, title: 'Service logic',
  done: (a) => !!a.visited.services,
  needs: (a) => needList(
    !a.services.length && { msg: 'Add at least one service', at: 'svc-add' },
    ...a.services.map((s, i) => !s.n.trim() && { msg: `Name service ${i + 1}`, at: `svc-${i}` }),
    ...a.services.map((s, i) => !!s.n.trim() && a.services.findIndex((x) => x.n.trim().toLowerCase() === s.n.trim().toLowerCase()) < i
      && { msg: `Two services are named “${s.n.trim()}”. Rename or remove one`, at: `svc-${i}` }),
  ),
  preview: (a, spa) => {
    const s = previewService(a)
    return s ? serviceConvo(a, spa, s) : genericConvo(a, spa)
  },
  topic: (a) => previewService(a)?.n.trim() || 'Your services',
  Render: function Services({ a, set }) {
    /* The card being edited stays in the group it had when opened: moving it on
       each keystroke of a new category would pull the box out from under the
       cursor. It moves to its new group on Done. */
    const pin = useRef<{ i: number; cat: string } | null>(null)
    if (a.svcView < 0) pin.current = null
    else if (pin.current?.i !== a.svcView) pin.current = { i: a.svcView, cat: a.services[a.svcView]?.cat ?? '' }
    /* Grouped by category, in the order categories first appear; unnamed ones last. */
    const groups = new Map<string, number[]>()
    a.services.forEach((s, i) => {
      const k = (pin.current?.i === i ? pin.current.cat : s.cat).trim() || 'Other'
      groups.set(k, [...(groups.get(k) ?? []), i])
    })
    return (
      <>
        <Head eyebrow={P2} title="Service Logic"
          why="How your coordinator talks about each service: what to lean toward, what to suggest alongside it, and how to handle price. We started this from your onboarding form. Open any service to change it; the preview shows how it sounds."
          open={a.help.svc} onHelp={() => set((d) => { d.help.svc = !d.help.svc })}
          help={<><b>High</b> is what your coordinator leans toward when a guest is undecided, like high-margin or underbooked services. <b>Don’t promote</b> means it still answers questions about a service, but never suggests it. <b>Suggest with it</b> covers other services worth mentioning, and add-ons are upgrades within the same appointment.</>} />
        {[...groups].map(([cat, idx]) => (
          <section key={cat} className="svc-group">
            <h2 className="svc-group__h">{cat} <span>{idx.length}</span></h2>
            <div className="svc-list">
              {idx.map((i) => <ServiceCard key={i} i={i} a={a} set={set} />)}
            </div>
          </section>
        ))}
        <div className="row" style={{ marginTop: 18 }} data-need="svc-add">
          <Btn variant="outline" small onClick={() => set((d) => {
            d.services.push({ n: '', cat: '', pr: 'normal', why: '', pair: [], add: '', consult: false, price: 'default' })
            d.svcView = d.services.length - 1
          })}>Add a service</Btn>
        </div>
      </>
    )
  },
}

function ServiceCard({ i, a, set }: { i: number; a: Answers; set: (edit: (d: Answers) => void) => void }) {
  const s = a.services[i]!
  const open = a.svcView === i
  const others = serviceNames(a).filter((n) => n !== s.n.trim())
  const edit = (fn: (x: Service) => void) => set((d) => { fn(d.services[i]!) })
  const id = `svc-${i}-details`
  return (
    <article className={`svc-card${open ? ' on' : ''}`} data-need={`svc-${i}`}>
      <div className="svc-card__top">
        <div className="svc-card__name">
          <h3>{s.n.trim() || 'New service'}</h3>
          {s.pr === 'high' && s.why && <span className="pill hi">{s.why}</span>}
        </div>
        <div className="svc-card__pr" role="group" aria-label={`Priority for ${s.n || 'this service'}`}>
          <Seg opts={PRIORITY as [Priority, string][]} value={s.pr} onPick={(v) => edit((x) => { x.pr = v; if (v === 'high' && !x.why) x.why = WHY[0]! })} />
        </div>
      </div>
      <Reveal open={s.pr === 'high'}>
        <div className="svc-card__why">
          <span className="note" style={{ margin: 0 }}>Why it’s a priority:</span>
          <ChipToggle list={WHY} value={[s.why]} onToggle={(v) => edit((x) => { x.why = v })} />
        </div>
      </Reveal>
      <p className="svc-card__sum">{serviceSummary(a, s).join(' · ')}</p>
      <button type="button" className="link svc-card__toggle" aria-expanded={open} aria-controls={id}
        onClick={() => set((d) => { d.svcView = open ? -1 : i })}>
        {open ? 'Done' : 'Edit details'}
      </button>
      <Reveal open={open}>
        <div className="svc-card__body" id={id}>
          <div className="svc-sec">
            <h4>Name and category</h4>
            <div className="grid2">
              <Field label="Service"><Text label="Service name" value={s.n} placeholder="Service name"
                onChange={(v) => set((d) => { d.services[i]!.n = v })}
                onCommit={(from, to) => set((d) => {
                  /* A name another service already has is flagged as a duplicate, never merged. */
                  const taken = d.services.some((x, k) => k !== i && x.n.trim() === to.trim())
                  if (from.trim() && to.trim() && !taken) relabel(d, from.trim(), to.trim())
                })} /></Field>
              <Field label="Category"><Category value={s.cat} options={categories(SVC_CATS, a.services)}
                onChange={(v) => set((d) => { d.services[i]!.cat = v })} onCommit={(from, to) => set((d) => { recategorize(d, from, to) })} /></Field>
            </div>
          </div>
          <div className="svc-sec">
            <h4>How it’s sold</h4>
            <Check checked={s.consult} onChange={(v) => edit((x) => { x.consult = v })}>
              <span><b>Consult first.</b> Guests book a consult before this treatment, and your coordinator says so.</span>
            </Check>
          </div>
          <div className="svc-sec">
            <h4>What to suggest with it</h4>
            <Field label="Common pairings or add-ons with this service" note="Pick up to 3 from your services. We pre-filled common pairings; remove any that don’t fit.">
              <Picker options={others} value={s.pair} max={3} placeholder="Search your services" onChange={(v) => edit((x) => { x.pair = v })} />
            </Field>
          </div>
          <div className="svc-sec">
            <h4>Price in chat</h4>
            <Seg opts={PRICE_OVR as [Service['price'], string][]} value={s.price} onPick={(v) => edit((x) => { x.price = v })} />
            <p className="note">{s.price === 'default' ? `Follows your Part 1 rule: ${priceRule(a, s).label.toLowerCase()}.` : 'Overrides your Part 1 rule for this service only.'}</p>
          </div>
          <div className="row svc-card__foot">
            <Btn small onClick={() => set((d) => { d.svcView = -1 })}>Done</Btn>
            <button type="button" className="link danger-link" onClick={() => set((d) => { relabel(d, d.services[i]!.n.trim(), ''); d.services.splice(i, 1); d.svcView = -1 })}>
              Remove {s.n.trim() || 'this service'}
            </button>
          </div>
        </div>
      </Reveal>
    </article>
  )
}

/* ---------- Concern logic ---------- */

const concerns: Screen = {
  id: 'concerns', part: 1, title: 'Concern logic',
  done: (a) => !!a.visited.concerns,
  preview: (a, spa) => {
    const V = (s: string) => voice(a, spa, s)
    if (a.concView === -1) {
      const l = a.preg.svc
      return [{ r: 'gst', t: 'I’m pregnant. Can I still come in for something?' }, {
        r: 'bot', t: l.length
          ? V(`Congratulations{!} ${l.length === 1 ? `${l[0]} is one we offer` : `${l.slice(0, -1).join(', ')} and ${l.at(-1)} are ones we offer`} to {guests} who are pregnant or nursing, and your {provider} will confirm everything at your visit. Would you like to {book}?`)
          : a.preg.fb === 'frontdesk' ? V('Congratulations{!} Our team can talk through your options while you’re pregnant or nursing. Can I have someone reach out?')
          : V('Congratulations{!} Your {provider} is the best person to talk through options while you’re pregnant or nursing. Would you like to {book}?'),
      }]
    }
    const c = a.concerns[a.concView] ?? a.concerns[0]
    if (!c) return genericConvo(a, spa)
    return [{ r: 'gst', t: `I’ve been dealing with ${lc1(c.n)}. What would you recommend?` }, {
      r: 'bot', t: c.svc.length
        ? V(concernReply(c.n, c.svc))
        : c.fb === 'frontdesk' ? V('Thanks for letting us know. Our team is the best place to start on that. Can I have someone reach out?')
        : V('That’s a great question for one of our {providers}. A consult is the best way to find the right plan for you. Would you like to {book}?'),
    }]
  },
  Render: function Concerns({ a, set }) {
    const names = serviceNames(a)
    const [draft, setDraft] = useState('')
    const dup = !!draft.trim() && a.concerns.some((c) => c.n.toLowerCase() === draft.trim().toLowerCase())
    const add = () => {
      const n = draft.trim()
      if (!n || dup) return false
      set((d) => { d.concerns.push({ n, svc: [], fb: 'consult' }); d.concView = d.concerns.length - 1 })
      setDraft('')
      return true
    }
    usePendingAdd(add)
    const view = (k: number) => (
      <button type="button" className="link" onClick={() => set((d) => { d.concView = k })}>{a.concView === k ? 'Showing in preview' : 'Preview this'}</button>
    )
    return (
      <>
        <Head eyebrow={P2} title="Concern Logic"
          why="Guests often describe what bothers them, not the treatment they want. Tell us which services to recommend for each concern, in the order you’d suggest them. If no service fits, tell us where to send them."
          open={a.help.conc} onHelp={() => set((d) => { d.help.conc = !d.help.conc })}
          help={<>Pick the services you’d actually lead with, usually one or two. The order matters: your coordinator mentions the first one first. Leave a concern empty and your coordinator sends the guest to a consult or the front desk, whichever you choose. This includes temporary conditions like an active breakout or recent sun exposure. This is a medical section: have your medical director check it before you sign off.</>} />
        <div className="callout warn-callout" style={{ marginBottom: 26 }}>
          <h3 style={{ margin: '0 0 4px' }}>Pregnancy and nursing</h3>
          <p style={{ margin: '0 0 14px' }}>This is a medical section: have your medical director check it. Which services do you offer to guests who are pregnant or nursing? Your coordinator only mentions this if a guest brings it up, never calls a service “safe,” and says their provider will confirm at the visit.</p>
          <Field label="Services you offer to guests who are pregnant or nursing">
            <Picker options={names} value={a.preg.svc} placeholder="Search to add a service" onChange={(v) => set((d) => { d.preg.svc = v })} />
          </Field>
          <div className="row" style={{ marginTop: 14 }}>
            <span className="note" style={{ margin: 0 }}>If no service fits, send them to:</span>
            <Seg opts={FB_OPTS} value={a.preg.fb} onPick={(v) => set((d) => { d.preg.fb = v })} />
          </div>
          <p style={{ margin: '12px 0 0' }}>{view(-1)}</p>
        </div>
        {a.concerns.map((c, i) => (
          <section key={`${i}-${c.n}`} className="q">
            <div className={`panel${a.concView === i ? ' panel-on' : ''}`}>
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <h3 style={{ margin: 0 }}>{c.n}</h3>
                <div className="row">{view(i)}
                  <button type="button" className="link" onClick={() => set((d) => {
                    /* Products that helped with this concern stop pointing at it. */
                    d.products.forEach((p) => { p.helps = p.helps.filter((h) => h !== c.n) })
                    d.concerns.splice(i, 1)
                    d.concView = 0
                  })}>Remove</button>
                </div>
              </div>
              <p className="hint" style={{ margin: '6px 0 12px' }}>
                {c.svc.length ? 'Recommended in this order.' : `No services picked. Your coordinator will send them to ${c.fb === 'frontdesk' ? 'the front desk' : 'a consult'}.`}
              </p>
              <Field label="Services to recommend, in order">
                <Picker ranked options={names} value={c.svc} placeholder="Search to add a service" onChange={(v) => set((d) => { d.concerns[i]!.svc = v; d.concView = i })} />
              </Field>
              <div className="row" style={{ marginTop: 14 }}>
                <span className="note" style={{ margin: 0 }}>If no service fits, send them to:</span>
                <Seg opts={FB_OPTS} value={c.fb} onPick={(v) => set((d) => { d.concerns[i]!.fb = v })} />
              </div>
            </div>
          </section>
        ))}
        <Q title="Add a concern">
          <div className="row">
            <input className="in" style={{ maxWidth: 420 }} value={draft} placeholder="For example: Double chin" aria-label="New concern"
              onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add() } }}
              />
            <Btn variant="outline" small onClick={add} disabled={dup}>Add</Btn>
          </div>
          {dup && <p className="note">That concern is already on the list.</p>}
        </Q>
      </>
    )
  },
}

/* ---------- Product priorities ---------- */

const WHERE: [Product['where'], string][] = [['both', 'In spa and online'], ['instore', 'In spa only'], ['online', 'Online only']]
const WHERE_SAY: Record<Product['where'], string> = {
  both: 'You can pick it up at the spa or order it online.', instore: 'You can pick it up at your next visit.', online: 'You can order it online anytime.',
}

const products: Screen = {
  id: 'products', part: 1, title: 'Product priorities',
  done: (a) => !!a.visited.products,
  needs: (a) => needList(
    ...a.products.map((p, i) => !p.n.trim() && { msg: `Name product ${i + 1}`, at: `prod-${i}` }),
    ...a.products.map((p, i) => !!p.n.trim() && a.products.findIndex((x) => productLabel(x).toLowerCase() === productLabel(p).toLowerCase()) < i
      && { msg: `Two products are named “${productLabel(p)}”. Rename or remove one`, at: `prod-${i}` }),
  ),
  preview: (a, spa) => {
    const p = a.products.find((x) => x.pr === 'high' && x.n) ?? a.products.find((x) => x.pr !== 'none' && x.n)
    if (!p) return genericConvo(a, spa)
    const V = (s: string) => voice(a, spa, s)
    const c: Msg[] = []
    if (p.after[0]) c.push({ r: 'gst', t: `I’m booked for ${p.after[0]}. Anything I should add at home?` },
      { r: 'bot', t: V(`Great choice{!} Many {guests} pair their ${p.after[0]} with ${productLabel(p)}. ${WHERE_SAY[p.where]} Your {provider} can tell you more at your visit.`) })
    if (p.helps[0]) c.push({ r: 'gst', t: `What do you recommend at home for ${lc1(p.helps[0])}?` },
      { r: 'bot', t: V(`${productLabel(p)} is a favorite with our {guests} for that. ${WHERE_SAY[p.where]}`) })
    return c.length ? c : [{ r: 'gst', t: 'Do you sell skincare?' }, { r: 'bot', t: V(`We do{!} ${productLabel(p)} is one of our favorites. ${WHERE_SAY[p.where]}`) }]
  },
  Render: function Products({ a, set }) {
    const [open, setOpen] = useState(-1)
    const svcs = serviceNames(a), cons = a.concerns.map((c) => c.n)
    return (
      <>
        <Head eyebrow={P2} title="Product Priorities"
          why="Which products your coordinator should recommend, and when. We started this from the products you listed during onboarding. Prices and links come from your price list."
          open={a.help.prod} onHelp={() => set((d) => { d.help.prod = !d.help.prod })}
          help={<>Mark the products you most want to move as <b>High</b>. Linking a product to services lets your coordinator suggest it naturally, like recommending SPF after a peel. Linking it to concerns lets it come up when a guest describes what’s bothering them. Use <b>Don’t promote</b> for anything you carry but don’t want pushed.</>} />
        <div className="tscroll">
          <table className="svc">
            <thead><tr><th>Product</th><th>Category</th><th>Priority</th><th>Recommend after</th><th>Helps with</th><th>Where to buy</th><th><span className="sr-only">Edit</span></th></tr></thead>
            <tbody>
              {a.products.map((p, i) => {
                const edit = (fn: (x: Product) => void) => set((d) => { fn(d.products[i]!) })
                const isOpen = open === i
                return [
                  <tr key={`r${i}`} data-need={`prod-${i}`}>
                    <td data-l="Product">{p.n || 'New product'}{p.brand && <><br /><span className="note" style={{ margin: 0 }}>{p.brand}</span></>}</td>
                    <td data-l="Category">{p.cat || '—'}</td>
                    <td data-l="Priority"><PriorityPill v={p.pr} />{p.pr === 'high' && p.why && <><br /><span className="note" style={{ margin: 0 }}>{p.why}</span></>}</td>
                    <td data-l="Recommend after">{p.after.join(', ') || 'None'}</td>
                    <td data-l="Helps with">{p.helps.join(', ') || 'None'}</td>
                    <td data-l="Where to buy">{WHERE.find(([v]) => v === p.where)?.[1]}</td>
                    <td><button type="button" className="link" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? -1 : i)}>{isOpen ? 'Done' : 'Edit'}</button></td>
                  </tr>,
                  isOpen && (
                    <tr key={`e${i}`} className="edit-row"><td colSpan={7}>
                      <div className="editor reveal-in">
                        <Field label="Product"><Text label="Product name" value={p.n} placeholder="Product name"
                          onChange={(v) => edit((x) => { x.n = v })}
                          onCommit={(from) => set((d) => { renameProduct(d, i, { ...d.products[i]!, n: from }) })} /></Field>
                        <Field label="Brand"><Text label="Brand" value={p.brand} placeholder="Brand"
                          onChange={(v) => edit((x) => { x.brand = v })}
                          onCommit={(from) => set((d) => { renameProduct(d, i, { ...d.products[i]!, brand: from }) })} /></Field>
                        <Field label="Category"><Category value={p.cat} options={categories(PROD_CATS, a.products)}
                          onChange={(v) => edit((x) => { x.cat = v })} onCommit={(from, to) => set((d) => { recategorize(d, from, to) })} /></Field>
                        <Field label="Where guests can buy it"><Seg opts={WHERE} value={p.where} onPick={(v) => edit((x) => { x.where = v })} /></Field>
                        <Field label="Priority"><Seg opts={PRIORITY as [Priority, string][]} value={p.pr} onPick={(v) => edit((x) => { x.pr = v; if (v === 'high' && !x.why) x.why = PWHY[0]! })} /></Field>
                        {p.pr === 'high' ? <Field label="Why it’s a priority"><Seg opts={PWHY.map((w): [string, string] => [w, w])} value={p.why} onPick={(v) => edit((x) => { x.why = v })} /></Field> : <div />}
                        <div className="full"><Field label="Recommend after these services" note="Up to 3. Your coordinator suggests this product to guests booking or asking about these services.">
                          <Picker options={svcs} value={p.after} max={3} placeholder="Search to add a service" onChange={(v) => edit((x) => { x.after = v })} />
                        </Field></div>
                        <div className="full"><Field label="Helps with these concerns" note="From your concern logic. Up to 3.">
                          <Picker options={cons} value={p.helps} max={3} placeholder="Search to add a concern" onChange={(v) => edit((x) => { x.helps = v })} />
                        </Field></div>
                        <div className="full row">
                          <Btn variant="outline" small onClick={() => { set((d) => { relabel(d, productLabel(d.products[i]!), ''); d.products.splice(i, 1) }); setOpen(-1) }}>Remove product</Btn>
                        </div>
                      </div>
                    </td></tr>
                  ),
                ]
              })}
            </tbody>
          </table>
        </div>
        <div className="row" style={{ marginTop: 14 }}>
          <Btn variant="outline" small onClick={() => {
            set((d) => { d.products.push({ n: '', brand: '', cat: '', pr: 'normal', why: '', after: [], helps: [], where: 'both' }) })
            setOpen(a.products.length)
          }}>Add a product</Btn>
        </div>
      </>
    )
  },
}

/* ---------- Growth priorities ---------- */

/** A package or membership the spa offers that isn't on file yet. Adding one also picks it. */
function AddPackage({ taken, onAdd }: { taken: string[]; onAdd: (name: string) => void }) {
  const [draft, setDraft] = useState('')
  const name = draft.trim()
  const dup = !!name && taken.some((t) => t.toLowerCase() === name.toLowerCase())
  const add = () => {
    if (!name || dup) return false
    onAdd(name)
    setDraft('')
    return true
  }
  usePendingAdd(add)
  return (
    <div className="pk-add">
      <label className="pk-add__l" htmlFor="pk-new">Offer another package or membership?</label>
      <div className="row">
        <input id="pk-new" className="in" style={{ maxWidth: 360 }} value={draft} placeholder="Add one, like VIP Facial Club" aria-label="New package or membership"
          onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add() } }}
              />
        <Btn variant="outline" small onClick={add} disabled={!name || dup}>Add</Btn>
      </div>
      {dup && <p className="note" style={{ margin: '8px 0 0' }}>That one’s already on the list.</p>}
    </div>
  )
}

const growth: Screen = {
  id: 'growth', part: 1, title: 'Growth priorities',
  done: (a) => !!a.visited.growth,
  needs: (a) => needList(...Object.entries(a.growth.pk).map(([k, why]) => !why.trim() && { msg: `Say why a guest should buy ${k}`, at: `pk-${k}` })),
  preview: (a, spa) => {
    const V = (s: string) => voice(a, spa, s)
    const [pk, why] = Object.entries(a.growth.pk)[0] ?? []
    const diffs = a.growth.diffs.slice(0, 2).map(lc1)
    return [{ r: 'bot', t: greetingText(a, spa) }, { r: 'gst', t: 'What makes you different from other med spas?' }, {
      r: 'bot', t: V(`Great question{!} ${a.growth.spec.trim() ? `${a.growth.spec.trim()} ` : ''}${diffs.length ? `Guests often tell us they come for our ${diffs.join(' and ')}.` : ''}`)
        + (pk ? ` ${V(`Many {guests} also join our ${pk}${why?.trim() ? `: ${lc1(why.trim().replace(/\.$/, ''))}` : ''}.`)}` : ''),
    }]
  },
  Render: ({ a, spa, set }) => (
    <>
      <Head eyebrow={P2} title="Growth Priorities" why="What you want more of. Your coordinator brings these up when they fit the conversation." />
      <Q title="Packages and memberships to grow" oneLine hint="From your onboarding form. For each one you pick, tell us why a guest should buy it.">
        <div className="panel" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {!spa.catalog.packages.length && !a.growth.added.length && (
            <p className="note" style={{ margin: 0 }}>No packages or memberships on file yet. Add any you offer below.</p>
          )}
          {[...spa.catalog.packages, ...a.growth.added].map((k) => {
            const on = k in a.growth.pk
            const added = a.growth.added.includes(k)
            return (
              <div key={k} data-need={`pk-${k}`}>
                <div className="row" style={{ justifyContent: 'space-between' }}>
                  <Check checked={on} onChange={(v) => set((d) => { if (v) d.growth.pk[k] = ''; else delete d.growth.pk[k] })}><b>{k}</b></Check>
                  {added && (
                    <button type="button" className="link danger-link" onClick={() => set((d) => {
                      d.growth.added = d.growth.added.filter((x) => x !== k)
                      delete d.growth.pk[k]
                    })}>Remove</button>
                  )}
                </div>
                {on && (
                  <div style={{ margin: '8px 0 0 32px' }}>
                    <Field label="Why should a guest buy it?" note="One line your coordinator can use, in your words.">
                      <Text label={`Why a guest should buy ${k}`} value={a.growth.pk[k] ?? ''} placeholder="Like: costs less than booking each visit on its own"
                        onChange={(v) => set((d) => { d.growth.pk[k] = v })} />
                    </Field>
                  </div>
                )}
              </div>
            )
          })}
          <AddPackage taken={[...spa.catalog.packages, ...a.growth.added]} onAdd={(n) => set((d) => {
            d.growth.added = [...d.growth.added, n]
            d.growth.pk[n] = ''
          })} />
        </div>
      </Q>
      <Q title="What sets you apart" hint="Pick what you’re known for, then add specifics.">
        <ChipToggle list={DIFFS} value={a.growth.diffs} onToggle={(v) => set((d) => {
          d.growth.diffs = d.growth.diffs.includes(v) ? d.growth.diffs.filter((x) => x !== v) : [...d.growth.diffs, v]
        })} />
        <div style={{ marginTop: 14 }}>
          <Field label="In your own words" note="Specifics your coordinator can mention, like years in business or credentials.">
            <Text area label="What sets you apart, in your own words" value={a.growth.spec} placeholder="Family-owned since 2009, with a board-certified medical director on site." onChange={(v) => set((d) => { d.growth.spec = v })} />
          </Field>
        </div>
      </Q>
      <Q title="Nearby competitors (optional)" hint="Only so your coordinator can handle comparison questions. It never names them.">
        <div style={{ maxWidth: 560 }}>
          <Text label="Nearby competitors" value={a.growth.comp} placeholder="Names of nearby med spas" onChange={(v) => set((d) => { d.growth.comp = v })} />
        </div>
      </Q>
    </>
  ),
}

/* ---------- Promotions and events ---------- */

const PROMO_TYPES: [Promo['type'], string][] = [['current', 'Running now'], ['evergreen', 'Evergreen'], ['upcoming', 'Upcoming'], ['yearly', 'Every year']]
const STATE_PILL: Record<PromoState, [string, string]> = {
  live: ['ok', 'Running now'], evergreen: ['ok', 'Evergreen'], upcoming: ['', 'Upcoming'], expired: ['dn', 'Ended'], yearly: ['', 'Every year'],
}
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** What a promotion can apply to: everything, a whole category, or one service or product. */
function applyOpts(a: Answers) {
  const cats = (l: { cat: string }[]) => [...new Set(l.map((x) => x.cat.trim()).filter(Boolean))].map((c) => `All ${c}`)
  return ['Everything', 'All services', 'All products', ...cats(a.services), ...cats(a.products),
    ...serviceNames(a), ...a.products.filter((p) => p.n.trim()).map(productLabel)]
}

/** Has start and end dates (not every year, not evergreen). */
const dated = (p: Promo) => p.type === 'current' || p.type === 'upcoming'

const promos: Screen = {
  id: 'promos', part: 1, title: 'Promotions and events',
  done: (a) => !!a.visited.promos,
  needs: (a) => needList(
    ...a.promos.flatMap((p, i) => {
      const at = `promo-${p.id}`, n = p.n.trim() || `promotion ${i + 1}`
      return [
        !p.n.trim() && { msg: `Name promotion ${i + 1}`, at },
        !p.terms.trim() && { msg: `Add the terms for ${n}`, at },
        !!p.terms.trim() && !hasDiscount(p.terms) && { msg: `Put a percent or dollar amount off in the terms for ${n}, like “20% off” or “$50 off”`, at },
        !p.apply.length && { msg: `Say what ${n} applies to`, at },
        dated(p) && (!p.start || !p.end) && { msg: `Add start and end dates for ${n}`, at },
        dated(p) && !!p.start && !!p.end && p.end < p.start && { msg: `Fix the dates for ${n}: it ends before it starts`, at },
      ]
    }),
    ...a.events.flatMap((e, i) => {
      const at = `event-${e.id}`, n = e.n.trim() || `event ${i + 1}`
      return [
        !e.n.trim() && { msg: `Name event ${i + 1}`, at },
        e.type === 'upcoming' && !e.date && { msg: `Add a date for ${n}`, at },
        e.rsvp === 'link' && !/^https:\/\/\S+\.\S+/.test(e.link.trim()) && { msg: `Add the RSVP link for ${n}, starting with https://`, at },
      ]
    }),
    !a.promoOwner.name.trim() && { msg: 'Say who keeps promotions and events up to date', at: 'owner' },
    !EMAIL.test(a.promoOwner.email.trim()) && { msg: 'Add their email address', at: 'owner' },
  ),
  preview: (a, spa) => {
    const V = (s: string) => voice(a, spa, s)
    const run = runningPromos(a, spa)
    const c: Msg[] = [{ r: 'gst', t: 'Any specials right now?' }]
    if (a.tac.discount === 'never') c.push({ r: 'bot', t: V('We don’t run specials, but our memberships can lower the cost of every visit. Would you like to hear more?') })
    else if (run.length) {
      /* An end date only for an offer that has one (never for evergreen or yearly). */
      const offer = (p: Promo) => `our ${p.n.trim()} offer is ${lc1(p.terms.trim())}`
        + (p.type === 'evergreen' && p.elig?.trim() ? ` for ${lc1(p.elig.trim())}` : '')
        + (a.tac.urgency === 'real' && dated(p) && p.end ? `, through ${fmtDate(p.end)}` : '')
      c.push({ r: 'bot', t: V(`Yes{!} Right now, ${run.map(offer).join(', and ')}. Would you like to {book}?`) })
    } else c.push({ r: 'bot', t: V('There’s nothing running right now, but our team shares new offers often. Is there a treatment you’re curious about?') })
    const e = nextEvent(a, spa)
    if (e) {
      const offers = a.promos.filter((p) => p.ev === e.id && p.terms.trim())
      let t = V(`Yes{!} Join us for our ${e.n.trim()}, ${evWhen(e)}.`)
        + (e.who === 'members' ? ' It’s just for our members.' : e.who === 'invite' ? ' It’s invite only.' : '')
        + (e.what.trim() ? ` ${e.what.trim()}` : '')
        + (offers.length ? ` Guests who attend can get ${offers.map((p) => lc1(p.terms.trim())).join(', plus ')}.` : '')
      t += e.rsvp === 'card' ? ' Want to save your spot? I’ll open a quick RSVP card.' : e.rsvp === 'link' ? ' You can RSVP through the link below.' : ''
      c.push({ r: 'meta', t: 'Events' }, { r: 'gst', t: 'Do you have any events coming up?' }, { r: 'bot', t })
    }
    return c
  },
  Render: ({ a, spa, set }) => {
    const zone = zoneName(spa)
    const opts = applyOpts(a)
    return (
      <>
        <Head eyebrow={P2} title="Promotions and Events"
          why="Every offer and event your coordinator should know about. Mark what’s running now, and add anything upcoming or that you run every year. Promotions switch on and off by date, so your coordinator never quotes an expired deal." />
        <Q title="Promotions" hint={`These are the only offers your coordinator will ever mention. Dates are in your spa’s time zone (${zone}): a promotion runs through the end of its last day there.`}>
          {a.promos.map((p, i) => {
            const st = promoState(p, spa)
            const edit = (fn: (x: Promo) => void) => set((d) => { fn(d.promos[i]!) })
            return (
              <div key={p.id} className="panel" style={{ marginBottom: 12 }} data-need={`promo-${p.id}`}>
                <div className="row" style={{ justifyContent: 'space-between', marginBottom: 12 }}>
                  <h3 style={{ margin: 0 }}>{p.n.trim() || 'New promotion'}</h3>
                  <div className="row">
                    <span className={`pill ${STATE_PILL[st][0]}`}>{STATE_PILL[st][1]}</span>
                    {p.ev && <span className="pill">Event only</span>}
                    <button type="button" className="link" onClick={() => set((d) => {
                      d.promos.splice(i, 1)
                      if (d.tac.hesitate === p.id) d.tac.hesitate = ''
                    })}>Remove</button>
                  </div>
                </div>
                <div style={{ marginBottom: 14 }}><Seg opts={PROMO_TYPES} value={p.type} onPick={(v) => edit((x) => { x.type = v })} /></div>
                <div className="grid2">
                  <Field label="Name"><Text label="Promotion name" value={p.n} placeholder="Fall Glow" onChange={(v) => edit((x) => { x.n = v })} /></Field>
                  <Field label="Terms" note="Include a percent or dollar amount off, like “20% off” or “$50 off”. Your coordinator only quotes offers it can check."><Text label="Terms" value={p.terms} placeholder="20% off any HydraFacial" onChange={(v) => edit((x) => { x.terms = v })} /></Field>
                  {p.type === 'evergreen' ? (
                    <>
                      <Field label="Who qualifies?" note="Optional. Your coordinator says who the offer is for.">
                        <Text label="Who qualifies?" value={p.elig ?? ''} placeholder="First-time guests" onChange={(v) => edit((x) => { x.elig = v })} />
                      </Field>
                      <p className="note" style={{ margin: '30px 0 0' }}>Evergreen promotions run all the time, with no dates.</p>
                    </>
                  ) : p.type === 'yearly' ? (
                    <>
                      <Field label="Usually starts"><Select label="Usually starts" opts={MONTH_OPTS} value={p.sm} onPick={(v) => edit((x) => { x.sm = v })} /></Field>
                      <Field label="Usually ends"><Select label="Usually ends" opts={MONTH_OPTS} value={p.em} onPick={(v) => edit((x) => { x.em = v })} /></Field>
                    </>
                  ) : (
                    <>
                      <Field label={p.type === 'current' ? 'Started' : 'Starts'}><Text type="date" label="Start date" value={p.start} onChange={(v) => edit((x) => { x.start = v })} /></Field>
                      <Field label="Ends"><Text type="date" label="End date" value={p.end} onChange={(v) => edit((x) => { x.end = v })} /></Field>
                    </>
                  )}
                </div>
                <Field label="Applies to" note="A category, specific services or products, or everything.">
                  <Picker options={opts} value={p.apply} placeholder="Search services, products, or categories" onChange={(v) => edit((x) => { x.apply = v })} />
                </Field>
                <Field label="Connected to an event?" note="Add the event below, then connect the promotion to it.">
                  <Select label="Connected to an event?" value={p.ev} onPick={(v) => edit((x) => { x.ev = v })}
                    opts={[['', 'No, available to everyone'], ...a.events.filter((e) => e.n.trim()).map((e): [string, string] => [e.id, e.n.trim()])]} />
                </Field>
                {p.type === 'yearly' && <p className="note" style={{ margin: 0 }}>We’ll check in with you before it starts each year to confirm the details.</p>}
              </div>
            )
          })}
          <Btn variant="outline" small onClick={() => set((d) => {
            const t = today(spa)
            d.promos.push({ id: newId(), n: '', terms: '', type: 'current', start: t, end: '', sm: thisMonth(spa), em: thisMonth(spa), apply: [], ev: '' })
          })}>Add a promotion</Btn>
        </Q>

        <Q title="Events" hint="In-person events like open houses or VIP nights. Your coordinator invites guests, shares event-only offers, and helps them RSVP.">
          {a.events.map((e, i) => {
            const st = eventState(e, spa)
            const linked = a.promos.filter((p) => p.ev === e.id)
            const edit = (fn: (x: Event) => void) => set((d) => { fn(d.events[i]!) })
            return (
              <div key={e.id} className="panel" style={{ marginBottom: 12 }} data-need={`event-${e.id}`}>
                <div className="row" style={{ justifyContent: 'space-between', marginBottom: 12 }}>
                  <h3 style={{ margin: 0 }}>{e.n.trim() || 'New event'}</h3>
                  <div className="row">
                    <span className={`pill${st === 'past' ? ' dn' : st === 'upcoming' ? ' ok' : ''}`}>{st === 'past' ? 'Past' : st === 'yearly' ? 'Every year' : 'Upcoming'}</span>
                    <button type="button" className="link" onClick={() => set((d) => {
                      d.events.splice(i, 1)
                      d.promos.forEach((p) => { if (p.ev === e.id) p.ev = '' })
                    })}>Remove</button>
                  </div>
                </div>
                <div style={{ marginBottom: 14 }}><Seg opts={[['upcoming', 'One time'], ['yearly', 'Every year']] as [Event['type'], string][]} value={e.type} onPick={(v) => edit((x) => { x.type = v })} /></div>
                <div className="grid2">
                  <Field label="Event name"><Text label="Event name" value={e.n} placeholder="Fall Open House" onChange={(v) => edit((x) => { x.n = v })} /></Field>
                  {e.type === 'yearly'
                    ? <Field label="Usually held in"><Select label="Usually held in" opts={MONTH_OPTS} value={e.month} onPick={(v) => edit((x) => { x.month = v })} /></Field>
                    : <Field label="Date"><Text type="date" label="Event date" value={e.date} onChange={(v) => edit((x) => { x.date = v })} /></Field>}
                  <Field label="Time"><Text label="Time" value={e.time} placeholder="5 to 8 p.m." onChange={(v) => edit((x) => { x.time = v })} /></Field>
                  <Field label="Location"><Text label="Location" value={e.loc} placeholder="Your spa, unless it’s somewhere else" onChange={(v) => edit((x) => { x.loc = v })} /></Field>
                </div>
                <Field label="What guests can expect"><Text area label="What guests can expect" value={e.what} placeholder="Live demos, giveaways, and a Q&A with our providers" onChange={(v) => edit((x) => { x.what = v })} /></Field>
                <Field label="Who it’s for"><Seg opts={[['public', 'Open to everyone'], ['members', 'Members only'], ['invite', 'Invite only']] as [Event['who'], string][]} value={e.who} onPick={(v) => edit((x) => { x.who = v })} /></Field>
                <Field label="RSVP" note="On a card, guests share their name and email with consent, never by typing them into the chat.">
                  <Seg opts={[['card', 'On a card in the chat'], ['link', 'Send them to a link'], ['none', 'No RSVP needed']] as [Event['rsvp'], string][]} value={e.rsvp} onPick={(v) => edit((x) => { x.rsvp = v })} />
                </Field>
                {e.rsvp === 'link' && <Field label="RSVP link"><Text type="url" label="RSVP link" value={e.link} placeholder="https://" onChange={(v) => edit((x) => { x.link = v })} /></Field>}
                <Field label="Event-only promotions">
                  {linked.length
                    ? <div className="chips">{linked.map((p) => <span key={p.id} className="chip x">{p.n.trim() || 'Untitled'}{p.terms.trim() && `: ${p.terms.trim()}`}</span>)}</div>
                    : <span className="note" style={{ margin: 0 }}>None yet. Add a promotion above and connect it to this event.</span>}
                </Field>
              </div>
            )
          })}
          <Btn variant="outline" small onClick={() => set((d) => {
            d.events.push({ id: newId(), n: '', type: 'upcoming', date: '', month: thisMonth(spa), time: '', loc: '', what: '', who: 'public', rsvp: 'card', link: '' })
          })}>Add an event</Btn>
        </Q>

        <Q need="owner" title="Who keeps promotions and events up to date?" hint="The person on your team who tells us when offers or events change.">
          <div className="grid2">
            <Field label="Name and role"><Text label="Name and role" value={a.promoOwner.name} placeholder="Dana Kim, office manager" onChange={(v) => set((d) => { d.promoOwner.name = v })} /></Field>
            <Field label="Email"><Text type="email" label="Email address" value={a.promoOwner.email} placeholder="dana@yourspa.com" onChange={(v) => set((d) => { d.promoOwner.email = v })} /></Field>
          </div>
        </Q>
      </>
    )
  },
}

/* ---------- Objection approaches ---------- */

/** The running promotion an objection reply would mention, as a phrase. */
const promoPhrase = (a: Answers, spa: Spa) => {
  const p = runningPromos(a, spa)[0]
  return p ? `our ${p.n.trim()} offer is ${lc1(p.terms.trim())}` : 'ask us about current offers'
}

const objections: Screen = {
  id: 'objections', part: 1, title: 'Objection approaches',
  done: (a) => !!a.visited.objections,
  needs: (a) => needList(...Object.entries(OBJ).map(([k, o]) => !a.obj[k]?.length && { msg: `Pick an approach for ${lc1(o.t)}`, at: `obj-${k}` })),
  preview: (a, spa) => {
    const k = a.objView in OBJ ? a.objView : 'price'
    const o = OBJ[k]!
    /* One approach per objection; answers saved before that keep their first pick. */
    const pick = o.o.find(([x]) => x === a.obj[k]?.[0])?.[2]
    const V = (s: string) => voice(a, spa, s.replace(/\{promo\}/g, promoPhrase(a, spa)))
    const opener: Record<string, [string, string]> = {
      price: ['How much is lip filler?', pricingLine(a, spa, a.services.find((s) => s.n === 'Lip filler')?.price)],
      pain: ['I’m thinking about lip filler.', V('That’s a great choice to ask about{!}')],
      downtime: ['I’m interested in microneedling.', V('That’s a great choice to ask about{!}')],
      results: ['I’m thinking about {botox} for my forehead.', V('That’s a great choice to ask about{!}')],
    }
    const [g, b] = opener[k]!
    return [{ r: 'gst', t: V(g) }, { r: 'bot', t: b }, { r: 'gst', t: o.g }, { r: 'bot', t: pick ? V(pick) : 'Pick an approach to see how this reply reads.' }]
  },
  Render: ({ a, spa, set }) => (
    <>
      <Head eyebrow={P2} title="Objection Approaches"
        why="How your coordinator handles hesitation decides whether a visitor books. For each one, pick the approach that sounds most like your team. The preview shows how it reads."
        open={a.help.obj} onHelp={() => set((d) => { d.help.obj = !d.help.obj })}
        help={<>Most practices pick <b>Invite a consult</b> for price and results, because it moves the conversation to your team without arguing about price. Exact wording gets refined in the Part 3 role-play.</>} />
      {Object.entries(OBJ).map(([k, o]) => (
        <Q key={k} need={`obj-${k}`} title={o.t} hint={`A guest says: “${o.g}”`}>
          <Cards value={a.obj[k]?.[0] ?? ''} onPick={(v) => set((d) => { d.obj[k] = [v]; d.objView = k })}
            opts={o.o.map(([v, l, eg]) => ({ v, t: l, eg: voice(a, spa, eg.replace(/\{promo\}/g, promoPhrase(a, spa))) }))} />
        </Q>
      ))}
    </>
  ),
}

/* ---------- Sales tactics ---------- */

/** Promotions that can be offered to a hesitant guest: open to everyone and not ended. */
const offerable = (a: Answers, spa: Spa) => a.promos.filter((p) => p.n.trim() && p.terms.trim() && !p.ev && promoState(p, spa) !== 'expired')

function tacticsConvo(a: Answers, spa: Spa): Msg[] {
  const V = (s: string) => voice(a, spa, s)
  const t = a.tac
  const card: Msg = { r: 'meta', t: 'The guest fills in an appointment request card' }
  const c: Msg[] = [{ r: 'bot', t: greetingText(a, spa) }, { r: 'gst', t: V('I’m thinking about {botox} for the first time.') }]
  let r1 = V('Exciting{!} It’s one of our most popular {treatments} for first-timers.')
  r1 += t.push === 'most' ? ' Want me to request a time for you this week?' : ' What area are you thinking about?'
  if (t.offer === 'early' && t.push !== 'most') r1 += ' Whenever you’re ready, I can request an appointment for you.'
  c.push({ r: 'bot', t: r1 }, { r: 'gst', t: 'Probably my forehead lines.' })
  let r2 = 'That’s one of the most common areas we treat.'
  if (t.push === 'asked') r2 += V(' Let me know anytime if you’d like to {book}.')
  else if (t.offer === 'answered') r2 += ' Would you like me to request a consult time for you, or have someone call you back?'
  else if (t.push === 'educate' || t.push === 'most') r2 += V(' Would you like to {book}?')
  const run = runningPromos(a, spa)[0]
  if (t.discount === 'proactive' && run) {
    r2 += ` Our ${run.n.trim()} offer is running now, too.`
    if (t.urgency === 'real' && run.type !== 'yearly' && run.end) r2 += ` It ends ${fmtDate(run.end)}.`
  }
  c.push({ r: 'bot', t: r2 })
  if (t.discount === 'hesitate' || t.offer !== 'asked') {
    c.push({ r: 'gst', t: 'I’ll think about it.' })
    const p = t.discount === 'hesitate' ? a.promos.find((x) => x.id === t.hesitate) : undefined
    let s = 'No problem at all.'
    if (p) s += ` If it helps, our ${p.n.trim()} offer is ${lc1(p.terms.trim())}.`
    if (t.offer !== 'asked') s += ' I can have someone follow up with a time that works. Want me to open a quick request?'
    c.push({ r: 'bot', t: V(s) })
    if (t.offer !== 'asked') c.push({ r: 'gst', t: 'Sure.' }, card, { r: 'bot', t: V('Thanks{!} Someone from our team will reach out within {C}.') })
  }
  return c
}

const tactics: Screen = {
  id: 'tactics', part: 1, title: 'Sales tactics',
  done: (a) => !!a.visited.tactics,
  needs: (a, spa) => needList(
    !!a.picked['tac.discount'] && a.tac.discount === 'hesitate' && !offerable(a, spa).some((p) => p.id === a.tac.hesitate)
      && { msg: 'Choose the promotion to offer when someone hesitates', at: 'tac-discount' },
  ).concat(unpicked(a, 'tactics')),
  preview: tacticsConvo,
  Render: ({ a, spa, set, go }) => {
    const list = offerable(a, spa)
    return (
      <>
        <Head eyebrow={P2} title="Sales Tactics" why="How assertive your coordinator should be. Each choice updates the sample conversation."
          open={a.help.tac} onHelp={() => set((d) => { d.help.tac = !d.help.tac })}
          help={<>Offering a booking or callback <b>after answering their first question</b> usually captures the most requests without feeling pushy. <b>Educate first</b> fits most med spas. Use urgency only for real limits, like a promotion’s end date.</>} />
        {(Object.keys(TACTICS) as (keyof Answers['tac'] & keyof typeof TACTICS)[]).map((k) => {
          const t = TACTICS[k]!
          return (
            <Q key={k} need={`tac-${k}`} title={t.t} {...(t.hint ? { hint: t.hint } : {})}>
              <Cards value={shown(a, `tac.${k}`, a.tac[k])} opts={t.o.map(([v, l]) => ({ v, t: l }))} onPick={(v) => set((d) => { (d.tac as Record<string, string>)[k] = v; d.picked[`tac.${k}`] = true })} />
              {k === 'discount' && shown(a, 'tac.discount', a.tac.discount) === 'hesitate' && (
                <div className="field" style={{ marginTop: 14, maxWidth: 560 }}>
                  <label>The promotion to offer</label>
                  {list.length
                    ? <Select label="The promotion to offer" value={a.tac.hesitate} onPick={(v) => set((d) => { d.tac.hesitate = v })}
                        opts={[['', 'Choose a promotion'], ...list.map((p): [string, string] => [p.id, `${p.n.trim()}: ${p.terms.trim()}`])]} />
                    : <p className="note" style={{ margin: 0 }}>You haven’t added a promotion yet. <button type="button" className="link" onClick={() => go('promos')}>Add one on the Promotions screen</button>.</p>}
                </div>
              )}
            </Q>
          )
        })}
      </>
    )
  },
}

/* ---------- Part 2 summary ---------- */

const sum2: Screen = {
  id: 'sum2', part: 1, title: 'Part 2 summary',
  done: (a) => !!a.visited.sum2,
  preview: tacticsConvo,
  Render: ({ a, spa, go, set }) => {
    const lbl = (k: keyof typeof TACTICS) => TACTICS[k]!.o.find(([v]) => v === (a.tac as Record<string, string>)[k])?.[1] ?? ''
    const hi = (l: { n: string; pr: Priority }[]) => l.filter((x) => x.pr === 'high' && x.n.trim()).map((x) => x.n.trim()).join(', ')
    const upcoming = a.promos.filter((p) => p.n.trim() && ['upcoming', 'yearly'].includes(promoState(p, spa))).length
    const hes = a.promos.find((p) => p.id === a.tac.hesitate)
    return (
      <>
        <Head eyebrow={P2} title="Part 2 Summary" why="Your Sales Playbook at a glance. The preview shows a hesitant guest moving toward booking with your settings." />
        <Summary go={go} rows={[
          ['Services', `${a.services.length} services. High priority: ${hi(a.services) || 'none'}`, 'services'],
          ['Concerns', `${a.concerns.filter((c) => c.svc.length).length} of ${a.concerns.length} matched to services`, 'concerns'],
          ['Pregnancy and nursing', a.preg.svc.join(', ') || `No services picked; sends to ${a.preg.fb === 'frontdesk' ? 'the front desk' : 'a consult'}`, 'concerns'],
          ['Products', `${a.products.length} products. High priority: ${hi(a.products) || 'none'}`, 'products'],
          ['Growth', Object.keys(a.growth.pk).join(', ') || 'No packages picked', 'growth'],
          ['Promotions', `${runningPromos(a, spa).length} running now, ${upcoming} upcoming or yearly`, 'promos'],
          ['Events', `${a.events.filter((e) => e.n.trim() && eventState(e, spa) !== 'past').length} upcoming or yearly`, 'promos'],
          ['Price objection', (a.obj.price ?? []).map((v) => OBJ.price!.o.find(([x]) => x === v)?.[1]).filter(Boolean).join(', then ') || 'Not set', 'objections'],
          ['Promotions in chat', lbl('discount') + (a.tac.discount === 'hesitate' && hes ? `: ${hes.n.trim()}` : ''), 'tactics'],
          ['Booking or callback offer', lbl('offer'), 'tactics'],
          ['Suggesting booking', lbl('push'), 'tactics'],
          ['Urgency', lbl('urgency'), 'tactics'],
        ]} />
        <Field label="Do you have any additional comments or thoughts regarding your sales playbook?" note="Optional. Only H1 reads this; your coordinator never sees it.">
          <Text area id="notes2" value={a.notes2} onChange={(v) => set((d) => { d.notes2 = v })} />
        </Field>
      </>
    )
  },
}

export const PART2: Screen[] = [services, concerns, products, growth, promos, objections, tactics, sum2]
