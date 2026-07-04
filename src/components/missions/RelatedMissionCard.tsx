import { Link } from "react-router-dom";
import { useState } from "react";

/**
 * Carte "Près de chez vous" utilisée dans PublicMissionView & SmallMissionDetail.
 *
 * Objectif : éviter le pavé gris générique "ANIMAUX" quand aucune photo n'est fournie,
 * et harmoniser l'aspect des cartes photo vs. sans-photo dans la même grille.
 *
 * - Avec photo : cover 4:3 + zoom hover, chip catégorie discrète en overlay.
 * - Sans photo : pas de gros bloc vide, poster typographique 4:3 (gradient teinté
 *   catégorie, glyphe SVG large en filigrane, titre repris en gros au centre,
 *   contrepartie évoquée en bas). La carte reste dense et lisible sans image.
 */

const CATEGORY_LABEL: Record<string, string> = {
  animals: "Animaux",
  garden: "Jardin",
  house: "Maison",
  skills: "Savoir-faire",
};

const CATEGORY_GRADIENT: Record<string, string> = {
  animals: "from-primary/25 via-primary/10 to-transparent",
  garden: "from-success/25 via-success/10 to-transparent",
  house: "from-info/25 via-info/10 to-transparent",
  skills: "from-warning/25 via-warning/10 to-transparent",
};

const CategoryGlyph = ({ category, className }: { category: string; className?: string }) => {
  const c = className || "w-24 h-24 text-primary/25";
  if (category === "garden") {
    return (
      <svg className={c} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
      </svg>
    );
  }
  if (category === "house") {
    return (
      <svg className={c} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.2" d="M3 12l2-2m0 0l7-7 7 7m-9 2v8a2 2 0 002 2h4a2 2 0 002-2v-8"/>
      </svg>
    );
  }
  if (category === "skills") {
    return (
      <svg className={c} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.2" d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z"/>
      </svg>
    );
  }
  return (
    <svg className={c} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/>
    </svg>
  );
};

interface Props {
  to: string;
  photo?: string | null;
  category?: string | null;
  title: string;
  city?: string | null;
  timeAgo?: string | null;
  exchangeOffer?: string | null;
}

const RelatedMissionCard = ({ to, photo, category, title, city, timeAgo, exchangeOffer }: Props) => {
  const [imgError, setImgError] = useState(false);
  const cat = (category || "animals") as string;
  const label = CATEGORY_LABEL[cat] || CATEGORY_LABEL.animals;
  const gradient = CATEGORY_GRADIENT[cat] || CATEGORY_GRADIENT.animals;
  const showImage = !!photo && !imgError;

  return (
    <Link to={to} className="group block">
      <div className="relative rounded-2xl overflow-hidden aspect-[4/3] bg-card border border-border shadow-sm transition-all duration-300 group-hover:shadow-xl group-hover:-translate-y-0.5">
        {showImage ? (
          <>
            <img
              src={photo!}
              alt={title}
              loading="lazy"
              decoding="async"
              onError={() => setImgError(true)}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
            <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest bg-background/95 backdrop-blur text-primary">
              {label}
            </span>
          </>
        ) : (
          <div className={`w-full h-full bg-gradient-to-br ${gradient} flex flex-col justify-between p-5`}>
            <div className="flex items-start justify-between">
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest bg-background/80 backdrop-blur text-primary">
                {label}
              </span>
              <CategoryGlyph category={cat} className="w-12 h-12 text-primary/30 shrink-0" />
            </div>
            <div>
              <p className="font-heading text-lg md:text-xl font-bold text-primary leading-tight line-clamp-3">
                {title}
              </p>
              {exchangeOffer && (
                <p className="mt-2 text-xs text-foreground/70 italic line-clamp-2">
                  « {exchangeOffer} »
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Bloc texte sous la carte : uniquement quand la photo occupe le cover
          (sinon le titre est déjà dans le poster) */}
      {showImage ? (
        <div className="mt-4">
          <h3 className="font-heading text-xl font-bold mb-1 group-hover:text-primary transition-colors line-clamp-2">
            {title}
          </h3>
          <p className="text-sm text-muted-foreground font-medium">
            {city || "France"}{timeAgo ? ` · ${timeAgo}` : ""}
          </p>
        </div>
      ) : (
        <div className="mt-4">
          <p className="text-sm text-muted-foreground font-medium">
            {city || "France"}{timeAgo ? ` · ${timeAgo}` : ""}
          </p>
        </div>
      )}
    </Link>
  );
};

export default RelatedMissionCard;
