import { useState } from "react";

/**
 * Cover unifiée pour les cartes de coup de main.
 * - Si `photo` → image plein cadre 4:3 avec zoom au hover.
 * - Sinon → gradient teinté par catégorie + label court centré (Animaux / Jardin / Maison / Savoir-faire).
 *
 * Utilisée dans les sections "Près de chez vous" et partout où l'on liste des missions
 * sans avoir besoin d'un composant carte complet type SearchListingCard.
 */

const CATEGORY_LABEL: Record<string, string> = {
  animals: "Animaux",
  garden: "Jardin",
  house: "Maison",
  skills: "Savoir-faire",
};

/** Gradients doux, sur des tokens sémantiques uniquement. */
const CATEGORY_GRADIENT: Record<string, string> = {
  animals: "from-primary/15 via-muted to-primary/5",
  garden: "from-success/15 via-muted to-success/5",
  house: "from-info/15 via-muted to-info/5",
  skills: "from-warning/15 via-muted to-warning/5",
};

interface MissionCardCoverProps {
  photo?: string | null;
  category?: string | null;
  title: string;
  className?: string;
}

const MissionCardCover = ({ photo, category, title, className }: MissionCardCoverProps) => {
  const [imgError, setImgError] = useState(false);
  const cat = (category || "animals") as string;
  const label = CATEGORY_LABEL[cat] || CATEGORY_LABEL.animals;
  const gradient = CATEGORY_GRADIENT[cat] || CATEGORY_GRADIENT.animals;

  const showImage = !!photo && !imgError;

  return (
    <div
      className={
        "rounded-2xl overflow-hidden aspect-[4/3] bg-muted shadow-sm " + (className || "")
      }
    >
      {showImage ? (
        <img
          src={photo!}
          alt={title}
          loading="lazy"
          decoding="async"
          onError={() => setImgError(true)}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
        />
      ) : (
        <div
          className={`relative w-full h-full bg-gradient-to-br ${gradient} group-hover:scale-105 transition-transform duration-700 flex items-center justify-center overflow-hidden`}
        >
          <CategoryIllustration cat={cat} />
          <span className="relative text-[10px] font-bold uppercase tracking-widest text-foreground/50">
            {label}
          </span>
        </div>
      )}
    </div>
  );
};

/** Décor SVG doux, purement décoratif (aria-hidden). */
const CategoryIllustration = ({ cat }: { cat: string }) => {
  const common = "absolute inset-0 w-full h-full text-foreground/10";
  if (cat === "garden") {
    return (
      <svg viewBox="0 0 100 100" className={common} aria-hidden="true" preserveAspectRatio="xMidYMid slice">
        <path d="M20 80 Q30 40 50 45 Q70 40 80 80 Z" fill="currentColor" />
        <circle cx="50" cy="30" r="10" fill="currentColor" opacity="0.6" />
      </svg>
    );
  }
  if (cat === "house") {
    return (
      <svg viewBox="0 0 100 100" className={common} aria-hidden="true" preserveAspectRatio="xMidYMid slice">
        <path d="M25 55 L50 30 L75 55 L75 85 L25 85 Z" fill="currentColor" />
        <rect x="42" y="65" width="16" height="20" fill="currentColor" opacity="0.4" />
      </svg>
    );
  }
  if (cat === "skills") {
    return (
      <svg viewBox="0 0 100 100" className={common} aria-hidden="true" preserveAspectRatio="xMidYMid slice">
        <circle cx="50" cy="50" r="22" fill="none" stroke="currentColor" strokeWidth="6" />
        <circle cx="50" cy="50" r="6" fill="currentColor" />
      </svg>
    );
  }
  // animals (défaut) : silhouette de patte
  return (
    <svg viewBox="0 0 100 100" className={common} aria-hidden="true" preserveAspectRatio="xMidYMid slice">
      <ellipse cx="50" cy="65" rx="18" ry="14" fill="currentColor" />
      <circle cx="30" cy="45" r="7" fill="currentColor" />
      <circle cx="45" cy="35" r="7" fill="currentColor" />
      <circle cx="60" cy="35" r="7" fill="currentColor" />
      <circle cx="72" cy="45" r="7" fill="currentColor" />
    </svg>
  );
};

export default MissionCardCover;
