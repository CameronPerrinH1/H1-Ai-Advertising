/*
 * Development only: creates a spa from the demo profile and opens its private
 * link, so the database-backed wizard can be tried with one click. With PGlite
 * the dev server holds the database, so the `intake create-spa` command can't
 * run beside it. Always 404 outside `next dev`.
 */
import { NextResponse, type NextRequest } from 'next/server'
import { configured, intake } from '@/onboarding/server/intake'
import { DEMO_SPA } from '@/onboarding/spa'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  if (process.env.NODE_ENV !== 'development' || !configured) return new NextResponse(null, { status: 404 })
  const db = await intake()
  const { id: _demo, ...profile } = DEMO_SPA
  const spaId = await db.operator.createSpa({ profile, emails: ['owner@example.test'] })
  const token = await db.operator.createLink(spaId)
  return NextResponse.redirect(new URL(`/api/onboarding/link?t=${token}`, req.url), 303)
}
