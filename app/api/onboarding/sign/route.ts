/*
 * Sign-off: { name, title, attest: true }. The person filling in the form
 * approves the answers as saved now (D74): the server hashes them, and any
 * later change means the sign-off no longer covers them. The page saves first.
 * H1 gets an email once the sign-off is recorded.
 */
import { after, type NextRequest } from 'next/server'
import { configured, contentHash, intake, json, sameOrigin, sessionSpa } from '@/onboarding/server/intake'
import { notifySignOff } from '@/onboarding/server/notify'

export const dynamic = 'force-dynamic'

const field = (v: unknown, max = 120) => (typeof v === 'string' ? v.trim().slice(0, max) : '')

export async function POST(req: NextRequest) {
  if (!configured) return json({ error: 'not-configured' }, 501)
  if (!sameOrigin(req)) return json({ error: 'bad-origin' }, 403)
  const spaId = await sessionSpa(req)
  if (!spaId) return json({ error: 'no-session' }, 401)
  let body: { name?: unknown; title?: unknown; attest?: unknown }
  try { body = await req.json() } catch { return json({ error: 'bad-json' }, 400) }
  const person = { name: field(body.name), credential: field(body.title) }
  if (!person.name || !person.credential || body.attest !== true) return json({ error: 'bad-request' }, 400)
  const done = await (await intake()).withSpa(spaId, async (s) => {
    const again = (await s.approvals()).length > 0
    const sections = await s.sections()
    await s.signOff(person, contentHash(sections))
    const spa = ((await s.profile()) as { name?: string } | null)?.name ?? 'A spa'
    const said = (k: string, field: string) => !!String((sections[k]?.data as Record<string, unknown> | undefined)?.[field] ?? '').trim()
    const comments = [said('part1', 'notes1') && 'Personality Protocol', said('part2', 'notes2') && 'Sales Playbook'].filter((x): x is string => !!x)
    return { approvals: await s.approvals(), again, spa, comments }
  })
  /* After the reply, so the spa never waits on the email. */
  after(() => notifySignOff({ spaId, spa: done.spa, name: person.name, title: person.credential, again: done.again, comments: done.comments }))
  return json({ ok: true, approvals: done.approvals })
}
