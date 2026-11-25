/*
 * The made-up guest in the role-play: { scenario, log } in, the guest's next
 * message (or { end: true }) out. 204 when AI is off, capped, or failed: the
 * page then uses the scenario's script (content.ts, SCENARIOS).
 */
import type { Message } from '@aws-sdk/client-bedrock-runtime'
import type { NextRequest } from 'next/server'
import type { RpMsg } from '@/onboarding/answers'
import { SCENARIOS } from '@/onboarding/content'
import type { Spa } from '@/onboarding/spa'
import { ask, CAPS } from '@/onboarding/server/ai'
import { configured, intake, json, sameOrigin, sessionSpa } from '@/onboarding/server/intake'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  if (!configured) return new Response(null, { status: 204 })
  if (!sameOrigin(req)) return json({ error: 'bad-origin' }, 403)
  const spaId = await sessionSpa(req)
  if (!spaId) return json({ error: 'no-session' }, 401)
  let body: { scenario?: unknown; log?: unknown }
  try { body = await req.json() } catch { return json({ error: 'bad-json' }, 400) }
  const sc = SCENARIOS.find((s) => s.id === body.scenario)
  const log = (Array.isArray(body.log) ? body.log : []).filter((m): m is RpMsg =>
    !!m && (m.r === 'g' || m.r === 'y') && typeof m.t === 'string').map((m) => ({ r: m.r, t: m.t.slice(0, 1200) }))
  if (!sc || !log.length || log.length > 16 || log.at(-1)!.r !== 'y') return json({ error: 'bad-request' }, 400)

  /* Up to 8 guest messages, so a scenario the spa reopens ("Keep going") can
     carry on; the guest usually ends it sooner with [END]. */
  const guestTurns = log.filter((m) => m.r === 'g').length
  if (guestTurns >= 8) return json({ end: true })

  const spa = await (await intake()).withSpa(spaId, async (s) => {
    const profile = (await s.profile()) as Partial<Spa> | null
    return (await s.allowance('ai-guest', CAPS.guest)) ? profile : null
  })
  if (!spa) return new Response(null, { status: 204 })

  const text = await ask(
    `You are role-playing a prospective guest messaging ${spa.name ?? 'a med spa'}, a med spa, through Instagram DMs, so its team can practice. Scenario: ${sc.t}. It opened with: "${sc.open}". Stay in character as the guest the whole time: never mention the role-play, the practice, or being an AI, and never offer to help the team. If the team's last message is unclear or looks like a typo, react the way a real guest would, briefly and a little confused. Write only the guest's next message: one or two short, casual sentences that react naturally to the team's last reply. Use only made-up details: no real names, phone numbers, or emails. Never ask for or give medical advice beyond what a curious guest would ask. Write in the same language as the guest's first message. If the conversation has reached a natural end, such as the guest booking, saying goodbye, or having nothing left to ask, reply with exactly [END].`,
    /* A conversation must open with a user turn; the guest spoke first, so a stage direction comes before it. */
    [{ role: 'user', content: [{ text: '(The guest sends the first message.)' }] },
      ...log.map((m): Message => ({ role: m.r === 'g' ? 'assistant' : 'user', content: [{ text: m.t }] }))],
    { maxTokens: 120 },
  )
  if (!text) return new Response(null, { status: 204 })
  if (text.includes('[END]')) return json({ end: true })
  return json({ text: text.replace(/^["“]|["”]$/g, '').slice(0, 400) })
}
