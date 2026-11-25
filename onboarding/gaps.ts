/*
 * The gap detector: what's still missing for a spa's chat, from the
 * Design Questionnaire (the wizard) and the General Onboarding Jotform.
 *
 * Every gap gets a level:
 *   launch   needed before the chat goes live
 *   confirm  the chat would use H1's default, or two answers disagree; ask the spa
 *   helps    the chat works without it, but sells better with it
 *   h1       H1's own records (goals, analytics, website access); the chat never uses it
 * Things that don't apply to this spa go in `fine`, with the reason, so a
 * skipped question is never mistaken for a missing one.
 *
 * Pure: answers, spa, and the Jotform row in; a report out.
 * scripts/gaps.ts reads the database and the CSV, and writes the report.
 */
import { type Answers, PICKS } from './answers'
import { INJECTABLE, SCENARIOS } from './content'
import { PART1 } from './screens/part1'
import { PART1B } from './screens/part1b'
import { PART2 } from './screens/part2'
import { PART3 } from './screens/part3'
import type { Screen } from './screens/types'
import type { Spa } from './spa'

export type Level = 'launch' | 'confirm' | 'helps' | 'h1'
export type Source = 'Design form' | 'Jotform' | 'Both'
export type Gap = { level: Level; from: Source; where: string; what: string; detail?: string }
export type Report = {
  spa: string
  /** The wizard's sign-off: who, when, and whether it covers the answers saved now. */
  signoff: { name: string; on: string; current: boolean } | null
  jotform: { submitted: string; unknown: string[] } | null
  gaps: Gap[]
  fine: string[]
  /** The spa's own comments for H1 at the end of Part 1 and Part 2, if any. */
  comments: { part: string; text: string }[]
}

export const LEVELS: Record<Level, string> = {
  launch: 'Needed before launch',
  confirm: 'Confirm with the spa',
  helps: 'Would make the chat better',
  h1: 'For H1 only (the chat doesn’t use these)',
}

/* ---------- The Jotform ---------- */

/** A CSV file as rows of cells: quoted cells may hold commas, quotes ("") and newlines. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = [], cell = '', quoted = false
  const s = text.replace(/^﻿/, '')
  for (let i = 0; i < s.length; i++) {
    const c = s[i]!
    if (quoted) {
      if (c === '"' && s[i + 1] === '"') { cell += '"'; i++ }
      else if (c === '"') quoted = false
      else cell += c
    } else if (c === '"') quoted = true
    else if (c === ',') { row.push(cell); cell = '' }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && s[i + 1] === '\n') i++
      row.push(cell); rows.push(row); row = []; cell = ''
    } else cell += c
  }
  if (cell || row.length) { row.push(cell); rows.push(row) }
  return rows.filter((r) => r.some((x) => x.trim()))
}

/** One Jotform submission: question text → answer. */
export type Jot = Map<string, string>

/** The submission in a Jotform CSV export: the last row, or the one whose cells contain `match`. */
export function readJotform(csv: string, match?: string): { jot: Jot; rows: number } {
  const [head, ...rows] = parseCsv(csv)
  if (!head || !rows.length) throw new Error('The Jotform CSV has no submissions.')
  const pick = match ? rows.filter((r) => r.some((x) => x.toLowerCase().includes(match.toLowerCase()))) : rows
  if (!pick.length) throw new Error(`No Jotform submission mentions “${match}”.`)
  const row = pick[pick.length - 1]!
  return { jot: new Map(head.map((h, i) => [h.trim(), row[i] ?? ''])), rows: rows.length }
}

const norm = (s: string) => s.toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9]+/g, ' ').trim()

type Rule = {
  key: string
  /** The start of the question as Jotform words it. */
  q: string
  /** How the report names it. */
  label: string
  level: Level
  /** Asked only when this holds (Jotform's conditional questions). */
  when?: (j: JotView) => boolean
  /** A file upload: the files may be in the spa's folder instead. */
  upload?: true
}

type JotView = { get: (key: string) => string; yes: (key: string) => boolean; has: (key: string, re: RegExp) => boolean; medical: boolean }

/**
 * Every question on the General Onboarding Jotform, in its order. A column the
 * CSV has but this list doesn't is reported, so a question added to the form
 * gets a rule here.
 */
