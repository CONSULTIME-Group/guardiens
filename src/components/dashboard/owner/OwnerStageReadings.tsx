import { memo, useEffect, useId, useState } from "react";
import { Link } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { getOptimizedImageUrl } from "@/lib/imageOptim";
import type { OwnerPriorityAction } from "@/hooks/useOwnerPriorityAction";
import { OWNER_STAGE_ARTICLES } from "@/lib/ownerArticleStages";

interface StageArticle {
  slug: string;
  title: string;
  excerpt: string | null;
  cover_image_url: string | null;
}

interface OwnerStageReadingsProps {
  variant: OwnerPriorityAction["variant"];
}

/**
 * Lectures du moment (dashboard propriétaire) : 2 à 3 articles de conseil
 * choisis selon l'étape du parcours. Requête isolée, volontairement hors de
 * useOwnerDashboardData pour ne pas retarder le skeleton global.
 *
 * Markup, hauteur fixe anti-CLS et a11y repris de ContextualResources.
 * Ne rend rien du tout si aucune lecture n'est disponible.
 */
const SECTION_CLASSES = "animate-fade-in min-h-[140px]";
const EYEBROW_CLASSES = "text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1 h-4 leading-4 line-clamp-1";
const TITLE_CLASSES = "font-body text-base font-semibold mb-3 h-6 leading-6 line-clamp-1";
const GRID_CLASSES = "grid grid-cols-1 md:grid-cols-3 grid-rows-[auto] gap-2 items-stretch";
const CARD_BASE_CLASSES = "flex gap-3 h-[88px] rounded-xl border border-border bg-card overflow-hidden";

export const OwnerStageReadingsSkeleton = () => (
  <section
    role="status"
    aria-live="polite"
    aria-busy="true"
    className={SECTION_CLASSES}
  >
    <span className="sr-only">Chargement des lectures du moment…</span>
    <Skeleton aria-hidden="true" className="h-4 w-32 mb-1" />
    <Skeleton aria-hidden="true" className="h-6 w-72 mb-3" />
    <ul role="list" className={GRID_CLASSES} aria-hidden="true">
      {Array.from({ length: 3 }).map((_, i) => (
        <li key={i} role="listitem">
          <div className={CARD_BASE_CLASSES}>
            <Skeleton className="h-full w-[88px] shrink-0 rounded-none" />
            <div className="flex-1 p-3">
              <Skeleton className="h-4 w-3/4 mb-2" />
              <Skeleton className="h-3 w-full mt-2" />
            </div>
          </div>
        </li>
      ))}
    </ul>
  </section>
);

const OwnerStageReadings = memo(({ variant }: OwnerStageReadingsProps) => {
  const headingId = useId();
  const [articles, setArticles] = useState<StageArticle[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    const stage = OWNER_STAGE_ARTICLES[variant];
    const nowIso = new Date().toISOString();

    const load = async () => {
      const { data } = await supabase
        .from("articles")
        .select("slug, title, excerpt, cover_image_url")
        .in("slug", stage.slugs)
        .eq("published", true)
        .or("noindex.is.null,noindex.eq.false")
        .lte("published_at", nowIso);

      // Réordonne selon l'ordre du mapping, pas celui renvoyé par Postgres.
      const rows = (data ?? []) as unknown as StageArticle[];
      const bySlug = new Map(rows.map((a) => [a.slug, a]));
      let ordered = stage.slugs
        .map((slug) => bySlug.get(slug))
        .filter((a): a is StageArticle => Boolean(a));

      // Repli éditorial si l'étape ne fournit pas assez de lectures.
      if (ordered.length < 2) {
        const { data: fallback } = await supabase
          .from("articles")
          .select("slug, title, excerpt, cover_image_url")
          .eq("published", true)
          .eq("category", "conseil_proprio")
          .or("noindex.is.null,noindex.eq.false")
          .lte("published_at", nowIso)
          .order("published_at", { ascending: false })
          .limit(3);
        ordered = ((fallback ?? []) as unknown as StageArticle[]).slice(0, 3);
      }

      if (!cancelled) setArticles(ordered.slice(0, 3));
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [variant]);

  if (articles === null) return <OwnerStageReadingsSkeleton />;
  if (articles.length === 0) return null;

  const stage = OWNER_STAGE_ARTICLES[variant];

  return (
    <section aria-labelledby={headingId} className={SECTION_CLASSES}>
      <p className={EYEBROW_CLASSES}>{stage.eyebrow}</p>
      <h2 id={headingId} className={TITLE_CLASSES}>{stage.title}</h2>
      <ul role="list" className={GRID_CLASSES}>
        {articles.map((a, idx) => {
          const descId = `${headingId}-desc-${idx}`;
          return (
            <li key={a.slug} role="listitem">
              <Link
                to={`/actualites/${a.slug}`}
                aria-label={`${a.title}, lire l'article`}
                aria-describedby={a.excerpt ? descId : undefined}
                className={`${CARD_BASE_CLASSES} group hover:bg-primary/5 hover:border-primary/30 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`}
              >
                <div className="w-[88px] h-full shrink-0 bg-muted overflow-hidden" aria-hidden="true">
                  {a.cover_image_url ? (
                    <img
                      src={getOptimizedImageUrl(a.cover_image_url, 200, 75)}
                      alt=""
                      className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                      width={88}
                      height={88}
                      loading="lazy"
                    />
                  ) : null}
                </div>
                <div className="flex-1 min-w-0 p-3">
                  <p className="text-sm font-semibold text-foreground leading-snug line-clamp-1">
                    {a.title}
                    <span className="text-primary ml-1" aria-hidden="true">→</span>
                  </p>
                  {a.excerpt ? (
                    <p id={descId} className="text-xs text-muted-foreground mt-1 leading-relaxed line-clamp-2">
                      {a.excerpt}
                    </p>
                  ) : null}
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
});

OwnerStageReadings.displayName = "OwnerStageReadings";
export default OwnerStageReadings;
