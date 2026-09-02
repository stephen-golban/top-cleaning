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
2. ~~**The catch-all 404 is unstyled and its `og:image` says `localhost:3000`.**~~
   **Closed by wave 11**, and one sentence of this entry was simply false: it said
   `/ro/nope` and `/nope` "both get the proper branded 404". They did not, live or
   locally — see wave 11. The `localhost` `og:image` is gone (the share card moved
   to `public/`, so the root file convention no longer attaches to `/_not-found`)
   and every unmatched *in-locale* path now renders the branded 404 through a new
   `[locale]/[...rest]` catch-all. Next's own `/_not-found` still answers dotted
   paths, `/api/*` and `/_next/*`, and is still deliberately left alone: do **not**
   broaden the middleware matcher, which means hand-maintaining an allowlist for
   `robots.txt`, `sitemap.xml`, the icons and `/images/*`, and 404s the sitemap if
   it is wrong. **And do not reach for `experimental.globalNotFound` on Next
   15.5.24 — wave 4 tried it and it turns every `notFound()` inside a locale route
   into a 500.** Evidence and the before/after route table are in QA-REPORT
   §"What still falls short" 4.
3. ~~**Service-card `sizes` overstates the box by ~10%.**~~ Investigated in wave
   4 and **there is nothing to fix**: `image-delivery-insight` compares the file
   against the box's CSS width and ignores device pixel ratio, so it asks for a
   370-wide file for a 370 CSS-px box on a DPR-1.75 screen. The box needs 648
   device pixels; the `srcSet` offers 640 and 828; 828 is correct and stays
   correct under any accurate `sizes`. The real lever is a ~660w derivative, which
   belongs with the re-encode when the client's photographs replace the
   placeholders.
4. ~~**The quote form still cannot deliver.**~~ **Closed 2026-09-02** — delivery
   moved to Telegram and is verified end to end against the live form. Resend is an
   unconfigured fallback and is expected to stay that way; nothing asks the owner to
   set it up (rechecked in wave 11: `.env.example` and DEPLOY.md both now say so).
5. ~~**Never tested:** real video playback (needs Stream credentials — only the
   unhappy path is verified)~~ **Closed 2026-09-02** — three videos are live behind one
   QR link, and playback is verified in a real browser per UID. Still never tested: real
   email delivery, non-Chromium browsers, and a real screen reader.

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

1. ~~**Static assets get `Cache-Control: public, max-age=0, must-revalidate` on
   Cloudflare.**~~ **Closed by wave 11.** `public/_headers` now governs the ASSETS
   binding: a year plus `immutable` for `/_next/static/*` and `/fonts/*`, one day
   for everything that is name-addressed rather than content-hashed. Verified live.
2. ~~**`/ro` and `/en` still fetch `commissioner-cyrillic.woff2` lazily**, ~21 KB,
   because the language switcher carries "Русский" in a `.sr-only` span.~~
   **Not true, and wave 11 measured it rather than reasoning about it.** They do not
   fetch it — see wave 11, "Two things this file claimed that were not true". There
   is no 21 KB there to save. The `.sr-only` span carries the *active* locale's
   endonym, which on `/ro` is "Română"; the Russian string is only ever an
   `aria-label`, which is not rendered text, plus a copy in the RSC flight
   `<script>` payload. Neither makes a browser match a font.
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
3. ~~**Production secrets are still incomplete.**~~ **Closed.** Six secrets are set —
   the three `CF_STREAM_*`, both Telegram halves, and `QUOTE_NOTIFY_EMAIL` — and both
   features are verified live. `RESEND_API_KEY` is deliberately absent and is not a
   gap: Telegram takes precedence over Resend anyway, so setting it would change
   nothing. `CF_STREAM_API_TOKEN` and `CF_ACCOUNT_ID` are still absent and must stay
   absent. Re-checked after the wave-11 deploy: the list is unchanged.
4. ~~**The DNS record list was never seen.**~~ **Closed by wave 11.** Eight records,
   all accounted for, nothing left over from the old site, nothing to delete. Full
   table in `.agents/DEPLOY.md`, "Loose ends" item 5.
5. **Still never tested**: non-Chromium browsers and a real screen reader.
   ~~real video playback~~ closed 2026-09-02. ~~real email delivery~~ — no longer a
   gap in the sense meant here: the quote form does not send email, and the one email
   path that exists (Cloudflare Email Routing forwarding `info@`, `contact@`,
   `oferte@`) was confirmed in wave 11 to have a **verified** destination, which is
   the failure mode that would have made it silently drop mail.

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

---

# Wave 7 — HTTPS enforcement (closed and opened)

Worker version `b177851e-bf42-4996-8fc5-69859b5c25c7`. Full write-up:
`.agents/DEPLOY.md`, section "HTTPS and HSTS".

## Closed by this wave

- **`http://topcleaning.md` no longer serves the site in cleartext.** It served a
  `200` with no upgrade and no HSTS until now; every quote-form submission over
  that scheme was one hostile network away from being read in transit. Plain HTTP
  now answers `308` to the HTTPS apex, preserving path, query string and locale
  prefix. Verified live: `/` (2 hops to `https://…/ro`), `/ro/contact?x=1` (1 hop,
  query intact), `www` over HTTP (1 hop — upgrade and `www` fold together),
  `/despre-noi` (2 hops, legacy 308 still applies), `/sitemap.xml`, and a
  nonexistent path.
- **HSTS ships on HTTPS responses**, `max-age=31536000; includeSubDomains`, exactly
  one header per response, and **not** on the cleartext redirect. Verified on `/`
  (307), `/ro`, `/ru`, `/en`, `/ro/servicii`, `/robots.txt`, `/sitemap.xml` and the
  `/v/` 404.
- **The zone-level "Always Use HTTPS" was tried first and refused.**
  `PATCH /zones/{id}/settings/always_use_https` → `10000 Authentication error`, as
  does the matching `GET`. The deploying OAuth token has `zone (read)`, which does
  not extend to zone settings. Still worth enabling later; now DEPLOY.md loose end 3.
