import { defineConfig } from 'drizzle-kit'

/* The intake wizard's tables, migrated apart from the content engine's
   (src/intake/schema.ts). Run against the unpooled connection in production. */
export default defineConfig({
  dialect: 'postgresql',
  schema: './lib/intake/schema.ts',
  out: './lib/intake/migrations',
  dbCredentials: { url: process.env.INTAKE_DATABASE_URL_UNPOOLED ?? process.env.INTAKE_DATABASE_URL ?? '' },
  strict: true,
})