const RULES: Rule[] = [
  { key: 'locCount', q: 'How many locations', label: 'Number of locations', level: 'launch' },
  { key: 'locations', q: 'List All Your Locations', label: 'Locations (address, phone, hours)', level: 'launch' },
  { key: 'holidays', q: 'Which holidays do you close for', label: 'Holiday closures and seasonal hours', level: 'helps' },
  { key: 'cancel', q: 'What is your cancellation policy', label: 'Cancellation policy', level: 'launch' },
  { key: 'late', q: 'What is your late arrival policy', label: 'Late arrival policy', level: 'launch' },
  { key: 'noshow', q: 'What is your no-show policy', label: 'No-show policy', level: 'launch' },
  { key: 'refund', q: 'What is your refund policy', label: 'Refund policy', level: 'launch' },
  { key: 'minAge', q: 'Do you have a minimum age requirement', label: 'Minimum age', level: 'launch' },
  { key: 'age', q: 'What is that age', label: 'Minimum age', level: 'launch', when: (j) => j.yes('minAge') },
  { key: 'ageBySvc', q: 'Please list the services with a minimum age', label: 'Services with their own minimum age', level: 'helps', when: (j) => j.yes('minAge') },
  { key: 'minors', q: 'Can a minor be treated with a parent', label: 'Minors with a parent or guardian', level: 'launch', when: (j) => j.yes('minAge') },
  { key: 'payment', q: 'Which payment methods do you accept', label: 'Payment methods', level: 'helps' },
  { key: 'financing', q: 'Do you offer financing', label: 'Financing', level: 'helps' },
  { key: 'finProviders', q: 'Which financing providers', label: 'Financing providers', level: 'helps', when: (j) => j.yes('financing') },
  { key: 'finServices', q: 'Which services can patients use financing', label: 'Services financing covers', level: 'helps', when: (j) => j.yes('financing') },
  { key: 'finCovers', q: 'What should patients know about what your financing', label: 'What financing covers', level: 'helps', when: (j) => j.yes('financing') },
  { key: 'finLink', q: 'Please share the link patients use to apply', label: 'Financing application link', level: 'helps', when: (j) => j.yes('financing') },
  { key: 'md', q: 'Who is your medical director', label: 'Medical director', level: 'launch', when: (j) => j.medical },
  { key: 'mdTitle', q: 'What is their preferred title', label: 'Medical director’s title', level: 'helps', when: (j) => j.medical },
  { key: 'mdBio', q: 'Please share your medical director', label: 'Medical director’s bio', level: 'helps', when: (j) => j.medical },
  { key: 'mdEmail', q: 'Whats the best email address for your medical director', label: 'Medical director’s email', level: 'launch', when: (j) => j.medical },
  { key: 'team', q: 'Where can we pull your team member', label: 'Where to find team names and bios', level: 'helps' },
  { key: 'teamUpload', q: 'Please upload current team names', label: 'Team bios document', level: 'helps', upload: true, when: (j) => j.has('team', /upload|document|file/i) },
  { key: 'bookWays', q: 'Check all the ways you accept appointments', label: 'Ways guests book', level: 'launch' },
  { key: 'software', q: 'Which booking software do you use', label: 'Booking software', level: 'launch' },
  { key: 'notice', q: 'How much notice do you need', label: 'Booking notice', level: 'helps' },
  { key: 'advance', q: 'How far in advance can patients book', label: 'How far ahead guests can book', level: 'helps' },
  { key: 'deposit', q: 'Do you require a deposit', label: 'Deposits', level: 'launch' },
  { key: 'depositWhich', q: 'Which services require a deposit', label: 'Deposit amounts by service', level: 'launch', when: (j) => j.yes('deposit') },
  { key: 'firstVisit', q: 'What does a new patient need to know', label: 'What new guests need to know before a first visit', level: 'helps' },
  { key: 'intakeUpload', q: 'Please upload any intake forms', label: 'Intake forms', level: 'helps', upload: true },
  { key: 'svcSource', q: 'Where should we pull your service descriptions', label: 'Where service descriptions and prices come from', level: 'launch' },
  { key: 'svcLinks', q: 'Please paste the link to each source you checked', label: 'Links to service and price sources', level: 'launch', when: (j) => j.has('svcSource', /website|booking|link/i) },
  { key: 'svcFiles', q: 'Please upload any files for the sources you checked', label: 'Service and price files', level: 'launch', upload: true, when: (j) => j.has('svcSource', /upload|file|document|pdf/i) },
  { key: 'svcAccurate', q: 'Is the service information in those places', label: 'Service information is accurate', level: 'helps' },
  { key: 'prepSource', q: 'Where should we get information related to patient prep', label: 'Where prep, aftercare, and downtime come from', level: 'helps' },
  { key: 'prepLinks', q: 'Please paste the link to each prep', label: 'Links to prep and aftercare', level: 'helps', when: (j) => j.has('prepSource', /website|link/i) },
  { key: 'prepFiles', q: 'Please upload any files for the prep', label: 'Prep and aftercare files', level: 'helps', upload: true, when: (j) => j.has('prepSource', /upload|file|document|pdf/i) },
  { key: 'faqWhere', q: 'Where can we find your existing written FAQs', label: 'Written FAQs', level: 'helps' },
  { key: 'faqLink', q: 'Please paste the link to your FAQs', label: 'FAQ link', level: 'helps', when: (j) => j.has('faqWhere', /website|link|page/i) },
  { key: 'faqFile', q: 'If your FAQs are in a PDF', label: 'FAQ document', level: 'helps', upload: true, when: (j) => j.has('faqWhere', /pdf|document|file|upload/i) },
  { key: 'mdApproved', q: 'Please confirm that the prep, aftercare and FAQ', label: 'Medical director approved prep, aftercare, and FAQs', level: 'launch', when: (j) => j.medical },
  { key: 'retail', q: 'Do you sell retail products', label: 'Retail products', level: 'helps' },
  { key: 'retailWhere', q: 'Where can patients buy them', label: 'Where guests buy products', level: 'helps', when: (j) => j.yes('retail') },
  { key: 'retailPlatform', q: 'Which platform do you sell and track products', label: 'Product platform', level: 'h1', when: (j) => j.yes('retail') },
  { key: 'catalogUpload', q: 'Please upload a current export of your product catalog', label: 'Product catalog export', level: 'helps', upload: true, when: (j) => j.yes('retail') },
  { key: 'returns', q: 'Whats your return policy for products', label: 'Product return policy', level: 'helps', when: (j) => j.yes('retail') },
  { key: 'shipping', q: 'Whats your shipping policy', label: 'Shipping policy', level: 'helps', when: (j) => j.yes('retail') && j.has('retailWhere', /online|both|website/i) },
  { key: 'brands', q: 'Which brands do you carry', label: 'Product brands', level: 'helps', when: (j) => j.yes('retail') },
  { key: 'giftCards', q: 'Do you sell gift cards', label: 'Gift cards', level: 'helps' },
  { key: 'gcPlatform', q: 'What platform do you sell them on', label: 'Where gift cards are sold and what they cover', level: 'helps', when: (j) => j.yes('giftCards') },
  { key: 'gcLimits', q: 'Is there anything gift cards cant be used for', label: 'Gift card limits', level: 'helps', when: (j) => j.yes('giftCards') },
  { key: 'membership', q: 'Do you offer a membership', label: 'Membership', level: 'helps' },
  { key: 'memPerks', q: 'Whats included in your membership', label: 'Membership perks', level: 'helps', when: (j) => j.yes('membership') },
  { key: 'memDoc', q: 'If your membership details are in a PDF', label: 'Membership document', level: 'helps', upload: true, when: (j) => j.yes('membership') && !j.get('memPerks').trim() },
  { key: 'memLink', q: 'Please share the link patients use to sign up', label: 'Membership sign-up link', level: 'helps', when: (j) => j.yes('membership') },
  { key: 'handoffEmail', q: 'Which email address should we send routine chat handoffs', label: 'Handoff email', level: 'launch' },
  { key: 'responseTime', q: 'How quickly does your team commit', label: 'Handoff response time', level: 'launch' },
  { key: 'compDay', q: 'During business hours, who should a patient contact', label: 'Complication contact (business hours)', level: 'launch' },
  { key: 'compDayHow', q: 'How should a patient reach that person during', label: 'How to reach them (business hours)', level: 'launch' },
  { key: 'compDayNum', q: 'What is the phone number or email address for that person', label: 'Their number or email (business hours)', level: 'launch' },
  { key: 'compAfter', q: 'After hours, on weekends, and on holidays', label: 'Complication contact (after hours)', level: 'launch' },
  { key: 'compAfterHow', q: 'How should a patient reach that person after hours', label: 'How to reach them (after hours)', level: 'launch' },
  { key: 'compAfterNum', q: 'What is the phone number or email address for that after-hours', label: 'Their number or email (after hours)', level: 'launch' },
  { key: 'goals', q: 'What are your top three goals', label: 'Top three goals', level: 'h1' },
  { key: 'pains', q: 'What are the three biggest pain points', label: 'Biggest pain points', level: 'h1' },
  { key: 'hubOwner', q: 'Who should we set up as the account owner', label: 'AI Data Hub account owner', level: 'h1' },
  { key: 'hubEmail', q: 'What is that persons email address', label: 'Account owner’s email', level: 'h1' },
  { key: 'otherSoftware', q: 'What other software do you use', label: 'Other software', level: 'h1' },
  { key: 'dataElsewhere', q: 'Is there anywhere else your business data lives', label: 'Other places their data lives', level: 'h1' },
  { key: 'apptCounts', q: 'Provide the average number of appointments', label: 'Appointments per month by source', level: 'h1' },
  { key: 'tracking', q: 'How do you currently track where an appointment', label: 'How they track booking sources', level: 'h1' },
  { key: 'avgSpend', q: 'What does the average patient spend', label: 'Average spend per visit', level: 'h1' },
  { key: 'sitePlatform', q: 'What platform is your website built on', label: 'Website platform', level: 'h1' },
  { key: 'siteManager', q: 'Who manages your website', label: 'Who manages the website', level: 'h1' },
  { key: 'siteLogin', q: 'Will we be able to log in and make changes', label: 'Website access for H1', level: 'h1' },
  { key: 'widget', q: 'Is there a chat widget on your website now', label: 'Current chat widget', level: 'h1' },
  { key: 'widgetWhich', q: 'Which chat widget is it', label: 'Which chat widget, and who set it up', level: 'h1', when: (j) => j.yes('widget') },
  { key: 'ga', q: 'Do you have Google Analytics', label: 'Google Analytics', level: 'h1' },
  { key: 'visitors', q: 'About how many visitors', label: 'Website visitors last month', level: 'h1' },
  { key: 'ads', q: 'Are you currently running Paid Ads', label: 'Paid ads', level: 'h1' },
  { key: 'adPlatforms', q: 'Which platforms are you using', label: 'Ad platforms', level: 'h1', when: (j) => j.yes('ads') },
  { key: 'adSpend', q: 'What are you spending monthly', label: 'Monthly ad spend', level: 'h1', when: (j) => j.yes('ads') },
]

