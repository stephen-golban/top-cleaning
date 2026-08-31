import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  NextIntlClientProvider,
  hasLocale,
  useLocale,
  useTranslations,
} from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { services } from "@/content";
import { Footer, type FooterServiceLink } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
import { LocalBusinessJsonLd, WebSiteJsonLd } from "@/components/seo";
import { localeDir, localeHtmlLang, routing, type Locale } from "@/i18n/routing";
import { fontVariables } from "@/lib/fonts";
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

  return (
    <html
      lang={localeHtmlLang[locale]}
      dir={localeDir[locale]}
      className={fontVariables}
      suppressHydrationWarning
    >
      <body className="flex min-h-dvh flex-col">
        <NextIntlClientProvider>
          <Shell>{children}</Shell>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}

/**
 * Split out so the shell can use `useTranslations` (synchronous, still a Server
 * Component) instead of threading a translator through every child.
 */
function Shell({ children }: { children: React.ReactNode }) {
  const t = useTranslations("nav");
  const tMeta = useTranslations("meta");
  const tCommon = useTranslations("common");
  const locale = useLocale() as Locale;

  // The footer's service column, resolved here rather than inside `Footer`:
  // the shell is not allowed to know what the services are called or where they
  // live, so the names and the localized slugs arrive from `@/content` as data.
  const footerServices: FooterServiceLink[] = services.map((service) => ({
    href: { pathname: "/services/[slug]", params: { slug: service.slug[locale] } },
    label: service.name[locale],
  }));

  return (
    <>
      {/* Site-wide structured data, rendered exactly once per page. Both nodes
          carry stable `@id`s, so a `Service` node on a detail page can name its
          provider by reference instead of restating the company. Emitting them
          from the layout is what guarantees that reference always resolves. */}
      <LocalBusinessJsonLd
        locale={locale}
        name={tMeta("siteName")}
        city={tCommon("city")}
        description={tMeta("description")}
      />
      <WebSiteJsonLd
        locale={locale}
        name={tMeta("siteName")}
        description={tMeta("description")}
      />

      <a
        href="#main"
        className="sr-only rounded-sm bg-accent-strong px-4 py-2 text-[0.9375rem] font-medium text-on-accent focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-[60]"
      >
        {t("skipToContent")}
      </a>

      <Header />

      <main id="main" className="flex-1">
        {children}
      </main>

      <Footer services={footerServices} />
    </>
  );
}
