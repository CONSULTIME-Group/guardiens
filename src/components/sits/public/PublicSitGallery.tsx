import { useCallback, useEffect, useState } from "react";
import { X, ChevronLeft, ChevronRight, Maximize2 } from "lucide-react";

interface Props {
  photos: string[];
  city?: string | null;
  ownerFirstName?: string | null;
}

/**
 * Galerie publique, grille cliquable + lightbox clavier/swipe.
 * Affichée sous le pitch, indépendante du Hero (qui ne montre que la photo de couv).
 */
const PublicSitGallery = ({ photos, city, ownerFirstName }: Props) => {
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const [touchX, setTouchX] = useState<number | null>(null);

  const total = photos.length;
  const next = useCallback(() => setIndex((i) => (i + 1) % total), [total]);
  const prev = useCallback(() => setIndex((i) => (i - 1 + total) % total), [total]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
      else if (e.key === "ArrowRight") next();
      else if (e.key === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, next, prev]);

  if (total === 0) return null;

  const altFor = (i: number) =>
    `Photo ${i + 1} sur ${total} du logement${city ? ` à ${city}` : ""}${
      ownerFirstName ? ` proposé par ${ownerFirstName}` : ""
    }, Guardiens`;

  const openAt = (i: number) => {
    setIndex(i);
    setOpen(true);
  };

  return (
    <section className="mb-8" aria-labelledby="public-sit-gallery-heading">
      <div className="flex items-center justify-between mb-3">
        <h2
          id="public-sit-gallery-heading"
          className="font-heading text-lg font-semibold"
        >
          Galerie
        </h2>
        <span className="text-xs text-muted-foreground">
          {total} photo{total > 1 ? "s" : ""}
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
        {photos.map((url, i) => (
          <button
            key={`${url}-${i}`}
            type="button"
            onClick={() => openAt(i)}
            className="group relative aspect-square overflow-hidden rounded-xl border border-border bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            aria-label={`Agrandir la photo ${i + 1} sur ${total}`}
          >
            <img
              src={url}
              alt={altFor(i)}
              loading="lazy"
              decoding="async"
              fetchPriority="low"
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
            <span className="absolute top-1.5 right-1.5 bg-background/85 backdrop-blur-sm rounded-full p-1.5 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity shadow-md">
              <Maximize2 className="h-3.5 w-3.5 text-foreground" aria-hidden="true" />
            </span>
          </button>
        ))}
      </div>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Galerie photos plein écran"
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setOpen(false)}
          onTouchStart={(e) => setTouchX(e.touches[0].clientX)}
          onTouchEnd={(e) => {
            if (touchX == null) return;
            const dx = e.changedTouches[0].clientX - touchX;
            if (Math.abs(dx) > 50) (dx < 0 ? next : prev)();
            setTouchX(null);
          }}
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setOpen(false);
            }}
            aria-label="Fermer la galerie"
            className="absolute top-4 right-4 p-2 rounded-full bg-background/90 hover:bg-background text-foreground shadow-md"
          >
            <X className="h-5 w-5" />
          </button>

          {total > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  prev();
                }}
                aria-label="Photo précédente"
                className="absolute left-3 md:left-6 p-2 rounded-full bg-background/90 hover:bg-background text-foreground shadow-md"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  next();
                }}
                aria-label="Photo suivante"
                className="absolute right-3 md:right-6 p-2 rounded-full bg-background/90 hover:bg-background text-foreground shadow-md"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-background/90 text-xs font-medium text-foreground shadow-md">
                {index + 1} / {total}
              </div>
            </>
          )}

          <img
            src={photos[index]}
            alt={altFor(index)}
            className="max-h-[88vh] max-w-[92vw] object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </section>
  );
};

export default PublicSitGallery;
