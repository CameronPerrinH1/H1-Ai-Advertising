// Structured logger with an allowlist of fields. Conversation text never reaches a log (D34).

const ALLOWED = new Set([
  'session', // first 8 chars of the session hash
  'route',
  'status',
  'code',
  'tool',
  'check',
  'kind',
  'rounds',
  'ms',
  'tokensIn',
  'tokensOut',
  'cacheRead',
  'cacheWrite',
  'count',
  'model',
  'error', // error class name only
]);

type Value = string | number | boolean | undefined;

export function log(event: string, fields: Record<string, Value> = {}): void {
  if (process.env.CONCIERGE_SILENT === '1') return;
  const safe: Record<string, Value> = {};
  for (const [k, v] of Object.entries(fields)) {
    if (!ALLOWED.has(k) || v === undefined) continue;
    safe[k] = typeof v === 'string' ? v.slice(0, 80) : v;
  }
  process.stdout.write(`${JSON.stringify({ t: new Date().toISOString(), event, ...safe })}\n`);
}
