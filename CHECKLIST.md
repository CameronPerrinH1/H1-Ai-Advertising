# H1 AI Advertising: the plan

Six milestones, done in order. Each one ends with something working and deployable.
Lines marked **Decide** are choices to settle before that step starts. Tick boxes as you go and
commit this file with the work, so the plan and the code stay in step.

First written 2026-11-20; restructured into milestones 2026-11-24.

---

## The pieces

| Piece | What it is | Built with | Hosted on |
| --- | --- | --- | --- |
| **H1 AI Advertising** (this repo, `CameronPerrinH1/H1-Ai-Advertising`) | Marketing site at h1aiadvertising.com. Will gain the chat (Milestone 2), the client dashboard and the sales and personality protocol form. | Static HTML today, Next.js after Milestone 1 | Vercel |
| **H1 AI Consulting** (`../H1 AI Consulting`, `H1WebDev` monorepo) | pnpm + Turborepo monorepo: `apps/site-h1` (site and the protocol form), `apps/platform` (Better Auth login and content editor), `packages/core` (Drizzle + Neon), and for now `concierge/` (the chat) | Next.js 15, React 19, TypeScript | Vercel |
| **The chat** (AI concierge) | The spa chat widget and its backend: `../H1 AI Consulting/concierge` today; moves here in Milestone 2 | TypeScript, AWS CDK, Bedrock (Claude Haiku 5.5) | AWS, one stack per client (unchanged by the move) |
| **Intake form** | The first questionnaire a new spa fills in (business facts) | Jotform | Jotform |
| **Sales and personality protocol form** | The onboarding wizard: 23 screens in Parts 1-3 (voice, selling rules, objections and so on) | Part of `apps/site-h1` | H1 AI Consulting site; moves here in Milestone 4 |

How they connect today:
- Jotform intake → H1 copies the business facts into the chat's client config (`concierge/clients/<id>/config.yaml`). The gap detector (`apps/site-h1/src/onboarding/gaps.ts`) lists what is missing from a spa's Design form and Jotform export.
- Protocol form → the answers are stored in the Neon **intake DB** → `pnpm --filter site-h1 export-playbook <spa id> <file>.json` → `pnpm import-playbook` in `concierge/` writes them into the client config.
- The chat keeps conversations, leads, bookings and monthly summaries in **AWS DynamoDB**, not Neon.

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

- [ ] **Decide:** styling approach. Plain CSS with tokens matches Consulting and ports the existing CSS directly. Tailwind would mean rewriting every style.
- [ ] **Decide:** JS or TypeScript (TypeScript matches Consulting and makes porting the onboarding easier)
- [ ] Scaffold Next.js (App Router, same major version as Consulting: 15.x, React 19)
- [ ] Move static files to `public/` (favicon, apple-touch-icon, og-image) and keep `/assets/...` paths working
- [ ] Fonts: load through `next/font/local` (or keep `@font-face` in global CSS). Keep the WindSong and Cormorant subsets as they are.
- [ ] Root layout: shared `<head>` metadata, fonts, global CSS (motion.css plus shared tokens pulled out of the inline styles)
- [ ] Split `index.html` into section components (Hero, System, Coordinator, Skills, Results, FAQ, Book, Nav, Footer)
- [ ] Port `motion.js` into a client component or hook (scroll reveals, nav, the hero poster-to-animation swap)
- [ ] Pages: `/`, `/book` (booking widget through `next/script`), `/terms`, `/privacy`
- [ ] SEO parity: per-page `metadata` (title, description, canonical, OG, Twitter), JSON-LD via `<script type="application/ld+json">`, `app/sitemap.ts` and `app/robots.ts` replacing the static files
- [ ] FAQ JSON-LD generated from the same data as the FAQ section (no more editing it twice)
- [ ] Replace `vercel.json` cleanUrls and cache headers with `next.config` (`headers()`, `trailingSlash: false`)
- [ ] Images: `next/image` where it helps, keeping the hero poster-first behaviour
- [ ] Visual check of every page against the live static site (desktop and mobile), plus a Lighthouse check
- [ ] Vercel: switch the framework preset to Next.js, deploy a preview, then promote
- [ ] Update `README.md` for the new structure (it still says "Static site, no build step")

