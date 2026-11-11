// Holds (Nov 11): a time the guest picks from the openings and confirms is blocked on the calendar,
// then emailed to the spa. On Plumb + Pine, with fixed openings and in-memory holds (D41).
import { describe, expect, it } from 'vitest';
import { loadClient } from '../src/config/load.ts';
import { Catalog } from '../src/catalog.ts';
import { createSession } from '../src/session/store.ts';
import { FixedAvailability, type HoldWriter } from '../src/booking/availability.ts';
import { releaseHolds } from '../src/booking/holds.ts';
import { showOpenings } from '../src/tools/openings.ts';
import { handleTool, type ToolContext } from '../src/tools/handlers.ts';
import { Orchestrator } from '../src/orchestrator.ts';
import { MemoryOutbox } from '../src/handoff/email.ts';
import { scriptedModel } from './helpers.ts';

process.env.CONCIERGE_SILENT = '1';
const catalog = new Catalog(loadClient('plumb-and-pine'));
const NOW = Date.UTC(2026, 10, 10, 23, 0); // Tue, Nov 10, 3:00 PM in Reno
const guest = { first_name: 'Dana', last_name: 'Reyes', phone: '775-555-0142' };

function setup(opts: { holdMode?: 'on' | 'test' | 'preview'; writer?: HoldWriter } = { holdMode: 'on' }) {
  const fixed = new FixedAvailability(() => '2026-11-12');
  const outbox = new MemoryOutbox();
  const o = new Orchestrator({
    catalog,
    model: scriptedModel([]),
    outbox,
    phoneKey: 'test',
    availability: fixed,
    holds: opts.writer ?? fixed,
    holdMode: opts.holdMode,
    now: () => new Date(NOW),
  });
  const session = createSession({ lang: 'en', noticeVersion: 'v' }).session;
  const ctx: ToolContext = {
    catalog,
    session,
    lang: 'en',
    today: '2026-11-10',
    phoneKey: 'test',
    extraAmounts: new Set(),
    availability: fixed,
    holds: opts.holdMode && opts.holdMode !== 'preview' ? (opts.writer ?? fixed) : undefined,
    inChat: opts.holdMode ? (opts.holdMode === 'preview' ? 'preview' : 'hold') : undefined,
    now: () => NOW,
  };
  return { fixed, outbox, o, session, ctx };
}

describe('Vagaro hold list', () => {
  it('reads every page of calendar tasks', async () => {
    const { VagaroAvailability } = await import('../src/booking/availability.ts');
    const task = (i: number) => ({ personalTaskId: `t${i}`, personalTaskName: i === 149 ? 'Chat hold: X – A B.' : `task ${i}`, personalTaskComment: '', startTime: '2027-03-10T13:00:00', endTime: '2027-03-10T13:20:00' });
    const pages: string[] = [];
    const fakeFetch = (async (url: string) => {
      const u = new URL(url);
      if (u.pathname.endsWith('generate-access-token')) return new Response(JSON.stringify({ responseCode: 1000, data: { access_token: 'x', expires_in: 3600 } }));
      const page = Number(u.searchParams.get('pageNumber'));
      pages.push(String(page));
      const items = Array.from({ length: page === 1 ? 100 : 50 }, (_, i) => task((page - 1) * 100 + i));
      return new Response(JSON.stringify({ responseCode: 1000, data: { personalTasks: items, ...(page === 1 ? { nextPage: 'p2' } : {}) } }));
    }) as typeof fetch;
    const v = new VagaroAvailability('biz', async () => ({ clientId: 'a', clientSecretKey: 'b', region: 'us02' }), fakeFetch);
    const holds = await v.listHolds('jen', '2026-11-11', '2027-05-12');
    expect(pages).toEqual(['1', '2']);
    expect(holds).toHaveLength(150);
    expect(holds.some((h) => h.name.startsWith('Chat hold'))).toBe(true);
  });
});

