import type { ImageAsset, ImageSlot } from "@/content/images";
import { cn } from "@/lib/cn";

/**
 * Ratios Direction B actually uses. `auto` means "the parent sets the height"
 * — only for a photograph stretching to fill a band.
 */
export type PhotoRatio = "4/5" | "3/2" | "16/9" | "2/1" | "4/3" | "1/1" | "auto";

const RATIO: Record<PhotoRatio, string> = {
  "4/5": "aspect-[4/5]",
  "3/2": "aspect-[3/2]",
  "16/9": "aspect-[16/9]",
  "2/1": "aspect-[2/1]",
  "4/3": "aspect-[4/3]",
  "1/1": "aspect-square",
  auto: "aspect-auto h-full",
};

/** ≥620px — the deck's first photographic breakpoint. */
const RATIO_MD: Record<PhotoRatio, string> = {
  "4/5": "min-[620px]:aspect-[4/5]",
  "3/2": "min-[620px]:aspect-[3/2]",
  "16/9": "min-[620px]:aspect-[16/9]",
  "2/1": "min-[620px]:aspect-[2/1]",
  "4/3": "min-[620px]:aspect-[4/3]",
  "1/1": "min-[620px]:aspect-square",
  auto: "min-[620px]:aspect-auto min-[620px]:h-full",
};

/** ≥1000px — the deck's second photographic breakpoint. */
const RATIO_LG: Record<PhotoRatio, string> = {
  "4/5": "min-[1000px]:aspect-[4/5]",
  "3/2": "min-[1000px]:aspect-[3/2]",
  "16/9": "min-[1000px]:aspect-[16/9]",
  "2/1": "min-[1000px]:aspect-[2/1]",
  "4/3": "min-[1000px]:aspect-[4/3]",
  "1/1": "min-[1000px]:aspect-square",
  auto: "min-[1000px]:aspect-auto min-[1000px]:h-full",
};

/**
 * The width below which an art-directed `mobile` crop takes over. It is the
 * same 620px the ratio tokens above switch at, because that is exactly the
 * moment the hero stops being a 4:5 portrait box.
 */
const MOBILE_MEDIA = "(max-width: 619.98px)";

export type PhotoProps = {
  /**
   * A photography slot from `@/content`. The slot carries every encoded
   * derivative, the LQIP and the crop's focal point, so a call site cannot
   * accidentally serve the wrong file or forget `object-position`.
   */
  slot: ImageSlot;
  /**
   * Required, and required to be written per locale — read it from the slot's
   * own `altKey`. An empty string is only correct when the photograph is
   * genuinely decorative and the surrounding text already says everything it
   * says.
   */
  alt: string;
  /** The box's aspect ratio below 620px. */
  ratio: PhotoRatio;
  /** Optional override from 620px up. */
  ratioMd?: PhotoRatio;
  /** Optional override from 1000px up. */
  ratioLg?: PhotoRatio;
  /**
   * Required. The rendered width of the image at each breakpoint, e.g.
   * `"(min-width: 620px) 50vw, 100vw"`. There is no default on purpose: a wrong
   * `sizes` is the single most expensive image mistake, and guessing it for the
   * caller hides the cost.
   */
  sizes: string;
  /**
   * `sizes` for the art-directed narrow crop, where the slot has one. Defaults
   * to `100vw`, which is what every mobile-crop position in this design is.
   */
  mobileSizes?: string;
  /**
   * Only the above-the-fold hero. Never more than one per page: it swaps lazy
   * loading for an eager, high-priority fetch.
   */
  priority?: boolean;
  /**
   * Direction B's `.item:hover img` — a 1.035 scale over 600ms. Opt in on
   * photographs that are inside a link (the link needs `group`). Suppressed
   * under `prefers-reduced-motion`.
   */
  zoom?: boolean;
  /** Classes for the aspect-ratio box. */
  className?: string;
  /** Classes for the `<img>` itself. */
  imageClassName?: string;
};

type SourceSetProps = {
  asset: ImageAsset;
  sizes: string;
  media?: string;
};

/**
 * AVIF first, then WebP. The JPEG is deliberately *not* emitted as a `<source>`
 * for the desktop asset — it is the `<img src>` itself, which is what every
 * client that understood neither of the first two falls back to.
 */
function SourceSet({ asset, sizes, media }: SourceSetProps) {
  return (
    <>
      <source
        media={media}
        type="image/avif"
        srcSet={asset.srcSet.avif}
        sizes={sizes}
      />
      <source
        media={media}
        type="image/webp"
        srcSet={asset.srcSet.webp}
        sizes={sizes}
      />
      {media ? (
        <source
          media={media}
          type="image/jpeg"
          srcSet={asset.srcSet.jpeg}
          sizes={sizes}
        />
      ) : null}
    </>
  );
}

/**
 * Every photograph on the site goes through here.
 *
 * It is a plain `<picture>`, not `next/image`, and that is a decision rather
 * than an omission. The photography step pre-encoded AVIF, WebP and JPEG at
 * every width the layout can ask for; routing those files back through an
 * image optimiser would re-encode work that is already done, and on Cloudflare
 * Workers it would additionally need a configured loader in the request path.
 * Served this way the bytes come straight off the CDN, and the component ships
 * zero JavaScript.
 *
 * Two guarantees survive from the `next/image` version:
 *
 * 1. **Zero CLS by construction.** The box owns the aspect ratio and clips; the
 *    image is absolutely positioned inside it. Space is reserved before a
 *    single byte of the photograph arrives, so a call site physically cannot
 *    introduce layout shift by forgetting a dimension — width/height are not
 *    part of the API.
 * 2. **Blur-up.** The slot's ~20px LQIP is painted as the box's background at
 *    the same crop and focal point, so the space is filled with a recognisable
 *    smear rather than a grey rectangle. It needs no JavaScript: the photograph
 *    simply paints over it.
 */
export function Photo({
  slot,
  alt,
  ratio,
  ratioMd,
  ratioLg,
  sizes,
  mobileSizes = "100vw",
  priority = false,
  zoom = false,
  className,
  imageClassName,
}: PhotoProps) {
  const { asset, mobile, objectPosition } = slot;

  return (
    <div
      className={cn(
        "relative w-full overflow-hidden bg-surface-2 bg-cover bg-no-repeat",
        RATIO[ratio],
        ratioMd && RATIO_MD[ratioMd],
        ratioLg && RATIO_LG[ratioLg],
        className,
      )}
      style={{
        backgroundImage: `url("${asset.blurDataURL}")`,
        backgroundPosition: objectPosition,
      }}
    >
      <picture>
        {mobile ? (
          <SourceSet asset={mobile} sizes={mobileSizes} media={MOBILE_MEDIA} />
        ) : null}
        <SourceSet asset={asset} sizes={sizes} />
        {/* A plain <img>, deliberately — see the component note above. */}
        <img
          src={asset.src}
          srcSet={asset.srcSet.jpeg}
          sizes={sizes}
          alt={alt}
          width={asset.width}
          height={asset.height}
          loading={priority ? "eager" : "lazy"}
          fetchPriority={priority ? "high" : "auto"}
          decoding={priority ? "sync" : "async"}
          style={{ objectPosition }}
          className={cn(
            "absolute inset-0 size-full object-cover",
            zoom &&
              "motion-safe:transition-transform motion-safe:duration-(--duration-photo) motion-safe:ease-(--ease-photo) motion-safe:group-hover:scale-[1.035] motion-safe:group-focus-visible:scale-[1.035]",
            imageClassName,
          )}
        />
      </picture>
    </div>
  );
}
