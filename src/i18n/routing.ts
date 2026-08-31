import { defineRouting } from "next-intl/routing";

export const locales = ["ro", "ru", "en"] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "ro";

/**
 * BCP 47 tags used for `<html lang>` and hreflang alternates.
 */
export const localeHtmlLang: Record<Locale, string> = {
  ro: "ro-MD",
  ru: "ru-MD",
  en: "en",
};

/**
 * Text direction per locale. All three are LTR today; kept explicit so adding an
 * RTL locale is a one-line change rather than a hunt through the layout.
 */
export const localeDir: Record<Locale, "ltr" | "rtl"> = {
  ro: "ltr",
  ru: "ltr",
  en: "ltr",
};

/**
 * Localized pathnames.
 *
 * The key is the internal route (the folder under `src/app/[locale]`); the value
 * is what the visitor sees. Locked in `.agents/DECISIONS.md` — changing a
 * pathname here changes a public URL, so treat these as published contracts.
 *
 * Service slugs are localized per service and live in `src/content/services.ts`;
 * only the `[slug]` container segment is localized here.
 */
export const pathnames = {
  "/": "/",
  "/services": {
    ro: "/servicii",
    ru: "/uslugi",
    en: "/services",
  },
  "/services/[slug]": {
    ro: "/servicii/[slug]",
    ru: "/uslugi/[slug]",
    en: "/services/[slug]",
  },
  "/about": {
    ro: "/despre-noi",
    ru: "/o-nas",
    en: "/about",
  },
  "/contact": {
    ro: "/contact",
    ru: "/kontakty",
    en: "/contact",
  },
  // Unguessable private video links. Never localized: a QR code printed once
  // must keep resolving whatever locale the phone that scans it prefers.
  "/v/[token]": "/v/[token]",
} as const;

export type AppPathname = keyof typeof pathnames;

export const routing = defineRouting({
  locales,
  defaultLocale,
  // Always show the locale in the URL: /ro, /ru, /en.
  localePrefix: "always",
  // Off by design: `/` must land on `/ro` for everyone, not on whatever the
  // browser's Accept-Language happens to say (`.agents/DECISIONS.md`). The
  // language switcher is how visitors choose; the choice is then remembered by
  // next-intl's locale cookie.
  localeDetection: false,
  pathnames,
});

export function isLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value);
}
