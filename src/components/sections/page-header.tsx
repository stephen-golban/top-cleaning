import type { ReactNode } from "react";
import type { ImageSlot } from "@/content";
import { Container, Heading, Photo, type PhotoRatio } from "@/components/ui";

export type PageHeaderProps = {
  slot: ImageSlot;
  alt: string;
  title: string;
  /** The sentence under the h1. */
  lead?: string;
  /**
   * Where you are. Small, accent, above the h1 — never a second heading. Takes
   * a node so a detail page can make it the link back to its index.
   */
  eyebrow?: ReactNode;
  /** The photograph's shape. Portrait suits a person, landscape suits a room. */
  ratio?: PhotoRatio;
  /** An action row, under the lead. */
  children?: ReactNode;
};

/**
 * The opening of every page that is not the home page.
 *
 * Direction B's full-bleed hero belongs to the home page and stays there. Five
 * pages that all open with a 2:1 photograph and a floating white card would
 * turn the site's one strong gesture into wallpaper — and would put half a
 * megapixel above the fold on pages whose job is to be read. So interior pages
 * open contained: words on white on the left, one photograph beside them, and
 * a hairline separating the whole thing from the navigation.
 */
export function PageHeader({
  slot,
  alt,
  title,
  lead,
  eyebrow,
  ratio = "4/3",
  children,
}: PageHeaderProps) {
  return (
    <section className="border-t border-hairline pt-(--spacing-section) pb-(--spacing-sechead)">
      <Container>
        <div className="grid gap-8 min-[820px]:grid-cols-[minmax(0,1fr)_minmax(0,0.85fr)] min-[820px]:items-center min-[820px]:gap-(--spacing-band)">
          <div>
            {eyebrow ? (
              <p className="mb-3 text-fine font-semibold tracking-[0.08em] text-accent-strong uppercase">
                {eyebrow}
              </p>
            ) : null}

            <Heading level={1} size="display">
              {title}
            </Heading>

            {lead ? (
              <p className="mt-4 max-w-[46ch] text-lead text-ink-3">{lead}</p>
            ) : null}

            {children ? <div className="mt-7">{children}</div> : null}
          </div>

          <Photo
            slot={slot}
            alt={alt}
            ratio={ratio}
            sizes="(min-width: 1400px) 600px, (min-width: 820px) 44vw, 100vw"
            priority
          />
        </div>
      </Container>
    </section>
  );
}
