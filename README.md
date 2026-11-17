# H1 AI Advertising — MedSpa AI Booking Engine site

Static site, no build step.

## Deploy to Vercel
- **Dashboard:** New Project → upload/import this folder (or push it to a GitHub repo and import). Framework preset: **Other**. Leave build command and output directory empty.
- **CLI:** `npm i -g vercel` then run `vercel` (preview) and `vercel --prod` from this folder.

`vercel.json` turns on clean URLs, so pages live at `/`, `/terms` and `/privacy`, and caches `/assets` for a year.

## Before going live
- Point the **Book a Discovery Call** buttons (`href="#book"` / `href="/#book"`) at your scheduling link.
- Fill in `[DATE]` on the Terms and Privacy pages, and `[Denver County]` in Terms.
- Sweet Sans Pro (`assets/fonts/`) needs a web license for public use.
