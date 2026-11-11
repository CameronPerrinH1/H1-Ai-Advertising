// compare_services (Nov 11): a comparison shows why each fits the guest, what it does and what it
// targets, not only price and time.
import { describe, expect, it } from 'vitest';
import { loadClient } from '../src/config/load.ts';
import { Catalog } from '../src/catalog.ts';
import { createSession } from '../src/session/store.ts';
import { handleTool, type ToolContext } from '../src/tools/handlers.ts';

process.env.CONCIERGE_SILENT = '1';
const catalog = new Catalog(loadClient('plumb-and-pine'));
const ctx = (): ToolContext => ({ catalog, session: createSession({ lang: 'en', noticeVersion: 'v' }).session, lang: 'en', today: '2026-11-10', phoneKey: 'test', extraAmounts: new Set() });

describe('compare_services', () => {
  it('carries each reason, what it does, and its targets', () => {
    const out = handleTool(
      'compare_services',
      {
        service_ids: ['express-hydrafacial', 'platinum-hydrafacial'],
        reasons: [
          { service_id: 'express-hydrafacial', reason: 'A quick refresh for your glow on a budget.' },
          { service_id: 'platinum-hydrafacial', reason: 'Goes deeper on the texture you mentioned.' },
          { service_id: 'microchanneling', reason: 'not compared, so dropped' },
        ],
      },
      ctx(),
    );
    const card = out.cards?.[0];
    if (card?.type !== 'compare') throw new Error('no compare card');
    expect(card.reasons).toEqual({ 'express-hydrafacial': 'A quick refresh for your glow on a budget.', 'platinum-hydrafacial': 'Goes deeper on the texture you mentioned.' });
    expect(card.services[1]!.summary.length).toBeGreaterThan(10);
    expect(card.services[1]!.goodFor).toContain('dull skin');
  });

  it('works without reasons', () => {
    const card = handleTool('compare_services', { service_ids: ['express-hydrafacial', 'platinum-hydrafacial'] }, ctx()).cards?.[0];
    expect(card?.type === 'compare' && card.reasons).toBeUndefined();
  });
});
