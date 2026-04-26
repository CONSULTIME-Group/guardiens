/**
 * Wrapper qui ne charge la carte (Leaflet + tuiles OSM) que quand
 * l'utilisateur s'en approche dans le viewport. Avant ça, on affiche
 * un placeholder léger : pas de JS Leaflet, pas de requêtes tuiles.
 *
 * Bénéfices :
 *  - LCP plus rapide (pas de ~140 kB de JS Leaflet au chargement initial).
 *  - Pas de pénalité SEO (le contenu indexable — liste des lieux —
 *    est déjà dans le HTML rendu en dessous).
 *  - Économie réseau pour les visiteurs qui ne descendent pas jusqu'à la carte.
 */
import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { MapPin } from "lucide-react";

const GuideMap = lazy(() => import("@/components/guides/GuideMap"));

interface Place {
  id: string;
  name: string;
  category: string;
  latitude: number;
  longitude: number;
  tips: string | null;
}

interface Props {
  places: Place[];
  categories: string[];
}

const GuideMapLazy = ({ places, categories }: Props) => {
  const [shouldLoad, setShouldLoad] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (shouldLoad) return;
    const el = ref.current;
    if (!el) return;

    // Fallback : si IntersectionObserver indispo, on charge tout de suite.
    if (typeof IntersectionObserver === "undefined") {
      setShouldLoad(true);
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setShouldLoad(true);
            io.disconnect();
            break;
          }
        }
      },
      { rootMargin: "300px 0px" }, // anticipe ~300px avant l'entrée
    );
    io.observe(el);
    return () => io.disconnect();
  }, [shouldLoad]);

  return (
    <div ref={ref} className="max-w-5xl mx-auto px-4 mb-8">
      {shouldLoad ? (
        <Suspense
          fallback={
            <div className="h-[300px] sm:h-[400px] bg-muted animate-pulse rounded-xl border border-border" />
          }
        >
          <GuideMap places={places} categories={categories} />
        </Suspense>
      ) : (
        <button
          type="button"
          onClick={() => setShouldLoad(true)}
          aria-label={`Afficher la carte des ${places.length} lieux`}
          className="group h-[300px] sm:h-[400px] w-full rounded-xl border border-border bg-muted/40 flex flex-col items-center justify-center gap-3 hover:bg-muted/60 transition-colors"
        >
          <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center group-hover:scale-105 transition-transform">
            <MapPin className="h-6 w-6" />
          </div>
          <p className="text-sm font-medium text-foreground">
            Afficher la carte ({places.length} lieux)
          </p>
          <p className="text-xs text-muted-foreground">
            Cliquez ou faites défiler pour charger la carte interactive
          </p>
        </button>
      )}
    </div>
  );
};

export default GuideMapLazy;
