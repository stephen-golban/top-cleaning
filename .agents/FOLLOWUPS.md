# Open follow-ups (queued for later waves)

## SEO — legacy URL redirects (raised by content agent)
The old site used `/servicii-de-curatenie/<slug>` for service detail pages; the new route
table uses `/servicii/<slug>`. Those old paths are the SEO-valuable ones. Add permanent
(301) redirects in `next.config.ts` from every old RO/RU path to its new equivalent,
including the old locale-prefix scheme (old site: RO unprefixed at `/`, RU at `/ru`;
new site: always prefixed). Owner: SEO agent (wave 2).
NOTE: the domain currently does not resolve, so live link equity may already be lost —
still worth doing, it is cheap.

## Content decisions already made (do not re-litigate)
- `localeDetection: false` — `/` always redirects to `/ro` per DECISIONS.md.
- Hero + meta titles use sentence case, not the source's title case (which was
  grammatically wrong in both RO and RU). Follows the approved deck.
- `Services.subtitle` from the old site is dropped — direction B has no slot for it.
- No `meta.video` — the private video page ships a deliberately generic absolute title so
  the video's subject never leaks into a browser tab, share sheet or referrer.

## Contract note for the pages agent
Service names, summaries and inclusion lists come from `@/content` (typed, locale-keyed),
NOT from `useTranslations`. Page chrome, labels, CTAs, form copy, metadata and alt text
come from `messages/*.json`. See `src/content/README.md`.

## HARD CONSTRAINTS from the video feature (wave 2 must respect these)
- **`sitemap.ts` MUST NOT emit any `/v/` path.** There is no automatic guard. The private
  video route is excluded by convention only — breaking this publishes the client's
  private videos to search engines.
- **Never link to `/v/...` from anywhere on the public site.** No nav entry, no footer
  link, no "see our work" CTA. Access is QR/link only, by design.
- `next.config.ts` already has an `async headers()` block owned by the video feature
  (it sets `X-Robots-Tag: noindex` on `/v/`). If the SEO/redirects work needs `headers()`,
  MERGE into that block — do not replace it. Same file also needs the legacy 301s above.
- `src/i18n/routing.ts` maps `/v/[token]` unlocalized on purpose: a printed QR must
  resolve regardless of the scanning phone's language. Do not "fix" this.
- Video posters use a plain `<img>`, not `next/image`, on purpose — routing private frames
  through a public image optimiser would cache them publicly. Do not "optimize" this.

## Wave 1 hand-offs (wave 2 must close these)
1. **Typecheck error, cross-agent**: `src/i18n/message-parity.ts` fails because
   `src/content/images.ts` declares image slots (`about`, `contact`, `servicesIndex`)
   that have no matching `common.alt.*` entries in the message files. Fix by adding
   localized alt text for every declared slot in all three locales. Alt text is
   locale-specific and must be written, not duplicated across languages.
2. **Footer service links**: `Footer` takes an optional `services?: FooterServiceLink[]`
   prop; with it absent the column degrades to a single "Toate serviciile" link. The
   design agent deliberately refused to invent service names or guess slugs. Pass the real
   list from `src/content/services.ts` in `src/app/[locale]/layout.tsx`.
3. **No visual verification yet.** Wave 1 ran under a no-build rule and this machine has
   no headless browser, so responsive behaviour was verified by measured font advance
   widths, not by rendering. A real browser pass at 360/390/768/1024/1440/2560 is
   mandatory before ship.

## Font substitution (locked, supersedes the deck)
The approved deck used **Karla** (body) + **Fraunces** (display). BOTH are replaced,
because neither ships Cyrillic:
- Body: **Commissioner** — same humanist grotesque as Karla, near-indistinguishable in
  Latin, but with Cyrillic drawn as part of the family.
- Display/wordmark: **Literata** — variable on both `wght` and `opsz`, so
  `font-optical-sizing: auto` reproduces the deck's Fraunces optical behaviour.
Karla was verified missing Cyrillic three ways (Google Fonts CSS API, unioned `cmap`
tables of the served woff2 files, and next/font's own TypeScript types, which now make
`subsets: ["cyrillic"]` on Karla a compile error). Do not reintroduce either face.

