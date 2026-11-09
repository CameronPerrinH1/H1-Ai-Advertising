// A spa open by appointment only (Plumb + Pine): no set hours, so the chat never says it's open or closed.
import { describe, expect, it } from 'vitest';
import { loadClient } from '../src/config/load.ts';
import { Catalog, localClock } from '../src/catalog.ts';
import { fixedBlock, requestBlock } from '../src/prompt.ts';

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
});
