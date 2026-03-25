import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, SlidersHorizontal, MapPin, Calendar, Star, CheckCircle2, Lock } from "lucide-react";
import ChipSelect from "@/components/profile/ChipSelect";
import { format, differenceInDays } from "date-fns";
import { fr } from "date-fns/locale";
import { geocodeCity, haversineDistance } from "@/lib/geocode";

const animalChips = ["Chiens", "Chats", "Chevaux", "Oiseaux", "Animaux de ferme", "NAC", "Tous"];
const animalChipToSpecies: Record<string, string> = {
  Chiens: "dog", Chats: "cat", Chevaux: "horse", Oiseaux: "bird",
  "Animaux de ferme": "farm_animal", NAC: "nac",
};
const speciesEmoji: Record<string, string> = {
  dog: "🐕", cat: "🐈", horse: "🐴", bird: "🐦", rodent: "🐹",
  fish: "🐠", reptile: "🦎", farm_animal: "🐄", nac: "🐾",
};
const envLabels: Record<string, string> = {
  city_center: "Centre-ville", suburban: "Périurbain", countryside: "Campagne",
  mountain: "Montagne", seaside: "Bord de mer", forest: "Forêt",
};
const typeLabels: Record<string, string> = {
  apartment: "Appartement", house: "Maison", farm: "Ferme", chalet: "Chalet", other: "Autre",
};

type SortOption = "recent" | "rating";
type SearchTab = "sits" | "long_stays";

