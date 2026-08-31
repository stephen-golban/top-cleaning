import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

/**
 * Shown for every failed lookup: a token that never existed, one that was
 * revoked, one that was mistyped, and a link whose Stream configuration is
 * broken. They must be indistinguishable — otherwise the page becomes an oracle
 * that confirms which secret links are real.
 *
 * Rendered with HTTP 404 by `notFound()`.
 */
export default function PrivateVideoNotFound() {
  const t = useTranslations("video.invalid");

  return (
    <div className="mx-auto max-w-(--container-prose) px-(--spacing-gutter) py-(--spacing-section-lg)">
      <h1 className="font-serif text-title font-semibold text-ink">{t("title")}</h1>
      <p className="mt-4 text-lead text-ink-2">{t("description")}</p>
      <Link
        href="/"
        className="mt-8 inline-flex items-center gap-2 text-ui font-medium text-accent-strong underline underline-offset-4 hover:text-accent-stronger"
      >
        {t("backHome")}
      </Link>
    </div>
  );
}
