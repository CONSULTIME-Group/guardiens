import { useState, useEffect, useCallback, useRef, lazy, Suspense } from "react";
import ReportButton from "@/components/reports/ReportButton";
import { Sprout, PawPrint, GraduationCap, Handshake as HandshakeIcon, LayoutList, Map as MapIcon, Cat, Bird, SlidersHorizontal, ShieldCheck } from "lucide-react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";

const SearchMapView = lazy(() => import("@/components/search/SearchMapView"));
import { DEMO_SITS, DEMO_MISSIONS, DEMO_THRESHOLD } from "@/data/demoListings";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Search, MapPin, Calendar, Star, Lock, Zap, Sparkles } from "lucide-react";
import ChipSelect from "@/components/profile/ChipSelect";
import VerifiedBadge from "@/components/profile/VerifiedBadge";
import BadgeShield from "@/components/badges/BadgeShield";
import { TooltipProvider } from "@/components/ui/tooltip";
import { format, differenceInDays, differenceInHours } from "date-fns";
import { fr } from "date-fns/locale";
import { geocodeCity, haversineDistance } from "@/lib/geocode";
import { useSubscriptionAccess } from "@/hooks/useSubscriptionAccess";

const animalChips = ["Chiens", "Chats", "Chevaux", "Animaux de ferme", "NAC"];
const animalChipToSpecies: Record<string, string> = {
  Chiens: "dog", Chats: "cat", Chevaux: "horse",
  "Animaux de ferme": "farm_animal", NAC: "nac",
};
const speciesIcon: Record<string, typeof PawPrint> = {
  dog: PawPrint, cat: Cat, horse: PawPrint, bird: Bird, rodent: PawPrint,
  fish: PawPrint, reptile: PawPrint, farm_animal: Bird, nac: PawPrint,
};

type SortOption = "closest" | "recent" | "rating";
type SearchTab = "sits" | "long_stays" | "missions";
type MissionSubTab = "published" | "members";
type ViewMode = "list" | "map";

