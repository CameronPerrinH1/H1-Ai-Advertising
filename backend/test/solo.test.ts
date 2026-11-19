// One-person businesses (Cameron, Nov 19): the chat names the owner instead of "our team".
import { describe, expect, it } from 'vitest';
import { Catalog } from '../src/catalog.ts';
import { checkText } from '../src/checks/output.ts';
import { loadClient } from '../src/config/load.ts';
import { strings } from '../src/i18n.ts';
import { catalogBlock, fixedBlock } from '../src/prompt.ts';
import { soloize, TEAM_TALK } from '../src/solo.ts';
import { MemoryOutbox } from '../src/handoff/email.ts';
import { Orchestrator } from '../src/orchestrator.ts';
import { scriptedModel } from './helpers.ts';

const plumb = () => new Catalog(loadClient('plumb-and-pine'));
const lumen = () => new Catalog(loadClient('lumen-aesthetics'));

describe('soloize', () => {
  it.each([
    ['Can I have someone from our clinical team follow up within {response_time}?', 'Can I have Jen follow up within {response_time}?'],
    ['That’s a great question for one of our estheticians.', 'That’s a great question for Jen.'],
    ['Our team will call within 2 business days.', 'Jen will call within 2 business days.'],
    ['so your esthetician can make sure it’s the right fit', 'so Jen can make sure it’s the right fit'],
    ['Would you like them to follow up?', 'Would you like Jen to follow up?'],
    ['They’ll reach out soon.', 'Jen will reach out soon.'],
    ['Our estheticians are honest about results.', 'Jen is honest about results.'],
    ['Our pricing reflects our providers’ training.', 'Our pricing reflects Jen’s training.'],
    ['- Needs a provider assessment first: yes', '- Needs an assessment by Jen first: yes'],
    ['El equipo te llamará pronto.', 'Jen te llamará pronto.'],
  ])('%s', (from, to) => expect(soloize(from, 'Jen')).toBe(to));

  it('leaves a front desk alone: a solo studio truthfully has none', () => {
    expect(soloize("There's no front desk; I'll give my info at the front desk.", 'Jen')).toBe("There's no front desk; I'll give my info at the front desk.");
  });
});

describe('a solo business', () => {
  it('is Plumb + Pine, with one provider, called by her first name', () => {
    expect(plumb().solo).toEqual({ name: 'Jen', fullName: 'Jen Jeffers' });
  });

  it('is not a spa with a team', () => {
    expect(lumen().solo).toBeNull();
  });

  it('can be set either way in config', () => {
    const bundle = loadClient('plumb-and-pine');
    expect(new Catalog({ ...bundle, config: { ...bundle.config, business: { ...bundle.config.business, team: 'team' } } }).solo).toBeNull();
    expect(new Catalog({ ...bundle, config: { ...bundle.config, business: { ...bundle.config.business, solo_name: 'Jennifer' } } }).solo?.name).toBe('Jennifer');
  });

  it('gets a prompt that names Jen and never mentions a team', () => {
    const c = plumb();
    const text = [fixedBlock(c, { openings: true, inChat: true }), catalogBlock(c, '2026-11-19', { openings: true, holds: true })].join('\n');
    expect(text).toContain('# A one-person business');
    expect(text).toContain('Can I have Jen follow up within 2 business days?');
    // Only the rule itself quotes the wording to avoid.
    const leftovers = text.split('\n').filter((l) => TEAM_TALK.test(l) && !l.startsWith('- Wherever you'));
    expect(leftovers).toEqual([]);
  });

  it('gets card text with her name, in English and Spanish', () => {
    expect(strings('en', 'Jen').holdPlaced('Friday at 2 PM', 'within 2 business days')).toBe('Your time is held: Friday at 2 PM. Jen will text you within 2 business days to confirm your appointment.');
    expect(strings('en', 'Jen').consultNote).toBe('Your visit starts with a consultation with Jen.');
    expect(strings('es', 'Jen').callbackNote('pronto')).toBe('Jen te llamará pronto.');
    expect(strings('en').callbackNote('soon')).toBe('The team will call you soon.');
  });

  it('tells the widget her name, so its own text says Jen too', () => {
    const orch = (c: Catalog) => new Orchestrator({ catalog: c, model: scriptedModel([]), outbox: new MemoryOutbox(), phoneKey: 'test' });
    expect(orch(plumb()).publicConfig().soloName).toBe('Jen');
    expect(orch(lumen()).publicConfig().soloName).toBeUndefined();
  });

  it('has a reply that says "our team" sent back', () => {
    const r = checkText('Our team will text you to confirm. Does Friday work?', plumb(), '2026-11-19');
    expect(r.problems).toContain('it says "Our team", but Jen Jeffers runs Plumb + Pine alone; say Jen instead');
    expect(checkText('Jen will text you to confirm. Does Friday work?', plumb(), '2026-11-19').ok).toBe(true);
    expect(checkText('Our team will text you to confirm.', lumen(), '2026-11-19').problems.some((p) => p.includes('alone'))).toBe(false);
  });
});
