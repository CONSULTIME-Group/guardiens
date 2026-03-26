import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import ReportButton from "@/components/reports/ReportButton";
import { supabase } from "@/integrations/supabase/client";
import { geocodeCity, haversineDistance } from "@/lib/geocode";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Search, SlidersHorizontal, MapPin, Star, Car, CheckCircle2, CircleDot, MessageCircle, Zap } from "lucide-react";
import { toast } from "sonner";
import ChipSelect from "@/components/profile/ChipSelect";
import VerifiedBadge from "@/components/profile/VerifiedBadge";
import EmergencyBadge from "@/components/profile/EmergencyBadge";
import BadgePills from "@/components/badges/BadgePills";

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
  const navigate = useNavigate();
  const [city, setCity] = useState("");
  const [radius, setRadius] = useState([50]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [animalTypes, setAnimalTypes] = useState<string[]>([]);
  const [sitterType, setSitterType] = useState("all");
  const [vehicled, setVehicled] = useState(false);
  const [availableOnly, setAvailableOnly] = useState(false);
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [emergencyOnly, setEmergencyOnly] = useState(false);
  const [sort, setSort] = useState<SortOption>("rating");

  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const [contactingId, setContactingId] = useState<string | null>(null);

  const handleContact = async (sitterId: string) => {
    if (!user) return;
    setContactingId(sitterId);
    try {
      // Check if conversation already exists
      const { data: existing } = await supabase
        .from("conversations")
        .select("id")
        .eq("owner_id", user.id)
        .eq("sitter_id", sitterId)
        .maybeSingle();

      if (existing) {
        navigate(`/messages?conversation=${existing.id}`);
        return;
      }

      // Create new conversation
      const { data: conv, error } = await supabase
        .from("conversations")
        .insert({ owner_id: user.id, sitter_id: sitterId })
        .select("id")
        .single();

      if (error) throw error;
      navigate(`/messages?conversation=${conv.id}`);
    } catch (err) {
      toast.error("Impossible de démarrer la conversation");
    } finally {
      setContactingId(null);
    }
  };

  const handleSearch = async () => {
    setLoading(true);
    setSearched(true);

    const { data: sitters } = await supabase
      .from("sitter_profiles")
      .select("*, profile:profiles!sitter_profiles_user_id_fkey(first_name, last_name, avatar_url, city, postal_code, profile_completion, identity_verified)");

    let items = (sitters || []).filter((s: any) => s.profile?.profile_completion >= 60);

    // Filters
    // Geocoded radius filter
    if (city) {
      const searchCoords = await geocodeCity(city);
      if (searchCoords) {
        const uniqueCities = [...new Set(items.map((s: any) => s.profile?.city).filter(Boolean))] as string[];
        const cityCoords = new Map<string, { lat: number; lng: number }>();

        await Promise.all(
          uniqueCities.map(async (c) => {
            const coords = await geocodeCity(c);
            if (coords) cityCoords.set(c, { lat: coords.lat, lng: coords.lng });
          })
        );

        items = items.filter((s: any) => {
          const sitterCity = s.profile?.city;
          if (!sitterCity) return false;
          const coords = cityCoords.get(sitterCity);
          if (!coords) return false;
          const dist = haversineDistance(searchCoords.lat, searchCoords.lng, coords.lat, coords.lng);
          return dist <= radius[0];
        });
      } else {
        // Fallback to text match if geocoding fails
        items = items.filter((s: any) => s.profile?.city?.toLowerCase().includes(city.toLowerCase()));
      }
    }
    if (sitterType !== "all") {
      items = items.filter((s: any) => (s.sitter_type || "").toLowerCase() === sitterType.toLowerCase());
    }
    if (vehicled) {
      items = items.filter((s: any) => s.has_vehicle);
    }
    if (availableOnly) {
      items = items.filter((s: any) => s.is_available);
    }
    if (verifiedOnly) {
      items = items.filter((s: any) => s.profile?.identity_verified);
    }
    if (animalTypes.length > 0 && !animalTypes.includes("Tous")) {
      const wanted = animalTypes.map(a => animalChipToType[a]).filter(Boolean);
      items = items.filter((s: any) => {
        const types: string[] = s.animal_types || [];
        return wanted.some(w => types.includes(w));
      });
    }

    // Enrich with reviews + badges + emergency status
    const userIds = items.map((s: any) => s.user_id);
    const [allBadgesRes, emergencyRes] = await Promise.all([
      supabase.from("badge_attributions").select("receiver_id, badge_key").in("receiver_id", userIds),
      supabase.from("emergency_sitter_profiles").select("user_id, is_active").in("user_id", userIds).eq("is_active", true),
    ]);

    const emergencySet = new Set((emergencyRes.data || []).map((e: any) => e.user_id));

    if (emergencyOnly) {
      items = items.filter((s: any) => emergencySet.has(s.user_id));
    }

    const badgeMap = new Map<string, Map<string, number>>();
    (allBadgesRes.data || []).forEach((b: any) => {
      if (!badgeMap.has(b.receiver_id)) badgeMap.set(b.receiver_id, new Map());
      const m = badgeMap.get(b.receiver_id)!;
      m.set(b.badge_key, (m.get(b.badge_key) || 0) + 1);
    });

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
        const userBadges = badgeMap.get(s.user_id);
        const topBadges = userBadges
          ? Array.from(userBadges.entries()).map(([badge_key, count]) => ({ badge_key, count })).sort((a, b) => b.count - a.count).slice(0, 2)
          : [];
        return { ...s, avgRating, reviewCount: reviews?.length || 0, topBadges, isEmergency: emergencySet.has(s.user_id) };
      })
    );

    // Sort: emergency sitters first, then by selected sort
    if (sort === "rating") {
      enriched.sort((a, b) => {
        if (a.isEmergency !== b.isEmergency) return a.isEmergency ? -1 : 1;
        return parseFloat(b.avgRating || "0") - parseFloat(a.avgRating || "0");
      });
    } else {
      const expOrder: Record<string, number> = { "5+": 4, "3-5": 3, "1-2": 2, debutant: 1, "": 0 };
      enriched.sort((a, b) => {
        if (a.isEmergency !== b.isEmergency) return a.isEmergency ? -1 : 1;
        return (expOrder[b.experience_years || ""] || 0) - (expOrder[a.experience_years || ""] || 0);
      });
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
      <div className="flex items-center gap-3">
        <Switch checked={verifiedOnly} onCheckedChange={setVerifiedOnly} />
        <label className="text-sm">Profils vérifiés uniquement</label>
      </div>
      <div className="flex items-center gap-3">
        <Switch checked={emergencyOnly} onCheckedChange={setEmergencyOnly} />
        <label className="text-sm flex items-center gap-1.5">
          <Zap className="h-3.5 w-3.5 text-amber-500" /> Gardiens d'urgence
        </label>
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
              <Select value={sort} onValueChange={(v) => {
                const newSort = v as SortOption;
                setSort(newSort);
                setResults(prev => {
                  const sorted = [...prev];
                  if (newSort === "rating") {
                    sorted.sort((a, b) => parseFloat(b.avgRating || "0") - parseFloat(a.avgRating || "0"));
                  } else {
                    const expOrder: Record<string, number> = { "5+": 4, "3-5": 3, "1-2": 2, debutant: 1, "": 0 };
                    sorted.sort((a, b) => (expOrder[b.experience_years || ""] || 0) - (expOrder[a.experience_years || ""] || 0));
                  }
                  return sorted;
                });
              }}>
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
                      <Link to={`/profil/${s.user_id}`} className="shrink-0">
                        {profile?.avatar_url ? (
                          <img src={profile.avatar_url} alt={profile.first_name} className="w-16 h-16 rounded-full object-cover hover:ring-2 hover:ring-primary transition-all" />
                        ) : (
                          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center font-heading text-xl font-bold hover:ring-2 hover:ring-primary transition-all">
                            {profile?.first_name?.charAt(0) || "?"}
                          </div>
                        )}
                      </Link>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Link to={`/profil/${s.user_id}`} className="hover:text-primary transition-colors">
                            <h3 className="font-heading font-semibold">{profile?.first_name || "Gardien"}</h3>
                          </Link>
                          {profile?.identity_verified && <VerifiedBadge />}
                          {s.isEmergency && <EmergencyBadge />}
                          {s.is_available && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-xs font-medium">
                              <CircleDot className="h-3 w-3" /> Disponible
                            </span>
                          )}
                          {s.has_vehicle && <Car className="h-4 w-4 text-muted-foreground" />}
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground mt-0.5">
                          {(profile?.city || profile?.postal_code) && <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{[profile.postal_code, profile.city].filter(Boolean).join(" ")}</span>}
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

                        {/* Qualitative badges */}
                        {s.topBadges && s.topBadges.length > 0 && (
                          <div className="mt-1.5">
                            <BadgePills badges={s.topBadges} max={2} size="sm" />
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
                        <div className="flex items-center gap-2 mt-3">
                          <Button
                            size="sm"
                            className="gap-1.5"
                            onClick={() => handleContact(s.user_id)}
                            disabled={contactingId === s.user_id}
                          >
                            <MessageCircle className="h-3.5 w-3.5" />
                            {contactingId === s.user_id ? "..." : "Contacter"}
                          </Button>
                          <ReportButton targetId={s.user_id} targetType="profile" className="ml-auto" />
                        </div>
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
