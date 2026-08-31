"use client";

import type { ComponentProps } from "react";
import { useParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/cn";
import { locales, type Locale } from "@/i18n/routing";

/** Displayed label. Locale codes, not translated content. */
const CODE: Record<Locale, string> = { ro: "RO", ru: "RU", en: "EN" };

/**
 * Message keys for the endonyms. A language is named in its own language in
 * every locale, so `common.language.ru` is "Русский" in all three files — the
 * keys exist so translators own the strings, not so they get translated.
 */
const ENDONYM_KEY = {
  ro: "language.ro",
  ru: "language.ru",
  en: "language.en",
} as const satisfies Record<Locale, string>;

type LinkHref = ComponentProps<typeof Link>["href"];

export type LanguageSwitcherProps = {
  /** `sm` for the header bar, `md` inside the mobile menu. */
  size?: "sm" | "md";
  className?: string;
};

/**
 * Switches locale while staying on the current page.
 *
 * Each option is a real `<a>`, so the switcher works without JavaScript, is
 * crawlable, and supports middle-click. `usePathname` from next-intl returns
 * the route in its internal form, and dynamic segments are passed back through
 * `params`, so the target URL is the *localized* pathname for the new locale
 * rather than the current locale's slug with a different prefix.
 */
export function LanguageSwitcher({ size = "sm", className }: LanguageSwitcherProps) {
  const t = useTranslations("common");
  const active = useLocale();
  const pathname = usePathname();
  const params = useParams();

  // `params` always contains `locale`; anything beyond it is a dynamic segment
  // that the target route needs in order to resolve its localized slug.
  const hasDynamicSegments = Object.keys(params).length > 1;
  const href = (
    hasDynamicSegments ? ({ pathname, params } as unknown as LinkHref) : pathname
  ) as LinkHref;

  const cell = size === "sm" ? "h-8 min-w-8 text-fine" : "h-11 min-w-11 text-ui";

  return (
    <div
      role="group"
      aria-label={t("language.label")}
      className={cn("flex items-center gap-0.5", className)}
    >
      {locales.map((locale) =>
        locale === active ? (
          <span
            key={locale}
            aria-current="true"
            lang={locale}
            className={cn(
              "inline-flex items-center justify-center rounded-xs px-1.5 font-semibold text-ink",
              cell,
            )}
          >
            <span aria-hidden="true">{CODE[locale]}</span>
            <span className="sr-only">{t(ENDONYM_KEY[locale])}</span>
          </span>
        ) : (
          <Link
            key={locale}
            href={href}
            locale={locale}
            hrefLang={locale}
            lang={locale}
            aria-label={t(ENDONYM_KEY[locale])}
            className={cn(
              "inline-flex items-center justify-center rounded-xs px-1.5 text-ink-3",
              "transition-colors duration-(--duration-base) hover:bg-surface hover:text-ink",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
              cell,
            )}
          >
            <span aria-hidden="true">{CODE[locale]}</span>
          </Link>
        ),
      )}
    </div>
  );
}
