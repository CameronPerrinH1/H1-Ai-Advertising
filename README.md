# H1 AI Advertising — MedSpa AI Booking Engine site

Static site, no build step.

## Deploy to Vercel
- **Dashboard:** New Project → upload/import this folder (or push it to a GitHub repo and import). Framework preset: **Other**. Leave build command and output directory empty.
- **CLI:** `npm i -g vercel` then run `vercel` (preview) and `vercel --prod` from this folder.

`vercel.json` turns on clean URLs, so pages live at `/`, `/book`, `/terms` and `/privacy`, and caches `/assets` for a year.

Every booking button links to `/book`, which embeds the scheduling calendar from go.h1aiadvertising.com.

Shared motion and interaction styles live in `assets/motion.css` and `assets/motion.js`. Because `/assets` is cached for a year, bump the `?v=` number on those two links in every page after editing them.

## Before going live
- In Vercel, add `h1aiadvertising.com` and redirect `www.h1aiadvertising.com` to it (canonical URLs, sitemap and JSON-LD all use the bare domain).
- Submit `https://h1aiadvertising.com/sitemap.xml` in Google Search Console.
- Fill in `[DATE]` on the Terms and Privacy pages, and `[Denver County]` in Terms.
- Sweet Sans Pro (`assets/fonts/`) needs a web license for public use.

## SEO and performance notes
- Every page has a unique title and description, a canonical URL, Open Graph and Twitter tags, and JSON-LD: the business (ProfessionalService), WebSite and WebPage on every page, plus Service and FAQPage on the home page and breadcrumbs elsewhere. The FAQ structured data copies the FAQ text on the page, so update both together.
- `robots.txt` and `sitemap.xml` are at the root. Update `<lastmod>` in the sitemap when page content changes.
- Fonts are self-hosted in `assets/fonts/` (DM Sans, DM Serif Display, WindSong and Cormorant Garamond are SIL Open Font License fonts from Google Fonts). WindSong is subset to "Erin Silva" and Cormorant Garamond to "SOLENNE", so changing those words needs a new subset.
- The hero shows a still first frame (`ai-coordinator-demo-poster.webp`) and swaps in the animation after the page loads.
- Images in `/assets` are cached for a year, so give a replaced image a new filename (or a `?v=` query) rather than overwriting it.
