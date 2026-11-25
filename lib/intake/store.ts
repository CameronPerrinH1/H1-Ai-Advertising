/**
 * The intake wizard's data access. Two doors, and no third:
 *
 *   withSpa   — everything a spa's private link may do, inside one transaction
 *               running as `intake_app` with `intake.spa_id` set, so row-level
 *               security (migrations/intake/0001_rls.sql) holds even if a
 *               query here forgot its WHERE clause.
 *   operator  — H1's own commands: create a spa, make or revoke its links.
 *               Never reachable from a request the wizard makes.
 *
 * Plus the token exchange, which has to run before the spa is known: a private
 * link's token becomes a session, and a session names its spa. Only SHA-256
 * hashes of tokens are stored.
 */
import { createHash, randomBytes } from 'node:crypto'
import { and, eq, gt, isNull, sql } from 'drizzle-orm'
import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core'
import * as schema from './schema.js'
import { intakeApprovals, intakeAudit, intakeLinks, intakeSections, intakeSessions, intakeSpas } from './schema.js'

export type IntakeDb = PgDatabase<PgQueryResultHKT, typeof schema>
export type Approver = { role: 'owner' | 'md'; name: string; email: string; credential: string }
export type ApprovalRecord = Approver & {
  contentHash: string; sentAt: Date; decision: 'approved' | 'changes' | null; note: string | null; decidedAt: Date | null
}
type Tx = Parameters<Parameters<IntakeDb['transaction']>[0]>[0]

/** How long a device stays signed in after opening its private link. */
export const SESSION_DAYS = 90

const newToken = () => randomBytes(32).toString('base64url')
export const hashToken = (token: string) => createHash('sha256').update(token).digest('hex')

export type SectionRecord = { data: unknown; version: number }
export type SaveResult =
  | { ok: true; version: number }
  /** Someone saved this section since `baseVersion`; `current` is what they saved. */
  | { ok: false; reason: 'conflict'; current: SectionRecord | null }

/** What a spa's private link can do. Every method is already scoped to that spa. */
export type SpaStore = {
  readonly spaId: string
  /** The spa's profile, or null if the spa no longer exists. */
  profile(): Promise<unknown | null>
  sections(): Promise<Record<string, SectionRecord>>
  /**
   * Save one section, starting from `baseVersion` (0 for a section never saved).
   * Refuses with a conflict if the stored version has moved on. Writes the audit
   * row in the same transaction.
   */
  save(section: string, data: unknown, baseVersion: number): Promise<SaveResult>
  /** An audit row for something other than a save, such as sending for approval. */
  record(action: string, detail?: Record<string, unknown>): Promise<void>
  /**
   * A daily cap on something that costs money, such as an AI call: if fewer
   * than `limit` `action` rows were recorded since midnight UTC, records one
   * and returns true; otherwise false.
   */
  allowance(action: string, limit: number): Promise<boolean>
  /** The current sign-off, if any; earlier ones are superseded. */
  approvals(): Promise<ApprovalRecord[]>
  /**
   * The person filling in the form signs off on the answers whose content hash
   * is `contentHash`: supersedes any earlier sign-off and records this one as
   * approved, with its audit row.
   */
  signOff(person: { name: string; credential: string }, contentHash: string): Promise<void>
}

const approvalCols = {
  role: intakeApprovals.role, name: intakeApprovals.name, email: intakeApprovals.email, credential: intakeApprovals.credential,
  contentHash: intakeApprovals.contentHash, sentAt: intakeApprovals.sentAt, decision: intakeApprovals.decision,
  note: intakeApprovals.note, decidedAt: intakeApprovals.decidedAt,
}

