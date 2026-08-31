import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasLocale, useLocale, useTranslations } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { imageSlots } from "@/content";
import { ContactCta, CtaRow, PageHeader, ServiceRows } from "@/components/sections";
import { BreadcrumbListJsonLd } from "@/components/seo";
import { Section } from "@/components/ui";
import { routing, type Locale } from "@/i18n/routing";
import { localeHomeUrl, routeCanonicalUrl } from "@/lib/seo/urls";
import { alternatesFor, openGraphFor } from "../_lib/metadata";

type PageParams = { locale: string };

export function generateStaticParams(): PageParams[] {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<PageParams>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();

  const t = await getTranslations({ locale, namespace: "meta.services" });
  const tMeta = await getTranslations({ locale, namespace: "meta" });

  return {
    title: t("title"),
    description: t("description"),
    alternates: alternatesFor("/services", locale),
    openGraph: openGraphFor(
      "/services",
      locale,
      tMeta("siteName"),
      tMeta("ogImageAlt"),
    ),
  };
}

export default async function ServicesPage({
  params,
}: {
  params: Promise<PageParams>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();

  setRequestLocale(locale);

  return <ServicesContent />;
}

function ServicesContent() {
  const locale = useLocale() as Locale;
  const t = useTranslations("services");
  const tNav = useTranslations("nav");
  const tAlt = useTranslations();

  return (
    <>
      <BreadcrumbListJsonLd
        items={[
          { name: tNav("home"), url: localeHomeUrl(locale) },
          { name: tNav("services"), url: routeCanonicalUrl("/services", locale) },
        ]}
      />

      <PageHeader
        slot={imageSlots.servicesIndex}
        alt={tAlt(imageSlots.servicesIndex.altKey)}
        title={t("title")}
        lead={t("description")}
      >
        <CtaRow />
      </PageHeader>

      <Section size="md">
        <ServiceRows />
      </Section>

      <ContactCta />
    </>
  );
}
