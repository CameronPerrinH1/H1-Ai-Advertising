# Client portal, admin portal, and where the chat gets its information

Agreed with Cameron on 2026-11-25. This records the architecture so it survives the end of any one
working session. The build steps are in [`../CHECKLIST.md`](../CHECKLIST.md) (Milestones 3, 6 and 7).
The matching decisions are D88–D92 in
[`../../docs/ai-concierge-handoff/02-decision-log.md`](../../docs/ai-concierge-handoff/02-decision-log.md).

---

## 1. The goal

- **Client portal:** a spa logs in and sees (and later edits) the information its chat answers from:
  services, prices, hours, providers, FAQs, promotions, and so on.
- **Admin portal:** H1 staff see (and later edit) every client's chat information, including the
  settings clients should never touch.
- **Nobody edits YAML files or redeploys** to change what a spa's chat says.

## 2. The model in one picture

```
        h1aiadvertising.com (Next.js on Vercel)
        ├── /portal   client portal  ─┐
        └── /admin    admin portal   ─┤ read + (later) write
                                      ▼
                    Neon  ── source of truth for every client's chat INFORMATION
                      ▲      (one section per client, row-level security)
                      │ read-only, own client only
   ┌──────────────────┼──────────────────┐
   │ Client A's AWS   │ Client B's AWS   │ ...   each runs the chat stack (D5),
   │ chat stack       │ chat stack       │       with its own config + own Neon key
   └──────────────────┴──────────────────┘
                      ▲ deploys the same release to every client account
        H1's AWS account ── source of truth for the chat CODE (D6)
```

- **Neon is the source of truth for client chat information.**
- **H1's AWS account is the source of truth for the chat itself:** the code, the release, the
  deploy pipeline, and the instruction-lock key (D66).
- **Each client's AWS account** runs the chat for that client, keeps its own setup (domain,
  DynamoDB tables, secrets), and reads only its own section of Neon.
- **The portals live on the Advertising site (Vercel)**, not in AWS. They read and write Neon.
  No new AWS service is needed for them.

Conversations, leads, bookings and monthly summaries stay in each client's DynamoDB (D55). Only
business content goes into Neon, never anything a guest typed.

## 3. Three things that make it safe

### 3.1 Each client's AWS account gets its own read-only Neon key (D89)
"Its own section" must be enforced by Neon, not by the chat asking for the right client.
- One Neon role per client (or one role plus a per-client setting enforced by row-level
  security), with **SELECT only** on the published chat info, and only that client's rows.
- The credential lives in **that client's AWS Secrets Manager**. It is never shared between clients.
- A bug, or a leaked key, in one client's account can then expose only that client's own business
  content.
- Same pattern as the intake DB's `intake_app` role (D85). Test it with raw SQL that skips the
  app's own filters.

### 3.2 "One deploy fixes every client" needs a deploy pipeline in H1's account (D90)
AWS does not update code in other accounts by itself. A Lambda in Jen's account does not change
when H1 deploys to H1's account.
- H1's account holds the code and a pipeline (CDK Pipelines, or a GitHub Actions job that assumes
  roles) that deploys each release to every client account.
- Each client account trusts an H1 deploy role once, at setup. The self-serve CloudFormation
  quick-create link from D75 already creates the agency roles with a per-spa external ID; the
  deploy role belongs there.
- One release, then deployed everywhere, staged: H1's own test stack first, then a pilot
  client, then the rest. A failed health check stops the rollout.
- This matches D6 (one codebase, one versioned release) and D67 (build registry).

### 3.3 The chat keeps working if Neon is down (D89)
Neon going down must not take every client's chat offline at once.
- Each stack keeps a **last good copy** of its client's published info in its own account (S3 or
  DynamoDB), refreshed whenever it reads a newer version successfully.
- The chat reads Neon at startup and every few minutes (cache), falls back to the last good copy
  if Neon can't be reached, and logs that it did.
- Every copy is validated with the shared schema before use. A bad version is rejected and the
  last good copy stays in use.
- This keeps the spirit of D78 (the chat depends on what's in the spa's own account) while making
  Neon the place everyone edits.

## 4. Build the portal now so editing can be added later (D91)
Editing is **not** being built yet. The data shape is what makes it an add-on instead of a rebuild:

- **Versioned records with a status.** Each client's chat info is stored as versions, each with a
  status: `draft` or `published` (later maybe `pending_approval`). For now everything is
  imported straight in as `published`.
- **The chat reads only the published version.** Later, edits go in as drafts; approval
  becomes "publish". The chat side never changes for either.
- **One shared schema.** The chat's existing zod schemas (`concierge/backend/src/config/schema.ts`)
  move into a shared package that both the chat and the portals import. The portal can then never
  save something the chat would reject.
- **Sections match the chat's files:** business/config, services, service details, providers,
  FAQs, objections, fit rules, products, concerns, urgent message, voice examples. Each section can
  be versioned and (later) approved on its own.
