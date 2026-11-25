import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { hasDiscount, withDefaults } from './answers'
import { buildPlaybook, toneOnly } from './export'
import { LUMEN_TODAY, lumenAnswers } from './fixtures/lumen'
import { DEMO_SPA } from './spa'

const meta = { contentHash: 'demo', approvals: [], today: LUMEN_TODAY }
const lumen = () => buildPlaybook(lumenAnswers(), DEMO_SPA, meta)

describe('toneOnly (09 §4.2: tone, never facts)', () => {
  it('swaps prices, discounts, dates, times, contact details, and numbers', () => {
    expect(toneOnly('Botox is $14 a unit, most people need 20 to 40 units.')).toBe('Botox is {price} a unit, most people need {number} units.')
    expect(toneOnly('20% off through Nov 14, call (720) 555-0100 or email hi@spa.com')).toBe('{percent} off through {date}, call {phone} or email {email}')
    expect(toneOnly('We have a 10am this Saturday or 2:30 pm tomorrow.')).toBe('We have a {time} {day} or {time} {day}.')
    expect(toneOnly('The consult is free, so feel free to ask. See www.spa.com')).toBe('The consult is {offer}, so feel free to ask. See {link}')
    expect(toneOnly('Lip filler runs $650-$800.')).toBe('Lip filler runs {price}.')
  })

  it('leaves no digit or price in any voice example', () => {
    for (const ex of lumen().voice.examples) {
      expect(ex.reply).not.toMatch(/\d|\$/)
      expect(ex.guest ?? '').not.toMatch(/\d|\$/)
    }
  })
})

describe('buildPlaybook', () => {
  it('resolves identity and voice to the text the spa approved', () => {
    const p = lumen()
    expect(p.identity).toEqual({
      name: 'Mia', label: 'AI Treatment Coordinator', avatar: { mode: 'portrait', id: 'look-3' },
      greeting: 'Welcome to Lumen Aesthetics! I’m Mia, your AI Treatment Coordinator. Ask me anything about our treatments, pricing, or booking.',
    })
    expect(p.terminology.providers).toBe('injectors')
    expect(p.voice.signOff).toBe('Talk soon!')
    expect(p.voice.neverSay).toContain('We never mention other med spas by name, including Radiance Med Spa')
    expect(p.languages).toEqual(['en'])
    expect(p.pricing).toBe('starting_at')
  })

  it('carries the spa’s comments for H1, and leaves them out when there are none', () => {
    expect(lumen().notes).toBeUndefined()
    const a = lumenAnswers()
    a.notes1 = '  Can Sophie sound a little more playful?  '
    a.notes2 = ''
    const p = buildPlaybook(a, DEMO_SPA, { contentHash: 'x', approvals: [], today: LUMEN_TODAY })
    expect(p.notes).toEqual({ personalityProtocol: 'Can Sophie sound a little more playful?' })
  })

  it('keeps the response time and urgent line for the concierge to fill in', () => {
    const p = lumen()
    expect(p.handoff.callback).toContain('within {response_time}')
    expect(p.handoff.complaint).toContain('within {response_time}')
    expect(p.urgent.urgentMessage).toContain('{urgent_line}')
    expect(JSON.stringify(p)).not.toContain('1 business day')
  })

  it('words the consult handoff for every treatment that needs one, not just lip filler', () => {
    expect(lumen().handoff.consult_required).toMatch(/^Great choice! For this treatment, we start with a quick consult/)
  })

  it('never puts a promotion into fixed objection answers', () => {
    const price = lumen().objections.find((o) => o.objection === 'That seems expensive.')!
    expect(price.answer).toBe('Good timing, too: I can tell you about the offers running right now.')
  })

  it('maps promotions, events, and tactics by readable keys', () => {
    const p = lumen()
    expect(p.promotions.map((x) => x.key)).toEqual(['first-visit-welcome', 'fall-glow', 'open-house-special', 'summer-smooth'])
    expect(p.promotions[0]).toMatchObject({ evergreen: true, eligibility: 'First-time guests', services: ['All services'] })
    expect(p.promotions[0]).not.toHaveProperty('ends')
    expect(p.promotions[2]!.event).toBe('holiday-open-house')
    expect(p.promotions[3]).toMatchObject({ startMonth: 5, endMonth: 7 })
    expect(p.tactics).toEqual({ promotions: 'on_hesitation', hesitationPromotion: 'fall-glow', offerContact: 'after_first_answer', suggestBooking: 'after_educating', urgency: 'real_deadlines_only' })
    expect(p.events[0]).toMatchObject({ key: 'holiday-open-house', rsvp: 'link', link: 'https://lumenaesthetics.example/open-house' })
  })

  it('falls back to asking when "offer a promotion I choose" has none chosen', () => {
    const a = withDefaults({ ...lumenAnswers(), tac: { ...lumenAnswers().tac, hesitate: '' } }, DEMO_SPA)
    expect(buildPlaybook(a, DEMO_SPA, meta).tactics).toMatchObject({ promotions: 'when_asked' })
  })

  it('matches the demo playbook the concierge imports, so both sides agree on the format', () => {
    // Regenerate with: pnpm export-playbook --demo concierge/clients/lumen-aesthetics/intake-playbook.json
    const committed = JSON.parse(readFileSync(join(__dirname, '../concierge/clients/lumen-aesthetics/intake-playbook.json'), 'utf8'))
    const p = buildPlaybook(lumenAnswers(), DEMO_SPA, {
      ...meta,
      approvals: [
        { role: 'owner', name: 'Jordan Avery', credential: 'Owner', approvedOn: LUMEN_TODAY },
        { role: 'md', name: 'Dr. Sam Patel', credential: 'MD', approvedOn: LUMEN_TODAY },
      ],
    })
    expect(committed).toEqual(JSON.parse(JSON.stringify(p)))
  })
})

describe('hasDiscount (an offer the chat can check)', () => {
  it('takes a percent or a dollar amount off, as the concierge import does', () => {
    for (const t of ['20% off any HydraFacial', '15 percent off', '$50 off your first visit', '$ 25.50 off', '50 dollars off']) expect(hasDiscount(t), t).toBe(true)
  })
  it('refuses offers with no amount off', () => {
    for (const t of ['Free consult with any package', 'Buy one get one', 'A complimentary peel', '$50 gift card', '3 for the price of 2']) expect(hasDiscount(t), t).toBe(false)
  })
})
