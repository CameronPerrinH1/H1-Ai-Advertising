// Defaults that depend on what a spa offers: an esthetician's studio isn't an injectables med spa.
import { describe, expect, it } from 'vitest'
import { defaults } from './answers'
import { TERMS } from './content'
import { DEMO_SPA, type Spa } from './spa'

const skinStudio: Spa = {
  ...DEMO_SPA, id: 'skin', name: 'Skin Studio',
  catalog: {
    ...DEMO_SPA.catalog,
    services: [
      { n: 'Deluxe Hydrafacial', cat: 'HydraFacial' }, { n: 'Microchanneling', cat: 'Facials' },
      { n: 'HydraScalp Keravive, full scalp', cat: 'Scalp' }, { n: 'Hair Restoration Microchanneling', cat: 'Scalp' },
    ],
  },
}

describe('defaults for a spa without injectables', () => {
  const a = defaults(skinStudio)
  it('leaves injection wording out of the urgent lines', () => {
    expect(a.em.t2.join(' ')).not.toMatch(/injection/i)
    expect(a.em.s2).not.toMatch(/clinical team/i)
  })
  it('keeps the injection wording for a spa that injects', () => {
    expect(defaults(DEMO_SPA).em.t2.join(' ')).toMatch(/injection site/)
  })
  it('suggests its scalp and microchanneling treatments for those concerns', () => {
    const svc = (n: string) => a.concerns.find((c) => c.n === n)?.svc
    expect(svc('Hair thinning and loss')).toEqual(['HydraScalp Keravive, full scalp', 'Hair Restoration Microchanneling'])
    expect(svc('Acne scars')).toEqual(['Microchanneling'])
  })
  it('offers Estheticians for who performs them', () => {
    expect(TERMS.providers!.map(([v]) => v)).toContain('estheticians')
  })
})
