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

describe('second thoughts with a confirm card on screen (Nov 12)', () => {
  it("lets Mila mention the card that's still waiting, instead of falling back", async () => {
    const s = session();
    s.display.push({ role: 'assistant', text: 'Please review the card and tap Confirm.', cards: [{ type: 'confirm', actionId: 'a1', kind: 'appointment', status: 'pending', fields: [] } as never], quickReplies: [] });
    const said = "No problem, nothing is held until you tap Confirm. What's giving you pause?";
    const model = scriptedModel([{ content: [text(said)] }]);
    const o = new Orchestrator({ catalog, model, outbox: new MemoryOutbox(), phoneKey: 'test', availability: new FixedAvailability(() => '2026-11-12'), now: () => new Date(NOW) });
    const { reply } = await o.handleMessage(s, { id: 'm1-xxxxxxxx', text: "Actually, I'm second guessing this.", lang: 'en' });
    expect(reply.text).toBe(said);
  });
});

describe('every reply ends on a question (Nov 12)', () => {
  const make = (replies: string[]) => {
    const model = scriptedModel(replies.map((t) => ({ content: [text(t)] })));
    return { model, o: new Orchestrator({ catalog, model, outbox: new MemoryOutbox(), phoneKey: 'test', now: () => new Date(NOW) }) };
  };
  it('rewrites a reply that ends on a statement', async () => {
    const { o, model } = make(['The Platinum Hydrafacial is designed for dull skin.', 'The Platinum Hydrafacial is designed for dull skin. Does that sound like a fit?']);
    const { reply } = await o.handleMessage(session(), { id: 'm1-xxxxxxxx', text: 'My skin is dull', lang: 'en' });
    expect(reply.text).toBe('The Platinum Hydrafacial is designed for dull skin. Does that sound like a fit?');
    expect(model.calls).toHaveLength(2);
  });
  it('keeps the first reply when the rewrite still has no question', async () => {
    const { o } = make(['The Platinum Hydrafacial is designed for dull skin.', 'It is designed for dull skin.']);
    const { reply } = await o.handleMessage(session(), { id: 'm1-xxxxxxxx', text: 'My skin is dull', lang: 'en' });
    expect(reply.text).toBe('The Platinum Hydrafacial is designed for dull skin.');
  });
  it('leaves a reply that already asks alone', async () => {
    const { o, model } = make(['What are you hoping to change?']);
    await o.handleMessage(session(), { id: 'm1-xxxxxxxx', text: 'hi', lang: 'en' });
    expect(model.calls).toHaveLength(1);
  });
});