- **Record who changed what and when** on every version from day one, even though only imports
  write today.
- **The portal launches read-only.** Clients and admins can view their info. Edit screens come later.
- **Roles from day one:** `client` (own spa only) and `admin` (all spas). The session decides the
  spa, never the URL.

## 5. What happens to the YAML files (D92)
Recommended: **Neon becomes the only source of truth.** The YAML format stays only for:
- **A one-time import.** A script validates each client folder (`concierge/clients/<id>/`) and
  loads it into Neon as the first published version. Same idea as `import-playbook`, pointed the
  other way.
- **Test data.** The demo clients (`glow-med-spa`, `lumen-aesthetics`) and the evals stay YAML, so
  local development and tests don't need a database.

Once a real client (e.g. `plumb-and-pine`) is moved to Neon, delete its config files or turn them
into a read-only export. **Never keep two editable copies**; they drift and nobody knows which is right.

The protocol form (Milestone 4) stops needing `export-playbook` → `import-playbook`: its approved
answers publish straight into the same Neon records.

## 6. How the chat loads its info today (for reference)
- `concierge/backend/src/config/load.ts` reads `config.yaml` plus the knowledge files named in it
  from `concierge/clients/<id>/`, validates them with zod, and returns a `ClientBundle`.
- `concierge/backend/src/runtime.ts:52` calls `loadClient` **once at startup**. The files are
  bundled into the deploy, so any change means editing files and redeploying that client's stack.
- The new loader must return the same `ClientBundle`, so the rest of the chat
  (prompt, orchestrator, catalog) doesn't change.

## 7. Still to decide (later)
- **Which fields clients may edit**, and which are admin-only. Likely admin-only: voice and tone,
  safety and urgent messages, staff mode, booking setup, handoff addresses.
- **Whether client edits go live immediately or wait for admin approval.** Suggestion: prices,
  services and anything medical wait for approval (D38, D74); hours and similar can go live
  immediately.
- ~~Which Neon database~~: decided 2026-11-25, the h1-intake database (D93).
- ~~How a client maps to a login~~: decided 2026-11-25, the `intake_spas` row is the client; a
  membership table maps Better Auth users to it (D94).
- **Where dashboard metrics come from.** Recommended earlier: each chat stack pushes its monthly
  summaries (aggregates only, no transcripts) to a Neon table, so the site never reads a
  client's AWS account. Needs a check against D55 and the client agreement before it ships.

## 8. What the design adds (read 2026-11-25)
The design is in `../../Designs/Ai Dashboard/` (both subfolders are the same export). It is a
fuller **client-success portal** than Sections 1–7 assumed. Decided the same day: the client
record is the `intake_spas` row, everything lives in the h1-intake database (now "the client
database", D93), and logins are Better Auth email and password, invite-only (D94). Build steps:
`CHECKLIST.md`, "Game plan", Phases C–E.

### 8.1 Screens
- **Client portal**: *Onboarding* (3 phases of steps with owner, status and an action link set
  by H1; current phase; target launch; next step; meetings; final "Approve for Launch"),
  *Advertising* (a campaign month by month: strategy, budget, creative and copy review links,
  monthly approval, AI Impact Report PDF), *AI Chat* (coordinator card, update requests,
  handoff requests, booked appointments), *Profile* (logo and business details). Sidebar
  links to the Master Client Folder and Creative Review, and the H1 team contact.
- **Admin portal** (client editor): client list and "+ Add Client"; per client the profile,
  portal access and invites, step statuses and links, campaign months and report upload, stage
  status, the update queue and "log an update", and the handoff and booking tables.

### 8.2 How it changes the plan
- **Chat info changes go through a request queue, not direct editing** (proposed D95). The
  client asks for a change ("Update HydraFacial pricing"); H1 makes it and marks it live; the
  client sees what the coordinator now knows. So the first portal doesn't need the
  versioned chat-info editor. Sections 3–5 still describe where the chat's information goes
  (Milestone 6); once that exists, "mark live" can publish a new version from inside the admin.
- **Handoff requests and booked appointments are guest data** (names, phones, emails, chat
  summaries, full conversations). D55 and D78 keep guest data in the spa's own AWS account and
  out of H1's systems, so these tables must not be copied into Neon or pass through Vercel.
  Proposed: the browser loads them directly from the spa's chat API (its `chat.` domain), with
  a short-lived token the portal issues and the spa's stack checks. Until that's built
  (Phase E), the tables show the design's empty state. Needs a compliance check first.
- **Files**: logos and AI Impact Report PDFs need storage. Proposed: Vercel Blob, private, read
  through the portal. These are business files, never guest data.
- **Approvals**: "Approve for Launch" and each month's approval are commitments to spend the
  client's ad budget, so they're recorded like the form's sign-off (who, when, what), D74.
