/**
 * Photography slots.
 *
 * A slot is a *position* in the design, not a file: the current images are
 * Unsplash placeholders that get swapped for Top Cleaning's own photos before
 * launch (see `.agents/assets.md`). Content references slots by id, so the swap
 * never touches this file's consumers.
 *
 * Alt text is per locale and lives in the message files under `common.alt.*`;
 * `altKey` is the fully-qualified key, usable with a root `useTranslations()`.
 *
 * ## What is on disk
 *
 * Every slot ships pre-encoded derivatives in `public/images`: AVIF and WebP at
 * each width the layout can request, plus one JPEG as the last-resort fallback,
 * and a ~20px blurred LQIP inlined as `blurDataURL`. Nothing is wider than
 * 1920px and nothing is upscaled past its master.
 *
 * Two ways to consume a slot, both zero-CLS because `width`/`height` are the
 * slot's full-size intrinsic dimensions and every derivative is that exact
 * aspect ratio:
 *
 * 1. `next/image` — pass `asset.src`, `asset.blurDataURL` and
 *    `placeholder="blur"`. Next re-encodes to AVIF/WebP itself, so the
 *    pre-built `srcSet` entries go unused. Simplest; costs an image-optimizer
 *    round trip, which on Cloudflare Workers needs a configured loader.
 * 2. A plain `<picture>` — emit `srcSet.avif` as `type="image/avif"`, then
 *    `srcSet.webp`, then the `<img src>` from `asset.src`. Serves these exact
 *    files straight off the CDN with no optimizer in the request path.
 *
 * Either way the caller still owns `sizes`: `widths` says what exists, not how
 * wide the box is.
 */

/** The formats every slot is encoded in, best first. */
export type ImageFormat = "avif" | "webp" | "jpeg";

export const imageSlotIds = [
  "hero",
  "serviceGeneral",
  "serviceMaintenance",
  "serviceAfterRenovation",
  "serviceUpholstery",
  "process",
  "about",
  "servicesIndex",
  "contact",
] as const;

export type ImageSlotId = (typeof imageSlotIds)[number];

/** Where a placeholder came from, and who took it. */
export interface ImageSource {
  readonly provider: "unsplash";
  /** Unsplash file id, e.g. `photo-1758523670739-0d26a3ee976d`. */
  readonly id: string;
  /** The full-resolution original. */
  readonly url: string;
  /** `https://unsplash.com/photos/<id>` — null where it could not be resolved. */
  readonly pageUrl: string | null;
  /** Null where the photographer could not be resolved without an API key. */
  readonly photographer: string | null;
  readonly profileUrl: string | null;
  readonly license: "Unsplash License";
}

/** One encoded family of files: same crop, many widths, three formats. */
export interface ImageAsset {
  /**
   * JPEG fallback, for the vanishingly few clients with neither AVIF nor WebP.
   * Same crop and aspect ratio as `width` × `height`, but deliberately narrower
   * on the wide slots — `srcSet.jpeg` carries its real width.
   */
  readonly src: string;
  /** Largest encoded width, and the height at that width. */
  readonly width: number;
  readonly height: number;
  /** Widths that exist as AVIF and WebP, ascending. */
  readonly widths: readonly number[];
  readonly srcSet: Readonly<Record<ImageFormat, string>>;
  /** ~20px blurred LQIP for `placeholder="blur"`. */
  readonly blurDataURL: string;
}

export interface ImageSlot {
  readonly id: ImageSlotId;
  /** Fully-qualified message key holding the per-locale alt text. */
  readonly altKey: `common.alt.${ImageSlotId}`;
  readonly asset: ImageAsset;
  /**
   * Art-directed portrait crop for narrow viewports. Only the hero has one —
   * its 2:1 landscape file loses the subject when the box goes 4:5 on mobile.
   */
  readonly mobile?: ImageAsset;
  /** CSS `object-position` that keeps the subject when the box crops. */
  readonly objectPosition: string;
  /** Provenance of the current placeholder. Replace when real photos land. */
  readonly source: ImageSource;
}

