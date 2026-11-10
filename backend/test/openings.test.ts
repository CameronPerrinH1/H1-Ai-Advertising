// Live openings (show_openings), on Plumb + Pine with fixed openings instead of Vagaro (D41).
import { describe, expect, it } from 'vitest';
import { loadClient } from '../src/config/load.ts';
import { Catalog } from '../src/catalog.ts';
import { createSession } from '../src/session/store.ts';
import { FixedAvailability, zonedToUtc, type AvailabilitySource } from '../src/booking/availability.ts';
import { showOpenings } from '../src/tools/openings.ts';
import type { ToolContext } from '../src/tools/handlers.ts';
import { Orchestrator } from '../src/orchestrator.ts';
import { MemoryOutbox } from '../src/handoff/email.ts';
import { scriptedModel, text, toolUse } from './helpers.ts';

process.env.CONCIERGE_SILENT = '1';
const catalog = new Catalog(loadClient('plumb-and-pine'));
// Tuesday, Nov 10 2026, 3:00 PM in Reno. Her rule is 24 hours' notice.
const NOW = Date.UTC(2026, 10, 10, 23, 0);
const session = () => createSession({ lang: 'en', noticeVersion: 'v' }).session;
const ctx = (availability?: AvailabilitySource): ToolContext => ({
  catalog,
  session: session(),
  lang: 'en',
  today: '2026-11-10',
  phoneKey: 'test',
  extraAmounts: new Set(),
  availability,
  now: () => NOW,
});

describe('zonedToUtc (D26)', () => {
  it('turns the spa’s local time into UTC, across daylight saving', () => {
    expect(zonedToUtc('2026-11-13', '10:00', 'America/Los_Angeles')).toBe(Date.UTC(2026, 10, 13, 18, 0)); // PST
    expect(zonedToUtc('2026-07-01', '10:00', 'America/Los_Angeles')).toBe(Date.UTC(2026, 6, 1, 17, 0)); // PDT
  });
});

describe('spread', () => {
  it('picks times through the day, an hour apart where it can', async () => {
    const { spread } = await import('../src/tools/openings.ts');
    const quarter = ['10:00', '10:15', '10:30', '10:45', '11:00', '11:15', '13:30', '13:45', '15:00', '15:15'];
    expect(spread(quarter, 4)).toEqual(['10:00', '11:00', '13:30', '15:00']);
    expect(spread(['16:00', '16:15', '16:30'], 4)).toEqual(['16:00', '16:15', '16:30']);
  });
});

describe('show_openings', () => {
  it('shows the soonest days, without times inside her notice window', async () => {
    const src = new FixedAvailability(() => '2026-11-11'); // closed Sun and Mon; 10:00, 10:30, 1:30 PM, 3:00 PM
    const r = await showOpenings({ service_id: 'deluxe-hydrafacial' }, ctx(src));
    const card = r.cards?.[0];
    expect(card?.type).toBe('openings');
    if (card?.type !== 'openings') return;
    expect(card.serviceName).toBe('Deluxe Hydrafacial');
    expect(card.durationMinutes).toBe(45);
    expect(card.days.map((d) => d.date)).toEqual(['2026-11-11', '2026-11-12', '2026-11-13']);
    // Wednesday before 3:00 PM is under 24 hours away.
    expect(card.days[0]!.times.map((t) => t.label)).toEqual(['3:00 PM']);
    expect(card.days[1]!.times.map((t) => t.label)).toEqual(['10:00 AM', '10:30 AM', '1:30 PM', '3:00 PM']);
    expect(r.result.soonest).toBe('Wed, Nov 11 at 3:00 PM');
    // Only the service and a date reach the platform: never anything about the guest.
    expect(src.calls[0]).toEqual({ serviceId: catalog.config.booking.availability!.service_ids['deluxe-hydrafacial'], date: undefined });
  });

  it('shows the consultation’s openings for a treatment that needs one first', async () => {
    const r = await showOpenings({ service_id: 'sugar-plumb-express-facial' }, ctx(new FixedAvailability(() => '2026-11-12')));
    const card = r.cards?.[0];
    expect(card?.type === 'openings' && card.serviceName).toBe('Skin Consultation');
    expect(card?.type === 'openings' && card.consult).toBe(true);
    expect(r.result.consultation_first).toBe(true);
  });

  it('falls back to the booking button when the platform fails or after too many checks', async () => {
    const down: AvailabilitySource = { search: async () => { throw new Error('VagaroError 503'); } };
    const failed = await showOpenings({ service_id: 'deluxe-hydrafacial' }, ctx(down));
    expect(failed.cards?.[0]?.type).toBe('booking_link');
    expect(failed.result.openings_shown).toBe(false);

    const c = ctx(new FixedAvailability(() => '2026-11-12'));
    c.session.counts.openings = 6;
    const capped = await showOpenings({ service_id: 'deluxe-hydrafacial' }, c);
    expect(capped.cards?.[0]?.type).toBe('booking_link');

    const none = await showOpenings({ service_id: 'deluxe-hydrafacial' }, ctx(undefined));
    expect(none.cards?.[0]?.type).toBe('booking_link');
  });

  it('is offered to the model only when the spa’s platform is connected', async () => {
    const model = scriptedModel([{ content: [text('Happy to help!')] }]);
    const make = (availability?: AvailabilitySource) =>
      new Orchestrator({ catalog, model, outbox: new MemoryOutbox(), phoneKey: 'test', availability, now: () => new Date(NOW) });
    await make().handleMessage(session(), { id: 'm1-xxxxxxxx', text: 'hi', lang: 'en' });
    await make(new FixedAvailability(() => '2026-11-12')).handleMessage(session(), { id: 'm2-xxxxxxxx', text: 'hi', lang: 'en' });
    const names = (i: number) => model.calls[i]!.toolConfig!.tools!.map((t) => t.toolSpec?.name);
    expect(names(0)).not.toContain('show_openings');
    expect(names(1)).toContain('show_openings');
  });

  it('runs inside a turn and ends it once the reply is written', async () => {
    const model = scriptedModel([
      { content: [text("Let's get you in for a Deluxe Hydrafacial. Here are Jen's soonest openings."), toolUse('show_openings', { service_id: 'deluxe-hydrafacial' })], stop: 'tool_use' },
      { content: [text('This should never be sent.')] },
    ]);
    const o = new Orchestrator({ catalog, model, outbox: new MemoryOutbox(), phoneKey: 'test', availability: new FixedAvailability(() => '2026-11-11'), now: () => new Date(NOW) });
    const { reply } = await o.handleMessage(session(), { id: 'm1-xxxxxxxx', text: 'Book me a Deluxe Hydrafacial', lang: 'en' });
    expect(model.calls).toHaveLength(1);
    expect(reply.cards.map((c) => c.type)).toEqual(['openings']);
  });
});
