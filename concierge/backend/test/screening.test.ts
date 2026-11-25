// Jen's booking rules (Nov 19, by phone): ask about Botox or filler before every booking, keep a
// "yes" 14 days out, and remind facial guests to stop vitamin A and retinol 72 hours before.
import { describe, expect, it } from 'vitest';
import { loadClient } from '../src/config/load.ts';
import { Catalog } from '../src/catalog.ts';
import { createSession } from '../src/session/store.ts';
import { FixedAvailability } from '../src/booking/availability.ts';
import { showOpenings } from '../src/tools/openings.ts';
import { handleTool, type ToolContext } from '../src/tools/handlers.ts';
import { fixedBlock } from '../src/prompt.ts';

process.env.CONCIERGE_SILENT = '1';
const catalog = new Catalog(loadClient('plumb-and-pine'));
const NOW = Date.UTC(2026, 10, 10, 23, 0); // Tuesday, Nov 10 2026, 3:00 PM in Reno
const open = new FixedAvailability(() => '2026-11-11'); // closed Sun and Mon
const ctx = (): ToolContext => ({
  catalog,
  session: createSession({ lang: 'en', noticeVersion: 'v' }).session,
  lang: 'en',
  today: '2026-11-10',
  phoneKey: 'test',
  extraAmounts: new Set(),
  availability: open,
  now: () => NOW,
});
const guest = { first_name: 'Ana', last_name: 'Diaz', phone: '775-555-0123' };

describe('the Botox or filler question', () => {
  it('is asked before any openings are shown', async () => {
    const r = await showOpenings({ service_id: 'deluxe-hydrafacial' }, ctx());
    expect(r.cards).toBeUndefined();
    expect(r.result.next).toContain('"Have you had Botox or filler in the last 14 days?"');
  });

  it('is asked before an appointment request too', () => {
    const r = handleTool('request_appointment', { service_id: 'deluxe-hydrafacial', preferred_times: 'Friday morning', ...guest }, ctx());
    expect(r.isError).toBe(true);
    expect(String(r.result.error)).toContain('Have you had Botox or filler in the last 14 days?');
  });

  it('with "no", shows the soonest openings as usual, once for the whole chat', async () => {
    const c = ctx();
    const first = await showOpenings({ service_id: 'deluxe-hydrafacial', screening: [{ id: 'botox-filler', answer: 'no' }] }, c);
    expect(first.cards?.[0]?.type === 'openings' && first.cards[0].days[0]!.date).toBe('2026-11-11');
    const again = await showOpenings({ service_id: 'the-ageless-facial' }, c);
    expect(again.cards?.[0]?.type).toBe('openings');
  });

  it('with "yes", only shows days 14 or more days out', async () => {
    const r = await showOpenings({ service_id: 'deluxe-hydrafacial', screening: [{ id: 'botox-filler', answer: 'yes' }] }, ctx());
    const card = r.cards?.[0];
    if (card?.type !== 'openings') throw new Error('no openings');
    expect(card.days.every((d) => d.date >= '2026-11-24')).toBe(true);
    expect(card.days[0]!.date).toBe('2026-11-24');
    expect(r.result.earliest_allowed).toMatch(/^2026-11-24/);
  });

  it('counts the days since, when the guest says', async () => {
    const r = await showOpenings({ service_id: 'deluxe-hydrafacial', screening: [{ id: 'botox-filler', answer: 'yes', days_ago: 10 }] }, ctx());
    const card = r.cards?.[0];
    if (card?.type !== 'openings') throw new Error('no openings');
    expect(card.days[0]!.date).toBe('2026-11-14');
  });

  it('refuses a picked time inside the 14 days, and puts the earliest date on a free-text request', async () => {
    const c = ctx();
    await showOpenings({ service_id: 'deluxe-hydrafacial', screening: [{ id: 'botox-filler', answer: 'no' }] }, c);
    c.session.screening = { 'botox-filler': { answer: 'yes', notBefore: '2026-11-24' } };
    const tooSoon = handleTool('request_appointment', { service_id: 'deluxe-hydrafacial', slot: { date: '2026-11-12', time: '10:00' }, ...guest }, c);
    expect(String(tooSoon.result.error)).toContain('on or after 2026-11-24');
    const loose = handleTool('request_appointment', { service_id: 'deluxe-hydrafacial', preferred_times: 'any weekday', ...guest }, c);
    const action = [...c.session.pendingActions.values()][0]!;
    expect(loose.result.status).toBe('awaiting_confirmation');
    expect((action.payload as { preferredTimes: string }).preferredTimes).toBe('any weekday. Earliest date: Tue, Nov 24 (booking rule)');
  });
});

describe('the vitamin A and retinol reminder', () => {
  const booked = async (serviceId: string) => {
    const c = ctx();
    await showOpenings({ service_id: serviceId, screening: [{ id: 'botox-filler', answer: 'no' }] }, c);
    const r = handleTool('request_appointment', { service_id: serviceId, preferred_times: 'Friday morning', ...guest }, c);
    const card = r.cards?.[0];
    return card?.type === 'confirm' ? card.note : '';
  };

  it('is printed on a facial’s confirmation card, and the chat is told to say it', async () => {
    expect(await booked('deluxe-hydrafacial')).toContain('Please stop using any vitamin A or retinol products at least 72 hours before your appointment.');
    const r = await showOpenings({ service_id: 'deluxe-hydrafacial', screening: [{ id: 'botox-filler', answer: 'no' }] }, ctx());
    expect(r.result.when_they_pick_a_time_say).toEqual(['Please stop using any vitamin A or retinol products at least 72 hours before your appointment.']);
  });

  it('is left off scalp treatments', async () => {
    expect(await booked('hair-restoration-microchanneling')).not.toContain('retinol');
  });
});

describe('the prompt', () => {
  it('lists the question as approved, and the reminder', () => {
    const block = fixedBlock(catalog, { openings: true, inChat: true });
    expect(block).toContain('approved by the spa (asking it isn\'t asking for medical history)');
    expect(block).toContain('ask exactly "Have you had Botox or filler in the last 14 days?"');
    expect(block).toContain('tell them: "Please stop using any vitamin A or retinol products at least 72 hours before your appointment."');
    expect(block).toContain('Jen has openings Monday at 3 PM');
    expect(block).toContain('By appointment only, with no walk-ins');
  });
});
