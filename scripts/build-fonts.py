#!/usr/bin/env python3
"""
Build the site's self-hosted webfont subsets.

    pnpm fonts:build            # regenerate everything
    pnpm fonts:build --check    # fail if the committed output is stale

WHY THIS EXISTS
---------------
The site used to pull Literata and Commissioner through `next/font/google`.
That is a good default and it was measured to be the entire performance gap:
`next/font` emits an `@font-face` per Google subset and preloads a *fixed* list
of them, decided at import time. The layout is shared by all three locales, so
a Romanian page preloaded Cyrillic-capable CSS it never drew from, and a
Russian page preloaded 72 KB of Latin Extended it never drew from. 160-214 KB
of webfont sat at High priority ahead of the hero image and pushed LCP past
Lighthouse's 2.5 s line on every page.

`next/font` cannot preload per locale. So the fonts are built here instead:

  * two subsets per family, `latin` and `cyrillic`, each carrying a
    `unicode-range` computed from the *actual* cmap of the file that ships, so
    a codepoint the subset lacks can never render as .notdef — it falls through
    to the next family in the stack;
  * the variable `wght` axis clipped to the range the design actually sets
    (400-500 for the display face, 400-700 for the body face) and every other
    axis pinned, which is where most of the byte saving comes from;
  * a per-locale preload manifest, consumed by `src/app/[locale]/layout.tsx`,
    so `/ro` preloads latin only and `/ru` preloads latin + Cyrillic.

WHAT IT WRITES  (all committed; this script is a maintenance tool, not a build
step — `pnpm build` does not need Python)

    public/fonts/<family>-<subset>.<hash>.woff2
    public/fonts/OFL-<family>.txt        the upstream licence, shipped with the font
    src/app/fonts.generated.css          @font-face + metric-matched fallbacks
    src/lib/fonts.generated.ts           file manifest + exact glyph coverage

`src/lib/fonts.ts` wraps the generated module with the compile-time guards, and
`src/lib/fonts.test.mts` checks the coverage against every string in
`messages/` and `src/content/`.

REQUIREMENTS: python3 with `fonttools` and `brotli` (`pip3 install fonttools brotli`).
"""

from __future__ import annotations

import glob
import hashlib
import json
import os
import re
import sys
import urllib.request

from fontTools.subset import Options, Subsetter
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT_FONTS = os.path.join(ROOT, "public", "fonts")
OUT_CSS = os.path.join(ROOT, "src", "app", "fonts.generated.css")
OUT_TS = os.path.join(ROOT, "src", "lib", "fonts.generated.ts")

GH = "https://raw.githubusercontent.com/google/fonts/main/ofl"


# --------------------------------------------------------------------------
# Sources
#
# The upstream variable fonts, straight from google/fonts — the same masters
# the Google Fonts API slices its subsets from. Pinned by sha256: a silent
# upstream revision would change the metrics the fallback overrides below were
# derived from, and this script refuses to build if that happens.
# --------------------------------------------------------------------------
FAMILIES = {
    "literata": {
        "family": "Literata",
        # Display / headings / wordmark. 400 and 500 are the only weights the
        # design sets (`src/components/ui/heading.tsx`).
        "role": "display",
        "url": f"{GH}/literata/Literata%5Bopsz%2Cwght%5D.ttf",
        "license_url": f"{GH}/literata/OFL.txt",
        "sha256": "b41138c9373112f32abb589cc22e8674b06ed4048b0c513be922bdd26f274440",
        "weight": (400, 500),
        # `next/font/google` shipped Literata with `opsz` pinned, and it stays
        # pinned here — at 14, not at the fvar default of 12, because 14 is what
        # the Google Fonts API actually serves. Found by binary-searching the
        # axis until every advance width matched the file gstatic returns, so
        # this migration is a byte-for-byte visual no-op.
        #
        # Shipping the axis instead costs 2-3 Lighthouse points and 32-50 KB per
        # page — much cheaper than it was before subsetting, but not free.
        # `.agents/QA-REPORT.md` carries both sets of numbers. Set this to
        # (7, 72) and re-run `pnpm fonts:build` to ship `opsz`.
        "opsz": 14,
        # Metric-matched fallback, so the swap from the system serif to
        # Literata does not move a single line. These four numbers are exactly
        # what `next/font/google` emitted for this family before the migration
        # (read out of the built stylesheet), which is why CLS stays at 0.
        "fallback": {
            "local": "Times New Roman",
            "ascent-override": "99.62%",
            "descent-override": "26.07%",
            "line-gap-override": "0.00%",
            "size-adjust": "118.15%",
        },
    },
    "commissioner": {
        "family": "Commissioner",
        # Body / UI. 400-700 covers normal, medium, semibold and bold.
        "role": "body",
        "url": f"{GH}/commissioner/Commissioner%5BFLAR%2CVOLM%2Cslnt%2Cwght%5D.ttf",
        "license_url": f"{GH}/commissioner/OFL.txt",
        "sha256": "db01279a6eb8676ee62675a4d7e5edbfe5f08fbc109358e2f49760b70c0447d3",
        "weight": (400, 700),
        "opsz": None,  # Commissioner has no optical-size axis.
        "fallback": {
            "local": "Arial",
            "ascent-override": "100.64%",
            "descent-override": "20.39%",
            "line-gap-override": "0.00%",
            "size-adjust": "101.05%",
        },
    },
}


