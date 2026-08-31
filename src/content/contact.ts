import type { LocalizedText } from "./types";

/**
 * Every contact fact that exists, and nothing else.
 *
 * There is no street address, no opening hours, no social profile and no
 * company registration anywhere in the source material — do not add any, and do
 * not emit JSON-LD fields for them (`.agents/DECISIONS.md`).
 */
export const contact = {
  phone: {
    /** E.164, for `tel:` links and JSON-LD. */
    raw: "+37379022023",
    /** How the number is written on the site. */
    display: "079 022 023",
    href: "tel:+37379022023",
  },
  whatsapp: {
    href: "https://wa.me/37379022023",
    /** External app link — open in a new tab. */
    external: true,
  },
  viber: {
    href: "viber://chat?number=37379022023",
    external: true,
  },
  email: {
    address: "info@topcleaning.md",
    href: "mailto:info@topcleaning.md",
  },
  /** The city served. Homes and offices; no wider service area is claimed. */
  city: {
    ro: "Chișinău",
    ru: "Кишинев",
    en: "Chișinău",
  } satisfies LocalizedText,
} as const;

export type Contact = typeof contact;
