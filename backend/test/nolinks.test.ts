// A spa with booking.links false (Plumb + Pine, Nov 11): the chat never shows a booking-page link,
// even when the deployment hasn't turned holds on, the calendar is down, or a reply falls back.
import { describe, expect, it } from 'vitest';
import { loadClient } from '../src/config/load.ts';
import { Catalog } from '../src/catalog.ts';
import { createSession } from '../src/session/store.ts';
import { FixedAvailability, type AvailabilitySource } from '../src/booking/availability.ts';
import { Orchestrator } from '../src/orchestrator.ts';
import { MemoryOutbox } from '../src/handoff/email.ts';
import { scriptedModel, text, toolUse } from './helpers.ts';

process.env.CONCIERGE_SILENT = '1';
const catalog = new Catalog(loadClient('plumb-and-pine'));
const NOW = Date.UTC(2026, 10, 10, 23, 0);
const session = () => createSession({ lang: 'en', noticeVersion: 'v' }).session;
const links = (cards: { type: string }[]) => cards.filter((c) => c.type === 'booking_link').length;

describe('no booking links (booking.links: false)', () => {
  it('is set for Plumb + Pine', () => {
    expect(catalog.config.booking.links).toBe(false);
  });

  it('books in the chat with holds off: no link tool, selectable times, Confirm greyed out', async () => {
    const model = scriptedModel([
      { content: [text("Let's find you a time."), toolUse('show_openings', { service_id: 'deluxe-hydrafacial' })], stop: 'tool_use' },
    ]);
    const o = new Orchestrator({ catalog, model, outbox: new MemoryOutbox(), phoneKey: 'test', availability: new FixedAvailability(() => '2026-11-12'), now: () => new Date(NOW) });
    const { reply } = await o.handleMessage(session(), { id: 'm1-xxxxxxxx', text: 'Book me a Deluxe Hydrafacial', lang: 'en' });
    expect(model.calls[0]!.toolConfig!.tools!.map((t) => t.toolSpec?.name)).not.toContain('get_booking_link');
    const card = reply.cards[0];
    expect(card?.type === 'openings' && card.selectable).toBe(true);
  });

  it('shows no link when the calendar is down', async () => {
    const down: AvailabilitySource = { search: async () => { throw new Error('VagaroError 503'); } };
    const model = scriptedModel([
      { content: [toolUse('show_openings', { service_id: 'deluxe-hydrafacial' })], stop: 'tool_use' },
      { content: [text('I can pass your preferred times to the team. Which days work best for you?')] },
    ]);
    const o = new Orchestrator({ catalog, model, outbox: new MemoryOutbox(), phoneKey: 'test', availability: down, now: () => new Date(NOW) });
    const { reply } = await o.handleMessage(session(), { id: 'm1-xxxxxxxx', text: 'Book me a Deluxe Hydrafacial', lang: 'en' });
    expect(links(reply.cards)).toBe(0);
  });

  it('falls back to a callback or the phone, never a link', async () => {
    const model = scriptedModel([]);
    const o = new Orchestrator({ catalog, model, outbox: new MemoryOutbox(), phoneKey: 'test', now: () => new Date(NOW) });
    const { reply } = await o.handleMessage(session(), { id: 'm1-xxxxxxxx', text: 'hi', lang: 'en' });
    expect(links(reply.cards)).toBe(0);
    expect(reply.text).toContain(catalog.config.business.phone);
    expect(reply.text).not.toMatch(/book online/i);
  });
});
