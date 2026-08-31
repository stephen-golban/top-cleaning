# Photography — shipped assets

**Every photograph on this site is a placeholder.** All ten are Unsplash-licensed
stand-ins for Top Cleaning's own photography and must be replaced before launch —
real crews, real equipment, real Chișinău interiors. Nothing here is a picture of
this company's work.

The swap is designed to be cheap: content references a photograph by **slot id**
(`src/content/images.ts`), never by file path, so replacing a photo means dropping
a new master into the pipeline below and re-running it. No consumer changes.

- Files: `public/images/` — 92 files, **3,836,579 bytes (3.84 MB)**.
- Manifest: `src/content/images.ts` — slot ids, intrinsic sizes, srcsets, LQIPs,
  credits.
- Alt text: `messages/{ro,ru,en}.json` under `common.alt.<slotId>`, owned by the
  copy layer. `src/i18n/message-parity.ts` fails `pnpm typecheck` until every slot
  has alt text in all three locales.

## Slot inventory

| Slot id | Aspect | Intrinsic | AVIF + WebP widths | JPEG | Payload |
| --- | --- | --- | --- | --- | --- |
| `hero` | 2:1 | 1920×960 | 640 828 1080 1200 1600 1920 | 640, 1200 | 557 KB |
| `hero` → `mobile` | 4:5 | 828×1035 | 640 828 | 828 | 198 KB |
| `serviceGeneral` | 4:3 | 1080×810 | 480 640 828 1080 | 828 | 342 KB |
| `serviceMaintenance` | 4:3 | 1080×810 | 480 640 828 1080 | 828 | 254 KB |
| `serviceAfterRenovation` | 4:3 | 1080×810 | 480 640 828 1080 | 828 | 167 KB |
| `serviceUpholstery` | 4:3 | 1080×810 | 480 640 828 1080 | 828 | 221 KB |
| `process` | 4:3 | 1440×1080 | 640 828 1080 1440 | 1080 | 308 KB |
| `about` | 4:5 | 1080×1350 | 480 640 828 1080 | 828 | 833 KB |
| `servicesIndex` | 3:2 | 1440×960 | 640 828 1080 1440 | 1080 | 128 KB |
| `contact` | 3:2 | 1440×960 | 640 828 1080 1440 | 1080 | 639 KB |
| `ogImage` | 1.91:1 | 1200×630 | — | 1200 | 101 KB |

Naming is `public/images/<slot-kebab>-<width>.<ext>`; the OG card is `og.jpg`.
Nothing is wider than 1920px and nothing is upscaled past its master.

The `hero` slot ships a second, art-directed portrait crop (`mobile`). Direction B
takes the hero box from 4:5 → 16:9 → 2:1 as the viewport grows, and a centre crop
of the 2:1 file cuts the subject in half at 4:5. `objectPosition` on each slot
covers the smaller crops.

## Provenance

