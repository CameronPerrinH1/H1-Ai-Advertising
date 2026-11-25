// The Sales Playbook fields from the intake wizard (09-intake-wizard.md, Section 5): each one loads,
// is cross-checked, and changes what the concierge says or allows.
import { cpSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parse, stringify } from 'yaml';
import { Catalog } from '../src/catalog.ts';
import { checkText } from '../src/checks/output.ts';
import { CLIENTS_DIR, ConfigError, loadClient } from '../src/config/load.ts';
import { catalogBlock, fixedBlock } from '../src/prompt.ts';
import { detectSafetyNet } from '../src/safety/emergency.ts';
import { handleTool } from '../src/tools/handlers.ts';
import { newSession, TODAY } from './helpers.ts';

type Yaml = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

// The demo client, copied to a temp folder and changed by `patch`.
function demoWith(patch: (config: Yaml, files: Record<string, Yaml>) => void) {
  const dir = mkdtempSync(join(tmpdir(), 'playbook-'));
  cpSync(join(CLIENTS_DIR, 'glow-med-spa'), join(dir, 'glow-med-spa'), { recursive: true });
  const path = (f: string) => join(dir, 'glow-med-spa', f);
  const config = parse(readFileSync(path('config.yaml'), 'utf8')) as Yaml;
  const files: Record<string, Yaml> = {};
  for (const f of ['products.yaml', 'urgent-message.yaml']) files[f] = parse(readFileSync(path(f), 'utf8')) as Yaml;
  patch(config, files);
  writeFileSync(path('config.yaml'), stringify(config));
  for (const [f, data] of Object.entries(files)) writeFileSync(path(f), stringify(data));
  return () => loadClient('glow-med-spa', dir);
}

const catalogWith = (patch: Parameters<typeof demoWith>[0]) => new Catalog(demoWith(patch)());
const ctx = (catalog: Catalog) => ({ catalog, session: newSession(), lang: 'en' as const, today: TODAY, phoneKey: 'test', extraAmounts: new Set<number>() });

describe('price display (D72)', () => {
  const catalog = catalogWith((c) => {
    c.sales.pricing = { default: 'exact', services: { 'chemical-peel': 'at_consult', microneedling: 'starting_at' } };
  });

  it('hides a price set to "priced at consultation", even on promotion', () => {
    const peel = catalog.services.get('chemical-peel')!;
    expect(peel.price).toEqual({ amount: 0, unit: 'session', from: false, consult: true });
    expect(catalog.allowedAmounts(TODAY).has(150)).toBe(false);
    expect(checkText('A chemical peel is $150.', catalog, TODAY).ok).toBe(false);
    // fall-peel-2026 is active on TODAY: still listed, but with no price for the peel.
    const promo = catalog.activePromotions(TODAY).find((p) => p.id === 'fall-peel-2026')!;
    expect(promo.prices).toEqual([]);
    expect(catalog.allowedAmounts(TODAY).has(120)).toBe(false);
  });

  it('leaves a hidden price out of estimates and service cards', () => {
    const est = catalog.estimate(['chemical-peel', 'hydrafacial'], [], TODAY);
    expect(est.total).toBe(199);
    expect(est.perUnit).toContain('Chemical Peel');
    expect(catalog.serviceView('chemical-peel', 'en', TODAY)!.price.consult).toBe(true);
  });

  it('marks "starting at" prices as from-prices', () => {
    expect(catalog.services.get('microneedling')!.price).toMatchObject({ amount: 350, from: true });
  });

  it('tells the model which treatments are priced at consultation', () => {
    expect(catalogBlock(catalog, TODAY)).toContain('Priced at consultation: Chemical Peel.');
    expect(catalogBlock(catalog, TODAY)).toContain('Chemical Peel (id: chemical-peel): priced at consultation');
  });
});

describe('sales tactics and guidance', () => {
  it('keeps today\'s behavior when the playbook fields are absent', () => {
    const block = catalogBlock(new Catalog(loadClient('glow-med-spa')), TODAY);
    expect(block).toContain('Create urgency only from a real promotion end date.');
    expect(block).toContain('Mention a promotion when it fits');
  });

  it('follows the spa\'s choices', () => {
    const catalog = catalogWith((c) => {
      c.sales.tactics = { promotions: 'on_hesitation', hesitation_promotion: 'fall-peel-2026', offer_contact: 'when_asked', suggest_booking: 'most_replies', urgency: 'never' };
      c.sales.do_not_promote = ['ipl-photofacial'];
      c.sales.pairings = { botox: ['hydrafacial'] };
      c.sales.growth = { packages: [{ name: 'Glow Membership', why: 'a monthly facial for less' }] };
    });
    const block = catalogBlock(catalog, TODAY);
    expect(block).toContain("Don't use urgency, not even real end dates");
    expect(block).toContain('If they hesitate over price, you may offer this one: 20% off chemical peels.');
    expect(block).toContain('only when the guest asks to book or to talk to someone');
    expect(block).toContain('Once you have recommended a treatment, invite the booking in most replies.');
    expect(block).toContain("Don't recommend these unless the guest asks about them: IPL Photofacial.");
    expect(block).toContain('Worth suggesting with Botox: HydraFacial Signature.');
    expect(block).toContain('Glow Membership (a monthly facial for less)');
  });

  it('never lists promotions when the spa says never', () => {
    const block = catalogBlock(catalogWith((c) => { c.sales.tactics = { promotions: 'never' }; }), TODAY);
    expect(block).not.toContain('20% off chemical peels');
    expect(block).toContain("Don't bring up promotions");
  });
});

