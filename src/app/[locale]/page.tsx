import { notFound } from "next/navigation";
import { hasLocale, useTranslations } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";

type PageParams = { locale: string };

export default async function HomePage({ params }: { params: Promise<PageParams> }) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();

  setRequestLocale(locale);

  return <HomeContent />;
}

function HomeContent() {
  const t = useTranslations("home");

  return (
    <div className="mx-auto max-w-(--container-content) px-(--spacing-gutter) py-(--spacing-section)">
      <h1 className="text-4xl font-semibold">{t("heading")}</h1>
    </div>
  );
}
