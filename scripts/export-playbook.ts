/*
 * Export a spa's approved playbook for the concierge (09-intake-wizard.md, Section 5).
 *
 *   pnpm export-playbook <spa id> <out.json>           approved answers only
 *   pnpm export-playbook <spa id> <out.json> --draft   unapproved, for a test drive
 *   pnpm export-playbook --demo <out.json>             the fictional demo spa
 *
 * Reads INTAKE_DATABASE_URL_UNPOOLED (or INTAKE_DATABASE_URL). PGlite allows
 * one process at a time: stop the dev server first when it uses a local folder.
 * Then, in concierge/: pnpm import-playbook <out.json> <client id>.
 *
 * An export without --draft needs the spa's sign-off on exactly the answers
 * saved now (D74): any change since signing makes the content hash differ,
 * and the export refuses.
 */
import { writeFileSync } from 'node:fs'
import { createIntake } from '../lib/intake/index.js'
import { withDefaults, type Answers } from '../onboarding/answers'
import { buildPlaybook, type Playbook } from '../onboarding/export'
import { LUMEN_TODAY, lumenAnswers } from '../onboarding/fixtures/lumen'
import { contentHash } from '../onboarding/server/intake'
import { DEMO_SPA, type Spa } from '../onboarding/spa'

const args = process.argv.slice(2)
const draft = args.includes('--draft')
const demo = args.includes('--demo')
const [a, b] = args.filter((x) => !x.startsWith('--'))

const today = (timeZone: string) => new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
const day = (d: Date) => d.toISOString().slice(0, 10)

function write(out: string, playbook: Playbook) {
  writeFileSync(out, `${JSON.stringify(playbook, null, 2)}\n`)
  console.log(`Wrote ${out}: ${playbook.services.length} services, ${playbook.promotions.length} promotions, ${playbook.voice.examples.length} voice examples.`)
}

if (demo && a) {
  write(a, buildPlaybook(lumenAnswers(), DEMO_SPA, {
    contentHash: 'demo',
    approvals: [
      { role: 'owner', name: 'Jordan Avery', credential: 'Owner', approvedOn: LUMEN_TODAY },
      { role: 'md', name: 'Dr. Sam Patel', credential: 'MD', approvedOn: LUMEN_TODAY },
    ],
    today: LUMEN_TODAY,
  }))
} else if (a && b) {
  const url = process.env.INTAKE_DATABASE_URL_UNPOOLED ?? process.env.INTAKE_DATABASE_URL
  if (!url) throw new Error('Set INTAKE_DATABASE_URL_UNPOOLED (or INTAKE_DATABASE_URL) first.')
  const intake = await createIntake(url)
  try {
    const state = await intake.withSpa(a, async (s) => ({ profile: await s.profile(), sections: await s.sections(), approvals: await s.approvals() }))
    if (!state.profile) throw new Error(`No spa ${a}.`)
    const spa = { ...(state.profile as Omit<Spa, 'id'>), id: a } as Spa
    const hash = contentHash(state.sections)
    const approved = state.approvals.filter((r) => r.decision === 'approved' && r.contentHash === hash)
    if (!approved.length && !draft) {
      throw new Error('Not signed off: the spa must sign off on the answers as they are now. Use --draft for a test drive.')
    }
    const saved = Object.assign({}, ...['part1', 'part2', 'part3'].map((k) => (state.sections[k]?.data ?? {}) as Partial<Answers>)) as Partial<Answers>
    write(b, buildPlaybook(withDefaults(saved, spa), spa, {
      contentHash: hash,
      approvals: draft ? [] : approved.map((r) => ({ role: r.role, name: r.name, credential: r.credential, approvedOn: day(r.decidedAt ?? r.sentAt) })),
      today: today(spa.timeZone),
    }))
    if (draft) console.log('Draft: not approved. The concierge marks it unapproved, and it must not go live.')
  } finally {
    await intake.close()
  }
} else {
  console.log('Usage: export-playbook <spa id> <out.json> [--draft] | export-playbook --demo <out.json>')
  process.exitCode = 1
}