/** Blank, including a list of empty numbered lines ("0: \n1: "), the way Jotform exports an untouched table. */
const isBlank = (v: string) => !v.replace(/^\s*\d+:\s*$/gm, '').trim()
const UNSURE = /^\s*(not sure|unsure|unknown|n\/?a|tbd|idk|i don[’']?t know|don[’']?t know)\b/i
/** An answer that promises the real one later: "I have to wait to send…", "I will have to create it". */
const LATER = /\b(will have to|have to wait|wait (?:to|until)|until (?:nov|dec|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|next|after)|will send|send (?:it )?later|need to (?:create|make|write)|working on (?:it|that)|coming soon)\b/i
const quote = (v: string) => `“${v.trim().replace(/\s*\n\s*/g, ' / ')}”`

export function jotformGaps(jot: Jot, spa: Spa): { gaps: Gap[]; fine: string[]; unknown: string[]; view: JotView } {
  const cols = [...jot.keys()]
  const colOf = new Map<string, string>()
  const used = new Set<string>(['Submission Date'])
  for (const r of RULES) {
    const col = cols.find((c) => !used.has(c) && norm(c).startsWith(norm(r.q)))
    if (col) { colOf.set(r.key, col); used.add(col) }
  }
  const get = (key: string) => jot.get(colOf.get(key) ?? '') ?? ''
  const medical = spa.catalog.services.some((x) => INJECTABLE.test(`${x.n} ${x.cat}`))
  const view: JotView = { get, yes: (k) => /^\s*yes\b/i.test(get(k)), has: (k, re) => re.test(get(k)), medical }

  const gaps: Gap[] = []
  const fine: string[] = []
  const skipped = new Set<string>()
  for (const r of RULES) {
    if (!colOf.has(r.key)) continue
    if (r.when && !r.when(view)) {
      if (!isBlank(get(r.key))) continue
      if ((r.key.startsWith('md') || r.key === 'mdApproved') && !medical) skipped.add('medical director questions (no medical services on file)')
      continue
    }
    const v = get(r.key)
    const add = (level: Level, what: string, detail?: string) => gaps.push({ level, from: 'Jotform', where: r.label, what, ...(detail ? { detail } : {}) })
    if (isBlank(v)) add(r.level, r.upload ? 'No file uploaded' : 'Left blank', r.upload ? 'It may be in their client folder instead; check there first.' : undefined)
    else if (UNSURE.test(v)) add(r.level, `Answered ${quote(v)}`)
    else if (LATER.test(v)) add(r.level === 'h1' ? 'h1' : 'confirm', 'Promised later', quote(v))
  }

  /* Each location needs an address, a phone, and hours. */
  const locs = get('locations')
  if (locs.trim().startsWith('[')) {
    try {
      const list = JSON.parse(locs) as Record<string, string>[]
      list.forEach((l, i) => {
        const name = l['Location Name']?.trim() || `Location ${i + 1}`
        for (const [field, label] of [['Address', 'address'], ['Phone Number', 'phone number'], ['Hours', 'hours']] as const) {
          if (!l[field]?.trim()) gaps.push({ level: 'launch', from: 'Jotform', where: 'Locations', what: `${name} has no ${label}` })
        }
      })
    } catch { /* not the table format; the blank check above covers it */ }
  }

  for (const s of skipped) fine.push(`Jotform: skipped the ${s}.`)
  const unknown = cols.filter((c) => !used.has(c) && !isBlank(c))
  return { gaps, fine, unknown, view }
}

