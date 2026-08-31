import { useLocale } from "next-intl";
import { benefits } from "@/content";
import { Heading } from "@/components/ui";
import type { Locale } from "@/i18n/routing";
import { cn } from "@/lib/cn";

export type BenefitsGridProps = { className?: string };

/**
 * All six reasons to work with Top Cleaning.
 *
 * All *six*. The previous site rendered this section by looping over its
 * services collection, so it silently showed four and the last two were written
 * but dead. Here the source is `benefits`, a fixed six-tuple, and the count is
 * whatever that tuple holds — there is no second collection for it to drift
 * against.
 *
 * Hairline rules, no card borders and no icons: six boxes would read as a
 * feature matrix, and this is a paragraph of reasons broken into six.
 */
export function BenefitsGrid({ className }: BenefitsGridProps) {
  const locale = useLocale() as Locale;

  return (
    <ul
      className={cn(
        "grid gap-x-(--spacing-grid) gap-y-(--spacing-grid-row)",
        "min-[620px]:grid-cols-2 min-[1000px]:grid-cols-3",
        className,
      )}
    >
      {benefits.map((benefit) => (
        <li key={benefit.id} className="border-t border-hairline pt-5">
          <Heading level={3} size="item">
            {benefit.title[locale]}
          </Heading>
          <p className="mt-2.5 text-ui text-ink-2">{benefit.description[locale]}</p>
        </li>
      ))}
    </ul>
  );
}
