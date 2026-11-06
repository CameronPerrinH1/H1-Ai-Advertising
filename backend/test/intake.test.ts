// The intake playbook importer (09-intake-wizard.md, Section 5), against the demo spa whose
// playbook H1's site exports (apps/site-h1/src/onboarding/fixtures/lumen.ts).
import { cpSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { CLIENTS_DIR, loadClient } from '../src/config/load.ts';
import { applyPlaybook, parseDiscount, PlaybookError, yearlyWindow } from '../src/intake/apply.ts';
import { playbookSchema, type Playbook } from '../src/intake/playbook.ts';

const DIR = join(CLIENTS_DIR, 'lumen-aesthetics');
const playbook = (): Playbook => playbookSchema.parse(JSON.parse(readFileSync(join(DIR, 'intake-playbook.json'), 'utf8')));

// Applies a playbook to a copy of the demo client and loads the result.
function importInto(pb: Playbook) {
  const root = mkdtempSync(join(tmpdir(), 'intake-'));
  cpSync(DIR, join(root, 'lumen-aesthetics'), { recursive: true });
  const result = applyPlaybook(pb, join(root, 'lumen-aesthetics'));
  for (const [f, text] of Object.entries(result.files)) writeFileSync(join(root, 'lumen-aesthetics', f), text);
  return { ...result, bundle: loadClient('lumen-aesthetics', root) };
}

describe('importing the demo playbook', () => {
  it('reproduces the committed client folder exactly, so the folder and the playbook never drift', () => {
    const { files } = applyPlaybook(playbook(), DIR);
    for (const [f, text] of Object.entries(files)) expect(text, f).toBe(readFileSync(join(DIR, f), 'utf8'));
  });

  it('maps the Sales Playbook onto the config', () => {
    const { config, concerns, products, urgent } = importInto(playbook()).bundle;
    expect(config.concierge.name).toBe('Mia');
    expect(config.concierge.avatar).toEqual({ mode: 'portrait', id: 'look-3' });
    expect(config.sales.featured_services).toEqual(['botox', 'hydrafacial']);
    expect(config.sales.do_not_promote).toEqual(['chemical-peel']);
    expect(config.sales.pricing).toEqual({ default: 'starting_at', services: { 'lip-filler': 'starting_at', 'laser-hair-removal': 'exact', 'chemical-peel': 'at_consult' } });
    expect(config.sales.pairings.hydrafacial).toBeUndefined(); // its pairing was a treatment the spa doesn't promote
    expect(config.sales.add_on_suggestions).toEqual({ hydrafacial: ['led-light-therapy-add-on'] });
    expect(config.sales.tactics).toMatchObject({ promotions: 'on_hesitation', hesitation_promotion: 'fall-glow' });
    expect(config.voice.donts).toContain('Never guarantee results');
    expect(config.business.urgent_line).toBe('(720) 555-0142');
    expect(config.compliance_profile.medical_director_approval).toEqual({ approver: 'Dr. Sam Patel, MD', approved_on: '2026-11-06', content_hash: 'demo' });
    expect(concerns.pregnancy).toEqual({ services: ['hydrafacial'], otherwise: 'consult' });
    expect(products.find((p) => p.name === 'C E Ferulic')).toMatchObject({ price: 182, brand: 'SkinCeuticals', priority: 'high', after_services: ['microneedling'] });
    expect(urgent.emergency_symptoms).toContain('Throat or tongue swelling');
    expect(urgent.post_treatment.body.en).toContain('{urgent_line}');
  });

  it('turns promotions into dated, discounted offers', () => {
    const promos = importInto(playbook()).bundle.config.sales.promotions;
    expect(promos.find((p) => p.id === 'fall-glow')).toMatchObject({ percent_off: 20, services: ['hydrafacial'], starts: '2026-10-15', ends: '2026-11-30' });
    expect(promos.find((p) => p.id === 'open-house-special')).toMatchObject({ amount_off: 50, event: 'holiday-open-house' });
    // Yearly, May to July: next year's run, since this year's ended before the export.
    expect(promos.find((p) => p.id === 'summer-smooth')).toMatchObject({ percent_off: 15, starts: '2027-05-01', ends: '2027-07-31' });
  });

  it('marks a draft as unapproved', () => {
    const { bundle, warnings } = importInto({ ...playbook(), approvals: [] });
    expect(bundle.config.compliance_profile.medical_director_approval.approver).toBeNull();
    expect(bundle.urgent.approved_by).toBe('NOT APPROVED: draft intake export');
    expect(warnings.join(' ')).toContain('must not go live');
  });

  it('takes one sign-off from the spa as approval of everything, urgent lines included', () => {
    const pb = playbook();
    const { bundle, warnings } = importInto({ ...pb, approvals: [{ role: 'owner', name: 'Jordan Avery', credential: 'Owner and Medical Director', approvedOn: '2026-11-06' }] });
    expect(bundle.config.compliance_profile.owner_approval?.approver).toBe('Jordan Avery, Owner and Medical Director');
    expect(bundle.urgent.approved_by).toMatch(/^Jordan Avery, Owner and Medical Director, 2026-11-06/);
    expect(warnings.join(' ')).not.toContain('must not go live');
  });
});

describe('what the importer refuses', () => {
  const problems = (pb: Playbook) => {
    try { applyPlaybook(pb, DIR); return ''; } catch (e) { expect(e).toBeInstanceOf(PlaybookError); return (e as Error).message; }
  };

  it('a treatment or product that has no price on file', () => {
    const pb = playbook();
    pb.services.push({ ...pb.services[0]!, name: 'Kybella' });
    pb.products.push({ ...pb.products[0]!, name: 'Mystery Serum', brand: '' });
    const msg = problems(pb);
    expect(msg).toContain('"Kybella" isn\'t on the price list');
    expect(msg).toContain('Product "Mystery Serum" isn\'t on the retail price list');
  });

  it('a promotion whose terms have no discount the chat can check', () => {
    const pb = playbook();
    pb.promotions[0] = { ...pb.promotions[0]!, terms: 'A free LED add-on with any HydraFacial' };
    expect(problems(pb)).toContain('need a percent or dollar amount off');
  });

  it('a label that doesn\'t say it\'s AI (D45)', () => {
    const bad = { ...playbook(), identity: { ...playbook().identity, label: 'Virtual Concierge' } };
    expect(playbookSchema.safeParse(bad).success).toBe(false);
  });
});

describe('helpers', () => {
  it('reads the discount from the terms', () => {
    expect(parseDiscount('20% off any HydraFacial')).toEqual({ percent_off: 20 });
    expect(parseDiscount('$50 off Botox')).toEqual({ amount_off: 50 });
    expect(parseDiscount('Buy two, get one')).toBeUndefined();
  });

  it('finds the next run of a yearly promotion, across New Year too', () => {
    expect(yearlyWindow(5, 7, '2026-11-06')).toEqual({ starts: '2027-05-01', ends: '2027-07-31' });
    expect(yearlyWindow(11, 12, '2026-11-06')).toEqual({ starts: '2026-11-01', ends: '2026-12-31' });
    expect(yearlyWindow(12, 2, '2027-01-10')).toEqual({ starts: '2026-12-01', ends: '2027-02-28' });
  });
});