/* ---------- The Design Questionnaire ---------- */

const SCREENS: Screen[] = [...PART1, ...PART1B, ...PART2, ...PART3]
/** Role-play scenarios that open on injectables (Botox, filler, units). */
const INJECTABLE_SCENARIOS = new Set(['price', 'pain', 'minor', 'compare', 'upsell'])
const digits = (s: string) => s.replace(/\D/g, '').replace(/^1(?=\d{10}$)/, '')
const list = (xs: string[], n = 8) => (xs.length > n ? `${xs.slice(0, n).join(', ')}, and ${xs.length - n} more` : xs.join(', '))

export type SignOff = { name: string; on: string; current: boolean } | null

export function designGaps(a: Answers, spa: Spa, signoff: SignOff, jot?: JotView): { gaps: Gap[]; fine: string[] } {
  const gaps: Gap[] = []
  const fine: string[] = []
  const add = (level: Level, from: Source, where: string, what: string, detail?: string) => gaps.push({ level, from, where, what, ...(detail ? { detail } : {}) })

  if (!signoff) add('launch', 'Design form', 'Sign-off', 'Not signed off yet')
  else if (!signoff.current) add('launch', 'Design form', 'Sign-off', `Answers changed after ${signoff.name} signed off on ${signoff.on}`, 'They need to sign off again before the export will run.')

  /* Team size (Cameron, Nov 19): every part of the chat depends on it, and neither form asks. */
  if (spa.team) fine.push(spa.team === 'solo' ? 'One-person business: the chat names the owner, never “our team”.' : 'A team: the chat can say “our team”.')
  else add('confirm', 'Both', 'Team size', 'Neither form says how many people do treatments', 'A one-person business’s chat names the owner (“Jen will text you”) instead of “our team”. Ask, then set team in the spa’s profile and business.team in its chat config.')

  /* What the wizard itself requires. A test spa (noRequired) skips these while
     filling in, so they come back here. */
  const pickMsgs = new Map(PICKS.map(([k, , msg]) => [msg, k]))
  for (const s of SCREENS) {
    if (s.id === 'signoff') continue
    for (const n of s.needs?.(a, { ...spa, noRequired: false }) ?? []) {
      if (n.at === 'owner') {
        if (signoff?.name.trim()) { fine.push(`No one named for promotion and event updates: they go to ${signoff.name.trim()}, who signed off.`); }
        else add('confirm', 'Design form', s.title, n.msg)
        continue
      }
      if (n.at === 'urgent' && spa.urgent.trim()) { fine.push(`Urgent line left blank: the chat uses the number on file, ${spa.urgent}.`); continue }
      const level: Level = n.at.startsWith('pair-') ? 'helps' : ['urgent', 'hours', 'after'].includes(n.at) ? 'launch' : 'confirm'
      const detail = pickMsgs.has(n.msg) ? 'Not chosen, so the chat uses H1’s default.'
        : n.at.startsWith('obj-') ? 'Not chosen, so the chat has no approved answer for this objection.' : undefined
      add(level, 'Design form', s.title, n.msg, detail)
    }
  }

  /* Services and products: what makes the chat sell, beyond the minimum. */
  const promoted = a.services.filter((x) => x.n.trim() && x.pr !== 'none')
  const noPair = promoted.filter((x) => !x.pair.length).map((x) => x.n)
  if (noPair.length) add('helps', 'Design form', 'Service logic', `${noPair.length} of ${promoted.length} services have no “pairs well with” suggestions`, list(noPair))
  if (promoted.length && !promoted.some((x) => x.add.trim())) add('helps', 'Design form', 'Service logic', 'No add-ons or upgrades named for any service')
  const lonely = a.concerns.filter((c) => c.n.trim() && !c.svc.length).map((c) => c.n)
  if (lonely.length) add('helps', 'Design form', 'Concern logic', `No service matched for: ${lonely.join(', ')}`, 'The chat offers a consult for these instead.')
  const bare = a.products.filter((p) => p.n.trim() && p.pr !== 'none' && !p.after.length && !p.helps.length)
  if (bare.length) add('helps', 'Design form', 'Product priorities', `${bare.length} of ${a.products.length} products aren’t linked to a service or concern`, 'The chat can’t recommend a product it can’t connect to anything.')

  /* Packages and memberships. */
  const noMembership = jot && /^\s*no\b/i.test(jot.get('membership'))
  if (!Object.keys(a.growth.pk).length) {
    if (noMembership) fine.push('No packages or membership (the Jotform says no membership).')
    else add('helps', 'Design form', 'Growth priorities', 'No packages to grow')
  }

  /* Promotions. */
  const promos = a.promos.filter((p) => p.n.trim() && p.terms.trim())
  if (!promos.length) {
    if (a.tac.discount === 'proactive' || a.tac.discount === 'hesitate') add('confirm', 'Design form', 'Promotions and events', 'They chose to offer discounts proactively, but listed no promotions', 'The chat has nothing to offer until one is added.')
    else add('helps', 'Design form', 'Promotions and events', 'No promotions or events')
  }

  /* How they talk. */
  if (!Object.values(a.quick).some((x) => x?.trim()) && !a.pasted.trim()) add('helps', 'Design form', 'Show us how you talk', 'No sample replies or pasted messages', 'The chat learns their voice from the role-play alone.')

  /* Role-play: skipped scenarios, unless the scenario doesn't fit this spa. */
  const medical = spa.catalog.services.some((x) => INJECTABLE.test(`${x.n} ${x.cat}`))
  const hasMembership = !!Object.keys(a.growth.pk).length || spa.catalog.packages.length > 0 || (jot ? jot.yes('membership') : false)
  const notFit: string[] = []
  for (const sc of SCENARIOS) {
    if (sc.lang && !a.languages.includes(sc.lang)) continue
    const replies = (a.rp.logs[sc.id] ?? []).filter((m) => m.r === 'y' && m.t.trim()).length
    if (replies) continue
    if ((INJECTABLE_SCENARIOS.has(sc.id) && !medical) || (sc.id === 'member' && !hasMembership)) notFit.push(sc.t)
    else add('helps', 'Design form', 'Calibrate your voice', `Skipped the role-play “${sc.t}”`)
  }
  if (notFit.length) fine.push(`Skipped role-plays that don’t fit this spa: ${notFit.join(', ')}.`)

  /* Where the Jotform and the wizard should agree. */
  if (jot) {
    const where = jot.get('retailWhere')
    const sells = a.products.filter((p) => p.n.trim() && p.pr !== 'none')
    if (/in[- ]store only/i.test(where)) {
      const off = sells.filter((p) => p.where !== 'instore')
      if (off.length) add('confirm', 'Both', 'Product priorities', `The Jotform says products are sold in store only, but ${off.length} of ${sells.length} products are set to sell online too`, 'Likely never changed from the default. Set them to in store only before export.')
    } else if (/online only/i.test(where)) {
      const off = sells.filter((p) => p.where !== 'online')
      if (off.length) add('confirm', 'Both', 'Product priorities', `The Jotform says products are sold online only, but ${off.length} products are set to sell in store`)
    }

    const said = norm(jot.get('responseTime').replace(/with in/i, 'within')).replace(/^within /, '')
    if (said && spa.commitment && !said.includes(norm(spa.commitment))) {
      add('confirm', 'Both', 'Handoff response time', `The Jotform says ${quote(jot.get('responseTime'))}, but the chat promises “${spa.commitment}”`)
    }

    const line = digits(a.em.urgent || spa.urgent)
    const nums = [jot.get('compDayNum'), jot.get('compAfterNum')].map(digits).filter((x) => x.length >= 10)
    if (line && nums.length && !nums.includes(line)) {
      add('confirm', 'Both', 'Urgent line', `The chat’s urgent line (${a.em.urgent || spa.urgent}) isn’t one of the Jotform’s complication contacts`, nums.join(', '))
    }

    const hours = a.em.hours.trim()
    if (/24\s*\/\s*7/.test(hours) && isBlank(jot.get('compAfter'))) {
      add('launch', 'Both', 'Urgent line', 'The urgent line says 24/7, but the Jotform names no after-hours contact')
    } else if (/24\s*\/\s*7/.test(hours)) {
      fine.push(`Urgent line hours are 24/7, which matches the Jotform’s after-hours contact (${jot.get('compAfter').trim()}, by ${jot.get('compAfterHow').trim().toLowerCase()}).`)
    }
  }

  return { gaps, fine }
}

