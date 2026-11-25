/**
 * Opening a local PGlite folder. Its own module so the intake wizard's storage
 * (intake/) can use it without loading the content engine.
 */
import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { PGlite } from '@electric-sql/pglite'

/**
 * Local development only: `DATABASE_URL=pglite:.data/dev` runs the platform on
 * an embedded Postgres kept in that folder, so it works with no cloud database.
 * Run `db:migrate` against it first, as with Neon. Never for production: PGlite
 * is one process and one connection, so a script and the dev server cannot
 * have the same folder open at once.
 */
export function openLite(connectionString: string): PGlite {
  const dir = connectionString.slice('pglite:'.length)
  /* PGlite creates its own folder but not the folders above it. */
  mkdirSync(dirname(dir), { recursive: true })
  return new PGlite(dir)
}
