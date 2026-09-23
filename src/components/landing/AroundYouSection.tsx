import { Suspense, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

/**
 * Bloc home « Autour de vous », sous la ligne de flottaison.
 * Compteur direct des membres disponibles géolocalisés, carte statique de
 * France en SVG avec points approximatifs, monté après idle pour ne jamais
 * toucher au LCP. Aucune bibliothèque de carte.
 */

/** Point géolocalisé minimal, tel que la vue publique le renvoie. */
interface HelperPoint {
  id: string;
  latitude_approx: number | null;
  longitude_approx: number | null;
}

/** Silhouette approximative de la France métropolitaine, (longitude, latitude). */
const FRANCE_OUTLINE: Array<[number, number]> = [
  [2.4, 51.05], [1.85, 50.95], [1.2, 49.9], [0.1, 49.35], [-0.5, 49.3],
  [-1.3, 49.4], [-1.9, 49.65], [-1.6, 48.6], [-2.5, 48.55], [-3.5, 48.7],
  [-4.7, 48.4], [-4.3, 47.8], [-3.0, 47.6], [-2.7, 47.5], [-2.2, 47.25],
  [-1.2, 46.2], [-1.1, 45.6], [-1.05, 44.6], [-1.2, 43.7], [0.5, 42.9],
  [1.8, 42.5], [3.05, 42.45], [3.9, 43.5], [4.85, 43.35], [5.35, 43.3],
  [6.0, 43.1], [7.27, 43.7], [6.9, 44.6], [6.8, 45.4], [6.9, 45.9],
  [6.1, 46.15], [6.8, 46.5], [6.9, 47.0], [7.5, 47.55], [8.2, 48.97],
  [7.6, 48.8], [6.4, 49.2], [6.18, 49.5], [5.45, 49.55], [4.85, 49.8],
  [4.2, 49.97], [3.6, 50.5], [3.15, 50.75],
];

const VIEW_W = 360;
const VIEW_H = 360;
const LON_MIN = -5.2;
const LON_MAX = 8.4;
const LAT_MIN = 41.0;
const LAT_MAX = 51.4;
const COS_LAT = Math.cos((46 * Math.PI) / 180);

const project = ([lon, lat]: [number, number]): [number, number] => {
  // Échelle commune : le degré de latitude et le degré de longitude corrigé
  // par la cosinus partagent le même pixel par degré.
  const k = 32;
  const px = (lon - LON_MIN) * COS_LAT * k;
  const py = (LAT_MAX - lat) * k;
  const contentW = (LON_MAX - LON_MIN) * COS_LAT * k;
  return [px + (VIEW_W - contentW) / 2, py + 10];
};

const outlinePath = FRANCE_OUTLINE.map((point, index) => {
  const [x, y] = project(point);
  return `${index === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
}).join(" ") + " Z";

/** Projection client d'un point helper, arrondie pour un SVG léger. */
export const projectHelperPoint = (lat: number, lng: number): [number, number] => {
  const [x, y] = project([lng, lat]);
  return [Math.round(x * 10) / 10, Math.round(y * 10) / 10];
};

const isInside = (lat: number, lng: number) =>
  lat >= LAT_MIN && lat <= LAT_MAX && lng >= LON_MIN && lng <= LON_MAX;

/** Chargement des points après idle : rien de ce bloc ne retarde la home. */
const useIdleHelpers = () => {
  const [helpers, setHelpers] = useState<HelperPoint[] | null>(null);
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const { data } = await supabase
        .from("public_helpers")
        .select("id, latitude_approx, longitude_approx");
      if (!cancelled) setHelpers((data || []) as HelperPoint[]);
    };
    const ric = (window as any).requestIdleCallback;
    const timer = ric
      ? ric(() => { void load(); }, { timeout: 2500 })
      : window.setTimeout(() => { void load(); }, 1200);
    return () => {
      cancelled = true;
      const cic = (window as any).cancelIdleCallback;
      if (ric && cic) cic(timer); else window.clearTimeout(timer);
    };
  }, []);
  return helpers;
};

const AroundYouSection = () => {
  const helpers = useIdleHelpers();

  const { count, dots } = useMemo(() => {
    const located = (helpers || []).filter(
      (h) => h.latitude_approx !== null && h.longitude_approx !== null && isInside(h.latitude_approx, h.longitude_approx),
    );
    const dots = located.slice(0, 800).map((h) => projectHelperPoint(h.latitude_approx!, h.longitude_approx!));
    return { count: helpers === null ? null : located.length, dots };
  }, [helpers]);

  return (
    <section id="autour-de-vous" className="border-t border-border bg-muted/30 py-14 scroll-mt-24 sm:py-20" aria-labelledby="around-you-title">
      <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:px-8">
        <div>
          <p className="text-sm font-semibold text-primary">Entraide</p>
          <h2 id="around-you-title" className="mt-2 font-heading text-2xl font-bold leading-tight text-foreground sm:text-3xl">
            {count === null
              ? "Des personnes prêtes à donner un coup de main près de chez vous"
              : `${count} personnes prêtes à donner un coup de main près de chez vous`}
          </h2>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-muted-foreground">
            Arroser un jardin, nourrir un chat, changer une ampoule : demandez, les voisins répondent.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Button asChild>
              <Link to="/petites-missions/creer">Demander un coup de main</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/petites-missions">Voir les besoins</Link>
            </Button>
          </div>
        </div>
        <div className="mx-auto w-full max-w-sm">
          <svg
            viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
            role="img"
            aria-label="Carte de France avec les personnes disponibles pour un coup de main"
            className="h-auto w-full"
          >
            <path d={outlinePath} fill="hsl(var(--muted))" stroke="hsl(var(--border))" strokeWidth="1.5" />
            {dots.map(([x, y], index) => (
              <circle key={index} cx={x} cy={y} r="2.2" fill="hsl(var(--primary))" fillOpacity="0.55" />
            ))}
          </svg>
          {count !== null && (
            <p className="mt-2 text-center text-xs text-muted-foreground">
              Chaque point est une personne disponible, position approximative.
            </p>
          )}
        </div>
      </div>
    </section>
  );
};

/** Import différé : la section n'entre dans le bundle principal que si besoin. */
export const LazyAroundYouSection = () => (
  <Suspense fallback={<div className="border-t border-border bg-muted/20 py-14" aria-hidden="true" />}>
    <AroundYouSection />
  </Suspense>
);

export default AroundYouSection;
