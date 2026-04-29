import { memo, useId } from "react";
import { Link } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";

interface ResItem {
  title: string;
  description: string;
  href: string;
}

interface ContextualResourcesProps {
  annoncesCount: number;
  gardesCount: number;
  loading?: boolean;
}

/**
 * Dimensions verrouillées pour éviter tout layout shift entre :
 * - état skeleton / état chargé
 * - les 3 variantes de contenu (annoncesCount/gardesCount)
 * - les changements de longueur de titre/description
 *
 * - Section : min-height fixe (titre + grille).
 * - Titre : hauteur fixe via line-clamp-1.
 * - Grille : grid-rows explicite, gap stable, items-stretch.
 * - Carte : hauteur fixe (h-[88px]) + line-clamp pour titre/desc.
 *
 * Accessibilité :
 * - Section reliée au titre via aria-labelledby.
 * - Skeleton : role="status" + aria-live="polite" + texte sr-only,
 *   les Skeletons décoratifs sont aria-hidden.
 * - <ul role="list"> / <li role="listitem"> pour préserver la sémantique
 *   même si list-style:none est appliqué (bug Safari/VoiceOver connu).
 * - Liens : aria-label explicite + description liée par aria-describedby,
 *   flèche décorative aria-hidden.
 */
const SECTION_CLASSES = "animate-fade-in min-h-[140px]";
const TITLE_CLASSES = "font-body text-base font-semibold mb-3 h-6 leading-6 line-clamp-1";
const GRID_CLASSES = "grid grid-cols-1 md:grid-cols-3 grid-rows-[auto] gap-2 items-stretch";
const CARD_BASE_CLASSES = "block h-[88px] rounded-xl border border-border bg-card p-4 overflow-hidden";

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
            <Skeleton className="h-4 w-3/4 mb-2" />
            <Skeleton className="h-3 w-full mt-2" />
          </div>
        </li>
      ))}
    </ul>
  </section>
);

const ContextualResources = memo(({ annoncesCount, gardesCount, loading }: ContextualResourcesProps) => {
  const headingId = useId();

  if (loading) return <ContextualResourcesSkeleton />;

  let resTitle = "";
  let resItems: ResItem[] = [];

  if (annoncesCount === 0) {
    resTitle = "Avant de publier votre première annonce";
    resItems = [
      { title: "Rédiger une bonne annonce", description: "Ce qui attire les bonnes personnes en 48h.", href: "/actualites/rediger-bonne-annonce-house-sitting" },
      { title: "Choisir son gardien : les bons critères", description: "Ce qui compte, ce qui ne sert à rien.", href: "/actualites/choisir-gardien-bons-criteres" },
      { title: "Préparer sa maison avant une garde", description: "Guide de la maison, sécurité, animaux.", href: "/actualites/preparer-maison-avant-garde" },
    ];
  } else if (gardesCount === 0) {
    resTitle = "Préparer votre première garde";
    resItems = [
      { title: "Accueillir son gardien", description: "Remise des clés, visite, jour du départ.", href: "/actualites/accueillir-gardien-bonnes-pratiques" },
      { title: "Préparer sa maison avant une garde", description: "Ce qu'on oublie dans le guide de la maison.", href: "/actualites/preparer-maison-avant-garde" },
      { title: "Que faire si quelque chose se passe mal", description: "Animal malade, panne, gardien défaillant.", href: "/actualites/que-faire-probleme-pendant-garde" },
    ];
  } else {
    resTitle = "Optimiser vos prochaines gardes";
    resItems = [
      { title: "Choisir son gardien : les bons critères", description: "Affinez votre sélection à chaque garde.", href: "/actualites/choisir-gardien-bons-criteres" },
      { title: "Que faire si quelque chose se passe mal", description: "Animal malade, panne, gardien défaillant.", href: "/actualites/que-faire-probleme-pendant-garde" },
      { title: "Accueillir son gardien", description: "Ce qui fait qu'un gardien prend soin de tout.", href: "/actualites/accueillir-gardien-bonnes-pratiques" },
    ];
  }

  // resItems contient toujours 3 entrées (3 branches couvrent tous les cas).
  // Pas de return null : la section est structurelle dans la mise en page du dashboard.

  return (
    <section aria-labelledby={headingId} className={SECTION_CLASSES}>
      <h2 id={headingId} className={TITLE_CLASSES}>{resTitle}</h2>
      <ul role="list" className={GRID_CLASSES}>
        {resItems.map((r, idx) => {
          const descId = `${headingId}-desc-${idx}`;
          return (
            <li key={r.href} role="listitem">
              <Link
                to={r.href}
                aria-label={`${r.title} — lire l'article`}
                aria-describedby={descId}
                className={`${CARD_BASE_CLASSES} hover:bg-primary/5 hover:border-primary/30 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`}
              >
                <p className="text-sm font-semibold text-foreground leading-snug line-clamp-1">
                  {r.title}
                  <span className="text-primary ml-1" aria-hidden="true">→</span>
                </p>
                <p id={descId} className="text-xs text-muted-foreground mt-1 leading-relaxed line-clamp-2">
                  {r.description}
                </p>
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
