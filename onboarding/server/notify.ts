/*
 * Tells H1 when a spa signs off on its form, through Amazon SES in H1's AWS
 * account (the same credentials as the wizard's AI). Only the spa's name, who
 * signed, and when: never the answers themselves.
 *
 * Production only; in development the email is logged instead. A failure is
 * logged and never stops the sign-off.
 */
import { SendEmailCommand, SESv2Client } from '@aws-sdk/client-sesv2'

/* The sender's display name is H1 AI Advertising; the address stays on h1aiconsulting.com, the
   domain verified in SES, until h1aiadvertising.com is verified there too. */
const FROM = 'H1 AI Advertising Onboarding <onboarding@h1aiconsulting.com>'
const TO = ['erin@h1webdev.com', 'cameron@h1webdev.com']

const g = globalThis as { __h1Ses?: SESv2Client | undefined }
const client = () => (g.__h1Ses ??= new SESv2Client({ region: process.env.INTAKE_AWS_REGION ?? 'us-east-1' }))

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`)

export async function notifySignOff(input: { spaId: string; spa: string; name: string; title: string; again: boolean; comments?: string[] }) {
  const when = new Date().toLocaleString('en-US', { timeZone: 'America/Denver', dateStyle: 'long', timeStyle: 'short' })
  const subject = `${input.spa} ${input.again ? 'signed off again on' : 'finished'} their onboarding form`
  const lines = [
    `${input.name} (${input.title}) signed off on ${input.spa}'s Personality Protocol and Sales Playbook on ${when} Mountain time.`,
    input.again ? 'They had signed off before and changed answers since, so this sign-off replaces the earlier one.' : '',
    /* That they left comments, never what they say: the export has them. */
    input.comments?.length ? `They left comments for H1 on the ${input.comments.join(' and ')}. Read them in the export.` : '',
  ].filter(Boolean)
  if (process.env.NODE_ENV !== 'production') { console.log(`[onboarding notify] ${subject}\n${lines.join('\n')}`); return }
  try {
    await client().send(new SendEmailCommand({
      FromEmailAddress: FROM,
      Destination: { ToAddresses: TO },
      Content: { Simple: {
        Subject: { Data: subject },
        Body: {
          Text: { Data: lines.join('\n\n') },
          Html: { Data: lines.map((l) => `<p style="font:15px/1.5 -apple-system,Segoe UI,sans-serif;margin:0 0 12px">${esc(l)}</p>`).join('') },
        },
      } },
    }), { abortSignal: AbortSignal.timeout(8000) })
  } catch (e) {
    console.error('[onboarding notify]', (e as Error).name, (e as Error).message)
  }
}
