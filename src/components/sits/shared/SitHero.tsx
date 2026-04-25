/**
 * Hero photos d'une annonce de garde, partagé entre /sits/:id et /annonces/:id.
 * - Photo principale grande (h-72 mobile, h-96 desktop).
 * - Vignettes cliquables si plusieurs photos.
 * - Lightbox plein écran au clic, navigation clavier (←/→/Esc) et swipe.
 */
import { useState, useEffect, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, X, Maximize2, ImageOff } from "lucide-react";

interface SitHeroProps {
  photos: string[];
  city?: string | null;
  /** Si true, on charge la 1ère image en eager (priorité LCP). */
  priority?: boolean;
}

const SitHero = ({ photos, city, priority = false }: SitHeroProps) => {
  const [photoIndex, setPhotoIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [brokenIndices, setBrokenIndices] = useState<Set<number>>(new Set());

  const cityLabel = city || "France";

  // Filtre défensif : on ne garde que des URLs string non vides et déduplique.
  const safePhotos = useMemo(() => {
    if (!Array.isArray(photos)) return [];
    const seen = new Set<string>();
    return photos.filter((p) => {
      if (typeof p !== "string") return false;
      const url = p.trim();
      if (!url) return false;
      if (seen.has(url)) return false;
      seen.add(url);
      return true;
    });
  }, [photos]);

  const total = safePhotos.length;

  // Si la liste rétrécit (ex: maj realtime), on borne l'index actif.
  useEffect(() => {
    if (photoIndex >= total && total > 0) setPhotoIndex(0);
  }, [total, photoIndex]);

  const next = useCallback(() => {
    setPhotoIndex((i) => (i + 1) % Math.max(1, total));
  }, [total]);

  const prev = useCallback(() => {
    setPhotoIndex((i) => (i - 1 + Math.max(1, total)) % Math.max(1, total));
  }, [total]);

  // Navigation clavier dans la lightbox
  useEffect(() => {
    if (!lightboxOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightboxOpen(false);
      else if (e.key === "ArrowRight") next();
      else if (e.key === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", onKey);
    // Empêche le scroll du body
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [lightboxOpen, next, prev]);

  // État vide : aucune photo exploitable. On affiche un placeholder lisible
  // plutôt que de retourner null (qui casserait silencieusement la mise en page).
  if (total === 0) {
    return (
      <div className="mb-6">
        <div
          role="img"
          aria-label={`Aucune photo disponible pour cette garde à ${cityLabel}`}
          className="w-full h-72 md:h-96 rounded-xl bg-muted/50 border border-dashed border-border flex flex-col items-center justify-center text-muted-foreground gap-2"
        >
          <ImageOff className="h-10 w-10" aria-hidden="true" />
          <p className="text-sm font-medium">Aucune photo pour le moment</p>
          <p className="text-xs">Le propriétaire n'a pas encore ajouté de photos du logement ou des animaux.</p>
        </div>
      </div>
    );
  }

  const altFor = (i: number) =>
    `Photo ${i + 1} sur ${total} de la garde à ${cityLabel} (logement et animaux) — annonce Guardiens`;

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.touches[0].clientX);
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX == null) return;
    const dx = e.changedTouches[0].clientX - touchStartX;
    if (Math.abs(dx) > 50) {
      if (dx < 0) next();
      else prev();
    }
    setTouchStartX(null);
  };

  return (
    <>
      <div className="mb-6 relative">
        {/* Photo principale — cliquable, ouvre lightbox */}
        <button
          type="button"
          onClick={() => setLightboxOpen(true)}
          className="group relative w-full overflow-hidden rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          aria-label={`Agrandir la photo ${photoIndex + 1} sur ${total}`}
        >
          <img
            src={photos[photoIndex]}
            alt={altFor(photoIndex)}
            loading={priority ? "eager" : "lazy"}
            decoding="async"
            className="w-full h-72 md:h-96 object-cover transition-transform duration-500 group-hover:scale-[1.02]"
          />
          {/* Overlay icône agrandir */}
          <div className="absolute top-3 right-3 bg-background/80 backdrop-blur-sm rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity shadow-md">
            <Maximize2 className="h-4 w-4 text-foreground" aria-hidden="true" />
          </div>
          {/* Compteur de photos */}
          {total > 1 && (
            <div className="absolute bottom-3 right-3 bg-background/80 backdrop-blur-sm rounded-full px-2.5 py-1 text-xs font-medium text-foreground shadow-md">
              {photoIndex + 1} / {total}
            </div>
          )}
        </button>

        {/* Vignettes */}
        {total > 1 && (
          <div className="flex gap-1.5 mt-2 overflow-x-auto pb-1">
            {photos.map((p, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setPhotoIndex(i)}
                aria-label={`Voir la photo ${i + 1} sur ${total}`}
                aria-current={i === photoIndex ? "true" : undefined}
                className={`w-16 h-12 rounded-md shrink-0 overflow-hidden border-2 transition-all ${
                  i === photoIndex
                    ? "border-primary ring-2 ring-primary/30"
                    : "border-transparent opacity-70 hover:opacity-100"
                }`}
              >
                <img src={p} alt="" loading="lazy" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox — rendue via portal pour échapper à tout stacking context
          parent (sidebar sticky, layout flex) et garantir un vrai plein écran. */}
      {lightboxOpen && typeof document !== "undefined" &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] bg-black/95 flex items-center justify-center animate-fade-in"
            role="dialog"
            aria-modal="true"
            aria-label="Galerie photos plein écran"
            onClick={() => setLightboxOpen(false)}
          >
            {/* Bouton fermer */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setLightboxOpen(false);
              }}
              className="absolute top-4 right-4 z-10 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-full p-3 text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              aria-label="Fermer la galerie"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Compteur */}
            {total > 1 && (
              <div className="absolute top-4 left-4 z-10 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 text-sm font-medium text-white">
                {photoIndex + 1} / {total}
              </div>
            )}

            {/* Flèches navigation */}
            {total > 1 && (
              <>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    prev();
                  }}
                  className="absolute left-2 md:left-4 z-10 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-full p-3 text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                  aria-label="Photo précédente"
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    next();
                  }}
                  className="absolute right-2 md:right-4 z-10 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-full p-3 text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                  aria-label="Photo suivante"
                >
                  <ChevronRight className="h-6 w-6" />
                </button>
              </>
            )}

            {/* Image */}
            <img
              src={photos[photoIndex]}
              alt={altFor(photoIndex)}
              onClick={(e) => e.stopPropagation()}
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
              className="max-h-[90vh] max-w-[95vw] object-contain select-none"
              draggable={false}
            />
          </div>,
          document.body
        )}
    </>
  );
};

export default SitHero;
