import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { createApp, type ApiRequest } from '../src/app.ts';
import type { Runtime } from '../src/runtime.ts';
import { Orchestrator } from '../src/orchestrator.ts';
import { MemoryOutbox } from '../src/handoff/email.ts';
import { FileControl } from '../src/control.ts';
import { createSession, MemorySessionRepo } from '../src/session/store.ts';
import { decodeSession, encodeSession } from '../src/session/dynamo.ts';
import { sweep } from '../src/session/sweep.ts';
import { FileSummaryRepo } from '../src/summary/store.ts';
import { catalog, scriptedModel, text } from './helpers.ts';

const ORIGIN = 'https://chat.glowmedspa.example';

function setup(reply = 'Happy to help with that.') {
  const model = scriptedModel([{ content: [text(reply)] }]);
  const sessions = new MemorySessionRepo();
  const summaries = new FileSummaryRepo();
  const control = new FileControl('glow-med-spa', mkdtempSync(join(tmpdir(), 'concierge-')));
  const outbox = new MemoryOutbox();
  const orchestrator = new Orchestrator({ catalog, model, outbox, phoneKey: 'test' });
  const rt: Runtime = {
    today: () => '2026-10-23',
    bundle: catalog.bundle,
    catalog,
    model,
    outbox,
    orchestrator,
    sessions,
    summaries,
    control,
    staffCode: 'team-code',
    currentMonth: () => '2026-10',
    onAws: false,
  };
  const app = createApp(rt, { allowedOrigins: new Set([ORIGIN]), secureCookie: true });
  let cookie = '';
  const call = async (method: string, path: string, body?: unknown, extra: Record<string, string> = {}) => {
    const req: ApiRequest = {
      method,
      path,
      headers: { origin: ORIGIN, cookie, 'content-type': 'application/json', ...extra },
      body: body === undefined ? undefined : JSON.stringify(body),
    };
    const res = await app(req);
    if (res.setCookie) cookie = res.setCookie.split(';')[0]!;
    return res;
  };
  const notice = orchestrator.publicConfig().notice.version;
  const start = () => call('POST', '/api/session', { lang: 'en', noticeVersion: notice });
  const token = () => decodeURIComponent(cookie.split('=')[1] ?? '');
  return { rt, call, start, sessions, summaries, control, model, token };
}

describe('API routes', () => {
  it('starts a chat with a secure session cookie and answers a message', async () => {
    const { call, start } = setup();
    const started = await start();
    expect(started.status).toBe(200);
    expect(started.setCookie).toMatch(/^__Host-concierge_session=.+; Path=\/; HttpOnly; SameSite=Lax; Secure$/);
    const res = await call('POST', '/api/message', { id: 'msg-00000001', text: 'Hi there', lang: 'en' });
    expect(res.status).toBe(200);
    expect((res.body as { reply: { text: string } }).reply.text).toBe('Happy to help with that.');
    const state = (await call('GET', '/api/session')).body as { active: boolean; history: unknown[] };
    expect(state.active).toBe(true);
    expect(state.history.length).toBe(3); // greeting, guest message, reply
  });

  it('rejects other origins, oversized bodies, and messages without a session', async () => {
    const { call } = setup();
    expect((await call('POST', '/api/end', {}, { origin: 'https://evil.example' })).status).toBe(403);
    expect((await call('POST', '/api/message', { id: 'msg-00000001', text: 'x'.repeat(9000), lang: 'en' })).status).toBe(413);
    expect((await call('POST', '/api/message', { id: 'msg-00000001', text: 'Hi', lang: 'en' })).status).toBe(401);
  });

  it('answers "still working" instead of running two turns at once', async () => {
    const { call, start, sessions, token } = setup();
    await start();
    // Hold the lock the way a slow first message would.
    const open = (await sessions.get(token()))!;
    expect(await sessions.lock(open)).toBe(true);
    const res = await call('POST', '/api/message', { id: 'msg-00000002', text: 'Hello?', lang: 'en' });
    expect((res.body as { reply: { text: string } }).reply.text).toMatch(/still answering/);
  });
});

