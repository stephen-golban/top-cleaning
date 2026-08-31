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
