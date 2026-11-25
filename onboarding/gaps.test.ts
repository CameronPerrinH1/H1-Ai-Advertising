// The gap detector: the Jotform CSV, the wizard's own required answers, and where the two disagree.
import { describe, expect, it } from 'vitest'
import { defaults, PICKS, type Answers } from './answers'
import { buildReport, parseCsv, readJotform } from './gaps'
import { DEMO_SPA, type Spa } from './spa'

/** An esthetician's studio: no injectables, so no medical director. */
const STUDIO: Spa = {
  ...DEMO_SPA, name: 'Studio', urgent: '(775) 555-0100', commitment: '2 business days',
  catalog: { services: [{ n: 'Hydrafacial', cat: 'Facials' }, { n: 'Dermaplane', cat: 'Facials' }], products: [{ n: 'SPF 50', brand: 'Epionce', cat: 'Sunscreen' }], packages: [], uvp: '' },
}

/** Every pick made and every required answer given, so only what a test changes shows up. */
function complete(spa: Spa): Answers {
  const a = defaults(spa)
  a.picked = Object.fromEntries(PICKS.map(([k]) => [k, true]))
  a.pairs = Object.fromEntries(Array.from({ length: 12 }, (_, i) => [i, 'a' as const]))
  a.em.urgent = spa.urgent
  a.obj = { price: ['value'], pain: ['comfort'], downtime: ['timelines'], results: ['expect'] }
  a.promoOwner = { name: 'Jo', email: 'jo@example.com' }
  return a
}

const csv = (rows: Record<string, string>) => {
  const cell = (v: string) => `"${v.replace(/"/g, '""')}"`
  return `${Object.keys(rows).map(cell).join(',')}\n${Object.values(rows).map(cell).join(',')}\n`
}
const JOT = {
  'Submission Date': '10/29/2026',
  'Do you have a minimum age requirement?': 'No',
  'What is that age?': '',
  'Who is your medical director?': '',
  'Do you sell retail products?': 'Yes',
  'Where can patients buy them?': 'In-store only',
  'Do you offer a membership?': 'No',
  'Which email address should we send routine chat handoffs to?': '',
  'How quickly does your team commit to responding to those handoffs?': 'With in 2 business days ',
  "After hours, on weekends, and on holidays, who should a patient contact if they think they're having a complication?": 'Jo',
  'What is the phone number or email address for that after-hours contact?': '7755550100',
  'Where should we get information related to patient prep, aftercare, downtime, and what-to-expect?': 'I will have to create it',
  'Do you have Google Analytics installed on your website?': 'Not sure',
  'What is your favorite color?': 'Green',
}
const signoff = { name: 'Jo', on: 'Nov 13, 2026', current: true }

describe('parseCsv', () => {
  it('keeps commas, quotes, and line breaks inside quoted cells', () => {
    expect(parseCsv('a,b\r\n"1, 2","say ""hi""\nthere"\n')).toEqual([['a', 'b'], ['1, 2', 'say "hi"\nthere']])
  })
  it('picks a submission by --match, else the last', () => {
    const two = 'Name\nAlpha\nBeta\n'
    expect(readJotform(two).jot.get('Name')).toBe('Beta')
    expect(readJotform(two, 'alp').jot.get('Name')).toBe('Alpha')
  })
})

describe('the Jotform', () => {
  const r = buildReport({ a: complete(STUDIO), spa: STUDIO, signoff, jot: readJotform(csv(JOT)).jot })
  const find = (where: string) => r.gaps.filter((g) => g.where === where)

  it('flags a blank answer at its level', () => {
    expect(find('Handoff email')).toMatchObject([{ level: 'launch', what: 'Left blank' }])
  })
  it('skips questions behind a “No”, and medical director questions for a spa with no medical services', () => {
    expect(find('Minimum age').filter((g) => g.what === 'Left blank')).toEqual([])
    expect(find('Medical director')).toEqual([])
    expect(r.fine.join(' ')).toMatch(/medical director/)
  })
  it('flags “not sure” and answers that promise the real one later', () => {
    expect(find('Google Analytics')).toMatchObject([{ level: 'h1', what: 'Answered “Not sure”' }])
    expect(find('Where prep, aftercare, and downtime come from')).toMatchObject([{ level: 'confirm', what: 'Promised later' }])
  })
  it('lists questions it has no rule for', () => {
    expect(r.jotform?.unknown).toEqual(['What is your favorite color?'])
  })
  it('accepts a response time that matches the chat’s promise, typos and all', () => {
    expect(find('Handoff response time')).toEqual([])
  })
})

