/*
 * A finished playbook for the fictional demo spa (Lumen Aesthetics), filled in
 * the way a spa would. Synthetic: no real people, prices, or numbers. Used by
 * the export's tests and to build the concierge's demo client
 * (`scripts/export-playbook.ts --demo`).
 */
import { withDefaults, type Answers } from '../answers'
import { DEMO_SPA } from '../spa'

export const LUMEN_TODAY = '2026-11-06'

export function lumenAnswers(): Answers {
  const base = withDefaults(null, DEMO_SPA)
  const svc = (n: string, patch: Partial<Answers['services'][number]>) => ({ ...base.services.find((s) => s.n === n)!, ...patch })
  const prod = (n: string, patch: Partial<Answers['products'][number]>) => ({ ...base.products.find((p) => p.n === n)!, ...patch })
  return withDefaults({
    feel: ['Calm', 'Cared for', 'In expert hands'],
    nameStyle: 'first', name: 'mia', subtitle: 'AI Treatment Coordinator', avType: 'portrait', avId: 2,
    tone: 'warm-bal', emoji: 'never', exclaim: 'sparingly', length: 'short',
    terms: { guests: 'guests', treatments: 'treatments', providers: 'injectors', book: 'book a consult' },
    greeting: 1, signoff: 0,
    languages: ['English'], langMode: 'match',
    pricing: 'starting',
    neverCustom: ['We never call a treatment a “quick fix”'],
    pairs: { 0: 'a', 1: 'b', 2: 'b', 3: 'b', 4: 'a', 5: 'a', 6: 'b', 7: 'a', 8: 'a', 9: 'b' },
    quick: {
      0: 'Lip filler starts at $650 a syringe, and your injector will help you decide how much you need.',
      1: 'That is so normal! We will go at your pace, and you can meet your injector first.',
      2: 'Saturdays go fast. We have a 10am this Saturday, or Nov 14 at 2:30 pm. Want one?',
      4: 'Yes! 20% off HydraFacials through the end of the month. Call us at (720) 555-0100.',
    },
    pasted: 'Hi love! So glad you reached out. Let us know what you are hoping to change and we will put a plan together.',
    handoff: { cant: 1, medical: 0, notoffered: 0, consult: 0, callback: 0, complaint: -1 },
    handoffCustom: { ...base.handoffCustom, complaint: 'I’m so sorry to hear that. I’m sharing this with our practice manager, who will reach out within {C} to make it right.' },
    em: { ...base.em, urgent: '(720) 555-0142', hours: '24/7', after: 'After hours, the urgent line forwards to our on-call nurse.' },
    services: [
      svc('Botox', { pr: 'high', why: 'Signature', pair: ['HydraFacial'], consult: true }),
      svc('Lip filler', { pair: ['Botox'], consult: true, price: 'starting' }),
      svc('HydraFacial', { pr: 'high', why: 'Underbooked', add: 'LED light therapy', pair: ['Chemical peel'] }),
      svc('Laser hair removal', { price: 'exact' }),
      svc('Microneedling', { pair: ['HydraFacial'] }),
      svc('Chemical peel', { pr: 'none', price: 'never', pair: [] }),
    ],
    concerns: base.concerns.map((c) => (c.n === 'Hair thinning and loss' ? { ...c, fb: 'frontdesk' } : c)),
    preg: { svc: ['HydraFacial'], fb: 'consult' },
    products: [
      prod('C E Ferulic', { pr: 'high', why: 'Bestseller', after: ['Microneedling'], helps: ['Sun damage and dark spots'] }),
      prod('UV Clear SPF 46', { after: ['Chemical peel', 'Laser hair removal'], helps: ['Redness and pigmentation'] }),
      prod('Restorative Skin Complex', {}),
      prod('Daily Power Defense', { pr: 'none', where: 'instore' }),
    ],
    growth: {
      pk: { 'Glow Membership': 'A HydraFacial every month for less than booking each one', 'Botox Bank': 'Prepay and save on every Botox visit' },
      diffs: ['Medical director credentials', 'Natural-looking results'],
      spec: DEMO_SPA.catalog.uvp, comp: 'Radiance Med Spa', added: [],
    },
    promos: [
      { id: 'p0', n: 'First-Visit Welcome', terms: '10% off your first treatment', type: 'evergreen', start: '', end: '', sm: 1, em: 1, apply: ['All services'], ev: '', elig: 'First-time guests' },
      { id: 'p1', n: 'Fall Glow', terms: '20% off any HydraFacial', type: 'current', start: '2026-10-15', end: '2026-11-30', sm: 10, em: 11, apply: ['HydraFacial'], ev: '' },
      { id: 'p2', n: 'Open House Special', terms: '$50 off Botox', type: 'upcoming', start: '2026-11-20', end: '2026-11-20', sm: 11, em: 11, apply: ['Botox'], ev: 'e1' },
      { id: 'p3', n: 'Summer Smooth', terms: '15% off laser hair removal', type: 'yearly', start: '', end: '', sm: 5, em: 7, apply: ['Laser hair removal'], ev: '' },
    ],
    events: [
      { id: 'e1', n: 'Holiday Open House', type: 'upcoming', date: '2026-11-20', month: 11, time: '5 to 8 PM', loc: 'Lumen Aesthetics', what: 'Treatment demos, sparkling cider, and raffle prizes.', who: 'public', rsvp: 'link', link: 'https://lumenaesthetics.example/open-house' },
      { id: 'e2', n: 'Member Appreciation Night', type: 'yearly', date: '', month: 2, time: '', loc: '', what: 'An evening to thank our members.', who: 'members', rsvp: 'card', link: '' },
    ],
    promoOwner: { name: 'Dana Lee', email: 'dana@lumenaesthetics.example' },
    obj: { price: ['promo'], pain: ['comfort'], downtime: ['timelines'], results: ['expect'] },
    tac: { discount: 'hesitate', hesitate: 'p1', offer: 'answered', push: 'educate', urgency: 'real' },
    rp: {
      cur: 'price', done: { price: true }, adds: {},
      logs: {
        price: [
          { r: 'g', t: 'Hi! How much is Botox?' },
          { r: 'y', t: 'Hi! Botox is $14 a unit here, and most people need 20 to 40 units.' },
          { r: 'g', t: 'Hmm, that seems kind of expensive.' },
          { r: 'y', t: 'Totally fair. You are paying for an experienced injector and natural results, and the consult is free.' },
          { r: 's', t: 'You ended this scenario.' },
        ],
      },
    },
    sign: { name: 'Jordan Avery', title: 'Owner', attest: true, signedAt: '', hash: '' },
  }, DEMO_SPA)
}
