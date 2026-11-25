# H1 AI Advertising: the plan

Eight milestones, done in order (6 and 7 were added 2026-11-25). Each one ends with something working and deployable.
Lines marked **Decide** are choices to settle before that step starts. Tick boxes as you go and
commit this file with the work, so the plan and the code stay in step.

First written 2026-11-20; restructured into milestones 2026-11-24; portals and chat-data architecture added 2026-11-25.

> **Architecture for the portals and the chat's information:** [`docs/portals-and-chat-data.md`](docs/portals-and-chat-data.md). Read it before Milestones 3, 6 or 7. In short: **Neon is the source of truth for each client's chat information; H1's AWS account is the source of truth for the chat code.** Each client's AWS account runs the chat and reads only its own section of Neon. The client portal and admin portal live on this site and read and write Neon.

---

## The pieces

| Piece | What it is | Built with | Hosted on |
| --- | --- | --- | --- |
| **H1 AI Advertising** (this repo, `CameronPerrinH1/H1-Ai-Advertising`) | Marketing site at h1aiadvertising.com. Will gain the chat (Milestone 2), the client portal and admin portal (Milestone 3) and the sales and personality protocol form. | Static HTML today, Next.js after Milestone 1 | Vercel |
| **H1 AI Consulting** (`../H1 AI Consulting`, `H1WebDev` monorepo) | pnpm + Turborepo monorepo: `apps/site-h1` (site and the protocol form), `apps/platform` (Better Auth login and content editor), `packages/core` (Drizzle + Neon), and for now `concierge/` (the chat) | Next.js 15, React 19, TypeScript | Vercel |
| **The chat** (AI concierge) | The spa chat widget and its backend: `../H1 AI Consulting/concierge` today; moves here in Milestone 2 | TypeScript, AWS CDK, Bedrock (Claude Haiku 5.5) | AWS, one stack per client (unchanged by the move) |
| **Intake form** | The first questionnaire a new spa fills in (business facts) | Jotform | Jotform |
| **Sales and personality protocol form** | The onboarding wizard: 23 screens in Parts 1-3 (voice, selling rules, objections and so on) | Part of `apps/site-h1` | H1 AI Consulting site; moves here in Milestone 4 |

How they connect today:
- Jotform intake → H1 copies the business facts into the chat's client config (`concierge/clients/<id>/config.yaml`). The gap detector (`apps/site-h1/src/onboarding/gaps.ts`) lists what is missing from a spa's Design form and Jotform export.
- Protocol form (moved here 2026-11-25, Milestone 4) → the answers are stored in the Neon **intake DB** → `pnpm export-playbook <spa id> <file>.json` (this repo) → `pnpm import-playbook` in `concierge/` writes them into the client config.
- The chat keeps conversations, leads, bookings and monthly summaries in **AWS DynamoDB**, not Neon.
- The chat reads its client info from YAML files bundled into each deploy, loaded once at startup (`concierge/backend/src/config/load.ts`, `runtime.ts:52`). Milestone 6 changes this to read from Neon.

The Jotform intake form and the chat's hosting on AWS don't change in this plan. When it's done, H1 AI Consulting has nothing to do with the form or the chat.

---

## Milestone 0: Setup
- [x] Clone `CameronPerrinH1/H1-Ai-Advertising` into this folder
- [x] Write this plan and commit it (2026-11-24)
- [x] Create a working branch (`nextjs-migration`) so `main` keeps deploying the static site
- [x] **Decided (2026-11-24): standalone repo.** The protocol form, its intake store and schema, the CLI and `export-playbook` all move here for good. The chat (`concierge/`) moves here too (Milestone 2). Consulting keeps none of the form or chat code, so nothing is shared or kept in sync between the repos. The form's playbook export and the chat's import end up side by side in this repo, tested together.
- [x] **Decided: pnpm**, matching Consulting
- [ ] Export the dashboard design as HTML/JSX or screenshots into `design/dashboard/` (the user is exporting it)

**Done when:** the decisions above are made and the design is in the repo.

