# H1 AI Advertising: MedSpa AI Booking Engine site

Next.js 15 (App Router, React 19, TypeScript), deployed on Vercel. Every page is prerendered
at build time; the client and admin portals (Milestone 3 of `CHECKLIST.md`) are what will need a server.

This repo also holds **the AI concierge (the chat)** in `concierge/`, moved here from H1 AI
Consulting on 2026-11-25. It is a pnpm workspace: the site is the root package and the chat's
five packages are listed in `pnpm-workspace.yaml`. The chat deploys to AWS through CDK, never to
Vercel; see [`concierge/README.md`](concierge/README.md). The plan for the portals and where the
chat reads its client information is in [`docs/portals-and-chat-data.md`](docs/portals-and-chat-data.md).

## Run it

```bash
pnpm install
pnpm dev         # http://localhost:3000
pnpm typecheck
pnpm build && pnpm start

# the chat (see concierge/README.md)
pnpm chat:dev     # local API, widget and the Glow Med Spa demo site
pnpm chat:check   # typecheck, tests, logging guard, config check, widget build
```

## Layout

```
app/
  layout.tsx       <html>, font preloads, the hb-js flag, the motion script
  page.tsx         home: the sections from components/home in order, plus its JSON-LD
  book/ terms/ privacy/
  globals.css      fonts and base styles shared by every page
  home.css         home-only styles (skills explorer, marquee, signature fonts)
  legal.css        Terms and Privacy
  book/book.css    booking page
  motion.css       hover, reveal, header, menu and FAQ styles (imported after each page's own CSS)
  sitemap.ts robots.ts
components/
  Header.tsx Footer.tsx FooterSection.tsx JsonLd.tsx
  home/            one file per home section; SkillsExplorer is the one client component
  home/faq-data.ts the FAQ: the section and its FAQPage JSON-LD are both built from it
  home/skills-data.ts
  pages/           Book, Terms and Privacy content
lib/
  site.ts          per-page metadata (title, description, canonical, Open Graph, Twitter)
  structured-data.ts  JSON-LD: the business and website on every page, plus each page's own nodes
public/
  assets/          fonts, images and motion.js, at the same /assets/... URLs as the static site
```

Styling is the static site's, carried over as is: inline styles on the elements, plus the CSS
files above. Two motion.css rules for phones used to find page containers by their style text;
those containers now carry the `hb-wrap` (and `hb-pad-founder`) class instead, because React
writes inline styles without spaces.

## The motion layer

`public/assets/motion.js` is the static site's script, unchanged: scroll reveals, the hero
animation swap, the late footer glow, nav underlines, the frosted header, the mobile menu, the
FAQ accordion and the card spotlight. It's loaded as a plain deferred script from the root layout
so it runs as soon as the HTML is parsed, without waiting for React. It changes classes and
attributes before React hydrates, so every element it touches has `suppressHydrationWarning`;
keep that on any new element with `hb-reveal`, `hb-kb`, `hb-nav`, `hb-spot` or similar, or on a
new `<details>` in the FAQ.

## Caching

`next.config.ts` caches `/assets/*` for a year (immutable), as the static site did. Give a
replaced image or font a new filename, and bump `?v=` on the motion.js tag in `app/layout.tsx`
after editing it.

## Deploy

`vercel.json` sets the framework to Next.js, so the Vercel project needs no build settings.
It installs only the site's own packages (`--filter h1-ai-advertising`), and its `ignoreCommand`
skips a deploy when a commit changes only `concierge/`, `docs/` or `CHECKLIST.md`.
Every booking button links to `/book`, which embeds the HighLevel scheduling calendar from
`api.leadconnectorhq.com`, sized by HighLevel's `form_embed.js` (loaded with `next/script`).
The custom domain go.h1aiadvertising.com serves only funnel pages, not the calendar.

## Before going live
- In Vercel, add `h1aiadvertising.com` and redirect `www.h1aiadvertising.com` to it (canonical URLs, sitemap and JSON-LD all use the bare domain).
- Submit `https://h1aiadvertising.com/sitemap.xml` in Google Search Console.
- Fill in `[DATE]` on the Terms and Privacy pages, and `[Denver County]` in Terms.
- Sweet Sans Pro (`public/assets/fonts/`) needs a web license for public use.

## SEO notes
- Every page has a unique title and description, a canonical URL, Open Graph and Twitter tags (`lib/site.ts`), and JSON-LD (`lib/structured-data.ts`): the business (ProfessionalService), WebSite and WebPage on every page, plus Service and FAQPage on the home page and breadcrumbs elsewhere.
- Update the dates in `app/sitemap.ts` when page content changes.
- Fonts are self-hosted (DM Sans, DM Serif Display, WindSong and Cormorant Garamond are SIL Open Font License fonts from Google Fonts). WindSong is subset to "Erin Silva" and Cormorant Garamond to "SOLENNE", so changing those words needs a new subset.
- The hero shows a still first frame (`ai-coordinator-demo-poster.webp`) and swaps in the animation after the page loads.
