/*
 * The wizard's two AI features (09-intake-wizard.md §3.1): name ideas, and the
 * made-up guest in the role-play. Claude Haiku on Bedrock in H1's AWS account,
 * through the US inference profile, so requests stay in US regions.
 *
 * Neither of those sends patient information: the guest is invented, and the
 * spa is told to use made-up details. The screenshot reader (api/onboarding/ai/shots)
 * does see real conversations; it relies on the AWS BAA for Bedrock. Every call has a short timeout and a
 * per-spa daily cap, and the page falls back to the fixed lists and scripts
 * whenever this returns null, so the wizard works with AI off (§7, phase 4).
 */
import { BedrockRuntimeClient, ConverseCommand, type Message } from '@aws-sdk/client-bedrock-runtime'

/** INTAKE_AI=off turns both features off; the page uses its fallbacks. */
export const aiOn = process.env.INTAKE_AI !== 'off'
const MODEL = process.env.INTAKE_AI_MODEL ?? 'us.anthropic.claude-haiku-5-5'

/* Credentials come from the default AWS chain: `aws login` locally; in
   production, the AWS_ settings in the site's Vercel project (.env.example). */
const g = globalThis as { __h1Bedrock?: BedrockRuntimeClient | undefined }
const client = () => (g.__h1Bedrock ??= new BedrockRuntimeClient({ region: process.env.INTAKE_AWS_REGION ?? 'us-east-1' }))

/** Daily caps per spa. Generous for a person; a stop for a runaway script. */
export const CAPS = { names: 40, guest: 300, shots: 40 } as const

/** One model call. Null on any failure or after `ms`, so the caller falls back. */
export async function ask(system: string, messages: Message[], opts: { maxTokens: number; ms?: number }): Promise<string | null> {
  if (!aiOn) return null
  try {
    const res = await client().send(new ConverseCommand({
      modelId: MODEL, system: [{ text: system }], messages,
      inferenceConfig: { maxTokens: opts.maxTokens },
      /* Haiku 5.5 thinks by default; on a short budget an odd message can use it
         all up and return no text. These replies are a sentence or two, so it's
         off (allowed at the default effort). Sampling settings such as
         temperature are rejected by this model, so none are sent. */
      additionalModelRequestFields: { thinking: { type: 'disabled' } },
    }), { abortSignal: AbortSignal.timeout(opts.ms ?? 8000) })
    const text = res.output?.message?.content?.map((c) => c.text ?? '').join('').trim()
    return text || null
  } catch (e) {
    console.warn('[onboarding ai]', (e as Error).name, (e as Error).message)
    return null
  }
}