describe('events', () => {
  const catalog = catalogWith((c) => {
    c.sales.events = [
      { id: 'open-house', name: 'Fall Open House', date: '2026-11-12', time: '5 to 8 PM', description: 'Demos and treats.', rsvp: 'link', rsvp_link: 'https://glowmedspa.example/open-house' },
      { id: 'members-night', name: 'Members Night', month: 12, description: 'A thank-you evening.', audience: 'members', rsvp: 'card' },
      { id: 'past', name: 'Summer Social', date: '2026-07-01', description: 'Over.' },
    ];
    c.sales.promotions.push({ id: 'open-house-offer', description: '$25 off a HydraFacial', services: ['hydrafacial'], amount_off: 25, starts: '2026-10-01', ends: '2026-11-12', event: 'open-house' });
  });

  it('lists upcoming events with how to RSVP, and event-only offers', () => {
    const block = catalogBlock(catalog, TODAY);
    expect(block).toContain('Fall Open House (id: open-house): November 12, 2026, 5 to 8 PM.');
    expect(block).toContain('get_booking_link with purpose rsvp and event_id open-house');
    expect(block).toContain("usually in December; this year's date isn't set yet");
    expect(block).toContain('For members only.');
    expect(block).not.toContain('Summer Social');
    expect(block).toContain('Only for guests at Fall Open House.');
  });

  it('shows an RSVP button only for events with a link', () => {
    const ok = handleTool('get_booking_link', { purpose: 'rsvp', event_id: 'open-house' }, ctx(catalog));
    expect(ok.cards?.[0]).toMatchObject({ type: 'booking_link', purpose: 'rsvp', url: 'https://glowmedspa.example/open-house', eventName: 'Fall Open House' });
    expect(handleTool('get_booking_link', { purpose: 'rsvp', event_id: 'members-night' }, ctx(catalog)).isError).toBe(true);
    expect(checkText('RSVP at https://glowmedspa.example/open-house', catalog, TODAY).ok).toBe(true);
  });

  it('rejects an event with both a date and a month', () => {
    const load = demoWith((c) => { c.sales.events = [{ id: 'x', name: 'X', date: '2026-12-01', month: 12, description: 'x' }]; });
    expect(load).toThrow(ConfigError);
  });
});

describe('voice', () => {
  it('turns the tone settings into rules', () => {
    const block = fixedBlock(catalogWith((c) => {
      Object.assign(c.voice, { emoji: 'occasionally', exclamation: 'never', length: 'detail', sign_off: 'Talk soon.' });
      Object.assign(c.business.terminology, { providers: 'injectors', booking: 'book a consult' });
    }));
    expect(block).toContain('An emoji now and then is fine');
    expect(block).toContain('Never use exclamation points.');
    expect(block).toContain('usually two to four sentences');
    expect(block).toContain('close with something like: "Talk soon."');
    expect(block).toContain('the people who treat them "injectors"');
    expect(block).toContain('"book a consult"');
  });

  it('includes the approved handoff wording with the response time filled in', () => {
    const block = fixedBlock(catalogWith((c) => {
      c.handoff.wording = { medical: 'Can I have them reach out {response_time}?', callback: 'Our team will call within {response_time}.' };
    }));
    expect(block).toContain('A medical question: "Can I have them reach out within one business day?"');
    expect(block).toContain('A callback request: "Our team will call within one business day."');
  });
});

