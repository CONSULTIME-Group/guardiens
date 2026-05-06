/**
 * Hero photo principale + bandeau ville/titre superposé.
 * Utilisé en tête de SitImmersiveContent.
 *
 * - Carrousel : photos du logement + photos des animaux concaténées
 * - Vignettes cliquables sous la photo principale
 * - Clic sur la photo principale = ouverture en lightbox plein écran
 * - Navigation clavier (← / → / Esc) + swipe tactile dans la lightbox
 */
import { useState, useEffect, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, X, Maximize2 } from "lucide-react";

interface PetPhotoItem {
  url: string;
  name?: string | null;
  species?: string | null;
}

interface SitHeroProps {
  photos: string[];
  petPhotos?: PetPhotoItem[];
  title?: string | null;
  cityName?: string;
  department?: string;
}

const SitHero = ({ photos, petPhotos = [], title, cityName, department }: SitHeroProps) => {
  const [index, setIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);

  // Liste consolidée : photos logement (avec marqueur) + photos animaux (avec nom)
  const slides = useMemo(() => {
    const seen = new Set<string>();
    const all: { url: string; caption: string; kind: "logement" | "animal" }[] = [];

    const safeProperty = Array.isArray(photos)
      ? photos.filter((p): p is string => typeof p === "string" && p.trim().length > 0)
      : [];
    for (const p of safeProperty) {
      if (seen.has(p)) continue;
      seen.add(p);
      all.push({ url: p, caption: title ? `Photo du logement — ${title}` : "Photo du logement", kind: "logement" });
    }

    for (const pet of petPhotos) {
      if (!pet?.url || typeof pet.url !== "string") continue;
      const url = pet.url.trim();
      if (!url || seen.has(url)) continue;
      seen.add(url);
      const speciesLabel = pet.species ? ` (${pet.species})` : "";
      const caption = pet.name ? `${pet.name}${speciesLabel}` : `Animal de la garde${speciesLabel}`;
      all.push({ url, caption, kind: "animal" });
    }
    return all;
  }, [photos, petPhotos, title]);

  const total = slides.length;

  useEffect(() => {
    if (index >= total && total > 0) setIndex(0);
  }, [total, index]);

  const next = useCallback(() => {
    setIndex((i) => (i + 1) % Math.max(1, total));
  }, [total]);
  const prev = useCallback(() => {
    setIndex((i) => (i - 1 + Math.max(1, total)) % Math.max(1, total));
  }, [total]);

  // Navigation clavier + lock scroll quand la lightbox est ouverte
  useEffect(() => {
    if (!lightboxOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightboxOpen(false);
      else if (e.key === "ArrowRight") next();
      else if (e.key === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [lightboxOpen, next, prev]);

  if (total === 0) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="rounded-3xl border border-dashed border-border bg-muted/30 mb-6 px-6 py-10 md:py-14 text-center"
      >
        <p className="font-heading text-base md:text-lg text-foreground">
          Galerie indisponible
        </p>
        <p className="mt-1 text-sm text-muted-foreground max-w-md mx-auto">
          L'hôte n'a pas encore ajouté de photos de son logement.
          {cityName ? ` Annonce située à ${cityName}${department ? ` (${department})` : ""}.` : ""}
        </p>
      </div>
    );
  }

  const current = slides[index];

  const handleTouchStart = (e: React.TouchEvent) => setTouchStartX(e.touches[0].clientX);
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX == null) return;
    const dx = e.changedTouches[0].clientX - touchStartX;
    if (Math.abs(dx) > 50) (dx < 0 ? next : prev)();
    setTouchStartX(null);
  };

  return (
    <>
      <div className="rounded-3xl overflow-hidden border border-border bg-card mb-6">
        <div className="relative">
          {/* Photo principale cliquable -> ouvre lightbox */}
          <button
            type="button"
            onClick={() => setLightboxOpen(true)}
            className="group block w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            aria-label={`Agrandir la photo ${index + 1} sur ${total}`}
          >
            <img
              src={current.url}
              alt={current.caption}
              loading="eager"
              fetchPriority="high"
              decoding="async"
              className="w-full h-[280px] md:h-[420px] object-cover transition-transform duration-500 group-hover:scale-[1.02]"
            />
            {/* Icône zoom */}
            <div className="absolute top-3 right-3 bg-background/85 backdrop-blur-sm rounded-full p-2 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity shadow-md">
              <Maximize2 className="h-4 w-4 text-foreground" aria-hidden="true" />
            </div>
            {/* Compteur */}
            {total > 1 && (
              <div className="absolute top-3 left-3 bg-background/85 backdrop-blur-sm rounded-full px-2.5 py-1 text-xs font-medium text-foreground shadow-md">
                {index + 1} / {total}
              </div>
            )}
            {/* Badge type de photo */}
            {current.kind === "animal" && (
              <div className="absolute bottom-[88px] md:bottom-[120px] left-3 bg-background/85 backdrop-blur-sm rounded-full px-3 py-1 text-xs font-medium text-foreground shadow-md">
                {current.caption}
              </div>
            )}
            {/* Overlay titre / ville (gradient bas) */}
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-5 md:p-8 pointer-events-none">
              {(cityName || department) && (
                <p className="mb-2 text-white/90 text-sm font-medium">
                  {cityName}
                  {department ? ` · ${department}` : ""}
                </p>
              )}
              {title && (
                <h1 className="text-2xl md:text-4xl font-bold text-white leading-tight max-w-3xl">
                  {title}
                </h1>
              )}
            </div>
          </button>

          {/* Flèches navigation desktop sur la photo principale */}
          {total > 1 && (
            <>
              <button
                type="button"
                onClick={prev}
                aria-label="Photo précédente"
                className="hidden md:flex absolute left-3 top-1/2 -translate-y-1/2 items-center justify-center w-10 h-10 rounded-full bg-background/85 hover:bg-background backdrop-blur-sm shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <ChevronLeft className="h-5 w-5 text-foreground" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={next}
                aria-label="Photo suivante"
                className="hidden md:flex absolute right-3 top-1/2 -translate-y-1/2 items-center justify-center w-10 h-10 rounded-full bg-background/85 hover:bg-background backdrop-blur-sm shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <ChevronRight className="h-5 w-5 text-foreground" aria-hidden="true" />
              </button>
            </>
          )}
        </div>

        {/* Vignettes cliquables */}
        {total > 1 && (
          <div className="flex gap-1.5 p-2 overflow-x-auto bg-card">
            {slides.map((s, i) => (
              <button
                key={`${i}-${s.url}`}
                type="button"
                onClick={() => setIndex(i)}
                aria-label={`Voir la photo ${i + 1} sur ${total}${s.kind === "animal" ? ` — ${s.caption}` : ""}`}
                aria-current={i === index ? "true" : undefined}
                className={`relative w-20 h-16 md:w-24 md:h-20 rounded-md shrink-0 overflow-hidden border-2 transition-all bg-muted ${
                  i === index
                    ? "border-primary ring-2 ring-primary/30"
                    : "border-transparent opacity-70 hover:opacity-100"
                }`}
              >
                <img src={s.url} alt="" loading="lazy" className="w-full h-full object-cover" />
                {s.kind === "animal" && (
                  <span className="absolute bottom-0 inset-x-0 bg-black/50 text-white text-[10px] font-medium px-1 py-0.5 truncate">
                    {s.caption}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox plein écran via portal */}
      {lightboxOpen && typeof document !== "undefined" &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] bg-black/95 flex items-center justify-center animate-fade-in"
            role="dialog"
            aria-modal="true"
            aria-label="Galerie photos plein écran"
            onClick={() => setLightboxOpen(false)}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setLightboxOpen(false); }}
              className="absolute top-4 right-4 z-10 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-full p-3 text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              aria-label="Fermer la galerie"
            >
              <X className="h-5 w-5" />
            </button>

            {total > 1 && (
              <>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); prev(); }}
                  aria-label="Photo précédente"
                  className="absolute left-4 top-1/2 -translate-y-1/2 z-10 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-full p-3 text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); next(); }}
                  aria-label="Photo suivante"
                  className="absolute right-4 top-1/2 -translate-y-1/2 z-10 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-full p-3 text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                >
                  <ChevronRight className="h-6 w-6" />
                </button>
              </>
            )}

            <img
              src={current.url}
              alt={current.caption}
              onClick={(e) => e.stopPropagation()}
              className="max-h-[90vh] max-w-[95vw] object-contain select-none"
              draggable={false}
            />

            {/* Légende + compteur en bas */}
            <div
              className="absolute bottom-6 inset-x-0 flex justify-center pointer-events-none"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-white/10 backdrop-blur-sm rounded-full px-4 py-1.5 text-white text-sm">
                {current.caption}{total > 1 ? ` · ${index + 1} / ${total}` : ""}
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
};

export default SitHero;
