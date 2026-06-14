/**
 * Hero photos d'une annonce, version mosaïque moderne (style Airbnb).
 *
 * - Desktop : mosaïque 2 colonnes (1 grande à gauche + 2x2 vignettes à droite),
 *   hauteur compacte h-[320px].
 * - Mobile : carrousel full-bleed h-[56vw] min-h-[240px] avec swipe + overlay chips
 *   (ville · dates · animaux) → above-the-fold complet sans scroll.
 * - Bouton "Voir les N photos" en bas-droite ouvre la lightbox.
 * - Lightbox : navigation clavier (← / → / Esc) + swipe tactile.
 */
import { useState, useEffect, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, X, Grid3x3 } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

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
  /** Données overlay mobile : dates + animaux */
  startDate?: string | null;
  endDate?: string | null;
  petsCount?: number;
  speciesSummary?: string;
  /** Micro-confiance : card propriétaire dans le hero */
  ownerAvatarUrl?: string | null;
  ownerName?: string | null;
  ownerVerified?: boolean;
  ownerCompletedSitsCount?: number | null;
}

const fmtDate = (d: string) =>
  format(new Date(d), "d MMM", { locale: fr });

const SitHero = ({
  photos,
  petPhotos = [],
  title,
  cityName,
  department,
  startDate,
  endDate,
  petsCount,
  speciesSummary,
  ownerAvatarUrl,
  ownerName,
  ownerVerified,
  ownerCompletedSitsCount,
}: SitHeroProps) => {
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
      const speciesLbl = pet.species ? ` (${pet.species})` : "";
      const caption = pet.name ? `${pet.name}${speciesLbl}` : `Animal de la garde${speciesLbl}`;
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
  const sides = mosaic.slice(1, 5);

  const current = slides[index];

  // Chips overlay : ville, dates, animaux
  const dateChip =
    startDate && endDate
      ? `${fmtDate(startDate)} → ${fmtDate(endDate)}`
      : startDate
        ? `À partir du ${fmtDate(startDate)}`
        : null;

  const petsChip =
    petsCount && petsCount > 0
      ? `${petsCount} ${petsCount === 1 ? "animal" : "animaux"}${speciesSummary ? ` · ${speciesSummary}` : ""}`
      : null;

  return (
    <>
      <section className="mb-6" aria-label="Galerie photos de la garde">
        {/* ====== MOBILE : carrousel full-bleed + overlay chips ====== */}
        <div className="md:hidden">
          {/* Négatif margin pour annuler le px-3 du parent SitDetail */}
          <div
            className="relative overflow-hidden bg-muted -mx-3"
            style={{ minHeight: 240, height: "56vw", maxHeight: 340 }}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            <button
              type="button"
              onClick={() => setLightboxOpen(true)}
              className="block w-full h-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              aria-label={`Agrandir la photo ${index + 1} sur ${total}`}
            >
              <img
                src={current.url}
                alt={current.caption}
                loading="eager"
                fetchPriority="high"
                decoding="async"
                className="w-full h-full object-cover"
              />
            </button>

            {/* Gradient overlay bas → chips contextuels */}
            <div
              className="absolute inset-x-0 bottom-0 h-28 pointer-events-none"
              style={{
                background:
                  "linear-gradient(to top, hsl(var(--foreground)/0.72) 0%, transparent 100%)",
              }}
              aria-hidden="true"
            />

            {/* Chips : ville · dates · animaux */}
            <div className="absolute bottom-3 left-3 right-14 flex flex-col gap-1 pointer-events-none">
              {cityName && (
                <p className="text-xs font-semibold text-primary-foreground/90 leading-none">
                  {cityName}{department ? ` · ${department}` : ""}
                </p>
              )}
              {(dateChip || petsChip) && (
                <div className="flex flex-wrap gap-1.5 mt-0.5">
                  {dateChip && (
                    <span className="inline-block rounded-full bg-background/25 backdrop-blur-sm border border-background/20 px-2.5 py-1 text-[11px] font-semibold text-primary-foreground leading-none">
                      {dateChip}
                    </span>
                  )}
                  {petsChip && (
                    <span className="inline-block rounded-full bg-background/25 backdrop-blur-sm border border-background/20 px-2.5 py-1 text-[11px] font-semibold text-primary-foreground leading-none">
                      {petsChip}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Micro-confiance : mini owner card en haut-droite */}
            {ownerName && (
              <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-background/30 backdrop-blur-sm rounded-full pl-0.5 pr-2.5 py-0.5 pointer-events-none">
                {ownerAvatarUrl ? (
                  <img
                    src={ownerAvatarUrl}
                    alt={ownerName}
                    loading="lazy"
                    className="w-6 h-6 rounded-full object-cover border border-background/40"
                  />
                ) : (
                  <span className="w-6 h-6 rounded-full bg-primary/80 flex items-center justify-center text-[10px] font-bold text-primary-foreground">
                    {ownerName.charAt(0).toUpperCase()}
                  </span>
                )}
                <span className="text-[10px] font-semibold text-primary-foreground leading-none">
                  {ownerName}
                  {ownerVerified && (
                    <span className="ml-1 text-[9px] font-bold bg-primary/60 rounded-full px-1 py-px">✓</span>
                  )}
                </span>
              </div>
            )}

            {/* Nav prev/next (44px tactile) */}
            {total > 1 && (
              <>
                <button
                  type="button"
                  onClick={prev}
                  aria-label="Photo précédente"
                  className="absolute left-2 top-1/2 -translate-y-1/2 h-11 w-11 rounded-full bg-background/80 backdrop-blur-sm shadow flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <ChevronLeft className="h-5 w-5 text-foreground" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={next}
                  aria-label="Photo suivante"
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-11 w-11 rounded-full bg-background/80 backdrop-blur-sm shadow flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <ChevronRight className="h-5 w-5 text-foreground" aria-hidden="true" />
                </button>
                <div className="absolute bottom-3 right-3 bg-background/80 backdrop-blur-sm rounded-full px-2.5 py-1 text-xs font-medium text-foreground shadow">
                  {index + 1} / {total}
                </div>
              </>
            )}
          </div>

          {/* Titre sous le hero mobile (si présent) */}
          {title && (
            <h1 className="mt-4 text-2xl font-bold text-foreground leading-tight px-0">
              {title}
            </h1>
          )}
        </div>

        {/* ====== DESKTOP : mosaïque compacte 2 colonnes ====== */}
        <div className="hidden md:block">
          <div className="relative rounded-2xl overflow-hidden">
            <div className="grid grid-cols-4 grid-rows-2 gap-1.5 h-[320px]">
              <button
                type="button"
                onClick={() => openAt(0)}
                className="col-span-2 row-span-2 group relative overflow-hidden bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                aria-label="Agrandir la photo principale"
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

              {Array.from({ length: 4 }).map((_, i) => {
                const s = sides[i];
                if (!s) {
                  return (
                    <div key={`empty-${i}`} aria-hidden="true" className="bg-muted/60" />
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

        {/* Bandeau ville/titre desktop sous la galerie */}
        {(title || cityName || department) && (
          <div className="hidden md:block mt-4">
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

      {/* ====== LIGHTBOX ====== */}
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
