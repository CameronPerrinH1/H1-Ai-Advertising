# AI Concierge — Pilot v1

A working AI concierge for med spa websites, running locally with a fictional demo spa (Glow Med Spa). It implements the R1 concierge from `../ai-concierge-handoff/01-build-plan.md` plus the pilot's wow features from `../ai-concierge-handoff/07-pilot-v1.md`: a treatment finder, rich visual cards, and a premium full-screen experience.

It also has the time-saving features from the pilot plan (Section 1.1): event countdown, prep and aftercare cards, a rough visit estimate, save as image, membership savings, hours and promotions awareness, a first-visit card, staff mode, and the "questions Ava couldn't answer" report. For what to show on a call, see `../ai-concierge-handoff/08-demo-guide.md`.

## Run it

The concierge lives in the H1 monorepo (moved in on November 6, 2026). Its five packages (`@concierge/shared`, `backend`, `widget`, `evals`, `infra`) are part of the monorepo's pnpm workspace, so `pnpm install` runs once at the repo root, and the root's `pnpm typecheck` and `pnpm test` include them. The commands below run from this `concierge/` folder; its `package.json` only holds shortcuts.

You need Node 22+, pnpm, and an active AWS login for the company account (sidekick-aws), which the local API uses to call Claude on Bedrock.

```bash
pnpm install
aws login
pnpm dev
```

