import { describe, expect, it } from 'vitest';
import type { Message } from '@aws-sdk/client-bedrock-runtime';
import type { Card } from '@concierge/shared';
import { dropButtonChips, normalizeHistory, Orchestrator } from '../src/orchestrator.ts';
import { MemoryOutbox } from '../src/handoff/email.ts';
import type { ModelClient } from '../src/model/bedrock.ts';
import { urgentKinds } from '../src/summary/summarizer.ts';
import { catalog, newSession, scriptedModel, text, toolUse } from './helpers.ts';

const NOW = () => new Date('2026-10-23T22:00:00Z');

function orchestrator(model: ModelClient, outbox = new MemoryOutbox()) {
  return new Orchestrator({ catalog, model, outbox, phoneKey: 'test', now: NOW });
}

describe('conversation loop', () => {
  it('removes card numbers before the model sees the message (D33)', async () => {
    const model = scriptedModel([{ content: [text("Please don't share card details here.")] }]);
    await orchestrator(model).handleMessage(newSession(), { id: 'm1-xxxxxxxx', text: 'card 4111 1111 1111 1111', lang: 'en' });
    const sent = JSON.stringify(model.calls[0]!.messages);
    expect(sent).not.toContain('4111');
    expect(sent).toContain('[card number removed]');
  });

  it('regenerates a reply with an invented price, then falls back (D13)', async () => {
    const model = scriptedModel([{ content: [text('HydraFacial is $175.')] }, { content: [text('Still $175.')] }]);
    const session = newSession();
    const { reply } = await orchestrator(model).handleMessage(session, { id: 'm1-xxxxxxxx', text: 'price?', lang: 'en' });
    expect(model.calls).toHaveLength(2);
    expect(JSON.stringify(model.calls[1]!.messages)).toContain('concierge_check');
    expect(reply.text).not.toContain('$175');
    expect(reply.cards.some((c) => c.type === 'booking_link')).toBe(true);
    expect(session.counts.fallbacks).toBe(1);
    // The feedback note never stays in stored history.
    expect(JSON.stringify(session.modelMessages)).not.toContain('concierge_check');
  });

  it('uses the corrected reply when the retry passes', async () => {
    const model = scriptedModel([{ content: [text('HydraFacial is $175.')] }, { content: [text('A HydraFacial is $199.')] }]);
    const { reply } = await orchestrator(model).handleMessage(newSession(), { id: 'm1-xxxxxxxx', text: 'price?', lang: 'en' });
    expect(reply.text).toBe('A HydraFacial is $199.');
  });

  it('adds the urgent card from the safety net when the model misses it (D14)', async () => {
    const model = scriptedModel([{ content: [text("I'm sorry you're going through this.")] }]);
    const { reply } = await orchestrator(model).handleMessage(newSession(), { id: 'm1-xxxxxxxx', text: "I don't want to live anymore", lang: 'en' });
    const urgent = reply.cards.find((c) => c.type === 'urgent');
    expect(urgent?.type === 'urgent' && urgent.kind).toBe('crisis');
  });

  it('records a crisis referral apart from other urgent help (HB26-1263)', async () => {
    const model = scriptedModel([{ content: [text("I'm sorry you're going through this.")] }]);
    const session = newSession();
    await orchestrator(model).handleMessage(session, { id: 'm1-xxxxxxxx', text: "I don't want to live anymore", lang: 'en' });
    expect(session.outcomes.has('urgent_redirect')).toBe(true);
    expect(urgentKinds(session)).toEqual(['crisis']);
  });

  it('records a crisis referral even when the model call fails', async () => {
    const model = { async converse() { throw Object.assign(new Error('down'), { name: 'ServiceUnavailable' }); } };
    const session = newSession();
    const { reply } = await orchestrator(model).handleMessage(session, { id: 'm1-xxxxxxxx', text: "I don't want to live anymore", lang: 'en' });
    expect(reply.cards.some((c) => c.type === 'urgent' && c.kind === 'crisis')).toBe(true);
    expect(urgentKinds(session)).toEqual(['crisis']);
  });

  it('handles an empty final message after a tool call and keeps the next turn valid', async () => {
    const model = scriptedModel([
      { content: [text('What would you like to improve?'), toolUse('suggest_replies', { replies: ['Glow', 'Lines'] })], stop: 'tool_use' },
      { content: [] }, // the model already said everything
      { content: [text('Is there an event coming up?')] },
    ]);
    const o = orchestrator(model);
    const session = newSession();
    const first = await o.handleMessage(session, { id: 'm1-xxxxxxxx', text: 'help me choose', lang: 'en' });
    expect(first.reply.quickReplies).toEqual(['Glow', 'Lines']);
    expect(session.modelMessages.at(-1)?.role).toBe('user'); // ends on the tool result
    await o.handleMessage(session, { id: 'm2-xxxxxxxx', text: 'Glow', lang: 'en' });
    const roles = model.calls[2]!.messages!.map((m) => m.role);
    for (let i = 1; i < roles.length; i++) expect(roles[i]).not.toBe(roles[i - 1]);
  });

  it('ends the turn once the reply is written and the tools only show things (no restating)', async () => {
    const model = scriptedModel([
      { content: [text('A consultation is the best first step, so our team can look closely and recommend what fits. Would you like one?'), toolUse('suggest_replies', { replies: ['Book it', 'Call me'] })], stop: 'tool_use' },
      { content: [text('Our team can take a close look and tell you what might help, so a consultation is best.')] },
      { content: [text('Tap below to book.')] },
    ]);
    const o = orchestrator(model);
    const session = newSession();
    const { reply } = await o.handleMessage(session, { id: 'm1-xxxxxxxx', text: 'thinning hair', lang: 'en' });
    expect(model.calls).toHaveLength(1);
    expect(reply.text).toBe('A consultation is the best first step, so our team can look closely and recommend what fits. Would you like one?');
    expect(reply.quickReplies).toEqual(['Book it', 'Call me']);
    expect(session.modelMessages.at(-1)?.role).toBe('user'); // ends on the tool result
    await o.handleMessage(session, { id: 'm2-xxxxxxxx', text: 'Book it', lang: 'en' });
    const roles = model.calls[1]!.messages!.map((m) => m.role);
    for (let i = 1; i < roles.length; i++) expect(roles[i]).not.toBe(roles[i - 1]);
  });

  it('turns a "Book…" chip into the booking card when the treatment is clear', async () => {
    const model = scriptedModel([
      {
        content: [
          text('The HydraFacial deep-cleans and hydrates in one visit. Want to add anything?'),
          toolUse('show_service_card', { service_id: 'hydrafacial' }),
          toolUse('suggest_replies', { replies: ['Book a HydraFacial', 'What does it cost?'] }),
        ],
        stop: 'tool_use',
      },
      { content: [] },
    ]);
    const session = newSession();
    const { reply } = await orchestrator(model).handleMessage(session, { id: 'm1-xxxxxxxx', text: 'Tell me about HydraFacials', lang: 'en' });
    const link = reply.cards.find((c) => c.type === 'booking_link');
    expect(link?.type === 'booking_link' && link.serviceName).toBe('HydraFacial Signature');
    expect(reply.quickReplies).toEqual(['What does it cost?']);
    expect(session.events.join(' ')).toContain('booking button');
  });

  it("lets a reply read back the guest's own phone number, but no other", async () => {
    const model = scriptedModel([{ content: [text('Thanks! Is 503-555-0142 the best number to reach you?')] }]);
    const session = newSession();
    const { reply } = await orchestrator(model).handleMessage(session, { id: 'm1-xxxxxxxx', text: 'You can reach me at (503) 555-0142', lang: 'en' });
    expect(reply.text).toContain('503-555-0142');
    expect(session.counts.fallbacks).toBe(0);
    const other = scriptedModel([{ content: [text('Call 503-555-0199 instead.')] }, { content: [text('Call 503-555-0199 instead.')] }]);
    const s2 = newSession();
    await orchestrator(other).handleMessage(s2, { id: 'm1-xxxxxxxx', text: 'My number is 503-555-0142', lang: 'en' });
    expect(s2.counts.fallbacks).toBe(1);
  });

  it("lets a reply repeat an amount the guest named, but not invent one", async () => {
    const model = scriptedModel([{ content: [text('Within your $150 budget, the HydraFacial Signature at $199 is a little over. Would you like a lighter option?')] }]);
    const s = newSession();
    await orchestrator(model).handleMessage(s, { id: 'm1-xxxxxxxx', text: 'My budget is about $150', lang: 'en' });
    expect(s.counts.fallbacks).toBe(0);
    expect(model.calls).toHaveLength(1);
    const made = scriptedModel([{ content: [text('It is only $137 this week.')] }, { content: [text('It is only $137 this week.')] }]);
    const s2 = newSession();
    await orchestrator(made).handleMessage(s2, { id: 'm1-xxxxxxxx', text: 'My budget is about $150', lang: 'en' });
    expect(s2.counts.fallbacks).toBe(1);
  });

  it('leaves a booking chip alone when the treatment is unclear', async () => {
    const model = scriptedModel([
      { content: [text('Happy to help you choose. What would you like to improve most?'), toolUse('suggest_replies', { replies: ['Glow', 'Book a visit'] })], stop: 'tool_use' },
      { content: [] },
    ]);
    const { reply } = await orchestrator(model).handleMessage(newSession(), { id: 'm1-xxxxxxxx', text: 'hi', lang: 'en' });
    expect(reply.cards.some((c) => c.type === 'booking_link')).toBe(false);
    expect(reply.quickReplies).toEqual(['Glow', 'Book a visit']);
  });

  it('blocks "tap Confirm" when no confirmation card exists, and accepts null optional fields', async () => {
    const model = scriptedModel([
      // A rejected request (bad phone) followed by a reply that pretends the card is there.
      { content: [toolUse('request_callback', { first_name: 'Jane', phone: '12', category: 'other' })], stop: 'tool_use' },
      { content: [text('Please review the card and tap Confirm to send it.')] },
      // The retry fixes it; a null optional field is treated as not given.
      { content: [toolUse('request_callback', { first_name: 'Jane', phone: '503-555-0142', category: 'other', preferred_time: null }, 'tu_2')], stop: 'tool_use' },
      { content: [text('Please review the card and tap Confirm to send it.')] },
    ]);
    const session = newSession();
    const { reply } = await orchestrator(model).handleMessage(session, { id: 'm1-xxxxxxxx', text: 'call me', lang: 'en' });
    expect(JSON.stringify(model.calls[2]!.messages)).toContain('no confirmation card is shown');
    expect(reply.cards.some((c) => c.type === 'confirm' && c.status === 'pending')).toBe(true);
    expect(session.counts.fallbacks).toBe(0);
  });

  it('never runs tool calls from a reply cut off by the token limit', async () => {
    const model = scriptedModel([
      { content: [text('Here is your request, tap Confirm'), toolUse('request_appointment', { service_id: 'hydrafacial' })], stop: 'max_tokens' },
    ]);
    const session = newSession();
    const { reply } = await orchestrator(model).handleMessage(session, { id: 'm1-xxxxxxxx', text: 'book', lang: 'en' });
    expect(session.pendingActions.size).toBe(0);
    expect(reply.cards.some((c) => c.type === 'booking_link')).toBe(true); // safe fallback
    expect(JSON.stringify(session.modelMessages)).not.toContain('toolUse');
  });

  it('confirms a request, writes the email, and expires stale actions', async () => {
    const model = scriptedModel([
      {
        content: [
          text("Here's your request."),
          toolUse('request_appointment', { service_id: 'hydrafacial', preferred_times: 'Sat am', first_name: 'Jane', last_name: 'Smith', phone: '503-555-0142' }),
        ],
        stop: 'tool_use',
      },
      { content: [text('Please tap Confirm.')] },
    ]);
    const outbox = new MemoryOutbox();
    const o = orchestrator(model, outbox);
    const session = newSession();
    const { reply } = await o.handleMessage(session, { id: 'm1-xxxxxxxx', text: 'please arrange a facial for me', lang: 'en' });
    const card = reply.cards.find((c) => c.type === 'confirm');
    if (card?.type !== 'confirm') throw new Error('no confirm card');
    expect(outbox.sent).toHaveLength(0); // nothing sent before the click (D52)
    const res = await o.confirm(session, card.actionId);
    expect(res.status).toBe('confirmed');
    expect(outbox.sent[0]!.subject).toBe('New appointment request from your website');
    expect(outbox.sent[0]!.body).not.toContain('arrange a facial'); // no conversation text (D36)
    expect((await o.confirm(session, card.actionId)).status).toBe('expired'); // can't confirm twice
    expect(session.events.length).toBe(1);
  });
});

