import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasLocale, useTranslations } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { imageSlots } from "@/content";
import { ContactCta, CtaRow, PageHeader, ServiceRows } from "@/components/sections";
import { Section } from "@/components/ui";
import { routing } from "@/i18n/routing";
import { alternatesFor } from "../_lib/metadata";

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

  return {
    title: t("title"),
    description: t("description"),
    alternates: alternatesFor("/services", locale),
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
  const t = useTranslations("services");
  const tAlt = useTranslations();

  return (
    <>
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
