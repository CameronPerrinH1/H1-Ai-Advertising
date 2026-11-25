/*
 * The wizard's server side: one connection to the intake database per server
 * process, and the session cookie a private link sets (D83). Imported only by
 * the /api/onboarding/ routes.
 */
import { createHash } from 'node:crypto'
import { createIntake, type Intake, type SectionRecord } from '@/lib/intake'
import type { NextRequest } from 'next/server'

/** The session cookie. HttpOnly, so page scripts never see it. */
export const COOKIE = 'h1_intake'

const url = process.env.INTAKE_DATABASE_URL ?? ''
/** No database configured: the wizard runs as an in-browser demo. */
export const configured = !!url

/* One connection for the process, kept across dev-server reloads. A local
   PGlite folder is migrated on first use; production runs `intake migrate`. */
const g = globalThis as { __h1Intake?: Promise<Intake> | undefined }
export function intake(): Promise<Intake> {
  g.__h1Intake ??= createIntake(url, { migrate: url.startsWith('pglite:') && process.env.NODE_ENV !== 'production' })
    /* A failed start isn't kept: the next request tries again. */
    .catch((e: unknown) => { g.__h1Intake = undefined; throw e })
  return g.__h1Intake
}

/** The spa this request's session belongs to, or null. */
export async function sessionSpa(req: NextRequest): Promise<string | null> {
  const token = req.cookies.get(COOKIE)?.value
  return token ? (await intake()).sessionSpa(token) : null
}

/**
 * Changes must come from this site's own pages. The cookie is SameSite=Lax,
 * which already keeps it off other sites' requests; this is the second lock.
 */
export function sameOrigin(req: NextRequest): boolean {
  const origin = req.headers.get('origin')
  return !!origin && origin === new URL(req.url).origin
}

/** JSON that's never cached or shared. */
export function json(body: unknown, status = 200) {
  return Response.json(body, { status, headers: { 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' } })
}

/** JSON with object keys sorted, so the same answers always hash the same. */
const canon = (v: unknown): string => JSON.stringify(v, (_k, x: unknown) =>
  x && typeof x === 'object' && !Array.isArray(x) ? Object.fromEntries(Object.entries(x).sort(([p], [q]) => (p < q ? -1 : 1))) : x)

/**
 * The content hash an approval covers (D74): SHA-256 of every answer, leaving
 * out where the spa is in the form and the sign-off details themselves. Any
 * other change means the sign-off no longer covers the answers.
 */
export function contentHash(sections: Record<string, SectionRecord>): string {
  const { sign: _sign, ...part3 } = (sections.part3?.data ?? {}) as Record<string, unknown>
  return createHash('sha256').update(canon({ part1: sections.part1?.data ?? {}, part2: sections.part2?.data ?? {}, part3 })).digest('hex')
}
