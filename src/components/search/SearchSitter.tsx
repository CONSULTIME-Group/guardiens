import { useState, useEffect, useCallback, useRef } from "react";
import ReportButton from "@/components/reports/ReportButton";
import { Link, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Drawer, DrawerContent, DrawerTrigger } from "@/components/ui/drawer";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, SlidersHorizontal, MapPin, Calendar, Star, Lock, Zap, Sparkles } from "lucide-react";
import ChipSelect from "@/components/profile/ChipSelect";
import VerifiedBadge from "@/components/profile/VerifiedBadge";
import BadgeShield from "@/components/badges/BadgeShield";
import { TooltipProvider } from "@/components/ui/tooltip";
import { format, differenceInDays, differenceInHours } from "date-fns";
import { fr } from "date-fns/locale";
import { geocodeCity, haversineDistance } from "@/lib/geocode";

const animalChips = ["Chiens", "Chats", "Chevaux", "Animaux de ferme", "NAC"];
const animalChipToSpecies: Record<string, string> = {
  Chiens: "dog", Chats: "cat", Chevaux: "horse",
  "Animaux de ferme": "farm_animal", NAC: "nac",
};
const speciesEmoji: Record<string, string> = {
  dog: "🐕", cat: "🐈", horse: "🐴", bird: "🐦", rodent: "🐹",
  fish: "🐠", reptile: "🦎", farm_animal: "🐄", nac: "🐾",
};

type SortOption = "closest" | "recent" | "rating";
type SearchTab = "sits" | "long_stays" | "missions";