function spaStore(tx: Tx, spaId: string): SpaStore {
  const audit = (row: Omit<typeof intakeAudit.$inferInsert, 'spaId' | 'actor'>) =>
    tx.insert(intakeAudit).values({ spaId, actor: 'link', ...row })
  return {
    spaId,
    async profile() {
      /* No WHERE needed, and none given: row-level security shows only this spa. */
      const [row] = await tx.select({ profile: intakeSpas.profile }).from(intakeSpas)
      return row?.profile ?? null
    },
    async sections() {
      const rows = await tx.select().from(intakeSections).where(eq(intakeSections.spaId, spaId))
      return Object.fromEntries(rows.map((r) => [r.section, { data: r.data, version: r.version }]))
    },
    async save(section, data, baseVersion) {
      const saved = baseVersion === 0
        ? await tx.insert(intakeSections).values({ spaId, section, data }).onConflictDoNothing()
          .returning({ version: intakeSections.version })
        : await tx.update(intakeSections)
          .set({ data, version: sql`${intakeSections.version} + 1`, updatedAt: sql`now()` })
          .where(and(eq(intakeSections.spaId, spaId), eq(intakeSections.section, section), eq(intakeSections.version, baseVersion)))
          .returning({ version: intakeSections.version })
      const version = saved[0]?.version
      if (version === undefined) {
        const [cur] = await tx.select().from(intakeSections)
          .where(and(eq(intakeSections.spaId, spaId), eq(intakeSections.section, section)))
        return { ok: false, reason: 'conflict', current: cur ? { data: cur.data, version: cur.version } : null }
      }
      await audit({ action: 'save', section, version })
      return { ok: true, version }
    },
    async record(action, detail) {
      await audit({ action, detail: detail ?? null })
    },
    async allowance(action, limit) {
      const [row] = await tx.select({ n: sql<number>`count(*)::int` }).from(intakeAudit)
        .where(and(eq(intakeAudit.spaId, spaId), eq(intakeAudit.action, action), gt(intakeAudit.at, sql`date_trunc('day', now() at time zone 'utc') at time zone 'utc'`)))
      if ((row?.n ?? 0) >= limit) return false
      await audit({ action })
      return true
    },
    async approvals() {
      return await tx.select(approvalCols).from(intakeApprovals)
        .where(and(eq(intakeApprovals.spaId, spaId), isNull(intakeApprovals.supersededAt))) as ApprovalRecord[]
    },
    async signOff(person, contentHash) {
      await tx.update(intakeApprovals).set({ supersededAt: sql`now()` })
        .where(and(eq(intakeApprovals.spaId, spaId), isNull(intakeApprovals.supersededAt)))
      /* No link is ever sent, so the token column holds a random value nobody has. */
      await tx.insert(intakeApprovals).values({
        spaId, role: 'owner', name: person.name, credential: person.credential, email: '',
        tokenHash: hashToken(newToken()), contentHash, decision: 'approved', decidedAt: sql`now()`,
      })
      await audit({ action: 'approve', detail: { contentHash, name: person.name } })
    },
  }
}

export type Intake = ReturnType<typeof intakeFromDb>

export function intakeFromDb(db: IntakeDb, close: () => Promise<void>) {
  const h1 = (spaId: string, action: string, detail?: Record<string, unknown>) =>
    db.insert(intakeAudit).values({ spaId, actor: 'h1', action, detail: detail ?? null })

  return {
    /** H1's commands. Only scripts and H1's own tools call these, never a wizard request. */
    operator: {
      async createSpa(input: { profile: Record<string, unknown>; emails: string[] }): Promise<string> {
        const [row] = await db.insert(intakeSpas).values({ profile: input.profile, emails: input.emails }).returning({ id: intakeSpas.id })
        await h1(row!.id, 'spa-created')
        return row!.id
      },
      /** A new private link for the spa. The token is returned once and stored only as a hash. */
      async createLink(spaId: string): Promise<string> {
        const token = newToken()
        await db.insert(intakeLinks).values({ tokenHash: hashToken(token), spaId })
        await h1(spaId, 'link-created')
        return token
      },
      /** Turns off every link and signed-in device for a spa, such as after a link was forwarded by mistake. */
      async revokeLinks(spaId: string): Promise<void> {
        await db.update(intakeLinks).set({ revokedAt: sql`now()` }).where(and(eq(intakeLinks.spaId, spaId), isNull(intakeLinks.revokedAt)))
        await db.update(intakeSessions).set({ revokedAt: sql`now()` }).where(and(eq(intakeSessions.spaId, spaId), isNull(intakeSessions.revokedAt)))
        await h1(spaId, 'links-revoked')
      },
    },

    /** Swap a private link's token for a new session. Null for an unknown or revoked link. */
    async openLink(token: string): Promise<{ session: string; expiresAt: Date } | null> {
      const [link] = await db.select({ spaId: intakeLinks.spaId }).from(intakeLinks)
        .where(and(eq(intakeLinks.tokenHash, hashToken(token)), isNull(intakeLinks.revokedAt)))
      if (!link) return null
      const session = newToken()
      const expiresAt = new Date(Date.now() + SESSION_DAYS * 864e5)
      await db.insert(intakeSessions).values({ tokenHash: hashToken(session), spaId: link.spaId, expiresAt })
      return { session, expiresAt }
    },

    /** The spa a session belongs to, or null if it's unknown, expired, or revoked. */
    async sessionSpa(session: string): Promise<string | null> {
      const [row] = await db.select({ spaId: intakeSessions.spaId }).from(intakeSessions)
        .where(and(eq(intakeSessions.tokenHash, hashToken(session)), isNull(intakeSessions.revokedAt), gt(intakeSessions.expiresAt, sql`now()`)))
      return row?.spaId ?? null
    },

    /** Everything a spa's link may do, in one transaction scoped by row-level security. */
    withSpa<T>(spaId: string, fn: (s: SpaStore) => Promise<T>): Promise<T> {
      return db.transaction(async (tx) => {
        await tx.execute(sql`set local role intake_app`)
        await tx.execute(sql`select set_config('intake.spa_id', ${spaId}, true)`)
        return fn(spaStore(tx, spaId))
      })
    },

    close,
  }
}