- **Nothing else moved.** Re-verified after the deploy: all 24 sitemap URLs `200`
  and byte-identical to the pre-deploy list, `/` → `/ro`, `www` → apex, six legacy
  308s including the catch-all, `robots.txt` (`Disallow: /v/`, `Host:`, `Sitemap:`
  all on the apex), `sitemap.xml` (24 URLs, zero `/v/`), an invalid `/v/` token
  still `404` with `X-Robots-Tag`, `Referrer-Policy: no-referrer` and its
  no-store `Cache-Control`, and `wrangler secret list` still showing
  `QUOTE_NOTIFY_EMAIL`.

## Decisions this wave took, that a later wave should not silently undo

- **Every `has.value` in `next.config.ts` writes its own `^…$` anchors.** This is not
  style. Next anchors the value for you (`new RegExp("^"+value+"$")`); OpenNext, which
  is what actually runs on Cloudflare, does not (`new RegExp(value)`). An unanchored
  `"http"` matches `https` in production and passes locally. That shipped as version
  `399840ff` and put every HTTPS request into an infinite redirect to itself for about
  four minutes. `src/lib/https.test.mts` asserts the patterns against both compilers.
- **HSTS is set in two places on purpose.** OpenNext's `routingHandler` returns a
  middleware result before merging `next.config.ts` headers, and
  `https://topcleaning.md/` → `/ro` is such a result. Deleting either half leaves a
  real hole; deleting the middleware half leaves it on the site's front door.
- **`HSTS_HEADER` is lowercase on purpose.** The two layers merge in a plain
  JavaScript object. A capitalised key in the config does not collide with the
  middleware's normalised one, both survive, and the value ships doubled.
- **No `preload`.** It is effectively irreversible — removal takes months and only
  reaches a user when they update their browser — so it is the domain owner's call,
  not a deploy script's. Adding it is one word in `HSTS_VALUE` (`src/lib/https.ts`)
  plus a submission at <https://hstspreload.org>; do not add it without being asked.
  Note the prerequisite: `includeSubDomains` must be, and is, true.
- **`includeSubDomains` is safe only while `www` is the zone's only other hostname.**
  Checked at the time: `www` is a Custom Domain on this same Worker, HTTPS-only, and
  the `MX` records are Cloudflare Email Routing, which is not HTTP. Adding an
  http-only subdomain later breaks it for a year per visitor.
- **Verify on local workerd before deploying anything that touches routing.**
  `npx wrangler dev --local` plus a spoofed `x-forwarded-proto` reproduces the
  Cloudflare routing layer exactly, including both bugs above. It would have caught
  the outage. The recipe is in DEPLOY.md.

## Opened by this wave

- ~~**Two paths still answer on plain HTTP**~~ **Closed 2026-09-02** by the zone-level
  **Always Use HTTPS**, which runs ahead of everything the Worker can reach and now
  answers cleartext with a `301` (verified: `http://topcleaning.md/ro/contact?x=1`).
  The description below is kept because it is why the app-level rules alone were never
  going to be enough. Two paths used to answer on plain HTTP, both handled in front of
  the Worker: static assets served by the ASSETS binding (`/favicon.ico`, `/logo.svg`,
  `/images/*`, `/fonts/*`, `/_next/static/*`) and `/robots.txt`, which Cloudflare's
  managed robots.txt intercepts. The robots.txt case is cosmetically odd — a `200`
  carrying a stale `Location` header and only Cloudflare's managed block, without the
  site's own `Disallow: /v/` and `Sitemap:` lines. No practical impact (crawlers read
  the HTTPS copy, `/v/` is protected by `X-Robots-Tag` and unguessable tokens), and
  both are fixed by the zone toggle rather than by more application code. Do not try to
  dodge it with a path-exclusion regex in `redirects()`; the destination compiler
  URL-encodes a single catch-all param's slashes, and the risk is another outage for a
  documentation-level benefit.

## Observed, not changed