describe('holds', () => {
  it('holds a picked time on the calendar after Confirm, then emails the spa', async () => {
    const { fixed, outbox, o, session, ctx } = setup();
    const openings = await showOpenings({ service_id: 'deluxe-hydrafacial' }, ctx);
    const card = openings.cards?.[0];
    expect(card?.type === 'openings' && card.selectable).toBe(true);

    const req = handleTool('request_appointment', { service_id: 'deluxe-hydrafacial', slot: { date: '2026-11-12', time: '10:00' }, ...guest }, ctx);
    const confirm = req.cards?.[0];
    if (confirm?.type !== 'confirm') throw new Error('no confirm card');
    expect(confirm.note).toContain('holds this time');
    expect(fixed.holds.size).toBe(0); // nothing is held before Confirm
    expect(outbox.sent).toHaveLength(0);

    const res = await o.confirm(session, confirm.actionId);
    expect(res.status).toBe('confirmed');
    expect(res.reply.text).toContain('Your time is held: Thu, Nov 12, 10:00 AM');
    const [hold] = [...fixed.holds.values()];
    expect(hold).toMatchObject({ date: '2026-11-12', start: '10:00', end: '10:45', name: 'Chat hold: Deluxe Hydrafacial – Dana R.' });
    expect(hold!.comment).toContain('[h1-hold 2026-11-10T23:00:00.000Z]');
    expect(outbox.sent).toHaveLength(1);
    expect(outbox.sent[0]!.subject).toBe('Held: Thu, Nov 12 at 10:00 AM (website chat)');
    expect(outbox.sent[0]!.body).toContain("it's HELD on your Vagaro calendar");
    // The time is gone from the openings now.
    expect((await fixed.search('x', '2026-11-12'))[0]!.times).not.toContain('10:00');
  });

  it('only accepts a time the openings showed in this chat (D11)', async () => {
    const { ctx } = setup();
    await showOpenings({ service_id: 'deluxe-hydrafacial' }, ctx);
    const r = handleTool('request_appointment', { service_id: 'deluxe-hydrafacial', slot: { date: '2026-11-12', time: '07:00' }, ...guest }, ctx);
    expect(r.isError).toBe(true);
    expect(String(r.result.error)).toContain("isn't one of the openings shown");
  });

  it('tells the guest, and sends nothing, when the time was taken before Confirm', async () => {
    const { fixed, outbox, o, session, ctx } = setup();
    await showOpenings({ service_id: 'deluxe-hydrafacial' }, ctx);
    const req = handleTool('request_appointment', { service_id: 'deluxe-hydrafacial', slot: { date: '2026-11-12', time: '10:00' }, ...guest }, ctx);
    const card = req.cards?.[0];
    if (card?.type !== 'confirm') throw new Error('no confirm card');
    await fixed.createHold({ providerId: 'x', date: '2026-11-12', start: '10:00', end: '11:00', name: 'someone else', comment: '' });
    const res = await o.confirm(session, card.actionId);
    expect(res.status).toBe('expired');
    expect(res.reply.text).toContain('just taken');
    expect(outbox.sent).toHaveLength(0);
    expect(session.events.join(' ')).toContain('was just taken');
  });

  it('still sends the request when the calendar refuses the hold', async () => {
    const fixed = new FixedAvailability(() => '2026-11-12');
    const broken: HoldWriter = { createHold: async () => { throw new Error('VagaroError 500'); }, deleteHold: async () => {}, listHolds: async () => [] };
    const { outbox, o, session, ctx } = setup({ holdMode: 'on', writer: broken });
    ctx.availability = fixed;
    await showOpenings({ service_id: 'deluxe-hydrafacial' }, ctx);
    const card = handleTool('request_appointment', { service_id: 'deluxe-hydrafacial', slot: { date: '2026-11-12', time: '10:00' }, ...guest }, ctx).cards?.[0];
    if (card?.type !== 'confirm') throw new Error('no confirm card');
    const res = await o.confirm(session, card.actionId);
    expect(res.status).toBe('confirmed');
    expect(res.reply.text).toContain('Your request is in');
    expect(outbox.sent[0]!.subject).toBe('New appointment request from your website');
  });

  it('places nothing when the deployment has holds off', async () => {
    const { fixed, outbox, o, session, ctx } = setup({});
    const openings = await showOpenings({ service_id: 'deluxe-hydrafacial' }, ctx);
    expect(openings.cards?.[0]?.type === 'openings' && openings.cards[0].selectable).toBeFalsy();
    const card = handleTool('request_appointment', { service_id: 'deluxe-hydrafacial', slot: { date: '2026-11-12', time: '10:00' }, ...guest }, ctx).cards?.[0];
    if (card?.type !== 'confirm') throw new Error('no confirm card');
    await o.confirm(session, card.actionId);
    expect(fixed.holds.size).toBe(0);
    expect(outbox.sent[0]!.body).toContain('Preferred times: Thu, Nov 12 at 10:00 AM');
  });

  it('in preview: the whole flow, Confirm greyed out, no booking links, nothing held or sent', async () => {
    const { fixed, outbox, o, session, ctx } = setup({ holdMode: 'preview' });
    const openings = await showOpenings({ service_id: 'deluxe-hydrafacial' }, ctx);
    expect(openings.cards?.[0]?.type === 'openings' && openings.cards[0].selectable).toBe(true);
    const card = handleTool('request_appointment', { service_id: 'deluxe-hydrafacial', slot: { date: '2026-11-12', time: '10:00' }, ...guest }, ctx).cards?.[0];
    if (card?.type !== 'confirm') throw new Error('no confirm card');
    expect(card.preview).toBe(true);
    expect(card.note).toContain('Confirm is turned off');
    const res = await o.confirm(session, card.actionId); // greyed out, but if it arrives anyway
    expect(res.reply.text).toContain("isn't switched on yet");
    expect(fixed.holds.size).toBe(0);
    expect(outbox.sent).toHaveLength(0);
    // No booking-link tool for the model, and no link when openings can't be found.
    const model = scriptedModel([{ content: [{ text: 'Hi!' }] }]);
    const p = new Orchestrator({ catalog, model, outbox, phoneKey: 'test', availability: fixed, holdMode: 'preview', now: () => new Date(NOW) });
    await p.handleMessage(createSession({ lang: 'en', noticeVersion: 'v' }).session, { id: 'm1-xxxxxxxx', text: 'hi', lang: 'en' });
    const names = model.calls[0]!.toolConfig!.tools!.map((x) => x.toolSpec?.name);
    expect(names).toContain('show_openings');
    expect(names).not.toContain('get_booking_link');
    const down = await showOpenings({ service_id: 'deluxe-hydrafacial' }, { ...ctx, availability: { search: async () => { throw new Error('down'); } } });
    expect(down.cards ?? []).toHaveLength(0);
  });

  it('releases holds nobody made into an appointment, and tells the spa', async () => {
    const fixed = new FixedAvailability(() => '2026-11-12');
    const outbox = new MemoryOutbox();
    const jen = catalog.config.booking.availability!.provider_ids['jen-jeffers']!;
    const placed = (iso: string) => `Picked in the website chat by Dana Reyes, (775) 555-0142. [h1-hold ${iso}]`;
    await fixed.createHold({ providerId: jen, date: '2026-11-12', start: '10:00', end: '10:45', name: 'Chat hold: Deluxe Hydrafacial – Dana R.', comment: placed('2026-11-09T20:00:00.000Z') });
    await fixed.createHold({ providerId: jen, date: '2026-11-13', start: '10:00', end: '10:45', name: 'Chat hold: Dermaplane Facial – Sam L.', comment: placed('2026-11-10T22:00:00.000Z') });
    await fixed.createHold({ providerId: jen, date: '2026-11-14', start: '09:00', end: '10:00', name: "Jen's own block", comment: 'Lunch with Mom' });
    const n = await releaseHolds({ catalog, holds: fixed, outbox, mode: 'on', today: '2026-11-10', now: NOW });
    expect(n).toBe(1); // only the one placed more than 24 hours ago; Jen's own tasks are never touched
    expect([...fixed.holds.values()].map((h) => h.name)).toEqual(['Chat hold: Dermaplane Facial – Sam L.', "Jen's own block"]);
    expect(outbox.sent[0]!.subject).toBe('Released: Chat hold: Deluxe Hydrafacial – Dana R.');
    // A failed email doesn't stop the release, or the next one.
    const failing = { sent: [] as unknown[], send: async () => { throw Object.assign(new Error('denied'), { name: 'AccessDeniedException' }); } };
    await fixed.createHold({ providerId: jen, date: '2026-11-15', start: '10:00', end: '10:45', name: 'Chat hold: A – B C.', comment: placed('2026-11-08T20:00:00.000Z') });
    await fixed.createHold({ providerId: jen, date: '2026-11-16', start: '10:00', end: '10:45', name: 'Chat hold: D – E F.', comment: placed('2026-11-08T20:00:00.000Z') });
    expect(await releaseHolds({ catalog, holds: fixed, outbox: failing, mode: 'on', today: '2026-11-10', now: NOW })).toBe(2);
    // In test mode, holds go after 10 minutes.
    const t = await releaseHolds({ catalog, holds: fixed, outbox, mode: 'test', today: '2026-11-10', now: NOW });
    expect(t).toBe(1);
  });
});
