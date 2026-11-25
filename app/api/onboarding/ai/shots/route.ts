/*
 * The screenshot reader (D73). GET says whether it's switched on. POST takes
 * one blacked-out screenshot ({ image: base64 JPEG or PNG }) and returns the
 * spa's own replies from it ({ replies: string[] }), with the client's side,
 * names, contact details, and anything about health left out. The image is
 * read once and never stored; the spa reviews the replies before keeping any.
 *
 * On whenever the wizard's AI is (INTAKE_AI). These are real client
 * conversations: H1's AWS account has the BAA for Bedrock.
 */
import type { NextRequest } from 'next/server'
import { aiOn, ask, CAPS } from '@/onboarding/server/ai'
import { configured, intake, json, sameOrigin, sessionSpa } from '@/onboarding/server/intake'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

const on = () => configured && aiOn
/** About 3 MB of image, under Bedrock's per-image limit. The page shrinks screenshots well below this. */
const MAX_B64 = 4_000_000

export async function GET() {
  return json({ on: on() })
}

const SYSTEM = `You read a screenshot of a text or DM conversation between a med spa's team and one of their clients. Return only the messages the spa's team sent, word for word, in order. Leave out every message the client sent. In what you return, replace every person's name with [name], including names inside the spa's own messages such as a greeting like "Hi Sarah" becoming "Hi [name]", and replace any phone number, email, or social handle with [contact], and leave out any sentence about a specific client's health, treatment history, or results. Ignore anything blacked out. If you can't tell which side is the spa, or there are no spa messages, return an empty array. Reply with JSON only: an array of strings.`

export async function POST(req: NextRequest) {
  if (!on()) return json({ error: 'off' }, 404)
  if (!sameOrigin(req)) return json({ error: 'bad-origin' }, 403)
  const spaId = await sessionSpa(req)
  if (!spaId) return json({ error: 'no-session' }, 401)
  let image: unknown
  try { ({ image } = await req.json()) } catch { return json({ error: 'bad-json' }, 400) }
  if (typeof image !== 'string' || !image || image.length > MAX_B64) return json({ error: 'bad-request' }, 400)
  const bytes = Buffer.from(image, 'base64')
  const format = bytes[0] === 0xff && bytes[1] === 0xd8 ? 'jpeg' : bytes[0] === 0x89 && bytes[1] === 0x50 ? 'png' : null
  if (!format) return json({ error: 'bad-request' }, 400)

  const allowed = await (await intake()).withSpa(spaId, (s) => s.allowance('ai-shots', CAPS.shots))
  if (!allowed) return json({ error: 'capped' }, 429)

  const text = await ask(SYSTEM, [{ role: 'user', content: [
    { image: { format, source: { bytes: new Uint8Array(bytes) } } },
    { text: 'Return the spa team’s messages from this screenshot as a JSON array of strings.' },
  ] }], { maxTokens: 1500, ms: 25000 })
  if (text === null) return json({ error: 'failed' }, 502)
  /* Trust nothing about the reply's shape. */
  let replies: string[] = []
  try {
    const raw = JSON.parse(text.replace(/^```(?:json)?|```$/g, '').trim()) as unknown
    replies = (Array.isArray(raw) ? raw : []).filter((x): x is string => typeof x === 'string')
      .map((x) => x.replace(/\s+/g, ' ').trim().slice(0, 800)).filter(Boolean).slice(0, 30)
  } catch { return json({ error: 'failed' }, 502) }
  return json({ replies })
}
