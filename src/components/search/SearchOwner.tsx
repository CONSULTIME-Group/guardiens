import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Search, SlidersHorizontal, MapPin, Star, Car, CheckCircle2, CircleDot } from "lucide-react";
import ChipSelect from "@/components/profile/ChipSelect";

const animalChips = ["Chiens", "Chats", "Chevaux", "Oiseaux", "Animaux de ferme", "NAC", "Tous"];
const animalChipToType: Record<string, string> = {
  Chiens: "dog", Chats: "cat", Chevaux: "horse", Oiseaux: "bird",
  "Animaux de ferme": "farm_animal", NAC: "nac",
};
const sitterTypeLabels: Record<string, string> = {
  solo: "Solo", couple: "Couple", family: "Famille", retiree: "Retraité",
};
const experienceLabels: Record<string, string> = {
  "": "Non renseigné", "debutant": "Débutant", "1-2": "1-2 ans", "3-5": "3-5 ans", "5+": "5+ ans",
};

type SortOption = "rating" | "experience";

const SearchOwner = () => {
  const { user } = useAuth();
  const [city, setCity] = useState("");
  const [radius, setRadius] = useState([50]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [animalTypes, setAnimalTypes] = useState<string[]>([]);
  const [sitterType, setSitterType] = useState("all");
  const [vehicled, setVehicled] = useState(false);
  const [availableOnly, setAvailableOnly] = useState(false);
  const [sort, setSort] = useState<SortOption>("rating");

  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const handleSearch = async () => {
    setLoading(true);
    setSearched(true);

    const { data: sitters } = await supabase
      .from("sitter_profiles")
      .select("*, profile:profiles!sitter_profiles_user_id_fkey(first_name, last_name, avatar_url, city, profile_completion)");

    let items = (sitters || []).filter((s: any) => s.profile?.profile_completion >= 60);

    // Filters
    if (city) {
      items = items.filter((s: any) => s.profile?.city?.toLowerCase().includes(city.toLowerCase()));
    }
    if (sitterType !== "all") {
      items = items.filter((s: any) => s.sitter_type === sitterType);
    }
    if (vehicled) {
      items = items.filter((s: any) => s.has_vehicle);
    }
    if (availableOnly) {
      items = items.filter((s: any) => s.is_available);
    }
    if (animalTypes.length > 0 && !animalTypes.includes("Tous")) {
      const wanted = animalTypes.map(a => animalChipToType[a]).filter(Boolean);
      items = items.filter((s: any) => {
        const types: string[] = s.animal_types || [];
        return wanted.some(w => types.includes(w));
      });
    }

    // Enrich with reviews
    const enriched = await Promise.all(
      items.map(async (s: any) => {
        const { data: reviews } = await supabase
          .from("reviews")
          .select("overall_rating")
          .eq("reviewee_id", s.user_id)
          .eq("published", true);
        const avgRating = reviews && reviews.length > 0
          ? (reviews.reduce((sum: number, r: any) => sum + r.overall_rating, 0) / reviews.length).toFixed(1)
          : null;
        return { ...s, avgRating, reviewCount: reviews?.length || 0 };
      })
    );

    // Sort
    if (sort === "rating") {
      enriched.sort((a, b) => (parseFloat(b.avgRating || "0") - parseFloat(a.avgRating || "0")));
    } else {
      const expOrder: Record<string, number> = { "5+": 4, "3-5": 3, "1-2": 2, debutant: 1, "": 0 };
      enriched.sort((a, b) => (expOrder[b.experience_years || ""] || 0) - (expOrder[a.experience_years || ""] || 0));
    }

    setResults(enriched);
    setLoading(false);
    setMobileFiltersOpen(false);
  };

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
          <label className="text-sm font-medium mb-1.5 block">Dispo du</label>
          <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
        </div>
        <div>
          <label className="text-sm font-medium mb-1.5 block">Au</label>
          <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
        </div>
      </div>
      <div>
        <label className="text-sm font-medium mb-1.5 block">Type d'animaux gérés</label>
        <ChipSelect options={animalChips} selected={animalTypes} onChange={setAnimalTypes} />
      </div>
      <div>
        <label className="text-sm font-medium mb-1.5 block">Type de gardien</label>
        <Select value={sitterType} onValueChange={setSitterType}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous</SelectItem>
            <SelectItem value="solo">Solo</SelectItem>
            <SelectItem value="couple">Couple</SelectItem>
            <SelectItem value="family">Famille</SelectItem>
            <SelectItem value="retiree">Retraité</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-center gap-3">
        <Switch checked={vehicled} onCheckedChange={setVehicled} />
        <label className="text-sm">Véhiculé</label>
      </div>
      <div className="flex items-center gap-3">
        <Switch checked={availableOnly} onCheckedChange={setAvailableOnly} />
        <label className="text-sm">Disponibles uniquement</label>
      </div>
      <Button onClick={handleSearch} className="w-full gap-2" disabled={loading}>
        <Search className="h-4 w-4" /> {loading ? "Recherche..." : "Rechercher"}
      </Button>
    </div>
  );

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto animate-fade-in">
      <h1 className="font-heading text-3xl font-bold mb-1">Trouver un gardien</h1>
      <p className="text-muted-foreground mb-6">Recherchez le gardien idéal pour votre maison et vos animaux.</p>

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
        <aside className="hidden md:block w-72 shrink-0">
          <div className="sticky top-6 bg-card rounded-lg border border-border p-5">
            <h3 className="font-heading font-semibold mb-4">Filtres</h3>
            {filtersContent}
          </div>
        </aside>

        <div className="flex-1 min-w-0">
          {searched && results.length > 0 && (
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-muted-foreground">{results.length} gardien{results.length > 1 ? "s" : ""}</p>
              <Select value={sort} onValueChange={(v) => setSort(v as SortOption)}>
                <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="rating">Mieux notés</SelectItem>
                  <SelectItem value="experience">Plus expérimentés</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {!searched ? (
            <div className="text-center py-20 text-muted-foreground">
              <Search className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p>Utilisez les filtres pour trouver un gardien.</p>
            </div>
          ) : loading ? (
            <p className="text-muted-foreground py-10 text-center">Recherche en cours...</p>
          ) : results.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground">
              <p className="font-medium">Aucun gardien ne correspond à ces critères.</p>
              <p className="text-sm mt-1">Essayez d'élargir vos filtres.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {results.map((s: any) => {
                const profile = s.profile;
                const animalTypes: string[] = s.animal_types || [];
                const lifestyle: string[] = s.lifestyle || [];

                return (
                  <div key={s.id} className="bg-card rounded-lg border border-border p-5 hover:shadow-md transition-shadow">
                    <div className="flex gap-4">
                      {profile?.avatar_url ? (
                        <img src={profile.avatar_url} alt={profile.first_name} className="w-16 h-16 rounded-full object-cover shrink-0" />
                      ) : (
                        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center font-heading text-xl font-bold shrink-0">
                          {profile?.first_name?.charAt(0) || "?"}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-heading font-semibold">{profile?.first_name || "Gardien"}</h3>
                          {s.has_vehicle && <Car className="h-4 w-4 text-muted-foreground" />}
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground mt-0.5">
                          {profile?.city && <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{profile.city}</span>}
                          {s.sitter_type && <span>{sitterTypeLabels[s.sitter_type] || s.sitter_type}</span>}
                        </div>

                        {/* Experience & animals */}
                        <p className="text-sm mt-1.5">
                          {s.experience_years && <span>{experienceLabels[s.experience_years] || s.experience_years}</span>}
                          {animalTypes.length > 0 && (
                            <span className="text-muted-foreground"> · {animalTypes.join(", ")}</span>
                          )}
                        </p>

                        {/* Rating */}
                        {s.avgRating && (
                          <div className="flex items-center gap-1 text-sm mt-1">
                            <Star className="h-3.5 w-3.5 text-yellow-500 fill-yellow-500" />
                            {s.avgRating} <span className="text-muted-foreground">({s.reviewCount} avis)</span>
                          </div>
                        )}

                        {/* Lifestyle chips */}
                        {lifestyle.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {lifestyle.slice(0, 4).map(l => (
                              <span key={l} className="px-2 py-0.5 rounded-full bg-accent text-xs">{l}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SearchOwner;
