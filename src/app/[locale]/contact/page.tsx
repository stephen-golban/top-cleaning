import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasLocale, useTranslations } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { imageSlots } from "@/content";
import { ContactChannels, PageHeader, QuoteFormBlock } from "@/components/sections";
import { Heading, Section } from "@/components/ui";
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

  const t = await getTranslations({ locale, namespace: "meta.contact" });

  return {
    title: t("title"),
    description: t("description"),
    alternates: alternatesFor("/contact", locale),
  };
}

export default async function ContactPage({ params }: { params: Promise<PageParams> }) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();

  setRequestLocale(locale);

  return <ContactContent />;
}

/**
 * Every way to reach Top Cleaning, and the form.
 *
 * The channels come first in the markup, not the form: someone who wants a
 * cleaner next Tuesday wants to press one number, and on a phone that column
 * is what they meet first. The form is for everyone else — and it is the thing
 * the old site never had.
 */
function ContactContent() {
  const t = useTranslations("contact");
  const tAlt = useTranslations();

  return (
    <>
      <PageHeader
        slot={imageSlots.contact}
        alt={tAlt(imageSlots.contact.altKey)}
        title={t("title")}
        lead={t("lead")}
      />

      <Section size="lg" tone="surface">
        <div className="grid gap-10 min-[900px]:grid-cols-[minmax(0,0.8fr)_minmax(0,1fr)] min-[900px]:gap-16">
          {/* No heading over this column on purpose: the h1 is already
              "Contact", and every row labels itself. A second "Contacte"
              underneath the first would be a duplicate heading, not
              structure. */}
          <ContactChannels className="self-start" />

          <div className="rounded-sm bg-ground p-6 shadow-sm min-[520px]:p-8">
            <Heading level={2} size="subtitle">
              {t("formTitle")}
            </Heading>
            <p className="mt-2 text-body text-ink-2">{t("formLead")}</p>
            <QuoteFormBlock className="mt-6" />
          </div>
        </div>
      </Section>
    </>
  );
}
