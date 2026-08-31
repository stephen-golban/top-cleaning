import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasLocale, useTranslations } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { imageSlots } from "@/content";
import { BenefitsGrid, ContactCta, CtaRow, PageHeader } from "@/components/sections";
import { Heading, Section, SectionHeader } from "@/components/ui";
import { routing } from "@/i18n/routing";
import { alternatesFor } from "../_lib/metadata";

type PageParams = { locale: string };

/** The three claims the client makes about how the company works. */
const POINTS = ["1", "2", "3"] as const;

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

  const t = await getTranslations({ locale, namespace: "meta.about" });

  return {
    title: t("title"),
    description: t("description"),
    alternates: alternatesFor("/about", locale),
  };
}

export default async function AboutPage({ params }: { params: Promise<PageParams> }) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();

  setRequestLocale(locale);

  return <AboutContent />;
}

/**
 * Who Top Cleaning is, with **all six** benefits.
 *
 * The old site rendered this section by iterating its *services* collection, so
 * it showed four of the six and nobody noticed for as long as the site was up
 * (`.agents/source-inventory.md` §11). `BenefitsGrid` reads the six-tuple in
 * `src/content/benefits.ts`, which is a different collection from the services
 * and cannot silently agree with it about how long it is.
 *
 * There is no team photograph, no founding year, no client count and no
 * certification here, because the client has published none of those. The page
 * is built to be complete without them rather than to leave holes where they
 * would go.
 */
function AboutContent() {
  const t = useTranslations("about");
  const tAlt = useTranslations();

  return (
    <>
      <PageHeader
        slot={imageSlots.about}
        alt={tAlt(imageSlots.about.altKey)}
        title={t("title")}
        lead={t("body")}
        ratio="1/1"
      >
        <CtaRow />
      </PageHeader>

      <Section size="lg" tone="surface" aria-labelledby="about-why">
        <p className="mb-3 text-fine font-semibold tracking-[0.08em] text-accent-strong uppercase">
          {t("eyebrow")}
        </p>
        <Heading level={2} size="title" id="about-why" className="max-w-[22ch]">
          {t("question")}
        </Heading>

        <ul className="mt-(--spacing-sechead) grid max-w-(--container-content) gap-0">
          {POINTS.map((point) => (
            <li
              key={point}
              className="border-t border-hairline-strong py-4 text-body text-ink-2 last:border-b last:border-hairline-strong"
            >
              {t(`points.${point}`)}
            </li>
          ))}
        </ul>
      </Section>

      <Section size="lg" aria-labelledby="about-benefits">
        <SectionHeader id="about-benefits" title={t("benefitsTitle")} />
        <BenefitsGrid />
      </Section>

      <ContactCta />
    </>
  );
}
