import emptyAnnonces from "@/assets/illustrations/empty-annonces.jpg";
import emptyHelpers from "@/assets/illustrations/empty-helpers.jpg";
import emptyConseils from "@/assets/illustrations/empty-conseils.jpg";

/**
 * Gouaches éditoriales pour les empty-states du dashboard.
 *
 * Pourquoi un composant dédié : on remplace les blocs sobres "texte centré
 * dans une carte" par une illustration peinte main, conforme à la règle
 * "no Lucide/emoji dans le contenu". Les 3 illustrations sont des assets
 * peints (chaise/chat, mains/plante, carnet/lavande) — pas des icônes.
 *
 * Tailles fixées (max-h responsive) pour ne pas exploser le layout d'une
 * carte secondaire. Le fond cream de l'image se fond avec la card.
 */

export type EmptyIllustrationKind = "annonces" | "helpers" | "conseils";

const SOURCES: Record<EmptyIllustrationKind, { src: string; alt: string }> = {
  annonces: {
    src: emptyAnnonces,
    alt: "Illustration peinte : une chaise vide sur une terrasse, un chat allongé près d'une fenêtre aux volets ouverts.",
  },
  helpers: {
    src: emptyHelpers,
    alt: "Illustration peinte : deux mains se passant un petit pot avec une plante, village en arrière-plan.",
  },
  conseils: {
    src: emptyConseils,
    alt: "Illustration peinte : un carnet ouvert avec un stylo plume et un brin de lavande posé dessus.",
  },
};

interface EmptyIllustrationProps {
  kind: EmptyIllustrationKind;
  /** Taille max en hauteur. `sm` = 96px, `md` = 140px, `lg` = 180px. */
  size?: "sm" | "md" | "lg";
  className?: string;
}

const SIZE_CLASS: Record<NonNullable<EmptyIllustrationProps["size"]>, string> = {
  sm: "max-h-24",
  md: "max-h-36",
  lg: "max-h-44",
};

const EmptyIllustration = ({ kind, size = "md", className = "" }: EmptyIllustrationProps) => {
  const { src, alt } = SOURCES[kind];
  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      width={896}
      height={672}
      className={`mx-auto w-auto ${SIZE_CLASS[size]} object-contain select-none pointer-events-none ${className}`}
    />
  );
};

export default EmptyIllustration;
