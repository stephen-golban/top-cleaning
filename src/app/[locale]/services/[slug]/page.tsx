import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasLocale, useLocale, useTranslations } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import {
  getServiceBySlug,
  imageSlots,
  serviceSlugs,
  services,
  type Service,
} from "@/content";
import { ContactCta, CtaRow, PageHeader, ServiceCards } from "@/components/sections";
import { BreadcrumbListJsonLd, ServiceJsonLd } from "@/components/seo";
import { AppLink, Heading, Section, SectionHeader } from "@/components/ui";
import { routing, type Locale } from "@/i18n/routing";
import { localeHomeUrl, routeCanonicalUrl } from "@/lib/seo/urls";
import { serviceAlternates, serviceOpenGraph } from "../../_lib/metadata";

type PageParams = { locale: string; slug: string };

/**
 * Every service in every language — twelve pages, all static.
 *
 * The slug is localized per service (`curatenie-generala` · `generalnaya-uborka`
 * · `deep-cleaning`), so this cannot be a cross product of one slug list with
 * three locales: each locale gets its own.
 */
export function generateStaticParams(): PageParams[] {
  return routing.locales.flatMap((locale) =>
    serviceSlugs(locale).map((slug) => ({ locale, slug })),
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<PageParams>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();

  const service = getServiceBySlug(locale, slug);
  if (!service) notFound();

  const t = await getTranslations({ locale, namespace: "meta.service" });
  const tMeta = await getTranslations({ locale, namespace: "meta" });

  return {
    title: t(`${service.id}.title`),
    description: t(`${service.id}.description`),
    alternates: serviceAlternates(service, locale),
    openGraph: serviceOpenGraph(
      service,
      locale,
      tMeta("siteName"),
      tMeta("ogImageAlt"),
    ),
  };
}

export default async function ServiceDetailPage({
  params,
}: {
  params: Promise<PageParams>;
}) {
  const { locale, slug } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();

  setRequestLocale(locale);

  const service = getServiceBySlug(locale, slug);
  if (!service) notFound();

  return <ServiceDetail service={service} />;
}

/**
 * One service, in full.
 *
 * The inclusion list is the page. It is the only thing on the site that answers
 * "what do I actually get for my money", it runs to thirteen operations for two
 * of the four services, and the old site buried it — so it is set as a real
 * list, in two columns where there is room, and not truncated behind a toggle.
 */
function ServiceDetail({ service }: { service: Service }) {
  const locale = useLocale() as Locale;
  const t = useTranslations("services");
  const tNav = useTranslations("nav");
  const tCommon = useTranslations("common");
  const tAlt = useTranslations();
  const slot = imageSlots[service.image];
  const others = services.filter((item) => item.id !== service.id);

  const servicesUrl = routeCanonicalUrl("/services", locale);
  const canonicalUrl = routeCanonicalUrl(
    { pathname: "/services/[slug]", params: { slug: service.slug[locale] } },
    locale,
  );

  return (
    <>
      {/* `provider` here is a bare `@id` reference; the `LocalBusiness` node it
          points at is rendered by the locale layout on this same page. */}
      <ServiceJsonLd
        locale={locale}
        name={service.name[locale]}
        description={service.summary[locale]}
        url={canonicalUrl}
        city={tCommon("city")}
        imageUrl={slot.asset.src}
      />
      <BreadcrumbListJsonLd
        items={[
          { name: tNav("home"), url: localeHomeUrl(locale) },
          { name: tNav("services"), url: servicesUrl },
          { name: service.name[locale], url: canonicalUrl },
        ]}
      />

      <PageHeader
        slot={slot}
        alt={tAlt(slot.altKey)}
        title={service.name[locale]}
        lead={service.summary[locale]}
        eyebrow={
          <AppLink
            href="/services"
            variant="bare"
            className="inline-block py-1 hover:underline"
          >
            {t("allServices")}
          </AppLink>
        }
      >
        <CtaRow />
      </PageHeader>

      <Section size="md" aria-labelledby="service-includes">
        <p className="max-w-[68ch] text-body text-ink-2">{service.intro[locale]}</p>

        <Heading
          level={2}
          size="subtitle"
          id="service-includes"
          className="mt-(--spacing-sechead)"
        >
          {t("includes")}
        </Heading>

        <ul className="mt-6 min-[820px]:columns-2 min-[820px]:gap-x-(--spacing-grid)">
          {service.included.map((line, index) => (
            <li
              key={index}
              className="relative mb-2.5 max-w-[52ch] break-inside-avoid pl-5 text-body text-ink-2 before:absolute before:top-[0.72em] before:left-0 before:h-px before:w-[9px] before:bg-accent"
            >
              {line[locale]}
            </li>
          ))}
        </ul>
      </Section>

      <Section
        size="md"
        aria-labelledby="service-others"
        className="border-t border-hairline"
      >
        <SectionHeader id="service-others" title={t("otherServices")} />
        <ServiceCards items={others} columns={3} />
      </Section>

      <ContactCta />
    </>
  );
}
