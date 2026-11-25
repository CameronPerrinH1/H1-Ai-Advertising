/*
 * H1's intake commands, against INTAKE_DATABASE_URL_UNPOOLED (or INTAKE_DATABASE_URL).
 *
 *   tsx scripts/intake.ts migrate
 *   tsx scripts/intake.ts create-spa <profile.json> <email>[,<email>…]   prints the private link
 *   tsx scripts/intake.ts new-link <spa id>                             prints a new private link
 *   tsx scripts/intake.ts revoke <spa id>                               turns off its links and devices
 *
 * Links point at SITE_URL (https://www.h1aiadvertising.com by default). PGlite
 * allows one process at a time: stop the dev server before running these
 * against a local folder, or use the dev-only route (/onboarding/dev).
 */
import { readFileSync } from 'node:fs'
import { createIntake } from '../lib/intake/connect.js'

const url = process.env.INTAKE_DATABASE_URL_UNPOOLED ?? process.env.INTAKE_DATABASE_URL
if (!url) throw new Error('Set INTAKE_DATABASE_URL_UNPOOLED (or INTAKE_DATABASE_URL) first.')
const site = (process.env.SITE_URL ?? 'https://www.h1aiadvertising.com').replace(/\/$/, '')
const link = (token: string) => `${site}/api/onboarding/link?t=${token}`

const [cmd, a, b] = process.argv.slice(2)
const intake = await createIntake(url, { migrate: cmd === 'migrate' })
try {
  if (cmd === 'migrate') console.log('Intake migrations applied.')
  else if (cmd === 'create-spa' && a && b) {
    const id = await intake.operator.createSpa({ profile: JSON.parse(readFileSync(a, 'utf8')), emails: b.split(',').map((e) => e.trim()) })
    console.log(`Spa ${id}\nPrivate link: ${link(await intake.operator.createLink(id))}`)
  } else if (cmd === 'new-link' && a) console.log(`Private link: ${link(await intake.operator.createLink(a))}`)
  else if (cmd === 'revoke' && a) { await intake.operator.revokeLinks(a); console.log('Links and devices revoked.') }
  else console.log('Usage: migrate | create-spa <profile.json> <emails> | new-link <spa id> | revoke <spa id>')
} finally {
  await intake.close()
}
