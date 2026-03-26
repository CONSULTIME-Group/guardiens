import "leaflet/dist/leaflet.css";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";

// Fix default marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

const CATEGORY_CONFIG: Record<string, { label: string; color: string }> = {
  dog_park: { label: "Parcs & espaces verts", color: "#4a7c59" },
  general_park: { label: "Parcs publics", color: "#4a7c59" },
  walk_trail: { label: "Balades & sentiers", color: "#b8860b" },
  vet: { label: "Vétérinaires", color: "#dc3545" },
  dog_friendly_cafe: { label: "Cafés dog-friendly", color: "#b8860b" },
  dog_friendly_restaurant: { label: "Restaurants dog-friendly", color: "#b8860b" },
  pet_shop: { label: "Animaleries", color: "#7b42bc" },
  water_point: { label: "Points d'eau", color: "#2196f3" },
};

const createColoredIcon = (color: string) =>
  new L.DivIcon({
    html: `<div style="background:${color};width:12px;height:12px;border-radius:50%;border:2px solid white;box-shadow:0 1px 3px rgba(0,0,0,0.3)"></div>`,
    className: "",
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });

interface Place {
  id: string;
  name: string;
  category: string;
  latitude: number;
  longitude: number;
  tips: string | null;
}

interface GuideMapProps {
  places: Place[];
  categories: string[];
}

const GuideMap = ({ places, categories }: GuideMapProps) => {
  if (places.length === 0) return null;

  const center: [number, number] = [
    places.reduce((s, p) => s + p.latitude, 0) / places.length,
    places.reduce((s, p) => s + p.longitude, 0) / places.length,
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 mb-8">
      <div className="rounded-xl overflow-hidden border border-border h-[300px] sm:h-[400px]">
        <MapContainer center={center} zoom={13} className="h-full w-full" scrollWheelZoom={false}>
          <TileLayer
            attribution='&copy; <a href="https://osm.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {places.map((place) => {
            const config = CATEGORY_CONFIG[place.category];
            return (
              <Marker
                key={place.id}
                position={[place.latitude, place.longitude]}
                icon={createColoredIcon(config?.color || "#4a7c59")}
              >
                <Popup>
                  <div className="text-sm">
                    <strong>{place.name}</strong>
                    <br />
                    <span className="text-gray-500">{config?.label}</span>
                    {place.tips && (
                      <>
                        <br />
                        <em className="text-xs">{place.tips}</em>
                      </>
                    )}
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </div>
      <div className="flex flex-wrap gap-3 mt-3">
        {categories.map((cat) => {
          const config = CATEGORY_CONFIG[cat];
          if (!config) return null;
          return (
            <div key={cat} className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: config.color }} />
              {config.label}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default GuideMap;