## Wave 2 hand-off
- **No logo file exists anywhere in `public/`.** The brand mark is an inline SVG React
  component, so there is nothing a crawler, a social card, or a browser tab can fetch.
  `LocalBusinessJsonLd` therefore omits `logo` by default and accepts an optional
  `logoUrl`. Needs: a real logo file in `public/`, a favicon set, and the JSON-LD wired
  to point at it. Owner: branding agent (wave 3).
- JSON-LD `@type` is `LocalBusiness`, NOT `CleaningService` — the latter does not exist in
  schema.org. Verified. Do not "fix" this.
- Redirects use `permanent: true` (Next emits 308, which Google consolidates identically
  to a 301). Old RU home `/ru` and old RU about `/ru/o-nas` deliberately have NO redirect:
  they are unchanged paths and a self-redirect is an infinite loop.

---

# Wave 3 — QA & integration pass (closed and opened)

Full evidence in `.agents/QA-REPORT.md`. Deployment runbook in `.agents/DEPLOY.md`.
**Nothing has been deployed.**

## Closed by this wave

- **JSON-LD is rendered.** `LocalBusiness` + `WebSite` in the locale layout, `Service` on
  every service detail page, `BreadcrumbList` on every page below a locale home. Validated
  structurally against the built HTML: 81 nodes over 25 pages, no null/undefined member,
  no fabricated field, every URL absolute and on-site.
- **"No visual verification yet"** (wave 1, hand-off 3) is closed. Real Chromium, 25 pages
  × 6 widths × 3 locales, plus Lighthouse mobile on 15 URLs and axe on 50 page-states.
- **The logo/favicon/JSON-LD hand-off** from wave 2 is closed: `logo`, `image`, `og:image`
  and every icon resolve as real 200s on both the Node and the Workers runtime.

## Decisions this wave took, that a later wave should not silently undo

- ~~**`subsets` in `src/lib/fonts.ts` is `["latin", "latin-ext"]`.**~~ **Superseded by
  wave 4**: `next/font/google` is gone, and there is no `subsets` list any more. The
  observation behind it still explains why the old setup was slow.
- ~~**Literata ships without `axes: ["opsz"]`** — worth 7 Lighthouse points and ~100 KB
  per page.~~ **Superseded by wave 4**: still off, but now pinned at `opsz` 14 (the value
  Google served) and the axis costs 2–3 points and 32–50 KB, not 7 and 100.
- **The hero card is `min(600px, 66vw)`, not `min(540px, 60vw)`.** It was widened because
  the Russian h1 crossed its edge at every width from 768 up. Narrowing it again
  reintroduces that. `hyphens: auto` is *not* the fix — it fights `text-wrap: balance`;
  the QA report records both failed attempts so nobody re-derives them.

## Still open

1. ~~**Font bytes are the entire performance gap.**~~ **Closed by wave 4** (see
   below).
2. **The catch-all 404 is unstyled and its `og:image` says `localhost:3000`.**
   Next's implicit `/_not-found` sits outside `src/app/[locale]/` so it never gets
   the layout's `metadataBase`. Reachable only for paths the middleware matcher
   skips: `/api/*`, `/_next/*`, and anything containing a dot (`/wp-login.php`).
   `/ro/nope` and `/nope` both get the proper branded 404. Do **not** fix by
   broadening the middleware matcher, which means hand-maintaining an allowlist
   for `robots.txt`, `sitemap.xml`, the icons and `/images/*`, and 404s the
   sitemap if it is wrong. **And do not reach for `experimental.globalNotFound`
   on Next 15.5.24 — wave 4 tried it and it turns every `notFound()` inside a
   locale route into a 500** (`/ro/nope`, `/nope`, `/api/*`). Evidence and the
   before/after route table are in QA-REPORT §"What still falls short" 4. Revisit
   when the feature stabilises.
3. ~~**Service-card `sizes` overstates the box by ~10%.**~~ Investigated in wave
   4 and **there is nothing to fix**: `image-delivery-insight` compares the file
   against the box's CSS width and ignores device pixel ratio, so it asks for a
   370-wide file for a 370 CSS-px box on a DPR-1.75 screen. The box needs 648
   device pixels; the `srcSet` offers 640 and 828; 828 is correct and stays
   correct under any accurate `sizes`. The real lever is a ~660w derivative, which
   belongs with the re-encode when the client's photographs replace the
   placeholders.