/* ---------- The report ---------- */

const ORDER: Level[] = ['launch', 'confirm', 'helps', 'h1']

export function buildReport(input: { a: Answers; spa: Spa; signoff: SignOff; jot?: Jot }): Report {
  const j = input.jot ? jotformGaps(input.jot, input.spa) : null
  const d = designGaps(input.a, input.spa, input.signoff, j?.view)
  const gaps = [...d.gaps, ...(j?.gaps ?? [])].sort((x, y) => ORDER.indexOf(x.level) - ORDER.indexOf(y.level))
  return {
    spa: input.spa.name,
    signoff: input.signoff,
    jotform: input.jot && j ? { submitted: input.jot.get('Submission Date')?.trim() ?? '', unknown: j.unknown } : null,
    gaps,
    fine: [...new Set([...d.fine, ...(j?.fine ?? [])])],
    comments: [['Personality Protocol', input.a.notes1], ['Sales Playbook', input.a.notes2]]
      .filter(([, t]) => t?.trim()).map(([part, text]) => ({ part: part!, text: text!.trim() })),
  }
}

/** The report as plain text for the terminal. */
export function reportText(r: Report): string {
  const out: string[] = [`Gaps for ${r.spa}`, '']
  out.push(r.signoff ? `Design form: signed off by ${r.signoff.name} on ${r.signoff.on}${r.signoff.current ? '' : ' (answers changed since)'}` : 'Design form: not signed off')
  out.push(r.jotform ? `Jotform: submitted ${r.jotform.submitted}` : 'Jotform: not checked (pass --jotform <file.csv>)')
  for (const level of ORDER) {
    const g = r.gaps.filter((x) => x.level === level)
    if (!g.length) continue
    out.push('', `${LEVELS[level]} (${g.length})`)
    for (const x of g) {
      out.push(`  - [${x.from}] ${x.where}: ${x.what}`)
      if (x.detail) out.push(`      ${x.detail}`)
    }
  }
  if (r.comments.length) out.push('', 'Their comments for H1', ...r.comments.map((c) => `  - ${c.part}: ${c.text}`))
  if (r.fine.length) out.push('', 'Doesn’t apply, or already covered', ...r.fine.map((f) => `  - ${f}`))
  if (r.jotform?.unknown.length) out.push('', 'Jotform questions the detector doesn’t know yet (add a rule in gaps.ts):', ...r.jotform.unknown.map((q) => `  - ${q}`))
  return out.join('\n')
}
