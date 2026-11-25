// Local API with the same routes production serves under chat.<domain>/api/* (D7).
// The widget's Vite dev server proxies /api here, so the session cookie is same-origin.
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { createApp, MAX_BODY, type ApiResponse } from './app.ts';
import { createRuntime } from './runtime.ts';
import { sweep } from './session/sweep.ts';
import { log } from './log.ts';

// Not PORT: dev tooling sets PORT for the demo site, and the API must stay on its own port.
const PORT = Number(process.env.CONCIERGE_API_PORT ?? 8787);

const rt = await createRuntime();
const app = createApp(rt, {
  allowedOrigins: new Set((process.env.WIDGET_ORIGINS ?? 'http://localhost:5173').split(',')),
  secureCookie: process.env.COOKIE_SECURE === '1',
});

// Ends idle chats and writes their summaries, as the scheduled sweep does in AWS.
setInterval(() => {
  sweep(rt).catch((err: unknown) => log('sweep_failed', { error: (err as Error)?.name ?? 'Error' }));
}, 60_000).unref();

async function readBody(req: IncomingMessage): Promise<string | null> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    size += (chunk as Buffer).length;
    if (size > MAX_BODY) return null;
    chunks.push(chunk as Buffer);
  }
  return Buffer.concat(chunks).toString('utf8');
}

function send(res: ServerResponse, r: ApiResponse): void {
  res.writeHead(r.status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    ...(r.setCookie ? { 'Set-Cookie': r.setCookie } : {}),
  });
  res.end(JSON.stringify(r.body));
}

const server = createServer((req, res) => {
  (async () => {
    const body = req.method === 'POST' ? await readBody(req) : undefined;
    if (body === null) return send(res, { status: 413, body: { error: 'too_large', code: 'too_large' } });
    const headers = Object.fromEntries(Object.entries(req.headers).map(([k, v]) => [k, Array.isArray(v) ? v.join(', ') : v]));
    const path = new URL(req.url ?? '/', 'http://localhost').pathname;
    send(res, await app({ method: req.method ?? 'GET', path, headers, body }));
  })().catch((err: unknown) => {
    log('request_error', { route: (req.url ?? '').split('?')[0], error: (err as Error)?.name ?? 'Error' });
    send(res, { status: 500, body: { error: 'server_error', code: 'server_error' } });
  });
});

server.listen(PORT, () => {
  log('api_listening', { route: `http://localhost:${PORT}`, status: rt.bundle.config.client_id });
});
