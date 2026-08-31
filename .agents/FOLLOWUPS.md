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

- **`subsets` in `src/lib/fonts.ts` is `["latin", "latin-ext"]`, and that is not a
  regression of the Cyrillic hard constraint.** `next/font` emits an `@font-face` per
  Google subset with its own `unicode-range` regardless of `subsets`; the list only
  controls which get preloaded. `/ru` still renders in real Commissioner and Literata —
  verified in a browser. `CyrillicIsStillOnOffer` in that file is the compile-time guard
  that used to be implicit in the `subsets` list, and it was checked to fail typecheck.
- **Literata ships without `axes: ["opsz"]`.** Worth 7 Lighthouse points and ~100 KB per
  page. This is the one design decision this wave overrode on measured evidence; it is one
  line to restore and the client may want it back. See QA-REPORT §"What still falls short".
- **The hero card is `min(600px, 66vw)`, not `min(540px, 60vw)`.** It was widened because
  the Russian h1 crossed its edge at every width from 768 up. Narrowing it again
  reintroduces that. `hyphens: auto` is *not* the fix — it fights `text-wrap: balance`;
  the QA report records both failed attempts so nobody re-derives them.

## Still open

1. **Font bytes are the entire performance gap.** 87–96 Lighthouse Performance, all of it
   LCP, all of it 160–214 KB of preloaded webfont queued ahead of the hero image. The real
   fix is a subsetted Literata self-hosted through `next/font/local`, with a guard so new
   copy cannot introduce a glyph the subset lacks. `/ru` is worst (87) because it pays for
   latin-ext it never draws — `next/font` cannot preload per locale.
2. **The catch-all 404 is unstyled and its `og:image` says `localhost:3000`.** Next's
   implicit `/_not-found` sits outside `src/app/[locale]/` so it never gets the layout's
   `metadataBase`. Reachable only for paths the middleware matcher skips: `/api/*`,
   `/_next/*`, and anything containing a dot (`/wp-login.php`). `/ro/nope` and `/nope` both
   get the proper branded 404. Fix when `app/global-not-found.tsx` stabilises — do **not**
   fix by broadening the middleware matcher, which means hand-maintaining an allowlist for
   `robots.txt`, `sitemap.xml`, the icons and `/images/*`, and 404s the sitemap if it is
   wrong.
3. **Service-card `sizes` overstates the box by ~10%**, so some viewports fetch the 828w
   file where 640w would do (~113 KiB across the page). Unscored by Lighthouse and off the
   LCP path. Only worth doing with the real box measurements to hand.
4. **The quote form still cannot deliver.** `RESEND_API_KEY` and `QUOTE_NOTIFY_EMAIL` are
   unset, so every submission shows the honest "could not be sent, call us" panel and lands
   in the server log as `[quote] UNDELIVERED`. DEPLOY.md step 4a. This is the top item on
   the post-deploy smoke checklist.
5. **Never tested:** real video playback (needs Stream credentials — only the unhappy path
   is verified), real email delivery, the live domain/DNS/TLS, non-Chromium browsers, and a
   real screen reader.