**Done when:** h1aiadvertising.com is served by Next.js and looks and ranks the same as the static site did.

## Milestone 2: Move the chat here from Consulting
Decided (2026-11-24): the chat's code leaves H1 AI Consulting entirely and lives in this repo. It keeps running on AWS; only the code moves. Checked 2026-11-24: `concierge/` imports nothing from the rest of the Consulting monorepo (only comments mention `apps/site-h1`), so it moves as is.

- [ ] Make this repo a pnpm workspace: the Next.js site at the root, plus `concierge/shared`, `backend`, `widget`, `evals`, `infra` (the same layout Consulting uses)
- [ ] Bring `concierge/` over with its git history (`git subtree split --prefix=concierge` in Consulting, then pull that branch in here), leaving out `node_modules`, `cdk.out`, `.local-data` and `.eval-results`
- [ ] Bring over its CI: the `concierge` job from Consulting's `ci.yml` (logging guard, config check, widget build, audit) and `concierge-evals.yml`, plus typecheck and tests for the `@concierge/*` packages
- [ ] Keep the site's Vercel build from building or bundling the chat (it deploys to AWS through CDK, not Vercel); add an `ignoreCommand` so chat-only changes don't redeploy the site
- [ ] Update `concierge/README.md`: the "lives in the H1 monorepo" text, CI paths, and the export step (`pnpm --filter site-h1 export-playbook` becomes this repo's command). Its links to `../../docs/ai-concierge-handoff/` still work, since this repo also sits in `H1/`
- [ ] Verify here: `pnpm install`, `pnpm check` in `concierge/`, `pnpm dev` runs the Glow Med Spa demo, `pnpm --filter @concierge/infra synth -c deployment=glow-med-spa-staging` produces the same templates as from Consulting
- [ ] Deploy from here from now on (CDK stack names don't change, so existing stacks update in place)

**Done when:** the chat builds, tests and synthesizes from this repo, and nobody works on it in Consulting any more.

## Milestone 3: Client dashboard (from the design, using the existing Neon client)
What exists today (from the Consulting code):
- Neon has two DBs: the **platform DB** (Better Auth `user`, `organization` = tenant, `sites`, `documents`) and the **intake DB** (`intake_spas` client profiles, intake sections, approvals; row-level security through the `intake_app` role).
- **Leads, conversations and bookings are not in Neon.** The chat keeps them in AWS DynamoDB, one stack per client (sessions, and monthly summaries: topics, outcome booked/request/handoff, after-hours, language). Production stacks can sit in the client's own AWS account (Plumb + Pine's is in Jen's).
- Nothing links an intake spa to a login user or organization yet.
- `../H1 AI Consulting/docs/dashboard.md` is the plan for The Platform's site-editing workspace (`apps/platform`), a separate product. Reuse its auth and roles thinking, not its scope.

- [ ] **Decide:** which record is "the existing client" (`intake_spas` row, platform `organization`, or both), and confirm which Neon DB / connection string to use
- [ ] **Decide:** where dashboard metrics come from. Options: read DynamoDB summaries across AWS accounts, have each chat stack push summaries into a new Neon table, or start with intake and profile data only.
- [ ] **Decide:** auth. Reusing Better Auth from `apps/platform` (email and password, invite-only, organization = tenant) is the closest fit. Settle where the dashboard lives (`/dashboard` on this site, or a subdomain).
- [ ] **Decide:** how a client maps to a login (for example an `organization_id` column on `intake_spas`, or matching on `emails`)
- [ ] Map each design screen and widget to its data source (table/column or API). List the gaps.
- [ ] Add Drizzle + `@neondatabase/serverless`, the schema for the tables we read, and any new migration
- [ ] Auth: login page, session helper (tenant from session, never from the URL), protected `/dashboard` layout
- [ ] Build the dashboard shell (nav, layout) from the design
- [ ] Build each screen and widget against real data for the existing client
- [ ] Empty, loading and error states
- [ ] Security pass: tenant isolation, RLS or role choice, no secrets client-side, no guest chat data shown to the wrong spa
- [ ] Env vars in Vercel (names only in the repo, in `.env.example`)

**Done when:** a real client logs in at h1aiadvertising.com and sees their own dashboard with real data, and can't reach anyone else's.

## Milestone 4: Port the sales and personality protocol form from Consulting
Decided (2026-11-24): **move it**. Build it here, verify it, then remove it from Consulting in Milestone 5.

Source in `../H1 AI Consulting`:
- `apps/site-h1/src/onboarding/`: the Wizard and 23 screens across Parts 1-3, `answers.ts`, `content.ts`, `spa.ts`, `voice.ts`, `export.ts`, `gaps.ts` (gap detector), `Redactor.tsx`, `Avatar.tsx`, `fixtures/` (Lumen, which the chat's tests also use), `server/` (AI helpers), `onboarding.css` scoped under `.ob`
- `apps/site-h1/src/app/onboarding/page.tsx` and the API routes in `apps/site-h1/src/app/api/onboarding/` (`state`, `sections`, `sign`, `link`, `ai/*`, `dev`)
- `packages/core/src/intake/` (schema, store, connect) and the intake CLI (`scripts/intake.ts`: create-spa, new-link, revoke)
- The `export-playbook` script that `concierge/` imports from (`concierge/README.md`, "Export the approved answers")

- [ ] **Decide:** same intake DB as Consulting, or a separate one (same DB keeps existing spas' answers and approvals; recommended)
- [ ] **Decide:** keep AWS Bedrock (Claude Haiku) for the AI helpers and Amazon SES for the sign-off email, or switch providers
- [ ] **Decide:** form access. Keep magic links (CLI-issued) or tie it to the dashboard login from Milestone 3.
- [x] **Decided (2026-11-24):** `export-playbook`, the gap detector and the Lumen fixture move here with the form. The chat is here by then (Milestone 2), so its playbook tests use the same fixture
- [ ] Copy the `onboarding/` components, CSS and design tokens into this app, adjusted to the Advertising look
- [ ] Port the intake store and schema (or depend on `@h1/core` if monorepo) and the `next.config` settings it needs (`serverExternalPackages` for ws, @neondatabase/serverless, pglite)
- [ ] Port the API routes (state, sections autosave with versioning, sign, link, ai/*)
- [ ] Port the intake CLI (create-spa, new-link, revoke) or replace it with a dashboard action
- [ ] Port the tests (`answers.test.ts`, `export.test.ts`, `gaps.test.ts`)
- [ ] Link the form to the dashboard (for example the client sees form status and approvals)
- [ ] Vercel env vars: `INTAKE_DATABASE_URL`, `INTAKE_DATABASE_URL_UNPOOLED`, `INTAKE_AI`, `INTAKE_AI_MODEL`, `INTAKE_AWS_REGION`, AWS keys
- [ ] Verify end to end on the Advertising site:
  - [ ] new link opens the form
  - [ ] autosave, and a conflict from two tabs returns 409
  - [ ] AI helpers answer
  - [ ] sign-off sends the email
  - [ ] answers and approvals show in the intake DB
  - [ ] `export-playbook` on a spa filled in here, then `pnpm import-playbook` in `concierge/`, produces a working client config (try it with `CLIENT_ID=<id> pnpm dev`)
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

---

## Open items carried over
- [ ] Reset the Neon password that was pasted into a chat (from `11-your-action-items.md`)
- [ ] Fill in `[DATE]` on Terms and Privacy, and `[Denver County]` in Terms
- [ ] Sweet Sans Pro web licence
- [ ] Plumb + Pine: Jen's AWS account (609344448048) is denied every Claude 5.5 model on Bedrock ("not available for this account", 2026-11-24) even though model access shows as authorized. Open an AWS Support case to enable Haiku 5.5 before her production chat goes live.
