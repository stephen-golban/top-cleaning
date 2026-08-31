import { useLocale, useTranslations } from "next-intl";
import { imageSlots, services } from "@/content";
import { AppLink, ArrowRightIcon, Heading, Photo } from "@/components/ui";
import type { Locale } from "@/i18n/routing";
import { cn } from "@/lib/cn";

/** How much of the inclusion list to show before the detail page takes over. */
const PREVIEW_COUNT = 4;

/**
 * The services index, one service to a row.
 *
 * Rows rather than the home page's 2×2 grid, because this page is where
 * somebody is actually choosing: the extra width buys room for the first four
 * operations each service covers, which is the difference between four names
 * and four answers. The rest of the list — thirteen, nine, thirteen and three
 * operations — is on the detail pages.
 *
 * There is exactly one link per row, on the service's name, stretched over the
 * whole row by a pseudo-element. The alternative — wrapping photograph, name,
 * summary and four bullets in one anchor — makes the whole paragraph the link's
 * accessible name, which is miserable to listen to.
 */
export function ServiceRows() {
  const locale = useLocale() as Locale;
  const t = useTranslations("services");
  const tAlt = useTranslations();

  return (
    <ul className="grid gap-(--spacing-section)">
      {services.map((service, index) => {
        const slot = imageSlots[service.image];
        const flipped = index % 2 === 1;

        return (
          <li
            key={service.id}
            className={cn(
              "group relative grid gap-6",
              "border-t border-hairline pt-(--spacing-sechead) first:border-t-0 first:pt-0",
              "min-[820px]:grid-cols-2 min-[820px]:items-start min-[820px]:gap-12",
            )}
          >
            <Photo
              slot={slot}
              alt={tAlt(slot.altKey)}
              ratio="4/3"
              sizes="(min-width: 1400px) 640px, (min-width: 820px) 46vw, 100vw"
              zoom
              priority={false}
              className={cn(flipped && "min-[820px]:order-2")}
            />

            <div className={cn(flipped && "min-[820px]:order-1")}>
              <Heading level={2} size="subtitle">
                <AppLink
                  href={{
                    pathname: "/services/[slug]",
                    params: { slug: service.slug[locale] },
                  }}
                  variant="bare"
                  className="transition-colors duration-(--duration-base) after:absolute after:inset-0 hover:text-accent-strong"
                >
                  {service.name[locale]}
                </AppLink>
              </Heading>

              <p className="mt-3 max-w-[52ch] text-body text-ink-2">
                {service.summary[locale]}
              </p>

              <ul className="mt-5 grid gap-2">
                {service.included.slice(0, PREVIEW_COUNT).map((line, lineIndex) => (
                  <li
                    key={lineIndex}
                    className="relative max-w-[52ch] pl-5 text-ui text-ink-3 before:absolute before:top-[0.66em] before:left-0 before:h-px before:w-[7px] before:bg-accent"
                  >
                    {line[locale]}
                  </li>
                ))}
              </ul>

              <span className="mt-6 inline-flex items-center gap-1.5 text-[0.9375rem] font-medium text-accent-strong group-hover:underline group-hover:underline-offset-[3px]">
                {t("seeDetails")}
                <ArrowRightIcon
                  size={14}
                  className="transition-transform duration-(--duration-base) ease-(--ease-standard) motion-safe:group-hover:translate-x-0.5"
                />
              </span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
