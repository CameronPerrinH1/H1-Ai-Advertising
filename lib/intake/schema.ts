/**
 * The intake wizard's tables (the Personality Protocol & Sales Playbook form,
 * ai-concierge-handoff/09-intake-wizard.md).
 *
 * Separate from the content engine's tables and migrated on their own
 * (migrations/intake), with their own connection string, INTAKE_DATABASE_URL:
 * locally its own PGlite folder; in production a Neon database, either its own
 * or the platform's, without a code change.
 *
 * Every spa-owned row carries `spa_id`, and row-level security reads it from
 * the first commit (09 §2): the wizard's queries run as the `intake_app` role
 * with `intake.spa_id` set for the transaction, so Postgres itself keeps one
 * spa's answers from another. See the RLS migration and store.ts.
 */
import { sql } from 'drizzle-orm'
import { index, integer, jsonb, pgTable, primaryKey, text, timestamp, uuid } from 'drizzle-orm/pg-core'

/**
 * A spa H1 has signed. `profile` is what the wizard shows and starts from: the
 * name, follow-up promise, urgent line, website, time zone, and the catalog
 * from the onboarding form (the wizard's `Spa` type, without the id).
 */
export const intakeSpas = pgTable('intake_spas', {
  id: uuid('id').primaryKey().defaultRandom(),
  profile: jsonb('profile').notNull(),
  /** The only addresses "Lost your link?" will send to (D83). */
  emails: text('emails').array().notNull().default(sql`'{}'::text[]`),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

/**
 * A private link (D83). Only a hash of the token is kept, so the table alone
 * can't open anyone's form. Revoking a link leaves its sessions until they
 * expire unless they're revoked too (store.ts, revokeLinks).
 */
export const intakeLinks = pgTable('intake_links', {
  tokenHash: text('token_hash').primaryKey(),
  spaId: uuid('spa_id').notNull().references(() => intakeSpas.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  revokedAt: timestamp('revoked_at', { withTimezone: true }),
}, (t) => [index('intake_links_spa_id_idx').on(t.spaId)])

/** A device that opened a private link: the cookie holds the token, this table its hash. */
export const intakeSessions = pgTable('intake_sessions', {
  tokenHash: text('token_hash').primaryKey(),
  spaId: uuid('spa_id').notNull().references(() => intakeSpas.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  revokedAt: timestamp('revoked_at', { withTimezone: true }),
}, (t) => [index('intake_sessions_spa_id_idx').on(t.spaId)])

/**
 * The answers, one row per section (answers.ts, SECTIONS). `version` counts
 * every save; a save names the version it started from, so one tab or device
 * can't silently overwrite another (09 §7, phase 1).
 */
export const intakeSections = pgTable('intake_sections', {
  spaId: uuid('spa_id').notNull().references(() => intakeSpas.id, { onDelete: 'cascade' }),
  section: text('section').notNull(),
  data: jsonb('data').notNull(),
  version: integer('version').notNull().default(1),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [primaryKey({ columns: [t.spaId, t.section] })])

/**
 * One row per save, sending, and approval, in the same transaction as the
 * change. Append-only: a trigger in the migration rejects UPDATE and DELETE.
 * Holds versions and hashes, never the answers themselves.
 */
export const intakeAudit = pgTable('intake_audit', {
  id: uuid('id').primaryKey().defaultRandom(),
  spaId: uuid('spa_id').notNull().references(() => intakeSpas.id, { onDelete: 'cascade' }),
  at: timestamp('at', { withTimezone: true }).notNull().defaultNow(),
  /** link (the spa's private link) | h1 (an H1 command) */
  actor: text('actor').notNull(),
  /** save | send | spa-created | link-created | links-revoked */
  action: text('action').notNull(),
  section: text('section'),
  version: integer('version'),
  detail: jsonb('detail'),
}, (t) => [index('intake_audit_spa_at_idx').on(t.spaId, t.at)])

/**
 * Sign-off (D83, D74). Sending for approval makes one row for the owner and one
 * for the medical director, each with its own link (stored as a hash) and the
 * content hash of the answers that were sent. A decision is recorded on the
 * row; sending again supersedes the open rows, so an approval always names
 * exactly the version it covers.
 */
export const intakeApprovals = pgTable('intake_approvals', {
  id: uuid('id').primaryKey().defaultRandom(),
  spaId: uuid('spa_id').notNull().references(() => intakeSpas.id, { onDelete: 'cascade' }),
  /** owner | md */
  role: text('role').notNull(),
  name: text('name').notNull(),
  email: text('email').notNull(),
  /** The owner's title, or the medical director's credentials. */
  credential: text('credential').notNull(),
  tokenHash: text('token_hash').notNull().unique(),
  contentHash: text('content_hash').notNull(),
  sentAt: timestamp('sent_at', { withTimezone: true }).notNull().defaultNow(),
  /** approved | changes */
  decision: text('decision'),
  note: text('note'),
  decidedAt: timestamp('decided_at', { withTimezone: true }),
  supersededAt: timestamp('superseded_at', { withTimezone: true }),
}, (t) => [index('intake_approvals_spa_id_idx').on(t.spaId)])
