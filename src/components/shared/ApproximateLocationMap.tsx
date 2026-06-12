// Carte "localisation approximative" : Leaflet + OSM tiles.
// Aucune clé API. Géocode FR via geo.api.gouv.fr, fallback Nominatim.
// Affiche un cercle flou (rayon ~1.5 km) au lieu du point exact pour préserver
// la vie privée tant que la mise en relation n'a pas eu lieu.
import { useEffect, useState } from "react";
import "leaflet/dist/leaflet.css";
import { MapContainer, TileLayer, Circle } from "react-leaflet";
import L from "leaflet";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  city?: string | null;
  postalCode?: string | null;
  /** Code pays ISO (ex. "FR", "MA"). Détermine le géocodeur utilisé. */
  country?: string | null;
  /** Coordonnées exactes si dispo (prioritaires sur le géocodage). */
  lat?: number | null;
  lng?: number | null;
  /** Rayon du cercle d'approximation, en mètres. Default 1500. */
  radius?: number;
  className?: string;
}

type LatLng = { lat: number; lng: number };

const cache = new Map<string, LatLng | null>();

async function geocode(city: string, postalCode?: string | null, country?: string | null): Promise<LatLng | null> {
  const isFR = !country || country === "FR" || /france/i.test(country);
  const key = `${city}|${postalCode || ""}|${country || "FR"}`.toLowerCase();
  if (cache.has(key)) return cache.get(key) ?? null;

  // 1) FR, geo.api.gouv.fr (rapide, sans rate-limit)
  if (postalCode && /^\d{5}$/.test(postalCode)) {
    try {
      const res = await fetch(
        `https://geo.api.gouv.fr/communes?codePostal=${postalCode}&fields=centre&format=json&geometry=centre&limit=1`,
      );
      if (res.ok) {
        const arr: { centre?: { coordinates?: [number, number] } }[] = await res.json();
        const coords = arr?.[0]?.centre?.coordinates;
        if (coords && coords.length === 2) {
          const out = { lat: coords[1], lng: coords[0] };
          cache.set(key, out);
          return out;
        }
      }
    } catch { /* silencieux */ }
  }

  // 2) Fallback, edge function geocode (proxy serveur, fiable même en iframe)
  try {
    const { data } = await supabase.functions.invoke("geocode", { body: { city } });
    if (data && typeof (data as any).lat === "number" && typeof (data as any).lng === "number") {
      const out = { lat: (data as any).lat, lng: (data as any).lng };
      cache.set(key, out);
      return out;
    }
  } catch { /* silencieux */ }

  // 3) Dernier recours, Nominatim public (peut être bloqué en iframe)
  try {
    const q = encodeURIComponent(`${city}${postalCode ? `, ${postalCode}` : ""}, France`);
    const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1`, {
      headers: { Accept: "application/json" },
    });
    if (res.ok) {
      const arr: { lat?: string; lon?: string }[] = await res.json();
      const r = arr?.[0];
      if (r?.lat && r?.lon) {
        const out = { lat: parseFloat(r.lat), lng: parseFloat(r.lon) };
        cache.set(key, out);
        return out;
      }
    }
  } catch { /* silencieux */ }

  cache.set(key, null);
  return null;
}

const ApproximateLocationMap = ({
  city,
  postalCode,
  lat,
  lng,
  radius = 1500,
  className = "",
}: Props) => {
  const hasExact = typeof lat === "number" && typeof lng === "number";
  const [coords, setCoords] = useState<LatLng | null>(
    hasExact ? { lat: lat as number, lng: lng as number } : null,
  );
  const [loading, setLoading] = useState(!hasExact);

  useEffect(() => {
    if (hasExact) {
      setCoords({ lat: lat as number, lng: lng as number });
      setLoading(false);
      return;
    }
    let cancelled = false;
    if (!city) {
      setLoading(false);
      return;
    }
    setLoading(true);
    geocode(city, postalCode).then((c) => {
      if (cancelled) return;
      setCoords(c);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [city, postalCode, lat, lng, hasExact]);

  if (loading || !coords) {
    return (
      <div
        className={`relative bg-muted overflow-hidden ${className}`}
        aria-label="Carte en cours de chargement"
      >
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

  const primary = getComputedStyle(document.documentElement)
    .getPropertyValue("--primary")
    .trim() || "220 90% 50%";

  return (
    <div className={`relative overflow-hidden ${className}`}>
      <MapContainer
        center={[coords.lat, coords.lng]}
        zoom={12}
        scrollWheelZoom={false}
        zoomControl={true}
        dragging={true}
        doubleClickZoom={true}
        attributionControl={false}
        className="h-full w-full"
        style={{ background: "hsl(var(--muted))" }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution=""
        />
        <Circle
          center={[coords.lat, coords.lng]}
          radius={radius}
          pathOptions={{
            color: `hsl(${primary})`,
            fillColor: `hsl(${primary})`,
            fillOpacity: 0.15,
            weight: 2,
            opacity: 0.5,
          }}
        />
      </MapContainer>
      {city && (
        <div className="absolute bottom-3 left-3 z-[400] bg-card/95 backdrop-blur px-3 py-1.5 rounded-full text-xs font-semibold shadow-sm border border-border pointer-events-none">
          {city}{postalCode ? ` · ${postalCode.slice(0, 2)}` : ""}
        </div>
      )}
      <div className="absolute bottom-1 right-1 z-[400] text-[9px] text-muted-foreground/70 pointer-events-none bg-card/70 px-1 rounded">
        © OpenStreetMap
      </div>
    </div>
  );
};

export default ApproximateLocationMap;
