/*
 * A private link (D83): `/api/onboarding/link?t=<token>` swaps the token for a
 * session cookie and sends the browser to /onboarding/, so the token never
 * stays in the address bar or history (09 §2.1).
 */
import { NextResponse, type NextRequest } from 'next/server'
import { COOKIE, configured, intake } from '@/onboarding/server/intake'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const to = (path: string) => {
    const res = NextResponse.redirect(new URL(path, req.url), 303)
    res.headers.set('Cache-Control', 'no-store')
    res.headers.set('Referrer-Policy', 'no-referrer')
    return res
  }
  const token = req.nextUrl.searchParams.get('t')
  if (!configured || !token) return to('/onboarding')
  const opened = await (await intake()).openLink(token)
  if (!opened) return to('/onboarding?link=invalid')
  const res = to('/onboarding')
  res.cookies.set(COOKIE, opened.session, {
    httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', expires: opened.expiresAt,
  })
  return res
}
