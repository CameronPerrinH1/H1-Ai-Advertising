/*
 * What's still missing for a spa's chat: the Design Questionnaire (the wizard)
 * plus, when given, its General Onboarding Jotform export (onboarding/gaps.ts).
 *
 *   pnpm gaps <spa id> [--jotform <file.csv>] [--match <text>] [--html <out.html>]
 *
 * --match picks the Jotform row that mentions <text> when the CSV holds more
 * than one submission (the default is the last row). --html also writes the
 * report as a page to publish and share.
 *
 * Reads INTAKE_DATABASE_URL_UNPOOLED (or INTAKE_DATABASE_URL), like export-playbook.
 * Read-only: it never changes the spa's answers.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { createIntake } from '../lib/intake/index.js'
import { withDefaults, type Answers } from '../onboarding/answers'
import { buildReport, readJotform, reportText } from '../onboarding/gaps'
import { reportHtml } from '../onboarding/gaps-html'
import { contentHash } from '../onboarding/server/intake'
import type { Spa } from '../onboarding/spa'

const args = process.argv.slice(2)
const opt = (name: string) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined }
const id = args.find((x, i) => !x.startsWith('--') && !args[i - 1]?.startsWith('--'))
if (!id) {
  console.log('Usage: gaps <spa id> [--jotform <file.csv>] [--match <text>] [--html <out.html>]')
  process.exit(1)
}

const url = process.env.INTAKE_DATABASE_URL_UNPOOLED ?? process.env.INTAKE_DATABASE_URL
if (!url) throw new Error('Set INTAKE_DATABASE_URL_UNPOOLED (or INTAKE_DATABASE_URL) first.')
const day = (d: Date) => new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(d)

const intake = await createIntake(url)
try {
  const state = await intake.withSpa(id, async (s) => ({ profile: await s.profile(), sections: await s.sections(), approvals: await s.approvals() }))
  if (!state.profile) throw new Error(`No spa ${id}.`)
  const spa = { ...(state.profile as Omit<Spa, 'id'>), id } as Spa
  const saved = Object.assign({}, ...['progress', 'part1', 'part2', 'part3'].map((k) => (state.sections[k]?.data ?? {}) as Partial<Answers>)) as Partial<Answers>
  const hash = contentHash(state.sections)
  const signed = state.approvals.filter((r) => r.decision === 'approved').sort((x, y) => +(y.decidedAt ?? y.sentAt) - +(x.decidedAt ?? x.sentAt))[0]
  const signoff = signed ? { name: signed.name.trim(), on: day(new Date(signed.decidedAt ?? signed.sentAt)), current: signed.contentHash === hash } : null

  const file = opt('--jotform')
  const jot = file ? readJotform(readFileSync(file, 'utf8'), opt('--match')) : undefined
  if (jot && jot.rows > 1 && !opt('--match')) console.warn(`The CSV has ${jot.rows} submissions; using the last. Pick one with --match <text>.\n`)

  const report = buildReport({ a: withDefaults(saved, spa), spa, signoff, ...(jot ? { jot: jot.jot } : {}) })
  console.log(reportText(report))
  const html = opt('--html')
  if (html) { writeFileSync(html, reportHtml(report, day(new Date()))); console.log(`\nWrote ${html}`) }
} finally {
  await intake.close()
}