## Milestone 1: Static HTML to Next.js (same look, same URLs)
Current site: `index.html` (6 sections: system, coordinator, skills, results, faq, book), `book.html` (embedded booking widget from go.h1aiadvertising.com), `terms.html`, `privacy.html`. Shared `assets/motion.css` and `motion.js`, one inline `<style>` per page, self-hosted fonts, JSON-LD on every page.

- [x] **Decided (2026-11-24):** plain CSS. The static site's inline styles and CSS carried over as they were; pulling shared tokens out of the inline styles is left for later.
- [x] **Decided (2026-11-24):** TypeScript
- [x] Scaffold Next.js (App Router, 15.5, React 19, pnpm)
- [x] Move static files to `public/` and keep `/assets/...` paths working
- [x] Fonts: kept `@font-face` in global CSS (`app/globals.css`, signature subsets in `app/home.css`), with the same three preloads
- [x] Root layout: `<head>` metadata defaults, font preloads, the `hb-js` flag, global CSS
- [x] Split the pages into components (`components/home/*`, shared `Header`, `Footer`, `FooterSection`), converted from the HTML by a script so nothing was retyped
- [x] Motion: `motion.js` is kept as the original plain script (`public/assets/motion.js`, deferred from the layout) rather than a React port, so reveals don't wait for React to load. Elements it changes carry `suppressHydrationWarning`. The skills explorer is a React client component.
- [x] Pages: `/`, `/book` (booking widget through `next/script`), `/terms`, `/privacy`
- [x] SEO parity: per-page `metadata` (`lib/site.ts`), JSON-LD (`lib/structured-data.ts`), `app/sitemap.ts`, `app/robots.ts`. Checked against the static pages: titles, descriptions, Open Graph, Twitter and JSON-LD identical. The home canonical is written without its final `/` (same URL).
- [x] FAQ JSON-LD generated from the same data as the FAQ section (`components/home/faq-data.ts`)
- [x] `next.config.ts`: cache headers as before, `trailingSlash: false`, and 308 redirects from the old `.html` addresses
- [x] Images: kept as plain `<img>` (no `next/image`). The images are already small WebP files, and the hero swap works on a plain `<img>`.
- [x] Visual check against the static site, desktop (1440) and phone (390): every page matches pixel for pixel (2026-11-24). Behaviour matches too: reveals, hero swap, skills explorer, FAQ accordion, header and mobile menu. No console errors or hydration warnings.
  - Found and fixed on the way: two phone rules in `motion.css` matched containers by their style text, which React writes differently; they now use the `hb-wrap` and `hb-pad-founder` classes.