describe('normalizeHistory', () => {
  it('drops thinking blocks and keeps roles alternating', () => {
    const history: Message[] = [
      { role: 'user', content: [{ text: 'hi' }] },
      { role: 'assistant', content: [{ reasoningContent: { reasoningText: { text: 'hmm', signature: 'x' } } }, { text: 'Hello' }] },
      { role: 'user', content: [{ text: 'more' }] },
      { role: 'assistant', content: [{ reasoningContent: { reasoningText: { text: 'only thinking', signature: 'y' } } }] },
      { role: 'user', content: [{ text: 'again' }] },
    ];
    const out = normalizeHistory(history);
    expect(JSON.stringify(out)).not.toContain('reasoningContent');
    expect(out.map((m) => m.role)).toEqual(['user', 'assistant', 'user']);
  });
});

describe('suggested replies', () => {
  it("drops chips that repeat a card's own buttons in the same reply", () => {
    const estimate: Card = { type: 'estimate', estimate: { lines: [], total: 0, totalIsFrom: false, perUnit: [] } };
    expect(dropButtonChips(['Save this estimate', 'Tell me about Botox'], [estimate])).toEqual(['Tell me about Botox']);
    expect(dropButtonChips(['Save this estimate'], [])).toEqual(['Save this estimate']);
  });
});