All nine source photographs are under the [Unsplash
License](https://unsplash.com/license) — free for commercial use, no permission
needed, attribution appreciated but not required. Original masters were fetched at
`?w=2400&q=92&fm=jpg`.

### `hero` (and `hero.mobile`, and `ogImage`)

- **Photo id:** `photo-1758523670739-0d26a3ee976d`
- **Original:** <https://images.unsplash.com/photo-1758523670739-0d26a3ee976d>
- **Page:** <https://unsplash.com/photos/u8knk6Hl8JA>
- **Photographer:** Vitaly Gariev — <https://unsplash.com/@silverkblack>
- **Subject:** A woman vacuuming a wooden floor in a bright bedroom; white
  curtains, whitewashed brick, plants, a leaning mirror.
- **Derivatives:** `hero-{640,828,1080,1200,1600,1920}.{avif,webp}`,
  `hero-{640,1200}.jpg`, `hero-portrait-{640,828}.{avif,webp}`,
  `hero-portrait-828.jpg`, `og.jpg`.

### `serviceGeneral` — *Curățenie generală*

- **Photo id:** `photo-1758272421751-963195322eaa`
- **Original:** <https://images.unsplash.com/photo-1758272421751-963195322eaa>
- **Page:** <https://unsplash.com/photos/Y3vDCL7_das>
- **Photographer:** Vitaly Gariev — <https://unsplash.com/@silverkblack>
- **Subject:** A woman in yellow rubber gloves wiping a dark wooden table in a
  loft with white brick walls.
- **Derivatives:** `service-general-{480,640,828,1080}.{avif,webp}`,
  `service-general-828.jpg`.

### `serviceMaintenance` — *Curățenie de întreținere*

- **Photo id:** `photo-1647381518264-97ff1835026f`
- **Original:** <https://images.unsplash.com/photo-1647381518264-97ff1835026f>
- **Page:** <https://unsplash.com/photos/MwxsRSG1A2s>
- **Photographer:** Josue Michel — <https://unsplash.com/@josuemichelphotography>
- **Subject:** A person in a dark apron standing in a white kitchen, holding a
  caddy of cleaning supplies in one hand and a broom in the other. Head out of
  frame — no identifiable face.
- **Derivatives:** `service-maintenance-{480,640,828,1080}.{avif,webp}`,
  `service-maintenance-828.jpg`.

### `serviceAfterRenovation` — *Curățenie după reparație*

- **Photo id:** `photo-1692133220749-1c55bb918ad8`
- **Original:** <https://images.unsplash.com/photo-1692133220749-1c55bb918ad8>
- **Page:** <https://unsplash.com/photos/SCbkyJR3QSM>
- **Photographer:** Brian Wangenheim — <https://unsplash.com/@brianwangenheim>
- **Subject:** An empty, freshly finished room — white walls, new plank flooring,
  recessed lights, one window. Nobody in it.
- **Derivatives:** `service-after-renovation-{480,640,828,1080}.{avif,webp}`,
  `service-after-renovation-828.jpg`.

### `serviceUpholstery` — *Curățarea chimică a mobilierului tapițat*

- **Photo id:** `photo-1763279934323-edb3735f6a6e`
- **Original:** <https://images.unsplash.com/photo-1763279934323-edb3735f6a6e>
- **Page:** <https://unsplash.com/photos/7mmmEkyk0aQ>
- **Photographer:** Alina Bondar — <https://unsplash.com/@alinabondar_ph>
- **Subject:** A beige bouclé armchair with a linen cushion on herringbone
  parquet, against a white panelled wall.
- **Derivatives:** `service-upholstery-{480,640,828,1080}.{avif,webp}`,
  `service-upholstery-828.jpg`.

### `process` — the "Cum funcționează" band

- **Photo id:** `photo-1646980241033-cd7abda2ee88`
- **Original:** <https://images.unsplash.com/photo-1646980241033-cd7abda2ee88>
- **Page:** <https://unsplash.com/photos/FhsFUo-Wfc0>
- **Photographer:** Josue Michel — <https://unsplash.com/@josuemichelphotography>
- **Subject:** A woman climbing a staircase in a white hallway carrying a cleaning
  caddy and a broom.
- **Derivatives:** `process-{640,828,1080,1440}.{avif,webp}`, `process-1080.jpg`.

### `about` — the About page

- **Photo id:** `photo-1691057185806-ea8b5b9a4506`
- **Original:** <https://images.unsplash.com/photo-1691057185806-ea8b5b9a4506>
- **Page:** <https://unsplash.com/photos/HyeztRmq6YE>
- **Photographer:** Kate Laine — <https://unsplash.com/@kikimora33>
- **Subject:** A white wire caddy on a wooden shelf holding brushes, a paper towel
  roll, a soap dispenser and sponges; a waffle towel over the rail.
- **Derivatives:** `about-{480,640,828,1080}.{avif,webp}`, `about-828.jpg`.

### `servicesIndex` — the Services index page

- **Photo id:** `photo-1567016376408-0226e4d0c1ea`
- **Original:** <https://images.unsplash.com/photo-1567016376408-0226e4d0c1ea>
- **Page:** *unresolved* — see "Unresolved attribution" below.
- **Photographer:** *unresolved.*
- **Subject:** A tall rounded arch cut into an off-white wall, a charcoal sofa and
  low wooden table beyond it, a smoked-glass vase of dried grasses at the left.
- **Derivatives:** `services-index-{640,828,1080,1440}.{avif,webp}`,
  `services-index-1080.jpg`.

### `contact` — the Contact page

- **Photo id:** `photo-1583847268964-b28dc8f51f92`
- **Original:** <https://images.unsplash.com/photo-1583847268964-b28dc8f51f92>
- **Page:** <https://unsplash.com/photos/OtXADkUh3-I>
- **Photographer:** Minh Pham — <https://unsplash.com/@minhphamdesign>
- **Subject:** A calm living room — pale grey sofa, knit throw, framed prints,
  round wooden tables, plants, daylight through a curtained window.
- **Derivatives:** `contact-{640,828,1080,1440}.{avif,webp}`, `contact-1080.jpg`.

## Changes from the deck's nine

The deck (`.agents/design-preview.html`) picked nine images across three
directions. Direction B shipped, so its six carried over, plus three of the other
directions' images were reassigned to pages B implies. Three were dropped:

| Dropped | Was | Why |
| --- | --- | --- |
| `photo-1758273705627-937374bfa978` | B service card 2 | Woman dancing and laughing while vacuuming. Exactly the "exaggerated smile" stock cliché the brief rules out. Replaced by Josue Michel's faceless kitchen frame, which also matches the `process` band's photographer. |
| `photo-1689043528099-2ba014dd7c64` | B service card 3 | A CGI render, not a photograph. Calm and on-palette, but it cannot pass as this company's own work. Replaced by a real empty post-renovation room. |
| `photo-1497366754035-f200968a6e72` | C contact block | One of the most-reused stock photographs on the internet, and a dark, black-framed industrial office — the opposite of the bright neutral ground the palette needs. Replaced by a calm domestic living room. |

`photo-1585128792020-803d29415281` (the deck's upholstery card) was also swapped,
for Alina Bondar's bouclé armchair: the armchair fills the frame rather than
sitting at the edge behind a sideboard, so the card actually reads *upholstery*,
and its credit is verified.

## Unresolved attribution

`photo-1567016376408-0226e4d0c1ea` (`servicesIndex`) ships without a photographer
credit. There is no public Unsplash endpoint that maps a CDN file id back to its
photo page, and this image did not surface in any search that would have paired
the two. The Unsplash License does not require attribution, so this does not block
shipping — but it should be resolved before launch if the placeholder survives
that long.

The mapping *does* work in the other direction. Given a photo page's short id,
this prints its file id and the photographer's name:

```sh
sid=FhsFUo-Wfc0
curl -s -A "Mozilla/5.0" -o /dev/null -w '%{redirect_url}\n' \
  "https://unsplash.com/photos/$sid/download?force=true"
# → https://images.unsplash.com/photo-1646980241033-cd7abda2ee88?…&dl=josue-michel-FhsFUo-Wfc0-unsplash.jpg
```

So: find the photo on `unsplash.com`, take the short id off its URL, run the above,
and check the file id matches. Every credit in this file was verified that way.
(Note that `curl` is bot-blocked on `unsplash.com` HTML pages — only the
`/download` redirect answers. The `/download` endpoint returns an empty redirect
for Unsplash+ premium images; none of ours are premium.)

## Alt text still owed

`common.alt.*` in the three message files predates these images. Three keys are
new and three describe photographs that are no longer there:

| Key | State |
| --- | --- |
| `common.alt.hero` | Accurate. |
| `common.alt.process` | Accurate. |
| `common.alt.serviceGeneral` | Says "wooden handrail"; the photo is a wooden **table**. |
| `common.alt.serviceMaintenance` | **Rewrite** — photo changed. |
| `common.alt.serviceAfterRenovation` | **Rewrite** — photo changed. |
| `common.alt.serviceUpholstery` | **Rewrite** — photo changed. |
| `common.alt.about` | **New.** |
| `common.alt.servicesIndex` | **New.** |
| `common.alt.contact` | **New.** |

The "Subject" line under each photograph above describes what is actually in frame.
`pnpm typecheck` fails on `src/i18n/message-parity.ts` until all nine keys exist in
`ro.json`, `ru.json` and `en.json`.

## Regenerating

Requires `curl`, ImageMagick 7 (`magick`, with libheif for AVIF) and `cwebp`.
Encoder settings: AVIF q55, WebP q80 `-m 6`, JPEG q80 4:2:0 progressive, OG q86
baseline. Those numbers were tuned by eye at 1:1 — AVIF q55 is visually
transparent on this material and roughly a third the size of the equivalent WebP.

Run from the repo root. It is idempotent: masters are cached, everything else is
rewritten.

```sh
#!/usr/bin/env bash
set -euo pipefail
MASTERS=.cache/unsplash          # anywhere outside the repo works too
CROPS=$(mktemp -d)
OUT=public/images
AVIF_Q=55; WEBP_Q=80; JPEG_Q=80
mkdir -p "$MASTERS" "$OUT"

# slot | unsplash file id | crop window from the 2400px-wide master | widths | jpeg widths
SLOTS=$(cat <<'EOF'
hero|photo-1758523670739-0d26a3ee976d|2400x1200+0+0|640 828 1080 1200 1600 1920|640 1200
hero-portrait|photo-1758523670739-0d26a3ee976d|1080x1350-342+0|640 828|828
service-general|photo-1758272421751-963195322eaa|1800x1350+0+0|480 640 828 1080|828
service-maintenance|photo-1647381518264-97ff1835026f|2133x1600+0+0|480 640 828 1080|828
service-after-renovation|photo-1692133220749-1c55bb918ad8|2134x1600+0+0|480 640 828 1080|828
service-upholstery|photo-1763279934323-edb3735f6a6e|2400x1800+0+700|480 640 828 1080|828
process|photo-1646980241033-cd7abda2ee88|2133x1600+0+0|640 828 1080 1440|1080
about|photo-1691057185806-ea8b5b9a4506|2400x3000+0+0|480 640 828 1080|828
services-index|photo-1567016376408-0226e4d0c1ea|2400x1600+0+0|640 828 1080 1440|1080
contact|photo-1583847268964-b28dc8f51f92|2400x1600+0+150|640 828 1080 1440|1080
og|photo-1758523670739-0d26a3ee976d|2400x1260+0+0|1200|1200
EOF
)

while IFS='|' read -r slot id geom widths jpegw; do
  [ -f "$MASTERS/$id.jpg" ] ||
    curl -sfS "https://images.unsplash.com/${id}?w=2400&q=92&fm=jpg" -o "$MASTERS/$id.jpg"

  # Normalise to exactly 2400 wide, then take the slot window. The offset in the
  # geometry is relative to centre: it is how far the framing had to move to keep
  # the subject clear of the overlaid card, not an absolute coordinate.
  png="$CROPS/$slot.png"
  magick "$MASTERS/$id.jpg" -resize 2400x -gravity center -crop "$geom" +repage \
         -colorspace sRGB -strip "$png"

  if [ "$slot" = og ]; then
    magick "$png" -resize 1200x630! -quality 86 -sampling-factor 4:2:0 \
           -interlace none -strip "$OUT/og.jpg"
    continue
  fi

  for w in $widths; do
    magick "$png" -resize "${w}x" -quality "$AVIF_Q" "$OUT/$slot-${w}.avif"
    cwebp -quiet -q "$WEBP_Q" -m 6 -resize "$w" 0 "$png" -o "$OUT/$slot-${w}.webp"
  done
  for w in $jpegw; do
    magick "$png" -resize "${w}x" -quality "$JPEG_Q" -sampling-factor 4:2:0 \
           -interlace JPEG -strip "$OUT/$slot-${w}.jpg"
  done

  # blurDataURL for src/content/images.ts
  magick "$png" -resize 20x -quality 40 -sampling-factor 4:2:0 -strip "$CROPS/$slot-lqip.jpg"
  printf '%s\tdata:image/jpeg;base64,%s\n' "$slot" \
    "$(base64 -i "$CROPS/$slot-lqip.jpg" | tr -d '\n')"

  # intrinsic width/height for src/content/images.ts
  maxw=$(printf '%s\n' $widths | sort -n | tail -1)
  magick identify -format "$slot %wx%h\n" "$OUT/$slot-${maxw}.avif"
done <<< "$SLOTS"

du -sh "$OUT"
```

`src/content/images.ts` is hand-maintained against this table — the script prints
the two values that are tedious to transcribe (`blurDataURL` and the intrinsic
`width`/`height`) so they can be pasted in. Changing a crop window means updating
the matching entry there.

### Swapping in the client's real photographs

1. Drop the new master into `$MASTERS` (or point the `SLOTS` row at a local file).
2. Pick the crop window for the slot's aspect — the third column, `WxH±dx±dy`,
   measured on a 2400px-wide copy. Verify it before encoding:
   `magick master.jpg -resize 2400x -gravity center -crop 2400x1200+0+0 +repage -resize 500x check.jpg`
3. Re-run. Paste the printed `blurDataURL` and dimensions into
   `src/content/images.ts`, and replace that photograph's `source` block with the
   real credit (or drop it — `photographer` and `pageUrl` are nullable).
4. Delete its section from this file once it is no longer a placeholder.
