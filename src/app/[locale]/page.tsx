import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasLocale, useTranslations } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { imageSlots } from "@/content";
import {
  CtaRow,
  PhotoHero,
  ProcessBand,
  QuoteSection,
  ServiceCards,
} from "@/components/sections";
import { AppLink, ArrowRightIcon, Section, SectionHeader } from "@/components/ui";
import { routing } from "@/i18n/routing";
import { alternatesFor } from "./_lib/metadata";

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

  const t = await getTranslations({ locale, namespace: "meta" });

  return {
    // Composed rather than left to `title.template`: Next applies a layout's
    // template to child *segments*, and the home page is the same segment as
    // the layout that declares it — so a bare string here would be the one
    // title on the site that never says who the company is.
    title: `${t("home.title")} — ${t("siteName")}`,
    description: t("home.description"),
    alternates: alternatesFor("/", locale),
  };
}

export default async function HomePage({ params }: { params: Promise<PageParams> }) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();

  setRequestLocale(locale);

  return <HomeContent />;
}

/**
 * Direction B, in the order the deck ships it: the photograph, then what we do,
 * then how it goes, then a way to start it.
 *
 * Nothing here claims a client count, a founding year, a certification or a
 * testimonial, because none of those exist in anything the client has published
 * (`.agents/DECISIONS.md`). Where a section would normally reach for proof, it
 * reaches for specifics instead — the actual services, the actual four steps.
 */
function HomeContent() {
  const t = useTranslations("home");
  const tAlt = useTranslations();

  return (
    <>
      <PhotoHero
        slot={imageSlots.hero}
        alt={tAlt(imageSlots.hero.altKey)}
        title={t("hero.title")}
        description={t("hero.description")}
      >
        <CtaRow />
      </PhotoHero>

      <Section size="lg" aria-labelledby="home-services">
        <SectionHeader
          id="home-services"
          title={t("services.title")}
          lead={t("services.description")}
        />
        <ServiceCards />
        <AppLink
          href="/services"
          variant="underline"
          className="mt-(--spacing-sechead) inline-flex items-center gap-1.5"
        >
          {t("services.cta")}
          <ArrowRightIcon size={14} />
        </AppLink>
      </Section>

      <ProcessBand />

      <QuoteSection
        id="quote"
        title={t("contact.title")}
        description={t("contact.description")}
      />
    </>
  );
}
