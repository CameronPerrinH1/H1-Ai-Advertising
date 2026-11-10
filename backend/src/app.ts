// The API routes production serves under chat.<domain>/api/* (D7), independent of how requests
// arrive: server.ts adapts Node's HTTP server for local development, lambda.ts adapts API Gateway.
import { createHash, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import type { Runtime } from './runtime.ts';
import type { Session } from './session/store.ts';
import { log } from './log.ts';

export const MAX_BODY = 8 * 1024;

export interface ApiRequest {
  method: string;
  path: string;
  headers: Record<string, string | undefined>; // lowercase names
  body?: string;
}

export interface ApiResponse {
  status: number;
  body: unknown;
  setCookie?: string;
}

export interface AppOptions {
  allowedOrigins: Set<string>;
  secureCookie: boolean; // production: a __Host- cookie, which requires HTTPS
  // Staging only: the chat runs on a CloudFront address, a different site from the spa's page, so
  // its frame's cookie is third-party. A partitioned SameSite=None cookie still works there, keyed
  // to the embedding site. Production lives on chat.<spa domain>, the same site, and keeps Lax (D7).
  crossSiteCookie?: boolean;
  // Deployed: CloudFront sets x-viewer-host to the address the visitor used, so the chat's own
  // origin is allowed without listing it (the stack can't know its CloudFront domain in advance).
  trustViewerHost?: boolean;
}

class HttpError extends Error {
  constructor(readonly status: number, readonly code: string) {
    super(code);
  }
}

const startSchema = z.object({
  lang: z.enum(['en', 'es']),
  noticeVersion: z.string().max(40),
  page: z.string().max(200).optional(),
  mode: z.enum(['inline', 'fullscreen', 'launcher', 'askbar']).optional(),
});
const staffSchema = z.object({ code: z.string().min(1).max(100), lang: z.enum(['en', 'es']) });
const messageSchema = z.object({
  id: z.string().min(8).max(64),
  text: z.string().min(1).max(4000),
  lang: z.enum(['en', 'es']),
  page: z.string().max(200).optional(),
});
const confirmSchema = z.object({ actionId: z.string().uuid() });
const feedbackSchema = z.object({
  replyId: z.string().regex(/^[a-f0-9]{16}$/),
  rating: z.enum(['up', 'down']),
  reason: z.enum(['wrong_info', 'didnt_understand', 'other']).optional(),
});

const digest = (s: string) => createHash('sha256').update(s).digest();
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function createApp(rt: Runtime, opts: AppOptions) {
  const cookieName = opts.secureCookie ? '__Host-concierge_session' : 'concierge_session';
  const staffEnabled = !!(rt.bundle.config.staff_mode?.enabled && rt.staffCode);
  const { orchestrator, sessions, control } = rt;

  const readCookie = (req: ApiRequest): string | undefined => {
    for (const part of (req.headers.cookie ?? '').split(';')) {
      const [k, ...v] = part.trim().split('=');
      if (k === cookieName) return decodeURIComponent(v.join('='));
    }
    return undefined;
  };

  const cookie = (token: string, clear = false): string => {
    const cross = opts.crossSiteCookie && opts.secureCookie;
    const attrs = [`${cookieName}=${clear ? '' : encodeURIComponent(token)}`, 'Path=/', 'HttpOnly', cross ? 'SameSite=None' : 'SameSite=Lax'];
    if (opts.secureCookie) attrs.push('Secure');
    if (cross) attrs.push('Partitioned');
    if (clear) attrs.push('Max-Age=0');
    return attrs.join('; ');
  };

  const json = <T>(schema: z.ZodType<T>, req: ApiRequest): T => {
    if (!(req.headers['content-type'] ?? '').startsWith('application/json')) throw new HttpError(415, 'json_required');
    if (Buffer.byteLength(req.body ?? '') > MAX_BODY) throw new HttpError(413, 'too_large');
    let parsed: unknown;
    try {
      parsed = JSON.parse(req.body ?? '');
    } catch {
      throw new HttpError(400, 'bad_json');
    }
    const r = schema.safeParse(parsed);
    if (!r.success) throw new HttpError(400, 'invalid_request');
    return r.data;
  };

  const staffCodeOk = (code: string) => !!rt.staffCode && timingSafeEqual(digest(code), digest(rt.staffCode));

  // Runs fn with the visitor's session locked, so two requests can't both change it, and saves after.
  // The session is reloaded after locking, so fn starts from the latest saved state.
  const withSession = async (
    req: ApiRequest,
    retries: number,
    fn: (session: Session) => Promise<ApiResponse>,
    onBusy: (session: Session) => ApiResponse,
  ): Promise<ApiResponse> => {
    const token = readCookie(req);
    const first = await sessions.get(token);
    if (!first) throw new HttpError(401, 'no_session');
    let locked = await sessions.lock(first);
    for (let i = 0; i < retries && !locked; i++) {
      await sleep(400);
      locked = await sessions.lock(first);
    }
    if (!locked) return onBusy(first);
    const session = (await sessions.get(token)) ?? first;
    try {
      return await fn(session);
    } finally {
      await sessions.save(session);
    }
  };

  async function route(req: ApiRequest): Promise<ApiResponse> {
    const { method, path } = req;

    // Cross-site request protection for state-changing calls.
    if (method === 'POST') {
      const origin = req.headers.origin;
      const viewerHost = opts.trustViewerHost ? req.headers['x-viewer-host'] : undefined;
      const sameHost = !!viewerHost && origin === `https://${viewerHost}`;
      if (origin && !opts.allowedOrigins.has(origin) && !sameHost) throw new HttpError(403, 'origin_not_allowed');
    }

    if (method === 'GET' && path === '/api/health') return { status: 200, body: { ok: true } };
    if (method === 'GET' && path === '/api/config') return { status: 200, body: orchestrator.publicConfig(!(await control.paused())) };
    if (method === 'GET' && path === '/api/session') return { status: 200, body: orchestrator.state(await sessions.get(readCookie(req))) };

    if (method === 'POST' && path === '/api/end') {
      // "End chat" ends the session right away and clears the cookie (D30). It works even while paused.
      await sessions.end(readCookie(req));
      return { status: 200, body: { ok: true }, setCookie: cookie('', true) };
    }

    // Kill switch (D43): while paused, nothing new starts and no message reaches the model.
    if (method === 'POST' && (await control.paused())) throw new HttpError(503, 'unavailable');

    if (method === 'POST' && path === '/api/session') {
      // Clicking "Start chat" after the notice is the visitor's consent (D35).
      const body = json(startSchema, req);
      if (body.noticeVersion !== orchestrator.publicConfig().notice.version) throw new HttpError(409, 'notice_outdated');
      await sessions.end(readCookie(req));
      const { token, session } = await sessions.create({ lang: body.lang, noticeVersion: body.noticeVersion, page: body.page, displayMode: body.mode });
      log('session_start', { session: session.hash.slice(0, 8), status: body.lang });
      const greeting = orchestrator.greet(session);
      await sessions.save(session);
      return { status: 200, body: { active: true, lang: session.lang, greeting }, setCookie: cookie(token) };
    }

    if (method === 'POST' && path === '/api/staff/session') {
      if (!staffEnabled) throw new HttpError(404, 'not_found');
      const body = json(staffSchema, req);
      if (!staffCodeOk(body.code)) {
        await sleep(800); // slow down guessing
        log('staff_login', { status: 'denied' });
        throw new HttpError(403, 'wrong_code');
      }
      await sessions.end(readCookie(req));
      const { token, session } = await sessions.create({ lang: body.lang, noticeVersion: 'staff', audience: 'staff' });
      log('staff_login', { session: session.hash.slice(0, 8), status: 'ok' });
      const greeting = orchestrator.greetStaff(session);
      await sessions.save(session);
      return { status: 200, body: { active: true, lang: session.lang, greeting }, setCookie: cookie(token) };
    }

    if (method === 'POST' && path === '/api/message') {
      const body = json(messageSchema, req);
      return withSession(req, 0, async (session) => ({ status: 200, body: await orchestrator.handleMessage(session, body) }), (s) => ({
        status: 200,
        body: orchestrator.busyReply(s.lang),
      }));
    }

    if (method === 'POST' && path === '/api/confirm') {
      const body = json(confirmSchema, req);
      // A tap on Confirm can land while the last reply is still saving, so it waits briefly for the lock.
      return withSession(req, 6, async (session) => ({ status: 200, body: await orchestrator.confirm(session, body.actionId) }), () => {
        throw new HttpError(409, 'busy');
      });
    }

    if (method === 'POST' && path === '/api/feedback') {
      const body = json(feedbackSchema, req);
      return withSession(req, 3, async (session) => {
        if (!orchestrator.rate(session, body)) throw new HttpError(404, 'not_found');
        return { status: 200, body: { ok: true } };
      }, () => {
        throw new HttpError(409, 'busy');
      });
    }

    throw new HttpError(404, 'not_found');
  }

  return async function handle(req: ApiRequest): Promise<ApiResponse> {
    try {
      return await route(req);
    } catch (err) {
      if (err instanceof HttpError) return { status: err.status, body: { error: err.code, code: err.code } };
      log('request_error', { route: req.path, error: (err as Error)?.name ?? 'Error' });
      return { status: 500, body: { error: 'server_error', code: 'server_error' } };
    }
  };
}