- **Live Lighthouse mobile on `/ro`** (7 runs): performance 91–96, median 91,
  mean 92.0; accessibility 100, best practices 100, **SEO 100** (was 92 — Lighthouse
  now accepts the `Content-Signal:` lines in Cloudflare's managed robots.txt). CLS 0,
  TBT 0–10 ms throughout. The recorded pre-deploy figure was 94. `/ru` moved the same
  way, 93 → 90, and LCP rose ~0.4 s on both, which is the signature of network
  conditions rather than of this change: no redirect fires on either URL, and the only
  difference in those responses is 62 bytes of HSTS header. TTFB measured 0.16–0.25 s.

---

# Wave 8 — Telegram delivery for the quote form (closed and opened)

Code only. **Not deployed**, deliberately: no Telegram secrets exist yet, so a deploy
would ship a change with nothing to exercise it. The owner deploys after step 5 of
`.agents/telegram-setup.md`.

## Closed by this wave

- **The quote form now has a delivery provider the client will actually configure.**
  Telegram, over the Bot API's `sendMessage`, added as a second implementation of the
  existing one-method `QuoteDelivery` interface in
  `src/components/forms/quote/delivery.ts`. Plain `fetch`, no SDK, no `node:` builtins —
  it runs on workerd unchanged. `action.ts`, `fields.ts` and `quote-form.tsx` are
  untouched: the action still does not know a provider exists.
- **Wave 5's "real email delivery was never tested" is now moot for the primary path.**
  Email is no longer the plan. Resend stays in the file, unconfigured, as the fallback.
- **The unhappy path is unchanged and is now covered by tests**, not just by reading:
  no provider, a 4xx from Telegram, a `200` carrying `ok:false`, and an unreachable
  Telegram all produce the same `[quote] UNDELIVERED …` log with the full submission and
  the "could not be sent" panel. There is still no path to a false success.
- **Owner-facing runbook**: `.agents/telegram-setup.md`, plus `pnpm telegram:chat-id`
  (`scripts/telegram-chat-id.mjs`), which reads the token from a file so it is
  never typed on a command line or pasted into a chat. (That file was `.env.local` when
  this was written; it is `.dev.vars` now — see the `.env.local` leak entry below.
  `scripts/stream.mjs` was moved the same way on 2026-09-02.)

## Decisions this wave took, that a later wave should not silently undo

- **Precedence is Telegram, then Resend, and it is fixed in code.** No
  `QUOTE_DELIVERY=` switch: a third setting is a third thing to get wrong, and the
  fallback the client understands is "delete the Telegram secrets". When both are
  configured Telegram wins and no email is sent — sending both would double every
  notification while doubling the ways a submission can half-fail.
- **Both Telegram variables are required together.** `TELEGRAM_BOT_TOKEN` alone is not
  a configured provider; it falls through to Resend, and then to the undelivered path.
  The `missing` list names every absent variable from *both* providers, because "which
  half did I forget" is the question that log line has to answer.
- **HTML parse mode, not MarkdownV2.** MarkdownV2 requires escaping eighteen
  characters, of which `.`, `-`, `(` and `)` appear in ordinary Romanian prose and in
  every phone number a visitor types; one miss is a 400 and a lost job. HTML mode needs
  exactly three (`&`, `<`, `>`), which is auditable. `"` is deliberately *not* escaped:
  Telegram parses only `&amp; &lt; &gt; &quot;`, and outside a tag attribute — there are
  none — `&quot;` would render literally.
- **The visitor's number is sent as bare E.164 text, not as a `tel:` anchor.** Telegram's
  servers auto-detect a `+`-prefixed international number into a tappable `phone_number`
  entity, which is the one-tap callback this whole business runs on. A `tel:` href would
  read better in source but Telegram only accepts a short allowlist of URL schemes in
  anchors and 400s on the rest — trading a working call button for an undelivered
  message. Do not "improve" this into a link without testing a real send first.
- **Messages are clamped to 4096 UTF-16 code units without splitting an HTML entity.**
  Escaping grows one character into five, so the form's own 2000-character details limit
  can produce 10,000 units. A half-written `&am` is a parse error, i.e. a lost job, so
  `clampEscapedHtml` backs off to the last complete entity and appends `[…text scurtat]`.
- **Every string the provider throws goes through a redactor.** Telegram puts the bot
  token in the request *path*, not a header, so any error quoting a URL quotes the
  credential — including a `fetch` failure's `cause`, which is why the network-failure
  branch re-throws a fresh `Error` with no `cause`.
- **`createTelegramDelivery`'s third argument (`apiBase`) is a test seam.** It is not
  read from the environment and has no production caller. It exists so the tests can
  exercise the real `fetch` against a stub server on localhost.
- **27 new tests** in `src/components/forms/quote/delivery.test.mts` (80 → 107): all
  four env combinations plus the half-configured ones, hostile input (markdown
  metacharacters, tag and entity injection, newlines, 2000 characters of `&`), the
  4xx / `ok:false` / unreachable paths, and four separate assertions that the token
  reaches neither an error message, a stack, the provider object, nor the message body.

## Opened by this wave

1. ~~**Nothing is deployed and nothing has ever been sent.**~~ **Closed 2026-09-02.**
   Bot `@TopCleaningMD_Bot`, chat id `5127988710` (Ștefan, @ste_ghj). Both secrets set,
   deployed as Worker version `ada1deb5-1843-4094-8273-1229d94a137a`, and proved with
   three real submissions through the live form in `ro`, `ru` and `en` — honouring the
   honeypot and the 2.5-second timing gate rather than disabling them. Details in
   `.agents/DEPLOY.md`, "The 2026-09-02 deploy".
2. **`079022023` is not a credential and cannot be one.** The owner supplied it as
   "the Telegram number". A bot cannot address a message by phone number; delivery
   requires the numeric chat id from the `/start` flow. That number is already the
   public business number on the site. Recorded in `.agents/telegram-setup.md` so it
   does not get re-litigated.
3. ~~**The `phone_number` auto-detection has not been observed on a real device.**~~
   **Closed 2026-09-02 — it works.** All three live test messages come back carrying a
   `MessageEntity` of type `phone_number` spanning `+37379022023`, alongside the `bold`
   entities for the labels, so the number is tappable straight into a call. Observed by
   reading the message objects back off Telegram rather than by trusting the send: the
   bot API has no "read my own message", so each message was forwarded within the chat
   and the returned `Message.entities` inspected, then the forward deleted. The `<code>`
   tap-to-copy fallback stays documented but is not needed — leave the number bare, and
   still do not "improve" it into a `tel:` anchor.
4. **Wave 5 item 3 is now half-closed.** `RESEND_API_KEY` is still unset and will
   probably stay that way. Stream credentials are still absent and unrelated.
5. **A secret can be baked into the Worker by a `.env` file, and once was.** Found on
   2026-09-02: Next loads `.env.local` at build time and `@opennextjs/cloudflare`
   copies everything it loaded into `.open-next/cloudflare/next-env.mjs`, which is
   bundled into the uploaded Worker — so deploy `fdaf2174` shipped the live bot token
   in plaintext inside the script. Remediated by moving the runtime secrets to
   `.dev.vars`, deleting `.env.local`, and redeploying as `ada1deb5`; `pnpm deploy` now
   runs `scripts/check-build-env.mjs`, which aborts the deploy if the bundle carries any
   non-`NEXT_PUBLIC_*` variable. **Fully closed 2026-09-02: the token was rotated.**
   The owner sent `/revoke` to @BotFather and set the replacement himself with
   `wrangler secret put TELEGRAM_BOT_TOKEN`, so **the token sitting in the `fdaf2174`
   bundle is now inert** — revoking it invalidates it everywhere, and nothing has to be
   scrubbed from Cloudflare's version history. Verified by effect on the live site, not
   by reading the secret: a real submission through `https://topcleaning.md/ro/contact`
   returned the success panel, which the server action only reaches when Telegram's
   `sendMessage` answers 2xx without `ok:false`. See "Token rotation, 2026-09-02" in
   `.agents/telegram-setup.md`.
6. ~~**`.env.example` still describes the old layout.**~~ **Closed.** It leads with the
   where-does-each-value-go table, and wave 11 also made the Resend block say plainly
   that it is optional and has never been configured — Telegram is the live path.

---

# Wave 8 — token rotation and re-verification (2026-09-02)

The bot token leaked into the `fdaf2174` Worker bundle (wave 7, item 5) has been
**revoked via @BotFather and replaced.** The owner set the new value himself with
`wrangler secret put TELEGRAM_BOT_TOKEN`; no agent has read, held or logged it.

## Verified

- **Delivery still works.** A real submission through the live form at
  `https://topcleaning.md/ro/contact` — service *Curățenie generală*, details
  `TEST — rotire token, ignorați…`, phone `079022023` — rendered the success panel
  ("Cererea a fost trimisă."), not the "could not be sent" fallback. The anti-spam
  defences were honoured, not disabled: the honeypot was left empty and the browser's
  own timestamp was posted after a genuine 4.57-second wait, so the 2.5-second gate ran
  and passed.
- **The success panel is proof of a Telegram `2xx`.** `submitQuote` returns
  `{ status: "success" }` on that path only after `delivery.send()` resolves, and
  `createTelegramDelivery` throws on a non-2xx *and* on a 200 carrying `ok:false`. A
  dead token would be `401`, a wrong chat id `400 … chat not found`; either would have
  shown the failure panel.
- **No `[quote] UNDELIVERED` in the log.** `wrangler tail` was running across the
  submission: the `POST /ro/contact` server-action request came back `outcome: ok`,
  `exceptions: []`, `logs: []`, HTTP 200, `wallTime 3410ms` — the wall time being the
  outbound call to `api.telegram.org`.
- **No redeploy was needed, and none was done.** `wrangler secret put` is a runtime
  change: Cloudflare recorded it as a version with `Source: Secret Change`
  (`b21881ab-a2fc-45bd-a645-002b8900d55b`, 08:09:03Z) carrying the *same script* as
  `ada1deb5`, and rolled it to 100% by itself. `wrangler tail` confirms the request was
  served by `b21881ab`. No `pnpm deploy` was run and no bundle was rebuilt.
- **Regression sweep clean.** `/ro`, `/ru`, `/en` → 200. Cleartext `http://` → 308 →
  HTTPS with no HSTS on the cleartext hop. An invalid `/v/` token → 404 carrying
  `x-robots-tag: noindex, nofollow, noarchive, nosnippet`, `referrer-policy:
  no-referrer` and the no-store `Cache-Control`. `sitemap.xml`: 24 URLs, zero `/v/`.

## Not verified, and why

- **The `message_id`, and the `phone_number` entity, were not re-observed.** The bot
  API cannot read back its own outbound messages; the only technique that works is to
  forward the message within the chat and read `Message.entities` off the
  `forwardMessage` response — and that needs the bot token in hand. The token is
  deliberately unreadable: Cloudflare never hands a secret's value back, and the copy in
  the local `.dev.vars` is the old, revoked one. Confirming it would have meant handling
  the credential, which was out of scope, so it was skipped rather than faked.
- **This is a small gap, not an open risk.** `formatTelegramMessage` has not changed
  since commit `40b848f`, which predates the `ada1deb5` run where the `phone_number`
  entity was observed on all three test messages. The message text is byte-identical in
  shape and the number is still sent as bare E.164, so Telegram's server-side
  auto-detection has nothing new to work with. If someone wants certainty, the owner can
  simply open the chat and tap the `Telefon:` line on the new test message.
- **The chat id was not read back either.** It is a secret too. What the success panel
  proves is that whatever chat id is configured accepted the message — a stale one would
  have produced `400 … chat not found` and the failure panel.

## Left behind

One more test message is now in the owner's Telegram, in Romanian, saying it is a token
rotation test and using the company's own public number `079 022 023`. Delete it, along
with the three from `ada1deb5`, whenever convenient.

---

# Wave 9 — the private video feature: blocked at step 1, and `links.ts` hardened (2026-09-02)

The task was steps 3–9 of `.agents/video-setup.md`: mint a signing key, upload three
clips locked, register them as one playlist behind one QR code, deploy, and prove
playback works and unsigned access does not. **None of that happened, because step 1 is
not actually done.**

## The blocker

The `CF_STREAM_API_TOKEN` in `.dev.vars` is a real, active Cloudflare API token — but its
permissions were granted on **zones**, not on the **account**:

- `GET /user/tokens/verify` → `200 active`
- `GET /zones` → 200, five zones, four of them reporting `#stream:edit`
- `GET /accounts` → **200 with an empty list** — the token is scoped to no account at all
- `GET /accounts/b8348ba8b3e65b3b3dd2ad6324a280f6/stream` → **403 `10002`**

Cloudflare Stream is an account-scoped API (`/accounts/<id>/stream`), so a zone-scoped
`Stream:Edit` authorises nothing here. The 403 says only "Authorization Failure", which
reads as a *missing* permission rather than a *misplaced* one — which is why this cost an
hour. The `wrangler` OAuth token was checked as an alternative and has no `stream` scope
at all (confirmed against the live API, not just `wrangler whoami`).

**To unblock:** redo `.agents/video-setup.md` step 1 with both permission rows set to
`Account`, and `Account Resources` set to `Include | Golban.stephen@gmail.com's Account`.
Then `pnpm video:stream doctor`, which was added for exactly this and prints one `[ok]` /
`[FAIL]` line per failure mode without ever printing the token.

## Closed by this wave

1. **`src/lib/video/links.ts` no longer holds a plaintext token.** This was a real
   weakness, not a theoretical one: the repository is public
   (<https://github.com/stephen-golban/top-cleaning>), so the documented design — paste
   the token into `links.ts` and commit — published the password with the code. And it
   took the *second* gate down with it, because the Worker signs a playback JWT for
   whoever presents a token it recognises; "the videos are still protected by signed
   URLs" would have been false. The file now stores `tokenHash`, the base64url SHA-256 of
   the token. `resolveVideoLink` hashes the token off the URL and compares hashes.
2. **The constant-time property is preserved.** Both entry forms reduce to one match key
   (`videoLinkKey`), the keys are precomputed with the catalog, and the lookup is the same
   double-HMAC `timingSafeIndexOf` sweep as before — now over two fixed-length hashes, so
   it costs the same whatever the token was.
3. **The mistake is refused, not merely discouraged.** A file entry carrying a plaintext
   `token` is dropped at load with a warning naming the reason, so the failure is a dead
   link somebody investigates rather than a leaked video. `catalog.test.mts` asserts the
   shipped file has no plaintext token; `tokens.test.mts` pins the Worker's Web Crypto
   hash to the CLI's `node:crypto` hash, since a disagreement there would 404 every link.
4. **The CLI keeps the secret in files.** `pnpm video:token --out FILE` writes the token
   to a gitignored file (it asks `git check-ignore` and refuses otherwise) and prints only
   the hash; `pnpm video:qr --token-file FILE` reads it back, so the token never appears
   on a command line or in a session transcript.
5. **`pnpm video:stream upload <FILE>`** now exists: it uploads with `requireSignedURLs`
   set *in the upload request*, so a video is never briefly public, then waits for
   encoding and refuses to report success unless it reads the lock back on.
6. **Deployed** as `62ad1330-11c8-4e42-ba30-97185cd46d14`, with the full regression sweep
   green (below).

## Verified

- **The hashed lookup works on the Workers runtime**, not just in unit tests. Built with
  `opennextjs-cloudflare` and served under `wrangler dev` with a throwaway RSA signing key
  and a `PRIVATE_VIDEO_LINKS` entry holding only a `tokenHash`: the matching token got
  `200` with the localised title and a two-clip playlist rendered, a non-matching token
  got `404`, and neither Stream UID appeared anywhere in the HTML. The fixtures were
  removed afterwards and `.dev.vars` restored byte-identical (checksum compared).
- **Live regression sweep after deploy.** `/ro` `/ru` `/en` → 200. `http://` → 308 →
  HTTPS. `www` → 308 → apex. All six legacy redirect shapes → 308 → 200 at the right
  destination. `sitemap.xml`: 24 URLs, zero `/v/`. `robots.txt` still carries
  `Disallow: /v/`. An invalid `/v/` token → 404 with `x-robots-tag: noindex, nofollow,
  noarchive, nosnippet`, `referrer-policy: no-referrer` and the no-store `Cache-Control`,
  and no token echoed into the body.
- **`wrangler secret list`** is `QUOTE_NOTIFY_EMAIL`, `TELEGRAM_BOT_TOKEN`,
  `TELEGRAM_CHAT_ID` — no `CF_STREAM_*`, as expected while step 1 is unfixed, and no
  `CF_STREAM_API_TOKEN` or `CF_ACCOUNT_ID`, which must never be there.
  **Updated 2026-09-02:** the three `CF_STREAM_*` secrets are now set as well, making six.
  `CF_STREAM_API_TOKEN` and `CF_ACCOUNT_ID` are still absent, and still must be.

## Not verified, and why

**Everything in this section was closed on 2026-09-02.** Kept, struck through, because
what was untested and why is the useful part of the record.

- ~~**Real playback.**~~ Three videos are uploaded and one QR link plays them as a
  playlist. Verified in headless Chrome against the live site: the player fetches its
  manifest (200) and pulls real `video/mp4` segments — 1.06 MB, 3.57 MB and 2.90 MB for
  clips 1, 2 and 3. Each clip's signed JWT was decoded and its `sub` matches the intended
  UID in the intended playlist position.
- ~~**That an unsigned Cloudflare delivery URL is refused.**~~ Tested, for all three
  UIDs, on both `videodelivery.net` and the customer subdomain, across
  `manifest/video.m3u8`, `manifest/video.mpd`, `thumbnails/thumbnail.jpg` and
  `downloads/default.mp4`: every one is `401 unauthorized`, and a browser pointed at the
  bare player is served zero bytes of video.

  One trap for whoever repeats this: `https://iframe.videodelivery.net/<UID>` answers
  **200** even for a correctly locked video. That is Cloudflare's player shell, not the
  video; every request it then makes is refused. Test the manifest, not the player, or
  you will report a leak that does not exist.
- ~~**`pnpm video:stream upload` has never run against Cloudflare.**~~ It has now, three
  times, and it worked as designed: it sets `requireSignedURLs` in the upload request,
  reads the flag back, and refuses to report success without it.
- ~~**The three source clips were not touched.**~~ All three uploaded in the intended
  order 2549 → 2615 → 2559, all locked, all behind one token. UIDs are in
  `.agents/video-setup.md`.

## Decisions this wave took, that a later wave should not silently undo

1. **`links.ts` stores hashes, and that is not negotiable while the repo is public.** If
   someone "simplifies" it back to plaintext tokens, every link in the file is a published
   password. The load-time refusal and the test exist to make that hard to do by accident.
2. **The hash is unsalted SHA-256, deliberately.** Not an oversight and not a place for
   bcrypt/argon2: the input is 192 uniform random bits, so there is no dictionary and
   nothing to precompute, and this runs on the request path once per catalog entry.
3. **`PRIVATE_VIDEO_LINKS` may still carry plaintext tokens.** It is a Worker secret, not
   a public file, and keeping that form means a link can be added or revoked in one
   command. Both forms reduce to the same key, so either can override the other.
4. **`loadVideoCatalog` and `mergeVideoLinks` are async now.** Hashing is async on Web
   Crypto and there is no synchronous SHA-256 in the Workers runtime. The catalog and its
   keys are computed once per environment value and memoised, so this is not per-request
   work.

## Opened by the video wave (2026-09-02)

1. ~~**`scripts/stream.mjs` has no tests, and it now does something load-bearing.**~~
   **Closed 2026-09-02 by the rotation wave** — see "Wave 10" below. `toPkcs8Pem` is
   exported and covered by `scripts/stream.test.mts`, and `pnpm test` now globs
   `scripts/**/*.test.mts` as well as `src/**/*.test.mts`.
2. **Clip 2 (`IMG_2615.MOV`) is 848×478.** Knowingly accepted; it is the only copy that
   exists. It sits between two 1080×1920 portrait clips, so it is noticeably softer, and
   Cloudflare cannot add detail that was never filmed. If a better master appears, upload
   it and swap the UID in `links.ts` — the printed QR code keeps working untouched.
3. **The clips have no individual titles**, so the playlist reads "Videoclipul 1/2/3".
   Honest rather than good: nobody who wrote the entry had watched the videos, and
   inventing descriptions of someone's work is worse than numbering it. Whoever knows
   what each clip shows should add a per-clip `title` in `links.ts`.
4. **Nothing expires a link.** Revocation is manual — delete the entry from `links.ts`
   and deploy. Fine for one card; if these go out to many clients, a per-link expiry
   date would be worth more than another lock.

---

# Wave 10 — rotating the leaked link token (2026-09-02)

## Why this wave happened

The private-video link token was printed into an assistant's conversation transcript, so
it had to be treated as public. The specific mistake is worth naming, because it is the
kind that repeats: a command stripped the comment lines out of a secrets file and printed
what was left. Nobody set out to display a token; a filter did it as a side effect.

The exposure was real but bounded. The three Stream videos are `LOCKED` with
`requireSignedURLs`, so the leaked token granted exactly what scanning the printed QR
grants — watch the owner's three private clips — and nothing more. No account credential,
no signing key and no API token was in that transcript. But "anyone with the transcript
can watch them" was reason enough to burn the link.

## Closed by this wave

1. **The token is rotated and the old one is dead.** A fresh 192-bit token was generated
   into the gitignored `qr-codes/portofoliu.txt`, its hash replaced the single
   `tokenHash` in `src/lib/video/links.ts`, and the site was deployed as
   `b83f2503-f8b1-44f3-a58c-2f32b94855cc`. The old link now returns the ordinary 404.
2. **No copy of the old token survives.** The old token file was overwritten with
   `rm -P`, and the QR SVG and PNG were regenerated over the same filenames, so there is
   no stale artefact anyone could print or scan by accident.
3. **`scripts/stream.mjs` is under test** (closing item 1 of the previous wave).
   `toPkcs8Pem` is now exported, and `scripts/stream.test.mts` generates a real PKCS#1
   RSA key, converts it, and imports the result through `crypto.subtle.importKey` — the
   exact call the Worker makes. The strongest assertion is not that the output looks like
   PKCS#8 but that a signature made by the converted key **verifies against the original
   public half**, which is what would catch a conversion that produced a well-formed but
   different key. It also covers the base64-wrapped and `\n`-escaped shapes the PEM
   travels in, idempotence on an already-PKCS#8 key, and that the output passes the
   Worker's own `normalizePrivateKeyPem` gate — closing the loop between the CLI that
   writes the key and the runtime that loads it. 8 tests; suite is 117 → 125.
4. **`pnpm test` now covers `scripts/`,** not just `src/`. Importing `stream.mjs` used to
   run the CLI and call `process.exit`, which would have taken the test runner with it,
   so `main()` is now behind an entry-point guard. `pnpm video:stream` and
   `pnpm video:stream list` were both run afterwards to confirm the CLI still works.

## Verified

- **The old token returns a clean 404** — the point of the exercise. Confirmed against
  the live site, in contrast with a pre-deploy baseline that recorded it returning 200,
  so the 404 is evidence of the rotation rather than of a mistyped probe.
- The new link returns 200 in `ro`, `ru` and `en`, with
  `X-Robots-Tag: noindex, nofollow, noarchive, nosnippet` and a `noindex` meta tag.
- **All three clips genuinely play**, driven by headless Chrome: 1.12 MB, 3.17 MB and
  2.78 MB of media fetched, `readyState` 4, and `currentTime` advancing 3.00s in each.
  The decoded dimensions and durations match the three UIDs in their intended playlist
  order — 360×640/12.3s, 638×360/64.9s, 360×640/76.3s. All three signed posters loaded.
- The regenerated QR was decoded programmatically: it resolves to the new link, does not
  contain the old token, and the SVG and PNG encode the same URL.
- All three videos still read `LOCKED` in `pnpm video:stream list`.
- Regression: `/ro` `/ru` `/en` 200; `http://` → 308 → https; `sitemap.xml` 24 URLs with
  zero `/v/`; `robots.txt` still disallows `/v/`; an invalid, a malformed and the burned
  token all 404 with no `tokenHash`, no Stream UID, no delivery hostname and no JWT in
  the response.
- No `PRIVATE_VIDEO_LINKS` Worker secret exists (`wrangler secret list`), so `links.ts`
  is the only source of links and editing it is a complete revocation.

## Observed, not changed

1. **A 404 page echoes the token from the URL back into the Next.js RSC flight payload.**
   It is the visitor's own path segment, on a `noindex` / `no-store` page, so it reveals
   nothing the requester did not already type — but it does mean a `/v/` URL in a shared
   browser session or a screenshot carries the token in the HTML as well as the address
   bar. Not worth a fix; worth knowing before someone screenshots a 404 into a ticket.
2. ~~**No `.test.mts` file is in the `tsc` program.**~~ **Closed by wave 11.** The
   include now carries `**/*.mts`, `allowImportingTsExtensions` makes the explicit `.ts`
   specifiers (which `node --experimental-strip-types` requires) legal, and the three
   real type errors that surfaced were fixed in the tests without weakening a production
   type. 125 tests, all typechecked, all still passing.

## Opened by this wave

1. **Printed QR codes from before 2026-09-02 are dead cards.** If any were handed out,
   they now lead to "this link is no longer valid". Reprint from
   `qr-codes/portofoliu.svg`. This is the unavoidable cost of rotation and the reason a
   per-link expiry (item 4 of the previous wave) would be worth more than another lock.
2. **Rotation is still a hand-run checklist.** It is now written down under "Rotating a
   link token" in `.agents/video-setup.md`, but each step is manual, and the one step
   that proves anything — confirming the *old* link 404s — is the easiest to skip. Note
   the trap recorded there: a fresh Worker version takes a minute or two to reach every
   edge, and probing too early shows the old link still answering 200.

---

# Wave 11 — caching, the 404, the type gap, and the audits nobody had run (2026-09-02)

Worker version `be86e6ba-a6bd-4271-9554-a79c0bf26149`. Three code commits plus this
record. Deployed and re-verified live.

## Two things this file claimed that were not true

Both were believed, written down, and repeated across waves. Both took one measurement
to disprove, and neither had ever been measured.

1. **"`/ro` and `/en` still fetch `commissioner-cyrillic.woff2` lazily, ~21 KB"**
   (wave 4, opened item 2). They do not, and there is nothing to save. Measured two
   independent ways against the live site: five Lighthouse runs per locale, whose
   `network-requests` show `/ro` fetching exactly two woff2 (both Latin, 55.9 KB) and
   `/ru` fetching four (90.6 KB); and a direct CDP session that loaded `/ro` and `/en`,
   waited well past load, **opened the mobile menu** (which renders a second
   `LanguageSwitcher`) and read `document.fonts` — both Cyrillic faces report
   `unloaded`, and no `/fonts/*cyrillic*` request is ever made.

   The mechanism the entry assumed does not exist. `LanguageSwitcher` puts the endonym
   in a `.sr-only` span **only for the active locale** — on `/ro` that is "Română". For
   the other two it is an `aria-label`, which is not rendered text and never triggers
   font matching. The only other "Русский" on the page is inside the RSC flight
   `<script>` payload. A browser matches fonts against laid-out text; neither of those
   is laid-out text.

2. **"`/ro/nope` and `/nope` both get the proper branded 404"** (wave 3, still-open
   item 2). They did not — on the live site or locally. Next renders the nearest
   `not-found` boundary only when a segment on a *matched* route calls `notFound()`.
   A path that matches no route never enters `[locale]/` at all, so it fell through to
   Next's implicit `/_not-found`: black Helvetica on white, "404: This page could not
   be found." The only way anyone had ever reached `src/app/[locale]/not-found.tsx` was
   an unknown *service slug*, because `[slug]/page.tsx` calls `notFound()` explicitly.
   That is the one case the earlier waves happened to test.

   So the page written because "a dead end here is a lost job" was not shown to anyone
   following a dead link. It is now.

## Closed by this wave

- **The `localhost:3000` `og:image` on the catch-all 404.** The branded share card moved
  from `src/app/opengraph-image.png` (a Next *file convention*, attached to every route
  below the root segment — including `/_not-found`, which sits outside `[locale]/` and
  so never sees its `metadataBase`) to `public/opengraph-image.png`. Same bytes, same
  URL, no convention. `/_not-found` now emits no `og:image` at all, and
  `grep -r localhost .next/server/app` comes back empty. Checked live on `/ro`, `/ru`,
  `/en`, `/ro/contact`, `/sitemap.xml`, `/robots.txt`, `/wp-login.php` and `/api/x`:
  zero occurrences of `localhost` in any of them.

- **Every unmatched in-locale path now renders the branded 404**, via a new
  `src/app/[locale]/[...rest]/page.tsx` that does nothing but `notFound()`. Live:
  `/ro/nope`, `/ru/nope`, `/en/nope`, `/nope` and `/ro/a/b/c` all return **404** with
  the localized page, the services, the phone number and `<meta name="robots"
  content="noindex">`. `experimental.globalNotFound` was **not** used — see wave 4.

- **Static-asset caching.** `public/_headers` replaces the ASSETS binding's
  `public, max-age=0, must-revalidate` default. Live now: `/_next/static/*` and
  `/fonts/*` → `public, max-age=31536000, immutable`; `/images/*`,
  `/opengraph-image.png`, `/favicon.ico` and the five logo files →
  `public, max-age=86400`; HTML documents untouched at `s-maxage=31536000`.

- **The `.mts` test suites are typechecked.** `**/*.ts` never matched `.mts`, so 125
  tests ran under Node and were invisible to `tsc`. `**/*.mts` plus
  `allowImportingTsExtensions` brings them in; three real type errors surfaced and were
  fixed in the tests, not by loosening a production type. Still 125 passing.

- **The DNS zone, read for the first time.** Eight records, all Cloudflare's own —
  two `AAAA` at `100::` (the IPv6 discard prefix, which is what a proxied Worker Custom
  Domain looks like), three Email Routing `MX`, and the SPF / DKIM / DMARC `TXT` trio
  that Email Routing writes. **No `A`, no `CNAME`, no leftover from the old site,
  nothing recommended for deletion.** Full table in `.agents/DEPLOY.md`, "Loose ends" 5.
  It also re-confirms the wave-7 precondition for `includeSubDomains`: `www` is still
  the zone's only other hostname.

- **Email Routing forwards to a *verified* destination.** This had never been confirmed,
  and an unverified destination fails silently. The account-scoped addresses endpoint
  still refuses every token this project has, so the rules API was used as an oracle
  instead: it rejects a rule whose destination is unverified with
  `2054 Destination address is not verified` — observed directly against a throwaway
  address — and a no-op `PUT` of the live `info@` rule, with its real destination, was
  accepted. Three enabled rules (`info@`, `contact@`, `oferte@`), catch-all `drop`
  disabled so unknown local parts bounce rather than vanish.

- **The Resend-shaped confusion in the runbooks.** `.env.example` and `.agents/DEPLOY.md`
  now say in the places somebody actually reads that Telegram is the live delivery path
  and Resend is optional and unconfigured. The post-deploy smoke checklist no longer
  tells the owner to go looking for an email that is never sent.

- **The zone-level "Always Use HTTPS" loose end** (DEPLOY.md 3). It is on, verified by
  effect: cleartext now answers `301` from Cloudflare's edge, ahead of the Worker, so it
  also covers the static assets and the managed `/robots.txt` the application rules
  could never reach.

## Live Lighthouse, before and after

Mobile, Lighthouse 13.4.1, same machine, same flags, five runs each side (plus six more
on `/ro` afterwards to widen the sample).

| | `/ro` before | `/ro` after | `/ru` before | `/ru` after |
| --- | --- | --- | --- | --- |
| Performance (median) | 93 | **91** | 91 | **89** |
| Accessibility | 100 | 100 | 100 | 100 |
| Best practices | 100 | 100 | 100 | 100 |
| SEO | 100 | 100 | 100 | 100 |
| LCP | 3.18 s | 3.36 s | 3.42 s | 3.65 s |
| CLS | 0 | 0 | 0 | 0 |
| TBT | 5 ms | 3 ms | 2 ms | 5 ms |
| TTFB | 118 ms | 155 ms | 201 ms | 201 ms |

**Two performance points down on both locales, and the honest reading is that it is not
this change.** The drop equals the run-to-run spread exactly (`/ro` 91–93 before, 90–92
after; a further six runs afterwards gave 91–92, median 91). LCP and TTFB moved together,
which is the signature of network conditions and is precisely what wave 7 recorded when
the same thing happened to a 62-byte header change. Wave 7's own seven-run `/ro` median
was **91** — the same number — so the pre-deploy 93 is the outlier, not the after-set.
And there is no mechanism: Lighthouse loads with a cold cache, so `Cache-Control` cannot
help or hurt it, and nothing else in this wave touches a byte that `/ro` downloads.

Note for anyone re-measuring: **Lighthouse 13.4.1 does not ship the `uses-long-cache-ttl`
audit at all** — it is absent from all twenty reports, before and after. The caching work
is therefore invisible to the score by construction, and `curl -sSI` is the only evidence
for it. That is expected; the win is on repeat visits, which Lighthouse does not measure.

## Decisions this wave took, that a later wave should not silently undo

- **`public/_headers` is immutable *only* where the URL carries the content hash.**
  `/_next/static/*` and `/fonts/*` are safe because a change ships as a new filename.
  `/images/*` is **not** and must not be given a year: the photographs are placeholders,
  `hero-1080.avif` keeps its name when the client's own are re-encoded, and `immutable`
  would strand a visitor on the old picture until 2027 with no way to push a fix.
  One day is the deliberate compromise.
- **The rules in `_headers` are non-overlapping on purpose.** Cloudflare applies every
  matching rule and appends repeated header values, so two rules that both set
  `Cache-Control` on one file produce a doubled, nonsensical header. That is why the
  brand files are listed one by one instead of behind a `/*`.
- **`next.config.ts`'s `headers()` and `public/_headers` are two hand-kept copies of one
  policy.** There is no shared source. The config block only ever applies under
  `next start`; the `_headers` file is what production reads. Change one, change both.
- **The share card lives in `public/`, not as a file convention.** Putting it back under
  `src/app/` reintroduces the `localhost` `og:image` on `/_not-found`. Every page already
  names the URL explicitly through `BRANDED_OG_IMAGE`, so the convention bought nothing.
- **`[locale]/[...rest]` is a catch-all, i.e. the lowest-priority match in its segment.**
  It cannot shadow `/ro/servicii`, `/ro/despre-noi` or `/ro/v/<token>`, all of which were
  re-verified after it landed. It is also **not** a fix for the implicit `/_not-found`,
  which is outside `[locale]/` and stays Next's own page.
- **`min_tls_version` is still `1.0` and was deliberately left alone.** Cloudflare's
  default. Raising it to `1.2` is one setting and is what most sites should do, but it
  locks out clients — that is the domain owner's call, not a deploy script's. Recorded
  in DEPLOY.md so it is a decision rather than an oversight.

## Skipped, with the reason

- **Per-clip video titles** (wave 9, opened item 3) — still "Videoclipul 1/2/3".
  Unchanged on purpose. Nothing about the footage has been described by anyone, and the
  only facts on record are the dimensions and durations from wave 10. Writing titles from
  a thumbnail would be inventing claims about a client's work, which is worse than
  numbering it. This needs one sentence from whoever filmed them, not another agent.
- **Cloudflare's managed robots.txt / AI Crawl Control** — explicitly out of scope. It is
  a content-licensing decision, not a technical one.

## Still open

1. **Cloudflare's managed `robots.txt` block** (wave 5, opened item 1). Unchanged and
   deliberately untouched.
2. **Nothing expires a private video link** (wave 9, opened item 4), and rotation is a
   hand-run checklist (wave 10, opened item 2).
3. **Clip 2 is 848×478** (wave 9, opened item 2) — the only master that exists.
4. **`scripts/build-fonts.py` pins upstream by sha256 against a moving branch** (wave 4,
   opened item 3). Somebody has to notice when it starts refusing to build.
5. **Never tested**: non-Chromium browsers and a real screen reader.
6. **`min_tls_version` is `1.0`.** A decision for the owner; see above.

