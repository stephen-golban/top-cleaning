# Locked build decisions — read with BRIEF.md and source-inventory.md

The client picked **Direction B — "Room"** from `.agents/design-preview.html`
(published deck). That file is the visual reference. Open it and match it.

## Direction B in one line
The photograph leads. Words sit on it as a calm white card. A serif carries the warmth
the existing sparkle-and-serif logo already has. Six photographs, one accent button,
soft 3px corners, generous air.

Borrow two things the deck's recommendation called out:
- Direction A's typographic discipline: hairline rules instead of card borders where a
  divider will do, tight tracking on large headings, restraint with the blue.
- Direction C's contact reflexes: the phone number must be reachable from the header on
  every page, and a quote form must exist. B's weakness is slow time-to-contact — fix it
  without turning the page into C.

B depends on photography. Use the best Unsplash images available now; the whole point of
`.agents/assets.md` is that these get swapped for the team's real photos later.

## Color — final
| Token | Hex | Use |
|---|---|---|
| ground | `#FFFFFF` | page background |
| surface | `#F6F7F9` | quiet panels, bands |
| hairline | `#E4E7EC` | 1px rules, borders |
| ink | `#0B0E14` | headings, primary text (19.3:1) |
| ink-2 | `#3D4654` | body text (9.5:1) |
| ink-3 | `#5A6472` | muted / captions (6.0:1 — this is the floor, never lighter) |
| accent | `#007AFF` | THE identity blue: icons, focus rings, large text, the sparkle |
| accent-deep | `#0062CC` | button fills, and any accent-colored text under 18px |
| accent-tint | `#EAF3FF` | selected rows, focus glow |

Rule, decided and final: `#007AFF` is 4.0:1 on white — it passes AA for large text, icons
and focus rings but FAILS for small text. So `#007AFF` stays the brand blue everywhere it
legitimately passes, and `#0062CC` (same hue, one step deeper, indistinguishable to the
eye) is used for button fills and any accent text below 18px. Never put small text in
`#007AFF` on white. Dark-theme counterpart of the accent is `#0A84FF` if a dark theme is
ever added; light is the only shipped theme for now.

## Typography — final
Body / UI: **Karla** (as in the deck). Keep it.

Display / wordmark: **NOT Fraunces.** It was flagged as an overused AI-default face and
the client left the substitution to us. Pick the replacement under this HARD CONSTRAINT,
which eliminates most fashionable serifs:

> The display face MUST ship both a **Cyrillic** subset (the site has a Russian locale)
> and **Latin Extended** (Romanian ă â î ș ț). A face without Cyrillic is disqualified,
> no matter how good it looks — shipping one is exactly the bug the old site had, where
> the entire Russian site rendered in fallback fonts.

Instrument Serif, Fraunces and Spectral are all disqualified on this rule. Verify actual
subset coverage against the Google Fonts API (`https://fonts.googleapis.com/css2?...`
and check for `unicode-range` blocks covering U+0400–04FF) — do not trust memory or a
blog post. Candidates worth auditing, roughly in order: **Literata**, **Source Serif 4**,
**EB Garamond**, **Vollkorn**, **Bitter**, **Cormorant Garamond**, **PT Serif**.
Prefer one with real personality at display sizes and a calm, wide-set roman for the
wordmark. Avoid Playfair Display and Lora — both are as overused as Fraunces.

Self-host via `next/font/google` with explicit `subsets: ["latin","latin-ext","cyrillic"]`.
Zero external font requests at runtime. Render a Romanian string (`Curățenie după
reparație`) and a Russian one (`Уборка после ремонта`) in the chosen face and confirm no
glyph falls back before committing to it.

## Routes — localized pathnames (next-intl `pathnames`)
Locale prefix always present: `/ro`, `/ru`, `/en`. `/` redirects to `/ro`.

| Page | ro | ru | en |
|---|---|---|---|
| home | `/` | `/` | `/` |
| services index | `/servicii` | `/uslugi` | `/services` |
| service detail | `/servicii/[slug]` | `/uslugi/[slug]` | `/services/[slug]` |
| about | `/despre-noi` | `/o-nas` | `/about` |
| contact | `/contact` | `/kontakty` | `/contact` |
| private video | `/v/[token]` | same | same |

Service slugs are localized per locale and defined once in `src/content/services.ts`.
Every page emits `hreflang` alternates for all three locales plus `x-default` → `ro`.

## Message key namespaces (`messages/{ro,ru,en}.json`)
Agreed contract so components and translations can be built in parallel. Do not invent
top-level namespaces outside this set without updating this file:

`meta` · `nav` · `home` · `services` · `about` · `contact` · `form` · `footer` ·
`common` · `video`

Copy rules: RO and RU come verbatim from `source-inventory.md` wherever the old site had
an equivalent string — the client approved that copy by shipping it. EN is net-new and
must be written, not machine-translated. CTA labels are new in all three languages
(the old site had none). Never invent testimonials, client counts, years in business,
certifications or prices — none exist.

## Contact facts (the only ones that exist — do not invent more)
- Phone `+373 79 022 023`, displayed `079 022 023`
- WhatsApp `https://wa.me/37379022023`
- Viber `viber://chat?number=37379022023`
- Email `info@topcleaning.md`
- City: Chișinău. Serves homes and offices.
- No street address, no opening hours, no social profiles, no company registration.
  Do not fabricate any of these, and do not emit JSON-LD fields for them.