# --------------------------------------------------------------------------
# Character sets
#
# Two ways in. The *corpus* is every character that appears in a message file
# or anywhere under `src/`, closed under upper- and lower-casing because
# `text-transform: uppercase` on the eyebrows turns `ă` into `Ă` and `у` into
# `У` at render time. The *floor* sets below are a deliberate over-approximation
# on top of that, so ordinary new copy — a euro sign, an em dash, a Ukrainian
# name typed into the quote form — cannot introduce a glyph the subset lacks.
#
# Today the floor is a strict superset of the corpus. The corpus is unioned in
# anyway: if new copy ever reaches past the floor, this picks it up instead of
# silently dropping to a system font.
# --------------------------------------------------------------------------

ASCII = set(range(0x20, 0x7F))

PUNCTUATION = {
    0x00A0,  # nbsp
    0x00A7,  # §
    0x00A9,  # ©
    0x00AB,  # «
    0x00AD,  # soft hyphen
    0x00B0,  # °
    0x00B7,  # ·
    0x00BB,  # »
    0x00D7,  # ×
    0x00F7,  # ÷
    0x2010, 0x2011, 0x2013, 0x2014, 0x2015,  # hyphens and dashes
    0x2018, 0x2019, 0x201A, 0x201C, 0x201D, 0x201E,  # quotes
    0x2022, 0x2026, 0x2030, 0x2039, 0x203A,  # • … ‰ ‹ ›
    0x20AC,  # €
    0x2122,  # ™
    0x2190, 0x2191, 0x2192, 0x2193,  # arrows
    0x2212, 0x2264, 0x2265,  # − ≤ ≥
    0x2500,  # ─
    0xFFFD,  # replacement character
}

# Romanian, in both the correct comma-below forms and the legacy cedilla forms
# that older keyboards and pasted text still produce.
ROMANIAN = {
    0x0102, 0x0103,  # Ă ă
    0x00C2, 0x00E2,  # Â â
    0x00CE, 0x00EE,  # Î î
    0x0218, 0x0219,  # Ș ș
    0x021A, 0x021B,  # Ț ț
    0x015E, 0x015F,  # Ş ş  (legacy)
    0x0162, 0x0163,  # Ţ ţ  (legacy)
}

# Latin-1 accented letters. The body face draws whatever a visitor types into
# the quote form, so it carries them; the display face draws only our own
# headings and does not.
LATIN1_LETTERS = set(range(0x00C0, 0x0100))

# Russian, plus Ё and №.
CYRILLIC_RU = {0x0401, 0x0451, 0x2116} | set(range(0x0410, 0x0450))

# The whole basic Cyrillic block: Ukrainian, Belarusian and Moldovan-Cyrillic
# letters a visitor may type into the form.
CYRILLIC_FULL = set(range(0x0400, 0x0460)) | {0x0490, 0x0491, 0x2116}


def is_cyrillic(cp: int) -> bool:
    return 0x0400 <= cp <= 0x052F or cp == 0x2116 or 0xA640 <= cp <= 0xA69F