const SearchSitter = () => {
  const { user } = useAuth();
  const [tab, setTab] = useState<SearchTab>("sits");
  const [city, setCity] = useState("");
  const [radius, setRadius] = useState([50]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [animalTypes, setAnimalTypes] = useState<string[]>([]);
  const [housingType, setHousingType] = useState("all");
  const [environment, setEnvironment] = useState("all");
  const [duration, setDuration] = useState("all");
  const [sort, setSort] = useState<SortOption>("recent");

  const [results, setResults] = useState<any[]>([]);
  const [longStayResults, setLongStayResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [sitterProfile, setSitterProfile] = useState<any>(null);
  const [userCity, setUserCity] = useState("");
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [sitterEligible, setSitterEligible] = useState(false);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const [profileRes, spRes, eligRes, reviewsRes, myProfileRes] = await Promise.all([
        supabase.from("profiles").select("city").eq("id", user.id).single(),
        supabase.from("sitter_profiles").select("*").eq("user_id", user.id).maybeSingle(),
        supabase.from("applications").select("id, sit:sits!inner(status)").eq("sitter_id", user.id).eq("status", "accepted"),
        supabase.from("reviews").select("overall_rating").eq("reviewee_id", user.id).eq("published", true),
        supabase.from("profiles").select("identity_verified").eq("id", user.id).single(),
      ]);
      setUserCity(profileRes.data?.city || "");
      setSitterProfile(spRes.data);

      const completedSits = (eligRes.data || []).filter((a: any) => a.sit?.status === "completed").length;
      const reviews = reviewsRes.data || [];
      const avgRating = reviews.length > 0 ? reviews.reduce((s: number, r: any) => s + r.overall_rating, 0) / reviews.length : 0;
      const verified = myProfileRes.data?.identity_verified || false;
      setSitterEligible(completedSits >= 3 && avgRating >= 4.7 && verified);
    };
    load();
  }, [user]);

  const handleSearch = async () => {
    setLoading(true);
    setSearched(true);

    if (tab === "sits") {
      await searchSits();
    } else {
      await searchLongStays();
    }

    setLoading(false);
    setMobileFiltersOpen(false);
  };

  const searchSits = async () => {
    let query = supabase
      .from("sits")
      .select("*, owner:profiles!sits_user_id_fkey(first_name, avatar_url, city), property:properties!sits_property_id_fkey(type, environment, photos, equipments)")
      .eq("status", "published")
      .order("created_at", { ascending: false });

    if (startDate) query = query.gte("end_date", startDate);
    if (endDate) query = query.lte("start_date", endDate);

    const { data } = await query;
    let items = data || [];

    if (housingType !== "all") items = items.filter((s: any) => s.property?.type === housingType);
    if (environment !== "all") items = items.filter((s: any) => s.property?.environment === environment);

    if (city) {
      const searchCoords = await geocodeCity(city);
      if (searchCoords) {
        const uniqueCities = [...new Set(items.map((s: any) => s.owner?.city).filter(Boolean))] as string[];
        const cityCoords = new Map<string, { lat: number; lng: number }>();
        await Promise.all(uniqueCities.map(async (c) => {
          const coords = await geocodeCity(c);
          if (coords) cityCoords.set(c, { lat: coords.lat, lng: coords.lng });
        }));
        items = items.filter((s: any) => {
          const ownerCity = s.owner?.city;
          if (!ownerCity) return false;
          const coords = cityCoords.get(ownerCity);
          if (!coords) return false;
          return haversineDistance(searchCoords.lat, searchCoords.lng, coords.lat, coords.lng) <= radius[0];
        });
      } else {
        items = items.filter((s: any) => s.owner?.city?.toLowerCase().includes(city.toLowerCase()));
      }
    }

    if (duration !== "all") {
      items = items.filter((s: any) => {
        if (!s.start_date || !s.end_date) return true;
        const days = Math.ceil((new Date(s.end_date).getTime() - new Date(s.start_date).getTime()) / (1000 * 60 * 60 * 24));
        switch (duration) {
          case "weekend": return days <= 3;
          case "1week": return days >= 4 && days <= 9;
          case "2weeks": return days >= 10 && days <= 29;
          case "1month": return days >= 30;
          default: return true;
        }
      });
    }

    const enriched = await Promise.all(
      items.map(async (sit: any) => {
        const { data: pets } = await supabase.from("pets").select("species, name").eq("property_id", sit.property_id);
        const { data: reviews } = await supabase.from("reviews").select("overall_rating").eq("reviewee_id", sit.user_id).eq("published", true);
        const avgRating = reviews && reviews.length > 0
          ? (reviews.reduce((s: number, r: any) => s + r.overall_rating, 0) / reviews.length).toFixed(1)
          : null;

        const petSpecies = (pets || []).map((p: any) => p.species);
        if (animalTypes.length > 0 && !animalTypes.includes("Tous")) {
          const wantedSpecies = animalTypes.map(a => animalChipToSpecies[a]).filter(Boolean);
          if (!petSpecies.some((s: string) => wantedSpecies.includes(s))) return null;
        }

        return { ...sit, pets: pets || [], avgRating, reviewCount: reviews?.length || 0 };
      })
    );

    setResults(enriched.filter(Boolean));
  };

  const searchLongStays = async () => {
    let query = supabase
      .from("long_stays")
      .select("*, owner:profiles!long_stays_user_id_fkey(first_name, avatar_url, city), property:properties!long_stays_property_id_fkey(type, environment, photos)")
      .eq("status", "published")
      .order("created_at", { ascending: false });

    if (startDate) query = query.gte("end_date", startDate);
    if (endDate) query = query.lte("start_date", endDate);

    const { data } = await query;
    let items = data || [];

    if (housingType !== "all") items = items.filter((s: any) => s.property?.type === housingType);

    if (city) {
      const searchCoords = await geocodeCity(city);
      if (searchCoords) {
        const uniqueCities = [...new Set(items.map((s: any) => s.owner?.city).filter(Boolean))] as string[];
        const cityCoords = new Map<string, { lat: number; lng: number }>();
        await Promise.all(uniqueCities.map(async (c) => {
          const coords = await geocodeCity(c);
          if (coords) cityCoords.set(c, { lat: coords.lat, lng: coords.lng });
        }));
        items = items.filter((s: any) => {
          const ownerCity = s.owner?.city;
          if (!ownerCity) return false;
          const coords = cityCoords.get(ownerCity);
          if (!coords) return false;
          return haversineDistance(searchCoords.lat, searchCoords.lng, coords.lat, coords.lng) <= radius[0];
        });
      } else {
        items = items.filter((s: any) => s.owner?.city?.toLowerCase().includes(city.toLowerCase()));
      }
    }

    // Load pets for each long stay
    const enriched = await Promise.all(
      items.map(async (ls: any) => {
        const { data: pets } = await supabase.from("pets").select("species, name").eq("property_id", ls.property_id);
        const petSpecies = (pets || []).map((p: any) => p.species);
        if (animalTypes.length > 0 && !animalTypes.includes("Tous")) {
          const wantedSpecies = animalTypes.map(a => animalChipToSpecies[a]).filter(Boolean);
          if (!petSpecies.some((s: string) => wantedSpecies.includes(s))) return null;
        }
        return { ...ls, pets: pets || [] };
      })
    );

    setLongStayResults(enriched.filter(Boolean));
  };

  const formatDate = (d: string | null) => d ? format(new Date(d), "d MMM", { locale: fr }) : "";

  const filtersContent = (
    <div className="space-y-5">
      <div>
        <label className="text-sm font-medium mb-1.5 block">Localisation</label>
        <Input placeholder="Ville" value={city} onChange={e => setCity(e.target.value)} />
        <div className="mt-2">
          <label className="text-xs text-muted-foreground">Rayon : {radius[0]} km</label>
          <Slider value={radius} onValueChange={setRadius} min={10} max={100} step={5} className="mt-1" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-sm font-medium mb-1.5 block">Du</label>
          <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
        </div>
        <div>
          <label className="text-sm font-medium mb-1.5 block">Au</label>
          <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
        </div>
      </div>
      <div>
        <label className="text-sm font-medium mb-1.5 block">Type d'animaux</label>
        <ChipSelect options={animalChips} selected={animalTypes} onChange={setAnimalTypes} />
      </div>
      <div>
        <label className="text-sm font-medium mb-1.5 block">Type de logement</label>
        <Select value={housingType} onValueChange={setHousingType}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous</SelectItem>
            <SelectItem value="apartment">Appartement</SelectItem>
            <SelectItem value="house">Maison</SelectItem>
            <SelectItem value="farm">Ferme</SelectItem>
            <SelectItem value="chalet">Chalet</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {tab === "sits" && (
        <>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Environnement</label>
            <Select value={environment} onValueChange={setEnvironment}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous</SelectItem>
                <SelectItem value="city_center">Ville</SelectItem>
                <SelectItem value="countryside">Campagne</SelectItem>
                <SelectItem value="mountain">Montagne</SelectItem>
                <SelectItem value="seaside">Bord de mer</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Durée</label>
            <Select value={duration} onValueChange={setDuration}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes</SelectItem>
                <SelectItem value="weekend">Week-end</SelectItem>
                <SelectItem value="1week">1 semaine</SelectItem>
                <SelectItem value="2weeks">2+ semaines</SelectItem>
                <SelectItem value="1month">1 mois+</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </>
      )}
      <Button onClick={handleSearch} className="w-full gap-2" disabled={loading}>
        <Search className="h-4 w-4" /> {loading ? "Recherche..." : "Rechercher"}
      </Button>
    </div>
  );

  const currentResults = tab === "sits" ? results : longStayResults;

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto animate-fade-in">
      <h1 className="font-heading text-3xl font-bold mb-1">Trouver une garde</h1>
      <p className="text-muted-foreground mb-4">Parcourez les annonces disponibles.</p>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={(v) => { setTab(v as SearchTab); setSearched(false); }} className="mb-6">
        <TabsList>
          <TabsTrigger value="sits">Gardes</TabsTrigger>
          <TabsTrigger value="long_stays">Longue durée</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Long stay eligibility warning */}
      {tab === "long_stays" && !sitterEligible && (
        <div className="p-5 rounded-xl border border-dashed border-border text-center mb-6">
          <Lock className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm font-medium">Gardes longue durée verrouillées</p>
          <p className="text-xs text-muted-foreground mt-1">
            Complétez 3 gardes avec une note de 4.7+ pour accéder aux gardes longue durée.
          </p>
        </div>
      )}

      {!userCity && (
        <div className="bg-accent border border-border rounded-lg p-4 mb-6 text-sm">
          <MapPin className="inline h-4 w-4 mr-1.5 text-primary" />
          <Link to="/profile" className="text-primary underline">Renseignez votre ville dans votre profil</Link> pour voir les gardes près de chez vous.
        </div>
      )}

      {/* Mobile filter button */}
      <div className="md:hidden mb-4">
        <Sheet open={mobileFiltersOpen} onOpenChange={setMobileFiltersOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" className="gap-2 w-full">
              <SlidersHorizontal className="h-4 w-4" /> Filtres
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto">
            <h3 className="font-heading font-semibold text-lg mb-4">Filtres</h3>
            {filtersContent}
          </SheetContent>
        </Sheet>
      </div>

      <div className="flex gap-8">
        {/* Desktop filters */}
        <aside className="hidden md:block w-72 shrink-0">
          <div className="sticky top-6 bg-card rounded-lg border border-border p-5">
            <h3 className="font-heading font-semibold mb-4">Filtres</h3>
            {filtersContent}
          </div>
        </aside>

        {/* Results */}
        <div className="flex-1 min-w-0">
          {searched && currentResults.length > 0 && (
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-muted-foreground">{currentResults.length} résultat{currentResults.length > 1 ? "s" : ""}</p>
              {tab === "sits" && (
                <Select value={sort} onValueChange={(v) => {
                  const newSort = v as SortOption;
                  setSort(newSort);
                  setResults(prev => {
                    const sorted = [...prev];
                    if (newSort === "recent") {
                      sorted.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
                    } else {
                      sorted.sort((a, b) => parseFloat(b.avgRating || "0") - parseFloat(a.avgRating || "0"));
                    }
                    return sorted;
                  });
                }}>
                  <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="recent">Plus récentes</SelectItem>
                    <SelectItem value="rating">Mieux notées</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>
          )}

          {!searched ? (
            <div className="text-center py-20 text-muted-foreground">
              <Search className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p>Utilisez les filtres pour trouver une garde.</p>
            </div>
          ) : loading ? (
            <p className="text-muted-foreground py-10 text-center">Recherche en cours...</p>
          ) : currentResults.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground">
              <p className="font-medium">Pas de résultat pour ces critères.</p>
              <p className="text-sm mt-1">Essayez d'élargir votre rayon ou vos dates.</p>
            </div>
          ) : tab === "sits" ? (
            <div className="space-y-4">
              {results.map((sit: any) => {
                const photos: string[] = sit.property?.photos || [];
                const petGroups: Record<string, string[]> = {};
                (sit.pets || []).forEach((p: any) => {
                  if (!petGroups[p.species]) petGroups[p.species] = [];
                  petGroups[p.species].push(p.name);
                });

                const badges: string[] = [];
                if (sitterProfile) {
                  const sitterAnimals: string[] = sitterProfile.animal_types || [];
                  const petSpecies = (sit.pets || []).map((p: any) => p.species);
                  if (petSpecies.some((s: string) => sitterAnimals.includes(s))) badges.push("Correspond à vos animaux");
                }

                return (
                  <Link key={sit.id} to={`/sits/${sit.id}`}
                    className="block bg-card rounded-lg border border-border overflow-hidden hover:shadow-md transition-shadow">
                    <div className="flex flex-col sm:flex-row">
                      {photos.length > 0 && (
                        <div className="sm:w-48 h-40 sm:h-auto shrink-0">
                          <img src={photos[0]} alt="" className="w-full h-full object-cover" />
                        </div>
                      )}
                      <div className="p-4 flex-1 min-w-0">
                        <h3 className="font-heading font-semibold truncate">{sit.title || "Sans titre"}</h3>
                        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground mt-1.5">
                          {sit.owner?.city && <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{sit.owner.city}</span>}
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5" />
                            {formatDate(sit.start_date)} → {formatDate(sit.end_date)}
                          </span>
                        </div>
                        {Object.keys(petGroups).length > 0 && (
                          <div className="flex flex-wrap items-center gap-2 mt-2">
                            {Object.entries(petGroups).map(([species, names]) => (
                              <span key={species} className="text-sm">
                                {speciesEmoji[species] || "🐾"} ×{names.length} {names.join(", ")}
                              </span>
                            ))}
                          </div>
                        )}
                        <div className="flex items-center gap-3 mt-2">
                          {sit.avgRating && (
                            <span className="flex items-center gap-1 text-sm">
                              <Star className="h-3.5 w-3.5 text-yellow-500 fill-yellow-500" />{sit.avgRating}
                              <span className="text-muted-foreground">({sit.reviewCount})</span>
                            </span>
                          )}
                        </div>
                        {badges.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {badges.map(b => (
                              <span key={b} className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700">
                                <CheckCircle2 className="inline h-3 w-3 mr-0.5 -mt-0.5" />{b}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            /* Long stay results */
            <div className="space-y-4">
              {longStayResults.map((ls: any) => {
                const photos: string[] = ls.property?.photos || [];
                const nights = ls.start_date && ls.end_date ? differenceInDays(new Date(ls.end_date), new Date(ls.start_date)) : 0;
                const petGroups: Record<string, string[]> = {};
                (ls.pets || []).forEach((p: any) => {
                  if (!petGroups[p.species]) petGroups[p.species] = [];
                  petGroups[p.species].push(p.name);
                });

                return (
                  <Link key={ls.id} to={sitterEligible ? `/long-stays/${ls.id}` : "#"}
                    className={`block bg-card rounded-lg border border-blue-200 overflow-hidden transition-shadow ${sitterEligible ? "hover:shadow-md" : "opacity-60 cursor-not-allowed"}`}>
                    <div className="flex flex-col sm:flex-row">
                      {photos.length > 0 && (
                        <div className="sm:w-48 h-40 sm:h-auto shrink-0">
                          <img src={photos[0]} alt="" className="w-full h-full object-cover" />
                        </div>
                      )}
                      <div className="p-4 flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge className="bg-[#DBEAFE] text-[#1E40AF] border-blue-200 hover:bg-[#DBEAFE] text-[10px] px-1.5 py-0">Longue durée</Badge>
                        </div>
                        <h3 className="font-heading font-semibold truncate">{ls.title || "Sans titre"}</h3>
                        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground mt-1.5">
                          {ls.owner?.city && <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{ls.owner.city}</span>}
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5" />
                            {formatDate(ls.start_date)} → {formatDate(ls.end_date)}
                            <span className="text-foreground font-medium">({nights} nuits)</span>
                          </span>
                        </div>
                        {ls.estimated_contribution && (
                          <p className="text-sm text-muted-foreground mt-1">{ls.estimated_contribution}</p>
                        )}
                        {Object.keys(petGroups).length > 0 && (
                          <div className="flex flex-wrap items-center gap-2 mt-2">
                            {Object.entries(petGroups).map(([species, names]) => (
                              <span key={species} className="text-sm">
                                {speciesEmoji[species] || "🐾"} ×{names.length} {names.join(", ")}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SearchSitter;
