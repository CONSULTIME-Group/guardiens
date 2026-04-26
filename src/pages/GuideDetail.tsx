import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import PageMeta from "@/components/PageMeta";
import { MapPin, TreePine, Stethoscope, Coffee, Store, Footprints, Droplets, Trees, Star, ArrowRight, ArrowLeft, Search } from "lucide-react";
import PageBreadcrumb from "@/components/seo/PageBreadcrumb";
const guideHeaderImg = "https://erhccyqevdyevpyctsjj.supabase.co/storage/v1/object/public/property-photos/misc/guide-header.webp";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { lazy, Suspense, useState, useMemo, useEffect } from "react";

const GuideMap = lazy(() => import("@/components/guides/GuideMap"));

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
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
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

  useEffect(() => {
    if (!guideLoading) window.prerenderReady = true;
  }, [guideLoading]);

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

  // Fetch nearby guides from same department
  const { data: nearbyGuides = [] } = useQuery({
    queryKey: ["nearby-guides", guide?.department, guide?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("city_guides" as any)
        .select("id, city, slug")
        .eq("department", guide!.department)
        .eq("published", true)
        .neq("id", guide!.id)
        .order("city");
      if (error) throw error;
      return (data || []) as unknown as { id: string; city: string; slug: string }[];
    },
    enabled: !!guide?.id && !!guide?.department,
  });

  // Fetch related articles for this city
  const { data: relatedArticles = [] } = useQuery({
    queryKey: ["guide-articles", guide?.city],
    queryFn: async () => {
      const { data } = await supabase
        .from("articles")
        .select("slug, title, excerpt")
        .eq("published", true)
        .or(`city.ilike.%${guide!.city}%,tags.cs.{${guide!.city.toLowerCase()}}`)
        .limit(3);
      return (data || []) as any[];
    },
    enabled: !!guide?.city,
  });

  const filteredPlaces = useMemo(() => {
    if (!searchQuery.trim()) return places;
    const q = searchQuery.toLowerCase();
    return places.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q) ||
      p.address.toLowerCase().includes(q) ||
      (p.tips && p.tips.toLowerCase().includes(q))
    );
  }, [places, searchQuery]);

  const categories = [...new Set(filteredPlaces.map((p) => p.category))];
  const placesWithCoords = filteredPlaces.filter((p) => p.latitude && p.longitude);

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
        title={`Guide pet sitting ${guide.city} — Parcs, vétos, cafés dog-friendly | Guardiens`}
        description={`Guide pratique pour pet sitters à ${guide.city} : parcs dog-friendly, vétérinaires, cafés accueillants, sentiers de balade. ${guide.ideal_for}`}
        path={`/guides/${guide.slug}`}
      />

      <div className="min-h-screen bg-background">
        <PageBreadcrumb items={[
          { label: "Guides locaux", href: "/guides" },
          { label: guide.city },
        ]} />

        {/* Header */}
        <header className="relative overflow-hidden border-b border-border">
          <div className="absolute inset-0">
            <img src={guideHeaderImg} alt={`Guide pet sitting ${guide.city}`} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-r from-background/90 via-background/70 to-background/40" />
          </div>
          <div className="relative max-w-5xl mx-auto px-4 py-10 sm:py-14">
          <h1 className="font-heading text-3xl sm:text-4xl font-bold text-foreground mb-4">
            Guide du gardien à {guide.city}
          </h1>
          <p className="text-muted-foreground text-lg leading-relaxed max-w-3xl mb-3">
            {guide.intro}
          </p>
          <p className="text-sm italic text-secondary font-medium">{guide.ideal_for}</p>
          </div>
        </header>
        <div className="max-w-5xl mx-auto px-4 pt-6">

          {/* Search bar */}
          <div className="mt-5 relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher un lieu, un parc, un véto..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-4">
            <Badge variant="secondary">{places.length} lieux référencés</Badge>
            <Link
              to={`/house-sitting/${guide.slug}`}
              className="text-sm text-primary hover:underline flex items-center gap-1"
            >
              Voir les gardes à {guide.city} <ArrowRight className="h-3.5 w-3.5" />
            </Link>
            {guide.department && (
              <Link
                to={`/departement/${slugify(guide.department)}`}
                className="text-sm text-primary hover:underline flex items-center gap-1"
              >
                House-sitting dans le {guide.department} <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            )}
            <Link
              to="/petites-missions"
              className="text-sm text-primary hover:underline flex items-center gap-1"
            >
              Petites missions d'entraide <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

        {/* Map */}
        {placesWithCoords.length > 0 && (
          <Suspense fallback={<div className="max-w-5xl mx-auto px-4 mb-8 h-[300px] sm:h-[400px] bg-muted animate-pulse rounded-xl" />}>
            <GuideMap
              places={placesWithCoords.map(p => ({ id: p.id, name: p.name, category: p.category, latitude: p.latitude!, longitude: p.longitude!, tips: p.tips }))}
              categories={categories}
            />
          </Suspense>
        )}

        {/* Places by category */}
        <main className="max-w-5xl mx-auto px-4 pb-16">
          <div className="space-y-10">
            {categories.map((cat) => {
              const config = CATEGORY_CONFIG[cat] || { label: cat, icon: MapPin, color: "gray" };
              const Icon = config.icon;
              const catPlaces = filteredPlaces.filter((p) => p.category === cat);

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

          {/* Nearby guides */}
          {nearbyGuides.length > 0 && (
            <div className="mt-14 border-t border-border pt-10">
              <h2 className="font-heading text-xl font-semibold text-foreground mb-4">
                Guides proches — {guide.department}
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {nearbyGuides.map((ng) => (
                  <Link
                    key={ng.id}
                    to={`/guides/${ng.slug}`}
                    className="flex items-center gap-2 p-3 rounded-lg border border-border hover:bg-accent/50 transition-colors"
                  >
                    <MapPin className="h-4 w-4 text-primary shrink-0" />
                    <span className="text-sm font-medium text-foreground">{ng.city}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Related articles */}
          {relatedArticles.length > 0 && (
            <div className="mt-14 border-t border-border pt-10">
              <h2 className="font-heading text-xl font-semibold text-foreground mb-4">
                Articles sur {guide.city}
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {relatedArticles.map((a: any) => (
                  <Link key={a.slug} to={`/actualites/${a.slug}`} className="group">
                    <Card className="h-full hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <h3 className="font-heading font-semibold text-sm text-foreground group-hover:text-primary transition-colors line-clamp-2 mb-1">
                          {a.title}
                        </h3>
                        <p className="text-xs text-muted-foreground line-clamp-2">{a.excerpt}</p>
                        <span className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary">
                          Lire <ArrowRight className="h-3 w-3" />
                        </span>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* CTA */}
          <div className="mt-14 text-center border-t border-border pt-10">
            <p className="text-muted-foreground mb-4">
              Vous allez garder à {guide.city} ?
            </p>
            <Link
              to="/inscription"
              className="inline-flex items-center justify-center rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Voir les gardes disponibles
            </Link>
          </div>
        </main>

        {/* Schema.org */}
        {/* JSON-LD: Breadcrumb */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "BreadcrumbList",
              itemListElement: [
                { "@type": "ListItem", position: 1, name: "Guardiens", item: "https://guardiens.fr" },
                { "@type": "ListItem", position: 2, name: "Guides", item: "https://guardiens.fr/guides" },
                { "@type": "ListItem", position: 3, name: guide.city, item: `https://guardiens.fr/guides/${guide.slug}` },
              ],
            }),
          }}
        />

        {/* JSON-LD: TouristDestination */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "TouristDestination",
              name: `${guide.city} — Guide pet sitting`,
              description: `Guide pratique pour les gardiens d'animaux à ${guide.city}. ${guide.intro}`,
              url: `https://guardiens.fr/guides/${guide.slug}`,
              touristType: ["Pet sitter", "House sitter", "Gardien d'animaux"],
              containedInPlace: {
                "@type": "AdministrativeArea",
                name: guide.department,
              },
            }),
          }}
        />
      </div>
    </>
  );
};

export default GuideDetail;
