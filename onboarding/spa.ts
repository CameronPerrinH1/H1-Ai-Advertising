/*
 * What H1 already knows about a spa before it opens the wizard: its name, its
 * callback promise, its urgent line. The screens fill these into examples so
 * the spa sees its own name, not a placeholder.
 *
 * Comes from the spa's record once private links exist (D83). Until then the
 * wizard runs against a fictional demo spa, locally only.
 */
export type Spa = {
  id: string
  name: string
  short: string
  /** How soon the team follows up, as said to a guest: "1 business day". */
  commitment: string
  urgent: string
  website: string
  /** IANA time zone. Promotion and event dates are read in the spa's own time. */
  timeZone: string
  /** H1's own test spas only: no answer is required before Continue, except
      the sign-off's name, title, and tick. Set in the profile. */
  noRequired?: boolean
  /** One person does every treatment, or a team. Neither form asks yet; H1 sets it in the profile.
      A one-person business's chat names the owner instead of "our team" (concierge business.team). */
  team?: 'solo' | 'team'
  /** From the onboarding form; Part 2 starts from these. */
  catalog: {
    services: { n: string; cat: string }[]
    products: { n: string; brand: string; cat: string }[]
    packages: string[]
    /** What the spa says sets it apart, in its own words. */
    uvp: string
  }
}

export const DEMO_SPA: Spa = {
  id: 'demo',
  name: 'Lumen Aesthetics',
  short: 'Lumen',
  commitment: '1 business day',
  urgent: '(720) 555-0142',
  website: 'lumenaesthetics.com',
  timeZone: 'America/Denver',
  catalog: {
    services: [
      { n: 'Botox', cat: 'Injectables' }, { n: 'Lip filler', cat: 'Injectables' }, { n: 'HydraFacial', cat: 'Facials' },
      { n: 'Laser hair removal', cat: 'Laser' }, { n: 'Microneedling', cat: 'Skin treatments' }, { n: 'Chemical peel', cat: 'Facials' },
    ],
    products: [
      { n: 'C E Ferulic', brand: 'SkinCeuticals', cat: 'Serums' }, { n: 'UV Clear SPF 46', brand: 'EltaMD', cat: 'Sunscreen' },
      { n: 'Restorative Skin Complex', brand: 'Alastin', cat: 'Serums' }, { n: 'Daily Power Defense', brand: 'ZO Skin Health', cat: 'Moisturizers' },
    ],
    packages: ['Glow Membership', 'Botox Bank', 'Laser Hair Removal 6-Pack'],
    uvp: 'Family-owned since 2009, with a board-certified medical director on site.',
  },
}