describe('concerns, products, and pregnancy', () => {
  const load = demoWith((c, files) => {
    c.knowledge.concerns_file = 'concerns.yaml';
    files['concerns.yaml'] = {
      concerns: [
        { name: 'Dull skin', services: ['hydrafacial', 'chemical-peel'] },
        { name: 'Hair thinning and loss', services: [], otherwise: 'front_desk' },
      ],
      pregnancy: { services: ['hydrafacial'] },
    };
    files['products.yaml']!.products[0] = { ...files['products.yaml']!.products[0], brand: 'Glow', after_services: ['microneedling'], helps_with: ['Dull skin'], priority: 'high' };
  });

  it('feeds the treatment finder and product suggestions', () => {
    const block = fixedBlock(new Catalog(load()));
    expect(block).toContain('- Dull skin: lead with HydraFacial Signature, Chemical Peel.');
    const hidden = demoWith((c, files) => {
      c.knowledge.concerns_file = 'concerns.yaml';
      c.sales.do_not_promote = ['chemical-peel'];
      files['concerns.yaml'] = { concerns: [{ name: 'Dull skin', services: ['hydrafacial', 'chemical-peel'] }] };
    });
    expect(fixedBlock(new Catalog(hidden()))).toContain('- Dull skin: lead with HydraFacial Signature.');
    // A blank concern is matched by "Good for", not turned away (Nov 11); a condition that rules treatment out stays a no.
    expect(block).toContain('- Hair thinning and loss: recommend the treatments whose "Good for" covers it and explain why they fit; only if none does, offer a callback from the team.');
    expect(block).not.toContain('no treatment here is the answer');
    expect(block).toContain('the spa offers HydraFacial Signature to guests who are pregnant or nursing. Never call any treatment safe');
    expect(block).toContain('Glow Daily Mineral Sunscreen SPF 40 ($48): Our most recommended aftercare product.; helps with dull skin; suggest after Microneedling; one the spa likes to recommend');
  });

  it('catches references to unknown treatments and concerns', () => {
    const bad = demoWith((c, files) => {
      c.knowledge.concerns_file = 'concerns.yaml';
      files['concerns.yaml'] = { concerns: [{ name: 'Acne', services: ['tattoo-removal'] }] };
      files['products.yaml']!.products[0].helps_with = ['Wrinkles'];
      c.sales.do_not_promote = ['hydrafacial']; // also featured
    });
    expect(bad).toThrow(ConfigError);
    const message = (() => { try { bad(); return ''; } catch (e) { return (e as Error).message; } })();
    expect(message).toContain('concern "Acne": unknown service tattoo-removal');
    expect(message).toContain('hydrafacial is both featured and do_not_promote');
    expect(message).toContain('unknown concern "Wrinkles"');
  });
});

describe("the spa's own emergency symptoms (D14)", () => {
  it('adds them to the keyword net as whole phrases, on top of the built-in patterns', () => {
    const extra = ['Throat or tongue swelling', 'Sudden vision changes'];
    expect(detectSafetyNet('my tongue swelling started an hour ago', extra)).toBeNull(); // not the whole phrase
    expect(detectSafetyNet('I have throat or tongue swelling', extra)).toBe('emergency');
    expect(detectSafetyNet('SUDDEN vision-changes after filler', extra)).toBe('emergency');
    expect(detectSafetyNet("I can't breathe", [])).toBe('emergency');
  });

  it('lists them for the model too', () => {
    const block = fixedBlock(catalogWith((_c, files) => {
      files['urgent-message.yaml']!.emergency_symptoms = ['Difficulty breathing'];
      files['urgent-message.yaml']!.urgent_symptoms = ['Unusual swelling'];
    }));
    expect(block).toContain('treats these as emergencies (show_urgent_help, kind emergency): Difficulty breathing.');
    expect(block).toContain('(kind post_treatment): Unusual swelling.');
  });
});

describe('concerns without a lead treatment (Nov 11)', () => {
  it('are matched to treatments on Plumb + Pine, except conditions that rule treatment out', async () => {
    // Jen's concerns (Nov 13) lead with treatments except Thin lips, and she removed the two
    // not-now conditions from her list; the chat keeps those anyway.
    const { fixedBlock } = await import('../src/prompt.ts');
    const { loadClient } = await import('../src/config/load.ts');
    const { Catalog } = await import('../src/catalog.ts');
    const block = fixedBlock(new Catalog(loadClient('plumb-and-pine')), { openings: true, inChat: true });
    expect(block).toContain('- Thin lips: recommend the treatments whose "Good for" covers it');
    expect(block).toContain('- Acne scars: lead with Microchanneling.');
    expect(block).toContain("- Active cold sore or infection: don't suggest a treatment for now; suggest a consultation.");
    expect(block).toContain("- Recent sun exposure or tanning: don't suggest a treatment for now");
    expect(block).toContain('Good for: fine lines, acne scars');
  });
});

describe('retail rules (Plumb + Pine, Nov 19)', () => {
  const productLines = (c: Catalog) => fixedBlock(c, { openings: true, inChat: true }).split('\n').filter((l) => /^ *- (Products sold|Buying a product)/.test(l));

  it('sells in the studio only, with a Skin Consultation first, then offers to schedule it', () => {
    const [header, rule] = productLines(new Catalog(loadClient('plumb-and-pine')));
    expect(header).toBe('- Products sold (in the spa only: never online, shipped, or held for pickup):');
    expect(rule).toContain('a guest has a Skin Consultation ($40 per session) first');
    expect(rule).toContain('Jen does a Skin Consultation before anyone buys products. Then ask if they\'d like to schedule the Skin Consultation');
    expect(rule).toContain('Give a product\'s price only if they ask.');
  });

  it('leaves a spa without the setting as it was', () => {
    expect(productLines(new Catalog(loadClient('glow-med-spa')))).toEqual(['- Products sold:']);
  });

  it('refuses a consultation that isn’t on the menu', () => {
    expect(demoWith((c) => { c.retail = { in_store_only: true, consult_to_buy: 'no-such-consult' }; })).toThrow('retail.consult_to_buy: unknown service no-such-consult');
  });
});
