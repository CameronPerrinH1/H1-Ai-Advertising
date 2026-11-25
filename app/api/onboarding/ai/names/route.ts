/*
 * Name ideas for the spa's coordinator: { feel, style, avoid } in, up to six
 * { name, why } out. 204 when AI is off, capped, or failed: the page then shows
 * its fixed list (content.ts, FALLBACK_NAMES).
 */
import type { NextRequest } from 'next/server'
import { NAME_STYLES } from '@/onboarding/content'
import type { Spa } from '@/onboarding/spa'
import { ask, CAPS } from '@/onboarding/server/ai'
import { configured, intake, json, sameOrigin, sessionSpa } from '@/onboarding/server/intake'

export const dynamic = 'force-dynamic'

const STYLE: Record<string, string> = {
  first: 'a friendly first name, like Sophie or Mila',
  brand: 'a name tied to the spa’s brand, its name, or its story, like "Ava from Lumen" or "Lumi"',
  title: 'a descriptive title rather than a person’s name, like "The Lumen Concierge"',
}
const clean = (s: unknown, max: number) => (typeof s === 'string' ? s.replace(/\s+/g, ' ').trim().slice(0, max) : '')

export async function POST(req: NextRequest) {
  if (!configured) return new Response(null, { status: 204 })
  if (!sameOrigin(req)) return json({ error: 'bad-origin' }, 403)
  const spaId = await sessionSpa(req)
  if (!spaId) return json({ error: 'no-session' }, 401)
  let body: { feel?: unknown; style?: unknown; avoid?: unknown }
  try { body = await req.json() } catch { return json({ error: 'bad-json' }, 400) }
  const style = typeof body.style === 'string' && body.style in STYLE ? body.style : 'first'
  const feel = Array.isArray(body.feel) ? body.feel.map((f) => clean(f, 40)).filter(Boolean).slice(0, 3) : []
  const avoid = clean(body.avoid, 300)

  const ok = await (await intake()).withSpa(spaId, async (s) => {
    const profile = (await s.profile()) as Partial<Spa> | null
    return (await s.allowance('ai-names', CAPS.names)) ? profile : null
  })
  if (!ok) return new Response(null, { status: 204 })

  const text = await ask(
    `You suggest names for a med spa's AI Treatment Coordinator, the chat assistant on the spa's website. It always tells guests it's AI, so names never need to sound like a real staff member. Suggest names that are easy to say and spell, warm, and appropriate for a medical aesthetics business. Never use the names of real, famous people, and never use a name the spa asks you to avoid. Reply with JSON only: an array of exactly 6 objects, each {"name": string, "why": string}, where "why" is under 8 words.`,
    [{ role: 'user', content: [{ text: [
      `Spa: ${ok.name ?? 'the spa'} (short name: ${ok.short ?? ''}).`,
      `Style: ${STYLE[style]}.`,
      feel.length ? `Guests should feel: ${feel.join(', ')}.` : '',
      avoid ? `Names to avoid (current staff and others): ${avoid}.` : '',
      `Allowed styles for reference: ${NAME_STYLES.filter((n) => n.v in STYLE).map((n) => n.t).join('; ')}.`,
    ].filter(Boolean).join('\n') }] }],
    { maxTokens: 400 },
  )
  /* Trust nothing about the reply's shape: parse, trim, and drop anything odd. */
  let ideas: [string, string][] = []
  try {
    const raw = JSON.parse((text ?? '').replace(/^```(?:json)?|```$/g, '').trim()) as unknown
    const avoidList = avoid.toLowerCase()
    ideas = (Array.isArray(raw) ? raw : []).map((x): [string, string] => [clean((x as { name?: unknown }).name, 32), clean((x as { why?: unknown }).why, 60)])
      .filter(([n, w]) => n && w && /^[\p{L}\p{M}' .&-]+$/u.test(n) && !avoidList.includes(n.toLowerCase()))
      .slice(0, 6)
  } catch { /* fall through to 204 */ }
  return ideas.length >= 3 ? json({ ideas }) : new Response(null, { status: 204 })
}
