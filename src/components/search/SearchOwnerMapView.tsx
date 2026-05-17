import { useEffect, useState, useRef } from "react";
import { MapContainer, TileLayer, Marker, useMap } from "react-leaflet";
import L from "leaflet";
import { Link } from "react-router-dom";
import { Star, MapPin, X } from "lucide-react";
import "leaflet/dist/leaflet.css";

interface SitterPin {
  id: string;
  user_id: string;
  firstName: string;
  city: string | null;
  avatar?: string | null;
  avgRating: number | null;
  dist: number | null;
  coords: { lat: number; lng: number };
}

interface Props {
  sitters: SitterPin[];
  centerCoords: { lat: number; lng: number } | null;
  onContact: (sitterId: string) => void;
  contactingId: string | null;
}

const createPinIcon = (active: boolean, avatar?: string | null) => {
  const scale = active ? 1.15 : 1;
  const inner = avatar
    ? `<img src="${avatar}" alt="" style="width:30px;height:30px;border-radius:50%;object-fit:cover;object-position:top"/>`
    : `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>`;
  return L.divIcon({
    className: "",
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    html: `<div style="width:40px;height:40px;border-radius:50%;background:hsl(var(--primary));border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.25);display:flex;align-items:center;justify-content:center;cursor:pointer;transform:scale(${scale});transition:transform 0.15s;overflow:hidden">${inner}</div>`,
  });
};

const Centerer = ({ bounds, fallback }: { bounds: L.LatLngBoundsExpression | null; fallback: [number, number] }) => {
  const map = useMap();
  useEffect(() => {
    if (bounds) map.fitBounds(bounds, { padding: [40, 40], maxZoom: 13, animate: true });
    else map.setView(fallback, 6, { animate: true });
  }, [bounds, fallback, map]);
  return null;
};

const SearchOwnerMapView = ({ sitters, centerCoords, onContact, contactingId }: Props) => {
  const [activeId, setActiveId] = useState<string | null>(null);
  const popRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (popRef.current && !popRef.current.contains(e.target as Node)) setActiveId(null);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const center: [number, number] = centerCoords ? [centerCoords.lat, centerCoords.lng] : [46.6, 2.5];
  const bounds: L.LatLngBoundsExpression | null =
    sitters.length >= 2
      ? (sitters.map((s) => [s.coords.lat, s.coords.lng]) as L.LatLngBoundsExpression)
      : sitters.length === 1 && centerCoords
        ? ([[sitters[0].coords.lat, sitters[0].coords.lng], [centerCoords.lat, centerCoords.lng]] as L.LatLngBoundsExpression)
        : null;

  const active = sitters.find((s) => s.id === activeId);

  return (
    <div className="w-full h-full relative">
      <MapContainer
        center={center}
        zoom={centerCoords ? 11 : 6}
        className="w-full h-full"
        zoomControl
        attributionControl={false}
      >
        <Centerer bounds={bounds} fallback={center} />
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          subdomains="abcd"
          maxZoom={19}
        />
        {sitters.map((s) => (
          <Marker
            key={s.id}
            position={[s.coords.lat, s.coords.lng]}
            icon={createPinIcon(activeId === s.id, s.avatar)}
            eventHandlers={{ click: () => setActiveId(activeId === s.id ? null : s.id) }}
          />
        ))}
      </MapContainer>

      {active && (
        <div
          ref={popRef}
          className="absolute z-[1000] bg-card rounded-xl shadow-lg overflow-hidden border border-border"
          style={{ width: 240, top: "50%", left: "50%", transform: "translate(-50%, -50%)" }}
        >
          <Link to={`/gardiens/${active.user_id}`} className="block">
            {active.avatar ? (
              <img src={active.avatar} alt={active.firstName} className="w-full h-[120px] object-cover object-top" />
            ) : (
              <div className="w-full h-[120px] bg-primary/10 flex items-center justify-center">
                <span className="text-3xl text-primary font-heading font-bold">{active.firstName.charAt(0)}</span>
              </div>
            )}
          </Link>
          <div className="p-3">
            <p className="text-sm font-semibold truncate">{active.firstName}</p>
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
              <MapPin className="h-3 w-3" aria-hidden="true" />
              {active.city || ""}
              {active.dist != null && ` · ${active.dist} km`}
            </p>
            {active.avgRating != null && (
              <p className="text-xs text-muted-foreground flex items-center gap-0.5 mt-0.5">
                <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" aria-hidden="true" />
                {active.avgRating.toFixed(1)}
              </p>
            )}
            <button
              onClick={() => onContact(active.user_id)}
              disabled={contactingId === active.user_id}
              className="w-full mt-2 bg-primary text-primary-foreground text-xs font-medium rounded-lg py-1.5 hover:opacity-90 transition-opacity disabled:opacity-60"
            >
              {contactingId === active.user_id ? "..." : `Contacter ${active.firstName}`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchOwnerMapView;
