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

export const routing = defineRouting({
  locales,
  defaultLocale,
  // Always show the locale in the URL: /ro, /ru, /en. `/` redirects to /ro.
  localePrefix: "always",
  localeDetection: true,
});

export function isLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value);
}
