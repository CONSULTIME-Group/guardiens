import { useState } from "react";
import type { BreedListingEntry } from "@/lib/breedsListingModel";

/** Carte de repli façon carnet aquarelle : papier, lavis vert pin et
 *  terracotta, double filet de planche, initiale Playfair et nom d'espèce.
 *  Elle est rendue EN PERMANENCE sous l'image : pendant le chargement, en
 *  cas d'échec ou d'absence d'image, la carte reste belle. Jamais de trou. */
export const TypographicFallback = ({
  breed,
  speciesLabel,
}: {
  breed: string;
  speciesLabel: string;
}) => (
  <div
    aria-hidden="true"
    data-testid="breed-typographic-fallback"
    className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 border-b border-border/60"
    style={{
      backgroundColor: "hsl(var(--hero-paper))",
      backgroundImage:
        "radial-gradient(ellipse 65% 55% at 26% 20%, hsl(var(--primary) / 0.10), transparent 70%)," +
        "radial-gradient(ellipse 60% 50% at 76% 80%, hsl(var(--secondary) / 0.14), transparent 70%)",
    }}
  >
    <span className="pointer-events-none absolute inset-2 rounded-lg border border-secondary/25" />
    <span className="font-serif text-6xl font-semibold text-secondary/70 select-none leading-none">
      {breed.trim().charAt(0).toUpperCase()}
    </span>
    <span className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
      {speciesLabel}
    </span>
  </div>
);

/** L'image se superpose au repli et n'apparaît qu'une fois chargée (fondu).
 *  Échec de chargement (429, 404, réseau) : l'image disparaît et le repli,
 *  déjà en place, prend le relais sans à-coup. Chargement différé : on ne
 *  réclame au serveur que ce qui approche de l'écran. */
const BreedCardImage = ({
  entry,
  speciesLabel,
}: {
  entry: BreedListingEntry;
  speciesLabel: string;
}) => {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  return (
    <div className="relative aspect-[4/3] overflow-hidden">
      <TypographicFallback breed={entry.breed} speciesLabel={speciesLabel} />
      {entry.image_url && !failed && (
        <img
          src={entry.image_url}
          alt={entry.image_alt || entry.breed}
          loading="lazy"
          decoding="async"
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
          className={`absolute inset-0 w-full h-full object-cover group-hover:scale-[1.03] transition-[opacity,transform] duration-500 ${
            loaded ? "opacity-100" : "opacity-0"
          }`}
        />
      )}
    </div>
  );
};

export default BreedCardImage;
