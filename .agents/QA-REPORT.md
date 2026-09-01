# QA report — integration pass before deploy

Run against commit `89fef5b`, on a production build (`pnpm build`) served by `next start`,
audited in Chrome for Testing 152 (headless), Lighthouse 13.4.1 mobile preset,
axe-core 4.13.0.

> **Updated after the font pass (`98e20bf`, `8260a94`).** Performance was the one
> thing this report recorded as short of the bar, and the diagnosis — webfont
> bytes ahead of the hero image — held up. Both faces are now subsetted and
> self-hosted, and preloaded per locale. Every Lighthouse number in Part 2 has
> been re-measured; [Part 4](#part-4--the-font-pass) has the before/after table
> and how the Cyrillic guarantee was verified. Everything else in this report
> was re-run and still holds.

**Nothing was deployed.** No `wrangler deploy`, no `opennextjs-cloudflare deploy`. The
only wrangler command run was `wrangler deploy --dry-run`, which bundles and exits.

Every number below is a measurement. Where something falls short, it says so and says
why — see [What still falls short](#what-still-falls-short).

---

## Summary

| Area                           | Result                                                        |
| ------------------------------ | ------------------------------------------------------------- |
| Lighthouse Accessibility       | **100** on all 15 audited URLs                                |
| Lighthouse Best Practices      | **100** on all 15                                             |
| Lighthouse SEO                 | **100** on all 15                                             |
| Lighthouse Performance         | **93–97**, average 95.7 — not 100, [reason below](#1-performance-is-9397-not-100) |
| CLS                            | **0** everywhere                                              |
| TBT                            | **0–10 ms** everywhere                                        |
| axe-core violations            | **0** — 25 pages × 2 viewports, plus open-menu and form-error states |
| Horizontal overflow            | **0** — 25 pages × 6 widths                                   |
| Clipped/overflowing text       | **0** — 15 pages × 3 locales × 6 widths (was 4; fixed)        |
| Keyboard & focus behaviour     | **81/81** assertions pass                                     |
| JSON-LD                        | 81 nodes over 25 pages, all valid, 0 problems                 |
| Cloudflare Workers runtime     | Runs; server actions, routing and the private route all work  |

---

## Part 1 — Wiring that was missing

### JSON-LD was written but never rendered

Nothing mounted the components in `src/components/seo`, so no page shipped any structured
data at all. Now wired per that folder's README:

| Node             | Where                                              | Count |
| ---------------- | -------------------------------------------------- | ----- |
| `LocalBusiness`  | `src/app/[locale]/layout.tsx` — once per page       | 24    |
| `WebSite`        | same layout                                         | 24    |
| `Service`        | each service detail page                            | 12    |
| `BreadcrumbList` | every page below the locale home                    | 21    |

`LocalBusiness` and `WebSite` live in the layout rather than per page, because a `Service`
node names its provider by `{"@id": …}` reference and that reference only resolves if the
`LocalBusiness` node is on the same document.

**Validated structurally, not by a network validator** — the script is
`scratchpad/qa/validate-jsonld.mjs`, run over the built HTML in `.next/server/app`. It
asserts, on all 25 prerendered pages:

- every `ld+json` block parses as JSON, and no block contains a raw `</script`;
- `@context` is `https://schema.org` on every node;
- no member anywhere in the tree is `null` or `undefined`, no string is empty, and no
  string contains `undefined` / `[object Object]` / `NaN`;
- every URL is absolute, valid, and on `topcleaning.md` (or schema.org);
- **no fabricated field is emitted** — the script fails on `address`, `streetAddress`,
  `postalCode`, `openingHours`, `openingHoursSpecification`, `priceRange`, `sameAs`,
  `aggregateRating`, `review`, `geo`, `hasMap`, `legalName`, `vatID`, `taxID`,
  `foundingDate`, `offers`, `hasOfferCatalog`, `numberOfEmployees`, `founder`. None
  appear. This matters more than it sounds: fabricated structured data is a
  manual-action risk, and `.agents/DECISIONS.md` records that none of those facts exist;
- `telephone` is `+37379022023`, `email` is `info@topcleaning.md`, `logo` is
  `https://topcleaning.md/logo.png` — the three real facts, checked against the values
  in `src/content/contact.ts` rather than against themselves;
- exactly one `LocalBusiness` and one `WebSite` per page, never repeated;
- `WebSite.publisher` and `Service.provider` both point at `https://topcleaning.md/#business`,
  and that node is present on the same page;
- `BreadcrumbList` positions are `1..n` with exactly one item per path segment, and the
  home page carries none;
- `Service.url` equals that page's own `<link rel="canonical">`.

**Result: 0 problems.**

### The OpenGraph card was incomplete

While wiring the above, four tags turned out to be missing from every page: `og:url`,
`og:type`, `og:site_name`, `og:locale` (+ `og:locale:alternate`). `og:url` is the one
that matters here — WhatsApp, Viber and Telegram read it as the canonical identity of a
shared link, and this business's links are shared on exactly those three.

Adding them exposed a trap worth recording: **declaring `openGraph` on a page replaces
the root segment's `opengraph-image.png` file convention wholesale**, so the first attempt
silently deleted `og:image` and `twitter:image` from every page. The branded card is now
restated explicitly in `src/app/[locale]/_lib/metadata.ts` with a comment saying why.

`meta.ogImageAlt` is new in all three message files: the share card's alt text was a
single English sentence for all three languages.

### Icons and share image — all resolve

Checked as real HTTP requests against the running production server, not by looking at
the filesystem:

| Path                    | Status | Content-Type               |
| ----------------------- | ------ | -------------------------- |
| `/logo.png`             | 200    | `image/png`                |
| `/logo.svg`             | 200    | `image/svg+xml`            |
| `/favicon.ico`          | 200    | `image/vnd.microsoft.icon` |
| `/icon.svg`             | 200    | `image/svg+xml`            |
| `/apple-icon.png`       | 200    | `image/png`                |
| `/opengraph-image.png`  | 200    | `image/png` (1200×630)     |
| `/images/og.jpg`        | 200    | `image/jpeg`               |

Confirmed again over the Cloudflare Workers runtime (`pnpm preview`), where assets are
served by the `ASSETS` binding rather than by Node.

`og:image` and `twitter:image` resolve to `https://topcleaning.md/opengraph-image.png` on
every page — absolute, with `width`, `height`, `type` and localized `alt`.

---

## Part 2 — The quality bar, measured

### Lighthouse — mobile preset, production build

Emulated Moto G Power (412×823, DPR 1.75), simulated throttling, `onlyCategories` =
performance / accessibility / best-practices / seo. Raw reports in
`scratchpad/qa/lh-after-now*/` (this build) and `scratchpad/qa/lh-ship/`,
`scratchpad/qa/lh-before-now*/` (the build before the font pass).

| URL | Perf | A11y | BP | SEO | LCP | CLS | TBT | FCP |
| --- | ---: | -: | -: | --: | --- | --- | --- | --- |
| `/ro` | 96 | 100 | 100 | 100 | 2.8 s | 0 | 0–10 ms | 0.9 s |
| `/ro/servicii` | 96 | 100 | 100 | 100 | 2.8 s | 0 | 0 ms | 0.9 s |
| `/ro/servicii/curatenie-dupa-reparatie` | 97 | 100 | 100 | 100 | 2.6 s | 0 | 0 ms | 0.9 s |
| `/ro/despre-noi` | 96 | 100 | 100 | 100 | 2.9 s | 0 | 0–10 ms | 0.9 s |
| `/ro/contact` | 97 | 100 | 100 | 100 | 2.6 s | 0 | 0–10 ms | 0.9 s |
| `/ru` | 93 | 100 | 100 | 100 | 3.2 s | 0 | 0 ms | 0.9 s |
| `/ru/uslugi` | 95 | 100 | 100 | 100 | 3.0 s | 0 | 0 ms | 0.9 s |
| `/ru/uslugi/uborka-posle-remonta` | 95 | 100 | 100 | 100 | 3.0 s | 0 | 0 ms | 0.9 s |
| `/ru/o-nas` | 95 | 100 | 100 | 100 | 3.0 s | 0 | 0 ms | 0.9 s |
| `/ru/kontakty` | 95 | 100 | 100 | 100 | 2.9 s | 0 | 0 ms | 0.9 s |
| `/en` | 96 | 100 | 100 | 100 | 2.8 s | 0 | 0 ms | 0.9 s |
| `/en/services` | 96 | 100 | 100 | 100 | 2.8 s | 0 | 0 ms | 0.9 s |
| `/en/services/deep-cleaning` | 96 | 100 | 100 | 100 | 2.8 s | 0 | 0 ms | 0.9 s |
| `/en/about` | 96 | 100 | 100 | 100 | 2.9 s | 0 | 0–10 ms | 0.9 s |
| `/en/contact` | 97 | 100 | 100 | 100 | 2.6 s | 0 | 0 ms | 0.9 s |

Each figure is the **median of three or more runs** on the same production
build. Lighthouse's simulated LCP is bimodal on this machine — a page that
usually scores 96 will occasionally return 91 with no change to the bytes on the
wire — so a single run is not a measurement. The per-URL samples are in
`scratchpad/qa/lh-after-now*/`. The [before/after table](#part-4--the-font-pass)
pairs these against the pre-font-pass build measured in the same session.

Speed Index is 0.9 s on all fifteen.

Accessibility, Best Practices and SEO are 100 across the board. CLS is a true zero — the
`Photo` component owns the aspect ratio and the image is absolutely positioned inside it,
so a call site cannot introduce a shift. TBT is effectively zero because the only client
component on a public page is the mobile menu.

Performance is **not** 100. What that costs and why is in
[What still falls short](#1-performance-is-9397-not-100).

#### What was fixed to get there — the first pass

The numbers in this subsection are the state *before* the font pass; they are kept
because they are what led to it. [Part 4](#part-4--the-font-pass) supersedes them.

The starting point was **83** on `/ro`, LCP 4.7 s. Every fix below was measured
independently on a fresh build.

The whole story was fonts. Six preloaded woff2 files — **349 KB, all at High priority,
queued ahead of the LCP image** — pushed `lcpLoadDelay` to 1.4 s before the hero image
was even requested.

| Change | `/ro` | `/ru` |
| --- | ---: | ---: |
| Baseline (`opsz`, 3 subsets preloaded) | 83 | — |
| `preload: false` on both families | 84 | 85 |
| Serif not preloaded | 85 | 85 |
| Narrow `subsets` to `latin` + `latin-ext` | 87 | 82 |
| Drop Literata's `opsz` axis (3 subsets) | 90 | 87 |
| **Both: no `opsz`, `latin` + `latin-ext`** | **94** | **90** |
| Above + `experimental.inlineCss` | 88 | 88 |

Two things came out of that, both in `src/lib/fonts.ts` — **the first is now
obsolete**, because `next/font/google` is gone (Part 4); the second still stands:

1. **`subsets` is a preload list, not a coverage list.** `next/font` emits an
   `@font-face` for *every* subset Google publishes — latin, latin-ext, greek,
   greek-ext, cyrillic, cyrillic-ext, vietnamese — each with its own `unicode-range`,
   regardless of what `subsets` says. `subsets` only decides which get a
   `<link rel="preload">`. Verified by reading the built CSS: with
   `subsets: ["latin", "latin-ext"]` the Cyrillic `@font-face` blocks are still there,
   and `/ru` still renders in real Commissioner and Literata — confirmed in the browser,
   not inferred. That takes 54 KB of never-drawn Cyrillic off every RO and EN page.

   The old `subsets` list doubled as a compile-time guarantee that both families still
   publish Cyrillic (the bug the old site shipped: the whole Russian site in fallback
   fonts). `CyrillicIsStillOnOffer` in `fonts.ts` now states that directly, and was
   checked to fail `pnpm typecheck` when it does not hold. That guard survives the
   migration in Part 4, checked against the `cmap` of the files that actually ship.

2. **Literata's `opsz` axis was dropped** — a design decision, taken on measured
   evidence, and reversible in one line. `.agents/FOLLOWUPS.md` chose Literata partly for
   its optical-size axis. Shipping that axis doubles every Literata file (latin
   51 → 108 KB, latin-ext 42 → 88 KB) and costs 7 Lighthouse points and roughly a second
   of LCP.

   The visual difference is real but small: with the axis, headings at 52px get finer
   hairlines and a slightly tighter fit; without it, the default text cut is sturdier and
   a little wider. Side-by-side renders are in `scratchpad/qa/shots-opsz/` and
   `scratchpad/qa/shots-noopsz/`. For a mobile-first local business site on Moldovan
   mobile networks, 100 KB per page beats an optical refinement — **but this is the
   client's call, not mine.** Add `axes: ["opsz"]` back to `serif` in `src/lib/fonts.ts`
   and the display cut returns at a cost of ~7 points.

`experimental.inlineCss` was tried and rejected: net-neutral on score, and it moves 11 KB
of CSS from a cacheable file into every HTML response.

### Accessibility — axe-core

`scratchpad/qa/audit.mjs`. axe-core 4.13.0, rule tags `wcag2a`, `wcag2aa`, `wcag21a`,
`wcag21aa`, `wcag22aa`, `best-practice`. Twenty-five pages (all 8 page types × 3 locales,
plus the private-video 404), each scanned at 390px and 1440px — 50 runs.

**0 violations.**

That number is only worth anything if the tool actually works, so it was controlled:
axe reports 44 passing rules on a clean page, and when three known defects are injected
(an `<img>` with no alt, an empty `<button>`, `#ddd` text on white) it reports
`image-alt`, `button-name`, `color-contrast` and `region`. The harness detects real
violations.

Static scanning missed one, which is the point of the interaction pass below.

#### One violation found and fixed

**`landmark-unique`, all three locales, mobile menu open.** The header's own
`<nav aria-label="Navigare principală">` stays in the accessibility tree behind the modal
sheet, and the sheet's `<nav>` carried the identical label — two navigation landmarks with
the same accessible name, which is exactly the case that makes a landmark list useless to
navigate by. The sheet's nav now uses `nav.menu` ("Meniu" / "Меню" / "Menu").

#### Mobile menu — verified by driving it, per locale

`scratchpad/qa/interactive.mjs`. All pass in ro, ru and en:

- `aria-expanded` is `false` closed, `true` open, and back to `false` after Escape;
- `aria-controls` resolves to an element that exists once the sheet is open;
- the sheet is `role="dialog"` + `aria-modal="true"` with an accessible name;
- focus moves into the sheet on open, landing on the close button;
- **Tab is trapped** — 11 focus stops, 15 Tab presses, focus never leaves the sheet;
- **Shift+Tab is trapped** in the same way;
- Escape closes it;
- **focus returns to the trigger** — asserted as `document.activeElement === trigger`;
- the page behind is scroll-locked (`body { overflow: hidden }`) and unlocked on close;
- the scroll position is preserved across open/close;
- axe is clean with the sheet open (after the fix above).

#### Quote form — keyboard only, including the error state

All pass in ro, ru and en:

- the submit button is reachable from the top of the document with Tab alone (12 presses);
- submitting empty produces 2 `aria-invalid="true"` fields;
- **focus moves to the first invalid field**, not left on the button;
- every invalid field has an `aria-describedby` pointing at a non-empty message;
- an error summary is announced through a live region;
- **axe is clean in the error state**;
- the service `<select>` is focusable and labelled, with every option named in the page's
  language;
- filling the three fields and submitting clears every field error;
- the outcome panel takes focus;
- **an undeliverable submission offers the phone number and WhatsApp rather than a false
  success** — with no Resend credentials configured, `/ro/contact` returns "Cererea nu a
  putut fi trimisă. Încearcă din nou sau sună-ne la 079 022 023" and a `tel:` link. It
  never claims a message was sent that was not;
- axe is clean in the submitted state;
- the submit button shows a visible focus indicator (`outline: 2px solid`).

**81/81 assertions pass.**

> Worth knowing for anyone testing this by hand: the server action discards any
> submission that arrives within 2.5 s of the form mounting as automated, and answers it
> with the success panel. That is the anti-spam timing check working (`TIMING.minElapsedMs`
> in `src/components/forms/quote/fields.ts`), not a validation bug. Wait three seconds
> before submitting, or you will be testing the honeypot.

### Responsive — 360 / 390 / 768 / 1024 / 1440 / 2560, three locales

`scratchpad/qa/responsive.mjs` and `audit.mjs`. Screenshots in `scratchpad/qa/resp5/`.

|                                   | Combinations | Failures |
| --------------------------------- | -----------: | -------: |
| Page × width (5 page types × 3 locales × 6 widths) | 90 | 0 |
| Document-level horizontal overflow (25 pages × 6 widths) | 150 | 0 |
| Elements crossing the viewport edge | 150 | 0 |
| Text nodes wider than their own box | 90 | 0 |

**Document-level overflow is not a meaningful test on this site**, and it is worth saying
so: `body { overflow-x: clip }` in `globals.css` means the document can never report
horizontal overflow. It also means real overflow is silently *cut off* rather than shown.
So the real check is per-element: every heading, paragraph, link, button, list item, label
and form control was compared `scrollWidth` against `clientWidth`, and every element's
bounding box against the viewport.

#### The one thing that broke — and it was Russian, as predicted

`/ru`, the home hero, at **768, 1024, 1440 and 2560**: the h1 word
**"Профессиональные"** sets 505px at the display scale's 52px cap, inside a column that
was 460px wide. It ate the card's right padding and crossed its edge. `overflow-x: clip`
was hiding it from every document-level check.

Fixed by widening the hero card from `min(540px, 60vw)` to `min(600px, 66vw)`, which fits
the longest Russian word at every breakpoint with padding intact. Romanian and English
now set their h1 on two lines instead of three, so the page has the same shape in all
three languages.

**Two other fixes were tried and reverted, because both cost more than they bought** —
recorded so nobody re-derives them:

1. `hyphens: auto` on all headings turned the Romanian h1 into
   "Servicii profesio-nale de curățenie". `text-wrap: balance` treats a hyphenated break
   as just another candidate and takes it whenever the result is more even, so
   hyphenation is not a last resort next to it.
2. Scoping hyphenation to `:lang(ru)` and dropping `balance` there fixed the h1 but cost
   every other Russian heading its balanced wrap — "Что вы получаете, работая / с нами"
   instead of breaking at the comma.

`overflow-wrap: break-word` remains on `h1`–`h4` as a backstop. It does nothing now, and
it means the next long word is contained rather than clipped away invisibly.

Verified by pixel-diffing all 90 screenshots against the pre-fix set: the only changes are
the RU home hero at 768/1024/1440 and the three home heroes at 1024+ (the wider card).
Everything else is byte-identical, apart from two shots where a lazy image had not
finished loading.

### The private video route — unhappy path

Tested twice: under `pnpm dev` with a dummy `.env.local`, and against a production build
with the same dummy values in the environment. Real playback was **not** tested — that
needs real Cloudflare Stream credentials, and none exist. Nothing here is claimed about
playback.

The dummy setup registers one link with a well-formed token and a deliberately broken
signing key, so the two failure modes can be compared: a token that does not exist, and a
real token whose signing fails.

| Check | Result |
| --- | --- |
| Unknown token → HTTP status | 404 |
| Real token, broken signing key → HTTP status | 404 |
| `X-Robots-Tag` | `noindex, nofollow, noarchive, nosnippet` |
| `Cache-Control` | `private, no-store, max-age=0, must-revalidate` |
| `Referrer-Policy` | `no-referrer` |
| `<meta name="robots">` | `noindex` |
| Page renders the localized "link is no longer valid" copy | yes, with header and footer |
| Video uid in the HTML | no |
| Stream hostname (`cloudflarestream` / `videodelivery`) in the HTML | no |
| Signing key id or PEM in the HTML | no |
| Signed URL or JWT in the HTML | no |
| `<iframe>` in the HTML | no |
| **Unknown vs. real-but-broken token, same length: HTML byte-identical** | **yes — 60917 vs 60917 bytes** |
| Same, on the Cloudflare Workers runtime | **yes — 60443 vs 60443 bytes** |

The 404 is not an oracle: it cannot be used to discover which tokens are real. The server
log records `[video] cannot sign playback: CF_STREAM_SIGNING_KEY_PEM is malformed` — the
diagnosis stays server-side, and it does not print the key.

The token does appear in the RSC payload, because it is a path segment of the URL the
visitor already typed. That is not a leak.

**One caveat, dev-mode only.** Under `next dev`, Next forwards server `console.error`
output into the client payload for its error overlay, so the dev 404 for a real token
*does* contain `[video] cannot sign playback: CF_STREAM_SIGNING_KEY_PEM is malformed`
while the unknown-token 404 does not. That is a Next dev-server behaviour, it is absent
from both the production build and the Workers build (checked above, byte-identical), and
it matters only if someone exposes a `next dev` server to the internet — which nobody
should.

**The `/v/` guards still hold:** `sitemap.xml` contains no `/v/` path (checked on both
runtimes), `robots.txt` disallows `/v/`, `/ro/v/`, `/ru/v/`, `/en/v/` and `/*/v/`, and
nothing on the public site links to `/v/`. `pnpm test` includes the assertion that runs
the real `buildSitemap()` and fails if any URL or hreflang alternate contains `/v/`.

---

## Part 3 — Deployment readiness

### `pnpm preview` — the real Cloudflare runtime

`opennextjs-cloudflare build && opennextjs-cloudflare preview`, i.e. workerd, not Node.
This is where Node-builtin usage and runtime differences surface.

**It builds and runs.** Everything tested works:

| | |
| --- | --- |
| All 24 public pages, three locales | 200 |
| `/` → `/ro` | 307 |
| Legacy redirects (`/despre-noi`, `/servicii-de-curatenie/…`, `/ru/uslugi-po-uborke`) | 308, correct targets |
| `sitemap.xml`, `robots.txt` | 200, correct content, no `/v/` |
| `logo.png`, `favicon.ico`, `icon.svg`, `apple-icon.png`, `opengraph-image.png` | 200, correct MIME types |
| AVIF photography off the `ASSETS` binding | 200 `image/avif` |
| Canonical + `og:image` absolute on `topcleaning.md` | yes |
| **Quote form Server Action** (POST, `useActionState`) | works — returns the correct "could not be sent" panel with no delivery provider configured, and no client-side errors |
| Client-side navigation between all four pages (RSC fetches) | works, correct `h1` each time |
| Language switch `/ro/servicii` → `/ru/uslugi` | works, `<html lang>` becomes `ru-MD` |
| Private route 404 with dummy secrets from `.dev.vars` | 404, correct headers, byte-identical to the unknown-token 404 |
| Browser console / page errors during all of the above | none |

**Nothing broke.** No Node-builtin failure, no missing polyfill, no runtime difference
found. The `nodejs_compat` flag is doing its job — the video signing path uses Web Crypto,
and the quote delivery uses `fetch`.

Two differences from `next start`, both expected and neither a problem: `wrangler dev`
serves `Content-Encoding: identity` (no gzip locally — the real edge compresses), and
prerendered pages carry `Cache-Control: s-maxage=31536000`, which a deploy replaces.

### `wrangler.jsonc`

Correct as it stands for `topcleaning.md`. Validated with `wrangler deploy --dry-run`,
which reads the config, bundles the Worker and exits without publishing.

| Field | Value | Verdict |
| --- | --- | --- |
| `name` | `top-cleaning` | fine — the Worker name, not the domain |
| `main` | `.open-next/worker.js` | correct for `@opennextjs/cloudflare` 1.20.4 |
| `compatibility_date` | `2026-08-01` | past, and well beyond the 2024-09-23 minimum |
| `compatibility_flags` | `nodejs_compat`, `global_fetch_strictly_public` | both required; `global_fetch_strictly_public` is what stops a fetch to the site's own domain looping back into the Worker |
| `assets.directory` | `.open-next/assets` | correct — 161 files read on dry run |
| `assets.binding` | `ASSETS` | correct |
| `observability.enabled` | `true` | keeps `wrangler tail` and the dashboard logs useful |

Bundle size on dry run: **5216 KiB, 1086 KiB gzipped** — inside the 3 MB gzip free-tier
limit with room to spare.

No routes and no custom domain were added. That is the user's call, and
`.agents/DEPLOY.md` step 7 walks through attaching them in the dashboard, which keeps the
DNS record, the certificate and the route as one thing Cloudflare manages.

### `.agents/DEPLOY.md`

Written, for a non-developer. Ordered steps from "check you are logged in" through health
checks, `NEXT_PUBLIC_SITE_URL`, each `wrangler secret put`, the DNS/zone check, the
deploy, attaching `topcleaning.md` and `www`, a `www` → apex redirect rule, a smoke
checklist, redeploying, and rollback. No secret is ever asked for in a chat, an email or
a file — every one goes through a `wrangler secret put` prompt.

Two claims in it were verified rather than assumed: `.env.production` is picked up by
`next build` (the build prints `Environments: .env.production`, and the resulting
canonical is `https://topcleaning.md/ro`), and `wrangler rollback` exists in wrangler
4.127.1.

---

## Part 4 — the font pass

Commits `98e20bf` and `8260a94`. Everything in this part was measured after the
rest of the report was written, on the same machine, the same Chrome, the same
Lighthouse, the same fifteen URLs and the same production-build-behind-`next start`
setup.

Part 2 diagnosed the entire performance gap as webfont bytes on the critical
path, and named the fix: a subsetted Literata through `next/font/local`. That is
what this is, with one change of approach — the fonts are not routed through
`next/font` at all, because the thing that mattered most is the thing `next/font`
structurally cannot do.

### Why not `next/font/local`

`next/font` decides its `<link rel="preload">` list at **import time**. There is
one locale layout serving `ro`, `ru` and `en`, so whatever it imports, every page
preloads — which is why `/ru` was the worst page in the table. Subsetting alone
would have shrunk the files; it would not have stopped a Romanian page paying for
Cyrillic-ready CSS or a Russian page paying for Latin Extended.

So the `@font-face` blocks are generated instead, and the layout — which knows its
locale — emits the preloads itself.

### What ships

`scripts/build-fonts.py` (`pnpm fonts:build`) downloads the upstream variable
fonts from `google/fonts`, pinned by sha256, and cuts two subsets per family:

| file | glyphs | bytes |
| --- | ---: | ---: |
| `literata-latin` | 145 | 26,120 |
| `literata-cyrillic` | 67 | 12,476 |
| `commissioner-latin` | 197 | 28,852 |
| `commissioner-cyrillic` | 99 | 21,240 |

The `wght` axis is clipped to what the design actually sets — 400–500 for the
display face, 400–700 for the body face — and every other axis is pinned. That
axis clipping, not the glyph count, is where most of the saving comes from.

Output is **committed**: four woff2 files, both upstream OFL licences,
`src/app/fonts.generated.css` and `src/lib/fonts.generated.ts`. `pnpm build`
needs no Python. The build is byte-for-byte reproducible (`head.modified` is kept
as upstream set it) and `pnpm fonts:check` fails if the committed output is
stale.

### Bytes on the critical path

| | before | after | change |
| --- | ---: | ---: | ---: |
| `/ro`, `/en` — preloaded | 162,812 B | **54,972 B** | −107,840 B (−66%) |
| `/ru` — preloaded | 162,812 B | **88,688 B** | −74,124 B (−46%) |
| `/ru` — Cyrillic fetched after preload | 54,296 B | **0 B** | it is preloaded now, not chased |
| `/ru` — total font bytes | 217,108 B | **88,688 B** | −128,420 B (−59%) |
| whole `/ro` page, first load | 493,493 B | 419,037 B | −74,456 B |
| whole `/ru` page, first load | 551,667 B | 456,671 B | −94,996 B |

`/ro` and `/en` still fetch `commissioner-cyrillic` *lazily*, because the language
switcher carries "Русский" in a screen-reader-only span. That was true before the
pass too, it is not preloaded, and Lighthouse's load window does not even reach
it — but it is 21 KB, and it is listed in `.agents/FOLLOWUPS.md`.

### Lighthouse, before and after, measured in one session

Both builds were measured back to back with the machine in the same state, so
this is a paired comparison rather than a comparison against an older table.
Performance is the median of two runs before and seven after; every other
category was 100 in every run, CLS was 0 in every run, TBT never exceeded 10 ms.

| URL | Perf | | LCP | | FCP | |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| `/ro` | 90 → | **96** | 3.6 s → | **2.8 s** | 0.9 s → | 0.9 s |
| `/ro/servicii` | 93 → | **96** | 3.2 s → | **2.8 s** | 0.9 s → | 0.9 s |
| `/ro/servicii/curatenie-dupa-reparatie` | 92 → | **97** | 3.4 s → | **2.6 s** | 0.9 s → | 0.9 s |
| `/ro/despre-noi` | 91 → | **96** | 3.5 s → | **2.9 s** | 0.9 s → | 0.9 s |
| `/ro/contact` | 92 → | **97** | 3.3 s → | **2.6 s** | 0.9 s → | 0.9 s |
| `/ru` | 87 → | **93** | 4.0 s → | **3.2 s** | 1.4 s → | **0.9 s** |
| `/ru/uslugi` | 88 → | **95** | 3.9 s → | **3.0 s** | 1.4 s → | **0.9 s** |
| `/ru/uslugi/uborka-posle-remonta` | 90 → | **95** | 3.6 s → | **3.0 s** | 1.4 s → | **0.9 s** |
| `/ru/o-nas` | 88 → | **95** | 3.9 s → | **3.0 s** | 1.4 s → | **0.9 s** |
| `/ru/kontakty` | 90 → | **95** | 3.7 s → | **2.9 s** | 1.4 s → | **0.9 s** |
| `/en` | 90 → | **96** | 3.7 s → | **2.8 s** | 0.9 s → | 0.9 s |
| `/en/services` | 94 → | **96** | 3.0 s → | **2.8 s** | 0.9 s → | 0.9 s |
| `/en/services/deep-cleaning` | 91 → | **96** | 3.5 s → | **2.8 s** | 0.9 s → | 0.9 s |
| `/en/about` | 91 → | **96** | 3.5 s → | **2.9 s** | 0.9 s → | 0.9 s |
| `/en/contact` | 92 → | **97** | 3.4 s → | **2.6 s** | 0.9 s → | 0.9 s |
| **range / mean** | 87–94 / 90.7 → | **93–97 / 95.7** | | | | |

**Nothing regressed.** Not one URL scored lower on any category, and the worst
page went from 87 to 93.

Two notes on honesty. First, the "before" column here reads 87–94 where Part 2's
original table read 87–96; that is the same build measured on a busier machine,
not a different build — the shape and the ordering are identical. Second,
Lighthouse's simulated LCP on this machine is bimodal: three URLs occasionally
return a score 5 points below their usual value with no change to a single byte
on the wire. That is why every figure here is a median and why the sample list is
recorded per URL in `scratchpad/qa/`.

### What each change was worth

Measured independently on `/ro`, `/ru`, `/en/about`:

| | `/ro` | `/ru` | `/en/about` |
| --- | ---: | ---: | ---: |
| before | 90 | 87 | 91 |
| subsets + per-locale preload, fonts at high priority | 96 | 93 | 96 |
| **+ fonts preloaded at `fetchpriority=low`** | **96–98** | **93** ¹ | **96** |
| no font preload at all (rejected) | 97 | 94 | 95 |

¹ `/ru` measured 96 for this change in the first pass and 93 in the final one —
the same bimodality. The intermediate runs are in `scratchpad/qa/lh-F*`.

`fetchpriority="low"` on the font preloads is the one change that needs
defending. It means the browser starts the font requests immediately but lets the
stylesheet and the LCP photograph take the bandwidth first; the fonts still
arrive ahead of every script on the page. With `font-display: swap` and a
metric-matched fallback, the cost is a slightly longer spell of Times New Roman
and Arial before the swap — and **no layout shift at all**, which is why CLS is
still a measured 0. Dropping the preloads entirely was also measured, and is
worse: the request starts too late.

### The LCP image

`Photo` already set `fetchpriority=high`, `loading=eager` and `decoding=sync` on
the priority photograph. It now also emits a `<link rel="preload">`, including
for the hero's art-directed portrait crop below 620px.

A mismatched preload is worse than none — it costs a second download — so this
was checked rather than assumed. In the Lighthouse network trace for `/ro` and
`/ru`, exactly one hero file is fetched, `hero-portrait-828.avif`, and it moved
from ninth request to third.

### The Cyrillic guarantee, verified four ways

`.agents/DECISIONS.md` makes Cyrillic a hard constraint, and subsetting is
precisely the change that could break it silently. Nothing here is inferred from
the subsetting request; every check reads the files that ship.

1. **It cannot fail open.** Each `@font-face`'s `unicode-range` is generated from
   the `cmap` of its own woff2. A character the file cannot draw is therefore not
   claimed by the family at all: it falls through to the next entry in the stack.
   Missing coverage is a *quality* failure — one word in Georgia — never a
   .notdef box.
2. **Compile time.** `CyrillicIsStillOnOffer` and `RomanianDiacriticsStillFit` in
   `src/lib/fonts.ts` split real strings — `Уборка после ремонта`, `Кишинёв`,
   `Услуги`, the whole Russian alphabet in both cases, `Curățenie după reparație`,
   `ĂÂÎȘȚ`, and the legacy cedilla forms `ŞşŢţ` — into character literal types and
   require each to be in the coverage the generator read out of the `cmap`.
   Checked to fail: adding one CJK character to a guarded string produces
   `pnpm typecheck` error TS2344 naming the family.
3. **Test time.** `src/lib/fonts.test.mts` runs the same check over **every
   character in `messages/*.json` and every file under `src/`**, closed under
   upper- and lower-casing because `text-transform: uppercase` on the eyebrows
   produces characters no source file contains. It also asserts the committed
   woff2 match the content hashes in their own filenames. 75 tests pass, up from
   69.
4. **In a real browser, against the full font.** `scratchpad/qa/font-render.mjs`
   loads `/ru`, adds the *complete* upstream variable fonts as reference families,
   and for all **149 distinct characters** of the message files compares the
   advance width from the shipped subset against the full face at every weight
   the design uses, with `document.fonts.check()` alongside and a
   non-existent-family control to prove the measurement can fail. **0 failures**,
   on `next start` and again over the Cloudflare Workers runtime. The nine
   control phrases each match the full font to within 0.5 px per 100 px of type
   and each differ measurably from the system fallback.

At the font-file level, checked against the exact woff2 `fonts.gstatic.com`
serves: **660 advance widths compared, and every glyph outline is identical to
the unit** at weight 400 (2,933 points compared). At 500/600/700 the advances
differ by at most 0.001 em — half a font unit — because clipping a variable axis
re-derives its deltas. Over the longest heading on the site that is well under a
pixel.

Rendering was also compared page by page: all 90 responsive screenshots (5 page
types × 3 locales × 6 widths) were re-taken and diffed against the pre-migration
set. **Every line break, every text position and every photograph is unchanged** —
best alignment is (0, 0), the photograph regions diff to 0.0000%, and the residual
is 0.6% of pixels at glyph edges from that sub-pixel advance drift. A control
confirmed the harness: a build of the previous font setup reproduces the old
screenshots exactly, 0.0000%.

### Everything else was re-run, not assumed

| | result |
| --- | --- |
| axe-core, 25 pages × 2 viewports | **0 violations** |
| horizontal overflow, 25 pages × 6 widths | **0** |
| clipped/overflowing text, 90 page×width combinations | **0** |
| keyboard, mobile menu and quote form, 3 locales | **81/81 pass** |
| `pnpm preview` (workerd): all pages, redirects, sitemap, robots, icons, `/v/` 404 | unchanged |
| the four woff2 over the `ASSETS` binding | 200, `font/woff2`, correct lengths |
| `wrangler deploy --dry-run` | 154 assets, 5206 KiB / 1086 KiB gzip |


---

## What still falls short

### 1. Performance is 93–97, not 100

The whole gap is still LCP: 2.6–3.2 s simulated, against Lighthouse's 2.5 s
threshold for a green metric. Every other scored metric is perfect on every URL —
FCP 0.9 s everywhere including `/ru`, CLS a measured 0, TBT ≤ 10 ms.

**100 is not reachable on this page shape, and it is worth being precise about
why.** Lighthouse's LCP curve gives 0.9 at 2.5 s; a score of 1.0 needs roughly
1.2 s. FCP alone is 0.9 s on the modelled connection (1.6 Mbps, 150 ms RTT), and
the LCP element is a 33 KB photograph that cannot start before the 24 KB document
has been parsed. Landing LCP at 1.2 s would mean shipping a hero image of a few
kilobytes — i.e. not shipping a photograph. Direction B opens with a photograph;
that is the design, and it is the right one for a cleaning company.

Observed (unthrottled) LCP is under 100 ms. The 2.8 s figure is entirely
Lighthouse's model of a slow phone on a slow network.

**What is left on the critical path**, `/ro`, in order: the 24 KB document, then
the 10 KB stylesheet and the 33 KB hero AVIF at high priority, then 55 KB of
webfont at low priority. `/ru` adds 34 KB of Cyrillic and is 2–3 points behind
because of it.

**What could still be traded for a point or two**, none of them free:

1. Cut `commissioner-latin`'s Latin-1 accented letters (64 glyphs, ~4 KB) and
   `commissioner-cyrillic`'s non-Russian letters (32 glyphs, ~5 KB). Both are
   there so the quote form can draw a French or Ukrainian name a visitor types.
   Worth about one point on `/ru`.
2. Drop the display serif on mobile and set headings in Commissioner below some
   width. A design decision, not an engineering one, and it would save 26 KB.
3. A smaller hero encode. The 828w AVIF is 33 KB for a 412 px box at DPR 1.75;
   the photographs are Unsplash placeholders and will be re-encoded when the
   client's own photos land, which is the natural moment to revisit it.

Measured and rejected: `experimental.inlineCss` (net-negative, and it moves 10 KB
of cacheable CSS into every HTML response), dropping the font preloads entirely
(1–2 points worse than preloading them at low priority), and moving the font
preloads after the page content in the tree (React hoists font preloads to the
top of `<head>` regardless, so the emitted HTML is identical — the apparent gain
was run-to-run noise, which is how the bimodality in Part 4 was found).

### 2. Three Lighthouse diagnostics remain, on all 15 URLs

None of these are scored — they do not cost a single point — but they are real:

- **`image-delivery-insight`, ~113 KiB.** The service-card photographs are served at
  828w into a 370 CSS-px box. **This one is a Lighthouse artefact, and the earlier
  reading of it in this report was wrong.** The audit compares the file's pixel
  width against the box's *CSS* width and ignores device pixel ratio entirely: it
  wants a 370-wide file for a 370 CSS-px box on a DPR-1.75 screen, which would
  render visibly soft. The box needs 370 × 1.75 = 648 device pixels, the `srcSet`
  offers 640 and 828, and the browser correctly takes 828 — and it would still
  take 828 with a perfectly accurate `sizes`, so tightening `sizes` changes
  nothing here. Confirmed by reading the audit's own `reason` field. Nothing to
  fix; the real lever would be adding a ~660w derivative, which belongs with the
  re-encode when the client's photographs replace the placeholders.
- **`legacy-javascript-insight`, ~12 KiB.** Transforms for `Array.prototype.at`,
  `Object.hasOwn`, `String.prototype.trimStart` and friends inside Next's own framework
  chunk. Not this project's code, and not removable without a Next-level browserslist
  change.
- **`render-blocking-insight`, ~110 ms.** The 10 KB stylesheet.
  `experimental.inlineCss` removes it; it was measured twice, before and after the
  font pass, and it is net-negative both times. Not taken.

### 3. Literata ships without its optical-size axis

Still a deliberate trade, but a much cheaper one than it was, so the numbers are
worth restating for whoever makes the call.

| | `latin` | `cyrillic` | preloaded on `/ro` | `/ro` | `/ru` |
| --- | ---: | ---: | ---: | ---: | ---: |
| before the font pass, no `opsz` | 52,720 B | 28,080 B | 162,812 B | 90 | 87 |
| subsetted, no `opsz` (shipping) | 26,120 B | 12,476 B | **54,972 B** | **96** | **93** |
| subsetted, with `opsz` | 57,696 B | 28,848 B | 86,508 B | 96 | 93 |

The axis used to cost 7 Lighthouse points and ~100 KB. Subsetting brings that
down to **2–3 points and 32 KB on `/ro` / 50 KB on `/ru`** — measured on the
same runs, `/ro` 98 → 96 and `/ru` 96 → 93 in the pass where those were the
readings. It is closer than it was, but it is not free, and the brief for this
pass was the best performance achievable, so the axis stays off.

Restoring it is one value in `scripts/build-fonts.py` — set `"opsz": (7, 72)` on
the Literata entry and run `pnpm fonts:build`. Side-by-side renders from the
earlier pass are in `scratchpad/qa/shots-opsz/` vs `scratchpad/qa/shots-noopsz/`.

Note that the axis is *pinned*, not absent: at **opsz 14**, which is what the
Google Fonts API was serving. That value was found by searching the axis until
every advance width matched gstatic's file exactly, so dropping `next/font` did
not silently change the display cut.

### 4. The catch-all 404 is unstyled, and its `og:image` says `localhost`

Next generates an implicit `/_not-found` route that sits outside `src/app/[locale]/`, so
it never gets the locale layout's `metadataBase`. Its `og:image` is baked as
`http://localhost:3000/opengraph-image.png`, and the page itself is Next's bare default
rather than the branded 404.

**How reachable is it?** The middleware matcher excludes `api`, `_next`, `_vercel` and
*any path containing a dot*. So `/ro/nonexistent` and `/nonexistent` both get the proper
branded, localized 404 — but `/wp-login.php`, `/oferta.html` or `/api/anything` get the
bare one. In practice that is bot scans, plus the occasional mistyped legacy URL with an
extension.

Still not fixed, and the font pass **tried the proper fix and backed it out**.

Broadening the middleware matcher to cover dotted paths means hand-maintaining an
allowlist for `robots.txt`, `sitemap.xml`, `favicon.ico`, `logo.png`, `icon.svg`,
`apple-icon.png`, `opengraph-image.png` and everything under `/images/` — and
getting that list wrong 404s the sitemap. That was never the right answer.

`app/global-not-found.tsx` is. `experimental.globalNotFound` does exist in Next
15.5.24, and a `src/app/global-not-found.tsx` rendering the branded 404 in the
default locale builds cleanly and serves `/wp-login.php` and `/oferta.html`
correctly — styled, 404, with a real `metadataBase`. **It also turns every
`notFound()` inside a locale route into a 500.**

| path | matcher fix off | with `globalNotFound` |
| --- | --- | --- |
| `/wp-login.php` | 404, unstyled | 404, branded |
| `/oferta.html` | 404, unstyled | 404, branded |
| `/ro/nope` | **404, branded** | **500** |
| `/nope` | **404, branded** | **500** (after the 307) |
| `/api/anything` | 404, unstyled | **500** |

The server logs a digest-only `Error` from Next's own chunk. The cause looks to
be that with the flag on, the global page — which must render its own `<html>` —
is rendered inside the locale layout, which already has one. Whatever the cause,
trading the branded, localized 404 that real visitors reach for a branded 404 on
paths only bot scanners reach is a bad trade, so it was reverted in full: neither
`src/app/global-not-found.tsx` nor the `experimental` block is in the tree.

For the record, after the revert every route and asset was re-checked on both
runtimes: `/` 307, `/nope` and `/ro/nope` 404 branded, `/wp-login.php` and
`/api/anything` 404, `sitemap.xml` and `robots.txt` 200 with correct bodies and no
`/v/`, and every icon, share image, photograph and font 200 with the right MIME
type.

The remaining exposure is unchanged and small: bot scans of `/wp-login.php` get
Next's bare 404 page whose `og:image` says `localhost`. Revisit when
`globalNotFound` stabilises.

### 5. The quote form cannot deliver anything yet

By design, and it behaves correctly: with no `RESEND_API_KEY` / `QUOTE_NOTIFY_EMAIL` it
shows "could not be sent, here is our phone number", writes the full submission to the
server log prefixed `[quote] UNDELIVERED`, and never shows a false success. But **until
those two secrets are set (DEPLOY.md step 4a), no quote request reaches anyone by email.**
This is the single most important item on the post-deploy smoke checklist.

### 6. Not tested, and honestly cannot be here

- **Real video playback.** Needs Cloudflare Stream credentials, a signing key and an
  uploaded video. Only the unhappy path was verified. `.agents/video-setup.md` is the
  runbook.
- **Real email delivery.** Needs a Resend key.
- **The live domain, DNS, TLS.** `topcleaning.md` did not resolve during this work.
- **Real browsers other than Chromium.** Everything here is Chrome for Testing 152.
  Safari and Firefox behaviour — particularly `text-wrap: balance` and `hyphens` — is
  untested. Neither is load-bearing after the hero fix.
- **Screen readers.** ARIA, focus order, focus return, live regions and landmark
  uniqueness were verified programmatically. Nobody listened to it with VoiceOver, NVDA
  or JAWS.

### 7. Still true from earlier waves

- The photographs are **Unsplash placeholders**, to be swapped for the team's own photos
  (`.agents/assets.md`). Slots are referenced by id, so the swap does not touch any
  consumer.
- There are no testimonials, client counts, years in business, certifications or prices
  anywhere on the site or in its structured data, because none exist
  (`.agents/DECISIONS.md`).

---

## Final check state

All run from a wiped `.next`:

```
pnpm lint         clean
pnpm typecheck    clean
pnpm check:i18n   ru.json and en.json each match ro.json, 132 keys
pnpm test         75 tests, 75 pass
pnpm fonts:check  generated font output is up to date
pnpm format:check clean
pnpm build        32 routes prerendered
pnpm preview      workerd; every route, asset and font 200
wrangler --dry-run  154 assets, 5206 KiB / 1086 KiB gzip
```

## How to re-run any of this

The audit scripts are in the session scratchpad, not the repo — they are one-off
instruments, not something the project should carry.

```bash
# terminal 1
pnpm build && pnpm start -p 4400

# terminal 2 — from the scratchpad directory
export CHROME_PATH="$HOME/.cache/puppeteer/chrome/mac_arm-152.0.7977.54/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing"
node qa/lh.mjs /ro /ru /en                 # Lighthouse, mobile
node qa/audit.mjs                          # axe + overflow, 25 pages × 6 widths
node qa/interactive.mjs                    # mobile menu + quote form, keyboard
node qa/responsive.mjs                     # screenshots + per-element overflow
node qa/validate-jsonld.mjs <repo-root>    # structured data, from the built HTML
node qa/axe-control.mjs                    # proves the axe harness detects defects
node qa/font-render.mjs                    # every message character, in a browser,
                                           # against the full upstream fonts
```

Rebuilding the fonts needs `python3` with `fonttools` and `brotli`
(`pip3 install fonttools brotli`), and is not part of `pnpm build`:

```bash
pnpm fonts:build   # regenerate public/fonts + the two generated files
pnpm fonts:check   # fail if the committed output is stale
```
