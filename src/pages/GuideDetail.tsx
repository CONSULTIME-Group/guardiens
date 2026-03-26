import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import PageMeta from "@/components/PageMeta";
import { MapPin, TreePine, Stethoscope, Coffee, Store, Footprints, Droplets, Trees, Star, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useEffect } from "react";

// Lazy load Leaflet CSS
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

interface CityGuide {
  id: string;
  city: string;
  slug: string;
  intro: string;
  ideal_for: string;
  department: string;
}

interface GuidePlace {
  id: string;
  city_guide_id: string;
  category: string;
  name: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  google_rating: number | null;
  description: string;
  dogs_welcome: boolean;
  leash_required: boolean | null;
  tips: string | null;
}

const CATEGORY_CONFIG: Record<string, { label: string; icon: any; color: string }> = {
  dog_park: { label: "Parcs & espaces verts", icon: TreePine, color: "hsl(var(--primary))" },
  general_park: { label: "Parcs publics", icon: Trees, color: "hsl(var(--primary))" },
  walk_trail: { label: "Balades & sentiers", icon: Footprints, color: "hsl(27, 35%, 59%)" },
  vet: { label: "Vétérinaires", icon: Stethoscope, color: "hsl(0, 84%, 60%)" },
  dog_friendly_cafe: { label: "Cafés & restos dog-friendly", icon: Coffee, color: "hsl(27, 35%, 59%)" },
  dog_friendly_restaurant: { label: "Restaurants dog-friendly", icon: Coffee, color: "hsl(27, 35%, 59%)" },
  pet_shop: { label: "Animaleries", icon: Store, color: "hsl(270, 50%, 60%)" },
  water_point: { label: "Points d'eau", icon: Droplets, color: "hsl(200, 70%, 50%)" },
};

const createColoredIcon = (color: string) =>
  new L.DivIcon({
    html: `<div style="background:${color};width:12px;height:12px;border-radius:50%;border:2px solid white;box-shadow:0 1px 3px rgba(0,0,0,0.3)"></div>`,
    className: "",
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });

const StarRating = ({ rating }: { rating: number | null }) => {
  if (!rating) return null;
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className="h-3.5 w-3.5"
          fill={i <= Math.round(rating) ? "#C4956A" : "transparent"}
          stroke={i <= Math.round(rating) ? "#C4956A" : "hsl(var(--muted-foreground))"}
        />
      ))}
      <span className="text-xs text-muted-foreground ml-1">{rating.toFixed(1)}</span>
    </div>
  );
};

