import { useLocale } from "next-intl";
import { services } from "@/content";
import { QuoteForm } from "@/components/forms";
import type { Locale } from "@/i18n/routing";

export type QuoteFormBlockProps = { className?: string };

/**
 * The server half of the quote form: it resolves the four service names into
 * the current locale and hands them down.
 *
 * Splitting it this way keeps the client component a leaf that knows nothing
 * about `@/content`, so the entire content layer — four services, six benefits,
 * every inclusion list in three languages — stays out of the browser bundle.
 */
export function QuoteFormBlock({ className }: QuoteFormBlockProps) {
  const locale = useLocale() as Locale;

  return (
    <QuoteForm
      className={className}
      services={services.map((service) => ({
        id: service.id,
        name: service.name[locale],
      }))}
    />
  );
}
