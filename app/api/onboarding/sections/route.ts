/*
 * Saving one section of answers: { section, data, version }, where `version`
 * is the one the page last loaded or saved (0 if never saved). A stale
 * version gets 409 and what's stored now, so one tab or device can't
 * silently overwrite another.
 */
import type { NextRequest } from 'next/server'
import { SECTIONS } from '@/onboarding/answers'
import { configured, intake, json, sameOrigin, sessionSpa } from '@/onboarding/server/intake'

export const dynamic = 'force-dynamic'

/** Far more than a full form needs; stops a runaway or hostile request. */
const MAX_BYTES = 256 * 1024

export async function PUT(req: NextRequest) {
  if (!configured) return json({ error: 'not-configured' }, 501)
  if (!sameOrigin(req)) return json({ error: 'bad-origin' }, 403)
  const spaId = await sessionSpa(req)
  if (!spaId) return json({ error: 'no-session' }, 401)
  const text = await req.text()
  if (text.length > MAX_BYTES) return json({ error: 'too-large' }, 413)
  let body: { section?: unknown; data?: unknown; version?: unknown }
  try { body = JSON.parse(text) } catch { return json({ error: 'bad-json' }, 400) }
  const { section, data, version } = body
  if (typeof section !== 'string' || !(SECTIONS as readonly string[]).includes(section)
    || !data || typeof data !== 'object' || Array.isArray(data)
    || typeof version !== 'number' || !Number.isInteger(version) || version < 0) {
    return json({ error: 'bad-request' }, 400)
  }
  const result = await (await intake()).withSpa(spaId, (s) => s.save(section, data, version))
  return result.ok ? json({ version: result.version }) : json({ error: 'conflict', current: result.current }, 409)
}