def corpus() -> set[int]:
    """Every character the site's own copy and code contains, case-closed."""
    text = set()
    for path in sorted(glob.glob(os.path.join(ROOT, "messages", "*.json"))):
        text |= set(open(path, encoding="utf-8").read())
    for dirpath, _dirs, files in os.walk(os.path.join(ROOT, "src")):
        for name in files:
            if name.endswith((".ts", ".tsx", ".mts", ".css")):
                text |= set(open(os.path.join(dirpath, name), encoding="utf-8").read())
    closed = set()
    for ch in text:
        closed |= {ch, ch.upper(), ch.lower()}
    return {ord(ch) for ch in closed if len(ch) == 1 and (ch.isprintable() or ch == " ")}


def charsets() -> dict[tuple[str, str], set[int]]:
    all_chars = corpus()
    cyr = {c for c in all_chars if is_cyrillic(c)}
    lat = {c for c in all_chars if not is_cyrillic(c)}
    return {
        ("display", "latin"): ASCII | PUNCTUATION | ROMANIAN | lat,
        ("display", "cyrillic"): CYRILLIC_RU | cyr,
        ("body", "latin"): ASCII | PUNCTUATION | ROMANIAN | LATIN1_LETTERS | lat,
        ("body", "cyrillic"): CYRILLIC_FULL | cyr,
    }


# --------------------------------------------------------------------------
# Subsetting
# --------------------------------------------------------------------------

def fetch(url: str, expected_sha256: str | None) -> bytes:
    with urllib.request.urlopen(url, timeout=60) as response:
        data = response.read()
    digest = hashlib.sha256(data).hexdigest()
    if expected_sha256 and digest != expected_sha256:
        raise SystemExit(
            f"{url}\n  expected sha256 {expected_sha256}\n  got      sha256 {digest}\n"
            "  Upstream changed. Review the new release (metrics! the fallback\n"
            "  overrides in this file were derived from the old one), then update\n"
            "  the pinned hash."
        )
    return data


def subset(source: bytes, unicodes: set[int], weight, opsz) -> tuple[bytes, list[int]]:
    """Cut `source` down to `unicodes` and clip its axes. Returns woff2 + cmap."""
    import io

    # `recalcTimestamp=False` keeps `head.modified` as upstream set it, which is
    # what makes this build reproducible: without it every run stamps "now" into
    # the file, the content hash changes, and `--check` reports false staleness.
    font = TTFont(io.BytesIO(source), recalcTimestamp=False)

    options = Options()
    # The default feature list has everything shaping needs (ccmp, locl, kern,
    # liga, calt, mark …). `tnum` is added because the `.tnum` utility in
    # globals.css asks for tabular figures, and `case` because the eyebrows are
    # uppercased in CSS and want case-sensitive punctuation forms.
    options.layout_features = list(options.layout_features) + ["tnum", "case"]
    options.notdef_outline = False
    options.name_IDs = [0, 1, 2, 3, 4, 5, 6, 13, 14, 16, 17]
    options.name_legacy = False
    # Hinting stays. Stripping it is the usual advice and costs about 100 bytes
    # per file here — but it also changes how the glyphs rasterise, and keeping
    # it is what makes this migration a pixel-for-pixel no-op against the files
    # Google was serving. 100 bytes is not worth a re-render of every page.
    options.hinting = True

    subsetter = Subsetter(options=options)
    subsetter.populate(unicodes=sorted(unicodes))
    subsetter.subset(font)

    # Axis clipping happens *after* the glyph subset: fontTools 4.60's gvar
    # subsetter trips over a font whose variations the instancer has already
    # pruned (KeyError on a glyph with no deltas left).
    limits: dict[str, object] = {"wght": weight}
    for axis in font["fvar"].axes:
        if axis.axisTag == "wght":
            continue
        limits[axis.axisTag] = opsz if (axis.axisTag == "opsz" and opsz is not None) else axis.defaultValue
    font = instancer.instantiateVariableFont(font, limits, updateFontNames=False, optimize=True)

    buffer = io.BytesIO()
    font.flavor = "woff2"
    font.save(buffer)
    woff2 = buffer.getvalue()

    return woff2, sorted(TTFont(io.BytesIO(woff2)).getBestCmap())


def unicode_range(codepoints: list[int]) -> str:
    """A compact CSS `unicode-range` covering exactly `codepoints`, no more."""
    parts: list[str] = []
    start = prev = codepoints[0]
    for cp in codepoints[1:] + [-1]:
        if cp == prev + 1:
            prev = cp
            continue
        parts.append(f"U+{start:04X}" if start == prev else f"U+{start:04X}-{prev:04X}")
        start = prev = cp
    return ",".join(parts)