4. **The quote form still cannot deliver.** `RESEND_API_KEY` and
   `QUOTE_NOTIFY_EMAIL` are unset, so every submission shows the honest "could not
   be sent, call us" panel and lands in the server log as `[quote] UNDELIVERED`.
   DEPLOY.md step 4a. This is the top item on the post-deploy smoke checklist.
5. **Never tested:** real video playback (needs Stream credentials — only the
   unhappy path is verified), real email delivery, the live domain/DNS/TLS,
   non-Chromium browsers, and a real screen reader.

---

# Wave 4 — the font pass (closed and opened)

Commits `98e20bf`, `8260a94`. Full evidence in QA-REPORT Part 4.
**Nothing has been deployed.**

## Closed by this wave

- **Performance.** 87–94 → **93–97** on the same fifteen URLs, mean 90.7 → 95.7,
  measured back to back on one machine. Accessibility, best practices and SEO stay
  at 100 on all fifteen, CLS stays at a measured 0, TBT stays ≤ 10 ms, axe stays
  at 0 violations over 25 pages × 2 viewports, and the 81 keyboard assertions all
  still pass. FCP on every Russian page went 1.4 s → 0.9 s.
- **Both faces are subsetted, self-hosted and preloaded per locale.** `/ro` and
  `/en` preload 54,972 B of webfont where they used to preload 162,812 B; `/ru`
  preloads 88,688 B and no longer chases a further 54,296 B of Cyrillic on demand.
- **The LCP photograph is preloaded**, art direction included, verified to fetch
  exactly one file.

## Decisions this wave took, that a later wave should not silently undo

- **`next/font/google` is gone on purpose, and `next/font/local` was not the
  replacement.** Both are import-time: they cannot preload per locale, and one
  locale layout serves all three languages. `scripts/build-fonts.py` generates the
  `@font-face` blocks and `src/app/[locale]/layout.tsx` emits the preloads, which
  is the only way `/ro` avoids paying for Cyrillic and `/ru` avoids paying for
  Latin Extended. Going back to `next/font` gives back 6 Lighthouse points.
- **`public/fonts/*.woff2`, `src/app/fonts.generated.css` and
  `src/lib/fonts.generated.ts` are generated and committed.** Never hand-edit
  them: `pnpm test` fails if a woff2 stops matching the content hash in its own
  filename, and `pnpm fonts:check` fails if the two generated files are stale.
  Regenerate with `pnpm fonts:build` (needs `python3` with `fonttools` + `brotli`;
  `pnpm build` does not).
- **The Cyrillic hard constraint is now enforced in three places, not one:** the
  compile-time guards in `src/lib/fonts.ts`, the whole-corpus check in
  `src/lib/fonts.test.mts`, and — structurally — the fact that every
  `unicode-range` is generated from the shipped file's own `cmap`, so a missing
  glyph falls through to the system stack instead of rendering .notdef. Verified
  in a real browser against the full upstream fonts: 149 characters, 0 failures.
- **The font preloads carry `fetchpriority="low"`.** That is deliberate: it lets
  the stylesheet and the LCP photograph take the bandwidth first while the font
  requests still start immediately. Worth 3 points on `/ru`. Removing the
  attribute puts the fonts back in front of the image; removing the preloads
  entirely is worse than both.
- **Literata's `opsz` axis is still off, but it is now `"opsz": 14` pinned rather
  than "the default"** — 14 is what the Google Fonts API serves, found by matching
  advance widths byte for byte, so the display cut did not change when
  `next/font` left. Shipping the live axis now costs 2–3 points and 32–50 KB per
  page (it used to cost 7 points and ~100 KB): one value in
  `scripts/build-fonts.py`.

## Opened by this wave

