# AENural Release Checklist

Read this BEFORE every production release. These are the things that only
matter (or can only be checked) at release time. Development and localhost
cannot show them, because localhost has no network distance and no
production settings.

## Before the release

1. **Dev branch is complete and green.** Everything merged into
   `dev/aenural-hybrid` that should ship is there, and the GitHub CI check
   on the branch is green (lint, typecheck, tests, build).
2. **SITE_URL is set in the production build environment:**
   `SITE_URL=https://aenural.com`
   This single setting controls four things. Without it the live site gets:
   - an EMPTY sitemap (`/sitemap.xml` with zero pages)
   - no `Sitemap:` line in `robots.txt`
   - no canonical URL on any page
   - no Open Graph image/URL and no JSON-LD structured data
   (The code checks this on purpose — see `src/lib/site-origin.ts`.)
3. **No dev-only routes ship.** `/dev/*`, `/tools/auto-caption-generator`,
   `/tools/podcast-to-captions` and `/api/dev/*` must stay out of the
   production build unless a product is deliberately being launched.

## After the release — ask Muse to verify live

Tell Muse "release kar diya". Muse then measures aenural.com and reports:

- [ ] `/sitemap.xml` lists all pages (not zero)
- [ ] `robots.txt` contains the `Sitemap:` line
- [ ] A tool page (e.g. `/tools/srt-merger`) has a canonical URL and a
      JSON-LD script (`WebApplication`)
- [ ] Fonts are served as the small `.woff2` files (not the old `.ttf`)
- [ ] Homepage videos are the compressed files and send the long
      `Cache-Control` header
- [ ] Dev-only routes return 404 on the live site
- [ ] Total homepage weight compared with the previous release

## Owner check (only the owner can do this one)

- [ ] Open the live site on **mobile data** and click through 3-4 pages
      from the homepage. Navigation should feel like a normal website.
      (This problem was first noticed on live + mobile data; localhost
      always opens instantly and can never show it.)

## If something is missing after release

Stop and check `SITE_URL` first — it is the cause of most release-time
SEO symptoms. Do not write new code for a settings problem.

Status notes live in `docs/aenural-release-checkpoint.md`.
