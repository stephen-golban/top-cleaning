/**
 * The only contact facts that exist (`.agents/DECISIONS.md`). There is no
 * street address, no opening hours, no social profile and no company
 * registration — do not add fields here that the business has not published.
 *
 * These are data, not copy: the digits are identical in ro/ru/en, so they live
 * in code rather than in `messages/*.json`. Everything that *reads* as language
 * — labels, aria text — goes through next-intl.
 */
export const CONTACT = {
  /** How the number is written on the page. */
  phoneDisplay: "079 022 023",
  /** E.164, for `tel:` and for JSON-LD. */
  phoneE164: "+37379022023",
  phoneHref: "tel:+37379022023",
  email: "info@topcleaning.md",
  emailHref: "mailto:info@topcleaning.md",
  whatsappHref: "https://wa.me/37379022023",
  viberHref: "viber://chat?number=37379022023",
} as const;