- [x] Lighthouse (mobile, simulated throttling): home 93–94 (was 97), book 96 (was 99); accessibility, best practices and SEO unchanged. LCP is about 0.5 s later in the simulation because Next.js and React add ~100 KB of JavaScript that shares the slow network with the fonts. Unthrottled, both paint at ~114 ms.
- [x] Vercel: `vercel.json` now sets the framework to Next.js. Merged to `main` (PR #1); checked 2026-11-25 that www.h1aiadvertising.com serves the Next.js build and the old `.html` addresses redirect (308)
- [x] Update `README.md` for the new structure

**Done when:** h1aiadvertising.com is served by Next.js and looks and ranks the same as the static site did.

## Milestone 2: Move the chat here from Consulting
Decided (2026-11-24): the chat's code leaves H1 AI Consulting entirely and lives in this repo. It keeps running on AWS; only the code moves. Checked 2026-11-24: `concierge/` imports nothing from the rest of the Consulting monorepo (only comments mention `apps/site-h1`), so it moves as is.

- [x] Make this repo a pnpm workspace: the Next.js site at the root, plus `concierge/shared`, `backend`, `widget`, `evals`, `infra` (the same layout Consulting uses). Root scripts: `chat:dev`, `chat:check`, `chat:test`, `chat:typecheck`. The site's `tsconfig.json` excludes `concierge/`.
- [x] Bring `concierge/` over with its git history (`git subtree split --prefix=concierge` in Consulting, then pull that branch in here), leaving out `node_modules`, `cdk.out`, `.local-data` and `.eval-results`. Done 2026-11-25 from Consulting `main` at `cf66458` (56 commits; history checked for secrets, none). Every unmerged chat branch in Consulting was already in `main`. The lockfile reuses Consulting's exact versions for the chat packages.
- [x] Bring over its CI: the `concierge` job from Consulting's `ci.yml` (logging guard, config check, widget build, audit) and `concierge-evals.yml`, plus typecheck and tests for the `@concierge/*` packages (`.github/workflows/concierge.yml`, `concierge-evals.yml`)
- [ ] Evals in CI: allow this repo in the AWS eval role's trust policy and set the `EVAL_ROLE_ARN` variable on this GitHub repo
- [x] Keep the site's Vercel build from building or bundling the chat (it deploys to AWS through CDK, not Vercel); add an `ignoreCommand` so chat-only changes don't redeploy the site (`vercel.json`: install filtered to the site, `ignoreCommand` skips `concierge/`, `docs/`, `CHECKLIST.md`)
- [ ] Check the first Vercel preview of this branch: install, build, and that the `ignoreCommand` behaves
- [x] Update `concierge/README.md`: the "lives in the H1 monorepo" text, CI paths, and the export step (still run from Consulting until Milestone 4 moves it). Its links to `../../docs/ai-concierge-handoff/` work, since this repo also sits in `H1/`
- [x] Verify here: `pnpm install`, `pnpm check` in `concierge/`, `pnpm dev` runs the Glow Med Spa demo, `pnpm --filter @concierge/infra synth -c deployment=glow-med-spa-staging` produces the same templates as from Consulting. Checked 2026-11-25: 213 tests pass, 3 configs valid, widget builds, demo starts, site typechecks and builds. The synthesized template is identical except the Lambda asset hash, and the bundled code is identical apart from the folder name it records.
- [ ] Deploy from here from now on (CDK stack names don't change, so existing stacks update in place)

**Done when:** the chat builds, tests and synthesizes from this repo, and nobody works on it in Consulting any more.

## Milestone 3: Client portal and admin portal (from the design, read-only first)
Decided 2026-11-25 (see [`docs/portals-and-chat-data.md`](docs/portals-and-chat-data.md)):
- **Two portals on this site, not in AWS:** `/portal` for clients (their own spa only) and `/admin` for H1 staff (every spa). Both read and write Neon.
- **The portals are where the chat's information is managed.** Clients will update their info that the chat reads from; admins will update all chat info for every client.
- **Editing is not built yet.** Build read-only first, but on a data model that makes editing an add-on: versioned records per section with a `draft`/`published` status, the chat reads only `published`, who-changed-what recorded from day one, and one shared schema with the chat.

What exists today (from the Consulting code):
- Neon has two DBs: the **platform DB** (Better Auth `user`, `organization` = tenant, `sites`, `documents`) and the **intake DB** (`intake_spas` client profiles, intake sections, approvals; row-level security through the `intake_app` role).
- **Leads, conversations and bookings are not in Neon.** The chat keeps them in AWS DynamoDB, one stack per client (sessions, and monthly summaries: topics, outcome booked/request/handoff, after-hours, language). Production stacks can sit in the client's own AWS account (Plumb + Pine's is in Jen's).
- Nothing links an intake spa to a login user or organization yet.
- `../H1 AI Consulting/docs/dashboard.md` is the plan for The Platform's site-editing workspace (`apps/platform`), a separate product. Reuse its auth and roles thinking, not its scope.

- [ ] **Decide:** which record is "the existing client" (`intake_spas` row, platform `organization`, or both), and confirm which Neon DB / connection string to use
- [ ] **Decide:** where dashboard metrics come from. Options: read DynamoDB summaries across AWS accounts, have each chat stack push summaries into a new Neon table, or start with intake and profile data only. **Recommended (2026-11-25):** each stack pushes aggregate monthly summaries to Neon, so the site never reads a client's AWS account. Check against D55 first.
- [ ] **Decide:** auth. Reusing Better Auth from `apps/platform` (email and password, invite-only, organization = tenant) is the closest fit. Roles: `client` and `admin`.
- [x] **Decided (2026-11-25):** the portals live on this site (`/portal` and `/admin`), not on a subdomain and not in AWS.
- [ ] **Decide (later, not blocking):** which fields clients may edit vs admin-only, and whether client edits go live immediately or wait for admin approval
- [ ] **Decide:** which Neon database holds the chat info (intake DB, platform DB, or a new one; D85 keeps the intake DB separate)
- [ ] **Decide:** how a client maps to a login (for example an `organization_id` column on `intake_spas`, or matching on `emails`)
- [ ] Map each design screen and widget to its data source (table/column or API). List the gaps.
- [ ] Add Drizzle + `@neondatabase/serverless`, the schema for the tables we read, and any new migration
- [ ] Chat-info tables: one versioned record per client per section (config, services, service details, providers, FAQs, objections, fit rules, products, concerns, urgent message, voice examples), with `status` (`draft`/`published`), `version`, `created_by`, `created_at`. Row-level security by client.
- [ ] Move the chat's zod schemas (`concierge/backend/src/config/schema.ts`) into a shared package used by the chat and the portals
- [ ] One-time import script: validate each `concierge/clients/<id>/` folder and load it into Neon as the first published version
- [ ] Auth: login page, session helper (tenant from session, never from the URL), protected `/portal` and `/admin` layouts
- [ ] Build the portal shell (nav, layout) from the design
- [ ] Client portal: view the spa's chat info by section (read-only), plus dashboard widgets against real data
- [ ] Admin portal: list every client, open any client's chat info (read-only)
- [ ] Empty, loading and error states
- [ ] Security pass: tenant isolation, RLS or role choice, no secrets client-side, no guest chat data shown to the wrong spa
- [ ] Env vars in Vercel (names only in the repo, in `.env.example`)

**Done when:** a real client logs in at h1aiadvertising.com and sees their own portal with their real chat info, and can't reach anyone else's; an H1 admin can see every client's.

## Milestone 4: Port the sales and personality protocol form from Consulting
Decided (2026-11-24): **move it**. Build it here, verify it, then remove it from Consulting in Milestone 5.

Source in `../H1 AI Consulting`:
- `apps/site-h1/src/onboarding/`: the Wizard and 23 screens across Parts 1-3, `answers.ts`, `content.ts`, `spa.ts`, `voice.ts`, `export.ts`, `gaps.ts` (gap detector), `Redactor.tsx`, `Avatar.tsx`, `fixtures/` (Lumen, which the chat's tests also use), `server/` (AI helpers), `onboarding.css` scoped under `.ob`
- `apps/site-h1/src/app/onboarding/page.tsx` and the API routes in `apps/site-h1/src/app/api/onboarding/` (`state`, `sections`, `sign`, `link`, `ai/*`, `dev`)
- `packages/core/src/intake/` (schema, store, connect) and the intake CLI (`scripts/intake.ts`: create-spa, new-link, revoke)
- The `export-playbook` script that `concierge/` imports from (`concierge/README.md`, "Export the approved answers")

- [x] **Decided (2026-11-25):** same intake DB as Consulting (the h1-intake Neon project), so existing spas keep their answers and approvals
- [x] **Decided (2026-11-25):** keep AWS Bedrock (Claude Haiku) for the AI helpers and Amazon SES for the sign-off email (sender stays `onboarding@h1aiconsulting.com`, the SES-verified domain)
- [x] **Decided (2026-11-25):** keep the private links (magic links, CLI-issued) for now. Tying the form to the portal login comes with Milestone 3 or later; the form becomes a section of the client portal (`docs/portals-and-chat-data.md`).
- [x] **Decided (2026-11-24):** `export-playbook`, the gap detector and the Lumen fixture move here with the form. The chat is here by then (Milestone 2), so its playbook tests use the same fixture
- [x] Copy the `onboarding/` components, CSS and design tokens into this app (2026-11-25, from Consulting `main` at `cf66458`; files copied, not history). Kept the look it had on Consulting, not restyled: `onboarding/ob-base.css` carries Consulting's tokens and base styles scoped to `.ob-root`, and `app/onboarding/layout.tsx` loads its two fonts for that segment only. Screenshots at 1440 and 390 match Consulting's.
- [x] Rebranded to H1 AI Advertising (2026-11-25): the site's logo, the page title, DM Sans for headings and text, Sweet Sans Pro for small uppercase labels, DM Serif Display italic for the welcome heading's accent. The colours already matched. The lost-link note keeps `hello@h1aiconsulting.com`, the contact this site uses everywhere.
- [ ] Sign-off email: the sender's name now says H1 AI Advertising, but the address is still `onboarding@h1aiconsulting.com`. To send from `onboarding@h1aiadvertising.com`, verify h1aiadvertising.com in SES (H1's AWS account), then change `FROM` in `onboarding/server/notify.ts`.
- [x] Port the intake store and schema (`lib/intake/`, migrations in `lib/intake/migrations/`, `drizzle.intake.config.ts`) and the `next.config` settings it needs (`serverExternalPackages` for ws, @neondatabase/serverless, pglite; `.js` → `.ts` extension alias). Dependencies at Consulting's exact versions.
- [x] Port the API routes (state, sections autosave with versioning, sign, link, ai/*, dev). Their addresses lost the trailing `/` (this site has `trailingSlash: false`).
- [x] Port the intake CLI: `pnpm intake migrate | create-spa | new-link | revoke`. Links now point at `https://www.h1aiadvertising.com` (`SITE_URL`). Also `pnpm export-playbook` and `pnpm gaps`.
- [x] Port the tests (`answers.test.ts`, `export.test.ts`, `gaps.test.ts`, plus `lib/intake/intake.test.ts` for row-level security): `pnpm test`, 47 pass. CI: `.github/workflows/site.yml` (types, tests, build).
- [ ] Link the form to the dashboard (for example the client sees form status and approvals)
- [ ] Vercel env vars (Production only; names and notes in `.env.example`): `INTAKE_DATABASE_URL`, `INTAKE_DATABASE_URL_UNPOOLED`, `INTAKE_AI`, `INTAKE_AI_MODEL`, `INTAKE_AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`. Copy the values from the Consulting Vercel project. Previews get none, so a preview runs the form as an in-browser demo.
- [ ] Verify end to end on the Advertising site:
  - [ ] new link opens the form (passed locally on PGlite 2026-11-25; recheck on production)
  - [ ] autosave, and a conflict from two tabs returns 409 (passed locally 2026-11-25, plus a request from another origin gets 403; recheck on production)
  - [ ] AI helpers answer
  - [ ] sign-off sends the email
  - [ ] answers and approvals show in the intake DB
  - [ ] `export-playbook` on a spa filled in here, then `pnpm import-playbook` in `concierge/`, produces a working client config (try it with `CLIENT_ID=<id> pnpm dev`). The demo export (`pnpm export-playbook --demo`) already matches the chat's committed Lumen playbook exactly.
  - [ ] a spa that started the form on Consulting can finish it here without losing answers

**Done when:** every box under "Verify end to end" is ticked, and the next new spa is sent to the Advertising site.

## Milestone 5: Remove the protocol form and the chat from Consulting
Only after Milestone 4 is verified. Do it on a branch in the Consulting repo, through a PR.

- [ ] No spa has an open form link on Consulting (or each one has been reissued on Advertising)
- [ ] Redirect `/onboarding` on the Consulting site to the Advertising form, so old links and emails still land somewhere
- [ ] Delete `apps/site-h1/src/onboarding/`, `apps/site-h1/src/app/onboarding/` and `apps/site-h1/src/app/api/onboarding/`, and `apps/site-h1/scripts/export-playbook.ts` (all of it now lives here)
- [ ] Remove the intake code from `packages/core` and `scripts/intake.ts` if nothing else in Consulting uses them
- [ ] Remove the now-unused env vars from the Consulting Vercel project, and the onboarding settings in its `next.config`
- [ ] Update the Consulting docs that point at the form (`concierge/README.md` intake steps, `docs/`), and `../docs/ai-concierge-handoff/09-intake-wizard.md` if it is still used
- [ ] Consulting CI passes (build, tests, and the `concierge/` playbook tests)
- [ ] Delete `concierge/` from Consulting (after Milestone 2 is verified), and remove it from `pnpm-workspace.yaml`, the `concierge` job in `ci.yml`, `concierge-evals.yml`, and any Consulting docs that mention it
- [ ] Keep the intake DB. The data stays; only the code moves.

**Done when:** the protocol form and the chat exist only in this repo, Consulting builds and deploys cleanly without them, and the chat can still import playbooks.

## Milestone 6: The chat reads its information from Neon
Neon becomes the only source of truth for client chat information (D88, D92). Can start once Milestone 2 (chat moved here) and the Milestone 3 tables exist.

- [ ] Per-client read-only Neon role (SELECT on published chat info, that client's rows only), tested with raw SQL that skips the app's filters (D89)
- [ ] Store each client's Neon credential in that client's AWS Secrets Manager; add it to the CDK stack
- [ ] New loader that reads the published version from Neon and returns the same `ClientBundle` as `load.ts`, so the prompt, orchestrator and catalog don't change
- [ ] Cache in the Lambda (refresh every few minutes) so edits show up without a redeploy
- [ ] Last good copy in the client's own account (S3 or DynamoDB); fall back to it if Neon can't be reached, and log the fallback
- [ ] Validate every version with the shared schema before use; reject a bad version and keep the last good copy
- [ ] Keep YAML loading for the demo clients and evals only (`glow-med-spa`, `lumen-aesthetics`)
- [ ] Move one real client (Plumb + Pine) to Neon, then delete or freeze its YAML files. Never two editable copies.
- [ ] Protocol form publishes approved answers straight to Neon (replaces `export-playbook` → `import-playbook`)

**Done when:** changing a client's published info in Neon changes what their live chat says within minutes, with no redeploy, and the chat keeps answering when Neon is unreachable.

## Milestone 7: One release updates every client (deploy pipeline in H1's AWS account)
H1's AWS account is the source of truth for the chat code (D6, D90). AWS won't update other accounts on its own, so this pipeline does it.

- [ ] **Decide:** CDK Pipelines in H1's account, or a GitHub Actions job that assumes per-client deploy roles
- [ ] Add a deploy role trusted by H1 to the D75 CloudFormation quick-create template (per-spa external ID, least privilege); add it to existing client accounts once (Plumb + Pine in Jen's account)
- [ ] Client registry (D76) lists every client account and stage the pipeline deploys to
- [ ] Staged rollout: H1's test stack, then a pilot client, then the rest; a failed health check stops it
- [ ] Record each client's deployed version and build ID (D67)
- [ ] Rollback: redeploy the previous release to every account

**Done when:** one merged fix reaches every client's chat through the pipeline, with nobody deploying account by account.

## Later (not scheduled): editing in the portals
- [ ] Client edit screens (save as `draft`)
- [ ] Admin edit screens for every client, including admin-only fields
- [ ] Approval: publish a draft (who may publish what is still to be decided)
- [ ] Change history view and revert to an earlier version

---

## Open items carried over
- [ ] Reset the Neon password that was pasted into a chat (from `11-your-action-items.md`)
- [ ] Fill in `[DATE]` on Terms and Privacy, and `[Denver County]` in Terms
- [ ] Sweet Sans Pro web licence
- [ ] Plumb + Pine: Jen's AWS account (609344448048) is denied every Claude 5.5 model on Bedrock ("not available for this account", 2026-11-24) even though model access shows as authorized. Open an AWS Support case to enable Haiku 5.5 before her production chat goes live.
