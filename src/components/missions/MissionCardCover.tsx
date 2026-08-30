import { useState } from "react";
import { storageImageUrl } from "@/lib/storageImage";
import { missionCategoryLabel } from "@/lib/missionCategories";

/**
 * Cover unifiée pour les cartes de coup de main.
 * - Si `photo` → image plein cadre 4:3 avec zoom au hover.
 * - Sinon → gradient teinté par catégorie + libellé centré, tiré de la
 *   source unique `missionCategories.ts` (un seul libellé par catégorie).
 *
 * Utilisée dans les sections "Près de chez vous" et partout où l'on liste des missions
 * sans avoir besoin d'un composant carte complet type SearchListingCard.
 */

/** Gradients doux, sur des tokens sémantiques uniquement. */
const CATEGORY_GRADIENT: Record<string, string> = {
  animals: "from-primary/15 via-muted to-primary/5",
  garden: "from-success/15 via-muted to-success/5",
  house: "from-info/15 via-muted to-info/5",
  errand: "from-warning/15 via-muted to-warning/5",
  transport: "from-info/20 via-muted to-primary/5",
  company: "from-primary/10 via-muted to-success/10",
  skills: "from-warning/15 via-muted to-warning/5",
  other: "from-muted-foreground/10 via-muted to-muted",
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
  const label = missionCategoryLabel(cat);
  const gradient = CATEGORY_GRADIENT[cat] || CATEGORY_GRADIENT.other;


  const showImage = !!photo && !imgError;

  return (
    <div
      className={
        "rounded-2xl overflow-hidden aspect-[4/3] bg-muted shadow-sm " + (className || "")
      }
    >
      {showImage ? (
        <img
          src={storageImageUrl(photo, { width: 800, height: 600 }) || photo!}
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
  if (cat === "errand") {
    // Cabas de courses
    return (
      <svg viewBox="0 0 100 100" className={common} aria-hidden="true" preserveAspectRatio="xMidYMid slice">
        <path d="M28 42 H72 L67 82 H33 Z" fill="currentColor" />
        <path d="M40 42 V32 a10 10 0 0 1 20 0 V42" fill="none" stroke="currentColor" strokeWidth="5" />
      </svg>
    );
  }
  if (cat === "transport") {
    // Voiture stylisée
    return (
      <svg viewBox="0 0 100 100" className={common} aria-hidden="true" preserveAspectRatio="xMidYMid slice">
        <path d="M20 62 L27 45 H73 L80 62 V72 H20 Z" fill="currentColor" />
        <circle cx="33" cy="74" r="7" fill="currentColor" opacity="0.6" />
        <circle cx="67" cy="74" r="7" fill="currentColor" opacity="0.6" />
      </svg>
    );
  }
  if (cat === "company") {
    // Deux présences côte à côte
    return (
      <svg viewBox="0 0 100 100" className={common} aria-hidden="true" preserveAspectRatio="xMidYMid slice">
        <circle cx="38" cy="40" r="10" fill="currentColor" />
        <circle cx="64" cy="44" r="8" fill="currentColor" opacity="0.6" />
        <path d="M22 80 a16 16 0 0 1 32 0 Z" fill="currentColor" />
        <path d="M52 80 a13 13 0 0 1 26 0 Z" fill="currentColor" opacity="0.6" />
      </svg>
    );
  }
  if (cat === "other") {
    // Trois points, catégorie ouverte
    return (
      <svg viewBox="0 0 100 100" className={common} aria-hidden="true" preserveAspectRatio="xMidYMid slice">
        <circle cx="34" cy="55" r="6" fill="currentColor" />
        <circle cx="50" cy="55" r="6" fill="currentColor" />
        <circle cx="66" cy="55" r="6" fill="currentColor" />
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