const GuideDetail = () => {
  const { slug } = useParams<{ slug: string }>();

  const { data: guide, isLoading: guideLoading } = useQuery({
    queryKey: ["city-guide", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("city_guides" as any)
        .select("*")
        .eq("slug", slug)
        .eq("published", true)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as CityGuide | null;
    },
    enabled: !!slug,
  });

  const { data: places = [] } = useQuery({
    queryKey: ["guide-places", guide?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("city_guide_places" as any)
        .select("*")
        .eq("city_guide_id", guide!.id)
        .order("category")
        .order("name");
      if (error) throw error;
      return (data || []) as unknown as GuidePlace[];
    },
    enabled: !!guide?.id,
  });

  const categories = [...new Set(places.map((p) => p.category))];
  const placesWithCoords = places.filter((p) => p.latitude && p.longitude);

  // Get center from places or default to Lyon
  const center: [number, number] = placesWithCoords.length > 0
    ? [
        placesWithCoords.reduce((s, p) => s + p.latitude!, 0) / placesWithCoords.length,
        placesWithCoords.reduce((s, p) => s + p.longitude!, 0) / placesWithCoords.length,
      ]
    : [45.764, 4.8357];

  if (guideLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Chargement...</div>
      </div>
    );
  }

  if (!guide) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">Guide introuvable.</p>
        <Link to="/guides" className="text-primary hover:underline">← Retour aux guides</Link>
      </div>
    );
  }

  return (
    <>
      <PageMeta
        title={`Guide du gardien à ${guide.city}`}
        description={`Où promener un chien à ${guide.city} ? Parcs dog-friendly, vétérinaires, cafés accueillants, sentiers de balade. Le guide pratique pour les gardiens.`}
        path={`/guide/${guide.slug}`}
      />

      <div className="min-h-screen bg-background">
        {/* Breadcrumb */}
        <div className="max-w-5xl mx-auto px-4 pt-6">
          <nav className="flex items-center gap-2 text-sm text-muted-foreground">
            <Link to="/" className="hover:text-foreground">Guardiens</Link>
            <span>/</span>
            <Link to="/guides" className="hover:text-foreground">Guides</Link>
            <span>/</span>
            <span className="text-foreground font-medium">{guide.city}</span>
          </nav>
        </div>

        {/* Header */}
        <header className="max-w-5xl mx-auto px-4 py-8 sm:py-12">
          <h1 className="font-heading text-3xl sm:text-4xl font-bold text-foreground mb-4">
            Guide du gardien à {guide.city}
          </h1>
          <p className="text-muted-foreground text-lg leading-relaxed max-w-3xl mb-3">
            {guide.intro}
          </p>
          <p className="text-sm italic text-secondary font-medium">{guide.ideal_for}</p>
          <div className="mt-4 flex items-center gap-4">
            <Badge variant="secondary">{places.length} lieux référencés</Badge>
            <Link
              to={`/house-sitting/${guide.slug}`}
              className="text-sm text-primary hover:underline flex items-center gap-1"
            >
              Voir les gardes à {guide.city} <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </header>

        {/* Map */}
        {placesWithCoords.length > 0 && (
          <div className="max-w-5xl mx-auto px-4 mb-8">
            <div className="rounded-xl overflow-hidden border border-border h-[300px] sm:h-[400px]">
              <MapContainer center={center} zoom={13} className="h-full w-full" scrollWheelZoom={false}>
                <TileLayer
                  attribution='&copy; <a href="https://osm.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                {placesWithCoords.map((place) => {
                  const config = CATEGORY_CONFIG[place.category];
                  return (
                    <Marker
                      key={place.id}
                      position={[place.latitude!, place.longitude!]}
                      icon={createColoredIcon(config?.color || "hsl(var(--primary))")}
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
            {/* Legend */}
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
        )}

        {/* Places by category */}
        <main className="max-w-5xl mx-auto px-4 pb-16">
          <div className="space-y-10">
            {categories.map((cat) => {
              const config = CATEGORY_CONFIG[cat] || { label: cat, icon: MapPin, color: "gray" };
              const Icon = config.icon;
              const catPlaces = places.filter((p) => p.category === cat);

              return (
                <section key={cat}>
                  <h2 className="font-heading text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
                    <Icon className="h-5 w-5" style={{ color: config.color }} />
                    {config.label}
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {catPlaces.map((place) => (
                      <Card key={place.id} className="border-border">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-1">
                            <h3 className="font-semibold text-foreground text-sm">{place.name}</h3>
                            <StarRating rating={place.google_rating} />
                          </div>
                          <p className="text-xs text-muted-foreground mb-2">{place.address}</p>
                          <p className="text-sm text-foreground/80 mb-2">{place.description}</p>
                          <div className="flex items-center gap-2 mb-2">
                            {place.dogs_welcome && (
                              <Badge variant="outline" className="text-xs">🐕 Chiens bienvenus</Badge>
                            )}
                            {place.leash_required !== null && (
                              <Badge variant="outline" className="text-xs">
                                {place.leash_required ? "En laisse" : "Chiens libres"}
                              </Badge>
                            )}
                          </div>
                          {place.tips && (
                            <div className="bg-accent/50 rounded-md p-2.5 mt-2">
                              <p className="text-xs italic text-muted-foreground">
                                💡 {place.tips}
                              </p>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>

          {/* CTA */}
          <div className="mt-14 text-center border-t border-border pt-10">
            <p className="text-muted-foreground mb-4">
              Vous allez garder à {guide.city} ?
            </p>
            <Link
              to="/register"
              className="inline-flex items-center justify-center rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Voir les gardes disponibles
            </Link>
          </div>
        </main>

        {/* Schema.org */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "BreadcrumbList",
              itemListElement: [
                { "@type": "ListItem", position: 1, name: "Guardiens", item: "https://guardiens.fr" },
                { "@type": "ListItem", position: 2, name: "Guides", item: "https://guardiens.fr/guides" },
                { "@type": "ListItem", position: 3, name: guide.city, item: `https://guardiens.fr/guide/${guide.slug}` },
              ],
            }),
          }}
        />
      </div>
    </>
  );
};

export default GuideDetail;