- **Demo spa website:** http://localhost:5180 (inline chat, "Ask about…" buttons, launcher; try `/botox.html` for page-specific questions)
- **Widget on its own:** http://localhost:5173/?mode=fullscreen
- **Staff mode:** http://localhost:5173/?mode=staff (passcode `glow-team` for the demo spa; set `STAFF_ACCESS_CODE` for any other client, or staff mode stays off)
- **Handoff emails** (appointment requests, callbacks, the weekly report) are written to `.outbox/` instead of being sent.
- **Thumbs up and down (9.5):** every answer a guest can rate shows thumbs. A thumbs-down offers three one-tap reasons (wrong info, didn't understand, other), never free text, and flags the chat for review.
- **Chat scoring (D69):** when a chat ends, its summary records the chat length and a 1–5 grade on five things (answered, next step, handled hesitation, tone, safety). Chats that need a human look are flagged; deployed, those are kept 90 days instead of 30. The staff report card and weekly email show chat length, answer quality, and flagged chats.
- **Weekly report:** `pnpm report:weekly` writes the "questions Ava couldn't answer" email from conversation summaries. Summaries are kept in `.local-data/` (synthetic only); the demo spa starts with 26 made-up ones so the report has something to show.

Use made-up names and phone numbers. Nothing here is for real patient data until stage C (see the pilot plan).

## Test it

```bash
pnpm check                                            # everything CI runs: typecheck, tests, logging guard, configs, widget build
pnpm test                                             # unit tests (no model calls)
pnpm eval                                             # 30 scripted conversations against Claude on Bedrock
EVAL_MODEL=us.anthropic.claude-sonnet-5-5 pnpm eval   # same cases on another model (D3)
EVAL_ONLY=crisis,dosage EVAL_VERBOSE=1 pnpm eval      # a subset, printing replies when a case fails
pnpm eval:sales                                      # Plumb + Pine sales review: scripted + simulated guests, graded by Opus 5.5
EVAL_THINKING=off pnpm eval:sales                    # same, thinking off (also EVAL_MODEL, EVAL_EFFORT, EVAL_ONLY, EVAL_REPEAT, EVAL_GRADER=none)
```

CI (the monorepo's `.github/workflows/ci.yml`) runs the concierge's typecheck and tests with the rest of the repo, plus a `Concierge guards` job: the logging guard, the client config check, the widget build, and a dependency audit (reported, not yet blocking). The evals run only when started by hand (`concierge-evals.yml`). The logging guard (`backend/scripts/check-logging.ts`) fails the build if a `log()` call could carry guest content or code writes to the console outside the logger (D34).

The sales review (`evals/src/sales/`) plays each conversation through the real orchestrator, checks every reply against the house rules in code (repeats, timeline or "just looking" questions, length, a booking step, free-consult claims), and has Opus 5.5 grade it with a better version of any weak reply. It writes `results.json` and `report.html` to `.eval-results/sales-<time>/`; the report is published as a private Artifact whose notes boxes save to its database for H1 to read back. On November 10, 2026 (24 conversations): Haiku 5.5 with thinking at low effort averaged 3.8/5 with a 3.7 s typical wait; thinking off was faster (2.5 s) but dropped to 3.1/5; Sonnet 5.5 scored 3.5/5 at 3.8 s, and Opus 5.5 3.5/5 at 5.9 s (7 replies replaced by the safe fallback). Haiku with thinking on stays the default.

Eval results are saved to `.eval-results/`. On October 23, 2026, Haiku 5.5 and Sonnet 5.5 both passed all 20 original cases, so Haiku 5.5 is the default (D3). With the planning and staff cases added (30 in all), Haiku 5.5 passed all 30 and Sonnet 5.5 passed 29: one staff practice reply fell back to the safe reply once and didn't recur in about a dozen reruns. With `EVAL_VERBOSE=1`, a failed case also prints why any reply was blocked or cut off.

## Layout

```
shared/     API and card types used by both sides
backend/    local API, conversation loop, tools, output checks, safety filters, prompt
widget/     the chat app (Preact) and public/loader.js, the script a spa's site embeds
demo-site/  the fictional spa website
clients/    one folder per client: config.yaml and knowledge files
evals/      scripted conversation cases and runner
infra/      the AWS stack (CDK) and the post-deploy check
scripts/    dev.mjs starts the API, widget, and demo site together
```

`backend/src/app.ts` holds every API route. `server.ts` runs it locally; `lambda.ts` runs it on AWS, with the session sweep and weekly report as scheduled functions and the review function invoked directly. `runtime.ts` picks AWS services or the local stand-ins (in-memory sessions, `.local-data/`, `.outbox/`) from environment settings, so `pnpm dev` needs no AWS resources beyond Bedrock.

## Setting up a spa from the intake wizard (09, Section 5)

A spa's approved answers from the wizard on H1's site become its Sales Playbook here: voice, terminology, priorities and price display per treatment, pairings, concerns and the treatment finder, products, promotions and events, objection answers, tactics, handoff wording, and the medical director's urgent messages and symptoms.

1. Start the client folder with H1's business facts: copy an existing client to `clients/<id>/` and set the price list (`services.yaml`, `products.yaml`), service details, providers, FAQs, hours, links, branding, and compliance settings.
2. Export the approved answers (from the repo root): `pnpm --filter site-h1 export-playbook <spa id> <file>.json`. It refuses unless the owner and the medical director approved the answers as they are now; `--draft` exports anyway for a test drive and marks the result unapproved.
3. Import from this folder: `pnpm import-playbook <file>.json <id>`. It matches treatments and products to the price list by name, fails with a list of what to fix (a treatment or product with no price, a promotion with no percent or dollar discount), and checks the result with the concierge's own loader before writing anything. It prints what to review.
4. Run `pnpm check` and the evals, and review the change as a pull request.

Re-importing is safe: the import only replaces the parts the wizard owns (see the top of `backend/src/intake/apply.ts`), and the folder keeps `intake-playbook.json`, the playbook exactly as approved.

The demo spa **Lumen Aesthetics** (`clients/lumen-aesthetics/`) is set up this way, from the wizard's fixture (`apps/site-h1/src/onboarding/fixtures/lumen.ts`): `CLIENT_ID=lumen-aesthetics pnpm dev` to chat with it, and `EVAL_SUITE=playbook pnpm eval` for cases that check each playbook choice reaches the guest. Tests on both sides keep the export and the import in step.

New config fields are all optional with defaults that keep earlier configs behaving as before: `sales.pricing`, `do_not_promote`, `pairings`, `growth`, `events`, `tactics`; `voice.emoji`, `exclamation`, `length`, `sign_off`; `handoff.wording`; `business.terminology.providers` and `booking`; `knowledge.concerns_file`; product priority and pairings; and the urgent file's `emergency_symptoms` (which also join the keyword net, D14) and `urgent_symptoms`.

## Reviewing flagged chats (D39, D69)

```bash
pnpm review list           # flagged chats, newest first: short id, date and hour, flags, overall score
pnpm review show <id>      # one chat: flags, scores, and the messages with contact details masked
```

A chat is flagged when the sweep summarizes it after it ends: a thumbs-down, a low score or safety concern, a fallback reply, a handoff, an unanswered question, or urgent help. Locally the sweep runs every minute, so click End chat (or wait 30 minutes) and give it up to a minute. Flagged local chats are kept in `.local-data/flagged-<client>.json` (synthetic only), so `pnpm review` can read them while `pnpm dev` runs. Unflagged chats are forgotten once summarized.

Both commands go through the same review function the deployed stack runs (`backend/src/review.ts`). It returns flagged chats and nothing else, replaces phone numbers and emails in messages with `[phone]` and `[email]`, shows confirmation cards by kind and status only (no name, phone, or times), and logs every use. Deployed, it's the `ReviewFunction` stack output: a Lambda function with read-only access to the sessions table and no API route, invoked by the review role:

```bash
aws lambda invoke --function-name <ReviewFunction> --payload '{"action":"list"}' --cli-binary-format raw-in-base64-out out.json
aws lambda invoke --function-name <ReviewFunction> --payload '{"action":"get","id":"<id>"}' --cli-binary-format raw-in-base64-out out.json
```

## Kill switch (D43)

```bash
pnpm kill-switch on        # visitors see "Chat is unavailable" with the phone number and booking link
pnpm kill-switch off
pnpm kill-switch status
```

Locally this flips a file in `.local-data/`. For a deployed stack, set `CONCIERGE_CONTROL_PARAM` to the stack's `KillSwitchParameter` output; it takes effect within a minute with no redeploy. If the API can't be reached at all, the widget shows the same view from `client-fallback.json`, written next to the widget at deploy time.

## Deploy (stage B)

```bash
aws login
pnpm --filter @concierge/infra synth -c deployment=glow-med-spa-staging
pnpm --filter @concierge/infra deploy -c deployment=glow-med-spa-staging -c alarmEmail=<ops address> -c handoffEmail=<verified test address>
pnpm --filter @concierge/infra check:deploy glow-med-spa-staging
```

Deployments are listed in `infra/lib/deployments.ts`. A first deploy into an account also needs `npx cdk bootstrap` once. The post-deploy check reads the live settings back (Bedrock invocation logging, API Gateway tracing, table encryption and expiry, the audit trail, CloudFront logging and firewall) and runs a synthetic test chat; a failure blocks the release.

To try another spa, add `clients/<id>/` (copy `glow-med-spa`) and start with `CLIENT_ID=<id> pnpm dev`.

## How the safety design shows up in code

| Rule (decision) | Where |
|---|---|
| Every tool call validated (D10) | `backend/src/tools/handlers.ts` |
| Replies checked before display: prices, discounts, links, phones, card numbers (D13) | `backend/src/checks/output.ts`; retry and fallback in `orchestrator.ts` |
| Cards built from catalog data, never the model (D59) | `backend/src/catalog.ts`, `tools/handlers.ts` |
| Requests and callbacks only after the visitor taps Confirm (D52, D61) | `request_*` tools, `Orchestrator.confirm` |
| Card numbers removed before the model (D33) | `backend/src/safety/cardNumbers.ts` |
| Urgent and crisis safety net (D14) | `backend/src/safety/emergency.ts`, `show_urgent_help` |
| Session token only in an HttpOnly cookie on the chat origin; stored hashed (D30) | `backend/src/server.ts`, `session/store.ts` |
| "Start chat" consent before anything is collected (D35) | `widget/src/components/Chrome.tsx`, `POST /api/session` |
| No conversation text in logs (D34) | `backend/src/log.ts` (allowlisted fields) |
| No third-party scripts or tracking (D53) | widget has no external requests; `loader.js` passes only UI events |
| Prices the spa wants given at consultation never reach the guest, in replies, cards, or estimates (D72) | `displayPrice` in `backend/src/catalog.ts` |
| Dates and totals computed in code, never by the model (D62) | `backend/src/planning.ts`, `Catalog.estimate`, `Catalog.membershipSavings` |
| Saved images drawn on the device, nothing uploaded (D63) | `widget/src/saveImage.ts` |
| Staff mode: own tools and prompt, no guest tools, not summarized (D64) | `STAFF_TOOLS`, `staffFixedBlock`, `POST /api/staff/session`, `widget/src/components/Staff.tsx` |
| Summaries minimized, free text generic only (D32, D65) | `backend/src/summary/` |
| Reviewers see flagged chats only, contact details masked; read-only, every use logged (D39, D69) | `backend/src/review.ts`, `Review` function in `infra/lib/concierge-stack.ts` |

## Things learned building it

- **Claude 5.5 models reject `temperature`.** The Converse call leaves sampling at the model default.
- **Hidden reasoning ("thinking") blocks are bound to the exact system prompt.** The prompt includes the current time, so thinking blocks from earlier turns are dropped from stored history (`normalizeHistory`). That also keeps the model's reasoning out of storage.
- **Reasoning counts toward the output limit.** At 600 tokens, Sonnet sometimes got cut off mid-tool-call, so the budget is 2,048. Replies cut off by the limit never run their tool calls and fall back safely.
- **The model sometimes ends a turn with an empty message after a tool call.** Empty messages aren't valid history, so the next guest message joins the tool-result message instead.
- **Prompt caching works:** about 9,500 tokens of instructions are cached and reused on every call.
- **Inline frames load once the page is idle** rather than with native lazy-loading, which proved unreliable in some embedded browsers.
- Typical reply time is 3 to 5 seconds, or up to about 10 seconds when the finder builds an options card.

## Not built yet

- The first deploy of the staging stack (written and tested locally; not yet deployed)
- Real sign-in for staff mode (staging uses a generated passcode in Secrets Manager)
- Self-hosted brand fonts; the pilot spa's real content and photos
- Access roles (deploy, ops, review, break-glass) and the access and deletion script, before stage C. The review function is built; the `concierge-review` role that may invoke it, with its 30-day full-access window and use alerts, comes with the roles.
- The instruction lock and per-client fingerprint (D66, D67), before stage C
