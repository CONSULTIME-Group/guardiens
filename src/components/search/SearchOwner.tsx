import { useState, useEffect, useCallback, useRef } from "react";
import { logger } from "@/lib/logger";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import ReportButton from "@/components/reports/ReportButton";
import { supabase } from "@/integrations/supabase/client";
import { geocodeCity, haversineDistance } from "@/lib/geocode";
import { useAuth } from "@/contexts/AuthContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  MapPin, Star, SlidersHorizontal, MessageCircle, Zap,
  LayoutGrid, Map as MapIcon, ShieldCheck, Crosshair, CircleDot, Car, Calendar,
  Bell, BellRing, Loader2, Share2
} from "lucide-react";
import { toast } from "sonner";
import { useToast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";
import VerifiedBadge from "@/components/profile/VerifiedBadge";
import EmergencyBadge from "@/components/profile/EmergencyBadge";
import { getDeptCode, DEPT_NAMES } from "@/lib/departments";
import { getRegionCode, getRegionName } from "@/lib/regions";
import { trackEvent } from "@/lib/analytics";

import { TooltipProvider } from "@/components/ui/tooltip";



const animalChips = ["Chiens", "Chats", "Chevaux", "Oiseaux", "Animaux de ferme", "NAC", "Tous"];
const animalChipToType: Record<string, string> = {
  Chiens: "dog", Chats: "cat", Chevaux: "horse", Oiseaux: "bird",
  "Animaux de ferme": "farm_animal", NAC: "nac",
};

const RADIUS_SHORTCUTS = [5, 10, 15, 30, 50];

type SortOption = "closest" | "rating" | "experience";
type ViewMode = "list" | "map";
type ZoneMode = "radius" | "dept" | "region" | "france";

const SearchOwner = () => {
  const { user, switchRole } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { toast: toastUi } = useToast();

  // Filter state
  const [city, setCity] = useState("");
  const [cityPostalCode, setCityPostalCode] = useState<string | null>(null);
  const [userPostalCode, setUserPostalCode] = useState<string | null>(null);
  const [citySuggestions, setCitySuggestions] = useState<any[]>([]);
  const [radius, setRadius] = useState([15]);
  const [zoneMode, setZoneMode] = useState<ZoneMode>("radius");
  const [densityCounts, setDensityCounts] = useState<{ radius: number; dept: number; region: number; france: number }>({ radius: 0, dept: 0, region: 0, france: 0 });
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [animalTypes, setAnimalTypes] = useState<string[]>([]);
  const [vehicled, setVehicled] = useState(false);
  const [availableOnly, setAvailableOnly] = useState(false);
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [emergencyOnly, setEmergencyOnly] = useState(false);
  const [minSits, setMinSits] = useState<string>("all");
  const [minRating, setMinRating] = useState<string>("all");
  const [sort, setSort] = useState<SortOption>("closest");
  const [viewMode, setViewMode] = useState<ViewMode>("list");

  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [contactingId, setContactingId] = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [initialLoaded, setInitialLoaded] = useState(false);

  // Empty state intelligence
  const [alertCreated, setAlertCreated] = useState(false);
  const [isCreatingAlert, setIsCreatingAlert] = useState(false);
  const [franceTotalSitters, setFranceTotalSitters] = useState<number | null>(null);

  // Popover open states (only one at a time)
  const [openPop, setOpenPop] = useState<string | null>(null);

  // Debounce ref
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // City autocomplete
  const cityDebounceRef = useRef<ReturnType<typeof setTimeout>>();
  const fetchCitySuggestions = useCallback((q: string) => {
    clearTimeout(cityDebounceRef.current);
    if (q.length < 2) { setCitySuggestions([]); return; }
    cityDebounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`https://geo.api.gouv.fr/communes?nom=${encodeURIComponent(q)}&fields=nom,codesPostaux,centre&boost=population&limit=5`);
        const data = await res.json();
        setCitySuggestions(data || []);
      } catch { setCitySuggestions([]); }
    }, 300);
  }, []);

  // Geolocation
  const handleGeolocate = useCallback(() => {
    if (!navigator.geolocation) { toast.error("Géolocalisation non disponible"); return; }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const res = await fetch(`https://geo.api.gouv.fr/communes?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&fields=nom,codesPostaux&limit=1`);
          const data = await res.json();
          if (data?.[0]) {
            setCity(data[0].nom);
            setCityPostalCode(data[0].codesPostaux?.[0] ?? null);
            setCitySuggestions([]);
          }
        } catch { toast.error("Impossible de déterminer votre ville"); }
      },
      () => toast.error("Géolocalisation refusée")
    );
  }, []);

  // Load owner city + postal code on mount
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase.from("profiles").select("city, postal_code").eq("id", user.id).single();
      if (data?.city) setCity(data.city);
      if (data?.postal_code) {
        setUserPostalCode(data.postal_code);
        setCityPostalCode(data.postal_code);
      }
      setInitialLoaded(true);
    })();
  }, [user]);

  // Fetch true France-wide sitter count (for unbiased counter + launch detection)
  useEffect(() => {
    (async () => {
      const { count } = await supabase
        .from("sitter_profiles")
        .select("user_id", { count: "exact", head: true });
      setFranceTotalSitters(count ?? 0);
    })();
  }, []);

  // Reset alert state when zone changes
  useEffect(() => { setAlertCreated(false); }, [city, radius, zoneMode]);

  // Reference postal code (selected city if available, else user CP)
  const getZoneRefPostalCode = (): string | null => cityPostalCode ?? userPostalCode;

  // Contact handler — propriétaire qui sonde un gardien (context: sitter_inquiry)
  const handleContact = async (sitterId: string) => {
    if (!user) {
      toast.error("Connectez-vous pour contacter un gardien");
      navigate("/login");
      return;
    }
    if (sitterId === user.id) {
      toast.error("Vous ne pouvez pas vous contacter vous-même");
      return;
    }
    setContactingId(sitterId);
    try {
      const { startConversationAndNavigate } = await import("@/lib/conversation");
      switchRole('owner');
      await startConversationAndNavigate(
        { otherUserId: sitterId, context: "sitter_inquiry" },
        navigate,
      );
    } catch (err: any) {
      logger.error("handleContact error", { err: String(err) });
      toast.error("Impossible de démarrer la conversation. Réessayez.");
    } finally {
      setContactingId(null);
    }
  };

  // Create sitter alert
  const handleCreateAlert = async () => {
    if (!city || alertCreated || isCreatingAlert) return;
    setIsCreatingAlert(true);
    trackEvent("search_empty_action", { source: "owner", metadata: { action: "create_alert", zone_mode: zoneMode } });
    const { data, error } = await supabase.rpc("create_alert_from_search", {
      p_city: city,
      p_postal_code: cityPostalCode ?? null,
      p_radius_km: radius[0],
    });
    setIsCreatingAlert(false);
    if (error) {
      const msg = error.message || "";
      if (msg.includes("DOUBLON")) {
        toastUi({ title: "Vous avez déjà cette alerte", description: "Une alerte identique existe déjà pour cette zone." });
        setAlertCreated(true);
      } else if (msg.includes("MAX_ZONES")) {
        toastUi({
          variant: "destructive",
          title: "Maximum atteint",
          description: "Vous avez déjà 3 alertes actives. Supprimez-en une dans vos paramètres.",
          action: <ToastAction altText="Gérer mes alertes" onClick={() => navigate("/settings")}>Gérer</ToastAction>,
        });
      } else if (msg.includes("INVALID_CITY")) {
        toastUi({ variant: "destructive", title: "Ville requise", description: "Sélectionnez une ville avant de créer une alerte." });
      } else if (msg.includes("INVALID_RADIUS")) {
        toastUi({ variant: "destructive", title: "Rayon invalide", description: "Le rayon doit être 5, 15, 30, 50 ou 100 km." });
      } else {
        toastUi({ variant: "destructive", title: "Erreur", description: "Une erreur est survenue. Veuillez réessayer." });
      }
    } else {
      toastUi({
        title: "Alerte créée",
        description: `Vous serez prévenu·e dès qu'un nouveau gardien rejoint la zone autour de ${city}.`,
        action: <ToastAction altText="Personnaliser" onClick={() => navigate("/settings")}>Personnaliser</ToastAction>,
      });
      setAlertCreated(true);
    }
  };

  // Share invite link
  const handleShareInvite = async () => {
    trackEvent("search_empty_action", { source: "owner", metadata: { action: "share_invite", zone_mode: zoneMode } });
    const url = `${window.location.origin}/inscription?role=sitter`;
    const shareText = `Je cherche un gardien d'animaux près de ${city || "chez moi"} sur Guardiens. Tu peux t'inscrire ici :`;
    if (navigator.share) {
      try {
        await navigator.share({ title: "Guardiens — devenez gardien", text: shareText, url });
      } catch { /* user cancelled */ }
    } else {
      await navigator.clipboard.writeText(`${shareText} ${url}`);
      toast.success("Lien copié — partagez-le à un voisin de confiance.");
    }
  };

  // Search logic
  const handleSearch = useCallback(async () => {
    setLoading(true);

    const { data: sitters } = await supabase
      .from("sitter_profiles")
      .select("*, profile:profiles!sitter_profiles_user_id_fkey(first_name, last_name, avatar_url, city, postal_code, profile_completion, identity_verified, completed_sits_count, bio)");

    let items = (sitters || []).filter((s: any) => s.profile?.profile_completion >= 60);

    // Geocode all sitter cities once (needed for radius mode + density counter)
    const uniqueCities = [...new Set(items.map((s: any) => s.profile?.city).filter(Boolean))] as string[];
    const cityCoords = new Map<string, { lat: number; lng: number }>();
    await Promise.all(uniqueCities.map(async (c) => {
      const coords = await geocodeCity(c);
      if (coords) cityCoords.set(c, { lat: coords.lat, lng: coords.lng });
    }));

    // Reference postal code for dept/region zones
    const refPostalCode = cityPostalCode ?? userPostalCode;
    const refDept = getDeptCode(refPostalCode);
    const refRegion = getRegionCode(refDept);

    // Resolve search coords (for radius mode + distance display)
    let searchCoords: { lat: number; lng: number } | null = null;
    if (city) {
      searchCoords = await geocodeCity(city);
    }

    // Compute density counters (always — drives the zone selector UI)
    const radiusCount = searchCoords ? items.filter((s: any) => {
      const c = s.profile?.city; if (!c) return false;
      const co = cityCoords.get(c); if (!co) return false;
      return haversineDistance(searchCoords!.lat, searchCoords!.lng, co.lat, co.lng) <= radius[0];
    }).length : 0;
    const deptCount = refDept ? items.filter((s: any) => {
      const cp = s.profile?.postal_code; return cp ? getDeptCode(cp) === refDept : false;
    }).length : 0;
    const regionCount = refRegion ? items.filter((s: any) => {
      const cp = s.profile?.postal_code; return cp ? getRegionCode(getDeptCode(cp)) === refRegion : false;
    }).length : 0;
    setDensityCounts({
      radius: radiusCount,
      dept: deptCount,
      region: regionCount,
      france: franceTotalSitters ?? items.length,
    });

    // Apply selected zone filter + compute distance
    if (zoneMode === "radius") {
      if (searchCoords) {
        items = items.map((s: any) => {
          const sitterCity = s.profile?.city;
          if (!sitterCity) return { ...s, _dist: Infinity };
          const coords = cityCoords.get(sitterCity);
          if (!coords) return { ...s, _dist: Infinity };
          const dist = haversineDistance(searchCoords!.lat, searchCoords!.lng, coords.lat, coords.lng);
          return { ...s, _dist: Math.round(dist) };
        }).filter((s: any) => s._dist <= radius[0]);
      } else if (city) {
        // Fallback: name match
        items = items.filter((s: any) => s.profile?.city?.toLowerCase().includes(city.toLowerCase())).map((s: any) => ({ ...s, _dist: null }));
      } else {
        items = items.map((s: any) => ({ ...s, _dist: null }));
      }
    } else if (zoneMode === "dept" && refDept) {
      items = items
        .filter((s: any) => {
          const cp = s.profile?.postal_code; return cp ? getDeptCode(cp) === refDept : false;
        })
        .map((s: any) => {
          const sitterCity = s.profile?.city;
          const coords = sitterCity ? cityCoords.get(sitterCity) : null;
          const dist = coords && searchCoords ? Math.round(haversineDistance(searchCoords.lat, searchCoords.lng, coords.lat, coords.lng)) : null;
          return { ...s, _dist: dist };
        });
    } else if (zoneMode === "region" && refRegion) {
      items = items
        .filter((s: any) => {
          const cp = s.profile?.postal_code; return cp ? getRegionCode(getDeptCode(cp)) === refRegion : false;
        })
        .map((s: any) => {
          const sitterCity = s.profile?.city;
          const coords = sitterCity ? cityCoords.get(sitterCity) : null;
          const dist = coords && searchCoords ? Math.round(haversineDistance(searchCoords.lat, searchCoords.lng, coords.lat, coords.lng)) : null;
          return { ...s, _dist: dist };
        });
    } else {
      // france
      items = items.map((s: any) => {
        const sitterCity = s.profile?.city;
        const coords = sitterCity ? cityCoords.get(sitterCity) : null;
        const dist = coords && searchCoords ? Math.round(haversineDistance(searchCoords.lat, searchCoords.lng, coords.lat, coords.lng)) : null;
        return { ...s, _dist: dist };
      });
    }

    // Filter: vehicle
    if (vehicled) items = items.filter((s: any) => s.has_vehicle);
    // Filter: available
    if (availableOnly) items = items.filter((s: any) => s.is_available);
    // Filter: verified
    if (verifiedOnly) items = items.filter((s: any) => s.profile?.identity_verified);
    // Filter: animal types
    if (animalTypes.length > 0 && !animalTypes.includes("Tous")) {
      const wanted = animalTypes.map(a => animalChipToType[a]).filter(Boolean);
      items = items.filter((s: any) => {
        const types: string[] = s.animal_types || [];
        return wanted.some(w => types.includes(w));
      });
    }
    // Filter: min sits
    if (minSits !== "all") {
      const min = parseInt(minSits);
      items = items.filter((s: any) => (s.profile?.completed_sits_count || 0) >= min);
    }

    // Enrich with reviews + badges + emergency
    const userIds = items.map((s: any) => s.user_id);
    const [allBadgesRes, emergencyRes] = userIds.length > 0
      ? await Promise.all([
          supabase.from("badge_attributions").select("user_id, badge_id").in("user_id", userIds),
          supabase.from("emergency_sitter_profiles").select("user_id, is_active").in("user_id", userIds).eq("is_active", true),
        ])
      : [{ data: [] as any[] }, { data: [] as any[] }] as const;

    const emergencySet = new Set((emergencyRes.data || []).map((e: any) => e.user_id));
    if (emergencyOnly) items = items.filter((s: any) => emergencySet.has(s.user_id));

    const badgeMap = new Map<string, Map<string, number>>();
    (allBadgesRes.data || []).forEach((b: any) => {
      if (!badgeMap.has(b.user_id)) badgeMap.set(b.user_id, new Map());
      const m = badgeMap.get(b.user_id)!;
      m.set(b.badge_id, (m.get(b.badge_id) || 0) + 1);
    });

    const enriched = await Promise.all(
      items.map(async (s: any) => {
        const { data: reviews } = await supabase
          .from("reviews").select("overall_rating")
          .eq("reviewee_id", s.user_id).eq("published", true);
        const avgRating = reviews && reviews.length > 0
          ? (reviews.reduce((sum: number, r: any) => sum + r.overall_rating, 0) / reviews.length)
          : null;
        const userBadges = badgeMap.get(s.user_id);
        const topBadges = userBadges
          ? Array.from(userBadges.entries()).map(([badge_key, count]) => ({ badge_key, count })).sort((a, b) => b.count - a.count).slice(0, 3)
          : [];
        return { ...s, avgRating, reviewCount: reviews?.length || 0, topBadges, isEmergency: emergencySet.has(s.user_id) };
      })
    );

    // Filter: min rating (post-enrichment)
    let final = enriched;
    if (minRating !== "all") {
      const min = parseFloat(minRating);
      final = final.filter((s: any) => s.avgRating !== null && s.avgRating >= min);
    }

    // Sort
    if (sort === "closest") {
      final.sort((a, b) => {
        if (a.isEmergency !== b.isEmergency) return a.isEmergency ? -1 : 1;
        return (a._dist ?? Infinity) - (b._dist ?? Infinity);
      });
    } else if (sort === "rating") {
      final.sort((a, b) => {
        if (a.isEmergency !== b.isEmergency) return a.isEmergency ? -1 : 1;
        return (b.avgRating || 0) - (a.avgRating || 0);
      });
    } else {
      final.sort((a, b) => {
        if (a.isEmergency !== b.isEmergency) return a.isEmergency ? -1 : 1;
        return (b.profile?.completed_sits_count || 0) - (a.profile?.completed_sits_count || 0);
      });
    }

    setResults(final);
    setLoading(false);
  }, [city, cityPostalCode, userPostalCode, radius, zoneMode, animalTypes, vehicled, availableOnly, verifiedOnly, emergencyOnly, minSits, minRating, sort, franceTotalSitters]);

  // Auto-search on filter change (debounced)
  useEffect(() => {
    if (!initialLoaded) return;
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => { handleSearch(); }, 400);
    return () => clearTimeout(debounceRef.current);
  }, [initialLoaded, city, cityPostalCode, radius, zoneMode, animalTypes, vehicled, availableOnly, verifiedOnly, emergencyOnly, minSits, minRating, sort, handleSearch]);

  const hasActiveFilters = vehicled || availableOnly || verifiedOnly || emergencyOnly || minSits !== "all" || minRating !== "all";
  const hasAnyRating = results.some((s: any) => s.avgRating !== null);

  // Zone helpers
  const refDept = getDeptCode(getZoneRefPostalCode());
  const refRegion = getRegionCode(refDept);
  const deptLabel = refDept ? `${refDept} ${DEPT_NAMES[refDept] || ""}`.trim() : "Département";
  const regionLabel = refRegion ? getRegionName(refDept) : "Région";

  // Suggest expanding when current zone is empty and a wider zone has results
  const suggestExpansion = (): { target: ZoneMode; count: number; label: string } | null => {
    if (results.length > 0) return null;
    if (zoneMode === "radius" && densityCounts.dept > 0) {
      return { target: "dept", count: densityCounts.dept, label: deptLabel };
    }
    if ((zoneMode === "radius" || zoneMode === "dept") && densityCounts.region > 0) {
      return { target: "region", count: densityCounts.region, label: regionLabel || "votre région" };
    }
    if (zoneMode !== "france" && densityCounts.france > 0) {
      return { target: "france", count: densityCounts.france, label: "France entière" };
    }
    return null;
  };

  const expansion = suggestExpansion();
  const isLaunchMode = (franceTotalSitters ?? 0) === 0;

  const resetFilters = () => {
    setVehicled(false);
    setAvailableOnly(false);
    setVerifiedOnly(false);
    setEmergencyOnly(false);
    setMinSits("all");
    setMinRating("all");
  };

  // Animal type helpers
  const animalLabel = animalTypes.length > 0
    ? animalTypes.length <= 2 ? animalTypes.join(", ") : `${animalTypes.length} types`
    : "Animaux";

  const toggleAnimal = (chip: string) => {
    if (chip === "Tous") { setAnimalTypes(prev => prev.includes("Tous") ? [] : ["Tous"]); return; }
    setAnimalTypes(prev => {
      const filtered = prev.filter(a => a !== "Tous");
      return filtered.includes(chip) ? filtered.filter(a => a !== chip) : [...filtered, chip];
    });
  };

  const pillBase = "flex items-center gap-2 px-4 py-2 rounded-full border border-border bg-card cursor-pointer hover:border-primary transition-colors text-sm whitespace-nowrap";
  const pillActive = "flex items-center gap-2 px-4 py-2 rounded-full border border-primary bg-primary/10 text-primary cursor-pointer transition-colors text-sm font-medium whitespace-nowrap";

  const sortPillBase = "rounded-full px-3 py-1 text-xs border border-border text-muted-foreground cursor-pointer hover:border-primary transition-colors";
  const sortPillActive = "rounded-full px-3 py-1 text-xs bg-foreground text-background cursor-pointer";

  // Zone mode chips
  const zoneChips: Array<{ key: ZoneMode; label: string; count: number; disabled?: boolean }> = [
    { key: "radius", label: `${radius[0]} km`, count: densityCounts.radius, disabled: !city },
    { key: "dept", label: refDept ? `Dép. ${refDept}` : "Département", count: densityCounts.dept, disabled: !refDept },
    { key: "region", label: refRegion ? (getRegionName(refDept) ?? "Région") : "Région", count: densityCounts.region, disabled: !refRegion },
    { key: "france", label: "France", count: densityCounts.france },
  ];

  return (
    <div className="animate-fade-in">
      {/* Title */}
      <div className="px-6 pt-6 pb-2 md:pt-10">
        <h1 className="font-heading text-3xl font-bold mb-1">Trouver un gardien</h1>
        <p className="text-muted-foreground">Recherchez le gardien idéal pour votre maison et vos animaux.</p>
      </div>

      {/* Sticky search bar */}
      <div className="sticky top-0 z-10 bg-background border-b border-border px-6 py-3 space-y-3">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
          {/* PILL 1 — Localisation */}
          <Popover open={openPop === "loc"} onOpenChange={(o) => setOpenPop(o ? "loc" : null)}>
            <PopoverTrigger asChild>
              <button className={city ? pillActive : pillBase}>
                <MapPin className="h-3.5 w-3.5 shrink-0" />
                {city || "Localisation"}
              </button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-72 p-3 space-y-3">
              <div className="relative">
                <Input
                  placeholder="Rechercher une ville..."
                  value={city}
                  onChange={(e) => { setCity(e.target.value); fetchCitySuggestions(e.target.value); }}
                  className="pr-10"
                />
                <button onClick={handleGeolocate} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary">
                  <Crosshair className="h-4 w-4" />
                </button>
              </div>
              {citySuggestions.length > 0 && (
                <div className="space-y-1">
                  {citySuggestions.map((s: any, i: number) => (
                    <button
                      key={i}
                      className="w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-muted transition-colors"
                      onClick={() => {
                        setCity(s.nom);
                        setCityPostalCode(s.codesPostaux?.[0] ?? null);
                        setCitySuggestions([]);
                        setOpenPop(null);
                      }}
                    >
                      <span className="font-medium">{s.nom}</span>
                      {s.codesPostaux?.[0] && <span className="text-muted-foreground ml-1">({s.codesPostaux[0]})</span>}
                    </button>
                  ))}
                </div>
              )}
            </PopoverContent>
          </Popover>

          {/* PILL 2 — Rayon (only meaningful in radius zone mode) */}
          {zoneMode === "radius" && (
            <Popover open={openPop === "rad"} onOpenChange={(o) => setOpenPop(o ? "rad" : null)}>
              <PopoverTrigger asChild>
                <button className={pillBase}>{radius[0]} km</button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-64 p-3 space-y-3">
                <div className="flex gap-2 flex-wrap">
                  {RADIUS_SHORTCUTS.map(r => (
                    <button key={r} onClick={() => setRadius([r])} className={`rounded-full px-3 py-1 text-xs border transition-colors ${radius[0] === r ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary"}`}>{r} km</button>
                  ))}
                </div>
                <Slider value={radius} onValueChange={setRadius} min={5} max={100} step={5} />
                <p className="text-xs text-muted-foreground text-center">{radius[0]} km</p>
              </PopoverContent>
            </Popover>
          )}

          {/* PILL 3 — Dates */}
          <Popover open={openPop === "dates"} onOpenChange={(o) => setOpenPop(o ? "dates" : null)}>
            <PopoverTrigger asChild>
              <button className={startDate || endDate ? pillActive : pillBase}>
                <Calendar className="h-3.5 w-3.5 shrink-0" />
                {startDate && endDate ? `${startDate} → ${endDate}` : "Dates"}
              </button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-72 p-3 space-y-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Du</label>
                <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Au</label>
                <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
              </div>
            </PopoverContent>
          </Popover>

          {/* PILL 4 — Animaux */}
          <Popover open={openPop === "animals"} onOpenChange={(o) => setOpenPop(o ? "animals" : null)}>
            <PopoverTrigger asChild>
              <button className={animalTypes.length > 0 ? pillActive : pillBase}>{animalLabel}</button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-56 p-3 space-y-2">
              {animalChips.map(chip => (
                <button key={chip} onClick={() => toggleAnimal(chip)} className={`block w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${animalTypes.includes(chip) ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted"}`}>{chip}</button>
              ))}
            </PopoverContent>
          </Popover>

          {/* PILL 5 — Filtres avancés */}
          <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
            <SheetTrigger asChild>
              <button className={pillBase + " relative"}>
                <SlidersHorizontal className="h-3.5 w-3.5 shrink-0" />
                Filtres
                {hasActiveFilters && <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-primary" />}
              </button>
            </SheetTrigger>
            <SheetContent side="right" className="w-80 overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-heading font-semibold text-lg">Filtres</h3>
                <button onClick={resetFilters} className="text-sm text-primary hover:underline">Réinitialiser</button>
              </div>

              <div className="space-y-6">
                {/* Section 1 — Disponibilité */}
                <div className="space-y-3">
                  <h4 className="text-sm font-medium">Disponibilité</h4>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm">Disponibles uniquement</p>
                      <p className="text-xs text-muted-foreground">Gardiens ayant activé leur mode disponible</p>
                    </div>
                    <Switch checked={availableOnly} onCheckedChange={setAvailableOnly} />
                  </div>
                </div>

                {/* Section 2 — Profil de confiance */}
                <div className="space-y-3">
                  <h4 className="text-sm font-medium">Profil de confiance</h4>
                  <div className="flex items-center justify-between">
                    <p className="text-sm">Profils vérifiés uniquement</p>
                    <Switch checked={verifiedOnly} onCheckedChange={setVerifiedOnly} />
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-sm flex items-center gap-1.5"><Zap className="h-3.5 w-3.5 text-amber-500" /> Gardiens d'urgence</p>
                    <Switch checked={emergencyOnly} onCheckedChange={setEmergencyOnly} />
                  </div>
                </div>

                {/* Section 3 — Mobilité */}
                <div className="space-y-3">
                  <h4 className="text-sm font-medium">Mobilité</h4>
                  <div className="flex items-center justify-between">
                    <p className="text-sm">Avec véhicule</p>
                    <Switch checked={vehicled} onCheckedChange={setVehicled} />
                  </div>
                </div>

                {/* Section 4 — Expérience */}
                <div className="space-y-3">
                  <h4 className="text-sm font-medium">Gardes validées minimum</h4>
                  <div className="flex gap-2 flex-wrap">
                    {[{ label: "Tous", value: "all" }, { label: "1+", value: "1" }, { label: "3+", value: "3" }, { label: "5+", value: "5" }].map(opt => (
                      <button key={opt.value} onClick={() => setMinSits(opt.value)} className={`rounded-full px-3 py-1 text-xs border transition-colors ${minSits === opt.value ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary"}`}>{opt.label}</button>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">Basé sur les gardes réalisées sur Guardiens</p>
                </div>

                {/* Section 5 — Note moyenne */}
                <div className={`space-y-3 ${!hasAnyRating ? "opacity-50 pointer-events-none" : ""}`}>
                  <h4 className="text-sm font-medium">Note minimum</h4>
                  <div className="flex gap-2 flex-wrap">
                    {[{ label: "Tous", value: "all" }, { label: "4+", value: "4" }, { label: "4.5+", value: "4.5" }, { label: "4.8+", value: "4.8" }].map(opt => (
                      <button key={opt.value} onClick={() => setMinRating(opt.value)} className={`rounded-full px-3 py-1 text-xs border transition-colors ${minRating === opt.value ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary"}`}>{opt.label}</button>
                    ))}
                  </div>
                  {!hasAnyRating ? (
                    <p className="text-xs text-muted-foreground italic">Disponible une fois les premières gardes réalisées sur Guardiens</p>
                  ) : (
                    <p className="text-xs text-muted-foreground">Disponible une fois les premières gardes réalisées</p>
                  )}
                </div>

                <Button onClick={() => setFiltersOpen(false)} className="w-full py-3 rounded-xl">Appliquer</Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>

        {/* Zone mode selector with density counters */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          <span className="text-xs text-muted-foreground shrink-0 mr-1">Zone&nbsp;:</span>
          {zoneChips.map((z) => {
            const active = zoneMode === z.key;
            return (
              <button
                key={z.key}
                onClick={() => {
                  if (z.disabled) return;
                  setZoneMode(z.key);
                  trackEvent("search_empty_action", { source: "owner", metadata: { action: "change_zone", zone_mode: z.key } });
                }}
                disabled={z.disabled}
                className={`shrink-0 rounded-full px-3 py-1 text-xs border transition-colors ${
                  active
                    ? "bg-primary text-primary-foreground border-primary"
                    : z.disabled
                      ? "border-border text-muted-foreground/50 cursor-not-allowed"
                      : "border-border text-muted-foreground hover:border-primary"
                }`}
                title={z.disabled ? "Renseignez une ville" : undefined}
              >
                {z.label} <span className="opacity-70">({z.count})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Sort bar + view toggle */}
      <div className="flex items-center justify-between px-6 py-2 border-b border-border">
        <div className="flex items-center gap-3">
          <p className="text-sm text-muted-foreground">{results.length} gardien{results.length !== 1 ? "s" : ""} disponible{results.length !== 1 ? "s" : ""}</p>
          <div className="flex gap-1.5">
            {[{ label: "Plus proches", value: "closest" as SortOption }, { label: "Mieux notés", value: "rating" as SortOption }, { label: "Plus expérimentés", value: "experience" as SortOption }].map(opt => (
              <button key={opt.value} onClick={() => setSort(opt.value)} className={sort === opt.value ? sortPillActive : sortPillBase}>{opt.label}</button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-1 border border-border rounded-lg p-0.5">
          <button onClick={() => setViewMode("list")} aria-label="Vue grille" className={`p-1.5 rounded ${viewMode === "list" ? "bg-muted" : ""}`}><LayoutGrid className="h-4 w-4" /></button>
          <button onClick={() => setViewMode("map")} aria-label="Vue carte" className={`p-1.5 rounded ${viewMode === "map" ? "bg-muted" : ""}`}><MapIcon className="h-4 w-4" /></button>
        </div>
      </div>

      {/* Results */}
      {viewMode === "list" ? (
        <div className="p-6">
          {loading ? (
            <p className="text-muted-foreground py-10 text-center">Recherche en cours...</p>
          ) : results.length === 0 ? (
            <div className="max-w-2xl mx-auto py-10 space-y-4">
              <div className="text-center">
                <h2 className="font-heading text-xl font-semibold mb-2">
                  {isLaunchMode
                    ? "Soyez parmi les premiers propriétaires"
                    : "Aucun gardien dans cette zone pour l'instant"}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {isLaunchMode
                    ? "La communauté de gardiens se construit. Créez une alerte pour être prévenu·e dès qu'un gardien rejoint votre zone."
                    : "Voici comment trouver le bon gardien quand même."}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Carte 1 — Élargir la zone (si une zone plus large a des résultats) */}
                {expansion && (
                  <button
                    onClick={() => {
                      setZoneMode(expansion.target);
                      trackEvent("search_empty_action", { source: "owner", metadata: { action: "expand_zone", from: zoneMode, to: expansion.target } });
                    }}
                    className="text-left p-4 rounded-xl border border-primary bg-primary/5 hover:bg-primary/10 transition-colors"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <MapPin className="h-4 w-4 text-primary" />
                      <span className="font-medium text-sm">Élargir à {expansion.label}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {expansion.count} gardien{expansion.count > 1 ? "s" : ""} disponible{expansion.count > 1 ? "s" : ""}.
                    </p>
                  </button>
                )}

                {/* Carte 2 — Créer une alerte */}
                <button
                  onClick={handleCreateAlert}
                  disabled={!city || alertCreated || isCreatingAlert}
                  className="text-left p-4 rounded-xl border border-border bg-card hover:border-primary transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <div className="flex items-center gap-2 mb-1">
                    {alertCreated ? <BellRing className="h-4 w-4 text-primary" /> : isCreatingAlert ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bell className="h-4 w-4 text-primary" />}
                    <span className="font-medium text-sm">
                      {alertCreated ? "Alerte créée" : "Me prévenir par e-mail"}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {!city
                      ? "Renseignez une ville pour activer l'alerte."
                      : alertCreated
                        ? `Vous serez alerté·e dès qu'un gardien rejoint la zone autour de ${city}.`
                        : `Recevez un e-mail dès qu'un gardien s'inscrit près de ${city}.`}
                  </p>
                </button>

                {/* Carte 3 — Inviter un voisin */}
                <button
                  onClick={handleShareInvite}
                  className="text-left p-4 rounded-xl border border-border bg-card hover:border-primary transition-colors"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Share2 className="h-4 w-4 text-primary" />
                    <span className="font-medium text-sm">Inviter un voisin de confiance</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Vous connaissez quelqu'un de fiable près de chez vous ? Invitez-le à rejoindre Guardiens.
                  </p>
                </button>

                {/* Carte 4 — Publier annonce visible */}
                <button
                  onClick={() => {
                    trackEvent("search_empty_action", { source: "owner", metadata: { action: "create_sit", zone_mode: zoneMode } });
                    navigate("/sits/create");
                  }}
                  className="text-left p-4 rounded-xl border border-border bg-card hover:border-primary transition-colors"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Calendar className="h-4 w-4 text-primary" />
                    <span className="font-medium text-sm">Publier une annonce de garde</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Les gardiens reçoivent une alerte dès qu'une garde s'ouvre dans leur zone.
                  </p>
                </button>
              </div>

              {hasActiveFilters && (
                <div className="text-center pt-2">
                  <button onClick={resetFilters} className="text-xs text-primary hover:underline">
                    Réinitialiser les filtres avancés
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {results.map((s: any) => {
                const profile = s.profile;
                const sitterAnimalTypes: string[] = s.animal_types || [];
                const firstName = profile?.first_name || "Gardien";
                const bio = profile?.bio ? (profile.bio.length > 60 ? profile.bio.slice(0, 60) + "…" : profile.bio) : null;
                const distLabel = s._dist !== null && s._dist !== undefined && s._dist !== Infinity ? `${s._dist} km` : null;

                return (
                  <div key={s.id} className="bg-card rounded-xl overflow-hidden border border-border hover:shadow-md transition-shadow flex flex-col max-w-sm">
                    {/* Photo — carré, visage en haut */}
                    <Link to={`/gardiens/${s.user_id}`} className="block relative">
                      {profile?.avatar_url ? (
                        <div className="aspect-square w-full overflow-hidden rounded-t-lg">
                          <img src={profile.avatar_url} alt={firstName} className="w-full h-full object-cover object-top" />
                        </div>
                      ) : (
                        <div className="aspect-square w-full overflow-hidden rounded-t-lg bg-primary/10 flex items-center justify-center">
                          <span className="text-3xl text-primary font-heading font-bold">{firstName.charAt(0)}</span>
                        </div>
                      )}
                      {s.isEmergency && (
                        <span className="absolute top-2 left-2 flex items-center gap-1 bg-card/90 rounded-full px-2 py-0.5 text-[11px] font-medium">
                          <Zap className="h-3 w-3 text-amber-500" /> Urgence
                        </span>
                      )}
                    </Link>

                    {/* Body */}
                    <div className="p-3 flex flex-col flex-1">
                      {/* Line 1: name + verified pill + city + distance */}
                      <Link to={`/gardiens/${s.user_id}`}>
                        <p className="text-sm font-semibold truncate">
                          {firstName}
                          {profile?.identity_verified && (
                            <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium ml-1.5 inline-block align-middle">✓ Vérifié</span>
                          )}
                          {profile?.city && <span className="text-muted-foreground font-normal"> · {profile.city}</span>}
                          {distLabel && <span className="text-muted-foreground font-normal"> · {distLabel}</span>}
                        </p>
                      </Link>

                      {/* Line 2: rating + experience */}
                      <div className="flex items-center gap-2 mt-1">
                        {s.avgRating !== null && (
                          <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
                            <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                            {s.avgRating.toFixed(1)}
                          </span>
                        )}
                        {(profile?.completed_sits_count || 0) > 0 && (
                          <span className="text-xs text-muted-foreground">{profile.completed_sits_count} garde{profile.completed_sits_count > 1 ? "s" : ""}</span>
                        )}
                      </div>

                      {/* Line 3: animal pills */}
                      {sitterAnimalTypes.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {sitterAnimalTypes.slice(0, 3).map((a: string) => (
                            <span key={a} className="text-[11px] bg-muted rounded-full px-2 py-0.5">{a}</span>
                          ))}
                          {sitterAnimalTypes.length > 3 && (
                            <span className="text-[11px] text-muted-foreground">+{sitterAnimalTypes.length - 3}</span>
                          )}
                        </div>
                      )}

                      {/* Line 4: bio truncated */}
                      {bio && <p className="text-xs text-muted-foreground mt-1.5 line-clamp-1">{bio}</p>}

                      {/* CTA */}
                      <Button
                        size="sm"
                        onClick={(e) => { e.preventDefault(); handleContact(s.user_id); }}
                        disabled={contactingId === s.user_id}
                        className="w-full mt-auto pt-2"
                      >
                        <MessageCircle className="h-3.5 w-3.5" />
                        {contactingId === s.user_id ? "..." : `Contacter ${firstName}`}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        <div className="flex h-[calc(100vh-220px)]">
          <div className="w-1/2 overflow-y-auto border-r border-border p-4 space-y-3">
            {results.map((s: any) => {
              const profile = s.profile;
              const firstName = profile?.first_name || "Gardien";
              return (
                <div key={s.id} className="flex gap-3 p-3 rounded-xl border border-border hover:shadow-sm transition-shadow cursor-pointer" onClick={() => navigate(`/gardiens/${s.user_id}`)}>
                  {profile?.avatar_url ? (
                    <img src={profile.avatar_url} alt={firstName} className="h-14 w-14 rounded-xl object-cover shrink-0" />
                  ) : (
                    <div className="h-14 w-14 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <span className="text-lg text-primary font-bold">{firstName.charAt(0)}</span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{firstName}</p>
                    {s._dist !== null && s._dist !== Infinity && <p className="text-xs text-muted-foreground">📍 {s._dist} km</p>}
                    <div className="flex gap-3 text-xs text-muted-foreground mt-0.5">
                      {s.avgRating !== null && <span className="flex items-center gap-0.5"><Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />{s.avgRating.toFixed(1)}</span>}
                      {(profile?.completed_sits_count || 0) > 0 && <span>{profile.completed_sits_count} garde{profile.completed_sits_count > 1 ? "s" : ""}</span>}
                    </div>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); handleContact(s.user_id); }} className="shrink-0 self-center px-3 py-1.5 text-xs bg-primary text-primary-foreground rounded-lg font-medium">Contacter</button>
                </div>
              );
            })}
          </div>
          <div className="w-1/2 flex items-center justify-center bg-muted/30 text-muted-foreground text-sm">
            Vue carte à venir
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchOwner;
