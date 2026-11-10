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

describe('selling first (Erin, Nov 10)', () => {
  it('tells the chat to ask, probe hesitation, and upsell listed pairings', async () => {
    const { loadClient } = await import('../src/config/load.ts');
    const { Catalog } = await import('../src/catalog.ts');
    const { catalogBlock } = await import('../src/prompt.ts');
    const block = catalogBlock(new Catalog(loadClient('lumen-aesthetics')), '2026-11-10');
    expect(block).toContain('# Selling: your top priority after safety');
    expect(block).toContain('Never answer and stop');
    expect(block).toContain('gently ask whether anything is holding them back');
    expect(block).toContain('Upsell in the same reply');
    expect(block).toContain('Only suggest pairings and add-ons listed in this prompt');
    expect(block).toContain('One upsell per treatment');
  });
});

describe('session cookie', () => {
  const start = async (crossSiteCookie: boolean) => {
    const { mkdtempSync } = await import('node:fs');
    const { tmpdir } = await import('node:os');
    const { join } = await import('node:path');
    const { createApp } = await import('../src/app.ts');
    const { Orchestrator } = await import('../src/orchestrator.ts');
    const { MemoryOutbox } = await import('../src/handoff/email.ts');
    const { FileControl } = await import('../src/control.ts');
    const { MemorySessionRepo } = await import('../src/session/store.ts');
    const { FileSummaryRepo } = await import('../src/summary/store.ts');
    const { catalog, scriptedModel } = await import('./helpers.ts');
    const model = scriptedModel([]);
    const outbox = new MemoryOutbox();
    const rt = {
      bundle: catalog.bundle, catalog, model, outbox,
      orchestrator: new Orchestrator({ catalog, model, outbox, phoneKey: 'test' }),
      sessions: new MemorySessionRepo(), summaries: new FileSummaryRepo(),
      control: new FileControl('glow-med-spa', mkdtempSync(join(tmpdir(), 'concierge-'))),
      staffCode: 'x', currentMonth: () => '2026-11', onAws: false,
    };
    const origin = 'https://chat.glowmedspa.example';
    const app = createApp(rt as never, { allowedOrigins: new Set([origin]), secureCookie: true, crossSiteCookie });
    const version = rt.orchestrator.publicConfig().notice.version;
    const res = await app({ method: 'POST', path: '/api/session', headers: { origin, 'content-type': 'application/json' }, body: JSON.stringify({ lang: 'en', noticeVersion: version }) });
    return res.setCookie ?? '';
  };
  it('stays SameSite=Lax in production (chat.<spa domain> is the same site)', async () => {
    const c = await start(false);
    expect(c).toContain('SameSite=Lax');
    expect(c).not.toContain('Partitioned');
  });
  it('is partitioned SameSite=None for staging, which runs on a CloudFront address', async () => {
    const c = await start(true);
    expect(c).toContain('SameSite=None');
    expect(c).toContain('Secure');
    expect(c).toContain('Partitioned');
  });
});
