// The ask bar's per-page copy (display.pages) and suggested questions.
import { describe, expect, it } from 'vitest';
import { copyForPage, forPage, type PageCopy } from '@concierge/shared';

const t = (en: string) => ({ en, es: en });
const pages: Record<string, PageCopy> = {
  '/': { greeting: t('home') },
  '/treatments*': { greeting: t('treatments'), topic: t('treatments') },
  '/treatments/hydrafacial-treatments': { topic: t('HydraFacial') },
  '/about*': { greeting: t('about') },
};

describe('page copy', () => {
  it('layers the general match under the specific one', () => {
    expect(copyForPage(pages, '/treatments/hydrafacial-treatments')).toEqual({ greeting: t('treatments'), topic: t('HydraFacial') });
    expect(copyForPage(pages, '/treatments/glo2facial')?.topic?.en).toBe('treatments');
    expect(copyForPage(pages, '/about/team/')?.greeting?.en).toBe('about');
    expect(copyForPage(pages, '/')?.greeting?.en).toBe('home');
    expect(copyForPage(pages, '/contact')).toBeUndefined();
  });
  it('ignores query strings, hashes, and a trailing slash', () => {
    expect(copyForPage(pages, '/treatments/hydrafacial-treatments/?utm_source=meta#top')?.topic?.en).toBe('HydraFacial');
  });
  it('picks the longest prefix for suggested questions', () => {
    const q = { '/treatments*': 'general', '/treatments/hydrafacial*': 'hydra' };
    expect(forPage(q, '/treatments/hydrafacial-treatments')).toBe('hydra');
    expect(forPage(q, '/treatments/dmk')).toBe('general');
  });
});

describe("Plumb + Pine's ask bar", () => {
  it('fills {name} in the page greeting and serves it to the widget', async () => {
    const { loadClient } = await import('../src/config/load.ts');
    const { Catalog } = await import('../src/catalog.ts');
    const { Orchestrator } = await import('../src/orchestrator.ts');
    const { MemoryOutbox } = await import('../src/handoff/email.ts');
    const { scriptedModel } = await import('./helpers.ts');
    const catalog = new Catalog(loadClient('plumb-and-pine'));
    const o = new Orchestrator({ catalog, model: scriptedModel([]), outbox: new MemoryOutbox() } as never);
    const cfg = o.publicConfig();
    expect(cfg.display.modes).toContain('askbar');
    expect(cfg.display.pages['/']?.greeting?.en).toContain(`I'm ${catalog.config.concierge.name}.`);
    expect(cfg.display.pages['/']?.greeting?.en).not.toContain('{name}');
  });
});
