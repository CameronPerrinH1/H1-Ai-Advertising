import { describe, expect, it } from 'vitest';
import { configSchema } from '../src/config/schema.ts';
import { localClock } from '../src/catalog.ts';
import { catalog, TODAY } from './helpers.ts';

describe('catalog', () => {
  it('filters promotions by date and precomputes prices (D18)', () => {
    const active = catalog.activePromotions(TODAY);
    expect(active.map((p) => p.id)).toEqual(['fall-peel-2026']);
    expect(active[0]!.prices).toEqual([{ serviceId: 'chemical-peel', was: 150, now: 120 }]);
    expect(catalog.activePromotions('2026-12-01').map((p) => p.id)).toEqual(['holiday-hydrafacial-2026']);
  });

  it('books treatments that need an assessment as a consultation (D15)', () => {
    const botox = catalog.serviceView('botox', 'en', TODAY)!;
    expect(botox.action).toEqual({
      kind: 'consult',
      url: 'https://book.glowmedspa.example/services/injectable-consultation',
      consultName: 'Injectable Consultation',
    });
    expect(catalog.serviceView('hydrafacial', 'en', TODAY)!.action.kind).toBe('book');
  });

  it('localizes card text and shows active promotions on cards', () => {
    expect(catalog.serviceView('hydrafacial', 'es', TODAY)!.downtime).toBe('Ninguno');
    expect(catalog.serviceView('chemical-peel', 'en', TODAY)!.promo?.price).toBe(120);
  });

  it('knows when the spa is open in its own time zone', () => {
    // Friday Oct 23, 2026 at 3:00 PM Pacific (22:00 UTC) is inside Friday hours.
    const open = localClock('America/Los_Angeles', new Date('2026-10-23T22:00:00Z'));
    expect(open.dayKey).toBe('fri');
    expect(catalog.openStatus(open).open).toBe(true);
    // Sunday is closed.
    expect(catalog.openStatus(localClock('America/Los_Angeles', new Date('2026-10-25T20:00:00Z'))).open).toBe(false);
  });
});

describe('config validation', () => {
  it('rejects a handoff address off the client domain (D36)', () => {
    const bad = structuredClone(catalog.bundle.config) as Record<string, unknown> & { handoff: { email_to: string } };
    bad.handoff.email_to = 'someone@gmail.com';
    const r = configSchema.safeParse(bad);
    expect(r.success).toBe(false);
  });

  it('rejects unknown fields', () => {
    const bad = { ...structuredClone(catalog.bundle.config), surprise: true };
    expect(configSchema.safeParse(bad).success).toBe(false);
  });

  it('fills in defaults for an omitted block, including its own fields', () => {
    const cfg = structuredClone(catalog.bundle.config) as Record<string, unknown> & { booking: Record<string, unknown> };
    delete cfg.booking.limits;
    const r = configSchema.safeParse(cfg);
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.booking.limits).toMatchObject({ max_bookings_per_session: 2, max_callbacks_per_session: 2 });
  });

  it('keeps chats 30 days and flagged chats 90, and refuses a shorter flagged window', () => {
    expect(catalog.config.retention).toMatchObject({ transcripts_days: 30, flagged_transcripts_days: 90 });
    const bad = structuredClone(catalog.bundle.config) as Record<string, unknown> & { retention: Record<string, number> };
    bad.retention.flagged_transcripts_days = 10;
    expect(configSchema.safeParse(bad).success).toBe(false);
  });

  it('accepts hours for open days only', () => {
    const hours = catalog.bundle.config.business.locations[0]!.hours;
    expect(Object.keys(hours).sort()).toEqual(['fri', 'sat', 'thu', 'tue', 'wed']);
  });
});
