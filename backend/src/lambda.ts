// Lambda entry points for the deployed stack (build plan 3.2):
//   api          API Gateway (REST, proxy integration) behind CloudFront at chat.<domain>/api/*
//   sweep        every 5 minutes: ends idle chats and writes their summaries (D32)
//   weeklyReport weekly: the "questions the concierge couldn't answer" email (D65)
import { createHash, timingSafeEqual } from 'node:crypto';
import { createApp, MAX_BODY, type ApiResponse } from './app.ts';
import { createRuntime, type Runtime } from './runtime.ts';
import { sweep as runSweep } from './session/sweep.ts';
import { weeklyReport as buildWeeklyReport } from './summary/insights.ts';
import { log } from './log.ts';
import { review as runReview, type ReviewRequest } from './review.ts';
import { DynamoSessionRepo } from './session/dynamo.ts';
import { CLIENTS_DIR, loadClient } from './config/load.ts';

// Debug output is for local development only; it never runs in a deployed function (D34).
delete process.env.CONCIERGE_DEBUG;

// The parts of an API Gateway REST proxy event and result this handler uses.
interface ProxyEvent {
  httpMethod: string;
  path: string;
  headers: Record<string, string | undefined> | null;
  body: string | null;
  isBase64Encoded: boolean;
}
interface ProxyResult {
  statusCode: number;
  headers: Record<string, string>;
  multiValueHeaders?: Record<string, string[]>;
  body: string;
}

const digest = (s: string) => createHash('sha256').update(s).digest();
const sameSecret = (a: string, b: string) => timingSafeEqual(digest(a), digest(b));

let runtime: Promise<Runtime> | undefined;
const getRuntime = () => (runtime ??= createRuntime());

let app: ReturnType<typeof createApp> | undefined;

function result(r: ApiResponse): ProxyResult {
  return {
    statusCode: r.status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' },
    ...(r.setCookie ? { multiValueHeaders: { 'Set-Cookie': [r.setCookie] } } : {}),
    body: JSON.stringify(r.body),
  };
}

export async function api(event: ProxyEvent): Promise<ProxyResult> {
  const rt = await getRuntime();
  app ??= createApp(rt, {
    allowedOrigins: new Set((process.env.WIDGET_ORIGINS ?? '').split(',').filter(Boolean)),
    secureCookie: true,
    crossSiteCookie: process.env.CROSS_SITE_COOKIE === '1',
    trustViewerHost: true,
  });
  const body = event.body ? (event.isBase64Encoded ? Buffer.from(event.body, 'base64').toString('utf8') : event.body) : undefined;
  if (body && Buffer.byteLength(body) > MAX_BODY) return result({ status: 413, body: { error: 'too_large', code: 'too_large' } });
  const headers = Object.fromEntries(Object.entries(event.headers ?? {}).map(([k, v]) => [k.toLowerCase(), v]));
  // Only requests that came through CloudFront (and its firewall) carry the shared header.
  if (rt.originVerify && !sameSecret(headers['x-origin-verify'] ?? '', rt.originVerify)) return result({ status: 403, body: { error: 'forbidden', code: 'forbidden' } });
  delete headers['x-origin-verify'];
  return result(await app({ method: event.httpMethod, path: event.path, headers, body }));
}

export async function sweep(): Promise<{ summarized: number }> {
  return { summarized: await runSweep(await getRuntime()) };
}

export async function weeklyReport(): Promise<{ sent: boolean; conversations: number }> {
  const rt = await getRuntime();
  const report = await buildWeeklyReport(rt.catalog, rt.summaries);
  if (!report) return { sent: false, conversations: 0 };
  await rt.outbox.send(report.email);
  await rt.summaries.markReported(report.covered);
  log('weekly_report_sent', { count: report.covered.length });
  return { sent: true, conversations: report.covered.length };
}

// Review function (D39, D69): invoked directly by the review role, never through the API. It only
// reads the chats table, so it builds just the session store, without secrets or the model.
let reviewSessions: DynamoSessionRepo | undefined;
export async function review(event: ReviewRequest) {
  if (!reviewSessions) {
    const { retention } = loadClient(process.env.CLIENT_ID ?? '', process.env.CONCIERGE_CLIENTS_DIR ?? CLIENTS_DIR).config;
    reviewSessions = new DynamoSessionRepo(process.env.CONCIERGE_SESSIONS_TABLE!, {
      transcriptDays: retention.transcripts_days,
      flaggedDays: retention.flagged_transcripts_days,
    });
  }
  return runReview(reviewSessions, event);
}
