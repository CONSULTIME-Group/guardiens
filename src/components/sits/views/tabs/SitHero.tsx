/**
 * Hero photos d'une annonce, version mosaïque moderne (style Airbnb).
 *
 * - Desktop : mosaïque 2 colonnes (1 grande à gauche + 2x2 vignettes à droite),
 *   hauteur compacte h-[320px] (réduit de moitié vs ancien layout).
 * - Mobile : carrousel single-image h-[220px] avec swipe + dots.
 * - Bandeau ville/titre sous la mosaïque (sortie de l'overlay sombre).
 * - Bouton "Voir les N photos" en bas-droite ouvre la lightbox.
 * - Clic sur n'importe quelle tuile → lightbox plein écran sur cette image.
 * - Lightbox : navigation clavier (← / → / Esc) + swipe tactile.
 */
import { useState, useEffect, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, X, Grid3x3 } from "lucide-react";

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

  const slides = useMemo(() => {
    const seen = new Set<string>();
    const all: { url: string; caption: string; kind: "logement" | "animal" }[] = [];

    const safeProperty = Array.isArray(photos)
      ? photos.filter((p): p is string => typeof p === "string" && p.trim().length > 0)
      : [];
    for (const p of safeProperty) {
      if (seen.has(p)) continue;
      seen.add(p);
      all.push({ url: p, caption: title ? `Photo du logement, ${title}` : "Photo du logement", kind: "logement" });
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
        className="rounded-2xl border border-dashed border-border bg-muted/30 mb-6 px-6 py-10 text-center"
      >
        <p className="font-heading text-base md:text-lg text-foreground">Galerie indisponible</p>
        <p className="mt-1 text-sm text-muted-foreground max-w-md mx-auto">
          L'hôte n'a pas encore ajouté de photos de son logement.
          {cityName ? ` Annonce située à ${cityName}${department ? ` (${department})` : ""}.` : ""}
        </p>
      </div>
    );
  }

  const handleTouchStart = (e: React.TouchEvent) => setTouchStartX(e.touches[0].clientX);
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX == null) return;
    const dx = e.changedTouches[0].clientX - touchStartX;
    if (Math.abs(dx) > 50) (dx < 0 ? next : prev)();
    setTouchStartX(null);
  };

  const openAt = (i: number) => {
    setIndex(i);
    setLightboxOpen(true);
  };

  const mosaic = slides.slice(0, 5);
  const main = mosaic[0];
  const sides = mosaic.slice(1, 5); // jusqu'à 4 vignettes

  const current = slides[index];

  return (
    <>
      <section className="mb-6" aria-label="Galerie photos de la garde">
        {/* ============== MOBILE : carrousel single-image compact ============== */}
        <div className="md:hidden">
          <div
            className="relative rounded-2xl overflow-hidden bg-muted"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            <button
              type="button"
              onClick={() => setLightboxOpen(true)}
              className="block w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              aria-label={`Agrandir la photo ${index + 1} sur ${total}`}
            >
              <img
                src={current.url}
                alt={current.caption}
                loading="eager"
                fetchPriority="high"
                decoding="async"
                className="w-full h-[220px] object-cover"
              />
            </button>

            {total > 1 && (
              <>
                <button
                  type="button"
                  onClick={prev}
                  aria-label="Photo précédente"
                  className="absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-background/90 backdrop-blur-sm shadow flex items-center justify-center"
                >
                  <ChevronLeft className="h-5 w-5 text-foreground" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={next}
                  aria-label="Photo suivante"
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-background/90 backdrop-blur-sm shadow flex items-center justify-center"
                >
                  <ChevronRight className="h-5 w-5 text-foreground" aria-hidden="true" />
                </button>
                <div className="absolute bottom-2 right-2 bg-background/90 backdrop-blur-sm rounded-full px-2.5 py-1 text-xs font-medium text-foreground shadow">
                  {index + 1} / {total}
                </div>
              </>
            )}
          </div>
        </div>

        {/* ============== DESKTOP : mosaïque compacte 2 colonnes ============== */}
        <div className="hidden md:block">
          <div className="relative rounded-2xl overflow-hidden">
            <div className="grid grid-cols-4 grid-rows-2 gap-1.5 h-[320px]">
              {/* Image principale, col-span 2, row-span 2 */}
              <button
                type="button"
                onClick={() => openAt(0)}
                className="col-span-2 row-span-2 group relative overflow-hidden bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                aria-label={`Agrandir la photo principale`}
              >
                <img
                  src={main.url}
                  alt={main.caption}
                  loading="eager"
                  fetchPriority="high"
                  decoding="async"
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                />
              </button>

              {/* Vignettes 2x2, fallback gris si moins de 4 */}
              {Array.from({ length: 4 }).map((_, i) => {
                const s = sides[i];
                if (!s) {
                  return (
                    <div
                      key={`empty-${i}`}
                      aria-hidden="true"
                      className="bg-muted/60"
                    />
                  );
                }
                return (
                  <button
                    key={`${i}-${s.url}`}
                    type="button"
                    onClick={() => openAt(i + 1)}
                    className="group relative overflow-hidden bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    aria-label={`Agrandir la photo ${i + 2} sur ${total}`}
                  >
                    <img
                      src={s.url}
                      alt={s.caption}
                      loading="lazy"
                      decoding="async"
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                    />
                  </button>
                );
              })}
            </div>

            {/* Bouton "Voir les N photos" */}
            {total > 1 && (
              <button
                type="button"
                onClick={() => setLightboxOpen(true)}
                className="absolute bottom-3 right-3 inline-flex items-center gap-2 bg-background/95 backdrop-blur-sm hover:bg-background border border-border rounded-full px-3.5 py-1.5 text-xs font-medium text-foreground shadow-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <Grid3x3 className="h-3.5 w-3.5" aria-hidden="true" />
                Voir les {total} photos
              </button>
            )}
          </div>
        </div>

        {/* Bandeau ville/titre sous la galerie, plus moderne et lisible */}
        {(title || cityName || department) && (
          <div className="mt-4">
            {(cityName || department) && (
              <p className="text-sm font-medium text-muted-foreground">
                {cityName}
                {department ? ` · ${department}` : ""}
              </p>
            )}
            {title && (
              <h1 className="mt-1 text-2xl md:text-3xl font-bold text-foreground leading-tight">
                {title}
              </h1>
            )}
          </div>
        )}
      </section>

      {/* ============== LIGHTBOX ============== */}
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