const SearchSitter = () => {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [searchParams] = useSearchParams();
  const [tab, setTab] = useState<SearchTab>("sits");
  const [city, setCity] = useState("");
  const [radius, setRadius] = useState([50]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [animalTypes, setAnimalTypes] = useState<string[]>([]);
  const [housingType, setHousingType] = useState("all");
  const [duration, setDuration] = useState("all");
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [emergencyOnly, setEmergencyOnly] = useState(searchParams.get("emergency") === "true");
  const [sort, setSort] = useState<SortOption>("closest");

  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [userCity, setUserCity] = useState("");
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [sitterEligible, setSitterEligible] = useState(false);
  const [sitterProfile, setSitterProfile] = useState<any>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const initialLoadDone = useRef(false);

  // Load user profile & eligibility
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
      const uc = profileRes.data?.city || "";
      setUserCity(uc);
      setSitterProfile(spRes.data);
      if (uc) {
        setCity(uc);
        const coords = await geocodeCity(uc);
        if (coords) setUserCoords(coords);
      }

      const completedSits = (eligRes.data || []).filter((a: any) => a.sit?.status === "completed").length;
      const reviews = reviewsRes.data || [];
      const avgRating = reviews.length > 0 ? reviews.reduce((s: number, r: any) => s + r.overall_rating, 0) / reviews.length : 0;
      const verified = myProfileRes.data?.identity_verified || false;
      setSitterEligible(completedSits >= 3 && avgRating >= 4.7 && verified);
    };
    load();
  }, [user]);

  // Auto-search when filters change (debounced)
  const doSearch = useCallback(async () => {
    setLoading(true);

    // Resolve search coordinates
    let searchCoords = userCoords;
    if (city && city !== userCity) {
      const coords = await geocodeCity(city);
      if (coords) searchCoords = coords;
    }

    if (tab === "sits") {
      await searchSits(searchCoords);
    } else if (tab === "long_stays") {
      await searchLongStays(searchCoords);
    } else {
      await searchMissions(searchCoords);
    }

    setLoading(false);
    setDrawerOpen(false);
  }, [tab, city, radius, startDate, endDate, animalTypes, housingType, duration, verifiedOnly, emergencyOnly, sort, userCoords, userCity]);

  // Trigger search on filter changes
  useEffect(() => {
    if (!initialLoadDone.current) return;
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => doSearch(), 400);
    return () => { if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current); };
  }, [doSearch]);

  // Initial load after user coords are set
  useEffect(() => {
    if (initialLoadDone.current) return;
    if (userCoords || (user && userCity === "")) {
      initialLoadDone.current = true;
      doSearch();
    }
  }, [userCoords, user, userCity]);

  const computeDistance = (ownerCity: string, cityCoords: Map<string, { lat: number; lng: number }>, searchCoords: { lat: number; lng: number } | null) => {
    if (!searchCoords) return null;
    const coords = cityCoords.get(ownerCity);
    if (!coords) return null;
    return haversineDistance(searchCoords.lat, searchCoords.lng, coords.lat, coords.lng);
  };

  const filterByLocation = async (items: any[], getCityFn: (item: any) => string | undefined, searchCoords: { lat: number; lng: number } | null) => {
    if (!searchCoords) return { items, cityCoords: new Map<string, { lat: number; lng: number }>() };
    const uniqueCities = [...new Set(items.map(getCityFn).filter(Boolean))] as string[];
    const cityCoords = new Map<string, { lat: number; lng: number }>();
    await Promise.all(uniqueCities.map(async (c) => {
      const coords = await geocodeCity(c);
      if (coords) cityCoords.set(c, { lat: coords.lat, lng: coords.lng });
    }));
    const filtered = items.filter((s) => {
      const ownerCity = getCityFn(s);
      if (!ownerCity) return false;
      const coords = cityCoords.get(ownerCity);
      if (!coords) return false;
      return haversineDistance(searchCoords.lat, searchCoords.lng, coords.lat, coords.lng) <= radius[0];
    });
    return { items: filtered, cityCoords };
  };

  const searchSits = async (searchCoords: { lat: number; lng: number } | null) => {
    let query = supabase
      .from("sits")
      .select("*, owner:profiles!sits_user_id_fkey(first_name, avatar_url, city, identity_verified), property:properties!sits_property_id_fkey(type, environment, photos)")
      .eq("status", "published")
      .order("created_at", { ascending: false });

    if (startDate) query = query.gte("end_date", startDate);
    if (endDate) query = query.lte("start_date", endDate);

    const { data } = await query;
    let items = data || [];

    if (housingType !== "all") items = items.filter((s: any) => s.property?.type === housingType);

    if (duration !== "all") {
      items = items.filter((s: any) => {
        if (!s.start_date || !s.end_date) return true;
        const days = Math.ceil((new Date(s.end_date).getTime() - new Date(s.start_date).getTime()) / (1000 * 60 * 60 * 24));
        switch (duration) {
          case "short": return days <= 7;
          case "medium": return days >= 7 && days <= 14;
          case "long": return days >= 15;
          default: return true;
        }
      });
    }

    if (verifiedOnly) items = items.filter((s: any) => s.owner?.identity_verified);

    const { items: locFiltered, cityCoords } = await filterByLocation(items, (s: any) => s.owner?.city, searchCoords);
    items = locFiltered;

    // Enrich
    const enriched = await Promise.all(
      items.map(async (sit: any) => {
        const [{ data: pets }, { data: reviews }, { data: ownerBadges }] = await Promise.all([
          supabase.from("pets").select("species, name").eq("property_id", sit.property_id),
          supabase.from("reviews").select("overall_rating").eq("reviewee_id", sit.user_id).eq("published", true),
          supabase.from("badge_attributions").select("badge_key").eq("receiver_id", sit.user_id),
        ]);
        const avgRating = reviews && reviews.length > 0
          ? (reviews.reduce((s: number, r: any) => s + r.overall_rating, 0) / reviews.length).toFixed(1) : null;

        const badgeCounts = new Map<string, number>();
        (ownerBadges || []).forEach((b: any) => badgeCounts.set(b.badge_key, (badgeCounts.get(b.badge_key) || 0) + 1));
        const topBadges = Array.from(badgeCounts.entries()).map(([badge_key, count]) => ({ badge_key, count })).sort((a, b) => b.count - a.count).slice(0, 2);

        const petSpecies = (pets || []).map((p: any) => p.species);
        if (animalTypes.length > 0) {
          const wantedSpecies = animalTypes.map(a => animalChipToSpecies[a]).filter(Boolean);
          if (!petSpecies.some((s: string) => wantedSpecies.includes(s))) return null;
        }

        const dist = searchCoords && sit.owner?.city ? computeDistance(sit.owner.city, cityCoords, searchCoords) : null;
        const isNew = differenceInHours(new Date(), new Date(sit.created_at)) < 48;
        const days = sit.start_date && sit.end_date ? differenceInDays(new Date(sit.end_date), new Date(sit.start_date)) : 0;

        return { ...sit, pets: pets || [], avgRating, reviewCount: reviews?.length || 0, topBadges, distance: dist, isNew, durationDays: days };
      })
    );

    let final = enriched.filter(Boolean);
    final = sortResults(final, sort);
    setResults(final);
  };

  const searchLongStays = async (searchCoords: { lat: number; lng: number } | null) => {
    let query = supabase
      .from("long_stays")
      .select("*, owner:profiles!long_stays_user_id_fkey(first_name, avatar_url, city, identity_verified), property:properties!long_stays_property_id_fkey(type, photos)")
      .eq("status", "published")
      .order("created_at", { ascending: false });

    if (startDate) query = query.gte("end_date", startDate);
    if (endDate) query = query.lte("start_date", endDate);

    const { data } = await query;
    let items = data || [];
    if (housingType !== "all") items = items.filter((s: any) => s.property?.type === housingType);
    if (verifiedOnly) items = items.filter((s: any) => s.owner?.identity_verified);

    const { items: locFiltered, cityCoords } = await filterByLocation(items, (s: any) => s.owner?.city, searchCoords);
    items = locFiltered;

    const enriched = await Promise.all(
      items.map(async (ls: any) => {
        const [{ data: pets }, { data: reviews }, { data: ownerBadges }] = await Promise.all([
          supabase.from("pets").select("species, name").eq("property_id", ls.property_id),
          supabase.from("reviews").select("overall_rating").eq("reviewee_id", ls.user_id).eq("published", true),
          supabase.from("badge_attributions").select("badge_key").eq("receiver_id", ls.user_id),
        ]);

        const petSpecies = (pets || []).map((p: any) => p.species);
        if (animalTypes.length > 0) {
          const wantedSpecies = animalTypes.map(a => animalChipToSpecies[a]).filter(Boolean);
          if (!petSpecies.some((s: string) => wantedSpecies.includes(s))) return null;
        }

        const avgRating = reviews && reviews.length > 0
          ? (reviews.reduce((s: number, r: any) => s + r.overall_rating, 0) / reviews.length).toFixed(1) : null;
        const badgeCounts = new Map<string, number>();
        (ownerBadges || []).forEach((b: any) => badgeCounts.set(b.badge_key, (badgeCounts.get(b.badge_key) || 0) + 1));
        const topBadges = Array.from(badgeCounts.entries()).map(([badge_key, count]) => ({ badge_key, count })).sort((a, b) => b.count - a.count).slice(0, 2);

        const dist = searchCoords && ls.owner?.city ? computeDistance(ls.owner.city, cityCoords, searchCoords) : null;
        const isNew = differenceInHours(new Date(), new Date(ls.created_at)) < 48;
        const days = ls.start_date && ls.end_date ? differenceInDays(new Date(ls.end_date), new Date(ls.start_date)) : 0;

        return { ...ls, pets: pets || [], avgRating, reviewCount: reviews?.length || 0, topBadges, distance: dist, isNew, durationDays: days };
      })
    );

    let final = enriched.filter(Boolean);
    final = sortResults(final, sort);
    setResults(final);
  };

  const searchMissions = async (searchCoords: { lat: number; lng: number } | null) => {
    let query = supabase
      .from("small_missions")
      .select("*, owner:profiles!small_missions_user_id_fkey(first_name, avatar_url, city, identity_verified)")
      .eq("status", "open")
      .order("created_at", { ascending: false });

    const { data } = await query;
    let items = data || [];

    if (verifiedOnly) items = items.filter((s: any) => s.owner?.identity_verified);

    if (searchCoords) {
      // Use mission's own lat/lng if available, else owner city
      const uniqueCities = [...new Set(items.filter((m: any) => !m.latitude && m.owner?.city).map((m: any) => m.owner.city))] as string[];
      const cityCoords = new Map<string, { lat: number; lng: number }>();
      await Promise.all(uniqueCities.map(async (c) => {
        const coords = await geocodeCity(c);
        if (coords) cityCoords.set(c, { lat: coords.lat, lng: coords.lng });
      }));

      items = items.filter((m: any) => {
        if (m.latitude && m.longitude) {
          return haversineDistance(searchCoords.lat, searchCoords.lng, m.latitude, m.longitude) <= radius[0];
        }
        const ownerCity = m.owner?.city;
        if (!ownerCity) return false;
        const coords = cityCoords.get(ownerCity);
        if (!coords) return false;
        return haversineDistance(searchCoords.lat, searchCoords.lng, coords.lat, coords.lng) <= radius[0];
      });

      items = items.map((m: any) => {
        let dist: number | null = null;
        if (m.latitude && m.longitude) {
          dist = haversineDistance(searchCoords!.lat, searchCoords!.lng, m.latitude, m.longitude);
        } else if (m.owner?.city) {
          const coords = cityCoords.get(m.owner.city);
          if (coords) dist = haversineDistance(searchCoords!.lat, searchCoords!.lng, coords.lat, coords.lng);
        }
        return { ...m, distance: dist, isNew: differenceInHours(new Date(), new Date(m.created_at)) < 48 } as any;
      });
    } else {
      items = items.map((m: any) => ({ ...m, distance: null, isNew: differenceInHours(new Date(), new Date(m.created_at)) < 48 }) as any);
    }

    let final: any[] = [...items];
    if (sort === "closest") final.sort((a: any, b: any) => (a.distance ?? 9999) - (b.distance ?? 9999));
    else if (sort === "recent") final.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    setResults(final);
  };

  const sortResults = (items: any[], sortBy: SortOption) => {
    const sorted = [...items];
    if (sortBy === "closest") sorted.sort((a, b) => (a.distance ?? 9999) - (b.distance ?? 9999));
    else if (sortBy === "recent") sorted.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    else if (sortBy === "rating") sorted.sort((a, b) => parseFloat(b.avgRating || "0") - parseFloat(a.avgRating || "0"));
    return sorted;
  };

  const handleSortChange = (v: string) => {
    const newSort = v as SortOption;
    setSort(newSort);
    setResults(prev => sortResults(prev, newSort));
  };

  const formatDate = (d: string | null) => d ? format(new Date(d), "d MMM", { locale: fr }) : "";

  const handleActivateAvailable = async () => {
    if (!user) return;
    await supabase.from("sitter_profiles").update({ is_available: true }).eq("user_id", user.id);
    window.location.reload();
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
      {tab !== "missions" && (
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
      )}
      {tab !== "missions" && (
        <div>
          <label className="text-sm font-medium mb-1.5 block">Type d'animaux</label>
          <ChipSelect options={animalChips} selected={animalTypes} onChange={setAnimalTypes} />
        </div>
      )}
      {tab !== "missions" && (
        <div>
          <label className="text-sm font-medium mb-1.5 block">Type de logement</label>
          <Select value={housingType} onValueChange={setHousingType}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous</SelectItem>
              <SelectItem value="apartment">Appartement</SelectItem>
              <SelectItem value="house">Maison</SelectItem>
              <SelectItem value="farm">Ferme / Chalet</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}
      {tab === "sits" && (
        <div>
          <label className="text-sm font-medium mb-1.5 block">Durée</label>
          <Select value={duration} onValueChange={setDuration}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes</SelectItem>
              <SelectItem value="short">Court séjour (≤ 7j)</SelectItem>
              <SelectItem value="medium">1-2 semaines</SelectItem>
              <SelectItem value="long">Longue durée (15j+)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}
      <div className="flex items-center gap-3">
        <Switch checked={verifiedOnly} onCheckedChange={setVerifiedOnly} />
        <label className="text-sm">Profils vérifiés uniquement</label>
      </div>
      {tab === "sits" && (
        <div className="flex items-center gap-3">
          <Switch checked={emergencyOnly} onCheckedChange={setEmergencyOnly} />
          <label className="text-sm flex items-center gap-1.5">
            <Zap className="h-3.5 w-3.5 text-amber-500" /> Gardiens d'urgence
          </label>
        </div>
      )}
    </div>
  );

  const renderCard = (item: any) => {
    const photos: string[] = item.property?.photos || [];
    const petGroups: Record<string, string[]> = {};
    (item.pets || []).forEach((p: any) => {
      if (!petGroups[p.species]) petGroups[p.species] = [];
      petGroups[p.species].push(p.name);
    });

    const isLongStay = tab === "long_stays";
    const isMission = tab === "missions";
    const linkTo = isMission ? `/petites-missions/${item.id}` : isLongStay ? (sitterEligible ? `/long-stays/${item.id}` : "#") : `/sits/${item.id}`;

    return (
      <Link
        key={item.id}
        to={linkTo}
        className={`block bg-card rounded-lg border overflow-hidden hover:shadow-md transition-shadow ${isLongStay && !sitterEligible ? "opacity-60 cursor-not-allowed" : ""} ${isLongStay ? "border-blue-200" : "border-border"}`}
      >
        <div className="flex flex-col sm:flex-row">
          {photos.length > 0 && (
            <div className="sm:w-44 h-36 sm:h-auto shrink-0">
              <img src={photos[0]} alt="" className="w-full h-full object-cover" />
            </div>
          )}
          <div className="p-4 flex-1 min-w-0">
            {/* Badges row */}
            <div className="flex flex-wrap items-center gap-1.5 mb-1">
              {item.isNew && (
                <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-0 text-[10px] px-1.5 py-0">
                  <Sparkles className="h-3 w-3 mr-0.5" /> Nouveau
                </Badge>
              )}
              {item.is_urgent && (
                <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-0 text-[10px] px-1.5 py-0">
                  <Zap className="h-3 w-3 mr-0.5" /> Urgent
                </Badge>
              )}
              {isLongStay && (
                <Badge className="bg-[#DBEAFE] text-[#1E40AF] border-blue-200 hover:bg-[#DBEAFE] text-[10px] px-1.5 py-0">Longue durée</Badge>
              )}
            </div>

            <h3 className="font-heading font-semibold truncate flex items-center gap-1.5">
              {item.title || "Sans titre"}
              {item.owner?.identity_verified && <VerifiedBadge size="sm" />}
            </h3>

            <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground mt-1">
              {item.owner?.city && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />{item.owner.city}
                </span>
              )}
              {item.distance != null && (
                <span className="text-xs text-muted-foreground">à {Math.round(item.distance)} km</span>
              )}
              {!isMission && item.start_date && (
                <span className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  {formatDate(item.start_date)} → {formatDate(item.end_date)}
                </span>
              )}
              {isMission && item.date_needed && (
                <span className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  {formatDate(item.date_needed)}
                </span>
              )}
            </div>

            {/* Animals */}
            {Object.keys(petGroups).length > 0 && (
              <div className="flex flex-wrap items-center gap-2 mt-1.5">
                {Object.entries(petGroups).map(([species, names]) => (
                  <span key={species} className="text-sm">
                    {speciesEmoji[species] || "🐾"} ×{names.length}
                  </span>
                ))}
              </div>
            )}

            {/* Mission specific info */}
            {isMission && (
              <p className="text-sm text-muted-foreground mt-1 truncate">{item.description}</p>
            )}

            {/* Rating + Badges */}
            <div className="flex items-center gap-3 mt-1.5">
              {item.avgRating && (
                <span className="flex items-center gap-1 text-sm">
                  <Star className="h-3.5 w-3.5 text-yellow-500 fill-yellow-500" />{item.avgRating}
                  <span className="text-muted-foreground">({item.reviewCount})</span>
                </span>
              )}
              {item.topBadges && item.topBadges.length > 0 && (
                <TooltipProvider>
                  <div className="flex gap-1">
                    {item.topBadges.slice(0, 2).map((b: any) => (
                      <BadgeShield key={b.badge_key} badgeKey={b.badge_key} count={b.count} size="sm" showLabel={false} />
                    ))}
                  </div>
                </TooltipProvider>
              )}
            </div>
          </div>
        </div>
      </Link>
    );
  };

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto animate-fade-in">
      <h1 className="font-heading text-3xl font-bold mb-1">Trouver une garde</h1>
      <p className="text-muted-foreground mb-4">Parcourez les annonces disponibles.</p>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={(v) => { setTab(v as SearchTab); }} className="mb-4">
        <TabsList>
          <TabsTrigger value="sits">Gardes</TabsTrigger>
          <TabsTrigger value="long_stays">Longue durée</TabsTrigger>
          <TabsTrigger value="missions">Petites missions</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Long stay eligibility warning */}
      {tab === "long_stays" && !sitterEligible && (
        <div className="p-4 rounded-xl border border-dashed border-border text-center mb-4">
          <Lock className="h-5 w-5 text-muted-foreground mx-auto mb-1.5" />
          <p className="text-sm font-medium">Gardes longue durée verrouillées</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Complétez 3 gardes avec une note de 4.7+ pour accéder aux gardes longue durée.
          </p>
        </div>
      )}

      {!userCity && (
        <div className="bg-accent border border-border rounded-lg p-3 mb-4 text-sm">
          <MapPin className="inline h-4 w-4 mr-1.5 text-primary" />
          <Link to="/profile" className="text-primary underline">Renseignez votre ville</Link> pour voir les gardes près de chez vous.
        </div>
      )}

      {/* Mobile filter button */}
      {isMobile && (
        <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
          <DrawerTrigger asChild>
            <Button variant="outline" className="gap-2 w-full mb-4">
              <SlidersHorizontal className="h-4 w-4" /> Filtres
            </Button>
          </DrawerTrigger>
          <DrawerContent className="max-h-[85vh] overflow-y-auto px-4 pb-6">
            <h3 className="font-heading font-semibold text-lg mb-4 mt-2">Filtres</h3>
            {filtersContent}
          </DrawerContent>
        </Drawer>
      )}

      <div className="flex gap-6">
        {/* Desktop filters sidebar */}
        {!isMobile && (
          <aside className="w-[280px] shrink-0">
            <div className="sticky top-6 bg-card rounded-lg border border-border p-5">
              <h3 className="font-heading font-semibold mb-4">Filtres</h3>
              {filtersContent}
            </div>
          </aside>
        )}

        {/* Results */}
        <div className="flex-1 min-w-0">
          {/* Sort bar */}
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-muted-foreground">
              {loading ? "Recherche…" : `${results.length} annonce${results.length > 1 ? "s" : ""} trouvée${results.length > 1 ? "s" : ""}`}
            </p>
            <Select value={sort} onValueChange={handleSortChange}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="closest">Plus proches</SelectItem>
                <SelectItem value="recent">Plus récentes</SelectItem>
                {tab !== "missions" && <SelectItem value="rating">Mieux notées</SelectItem>}
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <p className="text-muted-foreground py-10 text-center">Recherche en cours...</p>
          ) : results.length === 0 ? (
            <div className="text-center py-16 space-y-4">
              <Search className="h-12 w-12 mx-auto text-primary/30" />
              <p className="font-heading font-semibold text-lg">Pas encore d'annonce dans votre zone</p>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Activez le mode Disponible pour être contacté directement par les propriétaires !
              </p>
              <Button onClick={handleActivateAvailable} className="gap-2">
                <Sparkles className="h-4 w-4" /> Activer le mode disponible
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {results.map(renderCard)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SearchSitter;