export const imageSlots: Readonly<Record<ImageSlotId, ImageSlot>> = {
  hero: {
    id: "hero",
    altKey: "common.alt.hero",
    asset: {
      src: "/images/hero-1200.jpg",
      width: 1920,
      height: 960,
      widths: [640, 828, 1080, 1200, 1600, 1920],
      srcSet: {
        avif: "/images/hero-640.avif 640w, /images/hero-828.avif 828w, /images/hero-1080.avif 1080w, /images/hero-1200.avif 1200w, /images/hero-1600.avif 1600w, /images/hero-1920.avif 1920w",
        webp: "/images/hero-640.webp 640w, /images/hero-828.webp 828w, /images/hero-1080.webp 1080w, /images/hero-1200.webp 1200w, /images/hero-1600.webp 1600w, /images/hero-1920.webp 1920w",
        jpeg: "/images/hero-640.jpg 640w, /images/hero-1200.jpg 1200w",
      },
      blurDataURL:
        "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDABQODxIPDRQSEBIXFRQYHjIhHhwcHj0sLiQySUBMS0dARkVQWnNiUFVtVkVGZIhlbXd7gYKBTmCNl4x9lnN+gXz/2wBDARUXFx4aHjshITt8U0ZTfHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHz/wAARCAAKABQDASIAAhEBAxEB/8QAFwAAAwEAAAAAAAAAAAAAAAAAAAIFBP/EACMQAAIBBAEDBQAAAAAAAAAAAAECEQADBBIhIjEyBRRBUZH/xAAWAQEBAQAAAAAAAAAAAAAAAAACAAH/xAAYEQADAQEAAAAAAAAAAAAAAAAAARIRQf/aAAwDAQACEQMRAD8At5Wci4im2/XciADBA+6fJyVtlnJXpE9+9TfSEW5kZW6hovwNhPGpqg6qXeQDDECR8VjZZwz++sr5NyeeBNFO9q3t4L+UUKYpR//Z",
    },
    mobile: {
      src: "/images/hero-portrait-828.jpg",
      width: 828,
      height: 1035,
      widths: [640, 828],
      srcSet: {
        avif: "/images/hero-portrait-640.avif 640w, /images/hero-portrait-828.avif 828w",
        webp: "/images/hero-portrait-640.webp 640w, /images/hero-portrait-828.webp 828w",
        jpeg: "/images/hero-portrait-828.jpg 828w",
      },
      blurDataURL:
        "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDABQODxIPDRQSEBIXFRQYHjIhHhwcHj0sLiQySUBMS0dARkVQWnNiUFVtVkVGZIhlbXd7gYKBTmCNl4x9lnN+gXz/2wBDARUXFx4aHjshITt8U0ZTfHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHz/wAARCAAZABQDASIAAhEBAxEB/8QAGQAAAgMBAAAAAAAAAAAAAAAAAAQCAwUG/8QAKRAAAQMCAwcFAQAAAAAAAAAAAQACAwQREiEiBRMxQWFxgTIzUrHB0f/EABYBAQEBAAAAAAAAAAAAAAAAAAABAv/EABURAQEAAAAAAAAAAAAAAAAAAAAR/9oADAMBAAIRAxEAPwDqiQASTYKikq21W9wi27eW9+qhtCYRUrzcBwBcL9ATw8JbZMsr6SaSRgZKDbCOWnL7VQ1P7nhChI4ktLhYlouEKDHENXW00Ur3nW62FzNQz558Fp0lJPTmQvka4Hk0WumI+De36rvl3QZ+B0l5IZhgebi7f6hOSerwhYjVf//Z",
    },
    objectPosition: "40% 50%",
    source: {
      provider: "unsplash",
      id: "photo-1758523670739-0d26a3ee976d",
      url: "https://images.unsplash.com/photo-1758523670739-0d26a3ee976d",
      pageUrl: "https://unsplash.com/photos/u8knk6Hl8JA",
      photographer: "Vitaly Gariev",
      profileUrl: "https://unsplash.com/@silverkblack",
      license: "Unsplash License",
    },
  },
  serviceGeneral: {
    id: "serviceGeneral",
    altKey: "common.alt.serviceGeneral",
    asset: {
      src: "/images/service-general-828.jpg",
      width: 1080,
      height: 810,
      widths: [480, 640, 828, 1080],
      srcSet: {
        avif: "/images/service-general-480.avif 480w, /images/service-general-640.avif 640w, /images/service-general-828.avif 828w, /images/service-general-1080.avif 1080w",
        webp: "/images/service-general-480.webp 480w, /images/service-general-640.webp 640w, /images/service-general-828.webp 828w, /images/service-general-1080.webp 1080w",
        jpeg: "/images/service-general-828.jpg 828w",
      },
      blurDataURL:
        "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDABQODxIPDRQSEBIXFRQYHjIhHhwcHj0sLiQySUBMS0dARkVQWnNiUFVtVkVGZIhlbXd7gYKBTmCNl4x9lnN+gXz/2wBDARUXFx4aHjshITt8U0ZTfHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHz/wAARCAAPABQDASIAAhEBAxEB/8QAFwAAAwEAAAAAAAAAAAAAAAAAAAMEAf/EACcQAAEDAwIFBQEAAAAAAAAAAAECAxEABBIFIRMiMUFhI3GRsfDx/8QAFQEBAQAAAAAAAAAAAAAAAAAAAQL/xAAYEQADAQEAAAAAAAAAAAAAAAAAARECIf/aAAwDAQACEQMRAD8A3TFoQhKldVQNz0M9vePqnXF2uyU9k4p0FcHLfEmSCPEdqS083bk2ziji3zNpjz/YqPUXmFpdc4qypakjhgbA7wT+70KUdcRcbJt71F85VvMjf5JopWn3kWoQrM4mBAHSimE0/9k=",
    },
    objectPosition: "50% 50%",
    source: {
      provider: "unsplash",
      id: "photo-1758272421751-963195322eaa",
      url: "https://images.unsplash.com/photo-1758272421751-963195322eaa",
      pageUrl: "https://unsplash.com/photos/Y3vDCL7_das",
      photographer: "Vitaly Gariev",
      profileUrl: "https://unsplash.com/@silverkblack",
      license: "Unsplash License",
    },
  },
  serviceMaintenance: {
    id: "serviceMaintenance",
    altKey: "common.alt.serviceMaintenance",
    asset: {
      src: "/images/service-maintenance-828.jpg",
      width: 1080,
      height: 810,
      widths: [480, 640, 828, 1080],
      srcSet: {
        avif: "/images/service-maintenance-480.avif 480w, /images/service-maintenance-640.avif 640w, /images/service-maintenance-828.avif 828w, /images/service-maintenance-1080.avif 1080w",
        webp: "/images/service-maintenance-480.webp 480w, /images/service-maintenance-640.webp 640w, /images/service-maintenance-828.webp 828w, /images/service-maintenance-1080.webp 1080w",
        jpeg: "/images/service-maintenance-828.jpg 828w",
      },
      blurDataURL:
        "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDABQODxIPDRQSEBIXFRQYHjIhHhwcHj0sLiQySUBMS0dARkVQWnNiUFVtVkVGZIhlbXd7gYKBTmCNl4x9lnN+gXz/2wBDARUXFx4aHjshITt8U0ZTfHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHz/wAARCAAPABQDASIAAhEBAxEB/8QAFwAAAwEAAAAAAAAAAAAAAAAAAAQFA//EACEQAAEEAgEFAQAAAAAAAAAAAAEAAgMRBCExBRITQVEi/8QAFQEBAQAAAAAAAAAAAAAAAAAAAQD/xAAXEQEBAQEAAAAAAAAAAAAAAAAAAREh/9oADAMBAAIRAxEAPwBrOw5fPJM3IP6dbY62TXAU/pMZyGyMfI627F7Vyd3kNsaCQdE+vqnRTNZJ2xRBjrcN+zyeEXDNbwdPjYw7uzfCExjTCSIGqI0R8KEcT//Z",
    },
    objectPosition: "50% 50%",
    source: {
      provider: "unsplash",
      id: "photo-1647381518264-97ff1835026f",
      url: "https://images.unsplash.com/photo-1647381518264-97ff1835026f",
      pageUrl: "https://unsplash.com/photos/MwxsRSG1A2s",
      photographer: "Josue Michel",
      profileUrl: "https://unsplash.com/@josuemichelphotography",
      license: "Unsplash License",
    },
  },
  serviceAfterRenovation: {
    id: "serviceAfterRenovation",
    altKey: "common.alt.serviceAfterRenovation",
    asset: {
      src: "/images/service-after-renovation-828.jpg",
      width: 1080,
      height: 810,
      widths: [480, 640, 828, 1080],
      srcSet: {
        avif: "/images/service-after-renovation-480.avif 480w, /images/service-after-renovation-640.avif 640w, /images/service-after-renovation-828.avif 828w, /images/service-after-renovation-1080.avif 1080w",
        webp: "/images/service-after-renovation-480.webp 480w, /images/service-after-renovation-640.webp 640w, /images/service-after-renovation-828.webp 828w, /images/service-after-renovation-1080.webp 1080w",
        jpeg: "/images/service-after-renovation-828.jpg 828w",
      },
      blurDataURL:
        "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDABQODxIPDRQSEBIXFRQYHjIhHhwcHj0sLiQySUBMS0dARkVQWnNiUFVtVkVGZIhlbXd7gYKBTmCNl4x9lnN+gXz/2wBDARUXFx4aHjshITt8U0ZTfHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHz/wAARCAAPABQDASIAAhEBAxEB/8QAGAAAAgMAAAAAAAAAAAAAAAAAAAQDBQb/xAAgEAABAwMFAQAAAAAAAAAAAAABAAIRAwQSBRQhMUEj/8QAFQEBAQAAAAAAAAAAAAAAAAAAAQD/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwC40z72jHvIL/SE5txBMgQs9pN7UtrPAiSXSD3wn906Mi9wceT6EI1UY1roiUKK3qGtTzdHcISH/9k=",
    },
    objectPosition: "50% 50%",
    source: {
      provider: "unsplash",
      id: "photo-1692133220749-1c55bb918ad8",
      url: "https://images.unsplash.com/photo-1692133220749-1c55bb918ad8",
      pageUrl: "https://unsplash.com/photos/SCbkyJR3QSM",
      photographer: "Brian Wangenheim",
      profileUrl: "https://unsplash.com/@brianwangenheim",
      license: "Unsplash License",
    },
  },
  serviceUpholstery: {
    id: "serviceUpholstery",
    altKey: "common.alt.serviceUpholstery",
    asset: {
      src: "/images/service-upholstery-828.jpg",
      width: 1080,
      height: 810,
      widths: [480, 640, 828, 1080],
      srcSet: {
        avif: "/images/service-upholstery-480.avif 480w, /images/service-upholstery-640.avif 640w, /images/service-upholstery-828.avif 828w, /images/service-upholstery-1080.avif 1080w",
        webp: "/images/service-upholstery-480.webp 480w, /images/service-upholstery-640.webp 640w, /images/service-upholstery-828.webp 828w, /images/service-upholstery-1080.webp 1080w",
        jpeg: "/images/service-upholstery-828.jpg 828w",
      },
      blurDataURL:
        "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDABQODxIPDRQSEBIXFRQYHjIhHhwcHj0sLiQySUBMS0dARkVQWnNiUFVtVkVGZIhlbXd7gYKBTmCNl4x9lnN+gXz/2wBDARUXFx4aHjshITt8U0ZTfHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHz/wAARCAAPABQDASIAAhEBAxEB/8QAFwABAQEBAAAAAAAAAAAAAAAABAAFBv/EACIQAQABBAIABwAAAAAAAAAAAAECAAMRIQQTIjFBYXGBkf/EABUBAQEAAAAAAAAAAAAAAAAAAAAD/8QAFREBAQAAAAAAAAAAAAAAAAAAABL/2gAMAwEAAhEDEQA/AHR5BZldZCiE9fjTO2KnX4zIPon1XNytXF3J0aRxSOGzjblElLDMXfnipUpLR5dwjex7VUK5ElJWI/NVKJf/2Q==",
    },
    objectPosition: "50% 50%",
    source: {
      provider: "unsplash",
      id: "photo-1763279934323-edb3735f6a6e",
      url: "https://images.unsplash.com/photo-1763279934323-edb3735f6a6e",
      pageUrl: "https://unsplash.com/photos/7mmmEkyk0aQ",
      photographer: "Alina Bondar",
      profileUrl: "https://unsplash.com/@alinabondar_ph",
      license: "Unsplash License",
    },
  },
  process: {
    id: "process",
    altKey: "common.alt.process",
    asset: {
      src: "/images/process-1080.jpg",
      width: 1440,
      height: 1080,
      widths: [640, 828, 1080, 1440],
      srcSet: {
        avif: "/images/process-640.avif 640w, /images/process-828.avif 828w, /images/process-1080.avif 1080w, /images/process-1440.avif 1440w",
        webp: "/images/process-640.webp 640w, /images/process-828.webp 828w, /images/process-1080.webp 1080w, /images/process-1440.webp 1440w",
        jpeg: "/images/process-1080.jpg 1080w",
      },
      blurDataURL:
        "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDABQODxIPDRQSEBIXFRQYHjIhHhwcHj0sLiQySUBMS0dARkVQWnNiUFVtVkVGZIhlbXd7gYKBTmCNl4x9lnN+gXz/2wBDARUXFx4aHjshITt8U0ZTfHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHz/wAARCAAPABQDASIAAhEBAxEB/8QAFwABAQEBAAAAAAAAAAAAAAAAAAMEBf/EACQQAAEDBAEDBQAAAAAAAAAAAAEAAgMEERIhIgUUMTJBUWFx/8QAFgEBAQEAAAAAAAAAAAAAAAAAAgAB/8QAFxEBAQEBAAAAAAAAAAAAAAAAAEEBEf/aAAwDAQACEQMRAD8A7dbLjG6McSR6h5H2p0sndUUmOzrfynUpg6BgsSwu5AG19KfRiCyQMsIrDAD2CNKIyUMjnXDGgfiLbM2fPg4EAeSLIpuZ2v/Z",
    },
    objectPosition: "45% 50%",
    source: {
      provider: "unsplash",
      id: "photo-1646980241033-cd7abda2ee88",
      url: "https://images.unsplash.com/photo-1646980241033-cd7abda2ee88",
      pageUrl: "https://unsplash.com/photos/FhsFUo-Wfc0",
      photographer: "Josue Michel",
      profileUrl: "https://unsplash.com/@josuemichelphotography",
      license: "Unsplash License",
    },
  },
  about: {
    id: "about",
    altKey: "common.alt.about",
    asset: {
      src: "/images/about-828.jpg",
      width: 1080,
      height: 1350,
      widths: [480, 640, 828, 1080],
      srcSet: {
        avif: "/images/about-480.avif 480w, /images/about-640.avif 640w, /images/about-828.avif 828w, /images/about-1080.avif 1080w",
        webp: "/images/about-480.webp 480w, /images/about-640.webp 640w, /images/about-828.webp 828w, /images/about-1080.webp 1080w",
        jpeg: "/images/about-828.jpg 828w",
      },
      blurDataURL:
        "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDABQODxIPDRQSEBIXFRQYHjIhHhwcHj0sLiQySUBMS0dARkVQWnNiUFVtVkVGZIhlbXd7gYKBTmCNl4x9lnN+gXz/2wBDARUXFx4aHjshITt8U0ZTfHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHz/wAARCAAZABQDASIAAhEBAxEB/8QAGAAAAwEBAAAAAAAAAAAAAAAAAAMFBAL/xAAsEAACAQMCAwUJAAAAAAAAAAABAgMABBEhMQUSExQiUWFyIzIzQXGCkbHR/8QAFwEBAQEBAAAAAAAAAAAAAAAAAQIAA//EABgRAQADAQAAAAAAAAAAAAAAAAABETFB/9oADAMBAAIRAxEAPwCnGgkPsx+fnSLqWOCZIpHCyOO6N8/ynO8sDRPCp6QbMjLjbHn9amXNxD2o3rPl11VANjtmuS4aZGMbFWVQfA6UVK7XcSAOwVi2uWlAJoos0p8OuetYSwu+MEAHlO3hvU7iVslvGnKzuGJB0A21rXZ/Df1il8X3X7v0KeNGpDXKnaDA8s0Vzc++vpooW//Z",
    },
    objectPosition: "50% 50%",
    source: {
      provider: "unsplash",
      id: "photo-1691057185806-ea8b5b9a4506",
      url: "https://images.unsplash.com/photo-1691057185806-ea8b5b9a4506",
      pageUrl: "https://unsplash.com/photos/HyeztRmq6YE",
      photographer: "Kate Laine",
      profileUrl: "https://unsplash.com/@kikimora33",
      license: "Unsplash License",
    },
  },
  servicesIndex: {
    id: "servicesIndex",
    altKey: "common.alt.servicesIndex",
    asset: {
      src: "/images/services-index-1080.jpg",
      width: 1440,
      height: 960,
      widths: [640, 828, 1080, 1440],
      srcSet: {
        avif: "/images/services-index-640.avif 640w, /images/services-index-828.avif 828w, /images/services-index-1080.avif 1080w, /images/services-index-1440.avif 1440w",
        webp: "/images/services-index-640.webp 640w, /images/services-index-828.webp 828w, /images/services-index-1080.webp 1080w, /images/services-index-1440.webp 1440w",
        jpeg: "/images/services-index-1080.jpg 1080w",
      },
      blurDataURL:
        "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDABQODxIPDRQSEBIXFRQYHjIhHhwcHj0sLiQySUBMS0dARkVQWnNiUFVtVkVGZIhlbXd7gYKBTmCNl4x9lnN+gXz/2wBDARUXFx4aHjshITt8U0ZTfHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHz/wAARCAANABQDASIAAhEBAxEB/8QAGAAAAwEBAAAAAAAAAAAAAAAAAAIDBAX/xAAgEAACAgICAgMAAAAAAAAAAAABAwACBBESIQUiMUGB/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAL/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwDupsOQGx1My/L4b8iqVMta9joeh0f2Vx6cHEki3Ij6+BKHDxgwNCFhg7FhXsSFH3CJuED/2Q==",
    },
    objectPosition: "50% 50%",
    source: {
      provider: "unsplash",
      id: "photo-1567016376408-0226e4d0c1ea",
      url: "https://images.unsplash.com/photo-1567016376408-0226e4d0c1ea",
      pageUrl: null,
      photographer: null,
      profileUrl: null,
      license: "Unsplash License",
    },
  },
  contact: {
    id: "contact",
    altKey: "common.alt.contact",
    asset: {
      src: "/images/contact-1080.jpg",
      width: 1440,
      height: 960,
      widths: [640, 828, 1080, 1440],
      srcSet: {
        avif: "/images/contact-640.avif 640w, /images/contact-828.avif 828w, /images/contact-1080.avif 1080w, /images/contact-1440.avif 1440w",
        webp: "/images/contact-640.webp 640w, /images/contact-828.webp 828w, /images/contact-1080.webp 1080w, /images/contact-1440.webp 1440w",
        jpeg: "/images/contact-1080.jpg 1080w",
      },
      blurDataURL:
        "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDABQODxIPDRQSEBIXFRQYHjIhHhwcHj0sLiQySUBMS0dARkVQWnNiUFVtVkVGZIhlbXd7gYKBTmCNl4x9lnN+gXz/2wBDARUXFx4aHjshITt8U0ZTfHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHz/wAARCAANABQDASIAAhEBAxEB/8QAFgABAQEAAAAAAAAAAAAAAAAABQAC/8QAIRAAAgICAQUBAQAAAAAAAAAAAQIDBAAREgUTITFBcbH/xAAVAQEBAAAAAAAAAAAAAAAAAAACAf/EABgRAQEAAwAAAAAAAAAAAAAAAAABAhEh/9oADAMBAAIRAxEAPwBCOZlszzSR8Y10SPbMdfBiHcj4EqG1reBWp3qdVsiJmCxxBgvLwfXvN0Llu9Wkk7qoFYrxK8vn7glK48Ys9bhSXSMxXXgga3lhfU60lmyGeUDShQAnj+5ZdC//2Q==",
    },
    objectPosition: "50% 50%",
    source: {
      provider: "unsplash",
      id: "photo-1583847268964-b28dc8f51f92",
      url: "https://images.unsplash.com/photo-1583847268964-b28dc8f51f92",
      pageUrl: "https://unsplash.com/photos/OtXADkUh3-I",
      photographer: "Minh Pham",
      profileUrl: "https://unsplash.com/@minhphamdesign",
      license: "Unsplash License",
    },
  },
};

/**
 * The social share card. Not an `ImageSlot`: crawlers want one fixed 1200×630
 * raster with no content negotiation and no responsive set, and its alt text is
 * `meta` copy rather than `common.alt`.
 */
export const ogImage = {
  src: "/images/og.jpg",
  width: 1200,
  height: 630,
  type: "image/jpeg",
  source: {
    provider: "unsplash",
    id: "photo-1758523670739-0d26a3ee976d",
    url: "https://images.unsplash.com/photo-1758523670739-0d26a3ee976d",
    pageUrl: "https://unsplash.com/photos/u8knk6Hl8JA",
    photographer: "Vitaly Gariev",
    profileUrl: "https://unsplash.com/@silverkblack",
    license: "Unsplash License",
  },
} as const satisfies {
  readonly src: string;
  readonly width: number;
  readonly height: number;
  readonly type: string;
  readonly source: ImageSource;
};
