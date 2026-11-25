/*
 * Everything the wizard needs to open: the spa (from the session, never from
 * the URL; 09 §2) and its saved sections with their versions.
 *   501: no database configured (the page runs the in-browser demo)
 *   401: no valid session (the page asks for the private link)
 */
import type { NextRequest } from 'next/server'
import { configured, intake, json, sessionSpa } from '@/onboarding/server/intake'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  if (!configured) return json({ mode: 'demo' }, 501)
  const spaId = await sessionSpa(req)
  if (!spaId) return json({ error: 'no-session' }, 401)
  const state = await (await intake()).withSpa(spaId, async (s) => ({ profile: await s.profile(), sections: await s.sections(), approvals: await s.approvals() }))
  if (!state.profile) return json({ error: 'no-session' }, 401)
  return json({ spa: { ...(state.profile as object), id: spaId }, sections: state.sections, approvals: state.approvals })
}
