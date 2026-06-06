import { useState, useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, useMap } from "react-leaflet";
import L from "leaflet";
import { Link } from "react-router-dom";
import { MapPin, PawPrint, Cat, Bird, X } from "lucide-react";
import "leaflet/dist/leaflet.css";

const speciesIcon: Record<string, typeof PawPrint> = {
  dog: PawPrint, cat: Cat, horse: PawPrint, bird: Bird, rodent: PawPrint,
  fish: PawPrint, reptile: PawPrint, farm_animal: Bird, nac: PawPrint,
};

type PinKind = "active" | "inactive" | "demo";

const pinColors: Record<PinKind, { bg: string; ring: string }> = {
  active:   { bg: "hsl(153, 42%, 30%)", ring: "white" },           // vert (annonce active)
  inactive: { bg: "hsl(0, 0%, 55%)",    ring: "white" },           // gris (terminée / attribuée)
  demo:     { bg: "hsl(43, 96%, 56%)",  ring: "hsl(43, 80%, 30%)" }, // ambre (annonce d'exemple)
};

const createPinIcon = (kind: PinKind, isActive: boolean) => {
  const { bg, ring } = pinColors[kind];
  const scale = isActive ? 1.15 : 1;
  const dashed = kind === "demo" ? "border-style:dashed;" : "";
  return L.divIcon({
    className: "",
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    html: `<div style="width:36px;height:36px;border-radius:50%;background:${bg};border:3px solid ${ring};${dashed}box-shadow:0 2px 8px rgba(0,0,0,0.25);display:flex;align-items:center;justify-content:center;cursor:pointer;transform:scale(${scale});transition:transform 0.15s;">
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
    </div>`,
  });
};

const getPinKind = (item: any): PinKind => {
  if (item?.is_demo) return "demo";
  if (item?.isAssigned || item?.isCompleted || item?.isPast) return "inactive";
  return "active";
};

interface MapCenterProps {
  center: [number, number];
  zoom: number;
  bounds: L.LatLngBoundsExpression | null;
}

const MapCenterController = ({ center, zoom, bounds }: MapCenterProps) => {
  const map = useMap();
  useEffect(() => {
    if (bounds) {
      // Recadrage automatique sur la zone couverte par les résultats
      // (s'adapte au rayon, département, région, France entière…)
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 13, animate: true });
    } else {
      map.setView(center, zoom, { animate: true });
    }
  }, [center, zoom, bounds, map]);
  return null;
};

interface SearchMapViewProps {
  results: any[];
  resultCoords: Map<string, { lat: number; lng: number }>;
  userCoords: { lat: number; lng: number } | null;
  hasAccess: boolean;
  formatDate: (d: string | null) => string;
  tab: string;
  sitterEligible: boolean;
  renderCard: (item: any) => React.ReactNode;
}

