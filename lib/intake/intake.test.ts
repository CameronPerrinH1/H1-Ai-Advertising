/**
 * The intake wizard's storage, on a real Postgres (PGlite) with the committed
 * intake migrations. The cross-spa tests go around the store's own WHERE
 * clauses with raw SQL, so they prove row-level security holds by itself
 * (09-intake-wizard.md §2: isolation from the first commit).
 */
import { PGlite } from '@electric-sql/pglite'
import { sql } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/pglite'
import { migrate } from 'drizzle-orm/pglite/migrator'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { intakeMigrationsDir } from './connect.js'
import * as schema from './schema.js'
import { hashToken, type Intake, intakeFromDb, type IntakeDb } from './store.js'

let client: PGlite
let raw: ReturnType<typeof drizzle<typeof schema>>
let intake: Intake
let spaA: string
let spaB: string

beforeEach(async () => {
  client = new PGlite()
  raw = drizzle({ client, schema })
  await migrate(raw, { migrationsFolder: intakeMigrationsDir() })
  intake = intakeFromDb(raw as unknown as IntakeDb, () => client.close())
  spaA = await intake.operator.createSpa({ profile: { name: 'Spa A' }, emails: ['a@example.test'] })
  spaB = await intake.operator.createSpa({ profile: { name: 'Spa B' }, emails: ['b@example.test'] })
  await intake.withSpa(spaA, (s) => s.save('part1', { name: 'Secret A' }, 0))
})
afterEach(async () => { await intake.close() })

/** Raw SQL inside a transaction scoped the way withSpa scopes it, with no store in between. */
const asSpa = <T>(spaId: string | null, fn: (tx: Parameters<Parameters<typeof raw.transaction>[0]>[0]) => Promise<T>) =>
  raw.transaction(async (tx) => {
    await tx.execute(sql`set local role intake_app`)
    if (spaId) await tx.execute(sql`select set_config('intake.spa_id', ${spaId}, true)`)
    return fn(tx)
  })
const rows = (r: unknown) => (r as { rows: unknown[] }).rows
/** Postgres's own message: drizzle wraps it as "Failed query: …" with the original as `cause`. */
async function pgError(p: Promise<unknown>): Promise<string> {
  try { await p } catch (e) { return String((e as { cause?: Error }).cause?.message ?? (e as Error).message) }
  return 'no error'
}

describe('cross-spa isolation', () => {
  it('a spa reads only its own profile and answers', async () => {
    const b = await intake.withSpa(spaB, async (s) => ({ profile: await s.profile(), sections: await s.sections() }))
    expect(b.profile).toEqual({ name: 'Spa B' })
    expect(b.sections).toEqual({})
    const a = await intake.withSpa(spaA, (s) => s.sections())
    expect(a.part1?.data).toEqual({ name: 'Secret A' })
  })

  it('raw SQL with no WHERE clause still sees only the scoped spa', async () => {
    const seen = await asSpa(spaB, (tx) => tx.execute(sql`select spa_id from intake_sections`))
    expect(rows(seen)).toEqual([])
    const spas = await asSpa(spaB, (tx) => tx.execute(sql`select id from intake_spas`))
    expect(rows(spas)).toEqual([{ id: spaB }])
  })

  it('a spa cannot change another spa’s answers', async () => {
    const upd = await asSpa(spaB, (tx) => tx.execute(sql`update intake_sections set data = '{"name":"hacked"}' where spa_id = ${spaA}`))
    expect((upd as { affectedRows?: number }).affectedRows ?? 0).toBe(0)
    expect(await pgError(asSpa(spaB, (tx) => tx.execute(sql`insert into intake_sections (spa_id, section, data) values (${spaA}, 'part2', '{}')`)))).toMatch(/row-level security/)
    const a = await intake.withSpa(spaA, (s) => s.sections())
    expect(a.part1?.data).toEqual({ name: 'Secret A' })
    expect(a.part2).toBeUndefined()
  })

  it('with no spa set, nothing is visible', async () => {
    const seen = await asSpa(null, (tx) => tx.execute(sql`select * from intake_sections`))
    expect(rows(seen)).toEqual([])
  })

  it('the wizard’s role can’t read links or sessions at all', async () => {
    expect(await pgError(asSpa(spaA, (tx) => tx.execute(sql`select * from intake_links`)))).toMatch(/permission denied/)
    expect(await pgError(asSpa(spaA, (tx) => tx.execute(sql`select * from intake_sessions`)))).toMatch(/permission denied/)
  })
})