# --------------------------------------------------------------------------
# Emit
# --------------------------------------------------------------------------

def ts_string(codepoints: list[int]) -> str:
    """Every covered character as one TS string literal, escaped."""
    out = []
    for cp in codepoints:
        if cp < 0x20 or cp > 0x7E or chr(cp) in '"\\':
            out.append(f"\\u{cp:04X}")
        else:
            out.append(chr(cp))
    return '"' + "".join(out) + '"'


def ts_char_union(codepoints: list[int]) -> str:
    """The same set as a union of single-character literal types."""
    members = [f'"\\u{cp:04X}"' for cp in codepoints]
    lines, row = [], []
    for member in members:
        row.append(member)
        if len(row) == 8:
            lines.append("  | " + " | ".join(row))
            row = []
    if row:
        lines.append("  | " + " | ".join(row))
    return "\n".join(lines)


HEADER = "/* GENERATED by scripts/build-fonts.py — do not edit by hand. */"


def main() -> int:
    check_only = "--check" in sys.argv

    sets = charsets()
    built: dict[str, dict] = {}

    os.makedirs(OUT_FONTS, exist_ok=True)

    for key, spec in FAMILIES.items():
        source = fetch(spec["url"], spec["sha256"] if not os.environ.get("FONTS_PIN_UPDATE") else None)
        if os.environ.get("FONTS_PIN_UPDATE"):
            print(f'  {key} sha256 = {hashlib.sha256(source).hexdigest()}')
        licence = fetch(spec["license_url"], None)
        if not check_only:
            with open(os.path.join(OUT_FONTS, f"OFL-{spec['family']}.txt"), "wb") as fh:
                fh.write(licence)

        subsets = {}
        for name in ("latin", "cyrillic"):
            woff2, cmap = subset(
                source, sets[(spec["role"], name)], spec["weight"], spec["opsz"]
            )
            digest = hashlib.sha256(woff2).hexdigest()[:10]
            filename = f"{key}-{name}.{digest}.woff2"
            if not check_only:
                with open(os.path.join(OUT_FONTS, filename), "wb") as fh:
                    fh.write(woff2)
            subsets[name] = {
                "file": f"/fonts/{filename}",
                "bytes": len(woff2),
                "range": unicode_range(cmap),
                "cmap": cmap,
            }
            print(f"  {filename}  {len(woff2):>7,} B  {len(cmap)} glyphs")
        built[key] = {"spec": spec, "subsets": subsets}

    # Sweep files that are no longer referenced, so a re-run never leaves a
    # stale hash behind in `public/`.
    keep = {os.path.basename(s["file"]) for f in built.values() for s in f["subsets"].values()}
    keep |= {f"OFL-{f['spec']['family']}.txt" for f in built.values()}
    for name in os.listdir(OUT_FONTS):
        if name not in keep and not check_only:
            os.remove(os.path.join(OUT_FONTS, name))
            print(f"  removed stale {name}")

    # ---- CSS ------------------------------------------------------------
    css = [
        HEADER,
        "/* Self-hosted, subsetted, and preloaded per locale by",
        "   `src/app/[locale]/layout.tsx`. See scripts/build-fonts.py for why. */",
        "",
    ]
    for key, data in built.items():
        spec = data["spec"]
        lo, hi = spec["weight"]
        for name in ("latin", "cyrillic"):
            s = data["subsets"][name]
            css += [
                f"/* {spec['family']} — {name}, {s['bytes']:,} bytes, {len(s['cmap'])} glyphs. */",
                "@font-face {",
                f'  font-family: "{spec["family"]}";',
                "  font-style: normal;",
                f"  font-weight: {lo} {hi};",
                "  font-display: swap;",
                f'  src: url("{s["file"]}") format("woff2");',
                f"  unicode-range: {s['range']};",
                "}",
                "",
            ]
        fb = spec["fallback"]
        css += [
            f"/* Metric-matched fallback for the swap window — the numbers below are the",
            f"   ones `next/font/google` computed for {spec['family']}, kept verbatim so the",
            "   layout does not move when the real face arrives. */",
            "@font-face {",
            f'  font-family: "{spec["family"]} Fallback";',
            f'  src: local("{fb["local"]}");',
            f'  ascent-override: {fb["ascent-override"]};',
            f'  descent-override: {fb["descent-override"]};',
            f'  line-gap-override: {fb["line-gap-override"]};',
            f'  size-adjust: {fb["size-adjust"]};',
            "}",
            "",
        ]
    css += [
        "/* `globals.css` appends the system stack after each of these. */",
        ":root {",
        '  --font-sans-face: "Commissioner", "Commissioner Fallback";',
        '  --font-serif-face: "Literata", "Literata Fallback";',
        "}",
        "",
    ]
    css_text = "\n".join(css)

    # ---- TS -------------------------------------------------------------
    lit, com = built["literata"], built["commissioner"]
    serif_cmap = sorted(set(lit["subsets"]["latin"]["cmap"]) | set(lit["subsets"]["cyrillic"]["cmap"]))
    sans_cmap = sorted(set(com["subsets"]["latin"]["cmap"]) | set(com["subsets"]["cyrillic"]["cmap"]))

    ts = f"""{HEADER}
/**
 * The shipped font files and the exact set of characters each family can draw.
 *
 * `coverage` is read back out of the woff2 that ships — it is the file's own
 * `cmap`, not a restatement of what was asked for. `src/lib/fonts.ts` turns it
 * into a compile-time guard and `src/lib/fonts.test.mts` checks it against
 * every string in `messages/` and `src/content/`.
 */

export interface FontSubsetFile {{
  /** Public URL. Content-hashed, so it is safe to cache forever. */
  readonly file: string;
  readonly bytes: number;
}}

export interface GeneratedFamily {{
  readonly family: string;
  readonly latin: FontSubsetFile;
  readonly cyrillic: FontSubsetFile;
}}

export const serifFiles = {{
  family: "{lit['spec']['family']}",
  latin: {{ file: "{lit['subsets']['latin']['file']}", bytes: {lit['subsets']['latin']['bytes']} }},
  cyrillic: {{ file: "{lit['subsets']['cyrillic']['file']}", bytes: {lit['subsets']['cyrillic']['bytes']} }},
}} as const satisfies GeneratedFamily;

export const sansFiles = {{
  family: "{com['spec']['family']}",
  latin: {{ file: "{com['subsets']['latin']['file']}", bytes: {com['subsets']['latin']['bytes']} }},
  cyrillic: {{ file: "{com['subsets']['cyrillic']['file']}", bytes: {com['subsets']['cyrillic']['bytes']} }},
}} as const satisfies GeneratedFamily;

/** Every character the display face can draw, both subsets unioned. */
export const serifCoverage =
  {ts_string(serif_cmap)};

/** Every character the body face can draw, both subsets unioned. */
export const sansCoverage =
  {ts_string(sans_cmap)};

/** `serifCoverage`, as a type. */
export type SerifGlyph =
{ts_char_union(serif_cmap)};

/** `sansCoverage`, as a type. */
export type SansGlyph =
{ts_char_union(sans_cmap)};
"""

    if check_only:
        stale = [
            os.path.relpath(os.path.join(OUT_FONTS, n), ROOT)
            for n in sorted(set(os.listdir(OUT_FONTS)) ^ keep)
        ]
        for path, want in ((OUT_CSS, css_text), (OUT_TS, ts)):
            have = open(path, encoding="utf-8").read() if os.path.exists(path) else None
            if have != want:
                stale.append(os.path.relpath(path, ROOT))
        if stale:
            print("stale generated font output: " + ", ".join(stale), file=sys.stderr)
            return 1
        print("fonts: generated output is up to date")
        return 0

    with open(OUT_CSS, "w", encoding="utf-8") as fh:
        fh.write(css_text)
    with open(OUT_TS, "w", encoding="utf-8") as fh:
        fh.write(ts)

    ro_en = lit["subsets"]["latin"]["bytes"] + com["subsets"]["latin"]["bytes"]
    ru = ro_en + lit["subsets"]["cyrillic"]["bytes"] + com["subsets"]["cyrillic"]["bytes"]
    print(f"\n  preloaded per page:  ro/en {ro_en:,} B   ru {ru:,} B")
    print(f"  wrote {os.path.relpath(OUT_CSS, ROOT)} and {os.path.relpath(OUT_TS, ROOT)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
