import Image, { type StaticImageData } from "next/image";
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

export type PhotoProps = {
  src: string | StaticImageData;
  /**
   * Required, and required to be written per locale. An empty string is only
   * correct when the photograph is genuinely decorative and the surrounding
   * text already says everything it says.
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
  /** Only the above-the-fold hero. Never more than one per page. */
  priority?: boolean;
  /**
   * Direction B's `.item:hover img` — a 1.035 scale over 600ms. Opt in on
   * photographs that are inside a link. Suppressed under
   * `prefers-reduced-motion`.
   */
  zoom?: boolean;
  quality?: number;
  /** Classes for the aspect-ratio box. */
  className?: string;
  /** Classes for the `<img>` itself (object-position, for instance). */
  imageClassName?: string;
};

/**
 * Every photograph on the site goes through here.
 *
 * The box owns the aspect ratio and clips; the image fills it. That means the
 * space is reserved before the image loads, so a page physically cannot
 * introduce layout shift by forgetting a dimension — `width`/`height` are not
 * part of the API because `fill` plus a ratio box is the only shape allowed.
 */
export function Photo({
  src,
  alt,
  ratio,
  ratioMd,
  ratioLg,
  sizes,
  priority = false,
  zoom = false,
  quality,
  className,
  imageClassName,
}: PhotoProps) {
  return (
    <div
      className={cn(
        "relative w-full overflow-hidden bg-surface-2",
        RATIO[ratio],
        ratioMd && RATIO_MD[ratioMd],
        ratioLg && RATIO_LG[ratioLg],
        className,
      )}
    >
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        priority={priority}
        quality={quality}
        className={cn(
          "object-cover",
          zoom &&
            "motion-safe:transition-transform motion-safe:duration-(--duration-photo) motion-safe:ease-(--ease-photo) motion-safe:group-hover:scale-[1.035] motion-safe:group-focus-visible:scale-[1.035]",
          imageClassName,
        )}
      />
    </div>
  );
}