describe('saving', () => {
  it('counts versions and refuses a save from a stale version', async () => {
    const v2 = await intake.withSpa(spaA, (s) => s.save('part1', { name: 'Second' }, 1))
    expect(v2).toEqual({ ok: true, version: 2 })
    const stale = await intake.withSpa(spaA, (s) => s.save('part1', { name: 'From an old tab' }, 1))
    expect(stale).toEqual({ ok: false, reason: 'conflict', current: { data: { name: 'Second' }, version: 2 } })
  })

  it('refuses to create a section that already exists', async () => {
    const dup = await intake.withSpa(spaA, (s) => s.save('part1', {}, 0))
    expect(dup.ok).toBe(false)
  })

  it('writes an audit row with every save, and the audit trail is append-only', async () => {
    const audit = await raw.select().from(schema.intakeAudit)
    expect(audit.filter((r) => r.spaId === spaA).map((r) => r.action)).toEqual(['spa-created', 'save'])
    expect(await pgError(raw.execute(sql`update intake_audit set action = 'x'`))).toMatch(/append-only/)
    expect(await pgError(raw.execute(sql`delete from intake_audit`))).toMatch(/append-only/)
  })
})

describe('daily allowances', () => {
  it('allows up to the limit per spa per day, counted separately for each spa', async () => {
    const take = (spa: string) => intake.withSpa(spa, (s) => s.allowance('ai-guest', 2))
    expect([await take(spaA), await take(spaA), await take(spaA)]).toEqual([true, true, false])
    expect(await take(spaB)).toBe(true)
  })
})

describe('sign-off', () => {
  const person = { name: 'Alex', credential: 'Owner' }
  it('records the sign-off as approved for the version signed, and a new one supersedes it', async () => {
    await intake.withSpa(spaA, (s) => s.signOff(person, 'hash1'))
    const first = await intake.withSpa(spaA, (s) => s.approvals())
    expect(first.map((x) => [x.role, x.name, x.decision, x.contentHash])).toEqual([['owner', 'Alex', 'approved', 'hash1']])
    await intake.withSpa(spaA, (s) => s.signOff({ ...person, name: 'Alex Kim' }, 'hash2'))
    const now = await intake.withSpa(spaA, (s) => s.approvals())
    expect(now.map((x) => [x.name, x.contentHash])).toEqual([['Alex Kim', 'hash2']])
  })

  it('another spa can’t see or supersede it', async () => {
    await intake.withSpa(spaA, (s) => s.signOff(person, 'hash1'))
    expect(await intake.withSpa(spaB, (s) => s.approvals())).toEqual([])
    await intake.withSpa(spaB, (s) => s.signOff(person, 'hashB'))
    expect(await intake.withSpa(spaA, (s) => s.approvals())).toHaveLength(1)
  })
})

describe('private links', () => {
  it('a link opens a session for its spa; tokens are stored only as hashes', async () => {
    const token = await intake.operator.createLink(spaA)
    const opened = await intake.openLink(token)
    expect(opened).not.toBeNull()
    expect(await intake.sessionSpa(opened!.session)).toBe(spaA)
    const stored = await raw.select().from(schema.intakeLinks)
    expect(stored.map((l) => l.tokenHash)).toEqual([hashToken(token)])
    expect(JSON.stringify(stored)).not.toContain(token)
  })

  it('unknown tokens open nothing, and revoking turns off links and devices', async () => {
    expect(await intake.openLink('not-a-real-token')).toBeNull()
    expect(await intake.sessionSpa('not-a-real-session')).toBeNull()
    const token = await intake.operator.createLink(spaA)
    const opened = await intake.openLink(token)
    await intake.operator.revokeLinks(spaA)
    expect(await intake.openLink(token)).toBeNull()
    expect(await intake.sessionSpa(opened!.session)).toBeNull()
  })

  it('an expired session opens nothing', async () => {
    const opened = await intake.openLink(await intake.operator.createLink(spaA))
    await raw.execute(sql`update intake_sessions set expires_at = now() - interval '1 minute'`)
    expect(await intake.sessionSpa(opened!.session)).toBeNull()
  })
})
