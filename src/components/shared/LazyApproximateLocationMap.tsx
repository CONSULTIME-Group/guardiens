import { Suspense, useEffect, useRef, useState, type ComponentProps } from "react";
import { lazyWithRetry } from "@/lib/lazyWithRetry";

/**
 * Lot perf 6 : la carte de localisation (Leaflet, environ 45 Ko compressés)
 * n'est plus chargée avec la fiche ; elle part quand son emplacement approche
 * de l'écran (300 px avant), avec le même fond d'attente que la carte
 * elle-même, à la même taille.
 */
const ApproximateLocationMap = lazyWithRetry(() => import("./ApproximateLocationMap"), "ApproximateLocationMap");
type Props = ComponentProps<typeof ApproximateLocationMap>;

export function MapWaiting({ className = "", city, postalCode }: { className?: string; city?: string | null; postalCode?: string | null }) {
  return (
    <div className={`relative bg-muted overflow-hidden ${className}`} aria-label="Carte en cours de chargement">
      <div
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage:
            "radial-gradient(circle at 30% 40%, hsl(var(--primary) / 0.15) 0, transparent 40%), radial-gradient(circle at 70% 60%, hsl(var(--primary) / 0.1) 0, transparent 35%)",
        }}
        aria-hidden
      />
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-32 h-32 bg-primary/10 border border-primary/20 rounded-full animate-pulse" />
      </div>
      {city && (
        <div className="absolute bottom-3 left-3 bg-card/95 backdrop-blur px-3 py-1.5 rounded-full text-xs font-semibold shadow-sm border border-border">
          {city}{postalCode ? ` · ${postalCode.slice(0, 2)}` : ""}
        </div>
      )}
    </div>
  );
}

export default function LazyApproximateLocationMap(props: Props) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [near, setNear] = useState(false);
  useEffect(() => {
    if (near) return;
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") { setNear(true); return; }
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) { setNear(true); io.disconnect(); }
    }, { rootMargin: "300px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, [near]);
  const waiting = <MapWaiting className={props.className} city={props.city} postalCode={props.postalCode} />;
  if (!near) return <div ref={ref}>{waiting}</div>;
  return (
    <Suspense fallback={waiting}>
      <ApproximateLocationMap {...props} />
    </Suspense>
  );
}
