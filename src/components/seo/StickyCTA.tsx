import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import type { CityData } from "@/data/cities";
import type { CityStats } from "@/hooks/useCityStats";

interface Props {
  city: CityData;
  stats: CityStats;
}

const StickyCTA = ({ city, stats }: Props) => {
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { threshold: 0 }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  if (stats.loading || dismissed) return <div ref={sentinelRef} />;
  if (stats.guardiansCount === 0 && stats.activeListings === 0)
    return <div ref={sentinelRef} />;

  const isBeforeLaunch = new Date() < new Date("2026-05-13");

  let message: string;
  let ctaText: string;
  let ctaLink: string;

  if (isBeforeLaunch && stats.guardiansCount > 0) {
    message = `${stats.guardiansCount} gardien${stats.guardiansCount > 1 ? "s" : ""} déjà inscrit${stats.guardiansCount > 1 ? "s" : ""} à ${city.name}. Rejoignez les membres fondateurs avant le 13 mai.`;
    ctaText = "Créer mon compte";
    ctaLink = "/inscription";
  } else if (isBeforeLaunch) {
    message = `Soyez parmi les premiers gardiens à ${city.name}.`;
    ctaText = "Rejoindre Guardiens";
    ctaLink = "/inscription";
  } else if (stats.activeListings > 0) {
    message = `${stats.activeListings} annonce${stats.activeListings > 1 ? "s" : ""} active${stats.activeListings > 1 ? "s" : ""} à ${city.name} cette semaine.`;
    ctaText = "Voir les annonces";
    ctaLink = `/sits?ville=${city.slug}`;
  } else {
    message = `Trouvez un gardien de confiance à ${city.name}.`;
    ctaText = "Voir les gardiens";
    ctaLink = `/search?ville=${city.slug}`;
  }

  return (
    <>
      {/* Sentinel placed ~50% down the page */}
      <div ref={sentinelRef} className="absolute top-1/2" aria-hidden="true" />

      {visible && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t-2 border-primary shadow-md px-4 py-4">
          <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
            <p className="text-sm text-foreground flex-1">{message}</p>
            <Link to={ctaLink}>
              <Button size="sm">{ctaText}</Button>
            </Link>
            <button
              onClick={() => setDismissed(true)}
              className="text-muted-foreground hover:text-foreground"
              aria-label="Fermer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default StickyCTA;
