import { useTranslations } from "next-intl";
import { cn } from "@/lib/cn";
import { Sparkle } from "./sparkle";

export type WordmarkSize = "sm" | "md" | "lg";

const SPARKLE: Record<WordmarkSize, number> = { sm: 17, md: 20, lg: 24 };

const TYPE: Record<WordmarkSize, string> = {
  sm: "text-[1rem]",
  md: "text-[1.125rem] min-[520px]:text-[1.25rem]",
  lg: "text-[1.25rem] min-[520px]:text-[1.5rem]",
};

const GAP: Record<WordmarkSize, string> = { sm: "gap-2", md: "gap-2.5", lg: "gap-3" };

export type WordmarkProps = {
  size?: WordmarkSize;
  className?: string;
};

/**
 * The brand lockup: the sparkle in the identity blue, the name in the serif at
 * 500. Rendered as a plain inline element — wrap it in a link where it needs to
 * navigate, so the lockup itself carries no interaction semantics.
 *
 * The name comes from the `common.brand` message rather than a literal, both to
 * honour the no-hardcoded-strings rule and so a locale could transliterate it
 * later without a code change.
 */
export function Wordmark({ size = "md", className }: WordmarkProps) {
  const t = useTranslations("common");

  return (
    <span className={cn("inline-flex items-center", GAP[size], className)}>
      <Sparkle size={SPARKLE[size]} className="text-accent" />
      <span
        className={cn(
          "font-serif font-medium tracking-[-0.01em] whitespace-nowrap text-ink [font-optical-sizing:auto]",
          TYPE[size],
        )}
      >
        {t("brand")}
      </span>
    </span>
  );
}