const SearchMapView = ({
  results,
  resultCoords,
  userCoords,
  hasAccess,
  formatDate,
  tab,
  sitterEligible,
  renderCard,
}: SearchMapViewProps) => {
  const [activePin, setActivePin] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setActivePin(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const getCoords = (item: any): { lat: number; lng: number } | null => {
    if (resultCoords.has(item.id)) return resultCoords.get(item.id)!;
    if (item.latitude && item.longitude) {
      return { lat: item.latitude, lng: item.longitude };
    }
    return null;
  };

  const center: [number, number] = userCoords
    ? [userCoords.lat, userCoords.lng]
    : [46.6, 2.5];

  const visibleResults = results.filter(
    (item) => showAll || (!item?.is_demo && !item?.isAssigned && !item?.isCompleted && !item?.isPast)
  );
  const visibleCoords = visibleResults
    .map((item) => getCoords(item))
    .filter((c): c is { lat: number; lng: number } => !!c);

  let bounds: L.LatLngBoundsExpression | null = null;
  if (visibleCoords.length >= 2) {
    bounds = visibleCoords.map((c) => [c.lat, c.lng]) as L.LatLngBoundsExpression;
  } else if (visibleCoords.length === 1 && userCoords) {
    bounds = [
      [visibleCoords[0].lat, visibleCoords[0].lng],
      [userCoords.lat, userCoords.lng],
    ] as L.LatLngBoundsExpression;
  }

  const activeItem = results.find((r) => r.id === activePin);

  return (
    <div className="flex flex-col md:flex-row h-[calc(100dvh-180px)] md:h-[calc(100dvh-200px)]">
      <div className="hidden md:block md:w-1/2 overflow-y-auto p-4 space-y-3 border-r border-border">
        {results.map(renderCard)}
      </div>

      <div className="w-full md:w-1/2 relative flex-1 min-h-0">
        <MapContainer
          center={center}
          zoom={userCoords ? 11 : 6}
          className="w-full h-full"
          zoomControl={true}
          attributionControl={false}
        >
          <MapCenterController center={center} zoom={userCoords ? 11 : 6} bounds={bounds} />
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
            subdomains="abcd"
            maxZoom={19}
          />
          {results
            .filter((item) => showAll || (!item?.is_demo && !item?.isAssigned && !item?.isCompleted && !item?.isPast))
            .map((item) => {
              const coords = getCoords(item);
              if (!coords) return null;
              return (
                <Marker
                  key={item.id}
                  position={[coords.lat, coords.lng]}
                  icon={createPinIcon(getPinKind(item), activePin === item.id)}
                  eventHandlers={{
                    click: () => setActivePin(activePin === item.id ? null : item.id),
                  }}
                />
              );
            })}
        </MapContainer>

        {/* Sélecteur : toutes les annonces vs annonces actives uniquement */}
        <div className="absolute top-3 left-3 right-3 md:right-auto z-[400] bg-card border-2 border-border rounded-xl shadow-lg p-1 flex text-sm md:text-xs max-w-[calc(100vw-1.5rem)] md:max-w-none">
          <button
            type="button"
            onClick={() => setShowAll(false)}
            aria-pressed={!showAll}
            className={`flex-1 md:flex-none min-h-11 md:min-h-0 px-3 py-2 md:py-1.5 rounded-lg font-semibold transition-colors ${
              !showAll ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-muted"
            }`}
          >
            Annonces actives
          </button>
          <button
            type="button"
            onClick={() => setShowAll(true)}
            aria-pressed={showAll}
            className={`flex-1 md:flex-none min-h-11 md:min-h-0 px-3 py-2 md:py-1.5 rounded-lg font-semibold transition-colors ${
              showAll ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-muted"
            }`}
          >
            Toutes les annonces
          </button>
        </div>

        {/* Légende */}
        <div className="absolute bottom-20 md:bottom-3 left-3 z-[400] bg-card border border-border rounded-lg shadow-md px-3 py-2 text-sm md:text-xs font-medium text-foreground pointer-events-none space-y-1">
          <div className="flex items-center gap-2">
            <span className="inline-block w-3 h-3 rounded-full" style={{ background: pinColors.active.bg, border: `2px solid ${pinColors.active.ring}` }} />
            Annonce active
          </div>
          {showAll && (
            <>
              <div className="flex items-center gap-2">
                <span className="inline-block w-3 h-3 rounded-full" style={{ background: pinColors.inactive.bg, border: `2px solid ${pinColors.inactive.ring}` }} />
                Attribuée / terminée
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-block w-3 h-3 rounded-full border-dashed" style={{ background: pinColors.demo.bg, border: `2px dashed ${pinColors.demo.ring}` }} />
                Annonce d'exemple
              </div>
            </>
          )}
        </div>

        {activeItem && (() => {
          const coords = getCoords(activeItem);
          if (!coords) return null;
          const photos: string[] = activeItem.property?.photos || [];
          const coverPhoto = (activeItem as any).cover_photo_url || activeItem.property?.cover_photo_url || photos[0] || (activeItem as any).ownerGalleryFirstPhoto || null;
          const petGroups: Record<string, string[]> = {};
          (activeItem.pets || []).forEach((p: any) => {
            if (!petGroups[p.species]) petGroups[p.species] = [];
            petGroups[p.species].push(p.name);
          });
          const isDemo = !!activeItem.is_demo;
          const linkTo = isDemo
            ? null
            : `/sits/${activeItem.id}`;

          return (
            <div
              ref={popoverRef}
              role="dialog"
              aria-label="Aperçu de l'annonce"
              className={`absolute z-[1000] bg-card rounded-xl shadow-lg overflow-hidden w-[min(280px,calc(100vw-1.5rem))] left-3 right-3 mx-auto md:left-1/2 md:right-auto md:mx-0 bottom-24 md:bottom-auto md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 ${isDemo ? "border-2 border-dashed border-amber-400" : "border border-border"}`}
            >
              <button
                type="button"
                onClick={() => setActivePin(null)}
                aria-label="Fermer l'aperçu"
                className="absolute top-2 right-2 z-10 w-8 h-8 rounded-full bg-background/90 backdrop-blur-sm border border-border flex items-center justify-center text-foreground hover:bg-muted shadow-sm"
              >
                <X className="h-4 w-4" />
              </button>
              {isDemo && (
                <div className="bg-amber-400 text-amber-950 text-[11px] font-semibold uppercase tracking-wide px-3 py-1 text-center">
                  Annonce d'exemple
                </div>
              )}
              {coverPhoto && (
                <img src={coverPhoto} alt="Aperçu de l'annonce" loading="lazy" className={`w-full h-[120px] object-cover ${isDemo ? "saturate-[0.85]" : ""}`} />
              )}
              <div className="p-3">
                <h4 className="text-sm font-semibold text-foreground line-clamp-2 mb-1">
                  {activeItem.title || "Sans titre"}
                </h4>
                <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {activeItem.owner?.city || ""}
                  {activeItem.distance != null && ` · ${Math.round(activeItem.distance)} km`}
                </p>
                {Object.keys(petGroups).length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 mb-2">
                    {Object.entries(petGroups).map(([species, names]) => {
                      const IconComp = speciesIcon[species] || PawPrint;
                      return (
                        <span key={species} className="flex items-center gap-0.5 text-amber-700 text-xs">
                          <IconComp className="h-3 w-3" /> ×{names.length}
                        </span>
                      );
                    })}
                  </div>
                )}
                {isDemo ? (
                  <p className="text-[11px] text-amber-700 italic text-center py-1">
                    Exemple fictif, non disponible
                  </p>
                ) : linkTo && hasAccess ? (
                  <Link
                    to={linkTo}
                    className="block w-full py-2 text-xs text-center bg-primary text-primary-foreground rounded-lg font-medium"
                  >
                    Voir l'annonce →
                  </Link>
                ) : (
                  <Link
                    to="/mon-abonnement"
                    className="block w-full py-2 text-xs text-center bg-primary text-primary-foreground rounded-lg font-medium"
                  >
                    S'abonner pour postuler
                  </Link>
                )}
              </div>
              <div className="hidden md:block absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-card border-b border-r border-border rotate-45" />
            </div>
          );
        })()}
      </div>
    </div>
  );
};

export default SearchMapView;
