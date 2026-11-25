// A spa open by appointment only (Plumb + Pine): no set hours, so the chat never says it's open or closed.
import { describe, expect, it } from 'vitest';
import { loadClient } from '../src/config/load.ts';
import { Catalog, localClock } from '../src/catalog.ts';
import { catalogBlock, fixedBlock, requestBlock } from '../src/prompt.ts';

describe('by appointment only', () => {
  const catalog = new Catalog(loadClient('plumb-and-pine'));
  const saturdayNight = localClock('America/Los_Angeles', new Date('2026-11-15T07:30:00Z')); // Sat 11:30 PM in Reno

  it('describes the hours as by appointment, never closed', () => {
    const facts = fixedBlock(catalog);
    expect(facts).toContain('by appointment only');
    expect(facts).not.toMatch(/Closed (Sunday|Monday)/);
    const now = requestBlock(catalog, { clock: saturdayNight, lang: 'en' });
    expect(now).toContain('open by appointment only');
    expect(now).not.toContain('closed right now');
  });

  it('lets the event planner use any day', () => {
    expect(catalog.isOpenDay('2026-11-15')).toBe(true);
    expect(catalog.isOpenDay('2026-11-16')).toBe(true);
  });

  it("states no length or downtime the spa hasn't given, and the card leaves them out", () => {
    // Every length now comes from Vagaro (Nov 10), so one is removed here to keep covering the case.
    const bundle = loadClient('plumb-and-pine');
    delete bundle.services.services.find((s) => s.id === 'skin-consultation')!.duration_minutes;
    const partial = new Catalog(bundle);
    const consult = partial.serviceView('skin-consultation', 'en', '2026-11-09')!;
    expect(consult.durationMinutes).toBeUndefined();
    expect(consult.downtime).toBeUndefined();
    expect(catalogBlock(partial, '2026-11-09')).toMatch(/Skin Consultation \(id: skin-consultation\): .*length not listed/);
    expect(fixedBlock(partial)).toContain("Downtime: not listed. Don't state any");
    // What she did give still shows.
    const ageless = partial.serviceView('the-ageless-facial', 'en', '2026-11-09')!;
    expect(ageless.durationMinutes).toBe(90);
    expect(catalog.serviceView('sugar-plumb-express-facial', 'en', '2026-11-09')!.downtime).toBe('None');
  });
});

describe('lengths of time in replies', () => {
  it('lets through only lengths the spa gave, and blocks a guess', async () => {
    const { checkText } = await import('../src/checks/output.ts');
    const { loadClient } = await import('../src/config/load.ts');
    const { Catalog } = await import('../src/catalog.ts');
    const c = new Catalog(loadClient('plumb-and-pine'));
    expect(checkText('The Ageless Facial is a 90-minute ritual.', c, '2026-11-09').ok).toBe(true);
    expect(checkText('The mask works for about 45 minutes while you rest.', c, '2026-11-09').ok).toBe(true); // from her description
    expect(checkText('We ask for 24 hours notice.', c, '2026-11-09').ok).toBe(true);
    expect(checkText('The Skin Consultation takes about 30 minutes.', c, '2026-11-09').ok).toBe(true); // Vagaro's length
    const guess = checkText('The Skin Consultation takes about 50 minutes.', c, '2026-11-09');
    expect(guess.ok).toBe(false);
    expect(guess.problems.join(' ')).toContain('50 minutes');
  });
});
