import { memo, useId, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { getOptimizedImageUrl } from "@/lib/imageOptim";

interface ResItem {
  title: string;
  description: string;
  href: string;
  slug: string;
}

interface ContextualResourcesProps {
  annoncesCount: number;
  gardesCount: number;
  loading?: boolean;
}

/**
 * Dimensions verrouillées pour éviter tout layout shift.
 * Carte hauteur fixe ~h-[88px], miniature 72×72 à gauche.
 */
const SECTION_CLASSES = "animate-fade-in min-h-[140px]";
const TITLE_CLASSES = "font-body text-base font-semibold mb-3 h-6 leading-6 line-clamp-1";
const GRID_CLASSES = "grid grid-cols-1 md:grid-cols-3 grid-rows-[auto] gap-2 items-stretch";
const CARD_BASE_CLASSES = "flex gap-3 h-[88px] rounded-xl border border-border bg-card overflow-hidden";

export const ContextualResourcesSkeleton = () => (
  <section
    role="status"
    aria-live="polite"
    aria-busy="true"
    className={SECTION_CLASSES}
  >
    <span className="sr-only">Chargement des ressources contextuelles…</span>
    <Skeleton aria-hidden="true" className="h-6 w-64 mb-3" />
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

const ContextualResources = memo(({ annoncesCount, gardesCount, loading }: ContextualResourcesProps) => {
  const headingId = useId();
  const [coverBySlug, setCoverBySlug] = useState<Record<string, string | null>>({});

  let resTitle = "";
  let resItems: ResItem[] = [];

  if (annoncesCount === 0) {
    resTitle = "Avant de publier votre première annonce";
    resItems = [
      { title: "Rédiger une bonne annonce", description: "Ce qui attire les bonnes personnes en 48h.", href: "/actualites/rediger-bonne-annonce-house-sitting", slug: "rediger-bonne-annonce-house-sitting" },
      { title: "Choisir son gardien : les bons critères", description: "Ce qui compte, ce qui ne sert à rien.", href: "/actualites/choisir-gardien-bons-criteres", slug: "choisir-gardien-bons-criteres" },
      { title: "Préparer sa maison avant une garde", description: "Guide de la maison, sécurité, animaux.", href: "/actualites/preparer-maison-avant-garde", slug: "preparer-maison-avant-garde" },
    ];
  } else if (gardesCount === 0) {
    resTitle = "Préparer votre première garde";
    resItems = [
      { title: "Accueillir son gardien", description: "Remise des clés, visite, jour du départ.", href: "/actualites/accueillir-gardien-bonnes-pratiques", slug: "accueillir-gardien-bonnes-pratiques" },
      { title: "Préparer sa maison avant une garde", description: "Ce qu'on oublie dans le guide de la maison.", href: "/actualites/preparer-maison-avant-garde", slug: "preparer-maison-avant-garde" },
      { title: "Que faire si quelque chose se passe mal", description: "Animal malade, panne, gardien défaillant.", href: "/actualites/que-faire-probleme-pendant-garde", slug: "que-faire-probleme-pendant-garde" },
    ];
  } else {
    resTitle = "Optimiser vos prochaines gardes";
    resItems = [
      { title: "Choisir son gardien : les bons critères", description: "Affinez votre sélection à chaque garde.", href: "/actualites/choisir-gardien-bons-criteres", slug: "choisir-gardien-bons-criteres" },
      { title: "Que faire si quelque chose se passe mal", description: "Animal malade, panne, gardien défaillant.", href: "/actualites/que-faire-probleme-pendant-garde", slug: "que-faire-probleme-pendant-garde" },
      { title: "Accueillir son gardien", description: "Ce qui fait qu'un gardien prend soin de tout.", href: "/actualites/accueillir-gardien-bonnes-pratiques", slug: "accueillir-gardien-bonnes-pratiques" },
    ];
  }

  // Fetch covers for current slugs (cache by slug to avoid re-fetch on tab switch)
  useEffect(() => {
    const slugs = resItems.map((r) => r.slug);
    const missing = slugs.filter((s) => !(s in coverBySlug));
    if (missing.length === 0) return;
    let cancelled = false;
    supabase
      .from("articles")
      .select("slug, cover_image_url")
      .in("slug", missing)
      .eq("published", true)
      .then(({ data }) => {
        if (cancelled) return;
        const next: Record<string, string | null> = {};
        missing.forEach((s) => { next[s] = null; });
        (data || []).forEach((row: any) => { next[row.slug] = row.cover_image_url || null; });
        setCoverBySlug((prev) => ({ ...prev, ...next }));
      });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [annoncesCount, gardesCount]);

  if (loading) return <ContextualResourcesSkeleton />;

  return (
    <section aria-labelledby={headingId} className={SECTION_CLASSES}>
      <h2 id={headingId} className={TITLE_CLASSES}>{resTitle}</h2>
      <ul role="list" className={GRID_CLASSES}>
        {resItems.map((r, idx) => {
          const descId = `${headingId}-desc-${idx}`;
          const cover = coverBySlug[r.slug];
          return (
            <li key={r.href} role="listitem">
              <Link
                to={r.href}
                aria-label={`${r.title}, lire l'article`}
                aria-describedby={descId}
                className={`${CARD_BASE_CLASSES} group hover:bg-primary/5 hover:border-primary/30 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`}
              >
                <div className="w-[88px] h-full shrink-0 bg-muted overflow-hidden" aria-hidden="true">
                  {cover ? (
                    <img
                      src={getOptimizedImageUrl(cover, 200, 75)}
                      alt=""
                      className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                      width={88}
                      height={88}
                      loading="lazy"
                    />
                  ) : cover === undefined ? (
                    <Skeleton className="h-full w-full rounded-none" />
                  ) : null}
                </div>
                <div className="flex-1 min-w-0 p-3">
                  <p className="text-sm font-semibold text-foreground leading-snug line-clamp-1">
                    {r.title}
                    <span className="text-primary ml-1" aria-hidden="true">→</span>
                  </p>
                  <p id={descId} className="text-xs text-muted-foreground mt-1 leading-relaxed line-clamp-2">
                    {r.description}
                  </p>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
});

ContextualResources.displayName = "ContextualResources";
export default ContextualResources;
