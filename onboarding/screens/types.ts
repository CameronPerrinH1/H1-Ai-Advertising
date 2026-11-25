import type { ReactNode } from 'react'
import type { Answers } from '../answers'
import type { Spa } from '../spa'
import type { Msg } from '../voice'

export type Ctx = {
  a: Answers
  spa: Spa
  /** Change answers by editing a copy; the wizard saves the result. */
  set: (edit: (draft: Answers) => void) => void
  next: () => void
  go: (id: string) => void
  /** Saving to the server (a spa's private link), not the in-browser demo. */
  server: boolean
  /** Resolves once every change so far is saved. */
  whenSaved: () => Promise<void>
  /** The current sign-off, from the server; empty in the demo. */
  approvals: ApprovalStatus[]
  setApprovals: (list: ApprovalStatus[]) => void
}

/** A sign-off (intake_approvals), as the state route returns it. */
export type ApprovalStatus = {
  role: 'owner' | 'md'; name: string; credential: string; contentHash: string
  decision: 'approved' | 'changes' | null; decidedAt: string | null
}

/** Something missing: what to tell the spa, and the data-need tag of its field. */
export type Need = { msg: string; at: string }
/** Keep the needs whose condition holds. */
export const needList = (...items: (Need | false)[]) => items.filter((x): x is Need => !!x)

export type Screen = {
  id: string
  part: 0 | 1 | 2
  title: string
  /** Full width, with no preview panel. */
  wide?: boolean
  done: (a: Answers) => boolean
  /** What's still missing before Continue, in plain words. Empty when ready. */
  needs?: (a: Answers, spa: Spa) => Need[]
  preview?: (a: Answers, spa: Spa) => Msg[]
  /** The preview's "Asking about…" label, when it depends on the answers. */
  topic?: (a: Answers) => string
  Render: (ctx: Ctx) => ReactNode
}
