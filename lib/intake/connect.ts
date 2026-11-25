/**
 * Opening the intake database from INTAKE_DATABASE_URL: `pglite:<folder>` for
 * local development, a Neon connection string in production. Same rules as the
 * content engine's createCore (neon.ts), including PGlite's one-process limit.
 */
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Pool } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-serverless'
import { migrate } from 'drizzle-orm/neon-serverless/migrator'
import { drizzle as drizzleLite } from 'drizzle-orm/pglite'
import { migrate as migrateLite } from 'drizzle-orm/pglite/migrator'
import { openLite } from './lite.js'
import * as schema from './schema.js'
import { intakeFromDb, type Intake, type IntakeDb } from './store.js'

/* Plain strings, not `new URL('<literal>', import.meta.url)`: given that, a
   bundler tries to pack the folder into the app (see migrate.ts). */
const MIGRATIONS = './migrations/'
/** The committed intake migrations, applied by `intake migrate` and in tests. */
export const intakeMigrationsDir = () => resolve(dirname(fileURLToPath(String(import.meta.url))), MIGRATIONS)

/**
 * Open the intake database. With `migrate: true` (local development only) the
 * committed migrations are applied first; in production run `intake:migrate`
 * before deploying, as with the platform's migrations.
 */
export async function createIntake(connectionString: string, opts: { migrate?: boolean } = {}): Promise<Intake> {
  if (!connectionString) throw new Error('createIntake needs INTAKE_DATABASE_URL.')
  if (connectionString.startsWith('pglite:')) {
    const client = openLite(connectionString)
    const db = drizzleLite({ client, schema })
    if (opts.migrate) await migrateLite(db, { migrationsFolder: intakeMigrationsDir() })
    return intakeFromDb(db as unknown as IntakeDb, () => client.close())
  }
  const pool = new Pool({ connectionString })
  const db = drizzle({ client: pool, schema })
  if (opts.migrate) await migrate(db, { migrationsFolder: intakeMigrationsDir() })
  return intakeFromDb(db as unknown as IntakeDb, () => pool.end())
}