const SearchSitter = () => {
  const { user } = useAuth();
  const { hasAccess } = useSubscriptionAccess();
  const isMobile = useIsMobile();
  const [searchParams] = useSearchParams();
  const [tab, setTab] = useState<SearchTab>("sits");
  const [missionSubTab, setMissionSubTab] = useState<MissionSubTab>("published");
  const [missionTypeFilter, setMissionTypeFilter] = useState<"all" | "besoin" | "offre">("all");
  const [missionCategoryFilter, setMissionCategoryFilter] = useState<"all" | "garden" | "animals" | "skills" | "house">("all");
  const [availableMembers, setAvailableMembers] = useState<any[]>([]);
  const [city, setCity] = useState("");
  const [radius, setRadius] = useState([15]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [animalTypes, setAnimalTypes] = useState<string[]>([]);
  const [housingType, setHousingType] = useState("all");
  const [duration, setDuration] = useState("all");
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [emergencyOnly, setEmergencyOnly] = useState(searchParams.get("emergency") === "true");
  const [sort, setSort] = useState<SortOption>("closest");
  const [viewMode, setViewMode] = useState<ViewMode>("list");

  const [results, setResults] = useState<any[]>([]);
  const [resultCoords, setResultCoords] = useState<Map<string, { lat: number; lng: number }>>(new Map());
  const [loading, setLoading] = useState(false);
  const [userCity, setUserCity] = useState("");
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [sitterEligible, setSitterEligible] = useState(false);
  const [sitterProfile, setSitterProfile] = useState<any>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const initialLoadDone = useRef(false);

  // Pill popover states
  const [editingCity, setEditingCity] = useState(false);
  const [cityInput, setCityInput] = useState("");
  const [showMoreAnimals, setShowMoreAnimals] = useState(false);

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
        setCityInput(uc);
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
      if (missionSubTab === "members") {
        await searchAvailableMembers(searchCoords);
      } else {
        await searchMissions(searchCoords);
      }
    }
    setLoading(false);
  }, [tab, missionSubTab, city, radius, startDate, endDate, animalTypes, housingType, duration, verifiedOnly, emergencyOnly, sort, userCoords, userCity, missionTypeFilter, missionCategoryFilter]);

  useEffect(() => {
    if (!initialLoadDone.current) return;
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => doSearch(), 400);
    return () => { if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current); };
  }, [doSearch]);

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
        switch (duration) { case "short": return days <= 7; case "medium": return days >= 7 && days <= 14; case "long": return days >= 15; default: return true; }
      });
    }
    if (verifiedOnly) items = items.filter((s: any) => s.owner?.identity_verified);
    const { items: locFiltered, cityCoords } = await filterByLocation(items, (s: any) => s.owner?.city, searchCoords);
    items = locFiltered;
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
    if (final.length < DEMO_THRESHOLD) {
      final = [...final, ...DEMO_SITS];
    }
    // Store coords for map pins
    const coordsMap = new Map<string, { lat: number; lng: number }>();
    final.forEach((item: any) => {
      if (item && item.owner?.city) {
        const c = cityCoords.get(item.owner.city);
        if (c) coordsMap.set(item.id, c);
      }
    });
    setResultCoords(coordsMap);
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
    if (final.length < DEMO_THRESHOLD) {
      final = [...final, ...DEMO_MISSIONS];
    }
    setResults(final);
  };

  const searchAvailableMembers = async (searchCoords: { lat: number; lng: number } | null) => {
    const { data } = await supabase
      .from("profiles")
      .select("id, first_name, avatar_url, city, skill_categories, available_for_help")
      .eq("available_for_help", true)
      .not("skill_categories", "eq", "{}");
    let items = (data || []).filter((m: any) => m.id !== user?.id);
    const catToSkill: Record<string, string> = { garden: "jardin", animals: "animaux", skills: "competences", house: "coups_de_main" };
    if (missionCategoryFilter !== "all") {
      const skillKey = catToSkill[missionCategoryFilter];
      items = items.filter((m: any) => m.skill_categories?.includes(skillKey));
    }
    if (searchCoords) {
      const uniqueCities = [...new Set(items.map((m: any) => m.city).filter(Boolean))] as string[];
      const cityCoords = new Map<string, { lat: number; lng: number }>();
      await Promise.all(uniqueCities.map(async (c) => {
        const coords = await geocodeCity(c);
        if (coords) cityCoords.set(c, { lat: coords.lat, lng: coords.lng });
      }));
      items = items.filter((m: any) => {
        if (!m.city) return false;
        const coords = cityCoords.get(m.city);
        if (!coords) return false;
        return haversineDistance(searchCoords.lat, searchCoords.lng, coords.lat, coords.lng) <= radius[0];
      }).map((m: any) => {
        const coords = cityCoords.get(m.city);
        const dist = coords ? haversineDistance(searchCoords.lat, searchCoords.lng, coords.lat, coords.lng) : null;
        return { ...m, distance: dist };
      });
    }
    const memberIds = items.map((m: any) => m.id);
    if (memberIds.length > 0) {
      const { data: reviews } = await supabase.from("reviews").select("reviewee_id, overall_rating").in("reviewee_id", memberIds).eq("published", true);
      const reviewMap = new Map<string, { count: number; total: number }>();
      (reviews || []).forEach((r: any) => {
        const cur = reviewMap.get(r.reviewee_id) || { count: 0, total: 0 };
        reviewMap.set(r.reviewee_id, { count: cur.count + 1, total: cur.total + r.overall_rating });
      });
      const { data: apps } = await supabase.from("applications").select("sitter_id").in("sitter_id", memberIds).eq("status", "accepted");
      const sitsMap = new Map<string, number>();
      (apps || []).forEach((a: any) => { sitsMap.set(a.sitter_id, (sitsMap.get(a.sitter_id) || 0) + 1); });
      items = items.map((m: any) => {
        const rev = reviewMap.get(m.id);
        return { ...m, avgRating: rev ? (rev.total / rev.count).toFixed(1) : null, reviewCount: rev?.count || 0, sitsCount: sitsMap.get(m.id) || 0 };
      });
    }
    if (sort === "closest") items.sort((a: any, b: any) => (a.distance ?? 9999) - (b.distance ?? 9999));
    else if (sort === "rating") items.sort((a: any, b: any) => parseFloat(b.avgRating || "0") - parseFloat(a.avgRating || "0"));
    setAvailableMembers(items);
    setResults([]);
  };

  const sortResults = (items: any[], sortBy: SortOption) => {
    const sorted = [...items];
    if (sortBy === "closest") sorted.sort((a, b) => (a.distance ?? 9999) - (b.distance ?? 9999));
    else if (sortBy === "recent") sorted.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    else if (sortBy === "rating") sorted.sort((a, b) => parseFloat(b.avgRating || "0") - parseFloat(a.avgRating || "0"));
    return sorted;
  };

  const handleSortChange = (newSort: SortOption) => {
    setSort(newSort);
    setResults(prev => sortResults(prev, newSort));
  };

  const formatDate = (d: string | null) => d ? format(new Date(d), "d MMM", { locale: fr }) : "";

  const handleActivateAvailable = async () => {
    if (!user) return;
    await supabase.from("sitter_profiles").update({ is_available: true }).eq("user_id", user.id);
    window.location.reload();
  };

  const handleCityConfirm = () => {
    setCity(cityInput);
    setEditingCity(false);
  };

  const toggleAnimalFilter = (animal: string) => {
    setAnimalTypes(prev => prev.includes(animal) ? prev.filter(a => a !== animal) : [...prev, animal]);
  };

  const animalsLabel = animalTypes.length > 0 ? animalTypes.join(" · ") : "Animaux";
  const datesLabel = startDate && endDate
    ? `${format(new Date(startDate), "d MMM", { locale: fr })} – ${format(new Date(endDate), "d MMM", { locale: fr })}`
    : "Dates";

  const resultCount = tab === "missions" && missionSubTab === "members" ? availableMembers.length : results.length;
  const countLabel = tab === "missions" && missionSubTab === "members"
    ? `${resultCount} membre${resultCount > 1 ? "s" : ""} disponible${resultCount > 1 ? "s" : ""}`
    : `${resultCount} garde${resultCount > 1 ? "s" : ""} disponible${resultCount > 1 ? "s" : ""} près de vous`;

  // ─── Card renderer ───
  const renderCard = (item: any) => {
    const photos: string[] = item.property?.photos || [];
    const petGroups: Record<string, string[]> = {};
    (item.pets || []).forEach((p: any) => {
      if (!petGroups[p.species]) petGroups[p.species] = [];
      petGroups[p.species].push(p.name);
    });
    const isLongStay = tab === "long_stays";
    const isMission = tab === "missions";
    const isDemo = !!item.is_demo;
    const linkTo = isMission ? `/petites-missions/${item.id}` : isLongStay ? (sitterEligible ? `/long-stays/${item.id}` : "#") : `/sits/${item.id}`;

    // CAS 1: hasAccess + real → clickable card, no CTA
    // CAS 2: hasAccess + demo → not clickable, no CTA
    // CAS 3: !hasAccess + real → not clickable, CTA to /mon-abonnement
    // CAS 4: !hasAccess + demo → not clickable, CTA to /mon-abonnement
    const showCTA = !hasAccess;
    const isClickable = hasAccess && !isDemo;

    const cardContent = (
      <div className={`bg-white rounded-2xl overflow-hidden border border-[#E8E6DC] transition-shadow ${isClickable ? "cursor-pointer hover:shadow-md" : ""}`}>
        {/* Photo */}
        {photos.length > 0 && (
          <div className="h-48 relative">
            <img src={photos[0]} alt="" className="w-full h-full object-cover" />
            {item.owner?.identity_verified && (
              <span className="absolute top-3 left-3 flex items-center gap-1 bg-white/90 backdrop-blur-sm rounded-full px-2 py-1 text-xs text-[#2D6A4F] font-medium">
                <ShieldCheck className="h-3 w-3" /> Vérifié
              </span>
            )}
            {isDemo && (
              <span className="absolute top-3 right-3 bg-black/40 text-white rounded-full px-2 py-1 text-xs">
                Annonce type
              </span>
            )}
            {item.isNew && !isDemo && (
              <span className="absolute top-3 right-3 bg-[#2D6A4F] text-white rounded-full px-2 py-1 text-xs flex items-center gap-1">
                <Sparkles className="h-3 w-3" /> Nouveau
              </span>
            )}
          </div>
        )}
        {/* Body */}
        <div className="p-4">
          <h3 className="text-base font-semibold text-[#1a1a1a] leading-snug mb-1 line-clamp-2">
            {item.title || "Sans titre"}
          </h3>
          <p className="text-sm text-[#6B7280] mb-2 flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5" />
            {item.owner?.city || ""}
            {item.distance != null && ` · ${item.distance < 1 ? "< 1" : Math.round(item.distance).toLocaleString("fr-FR").replace(/\s/g, "\u202F")} km`}
          </p>
          {/* Animal icons */}
          {Object.keys(petGroups).length > 0 && (
            <div className="flex flex-wrap items-center gap-2 mb-2">
              {Object.entries(petGroups).map(([species, names]) => {
                const IconComp = speciesIcon[species] || PawPrint;
                return (
                  <span key={species} className="flex items-center gap-0.5 text-[#92400E] text-sm">
                    <IconComp className="h-4 w-4" /> ×{names.length}
                  </span>
                );
              })}
            </div>
          )}
          {/* Dates */}
          {!isMission && item.start_date && (
            <p className="text-xs text-[#6B7280]">
              {formatDate(item.start_date)} → {formatDate(item.end_date)}
            </p>
          )}
          {isMission && item.description && (
            <p className="text-sm text-[#6B7280] truncate">{item.description}</p>
          )}
          {/* CTA for non-subscribers (CAS 3 & 4) */}
          {showCTA && (
            <Link
              to="/mon-abonnement"
              className="block w-full py-2 text-sm text-[#2D6A4F] bg-[#EAF3DE] rounded-xl font-medium hover:bg-[#D1FAE5] mt-3 text-center"
            >
              S'abonner pour postuler
            </Link>
          )}
        </div>
      </div>
    );

    // Only wrap in Link if CAS 1 (hasAccess + real)
    if (isClickable) {
      return <Link key={item.id} to={linkTo}>{cardContent}</Link>;
    }
    return <div key={item.id}>{cardContent}</div>;
  };

  // ─── Render ───
  return (
    <div className="animate-fade-in">
      {/* Tabs */}
      <div className="px-6 pt-4">
        <Tabs value={tab} onValueChange={(v) => { if (v !== "long_stays") setTab(v as SearchTab); }} className="mb-0">
          <TabsList>
            <TabsTrigger value="sits">Gardes</TabsTrigger>
            <TabsTrigger value="long_stays" disabled className="opacity-60 cursor-not-allowed">
              Longue durée
              <span className="ml-2 bg-[#E8E6DC] text-[#6B7280] rounded-full px-2 py-0.5 text-[10px] font-medium">Bientôt disponible</span>
            </TabsTrigger>
            <TabsTrigger value="missions">Petites missions</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Mission sub-tabs */}
      {tab === "missions" && (
        <div className="px-6 pt-3 space-y-3">
          <div className="flex gap-2">
            <button
              onClick={() => setMissionSubTab("published")}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${missionSubTab === "published" ? "bg-[#1a1a1a] text-white" : "bg-white text-[#6B7280] border border-[#E8E6DC] hover:bg-[#F5F5F0]"}`}
            >
              Missions publiées
            </button>
            <button
              onClick={() => setMissionSubTab("members")}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${missionSubTab === "members" ? "bg-[#1a1a1a] text-white" : "bg-white text-[#6B7280] border border-[#E8E6DC] hover:bg-[#F5F5F0]"}`}
            >
              Membres disponibles
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {([
              { key: "all" as const, label: "Tout", icon: null },
              { key: "garden" as const, label: "Jardin", icon: Sprout },
              { key: "animals" as const, label: "Animaux", icon: PawPrint },
              { key: "skills" as const, label: "Compétences", icon: GraduationCap },
              { key: "house" as const, label: "Coups de main", icon: HandshakeIcon },
            ]).map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setMissionCategoryFilter(key)}
                className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition-colors ${
                  missionCategoryFilter === key
                    ? "bg-[#1a1a1a] text-white border-[#1a1a1a]"
                    : "bg-white text-[#6B7280] border-[#E8E6DC]"
                }`}
              >
                {Icon && <Icon className="h-3 w-3" />}
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ─── Sticky search bar ─── */}
      <div className="sticky top-0 z-10 bg-white border-b border-[#E8E6DC]" style={{ borderBottomWidth: "0.5px" }}>
        <div className="flex flex-row items-center gap-3 px-6 py-3 overflow-x-auto">
          {/* Location pill */}
          <Popover open={editingCity} onOpenChange={setEditingCity}>
            <PopoverTrigger asChild>
              <button className="flex items-center gap-2 px-4 py-2 rounded-full border border-[#E8E6DC] bg-white text-sm cursor-pointer hover:border-[#2D6A4F] whitespace-nowrap shrink-0 transition-colors">
                <MapPin className="h-3.5 w-3.5" /> {city || "Ville"}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-3" align="start">
              <Input
                placeholder="Entrez une ville"
                value={cityInput}
                onChange={e => setCityInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") handleCityConfirm(); }}
                autoFocus
              />
              <Button size="sm" className="w-full mt-2" onClick={handleCityConfirm}>Valider</Button>
            </PopoverContent>
          </Popover>

          {/* Radius pill */}
          <Popover>
            <PopoverTrigger asChild>
              <button className="flex items-center gap-2 px-4 py-2 rounded-full border border-[#E8E6DC] bg-white text-sm cursor-pointer hover:border-[#2D6A4F] whitespace-nowrap shrink-0 transition-colors">
                {radius[0]} km
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-4" align="start">
              <p className="text-xs text-[#6B7280] mb-2">Rayon : {radius[0]} km</p>
              <Slider value={radius} onValueChange={setRadius} min={5} max={100} step={5} />
            </PopoverContent>
          </Popover>

          {/* Dates pill */}
          <Popover>
            <PopoverTrigger asChild>
              <button className="flex items-center gap-2 px-4 py-2 rounded-full border border-[#E8E6DC] bg-white text-sm cursor-pointer hover:border-[#2D6A4F] whitespace-nowrap shrink-0 transition-colors">
                <Calendar className="h-3.5 w-3.5" /> {datesLabel}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-4" align="start">
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-[#6B7280] block mb-1">Du</label>
                  <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
                </div>
                <div>
                  <label className="text-xs text-[#6B7280] block mb-1">Au</label>
                  <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
                </div>
              </div>
            </PopoverContent>
          </Popover>

          {/* Animals pill */}
          <Popover>
            <PopoverTrigger asChild>
              <button className="flex items-center gap-2 px-4 py-2 rounded-full border border-[#E8E6DC] bg-white text-sm cursor-pointer hover:border-[#2D6A4F] whitespace-nowrap shrink-0 transition-colors">
                <PawPrint className="h-3.5 w-3.5" /> {animalsLabel}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-3" align="start">
              <div className="space-y-2">
                {["Chiens", "Chats"].map(animal => (
                  <label key={animal} className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox checked={animalTypes.includes(animal)} onCheckedChange={() => toggleAnimalFilter(animal)} />
                    {animal}
                  </label>
                ))}
                {!showMoreAnimals && (
                  <button className="text-xs text-[#2D6A4F] hover:underline" onClick={() => setShowMoreAnimals(true)}>
                    Voir plus →
                  </button>
                )}
                {showMoreAnimals && ["Chevaux", "Animaux de ferme", "NAC"].map(animal => (
                  <label key={animal} className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox checked={animalTypes.includes(animal)} onCheckedChange={() => toggleAnimalFilter(animal)} />
                    {animal}
                  </label>
                ))}
              </div>
            </PopoverContent>
          </Popover>

          {/* Advanced filters pill */}
          <Sheet>
            <SheetTrigger asChild>
              <button className="flex items-center gap-2 px-4 py-2 rounded-full border border-[#E8E6DC] bg-white text-sm cursor-pointer hover:border-[#2D6A4F] whitespace-nowrap shrink-0 transition-colors">
                <SlidersHorizontal className="h-3.5 w-3.5" /> Filtres
              </button>
            </SheetTrigger>
            <SheetContent side="right" className="w-80 overflow-y-auto">
              <h3 className="font-heading font-semibold text-lg mb-6 mt-2">Filtres avancés</h3>
              <div className="space-y-6">
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
                <div className="flex items-center justify-between">
                  <label className="text-sm">Profils vérifiés uniquement</label>
                  <Switch checked={verifiedOnly} onCheckedChange={setVerifiedOnly} />
                </div>
                <div className="flex items-center justify-between">
                  <label className="text-sm flex items-center gap-1.5">
                    <Zap className="h-3.5 w-3.5 text-amber-500" /> Gardiens d'urgence
                  </label>
                  <Switch checked={emergencyOnly} onCheckedChange={setEmergencyOnly} />
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* ─── Sort bar + view toggle ─── */}
      <div className="flex justify-between items-center px-6 py-2.5 border-b border-[#E8E6DC]" style={{ borderBottomWidth: "0.5px" }}>
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-sm text-[#6B7280]">{loading ? "Recherche…" : countLabel}</span>
          <div className="flex gap-1.5">
            {(["closest", "recent", "rating"] as SortOption[]).map(s => (
              <button
                key={s}
                onClick={() => handleSortChange(s)}
                className={`rounded-full px-3 py-1 text-xs transition-colors ${
                  sort === s ? "bg-[#1a1a1a] text-white" : "bg-white text-[#6B7280] border border-[#E8E6DC]"
                }`}
              >
                {s === "closest" ? "Plus proches" : s === "recent" ? "Plus récentes" : "Mieux notées"}
              </button>
            ))}
          </div>
        </div>
        <div className="border border-[#E8E6DC] rounded-lg overflow-hidden flex shrink-0">
          <button
            onClick={() => setViewMode("list")}
            className={`p-2 transition-colors ${viewMode === "list" ? "bg-[#2D6A4F] text-white" : "bg-white text-[#6B7280]"}`}
          >
            <LayoutList className="h-4 w-4" />
          </button>
          <button
            onClick={() => setViewMode("map")}
            className={`p-2 transition-colors ${viewMode === "map" ? "bg-[#2D6A4F] text-white" : "bg-white text-[#6B7280]"}`}
          >
            <MapIcon className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* ─── No city warning ─── */}
      {!userCity && (
        <div className="mx-6 mt-4 bg-accent border border-border rounded-lg p-3 text-sm">
          <MapPin className="inline h-4 w-4 mr-1.5 text-primary" />
          <Link to="/profile" className="text-primary underline">Renseignez votre ville</Link> pour voir les gardes près de chez vous.
        </div>
      )}

      {/* ─── Content ─── */}
      {viewMode === "list" ? (
        <div className="p-6">
          {loading ? (
            <p className="text-[#6B7280] py-10 text-center">Recherche en cours...</p>
          ) : tab === "missions" && missionSubTab === "members" ? (
            availableMembers.length === 0 ? (
              <div className="text-center py-16 space-y-3">
                <Search className="h-12 w-12 mx-auto text-primary/30" />
                <p className="font-heading font-semibold text-lg">Aucun membre disponible dans ce rayon</p>
                <p className="text-sm text-[#6B7280]">Élargis ton rayon de recherche.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {availableMembers.map((member: any) => {
                  const skillMeta: Record<string, { label: string; icon: typeof Sprout }> = {
                    jardin: { label: "Jardin", icon: Sprout },
                    animaux: { label: "Animaux", icon: PawPrint },
                    competences: { label: "Compétences", icon: GraduationCap },
                    coups_de_main: { label: "Coups de main", icon: HandshakeIcon },
                  };
                  const skills: string[] = member.skill_categories || [];
                  const visibleSkills = skills.slice(0, 2);
                  const extraCount = skills.length - 2;
                  return (
                    <div key={member.id} className="bg-white rounded-2xl border border-[#E8E6DC] p-4 flex items-center gap-4">
                      {member.avatar_url ? (
                        <img src={member.avatar_url} alt="" className="w-12 h-12 rounded-full object-cover shrink-0" />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-[#F5F5F0] flex items-center justify-center text-sm font-bold shrink-0">
                          {member.first_name?.charAt(0) || "?"}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-base font-heading font-semibold">{member.first_name || "Membre"}</p>
                        {member.city && <p className="text-xs text-[#6B7280]">{member.city}{member.distance != null ? ` · à ${Math.round(member.distance)} km` : ""}</p>}
                        <div className="flex flex-wrap gap-1.5 mt-1.5">
                          {visibleSkills.map((s: string) => {
                            const meta = skillMeta[s];
                            if (!meta) return null;
                            const Icon = meta.icon;
                            return (
                              <span key={s} className="flex items-center gap-1 bg-[#EAF3DE] text-[#2D6A4F] rounded-full text-xs px-3 py-1">
                                <Icon className="h-3 w-3" />{meta.label}
                              </span>
                            );
                          })}
                          {extraCount > 0 && <span className="text-xs text-[#6B7280] self-center">+{extraCount}</span>}
                        </div>
                        {(member.avgRating || member.sitsCount > 0) && (
                          <p className="text-xs text-[#6B7280] mt-1">
                            {member.avgRating && <>★ {member.avgRating}</>}
                            {member.sitsCount > 0 && <> · {member.sitsCount} garde{member.sitsCount > 1 ? "s" : ""}</>}
                          </p>
                        )}
                      </div>
                      <Link
                        to={`/messages?new=true&to=${member.id}&context=entraide`}
                        className="text-sm text-[#2D6A4F] font-semibold shrink-0 hover:underline"
                      >
                        Contacter →
                      </Link>
                    </div>
                  );
                })}
              </div>
            )
          ) : results.length === 0 ? (
            <div className="text-center py-16 space-y-4">
              <Search className="h-12 w-12 mx-auto text-primary/30" />
              <p className="font-heading font-semibold text-lg">Pas encore d'annonce dans votre zone</p>
              <p className="text-sm text-[#6B7280] max-w-md mx-auto">
                Activez le mode Disponible pour être contacté directement par les propriétaires !
              </p>
              <Button onClick={handleActivateAvailable} className="gap-2">
                <Sparkles className="h-4 w-4" /> Activer le mode disponible
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {results.map(renderCard)}
            </div>
          )}
        </div>
      ) : (
        /* ─── Map view ─── */
        <Suspense fallback={<div className="flex items-center justify-center h-[calc(100vh-200px)]"><p className="text-[#6B7280]">Chargement de la carte…</p></div>}>
          <SearchMapView
            results={results}
            resultCoords={resultCoords}
            userCoords={userCoords}
            hasAccess={hasAccess}
            formatDate={formatDate}
            tab={tab}
            sitterEligible={sitterEligible}
            renderCard={renderCard}
          />
        </Suspense>
      )}
    </div>
  );
};

export default SearchSitter;
