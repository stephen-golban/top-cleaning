import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export default function LocaleNotFound() {
  const t = useTranslations("notFound");

  return (
    <div className="mx-auto max-w-(--container-prose) px-(--spacing-gutter) py-(--spacing-section)">
      <h1 className="text-3xl font-semibold">{t("title")}</h1>
      <p className="mt-3 text-foreground-muted">{t("description")}</p>
      <Link href="/" className="mt-6 inline-block text-accent underline">
        {t("backHome")}
      </Link>
    </div>
  );
}