describe('the Design form', () => {
  it('brings back required answers a test spa skipped, saying the default is used', () => {
    const a = complete(STUDIO)
    delete a.picked.brandNames
    const r = buildReport({ a, spa: { ...STUDIO, noRequired: true }, signoff })
    expect(r.gaps).toContainEqual(expect.objectContaining({ level: 'confirm', what: 'Choose whether to use brand names', detail: expect.stringMatching(/default/) }))
  })
  it('lets the signer stand in for the promotions contact, and the number on file for the urgent line', () => {
    const a = complete(STUDIO)
    a.promoOwner = { name: '', email: '' }
    a.em.urgent = ''
    const r = buildReport({ a, spa: STUDIO, signoff })
    expect(r.gaps.filter((g) => g.where === 'Promotions and events' && /keeps promotions/.test(g.what))).toEqual([])
    expect(r.gaps.filter((g) => g.what === 'Enter your urgent line number')).toEqual([])
    expect(r.fine.join(' ')).toMatch(/they go to Jo/)
  })
  it('asks for team size until the profile says, and notes it once it does', () => {
    const ask = (spa: Spa) => buildReport({ a: complete(spa), spa, signoff }).gaps.filter((g) => g.where === 'Team size')
    expect(ask(STUDIO)).toMatchObject([{ level: 'confirm', from: 'Both' }])
    expect(ask({ ...STUDIO, team: 'solo' })).toEqual([])
    expect(buildReport({ a: complete(STUDIO), spa: { ...STUDIO, team: 'solo' }, signoff }).fine.join(' ')).toMatch(/names the owner/)
  })

  it('needs a sign-off that covers the answers as they are now', () => {
    expect(buildReport({ a: complete(STUDIO), spa: STUDIO, signoff: null }).gaps[0]).toMatchObject({ level: 'launch', what: 'Not signed off yet' })
    expect(buildReport({ a: complete(STUDIO), spa: STUDIO, signoff: { ...signoff, current: false } }).gaps[0]?.what).toMatch(/changed after Jo signed off/)
  })
  it('doesn’t count injectable role-plays as skipped for a studio without injectables', () => {
    const r = buildReport({ a: complete(STUDIO), spa: STUDIO, signoff })
    const skipped = r.gaps.filter((g) => g.what.startsWith('Skipped the role-play')).map((g) => g.what)
    expect(skipped).toEqual(['Skipped the role-play “Event deadline”', 'Skipped the role-play “First-timer”'])
  })
  it('flags proactive discounts with no promotion to offer', () => {
    const a = complete(STUDIO)
    a.tac.discount = 'proactive'
    expect(buildReport({ a, spa: STUDIO, signoff }).gaps).toContainEqual(expect.objectContaining({ level: 'confirm', where: 'Promotions and events' }))
  })
})

describe('the two forms together', () => {
  it('catches products set to sell online when the Jotform says in store only', () => {
    const r = buildReport({ a: complete(STUDIO), spa: STUDIO, signoff, jot: readJotform(csv(JOT)).jot })
    expect(r.gaps).toContainEqual(expect.objectContaining({ from: 'Both', where: 'Product priorities', level: 'confirm' }))
  })
  it('catches an urgent line that isn’t one of the Jotform’s complication contacts', () => {
    const r = buildReport({ a: complete(STUDIO), spa: STUDIO, signoff, jot: readJotform(csv({ ...JOT, 'What is the phone number or email address for that after-hours contact?': '7755559999' })).jot })
    expect(r.gaps).toContainEqual(expect.objectContaining({ from: 'Both', where: 'Urgent line' }))
  })
  it('won’t say 24/7 when the Jotform names no after-hours contact', () => {
    const r = buildReport({ a: complete(STUDIO), spa: STUDIO, signoff, jot: readJotform(csv({ ...JOT, "After hours, on weekends, and on holidays, who should a patient contact if they think they're having a complication?": '' })).jot })
    expect(r.gaps).toContainEqual(expect.objectContaining({ level: 'launch', from: 'Both', where: 'Urgent line' }))
  })
  it('skips the membership role-play when the Jotform says no membership', () => {
    const r = buildReport({ a: complete(STUDIO), spa: STUDIO, signoff, jot: readJotform(csv(JOT)).jot })
    expect(r.gaps.filter((g) => /Membership/.test(g.what))).toEqual([])
  })
})
