# H1 AI Advertising — MedSpa AI Booking Engine site

Static site, no build step.

## Deploy to Vercel
- **Dashboard:** New Project → upload/import this folder (or push it to a GitHub repo and import). Framework preset: **Other**. Leave build command and output directory empty.
- **CLI:** `npm i -g vercel` then run `vercel` (preview) and `vercel --prod` from this folder.

`vercel.json` turns on clean URLs, so pages live at `/`, `/book`, `/terms` and `/privacy`, and caches `/assets` for a year.

Every booking button links to `/book`, which embeds the scheduling calendar from go.h1aiadvertising.com.

Shared motion and interaction styles live in `assets/motion.css` and `assets/motion.js`. Because `/assets` is cached for a year, bump the `?v=` number on those two links in every page after editing them.

## Before going live
- Set `og:image` to a full URL on the live domain (e.g. `https://example.com/og-image.jpg`); Facebook and LinkedIn ignore relative paths.
- Fill in `[DATE]` on the Terms and Privacy pages, and `[Denver County]` in Terms.
- Sweet Sans Pro (`assets/fonts/`) needs a web license for public use.
