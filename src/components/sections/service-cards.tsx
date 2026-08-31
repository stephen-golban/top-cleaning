import { useLocale, useTranslations } from "next-intl";
import { imageSlots, services, type Service } from "@/content";
import { AppLink, ArrowRightIcon, Heading, Photo } from "@/components/ui";
import type { Locale } from "@/i18n/routing";
import { cn } from "@/lib/cn";

export type ServiceCardsProps = {
  /** Defaults to all four. Pass a subset for a cross-link block. */
  items?: readonly Service[];
  /** 2-up (the home grid) or 3-up (the "other services" block). */
  columns?: 2 | 3;
  className?: string;
};

const GRID: Record<2 | 3, string> = {
  2: "min-[620px]:grid-cols-2",
  3: "min-[620px]:grid-cols-2 min-[940px]:grid-cols-3",
};

const SIZES: Record<2 | 3, string> = {
  2: "(min-width: 1400px) 640px, (min-width: 620px) 48vw, 100vw",
  3: "(min-width: 940px) 32vw, (min-width: 620px) 48vw, 100vw",
};

/**
 * Direction B's `.grid` of `.item`s: photograph, serif title, summary, and a
 * small accent affordance.
 *
 * There is no card border and no card background. The photograph is the card —
 * borrowed from Direction A's discipline, and the reason four of these read as
 * a set rather than as four boxes.
 *
 * Names and summaries come from `@/content`, never from a message file: they
 * are per-entity rows, and flattening them into message keys is precisely what
 * let the old site's service list drift between languages.
 */
export function ServiceCards({
  items = services,
  columns = 2,
  className,
}: ServiceCardsProps) {
  const locale = useLocale() as Locale;
  const t = useTranslations("services");
  const tAlt = useTranslations();

  return (
    <ul
      className={cn(
        "grid gap-x-(--spacing-grid) gap-y-(--spacing-grid-row)",
        GRID[columns],
        className,
      )}
    >
      {items.map((service) => {
        const slot = imageSlots[service.image];

        return (
          <li key={service.id}>
            <AppLink
              href={{
                pathname: "/services/[slug]",
                params: { slug: service.slug[locale] },
              }}
              variant="bare"
              className="group block"
            >
              <Photo
                slot={slot}
                alt={tAlt(slot.altKey)}
                ratio="4/3"
                sizes={SIZES[columns]}
                zoom
                priority={false}
              />

              <Heading level={3} size="item" className="mt-4">
                {service.name[locale]}
              </Heading>

              <p className="mt-2 max-w-[44ch] text-ui text-ink-3">
                {service.summary[locale]}
              </p>

              <span className="mt-3 inline-flex items-center gap-1.5 text-[0.875rem] font-medium text-accent-strong group-hover:underline group-hover:underline-offset-[3px]">
                {t("seeDetails")}
                <ArrowRightIcon
                  size={14}
                  className="transition-transform duration-(--duration-base) ease-(--ease-standard) motion-safe:group-hover:translate-x-0.5"
                />
              </span>
            </AppLink>
          </li>
        );
      })}
    </ul>
  );
}
