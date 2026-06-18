import "leaflet/dist/leaflet.css";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import { supabase } from "@/integrations/supabase/client";
import { getCategoryByValue } from "@/lib/proCategories";
import { Skeleton } from "@/components/ui/skeleton";

// Fix icônes par défaut
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

const CATEGORY_COLORS: Record<string, string> = {
  veterinaire: "#dc3545",
  educateur_canin: "#b8860b",
  comportementaliste: "#7b42bc",
  toiletteur: "#2196f3",
  pet_sitter_pro: "#4a7c59",
  pension_animaliere: "#0ea5e9",
  garderie_chiens: "#22c55e",
  refuge: "#f97316",
};

const colorFor = (cat: string) => CATEGORY_COLORS[cat] ?? "#3b82f6";

const iconFor = (cat: string, urgences: boolean) =>
  new L.DivIcon({
    html: `<div style="background:${colorFor(cat)};width:${urgences ? 18 : 14}px;height:${urgences ? 18 : 14}px;border-radius:50%;border:2px solid white;box-shadow:0 2px 4px rgba(0,0,0,0.3);${urgences ? "outline:2px solid #dc3545;outline-offset:1px;" : ""}"></div>`,
    className: "",
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });

type Point = {
  id: string;
  slug: string;
  raison_sociale: string;
  category: string;
  city: string | null;
  urgences_24_7: boolean;
  lat: number;
  lng: number;
  rating_avg: number | null;
  rating_count: number | null;
};

export default function ProsMap({ categoryFilter }: { categoryFilter?: string }) {
  const [points, setPoints] = useState<Point[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase.rpc("get_pro_map_points" as any);
      setPoints(((data as any) ?? []) as Point[]);
      setLoading(false);
    })();
  }, []);

  const filtered = categoryFilter && categoryFilter !== "all"
    ? points.filter((p) => p.category === categoryFilter)
    : points;

  if (loading) {
    return <Skeleton className="h-[400px] w-full rounded-xl" />;
  }

  if (filtered.length === 0) {
    return (
      <div className="h-[300px] flex items-center justify-center text-sm text-muted-foreground border border-border rounded-xl bg-muted/30">
        Aucun pro géolocalisé sur la carte pour ce filtre.
      </div>
    );
  }

  const center: [number, number] = [
    filtered.reduce((s, p) => s + p.lat, 0) / filtered.length,
    filtered.reduce((s, p) => s + p.lng, 0) / filtered.length,
  ];
  const bounds = L.latLngBounds(filtered.map((p) => [p.lat, p.lng] as [number, number]));

  return (
    <div className="rounded-xl overflow-hidden border border-border h-[400px] md:h-[500px]">
      <MapContainer
        center={center}
        bounds={filtered.length > 1 ? bounds : undefined}
        zoom={filtered.length === 1 ? 12 : undefined}
        scrollWheelZoom={false}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {filtered.map((p) => {
          const cat = getCategoryByValue(p.category);
          return (
            <Marker key={p.id} position={[p.lat, p.lng]} icon={iconFor(p.category, p.urgences_24_7)}>
              <Popup>
                <div className="space-y-1 min-w-[180px]">
                  <Link to={`/pros/${p.slug}`} className="font-semibold underline">
                    {p.raison_sociale}
                  </Link>
                  <div className="text-xs text-muted-foreground">
                    {cat?.label}
                    {p.city ? ` · ${p.city}` : ""}
                  </div>
                  {p.rating_count && p.rating_count > 0 && (
                    <div className="text-xs">
                      <span className="text-amber-500">★</span> {Number(p.rating_avg ?? 0).toFixed(1)} ({p.rating_count})
                    </div>
                  )}
                  {p.urgences_24_7 && (
                    <div className="text-xs font-medium text-red-600">Urgences 24/7</div>
                  )}
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