describe('thumbs up and down (9.5)', () => {
  it('records a rating on a reply, and a thumbs-down flags the chat for review', async () => {
    const { rt, call, start, summaries } = setup();
    await start();
    const res = await call('POST', '/api/message', { id: 'msg-00000010', text: 'Is Botox painful?', lang: 'en' });
    const replyId = (res.body as { reply: { replyId?: string } }).reply.replyId!;
    expect(replyId).toMatch(/^[a-f0-9]{16}$/);
    expect((await call('POST', '/api/feedback', { replyId, rating: 'up' })).status).toBe(200);
    expect((await call('POST', '/api/feedback', { replyId, rating: 'down', reason: 'wrong_info' })).status).toBe(200);
    expect((await call('POST', '/api/feedback', { replyId: 'abcdef0123456789', rating: 'up' })).status).toBe(404);
    expect((await call('POST', '/api/feedback', { replyId, rating: 'down', reason: 'free text' })).status).toBe(400);
    const history = (await call('GET', '/api/session')).body as { history: { replyId?: string; feedback?: unknown }[] };
    expect(history.history.find((m) => m.replyId === replyId)?.feedback).toEqual({ rating: 'down', reason: 'wrong_info' });

    await call('POST', '/api/end', {});
    const grade = scriptedModel([{ content: [text('{"language":"en","topics":["service_info"],"scores":{"answered":4,"tone":5,"safety":5,"overall":4}}')] }]);
    await sweep({ ...rt, model: grade });
    const [saved] = await summaries.unreported();
    expect(saved!.summary).toMatchObject({ feedback_up: 0, feedback_down: 1, feedback_reasons: ['wrong_info'], review_flags: ['thumbs_down'] });
  });
});

describe('kill switch (D43)', () => {
  it('shows the chat as unavailable, refuses new work, and still lets a visitor end their chat', async () => {
    const { call, start, control } = setup();
    await start();
    await control.setPaused(true);
    expect((await call('GET', '/api/config')).body).toMatchObject({ available: false, phone: catalog.config.business.phone });
    expect((await call('POST', '/api/message', { id: 'msg-00000003', text: 'Hi', lang: 'en' })).status).toBe(503);
    expect((await start()).status).toBe(503);
    expect((await call('POST', '/api/end', {})).status).toBe(200);
    await control.setPaused(false);
    expect((await call('GET', '/api/config')).body).toMatchObject({ available: true });
    expect((await start()).status).toBe(200);
  });
});

describe('session lifecycle', () => {
  it('summarizes an ended chat once, and keeps it for review when flagged', async () => {
    const { rt, call, start, sessions, summaries } = setup();
    await start();
    await call('POST', '/api/message', { id: 'msg-00000004', text: 'Do you take Klarna?', lang: 'en' });
    await call('POST', '/api/end', {});
    expect((await sessions.ended(10)).length).toBe(1);
    const scripted = scriptedModel([
      { content: [text('{"language":"en","topics":["financing"],"unanswered_questions":["Do you accept Klarna?"],"scores":{"answered":3,"next_step":null,"objections":null,"tone":5,"safety":5,"overall":4}}')] },
    ]);
    expect(await sweep({ ...rt, model: scripted })).toBe(1);
    expect(await sweep({ ...rt, model: scripted })).toBe(0);
    const saved = await summaries.unreported();
    expect(saved.map((x) => x.summary.unanswered_questions)).toEqual([['Do you accept Klarna?']]);
    expect(saved[0]!.summary.scores).toMatchObject({ answered: 3, next_step: null, overall: 4 });
    expect(saved[0]!.summary.review_flags).toEqual(['unanswered']);
    expect((await sessions.listFlagged(10)).map((f) => f.flags)).toEqual([['unanswered']]);
  });

  it('forgets an unflagged chat once it is summarized', async () => {
    const { rt, start, call, sessions } = setup();
    await start();
    await call('POST', '/api/message', { id: 'msg-00000005', text: 'What are your hours?', lang: 'en' });
    await call('POST', '/api/end', {});
    const clean = scriptedModel([{ content: [text('{"language":"en","topics":["location_hours"],"scores":{"answered":5,"tone":5,"safety":5,"overall":5}}')] }]);
    expect(await sweep({ ...rt, model: clean })).toBe(1);
    expect(sessions.size).toBe(0);
  });

  it('round-trips a session through the stored format', () => {
    const { session } = createSession({ lang: 'es', noticeVersion: 'v1' });
    session.phoneHashes.add('abc');
    session.outcomes.add('request');
    session.pendingActions.set('a1', { id: 'a1', kind: 'callback', payload: { firstName: 'Jane', phone: '+15035550142', category: 'other' }, createdAt: 1, status: 'pending' });
    session.modelMessages.push({ role: 'user', content: [{ text: 'hola' }] });
    const back = decodeSession(encodeSession(session));
    expect(back.phoneHashes.has('abc')).toBe(true);
    expect(back.outcomes.has('request')).toBe(true);
    expect(back.pendingActions.get('a1')?.kind).toBe('callback');
    expect(back.modelMessages[0]?.content?.[0]?.text).toBe('hola');
    expect(back.lang).toBe('es');
  });
});
