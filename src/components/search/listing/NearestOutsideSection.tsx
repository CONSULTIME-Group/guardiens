/**
 * Lot perf 19c (09/11/2026, décision de Jérémie) : sous un rayon qui compte
 * moins de 3 gardes ouvertes, les gardes ouvertes les plus proches hors du
 * rayon, dans une section à part. Le rayon reste le réglage du membre : ce
 * n'est pas un élargissement de zone.
 */
import { useEffect, useRef, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { NEAREST_TIER_LABELS, type NearestTier } from "@/lib/nearestOutsideZone";

const TIER_RANK: Record<NearestTier, number> = { dept: 0, region: 1, france: 2 };

interface NearestOutsideSectionProps {
  items: any[];
  radiusKm: number;
  franceCount: number;
  renderCard: (item: any, idx: number) => ReactNode;
  onSeeFrance: () => void;
  trackEvent: (name: string, payload: any) => void;
}

export function NearestOutsideSection({ items, radiusKm, franceCount, renderCard, onSeeFrance, trackEvent }: NearestOutsideSectionProps) {
  const seenRef = useRef(false);
  const widest = items.reduce<NearestTier>((w, it) => {
    const t = (it.nearestTier as NearestTier) ?? "france";
    return TIER_RANK[t] > TIER_RANK[w] ? t : w;
  }, "dept");

  useEffect(() => {
    if (seenRef.current || items.length === 0) return;
    seenRef.current = true;
    trackEvent("nearest_outside_seen", { source: "search", metadata: { cards: items.length, widest_tier: widest, radius_km: radiusKm } });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.length]);

  if (items.length === 0) return null;
  return (
    <section className="mt-8" aria-labelledby="nearest-outside-title" data-testid="nearest-outside-section">
      <h2 id="nearest-outside-title" className="font-heading text-xl font-semibold text-foreground">
        Les gardes ouvertes les plus proches de vous
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">Votre rayon reste à {radiusKm} km.</p>
      <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-6 sm:gap-y-10">
        {items.map((item, idx) => {
          const tier = (item.nearestTier as NearestTier) ?? "france";
          return (
            <div
              key={item.id}
              className="space-y-2"
              onClickCapture={() => trackEvent("nearest_outside_card_clicked", {
                source: "search",
                metadata: { rank: idx + 1, tier, distance_km: typeof item.distance === "number" ? Math.round(item.distance) : null },
              })}
            >
              <p className="text-xs font-medium text-muted-foreground">{NEAREST_TIER_LABELS[tier]}</p>
              {renderCard(item, idx)}
            </div>
          );
        })}
      </div>
      {franceCount > 0 && (
        <div className="mt-8 flex justify-center">
          <Button variant="outline" className="rounded-full" onClick={onSeeFrance}>
            {franceCount === 1 ? "Voir la garde ouverte en France" : `Voir les ${franceCount} gardes ouvertes en France`}
          </Button>
        </div>
      )}
    </section>
  );
}
