import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { localeDir, localeHtmlLang, routing } from "@/i18n/routing";
import { sans } from "@/lib/fonts";
import { siteUrlObject } from "@/lib/site";
import "../globals.css";

type LayoutParams = { locale: string };

export function generateStaticParams(): LayoutParams[] {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<LayoutParams>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();

  const t = await getTranslations({ locale, namespace: "meta" });

  return {
    metadataBase: siteUrlObject,
    title: {
      default: t("title"),
      template: `%s — ${t("siteName")}`,
    },
    description: t("description"),
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<LayoutParams>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();

  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: "nav" });
  const tFooter = await getTranslations({ locale, namespace: "footer" });

  return (
    <html
      lang={localeHtmlLang[locale]}
      dir={localeDir[locale]}
      className={sans.variable}
      suppressHydrationWarning
    >
      <body className="flex min-h-dvh flex-col">
        <NextIntlClientProvider>
          <a
            href="#main"
            className="sr-only rounded-md bg-accent px-4 py-2 text-accent-contrast focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50"
          >
            {t("skipToContent")}
          </a>

          <header className="border-b border-border">
            <nav
              aria-label={t("home")}
              className="mx-auto flex max-w-(--container-wide) items-center gap-6 px-(--spacing-gutter) py-4"
            >
              <span className="font-semibold">Top Cleaning</span>
            </nav>
          </header>

          <main id="main" className="flex-1">
            {children}
          </main>

          <footer className="border-t border-border text-foreground-muted">
            <div className="mx-auto max-w-(--container-wide) px-(--spacing-gutter) py-8 text-sm">
              <p>
                &copy; {new Date().getFullYear()} Top Cleaning. {tFooter("rights")}
              </p>
            </div>
          </footer>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