1. **Static assets get `Cache-Control: public, max-age=0, must-revalidate` on
   Cloudflare.** The ASSETS binding answers `/fonts/*`, `/images/*` and
   `/_next/static/*` before the Worker runs, so the `headers()` rule in
   `next.config.ts` only applies under `next start`. Everything is
   content-hashed or immutable in practice, so a `public/_headers` file could set
   a real `max-age` — but that is a site-wide caching decision and it was the same
   before this wave (`next/font`'s own files had it too), so it was left alone.
2. **`/ro` and `/en` still fetch `commissioner-cyrillic.woff2` lazily**, ~21 KB,
   because the language switcher carries "Русский" in a `.sr-only` span. Not on
   the critical path, not in Lighthouse's load window, and unchanged from before
   the wave — but a screen reader does not need a webfont, so there is a cheap
   21 KB there for anyone who wants it.
3. **`scripts/build-fonts.py` pins the two upstream fonts by sha256** against
   `raw.githubusercontent.com/google/fonts/main`, which is a moving branch. When
   upstream cuts a release the script will refuse to build and print both hashes.
   That is the intended behaviour — the metric-matched fallback overrides in that
   file were derived from the current release — but somebody has to notice.

---

# Wave 5 — the deploy (closed and opened)

**The site is live at <https://topcleaning.md>.** Worker `top-cleaning`, version
`5b65ca7c-48cd-4b5e-8cea-62f60f301799`. The "Nothing has been deployed" lines in waves 3
and 4 above are now historical. Full runbook and rollback procedure: `.agents/DEPLOY.md`.

## Closed by this wave

- **The live domain, DNS and TLS** (wave 3 "Never tested", item 5). Zone
  `topcleaning.md` was already active on the account; `topcleaning.md` and
  `www.topcleaning.md` are attached to the Worker as Custom Domains, certificate from
  Google Trust Services `WE1`. `www` folds into the apex with a 308.
- **All 24 sitemap URLs return 200 on the real domain**, every one absolute and on
  `https://topcleaning.md`. Zero `/v/` paths. Canonicals, all four hreflang alternates,
  `og:url`, `og:image` and every JSON-LD URL resolve to the apex — no `localhost`, no
  `workers.dev`, on any page checked.
- **All 13 legacy redirects fire** (308) and land on a 200.
- **`/v/<invalid>` is a clean 404 on the live domain**, with `noindex` in the markup and
  `X-Robots-Tag: noindex, nofollow, noarchive, nosnippet` plus `Referrer-Policy:
  no-referrer` on the response. Nothing about any video leaks.
- **Live Lighthouse mobile**: `/ro` 94/100/100/92, `/ru` 93/100/100/92 (perf / a11y /
  best practices / SEO), CLS 0 and TBT 0 ms on both. Local was 93–97 perf and 100 SEO;
  the real-network LCP (2.9 s / 3.1 s) explains the perf delta and item 2 below explains
  the whole of the SEO delta.

## Decisions this wave took, that a later wave should not silently undo

- **`www` → apex is in `next.config.ts` (`wwwToApex`), not a Cloudflare Redirect Rule.**
  The deploying OAuth token has zone *read* only and the Rulesets API refuses to write.
  Keeping it in the app makes it version-controlled and derives the host from
  `NEXT_PUBLIC_SITE_URL` instead of hard-coding it.
- **It is two rules, not one.** A lone `/:path*` matches the bare root with `path` unset
  and Next emits the literal string `https://topcleaning.md/:path*` as the `Location`
  header — this shipped briefly in version `f6c04047` and was caught on the live domain.
  `/:path+` cannot match zero segments, so `/` needs its own rule. Do not "simplify"
  these back into one.
- **`NEXT_PUBLIC_SITE_URL` is build-time.** It cannot be fixed with a `wrangler secret`
  or a `vars` entry; a wrong value has to be rebuilt out. `.env.production` is
  gitignored, so any new machine that deploys must recreate it.

## Opened by this wave

1. **Cloudflare injects a managed `robots.txt` block ahead of the site's own** — a
   `Content-Signal:` directive and `Disallow: /` for ten AI crawlers. The site's own
   `Disallow: /v/` group still applies (crawlers merge same-`User-agent` groups), but
   Lighthouse does not recognise `Content-Signal:` and scores `robots.txt` invalid, which
   is the *entire* 8-point live SEO gap. It is also a content-licensing decision nobody
   on this project made. Dashboard → **AI Crawl Control** → **Robots.txt**. Needs zone
   settings write, which the deploy token does not have.
2. ~~**`https://top-cleaning.ibeep.workers.dev` still serves the whole site.**~~
   **Closed by wave 6** — see below.
3. **Production secrets are still incomplete.** `QUOTE_NOTIFY_EMAIL` is now set;
   `RESEND_API_KEY` is not, so the quote form still cannot deliver, and no Stream
   credentials exist, so signed video playback cannot work. DEPLOY.md steps 4a and 4b.
4. **The DNS record list was never seen.** The token has `zone (read)` but not
   `#dns_records:read`, so `GET /zones/{id}/dns_records` fails. Both hostnames verifiably
   serve the Worker, but nobody has checked the zone for leftovers from the old site.
5. **Still never tested**: real video playback, real email delivery, non-Chromium
   browsers, a real screen reader, and the quote form's happy path end to end.

---

# Wave 6 — retiring the workers.dev URL (closed and opened)

One-line change, one redeploy. Worker version
`e35e1570-bce1-4b99-a112-837ce67ff57c`. Full write-up: `.agents/DEPLOY.md`,
section "The workers.dev URL".

## Closed by this wave

- **`https://top-cleaning.ibeep.workers.dev` no longer serves the site** (wave 5,
  opened item 2). `"workers_dev": false` in `wrangler.jsonc`; the URL now returns
  `HTTP/2 404`, `content-type: text/plain`, 17 bytes of `error code: 1042` —
  Cloudflare's "no `workers.dev` route for this Worker". The apex is now the only
  public way in.
- **`topcleaning.md` is provably unaffected.** Re-verified after the deploy: all 24
  sitemap URLs 200 and all on the apex, all three locale homepages, a service detail
  page (RO diacritics intact), `/sitemap.xml` (24 URLs, zero `/v/`), `/robots.txt`
  (`Host:`/`Sitemap:` on the apex, `Disallow: /v/` present), `/` → `/ro` (307),
  `www` → apex (308, root and deep), the three legacy 308s, and canonical + all four
  hreflang on the apex with no `localhost` and no `workers.dev` anywhere in the markup.
- **Secrets survive a redeploy** — verified, not assumed: `wrangler secret list` still
  shows `QUOTE_NOTIFY_EMAIL` after the deploy.

## Decisions this wave took, that a later wave should not silently undo

- **`wrangler deploy` now prints `No targets deployed for top-cleaning`, and that is
  fine.** With `workers_dev` off, `wrangler.jsonc` declares no routes at all — by
  design (see DEPLOY.md "Things this file deliberately does not do"). The Custom
  Domains live on Cloudflare's side and serve whatever the current deployment is.
  Do not "fix" this by adding routes to the config; check
  `wrangler deployments list` for a `(100%)` entry instead.
- **Worker Preview URLs went with it** — they share the `workers.dev` subdomain.
  If a staging URL is wanted later, `"preview_urls": true` gives per-version URLs
  instead of one permanent public mirror of production. Turning `workers_dev` back
  on is the wrong fix.
- **A rollback does not restore the subdomain.** `workers_dev` is read from
  `wrangler.jsonc` at deploy time, not stored in the Worker version, so genuinely
  reopening it means editing the file and redeploying.

## Observed, not changed

- **`/v/<token>` unprefixed answers 307 → `/ro/v/<token>`, then 404.** The token is
  preserved across the redirect, so printed QR codes still resolve, and the final
  response carries `X-Robots-Tag: noindex, nofollow, noarchive, nosnippet`,
  `Referrer-Policy: no-referrer` and `<meta name="robots" content="noindex">`.
  This is the i18n middleware's locale prefix and predates this wave — wave 5's
  "clean 404" note just did not mention the hop. Nothing leaks either way.
- **The `localhost:3000` `og:image` on the implicit `/_not-found`** (wave 3, still-open
  item 2) is still there, and is still the *only* `localhost` string in the build.
  Confirmed page by page: every locale route, the sitemap and robots.txt are clean.
