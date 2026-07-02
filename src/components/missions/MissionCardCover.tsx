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
          className={`w-full h-full bg-gradient-to-br ${gradient} group-hover:scale-105 transition-transform duration-700 flex items-center justify-center`}
        >
          <span className="text-[10px] font-bold uppercase tracking-widest text-foreground/40">
            {label}
          </span>
        </div>
      )}
    </div>
  );
};

export default MissionCardCover;
