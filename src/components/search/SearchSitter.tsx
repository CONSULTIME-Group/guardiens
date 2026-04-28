import { useState, useEffect, useCallback, useRef, lazy, Suspense } from "react";
import FounderBadge from "@/components/badges/FounderBadge";
import ReportButton from "@/components/reports/ReportButton";
import { Sprout, PawPrint, GraduationCap, Handshake as HandshakeIcon, LayoutGrid, Map as MapIcon, Cat, Bird, SlidersHorizontal, ShieldCheck, Crosshair, Bell, BellRing, Loader2 } from "lucide-react";
import EnvironmentPills from "@/components/shared/EnvironmentPills";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";

const SearchMapView = lazy(() => import("@/components/search/SearchMapView"));
import { DEMO_SITS, DEMO_MISSIONS, interleaveDemos, auditInterleave } from "@/data/demoListings";
import { normalize } from "@/lib/normalize";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, MapPin, Calendar, Star, Lock, Zap, Sparkles } from "lucide-react";
import { format, differenceInDays, differenceInHours } from "date-fns";
import { fr } from "date-fns/locale";
import { geocodeCity, haversineDistance } from "@/lib/geocode";
import { ALLOWED_ALERT_RADII, snapToAllowedRadius } from "@/lib/alertRadius";
import { useSubscriptionAccess } from "@/hooks/useSubscriptionAccess";
import FavoriteButton from "@/components/shared/FavoriteButton";
import { getDeptCode, DEPT_NAMES } from "@/lib/departments";
import { getRegionCode, getRegionName, getDeptsInRegion, REGION_NAMES, DEPT_TO_REGION } from "@/lib/regions";
import { trackEvent } from "@/lib/analytics";

const animalChips = ["Chiens", "Chats", "Chevaux", "Animaux de ferme", "NAC"];
const animalChipToSpecies: Record<string, string> = {
  Chiens: "dog", Chats: "cat", Chevaux: "horse",
  "Animaux de ferme": "farm_animal", NAC: "nac",
};
const speciesIcon: Record<string, typeof PawPrint> = {
  dog: PawPrint, cat: Cat, horse: PawPrint, bird: Bird, rodent: PawPrint,
  fish: PawPrint, reptile: PawPrint, farm_animal: Bird, nac: PawPrint,
};

const RADIUS_SHORTCUTS = [5, 10, 15, 30, 50];

type SortOption = "closest" | "recent" | "rating";
type SearchTab = "sits" | "missions";
type MissionSubTab = "published" | "members";
type ViewMode = "list" | "map";
type HousingFilter = "all" | "house" | "apartment" | "farm";
type ExperienceFilter = "all" | "1" | "3";
type ZoneMode = "radius" | "dept" | "region" | "france";

const SearchSitter = () => {
  const { user } = useAuth();
  const { hasAccess } = useSubscriptionAccess();
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const [tab, setTab] = useState<SearchTab>("sits");
  const [missionSubTab, setMissionSubTab] = useState<MissionSubTab>("published");
  const [missionTypeFilter, setMissionTypeFilter] = useState<"all" | "besoin" | "offre">("all");
  const [missionCategoryFilter, setMissionCategoryFilter] = useState<"all" | "garden" | "animals" | "skills" | "house">("all");
  const [availableMembers, setAvailableMembers] = useState<any[]>([]);
  const [city, setCity] = useState("");
  const [radius, setRadius] = useState([15]);
  const [zoneMode, setZoneMode] = useState<ZoneMode>(() => {
    if (typeof window === "undefined") return "radius";
    const saved = localStorage.getItem("search.zoneMode");
    return saved === "radius" || saved === "dept" || saved === "region" || saved === "france" ? saved : "radius";
  });
  const [densityCounts, setDensityCounts] = useState<{ radius: number; dept: number; region: number; france: number }>({ radius: 0, dept: 0, region: 0, france: 0 });
  const [userPostalCode, setUserPostalCode] = useState<string | null>(null);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [animalTypes, setAnimalTypes] = useState<string[]>([]);
  const [housingTypes, setHousingTypes] = useState<HousingFilter[]>([]);
  const [duration, setDuration] = useState("all");
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [withPhotosOnly, setWithPhotosOnly] = useState(false);
  const [minExperience, setMinExperience] = useState<ExperienceFilter>("all");
  const [emergencyOnly, setEmergencyOnly] = useState(searchParams.get("emergency") === "true");
  // Mode test démos : ?testDemos=1 dans l'URL active un panneau de diagnostic
  // qui vérifie la présence + l'intercalation des annonces d'exemple sur tous
  // les types de recherche (gardes, missions, membres). N'a aucun effet sur la
  // logique de tri/filtre — purement instrumental.
  const testDemoMode = searchParams.get("testDemos") === "1";
  // Historique de vérification (mode test) — une ligne par changement de filtre clé
  type DemoCheckRow = {
    ts: number;
    trigger: "city" | "startDate" | "endDate" | "sort" | "tab";
    tab: string;
    city: string;
    startDate: string;
    endDate: string;
    sort: string;
    real: number;
    demo: number;
    positions: number[];
    interleaveOk: boolean;
  };
  const [demoCheckHistory, setDemoCheckHistory] = useState<DemoCheckRow[]>([]);

  const [sort, setSort] = useState<SortOption>("closest");
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [cityPostalCode, setCityPostalCode] = useState<string | null>(null);
  const [alertCreated, setAlertCreated] = useState(false);
  const [isCreatingAlert, setIsCreatingAlert] = useState(false);
  const [crossTabCount, setCrossTabCount] = useState<number | null>(null);
  const [launchModeCount, setLaunchModeCount] = useState<number | null>(null);
  const [nearbyZones, setNearbyZones] = useState<{ deptCode: string; deptName: string; regionCode: string; regionName: string; count: number }[]>([]);
  const [nearbyRegions, setNearbyRegions] = useState<{ regionCode: string; regionName: string; count: number }[]>([]);

  const [results, setResults] = useState<any[]>([]);
  const [resultCoords, setResultCoords] = useState<Map<string, { lat: number; lng: number }>>(new Map());
  const [loading, setLoading] = useState(false);
  const [userCity, setUserCity] = useState("");
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [sitterEligible, setSitterEligible] = useState(false);
  const [userCompletedSits, setUserCompletedSits] = useState(0);
  const [sitterProfile, setSitterProfile] = useState<any>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const initialLoadDone = useRef(false);

  // Pill popover states
  const [editingCity, setEditingCity] = useState(false);
  const [cityInput, setCityInput] = useState("");
  const [citySuggestions, setCitySuggestions] = useState<{ nom: string; codesPostaux?: string[] }[]>([]);
  const [showMoreAnimals, setShowMoreAnimals] = useState(false);

  // Environment (visual only for now)
  const [environments, setEnvironments] = useState<string[]>([]);
  const envOptions = [
    { key: "city", label: "🏙️ Ville" },
    { key: "countryside", label: "🌿 Campagne" },
    { key: "mountain", label: "⛰️ Montagne" },
    { key: "lake", label: "🏞️ Lac" },
    { key: "vineyard", label: "🍇 Vignes" },
    { key: "forest", label: "🌲 Forêt" },
  ];

  // Derive housingType for existing filter logic (backward compat)
  const housingType = housingTypes.length === 1 ? housingTypes[0] : "all";

  const hasActiveFilters = housingTypes.length > 0 || verifiedOnly || withPhotosOnly || minExperience !== "all" || environments.length > 0;

  // ─── City autocomplete via geo.api.gouv.fr ───
  // Comportement unifié : on normalise (sans accents/casse) côté client puis
  // on aiguille vers l'endpoint pertinent — `codePostal` pour 5 chiffres,
  // `nom` sinon (l'API gère le fuzzy ascii).
  const citySearchTimeout = useRef<NodeJS.Timeout | null>(null);
  const handleCityInputChange = (val: string) => {
    setCityInput(val);
    if (citySearchTimeout.current) clearTimeout(citySearchTimeout.current);
    const q = normalize(val);
    if (q.length < 2) { setCitySuggestions([]); return; }
    citySearchTimeout.current = setTimeout(async () => {
      try {
        const isCp = /^\d{5}$/.test(q);
        const url = isCp
          ? `https://geo.api.gouv.fr/communes?codePostal=${encodeURIComponent(q)}&fields=nom,codesPostaux&limit=8`
          : `https://geo.api.gouv.fr/communes?nom=${encodeURIComponent(q)}&fields=nom,codesPostaux&boost=population&limit=8`;
        const res = await fetch(url);
        const data: { nom: string; codesPostaux?: string[] }[] = await res.json();
        // Tri local : correspondance exacte (sans accents) > préfixe > contient
        // Conserve l'ordre d'origine (pertinence/population) à rang égal
        const rank = (nom: string) => {
          const n = normalize(nom);
          if (n === q) return 0;
          if (n.startsWith(q)) return 1;
          if (n.includes(q)) return 2;
          return 3;
        };
        const sorted = (data || [])
          .map((c, i) => ({ c, i, r: rank(c.nom) }))
          .sort((a, b) => a.r - b.r || a.i - b.i)
          .map(({ c }) => c);
        setCitySuggestions(sorted);
      } catch { setCitySuggestions([]); }
    }, 250);
  };

  const handleCitySelect = (name: string, postalCode?: string) => {
    setCityInput(name);
    setCity(name);
    setCityPostalCode(postalCode ?? null);
    setCitySuggestions([]);
    setEditingCity(false);
  };

  // ─── Suggestions département & région (locales, dérivées de la saisie) ───
  // (normalize est importé depuis @/lib/normalize — comportement unifié partout)

  // Renvoie un code postal "représentatif" du département (pour piloter le mode Zone)
  const deptToRefPostalCode = (dept: string): string => {
    if (dept === "2A") return "20000";
    if (dept === "2B") return "20200";
    if (dept.startsWith("97")) return `${dept}00`;
    return `${dept}000`;
  };

  // Extrait un code département depuis la saisie : "69", "069", "69000", "75012", "2A"…
  const extractDeptCodeFromInput = (raw: string): string | null => {
    const v = raw.trim().toUpperCase().replace(/\s+/g, "");
    if (/^2[AB]$/.test(v)) return v;
    if (/^2[AB]\d{3}$/.test(v)) return v.slice(0, 2); // 2A001, 2B200
    if (/^\d{5}$/.test(v)) {
      // Code postal → DOM (97x) ou métropole (2 premiers chiffres)
      if (v.startsWith("97") || v.startsWith("98")) return v.slice(0, 3);
      // Corse : 200xx/201xx → 2A, 202xx-206xx → 2B (approx)
      if (v.startsWith("20")) {
        const n = parseInt(v.slice(2), 10);
        return n < 200 ? "2A" : "2B";
      }
      return v.slice(0, 2);
    }
    if (/^\d{1,3}$/.test(v)) {
      const n = parseInt(v, 10);
      // 1-95 = métropole, 971-976 = DOM
      if ((n >= 1 && n <= 95) || (n >= 971 && n <= 976)) {
        return v.length === 1 ? `0${v}` : v;
      }
    }
    return null;
  };

  const primaryDeptCode = extractDeptCodeFromInput(cityInput);

  const deptSuggestions = (() => {
    const q = normalize(cityInput.trim());
    if (q.length < 2 && !primaryDeptCode) return [] as { code: string; name: string; isPrimary?: boolean }[];

    const matches: { code: string; name: string; isPrimary?: boolean }[] = [];
    const seen = new Set<string>();

    // 1. Match prioritaire via CP/numéro extrait
    if (primaryDeptCode && DEPT_NAMES[primaryDeptCode]) {
      matches.push({ code: primaryDeptCode, name: DEPT_NAMES[primaryDeptCode], isPrimary: true });
      seen.add(primaryDeptCode);
    }

    // 2. Match texte / code partiel
    Object.entries(DEPT_NAMES).forEach(([code, name]) => {
      if (seen.has(code)) return;
      const nName = normalize(name);
      if (code.toLowerCase().startsWith(q) || nName.includes(q)) {
        matches.push({ code, name });
        seen.add(code);
      }
    });

    return matches.slice(0, 4);
  })();

  const regionSuggestions = (() => {
    const q = normalize(cityInput.trim());
    if (q.length < 2) return [] as { code: string; name: string }[];
    return Object.entries(REGION_NAMES)
      .filter(([, name]) => normalize(name).includes(q))
      .slice(0, 3)
      .map(([code, name]) => ({ code, name }));
  })();

  const handleDeptSelect = (deptCode: string) => {
    const name = DEPT_NAMES[deptCode] || deptCode;
    const refCp = deptToRefPostalCode(deptCode);
    setCityInput(`${deptCode} · ${name}`);
    setCity(name);
    setCityPostalCode(refCp);
    setCitySuggestions([]);
    setZoneMode("dept");
    setEditingCity(false);
  };

  const handleRegionSelect = (regionCode: string) => {
    const name = REGION_NAMES[regionCode] || regionCode;
    // CP de référence : premier département de la région
    const firstDept = Object.entries(DEPT_TO_REGION).find(([, r]) => r === regionCode)?.[0];
    const refCp = firstDept ? deptToRefPostalCode(firstDept) : null;
    setCityInput(name);
    setCity(name);
    setCityPostalCode(refCp);
    setCitySuggestions([]);
    setZoneMode("region");
    setEditingCity(false);
  };

  const handleGeolocation = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      setUserCoords(coords);
      try {
        const res = await fetch(`https://geo.api.gouv.fr/communes?lat=${coords.lat}&lon=${coords.lng}&fields=nom&limit=1`);
        const data = await res.json();
        if (data?.[0]?.nom) {
          setCityInput(data[0].nom);
          setCity(data[0].nom);
          setUserCity(data[0].nom);
        }
      } catch { /* silently fail */ }
      setEditingCity(false);
    });
  };

  // Load user profile & eligibility
  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const [profileRes, spRes, eligRes, reviewsRes, myProfileRes] = await Promise.all([
        supabase.from("profiles").select("city, postal_code").eq("id", user.id).single(),
        supabase.from("sitter_profiles").select("*").eq("user_id", user.id).maybeSingle(),
        supabase.from("applications").select("id, sit:sits!inner(status)").eq("sitter_id", user.id).eq("status", "accepted"),
        supabase.from("reviews").select("overall_rating").eq("reviewee_id", user.id).eq("published", true),
        supabase.from("profiles").select("identity_verified").eq("id", user.id).single(),
      ]);
      const uc = profileRes.data?.city || "";
      setUserCity(uc);
      setUserPostalCode(profileRes.data?.postal_code || null);
      setSitterProfile(spRes.data);
      if (uc) {
        setCity(uc);
        setCityInput(uc);
        const coords = await geocodeCity(uc);
        if (coords) setUserCoords(coords);
      }
      const completedSits = (eligRes.data || []).filter((a: any) => a.sit?.status === "completed").length;
      setUserCompletedSits(completedSits);
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
    } else {
      if (missionSubTab === "members") {
        await searchAvailableMembers(searchCoords);
      } else {
        await searchMissions(searchCoords);
      }
    }
    setLoading(false);
  }, [tab, missionSubTab, city, radius, zoneMode, startDate, endDate, animalTypes, housingType, duration, verifiedOnly, emergencyOnly, sort, userCoords, userCity, userPostalCode, missionTypeFilter, missionCategoryFilter, withPhotosOnly, minExperience, environments]);

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

  // Reset alert state when city or radius changes
  useEffect(() => {
    setAlertCreated(false);
  }, [city, radius]);

  // ─── Mode test démos : snapshot à chaque changement de filtre clé ───
  const lastDemoFiltersRef = useRef<{ city: string; startDate: string; endDate: string; sort: string; tab: string } | null>(null);
  useEffect(() => {
    if (!testDemoMode) return;
    if (loading) return; // attendre fin de la recherche
    const inMembersTab = tab === "missions" && missionSubTab === "members";
    const list = inMembersTab ? availableMembers : results;
    const tabKey = inMembersTab ? "members" : tab;
    const prev = lastDemoFiltersRef.current;
    let trigger: DemoCheckRow["trigger"] | null = null;
    if (!prev) trigger = "tab";
    else if (prev.tab !== tabKey) trigger = "tab";
    else if (prev.city !== city) trigger = "city";
    else if (prev.startDate !== startDate) trigger = "startDate";
    else if (prev.endDate !== endDate) trigger = "endDate";
    else if (prev.sort !== sort) trigger = "sort";
    if (!trigger) return;
    lastDemoFiltersRef.current = { city, startDate, endDate, sort, tab: tabKey };

    const positions = list
      .map((it: any, i: number) => (it?.is_demo ? i + 1 : -1))
      .filter((i) => i !== -1);
    const real = list.length - positions.length;
    const interleaveOk = inMembersTab
      ? true
      : positions.length === 0
        ? real === 0
        : positions.every((pos) => {
            const idx = pos - 1;
            if (real >= 3) return (idx + 1) % 4 === 0 || idx >= real;
            return idx >= real;
          });

    setDemoCheckHistory((h) =>
      [
        {
          ts: Date.now(),
          trigger: trigger!,
          tab: tabKey,
          city,
          startDate,
          endDate,
          sort,
          real,
          demo: positions.length,
          positions,
          interleaveOk,
        },
        ...h,
      ].slice(0, 15),
    );
  }, [testDemoMode, loading, results, availableMembers, tab, missionSubTab, city, startDate, endDate, sort]);


  // Persist zone mode preference for next visit
  useEffect(() => {
    if (typeof window === "undefined") return;
    try { localStorage.setItem("search.zoneMode", zoneMode); } catch { /* ignore quota */ }
  }, [zoneMode]);

  // Track out-of-zone banner impression (déduplique par tab+zoneMode dans la session)
  const outOfZoneTrackedRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (loading || tab !== "sits" || !userPostalCode || zoneMode === "france") return;
    const delta = densityCounts.france - densityCounts.radius;
    if (delta <= 0) return;
    const key = `${tab}|${zoneMode}|${delta}`;
    if (outOfZoneTrackedRef.current.has(key)) return;
    outOfZoneTrackedRef.current.add(key);
    trackEvent("search_outofzone_impression", {
      source: "search_outofzone",
      metadata: {
        tab,
        zone_mode: zoneMode,
        radius_km: radius[0],
        count_radius: densityCounts.radius,
        count_dept: densityCounts.dept,
        count_region: densityCounts.region,
        count_france: densityCounts.france,
        delta,
        has_local: densityCounts.radius > 0,
        city: city || null,
      },
    });
  }, [loading, tab, zoneMode, userPostalCode, densityCounts, radius, city]);

  // Compute cross-tab count + global launch count + nearby zones breakdown when results are empty
  useEffect(() => {
    if (loading || results.length > 0) {
      setCrossTabCount(null);
      setLaunchModeCount(null);
      setNearbyZones([]);
      setNearbyRegions([]);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const refDept = getDeptCode(getZoneRefPostalCode());
        const refRegion = getRegionCode(refDept);

        const [otherTabRes, sitsAllRes, missionsAllRes, breakdownRes] = await Promise.all([
          tab === "sits"
            ? supabase.from("small_missions").select("id", { count: "exact", head: true }).eq("status", "open")
            : supabase.from("sits").select("id", { count: "exact", head: true }).eq("status", "published"),
          supabase.from("sits").select("id", { count: "exact", head: true }).eq("status", "published"),
          supabase.from("small_missions").select("id", { count: "exact", head: true }).eq("status", "open"),
          tab === "sits"
            ? supabase.from("sits").select("owner:profiles!sits_user_id_fkey(postal_code)").in("status", ["published", "confirmed", "in_progress"]).limit(500)
            : supabase.from("small_missions").select("postal_code").eq("status", "open").limit(500),
        ]);
        if (cancelled) return;
        setCrossTabCount(otherTabRes.count ?? 0);
        setLaunchModeCount((sitsAllRes.count ?? 0) + (missionsAllRes.count ?? 0));

        // Aggregate by dept / region, excluding the user's own zone
        const deptAgg = new Map<string, number>();
        const regionAgg = new Map<string, number>();
        for (const row of (breakdownRes.data || []) as any[]) {
          const cp = row?.postal_code || row?.owner?.postal_code || null;
          const dept = getDeptCode(cp);
          if (!dept) continue;
          const region = getRegionCode(dept);
          if (!region) continue;
          if (refDept && dept === refDept) continue; // skip current dept
          deptAgg.set(dept, (deptAgg.get(dept) || 0) + 1);
          regionAgg.set(region, (regionAgg.get(region) || 0) + 1);
        }

        const topDepts = Array.from(deptAgg.entries())
          .map(([deptCode, count]) => {
            const regionCode = getRegionCode(deptCode) || "";
            return {
              deptCode,
              deptName: DEPT_NAMES[deptCode] || deptCode,
              regionCode,
              regionName: getRegionName(deptCode) || "",
              count,
            };
          })
          .sort((a, b) => b.count - a.count)
          .slice(0, 4);

        const topRegions = Array.from(regionAgg.entries())
          .filter(([code]) => !refRegion || code !== refRegion)
          .map(([regionCode, count]) => ({
            regionCode,
            regionName: getRegionName(getDeptsInRegion(regionCode)[0] || null) || regionCode,
            count,
          }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 4);

        setNearbyZones(topDepts);
        setNearbyRegions(topRegions);
      } catch {
        if (!cancelled) {
          setCrossTabCount(0);
          setLaunchModeCount(0);
          setNearbyZones([]);
          setNearbyRegions([]);
        }
      }
    })();
    return () => { cancelled = true; };
  }, [loading, results.length, tab, cityPostalCode, userPostalCode]);

  const handleCreateAlert = async () => {
    if (!city || alertCreated || isCreatingAlert) return;
    setIsCreatingAlert(true);

    // Snap au rayon autorisé le plus proche (la RPC n'accepte que 5/15/30/50/100)
    let usedRadius = snapToAllowedRadius(radius[0]);
    let { data, error } = await supabase.rpc("create_alert_from_search", {
      p_city: city,
      p_postal_code: cityPostalCode ?? null,
      p_radius_km: usedRadius,
    });

    // Fallback : si INVALID_RADIUS (désync UI / cache), on réessaye une fois avec 15 km
    if (error && (error.message || "").includes("INVALID_RADIUS")) {
      console.warn("[create_alert_from_search] INVALID_RADIUS, retry with 15km", {
        attempted: usedRadius,
        original: radius[0],
      });
      usedRadius = 15;
      ({ data, error } = await supabase.rpc("create_alert_from_search", {
        p_city: city,
        p_postal_code: cityPostalCode ?? null,
        p_radius_km: usedRadius,
      }));
      if (!error) {
        setRadius([usedRadius]);
      }
    }

    setIsCreatingAlert(false);
    if (error) {
      const msg = error.message || "";
      if (msg.includes("DOUBLON")) {
        toast({ title: "Vous avez déjà cette alerte", description: "Une alerte identique existe déjà pour cette zone." });
        setAlertCreated(true);
      } else if (msg.includes("MAX_ZONES")) {
        toast({
          variant: "destructive",
          title: "Maximum atteint",
          description: "Vous avez déjà 3 alertes actives. Supprimez-en une dans vos paramètres.",
          action: <ToastAction altText="Gérer mes alertes" onClick={() => navigate("/settings")}>Gérer</ToastAction>,
        });
      } else if (msg.includes("INVALID_CITY")) {
        toast({ variant: "destructive", title: "Ville requise", description: "Sélectionnez une ville avant de créer une alerte." });
      } else if (msg.includes("INVALID_RADIUS")) {
        toast({
          variant: "destructive",
          title: "Rayon non disponible",
          description: "Choisissez un rayon parmi 5, 15, 30, 50 ou 100 km, puis réessayez.",
        });
      } else {
        toast({ variant: "destructive", title: "Erreur", description: "Une erreur est survenue. Veuillez réessayer." });
      }
    } else {
      toast({
        title: "Alerte créée",
        description: `Vous recevrez chaque matin les nouvelles gardes près de ${city} (rayon ${usedRadius} km).`,
        action: <ToastAction altText="Personnaliser" onClick={() => navigate("/settings")}>Personnaliser</ToastAction>,
      });
      setAlertCreated(true);
    }
  };

  const computeDistance = (ownerCity: string, cityCoords: Map<string, { lat: number; lng: number }>, searchCoords: { lat: number; lng: number } | null) => {
    if (!searchCoords) return null;
    const coords = cityCoords.get(ownerCity);
    if (!coords) return null;
    return haversineDistance(searchCoords.lat, searchCoords.lng, coords.lat, coords.lng);
  };

  // Reference postal code for dept/region zone modes (selected city if available, else user CP)
  const getZoneRefPostalCode = (): string | null => cityPostalCode ?? userPostalCode;

  const filterByLocation = async (
    items: any[],
    getCityFn: (item: any) => string | undefined,
    searchCoords: { lat: number; lng: number } | null,
    getPostalCodeFn?: (item: any) => string | undefined,
  ) => {
    const cityCoords = new Map<string, { lat: number; lng: number }>();
    const uniqueCities = [...new Set(items.map(getCityFn).filter(Boolean))] as string[];
    await Promise.all(uniqueCities.map(async (c) => {
      const coords = await geocodeCity(c);
      if (coords) cityCoords.set(c, { lat: coords.lat, lng: coords.lng });
    }));

    // Compute density counts for each zone mode (always, for the counter UI)
    const refDept = getDeptCode(getZoneRefPostalCode());
    const refRegion = getRegionCode(refDept);
    const radiusCount = searchCoords ? items.filter((s) => {
      const c = getCityFn(s); if (!c) return false;
      const co = cityCoords.get(c); if (!co) return false;
      return haversineDistance(searchCoords.lat, searchCoords.lng, co.lat, co.lng) <= radius[0];
    }).length : 0;
    const deptCount = refDept ? items.filter((s) => {
      const cp = getPostalCodeFn?.(s); return cp ? getDeptCode(cp) === refDept : false;
    }).length : 0;
    const regionCount = refRegion ? items.filter((s) => {
      const cp = getPostalCodeFn?.(s); return cp ? getRegionCode(getDeptCode(cp)) === refRegion : false;
    }).length : 0;
    setDensityCounts({ radius: radiusCount, dept: deptCount, region: regionCount, france: items.length });

    // Apply the selected zone filter
    let filtered = items;
    if (zoneMode === "radius") {
      if (!searchCoords) return { items, cityCoords };
      filtered = items.filter((s) => {
        const ownerCity = getCityFn(s); if (!ownerCity) return false;
        const coords = cityCoords.get(ownerCity); if (!coords) return false;
        return haversineDistance(searchCoords.lat, searchCoords.lng, coords.lat, coords.lng) <= radius[0];
      });
    } else if (zoneMode === "dept" && refDept) {
      filtered = items.filter((s) => {
        const cp = getPostalCodeFn?.(s); return cp ? getDeptCode(cp) === refDept : false;
      });
    } else if (zoneMode === "region" && refRegion) {
      filtered = items.filter((s) => {
        const cp = getPostalCodeFn?.(s); return cp ? getRegionCode(getDeptCode(cp)) === refRegion : false;
      });
    }
    // zoneMode === "france" → no filter
    return { items: filtered, cityCoords };
  };

  const searchSits = async (searchCoords: { lat: number; lng: number } | null) => {
    // Show published + assigned (confirmed/in_progress) + completed so members see history
    // and the page feels lived-in. Completed/assigned cards are rendered greyed-out and
    // non-clickable so they only add volume without polluting actionable results.
    // `profiles` table has restrictive RLS (owner-only) so its embedded join returns null
    // for other owners' sits. We join `properties` (RLS now allows authenticated read for
    // active sits) and fetch owner data separately from the safe `public_profiles` view.
    let query = supabase
      .from("sits")
      .select("*, property:properties!sits_property_id_fkey(type, environment, photos)")
      .in("status", ["published", "confirmed", "in_progress", "completed"])
      .order("created_at", { ascending: false });
    if (startDate) query = query.gte("end_date", startDate);
    if (endDate) query = query.lte("start_date", endDate);
    const { data } = await query;
    let items = data || [];

    // Hydrate owner data from public_profiles (safe public view) in a single batched call
    const ownerIds = Array.from(new Set(items.map((s: any) => s.user_id).filter(Boolean)));
    if (ownerIds.length > 0) {
      const { data: owners } = await supabase
        .from("public_profiles")
        .select("id, first_name, avatar_url, city, postal_code, identity_verified, is_founder")
        .in("id", ownerIds);
      const ownerMap = new Map((owners || []).map((o: any) => [o.id, o]));
      items = items.map((s: any) => ({ ...s, owner: ownerMap.get(s.user_id) || null }));
    }
    // Mark assigned/completed sits (will be rendered greyed-out, non-clickable)
    items = items.map((s: any) => ({
      ...s,
      isAssigned: s.status === "confirmed" || s.status === "in_progress",
      isCompleted: s.status === "completed",
    }));
    if (housingType !== "all") items = items.filter((s: any) => s.property?.type === housingType);
    if (withPhotosOnly) items = items.filter((s: any) => s.property?.photos?.length > 0);
    if (duration !== "all") {
      items = items.filter((s: any) => {
        if (!s.start_date || !s.end_date) return true;
        const days = Math.ceil((new Date(s.end_date).getTime() - new Date(s.start_date).getTime()) / (1000 * 60 * 60 * 24));
        switch (duration) { case "short": return days <= 7; case "medium": return days >= 7 && days <= 14; case "long": return days >= 15; default: return true; }
      });
    }
    if (verifiedOnly) items = items.filter((s: any) => s.owner?.identity_verified);
    const { items: locFiltered, cityCoords } = await filterByLocation(items, (s: any) => s.owner?.city, searchCoords, (s: any) => s.owner?.postal_code);
    items = locFiltered;
    const enriched = await Promise.all(
      items.map(async (sit: any) => {
        const [{ data: pets }, { data: reviews }, { data: ownerBadges }, { data: ownerProf }] = await Promise.all([
          supabase.from("pets").select("species, name").eq("property_id", sit.property_id),
          supabase.from("reviews").select("overall_rating").eq("reviewee_id", sit.user_id).eq("published", true),
          supabase.from("badge_attributions").select("badge_id").eq("user_id", sit.user_id),
          supabase.from("owner_profiles").select("environments").eq("user_id", sit.user_id).maybeSingle(),
        ]);
        const avgRating = reviews && reviews.length > 0
          ? (reviews.reduce((s: number, r: any) => s + r.overall_rating, 0) / reviews.length).toFixed(1) : null;
        const badgeCounts = new Map<string, number>();
        (ownerBadges || []).forEach((b: any) => badgeCounts.set(b.badge_id, (badgeCounts.get(b.badge_id) || 0) + 1));
        const topBadges = Array.from(badgeCounts.entries()).map(([badge_id, count]) => ({ badge_key: badge_id, count })).sort((a, b) => b.count - a.count).slice(0, 2);
        const petSpecies = (pets || []).map((p: any) => p.species);
        if (animalTypes.length > 0) {
          const wantedSpecies = animalTypes.map(a => animalChipToSpecies[a]).filter(Boolean);
          if (!petSpecies.some((s: string) => wantedSpecies.includes(s))) return null;
        }
        // Min experience filter
        if (minExperience !== "all") {
          const completedCount = (ownerBadges || []).length;
          const minCount = parseInt(minExperience);
          const revCount = reviews?.length || 0;
          if (revCount < minCount) return null;
        }
        const dist = searchCoords && sit.owner?.city ? computeDistance(sit.owner.city, cityCoords, searchCoords) : null;
        const isNew = differenceInHours(new Date(), new Date(sit.created_at)) < 48;
        const days = sit.start_date && sit.end_date ? differenceInDays(new Date(sit.end_date), new Date(sit.start_date)) : 0;
        // Resolve environments: sit-level first, then owner profile fallback
        const sitEnvs: string[] = (sit as any).environments || [];
        const ownerEnvs: string[] = (ownerProf as any)?.environments || [];
        const resolvedEnvs = sitEnvs.length > 0 ? sitEnvs : ownerEnvs;
        return { ...sit, pets: pets || [], avgRating, reviewCount: reviews?.length || 0, topBadges, distance: dist, isNew, durationDays: days, environments: resolvedEnvs, ownerEnvironments: ownerEnvs };
      })
    );
    let final = enriched.filter(Boolean);
    // Environment filter (using resolved environments with fallback)
    if (environments.length > 0) {
      final = final.filter((item: any) => {
        const envs: string[] = item.environments || [];
        return envs.some((e: string) => environments.includes(e));
      });
    }
    // Filter by min_gardien_sits: only show sits where user meets the requirement
    if (user) {
      final = final.filter((item: any) => {
        const minRequired = (item as any).min_gardien_sits || 0;
        return userCompletedSits >= minRequired;
      });
    }
    final = sortResults(final, sort);
    // Démos toujours visibles : intercalées tous les 3 résultats pour montrer
    // l'étendue de l'expérience Guardiens (badge "exemple" sur chacune).
    final = interleaveDemos(final, DEMO_SITS, 3);
    const coordsMap = new Map<string, { lat: number; lng: number }>();
    final.forEach((item: any) => {
      if (!item) return;
      // Use item-level lat/lng first (for demo items), then fall back to geocoded city
      if (item.latitude && item.longitude) {
        coordsMap.set(item.id, { lat: item.latitude, lng: item.longitude });
      } else if (item.owner?.city) {
        const c = cityCoords.get(item.owner.city);
        if (c) coordsMap.set(item.id, c);
      }
    });
    setResultCoords(coordsMap);
    setResults(final);
  };


  const searchMissions = async (searchCoords: { lat: number; lng: number } | null) => {
    let query = supabase
      .from("small_missions")
      .select("*, owner:profiles!small_missions_user_id_fkey(first_name, avatar_url, city, identity_verified, is_founder)")
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
    // Démos toujours visibles, intercalées
    final = interleaveDemos(final, DEMO_MISSIONS, 3);
    setResults(final);
  };

  const searchAvailableMembers = async (searchCoords: { lat: number; lng: number } | null) => {
    const { data } = await supabase
      .from("profiles")
      .select("id, first_name, avatar_url, city, skill_categories, available_for_help, is_founder")
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
    // Always push assigned (greyed-out) sits to the bottom, then completed (history) at the very end
    sorted.sort((a, b) => Number(!!a.isAssigned || !!a.isCompleted) - Number(!!b.isAssigned || !!b.isCompleted));
    sorted.sort((a, b) => Number(!!a.isCompleted) - Number(!!b.isCompleted));
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
    setCitySuggestions([]);
  };

  const toggleAnimalFilter = (animal: string) => {
    setAnimalTypes(prev => prev.includes(animal) ? prev.filter(a => a !== animal) : [...prev, animal]);
  };

  const toggleHousingType = (t: HousingFilter) => {
    setHousingTypes(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]);
  };

  const toggleEnv = (e: string) => {
    setEnvironments(prev => prev.includes(e) ? prev.filter(x => x !== e) : prev.length < 3 ? [...prev, e] : prev);
  };

  const resetFilters = () => {
    setHousingTypes([]);
    setVerifiedOnly(false);
    setWithPhotosOnly(false);
    setMinExperience("all");
    setEnvironments([]);
  };

  const animalsLabel = animalTypes.length > 0 ? animalTypes.join(" · ") : "Animaux";
  const datesLabel = startDate && endDate
    ? `${format(new Date(startDate), "d MMM", { locale: fr })} → ${format(new Date(endDate), "d MMM", { locale: fr })}`
    : "Dates";

  // Compteur "annonces disponibles" : on EXCLUT les démos, les attribuées et les terminées
  // pour ne pas surévaluer l'offre réelle.
  const availableSitsCount = results.filter((r: any) => !r.isAssigned && !r.isCompleted && !r.is_demo).length;
  const demoCount = results.filter((r: any) => r.is_demo).length;
  const resultCount = tab === "missions" && missionSubTab === "members" ? availableMembers.length : availableSitsCount;
  const countLabel = tab === "missions" && missionSubTab === "members"
    ? `${resultCount} membre${resultCount > 1 ? "s" : ""} disponible${resultCount > 1 ? "s" : ""}`
    : resultCount === 0 && demoCount > 0
      ? "Aucune annonce réelle pour le moment"
      : `${resultCount} annonce${resultCount > 1 ? "s" : ""} disponible${resultCount > 1 ? "s" : ""} près de vous`;

  // ─── Pill style ───
  const pillClass = "flex items-center gap-2 px-4 py-2 rounded-full border border-border bg-card cursor-pointer hover:border-primary transition-colors text-sm whitespace-nowrap shrink-0";

  // ─── Card renderer ───
  const renderCard = (item: any, listIndex?: number) => {
    const photos: string[] = item.property?.photos || [];
    const petGroups: Record<string, string[]> = {};
    (item.pets || []).forEach((p: any) => {
      if (!petGroups[p.species]) petGroups[p.species] = [];
      petGroups[p.species].push(p.name);
    });
    const isMission = tab === "missions";
    const isDemo = !!item.is_demo;
    const isAssigned = !isMission && !!item.isAssigned;
    const isCompleted = !isMission && !!item.isCompleted;
    const isInactive = isAssigned || isCompleted;
    // Annonce hors du rayon de recherche : on l'affiche seulement quand
    // l'utilisateur a élargi la zone (région/France) ET que la distance dépasse son rayon.
    const isOutOfZone =
      !isMission &&
      !isDemo &&
      typeof item.distance === "number" &&
      item.distance > radius[0];
    const linkTo = isMission
      ? `/petites-missions/${item.id}`
      : isDemo
        ? `/annonces/demo/${item.slug || item.id}`
        : `/sits/${item.id}`;

    const showCTA = !hasAccess && !isInactive && !isDemo;
    const isClickable = (isDemo || hasAccess) && !isInactive;

    const cardContent = (
      <div
        className={`relative bg-card rounded-2xl overflow-hidden border transition-shadow ${isClickable ? "cursor-pointer hover:shadow-md" : ""} ${isInactive ? "opacity-60 grayscale-[40%]" : ""} ${isDemo ? "border-amber-400 border-dashed ring-1 ring-amber-200/60" : isOutOfZone ? "border-dashed border-muted-foreground/40" : "border-border"} ${testDemoMode ? (isDemo ? "card-test-demo" : "card-test-real") : ""}`}
        aria-disabled={isInactive || undefined}
        data-testid={isDemo ? "search-card-demo" : "search-card-real"}
        data-demo={isDemo ? "true" : "false"}
        data-out-of-zone={isOutOfZone ? "true" : undefined}
        data-list-index={typeof listIndex === "number" ? listIndex + 1 : undefined}
      >
        {testDemoMode && typeof listIndex === "number" && (
          <span
            className={`absolute z-20 top-2 left-2 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full shadow ${isDemo ? "bg-amber-500 text-amber-50" : "bg-sky-500 text-sky-50"}`}
            data-testid="search-card-position"
          >
            #{listIndex + 1} {isDemo ? "DEMO" : "REAL"}
          </span>
        )}
        {photos.length > 0 && (
          <div className="h-52 relative">
            <img src={photos[0]} alt="" className={`w-full h-full object-cover ${isInactive ? "grayscale" : ""} ${isDemo ? "saturate-[0.85]" : ""}`} loading="lazy" />
            {isDemo && (
              <span
                className="absolute inset-x-0 top-0 bg-amber-400 text-amber-950 text-[11px] font-semibold uppercase tracking-wide px-3 py-1.5 text-center shadow-sm flex items-center justify-center gap-1.5"
                data-testid="demo-example-badge"
              >
                <Sparkles className="h-3 w-3" /> Annonce d'exemple — pour illustrer la plateforme
              </span>
            )}
            {(isAssigned || isCompleted) && (
              <span className="absolute inset-0 flex items-center justify-center">
                <span className="bg-foreground/85 text-background rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-wide shadow-md">
                  {isCompleted ? "Garde terminée" : "Gardiennage attribué"}
                </span>
              </span>
            )}
            {!isInactive && !isDemo && item.owner?.identity_verified && (
              <span className="absolute top-3 left-3 flex items-center gap-1 bg-white/90 backdrop-blur-sm rounded-full px-2 py-1 text-xs text-primary font-medium">
                <ShieldCheck className="h-3 w-3" /> Vérifié
              </span>
            )}
            {!isDemo && !isMission && !isInactive && (
              <span className="absolute top-3 right-3 z-10" onClick={(e) => e.preventDefault()}>
                <FavoriteButton targetType="sit" targetId={item.id} size="sm" />
              </span>
            )}
            {item.isNew && !isDemo && !isInactive && (
              <span className="absolute top-3 left-3 mt-8 bg-primary text-primary-foreground rounded-full px-2 py-1 text-xs flex items-center gap-1">
                <Sparkles className="h-3 w-3" /> Nouveau
              </span>
            )}
            {isOutOfZone && !isInactive && (
              <span
                className="absolute bottom-3 left-3 inline-flex items-center gap-1 bg-foreground/85 text-background backdrop-blur-sm rounded-full px-2.5 py-1 text-[11px] font-medium shadow-sm"
                title={`Cette annonce est à ${Math.round(item.distance)} km, au-delà de votre rayon de ${radius[0]} km`}
              >
                <MapPin className="h-3 w-3" /> Hors zone · {Math.round(item.distance)} km
              </span>
            )}
          </div>
        )}
        <div className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-base font-semibold text-foreground leading-snug line-clamp-2">
              {item.title || "Sans titre"}
            </h3>
            {item.owner?.is_founder && <FounderBadge size="sm" />}
          </div>
          <p className={`text-sm mb-2 flex items-center gap-1 ${isOutOfZone ? "text-foreground" : "text-muted-foreground"}`}>
            <MapPin className={`h-3.5 w-3.5 ${isOutOfZone ? "text-primary" : ""}`} />
            {item.owner?.city || ""}
            {item.distance != null && (
              <span className={isOutOfZone ? "font-semibold text-primary" : ""}>
                {" · "}
                {item.distance < 1 ? "< 1" : Math.round(item.distance).toLocaleString("fr-FR").replace(/\s/g, "\u202F")} km
              </span>
            )}
          </p>
          {Object.keys(petGroups).length > 0 && (
            <div className="flex flex-wrap items-center gap-3 mb-2">
              {Object.entries(petGroups).map(([species, names]) => {
                const IconComp = speciesIcon[species] || PawPrint;
                return (
                  <span key={species} className="flex items-center gap-0.5 text-amber-700 text-sm">
                    <IconComp className="h-4 w-4" /> ×{names.length}
                  </span>
                );
              })}
            </div>
          )}
          {/* Environments */}
          {(item.environments?.length > 0 || item.ownerEnvironments?.length > 0) && (
            <div className="mb-2">
              <EnvironmentPills selected={item.environments?.length > 0 ? item.environments : item.ownerEnvironments || []} onChange={() => {}} readOnly maxVisible={2} />
            </div>
          )}
          {!isMission && item.start_date && (
            <p className="text-xs text-muted-foreground">
              {formatDate(item.start_date)} → {formatDate(item.end_date)}
            </p>
          )}
          {isMission && item.description && (
            <p className="text-sm text-muted-foreground truncate">{item.description}</p>
          )}
          {isAssigned && (
            <p className="text-xs text-muted-foreground italic mt-3">
              Cette garde a déjà trouvé son gardien.
            </p>
          )}
          {isCompleted && (
            <p className="text-xs text-muted-foreground italic mt-3">
              Garde déjà réalisée — pour donner un aperçu de l'activité.
            </p>
          )}
          {isDemo && (
            <p className="text-xs text-amber-700 italic mt-3 flex items-center gap-1">
              <Sparkles className="h-3 w-3" /> Exemple — cliquez pour découvrir l'expérience complète
            </p>
          )}
          {showCTA && !isDemo && (
            <Link
              to="/mon-abonnement"
              className="block w-full py-2 text-sm text-center text-primary bg-primary/10 rounded-xl font-medium mt-3 hover:bg-primary/20 transition-colors"
            >
              S'abonner pour postuler
            </Link>
          )}
        </div>
      </div>
    );

    if (isClickable) {
      return <Link key={item.id} to={linkTo}>{cardContent}</Link>;
    }
    return <div key={item.id}>{cardContent}</div>;
  };

  // ─── Render ───
  const isSitterLocked = !hasAccess && tab === "sits";

  return (
    <div className="animate-fade-in relative">
      {/* Premium overlay for non-subscribed sitters on sits tab */}
      {isSitterLocked && (
        <div className="absolute inset-0 z-30 bg-background/80 backdrop-blur-sm flex items-center justify-center">
          <div className="text-center space-y-4 max-w-sm mx-auto p-6">
            <Lock className="h-8 w-8 mx-auto text-muted-foreground" />
            <p className="font-heading font-semibold text-lg text-foreground">Réservé aux abonnés</p>
            <p className="text-sm text-muted-foreground">Abonnez-vous pour rechercher et postuler aux gardes.</p>
            <Link to="/mon-abonnement">
              <Button>S'abonner →</Button>
            </Link>
          </div>
        </div>
      )}
      {/* ─── Tabs ─── */}
      <div className="px-6 pt-4 border-b border-border">
        <div className="flex gap-6">
          {([
            { key: "sits" as SearchTab, label: "Gardes" },
            { key: "missions" as SearchTab, label: "Petites missions" },
          ]).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`pb-2 text-sm transition-colors ${
                tab === key
                  ? "font-medium text-foreground border-b-2 border-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Mission sub-tabs */}
      {tab === "missions" && (
        <div className="px-6 pt-3 space-y-3">
          <div className="flex gap-2">
            <button
              onClick={() => setMissionSubTab("published")}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${missionSubTab === "published" ? "bg-foreground text-background" : "bg-card text-muted-foreground border border-border hover:bg-accent"}`}
            >
              Missions publiées
            </button>
            <button
              onClick={() => setMissionSubTab("members")}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${missionSubTab === "members" ? "bg-foreground text-background" : "bg-card text-muted-foreground border border-border hover:bg-accent"}`}
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
                    ? "bg-foreground text-background border-foreground"
                    : "bg-card text-muted-foreground border-border"
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
      <div className="sticky top-0 z-10 bg-background border-b border-border">
        <div className="flex flex-row items-center gap-2 px-6 py-3 overflow-x-auto">
          {/* Location pill */}
          <Popover open={editingCity} onOpenChange={setEditingCity}>
            <PopoverTrigger asChild>
              <button className={pillClass} aria-label={`Ville sélectionnée : ${city || "aucune"}. Cliquer pour changer.`}>
                <MapPin className="h-4 w-4 text-primary" />
                <span className="text-foreground">{city || "Lieu"}</span>
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-3" align="start">
              <Input
                placeholder="Ville, département (ex. 69) ou région…"
                value={cityInput}
                onChange={e => handleCityInputChange(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") handleCityConfirm(); }}
                autoFocus
              />

              {(() => {
                // Si la saisie ressemble à un dept/CP/région, on les met EN PREMIER
                const q = normalize(cityInput);
                const looksLikeDeptOrCp = /^\d{1,5}$|^2[ab]\d{0,3}$/i.test(q);
                const exactDeptOrRegion = deptSuggestions.some(d => normalize(d.name) === q)
                  || regionSuggestions.some(r => normalize(r.name) === q);
                const territoryFirst = looksLikeDeptOrCp || exactDeptOrRegion;
                const isCp = /^\d{5}$/.test(q);

                // Réduit le nombre de communes quand on cherche un dept/région
                // pour éviter qu'elles masquent les sections Départements / Régions
                const communesLimit = territoryFirst ? 3 : 8;
                const visibleCities = citySuggestions.slice(0, communesLimit);
                const hiddenCitiesCount = Math.max(0, citySuggestions.length - visibleCities.length);

                const Communes = visibleCities.length > 0 && (
                  <div className="mt-2" key="communes">
                    <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground px-1 mb-1 flex items-center justify-between">
                      <span>Communes</span>
                      {hiddenCitiesCount > 0 && (
                        <span className="text-[10px] normal-case tracking-normal text-muted-foreground/70">
                          +{hiddenCitiesCount} masquée{hiddenCitiesCount > 1 ? "s" : ""}
                        </span>
                      )}
                    </p>
                    <div className="border border-border rounded-lg overflow-hidden">
                      {visibleCities.map((s, i) => (
                        <button
                          key={i}
                          onClick={() => handleCitySelect(s.nom, s.codesPostaux?.[0])}
                          className="w-full text-left px-3 py-2 text-sm text-foreground hover:bg-accent transition-colors flex items-center gap-2"
                        >
                          <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <span>{s.nom}</span>
                          {s.codesPostaux?.[0] && <span className="text-muted-foreground ml-auto text-xs">{s.codesPostaux[0]}</span>}
                        </button>
                      ))}
                    </div>
                  </div>
                );

                const Departements = deptSuggestions.length > 0 && (
                  <div className="mt-2" key="depts">
                    <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground px-1 mb-1">
                      {primaryDeptCode ? (isCp ? "Département (depuis le code postal)" : "Département reconnu") : "Départements"}
                    </p>
                    <div className="border border-border rounded-lg overflow-hidden">
                      {deptSuggestions.map((d) => (
                        <button
                          key={d.code}
                          onClick={() => handleDeptSelect(d.code)}
                          className={`w-full text-left px-3 py-2 text-sm transition-colors flex items-center gap-2 ${
                            d.isPrimary
                              ? "bg-primary/10 hover:bg-primary/15 text-foreground ring-1 ring-inset ring-primary/30"
                              : "text-foreground hover:bg-accent"
                          }`}
                        >
                          <span className={`inline-flex items-center justify-center min-w-[28px] h-5 rounded text-[11px] font-mono font-semibold ${
                            d.isPrimary ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
                          }`}>{d.code}</span>
                          <span className={d.isPrimary ? "font-medium" : ""}>{d.name}</span>
                          <span className="ml-auto text-[11px] text-muted-foreground">
                            {d.isPrimary ? (isCp ? "match CP" : "correspondance") : "département"}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                );

                const Regions = regionSuggestions.length > 0 && (
                  <div className="mt-2" key="regions">
                    <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground px-1 mb-1">Régions</p>
                    <div className="border border-border rounded-lg overflow-hidden">
                      {regionSuggestions.map((r) => (
                        <button
                          key={r.code}
                          onClick={() => handleRegionSelect(r.code)}
                          className="w-full text-left px-3 py-2 text-sm text-foreground hover:bg-accent transition-colors flex items-center gap-2"
                        >
                          <span className="text-base">🗺️</span>
                          <span>{r.name}</span>
                          <span className="ml-auto text-[11px] text-muted-foreground">région</span>
                        </button>
                      ))}
                    </div>
                  </div>
                );

                return (
                  <div className="max-h-[60vh] overflow-y-auto">
                    {territoryFirst
                      ? <>{Departements}{Regions}{Communes}</>
                      : <>{Communes}{Departements}{Regions}</>}
                  </div>
                );
              })()}

              {cityInput.length >= 2 && citySuggestions.length === 0 && deptSuggestions.length === 0 && regionSuggestions.length === 0 && (
                <p className="mt-2 px-1 text-xs text-muted-foreground">Aucun résultat. Essayez un nom de ville, un numéro de département ou une région.</p>
              )}

              <button
                onClick={handleGeolocation}
                className="flex items-center gap-2 w-full mt-2 px-3 py-2 text-sm text-primary hover:bg-accent rounded-lg transition-colors border-t border-border pt-3"
              >
                <Crosshair className="h-4 w-4" /> Utiliser ma position
              </button>
            </PopoverContent>
          </Popover>

          {/* Zone pill (radius / dept / region / france) */}
          <Popover>
            <PopoverTrigger asChild>
              <button className={pillClass} aria-label="Choisir la zone de recherche">
                <span className="text-foreground">
                  {zoneMode === "radius" && `${radius[0]} km`}
                  {zoneMode === "dept" && (() => {
                    const d = getDeptCode(userPostalCode);
                    return d ? `Dépt ${d}` : "Mon département";
                  })()}
                  {zoneMode === "region" && (getRegionName(getDeptCode(userPostalCode)) || "Ma région")}
                  {zoneMode === "france" && "Toute la France"}
                </span>
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-72 p-3" align="start">
              <div className="space-y-1 mb-3">
                <button
                  onClick={() => setZoneMode("radius")}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${zoneMode === "radius" ? "bg-primary/10 text-primary font-medium" : "hover:bg-accent text-foreground"}`}
                >
                  📍 Autour de moi <span className="text-xs text-muted-foreground">({radius[0]} km · {densityCounts.radius} {densityCounts.radius > 1 ? "résultats" : "résultat"})</span>
                </button>
                <button
                  onClick={() => setZoneMode("dept")}
                  disabled={!getDeptCode(userPostalCode)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${zoneMode === "dept" ? "bg-primary/10 text-primary font-medium" : "hover:bg-accent text-foreground"}`}
                >
                  🏛️ Mon département {getDeptCode(userPostalCode) && (
                    <span className="text-xs text-muted-foreground">
                      ({getDeptCode(userPostalCode)} {DEPT_NAMES[getDeptCode(userPostalCode)!]} · {densityCounts.dept})
                    </span>
                  )}
                </button>
                <button
                  onClick={() => setZoneMode("region")}
                  disabled={!getRegionCode(getDeptCode(userPostalCode))}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${zoneMode === "region" ? "bg-primary/10 text-primary font-medium" : "hover:bg-accent text-foreground"}`}
                >
                  🗺️ Ma région {getRegionName(getDeptCode(userPostalCode)) && (
                    <span className="text-xs text-muted-foreground">
                      ({getRegionName(getDeptCode(userPostalCode))} · {densityCounts.region})
                    </span>
                  )}
                </button>
                <button
                  onClick={() => setZoneMode("france")}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${zoneMode === "france" ? "bg-primary/10 text-primary font-medium" : "hover:bg-accent text-foreground"}`}
                >
                  🇫🇷 Toute la France <span className="text-xs text-muted-foreground">({densityCounts.france})</span>
                </button>
              </div>
              {zoneMode === "radius" && (
                <div className="border-t border-border pt-3 space-y-3">
                  <div className="flex flex-wrap gap-1.5">
                    {RADIUS_SHORTCUTS.map(r => (
                      <button
                        key={r}
                        onClick={() => setRadius([r])}
                        className={`rounded-full px-3 py-1 text-xs transition-colors ${
                          radius[0] === r
                            ? "bg-primary text-primary-foreground"
                            : "border border-border text-muted-foreground hover:border-primary"
                        }`}
                      >
                        {r === 50 ? "50 km+" : `${r} km`}
                      </button>
                    ))}
                  </div>
                  {(() => {
                    const currentIdx = Math.max(0, ALLOWED_ALERT_RADII.indexOf(radius[0] as any));
                    return (
                      <Slider
                        value={[currentIdx]}
                        onValueChange={(v) => setRadius([ALLOWED_ALERT_RADII[v[0]]])}
                        min={0}
                        max={ALLOWED_ALERT_RADII.length - 1}
                        step={1}
                      />
                    );
                  })()}
                </div>
              )}
            </PopoverContent>
          </Popover>

          {/* Dates pill */}
          <Popover>
            <PopoverTrigger asChild>
              <button className={pillClass}>
                <Calendar className="h-4 w-4 text-primary" />
                <span className="text-foreground">{datesLabel}</span>
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-4" align="start">
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Du</label>
                  <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Au</label>
                  <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
                </div>
              </div>
            </PopoverContent>
          </Popover>

          {/* Animals pill */}
          <Popover>
            <PopoverTrigger asChild>
              <button className={pillClass}>
                <PawPrint className="h-4 w-4 text-primary" />
                <span className="text-foreground">{animalsLabel}</span>
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-3" align="start">
              <div className="space-y-2">
                {["Chiens", "Chats"].map(animal => (
                  <label key={animal} className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                    <Checkbox checked={animalTypes.includes(animal)} onCheckedChange={() => toggleAnimalFilter(animal)} />
                    {animal === "Chiens" && <PawPrint className="h-3.5 w-3.5 text-muted-foreground" />}
                    {animal === "Chats" && <Cat className="h-3.5 w-3.5 text-muted-foreground" />}
                    {animal}
                  </label>
                ))}
                {!showMoreAnimals && (
                  <button className="text-xs text-primary hover:underline" onClick={() => setShowMoreAnimals(true)}>
                    Voir plus ▾
                  </button>
                )}
                {showMoreAnimals && ["Chevaux", "Animaux de ferme", "NAC"].map(animal => (
                  <label key={animal} className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                    <Checkbox checked={animalTypes.includes(animal)} onCheckedChange={() => toggleAnimalFilter(animal)} />
                    {animal}
                  </label>
                ))}
              </div>
            </PopoverContent>
          </Popover>

          {/* Verified toggle promu (raccourci confiance) */}
          <button
            onClick={() => setVerifiedOnly(v => !v)}
            aria-pressed={verifiedOnly}
            className={`${pillClass} ${verifiedOnly ? "bg-primary/10 border-primary text-primary" : ""}`}
          >
            <ShieldCheck className={`h-4 w-4 ${verifiedOnly ? "text-primary" : "text-muted-foreground"}`} />
            <span>{verifiedOnly ? "Vérifiés uniquement" : "Vérifié"}</span>
          </button>

          {/* Advanced filters pill */}
          <Sheet>
            <SheetTrigger asChild>
              <button className={`${pillClass} relative`}>
                <SlidersHorizontal className="h-4 w-4" />
                <span className="text-foreground">Filtres</span>
                {hasActiveFilters && (
                  <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-primary" />
                )}
              </button>
            </SheetTrigger>
            <SheetContent side="right" className="w-80 overflow-y-auto">
              <div className="flex items-center justify-between mb-6 mt-2">
                <h3 className="font-heading font-semibold text-lg text-foreground">Filtres</h3>
                <button onClick={resetFilters} className="text-sm text-primary hover:underline">Réinitialiser</button>
              </div>
              <div className="space-y-6">
                {/* Housing type */}
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">Type de logement</label>
                  <div className="flex flex-wrap gap-2">
                    {([
                      { key: "house" as HousingFilter, label: "Maison" },
                      { key: "apartment" as HousingFilter, label: "Appartement" },
                      { key: "farm" as HousingFilter, label: "Ferme" },
                    ]).map(({ key, label }) => (
                      <button
                        key={key}
                        onClick={() => toggleHousingType(key)}
                        className={`rounded-full px-3 py-1.5 text-xs transition-colors ${
                          housingTypes.includes(key)
                            ? "bg-primary text-primary-foreground"
                            : "border border-border text-muted-foreground hover:border-primary"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Environment (visual only) */}
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">Environnement</label>
                  <div className="flex flex-wrap gap-2">
                    {envOptions.map(({ key, label }) => (
                      <button
                        key={key}
                        onClick={() => toggleEnv(key)}
                        className={`rounded-full px-3 py-1.5 text-xs transition-colors ${
                          environments.includes(key)
                            ? "bg-primary text-primary-foreground"
                            : "border border-border text-muted-foreground hover:border-primary"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Verified toggle */}
                <div>
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm text-foreground block">Propriétaire avec ID vérifiée</label>
                      <span className="text-xs text-muted-foreground">Afficher uniquement les annonces de proprios dont l'identité a été vérifiée</span>
                    </div>
                    <Switch checked={verifiedOnly} onCheckedChange={setVerifiedOnly} />
                  </div>
                </div>

                {/* With photos toggle */}
                <div className="flex items-center justify-between">
                  <label className="text-sm text-foreground">Annonces avec photos</label>
                  <Switch checked={withPhotosOnly} onCheckedChange={setWithPhotosOnly} />
                </div>

                {/* Min experience */}
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">Expérience du propriétaire</label>
                  <div className="flex flex-wrap gap-2">
                    {([
                      { key: "all" as ExperienceFilter, label: "Tous" },
                      { key: "1" as ExperienceFilter, label: "1 garde+" },
                      { key: "3" as ExperienceFilter, label: "3 gardes+" },
                    ]).map(({ key, label }) => (
                      <button
                        key={key}
                        onClick={() => setMinExperience(key)}
                        className={`rounded-full px-3 py-1.5 text-xs transition-colors ${
                          minExperience === key
                            ? "bg-primary text-primary-foreground"
                            : "border border-border text-muted-foreground hover:border-primary"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Apply button */}
                <Button className="w-full bg-primary text-primary-foreground py-3 rounded-xl font-medium" onClick={() => {
                  // Close the sheet by triggering search
                  doSearch();
                }}>
                  Appliquer les filtres
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* ─── Sort bar + view toggle ─── */}
      <div className="flex justify-between items-center px-6 py-2 border-b border-border bg-background">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-sm text-muted-foreground">{loading ? "Recherche…" : countLabel}</span>
          <Select value={sort} onValueChange={(v) => handleSortChange(v as SortOption)}>
            <SelectTrigger className="h-8 w-auto gap-1.5 rounded-full border-border bg-card px-3 text-xs">
              <span className="text-muted-foreground">Trier&nbsp;:</span>
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="start">
              <SelectItem value="closest">Plus proches</SelectItem>
              <SelectItem value="recent">Plus récentes</SelectItem>
              <SelectItem value="rating">Mieux notées</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {tab === "sits" && user && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                {isMobile ? (
                  <Button
                    variant={alertCreated ? "secondary" : "outline"}
                    size="icon"
                    disabled={!city || isCreatingAlert}
                    onClick={alertCreated ? () => navigate("/settings") : handleCreateAlert}
                    className="shrink-0 mr-2"
                  >
                    {isCreatingAlert ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : alertCreated ? (
                      <BellRing className="h-4 w-4" />
                    ) : (
                      <Bell className="h-4 w-4" />
                    )}
                  </Button>
                ) : (
                  <Button
                    variant={alertCreated ? "secondary" : "outline"}
                    size="sm"
                    disabled={!city || isCreatingAlert}
                    onClick={alertCreated ? () => navigate("/settings") : handleCreateAlert}
                    className="ml-auto mr-2 shrink-0"
                  >
                    {isCreatingAlert ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : alertCreated ? (
                      <BellRing className="h-4 w-4" />
                    ) : (
                      <Bell className="h-4 w-4" />
                    )}
                    {isCreatingAlert ? "Création…" : alertCreated ? "Alerte créée" : "Créer une alerte"}
                  </Button>
                )}
              </TooltipTrigger>
              <TooltipContent>
                {!city
                  ? "Sélectionnez une ville pour créer une alerte"
                  : alertCreated
                  ? "Gérer vos alertes dans les paramètres"
                  : "Créer une alerte pour cette recherche"}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
        <div className="flex border border-border rounded-lg overflow-hidden shrink-0">
          <button
            onClick={() => setViewMode("list")}
            aria-label="Vue grille"
            className={`p-2 transition-colors ${viewMode === "list" ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground"}`}
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
          <button
            onClick={() => setViewMode("map")}
            aria-label="Vue carte"
            className={`p-2 transition-colors ${viewMode === "map" ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground"}`}
          >
            <MapIcon className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Densité supprimée — déjà visible dans le sélecteur de Zone et le bandeau hors-zone */}

      {/* ─── Out-of-zone banner ─── */}
      {tab === "sits" && !loading && userPostalCode && zoneMode !== "france" && densityCounts.france > densityCounts.radius && (() => {
        const elsewhere = densityCounts.france - densityCounts.radius;
        const inDeptOnly = Math.max(0, densityCounts.dept - densityCounts.radius);
        const inRegionOnly = Math.max(0, densityCounts.region - densityCounts.dept);
        const outsideRegion = Math.max(0, densityCounts.france - densityCounts.region);
        const hasLocal = densityCounts.radius > 0;
        // Variante "partiel" = utilisateur a déjà des résultats dans son rayon
        // Variante "vide" = aucun résultat local mais des annonces existent ailleurs
        const containerClass = hasLocal
          ? "mx-6 mt-4 w-[calc(100%-3rem)] text-left rounded-2xl border border-border bg-card shadow-sm hover:shadow-md hover:border-primary/40 transition p-4 sm:p-5 flex items-start sm:items-center gap-4 flex-col sm:flex-row cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          : "mx-6 mt-4 w-[calc(100%-3rem)] text-left rounded-2xl border-2 border-primary/40 bg-gradient-to-br from-primary/15 via-primary/10 to-primary/5 shadow-md hover:shadow-lg hover:border-primary/60 transition p-4 sm:p-5 flex items-start sm:items-center gap-4 flex-col sm:flex-row cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40";
        const iconWrapClass = hasLocal
          ? "h-10 w-10 sm:h-11 sm:w-11 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0"
          : "h-12 w-12 sm:h-14 sm:w-14 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 shadow-sm relative";
        const iconClass = hasLocal ? "h-5 w-5 sm:h-6 sm:w-6" : "h-6 w-6 sm:h-7 sm:w-7";
        const numberClass = hasLocal
          ? "text-primary text-lg sm:text-xl font-bold"
          : "text-primary text-xl sm:text-2xl font-bold";
        const titleClass = hasLocal
          ? "font-heading font-semibold text-sm sm:text-base text-foreground leading-tight"
          : "font-heading font-semibold text-base sm:text-lg text-foreground leading-tight";

        const handleBannerClick = () => {
          trackEvent("search_outofzone_click", {
            source: "search_outofzone_banner",
            metadata: {
              action: "expand_zone",
              to: "france",
              previous_mode: zoneMode,
              delta: elsewhere,
              count_radius: densityCounts.radius,
              count_region: densityCounts.region,
              count_france: densityCounts.france,
              has_local: hasLocal,
            },
          });
          setZoneMode("france");
        };

        return (
          <div className={containerClass}>
            <div className="flex items-start gap-4 flex-1 min-w-0 w-full">
              <div className={iconWrapClass}>
                <MapPin className={iconClass} />
                {!hasLocal && (
                  <>
                    <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-primary animate-ping opacity-75" />
                    <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-primary" />
                  </>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className={titleClass}>
                  {hasLocal ? (
                    <>
                      <span className={numberClass}>+{elsewhere}</span>{" "}
                      autre{elsewhere > 1 ? "s" : ""} annonce{elsewhere > 1 ? "s" : ""} hors de votre rayon
                    </>
                  ) : (
                    <>
                      <span className={numberClass}>{elsewhere}</span>{" "}
                      annonce{elsewhere > 1 ? "s" : ""} hors de votre zone
                    </>
                  )}
                </p>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                  {hasLocal && densityCounts.radius > 0
                    ? `Vous voyez ${densityCounts.radius} annonce${densityCounts.radius > 1 ? "s" : ""} dans ${radius[0]} km. ${
                        [
                          inDeptOnly > 0 ? `${inDeptOnly} ailleurs dans le département` : null,
                          inRegionOnly > 0 ? `${inRegionOnly} dans la région` : null,
                          outsideRegion > 0 ? `${outsideRegion} ailleurs en France` : null,
                        ]
                          .filter(Boolean)
                          .join(" · ")
                      }.`
                    : "Élargissez la recherche pour les voir, ou créez une alerte pour ne rien rater près de chez vous."}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 shrink-0 w-full sm:w-auto">
              {densityCounts.region > densityCounts.radius && (
                <Button size="sm" variant="outline" className="bg-card" onClick={() => {
                  trackEvent("search_outofzone_click", { source: "search_outofzone", metadata: { action: "expand_zone", to: "region", previous_mode: zoneMode, delta: elsewhere, count_radius: densityCounts.radius, count_region: densityCounts.region, count_france: densityCounts.france, has_local: hasLocal } });
                  setZoneMode("region");
                }}>
                  Ma région ({densityCounts.region})
                </Button>
              )}
              <Button size="sm" variant={hasLocal ? "outline" : "default"} className={hasLocal ? "bg-card" : "shadow-sm"} onClick={() => {
                trackEvent("search_outofzone_click", { source: "search_outofzone", metadata: { action: "expand_zone", to: "france", previous_mode: zoneMode, delta: elsewhere, count_radius: densityCounts.radius, count_region: densityCounts.region, count_france: densityCounts.france, has_local: hasLocal } });
                setZoneMode("france");
              }}>
                Toute la France ({densityCounts.france})
              </Button>
              {city && (
                <Button
                  size="sm"
                  variant={alertCreated ? "secondary" : "outline"}
                  className="bg-card gap-1.5"
                  disabled={isCreatingAlert || alertCreated}
                  onClick={() => {
                    trackEvent("search_outofzone_click", { source: "search_outofzone", metadata: { action: "create_alert", previous_mode: zoneMode, city, radius_km: radius[0], delta: elsewhere, has_local: hasLocal } });
                    if (alertCreated) navigate("/settings");
                    else handleCreateAlert();
                  }}
                >
                  {isCreatingAlert ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : alertCreated ? (
                    <BellRing className="h-4 w-4" />
                  ) : (
                    <Bell className="h-4 w-4" />
                  )}
                  {isCreatingAlert ? "Création…" : alertCreated ? "Alerte créée" : `Alerte ${radius[0]} km`}
                </Button>
              )}
            </div>
          </div>
        );
      })()}

      {/* ─── No city warning ─── */}
      {!userCity && (
        <div className="mx-6 mt-4 bg-accent border border-border rounded-lg p-3 text-sm">
          <MapPin className="inline h-4 w-4 mr-1.5 text-primary" />
          <Link to="/profile" className="text-primary underline">Renseignez votre ville</Link> pour voir les gardes près de chez vous.
        </div>
      )}

      {/* ─── Mode test démos (?testDemos=1) — panneau diagnostique ─── */}
      {testDemoMode && (() => {
        const inMembersTab = tab === "missions" && missionSubTab === "members";
        const list = inMembersTab ? availableMembers : results;
        const demoIndices = list.map((it: any, i: number) => (it?.is_demo ? i : -1)).filter((i) => i !== -1);
        const realCount = list.length - demoIndices.length;
        const allHaveBadge = demoIndices.every((i) => !!list[i]?.is_demo);

        // ─── Audit STRICT : 1 démo toutes les 3 vraies annonces ───
        // Détecte toute violation causée par un filtre, un tri ou une pagination
        // appliqué APRÈS l'intercalation.
        const audit = auditInterleave(list, 3);
        const observedPositions = audit.observedPositions;
        const expectedPositions = audit.expectedPositions;
        const missingPositions = audit.missingPositions;
        const unexpectedPositions = audit.unexpectedPositions;
        const strictInterleaveOk = inMembersTab ? true : audit.ok;
        const interleaveOk = strictInterleaveOk;
        // Pour l'affichage récap : nb de démos intercalées vs en surplus en fin
        const slotsByRule = realCount >= 3 ? Math.floor(realCount / 3) : 0;
        const interleavedExpectedCount = Math.min(slotsByRule, demoIndices.length);
        const trailingDemosCount = Math.max(0, demoIndices.length - interleavedExpectedCount);
        const expectedInterleavedPositions = expectedPositions.slice(0, interleavedExpectedCount);
        const tabLabel = tab === "sits" ? "Gardes" : inMembersTab ? "Membres dispo" : "Missions";
        const availableDemos = tab === "sits" ? DEMO_SITS.length : !inMembersTab ? DEMO_MISSIONS.length : 0;


        return (
          <div
            className={`mx-6 mt-4 rounded-lg border-2 border-dashed p-4 text-sm space-y-2 ${
              !inMembersTab && !strictInterleaveOk
                ? "border-red-500 bg-red-50"
                : "border-amber-400 bg-amber-50"
            }`}
            data-testid="demo-test-panel"
            data-demo-count={demoIndices.length}
            data-real-count={realCount}
            data-interleave-ok={interleaveOk ? "true" : "false"}
            data-strict-interleave-ok={strictInterleaveOk ? "true" : "false"}
            data-expected-positions={expectedPositions.join(",")}
            data-observed-positions={observedPositions.join(",")}
            data-missing-positions={missingPositions.join(",")}
            data-unexpected-positions={unexpectedPositions.join(",")}
          >
            <div className="flex items-center justify-between flex-wrap gap-2">
              <p className="font-mono font-bold text-amber-900 flex items-center gap-2">
                <Sparkles className="h-4 w-4" /> MODE TEST DÉMOS — Onglet&nbsp;: <span className="bg-amber-200 px-2 py-0.5 rounded">{tabLabel}</span>
              </p>
              <Link to={window.location.pathname} className="text-xs text-amber-800 underline hover:no-underline">Désactiver</Link>
            </div>
            {/* Légende du surlignage des cartes (DEMO ambré / REAL bleu) */}
            <div
              className="flex flex-wrap items-center gap-4 text-[11px] text-amber-900/90 bg-white/60 rounded px-3 py-2 border border-amber-200"
              data-testid="demo-test-legend"
            >
              <span className="font-mono font-semibold uppercase tracking-wide">Légende&nbsp;:</span>
              <span className="inline-flex items-center">
                <span className="test-legend-swatch test-legend-swatch--demo" aria-hidden="true" />
                Carte démo (anneau ambré + pastille « DEMO »)
              </span>
              <span className="inline-flex items-center">
                <span className="test-legend-swatch test-legend-swatch--real" aria-hidden="true" />
                Carte réelle (anneau bleu + pastille « REAL »)
              </span>
              <span className="text-muted-foreground">
                La pastille en haut à gauche affiche la position dans la liste (#1, #2, …).
              </span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs font-mono">
              <div className="bg-white rounded p-2 border border-amber-200">
                <div className="text-muted-foreground">Total liste</div>
                <div className="text-lg font-bold text-foreground">{list.length}</div>
              </div>
              <div className="bg-white rounded p-2 border border-amber-200">
                <div className="text-muted-foreground">Vraies annonces</div>
                <div className="text-lg font-bold text-sky-700">{realCount}</div>
              </div>
              <div className="bg-white rounded p-2 border border-amber-200">
                <div className="text-muted-foreground">Démos affichées</div>
                <div className="text-lg font-bold text-amber-700">{demoIndices.length}</div>
              </div>
              <div className="bg-white rounded p-2 border border-amber-200">
                <div className="text-muted-foreground">Démos disponibles</div>
                <div className="text-lg font-bold text-foreground">{availableDemos}</div>
              </div>
            </div>
            <ul className="text-xs space-y-1 pt-1">
              <li className="flex items-center gap-2">
                <span className={inMembersTab ? "text-sky-600" : demoIndices.length > 0 ? "text-emerald-600" : "text-red-600"}>
                  {inMembersTab ? "ℹ️" : demoIndices.length > 0 ? "✅" : "❌"}
                </span>
                <span>
                  {inMembersTab
                    ? "Onglet membres : aucune démo attendue (profils réels uniquement)."
                    : demoIndices.length > 0
                      ? `Démos visibles aux positions : ${demoIndices.map((i) => `#${i + 1}`).join(", ")}`
                      : "Aucune démo détectée — vérifier interleaveDemos()"}
                </span>
              </li>
              {!inMembersTab && (
                <li className="flex items-center gap-2">
                  <span className={allHaveBadge ? "text-emerald-600" : "text-red-600"}>{allHaveBadge ? "✅" : "❌"}</span>
                  <span>Badge « Annonce d'exemple » présent sur toutes les démos</span>
                </li>
              )}
              {!inMembersTab && (
                <li className="flex items-center gap-2" data-testid="demo-test-assertion-interleave">
                  <span className={strictInterleaveOk ? "text-emerald-600" : "text-red-600 font-bold"}>
                    {strictInterleaveOk ? "✅" : "❌"}
                  </span>
                  <span className={strictInterleaveOk ? "" : "text-red-700 font-semibold"}>
                    Intercalation stricte&nbsp;:{" "}
                    {strictInterleaveOk
                      ? realCount >= 3
                        ? "1 démo toutes les 3 vraies annonces (positions 4, 8, 12…)"
                        : "trop peu de vraies annonces — démos placées en fin de liste"
                      : `règle violée — ${missingPositions.length} manquante(s), ${unexpectedPositions.length} hors-règle (voir détails ci-dessous)`}
                  </span>
                </li>
              )}
              <li className="flex items-center gap-2 text-muted-foreground">
                <span>🎨</span>
                <span>Chaque carte est encadrée et numérotée&nbsp;: <span className="text-amber-700 font-semibold">DEMO</span> en jaune, <span className="text-sky-700 font-semibold">REAL</span> en bleu.</span>
              </li>
            </ul>

            {/* Tableau de vérification par filtre — historique des changements */}
            <div className="pt-2 border-t border-amber-200">
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-xs font-mono font-bold text-amber-900">
                  📊 Historique vérification ({demoCheckHistory.length})
                </p>
                {demoCheckHistory.length > 0 && (
                  <button
                    onClick={() => setDemoCheckHistory([])}
                    className="text-[11px] text-amber-800 underline hover:no-underline"
                  >
                    Réinitialiser
                  </button>
                )}
              </div>
              {demoCheckHistory.length === 0 ? (
                <p className="text-[11px] text-amber-800/70 italic">
                  Changez la ville, les dates, le tri ou l'onglet pour voir l'historique des vérifications s'enrichir ici.
                </p>
              ) : (
                <div className="overflow-x-auto rounded border border-amber-200 bg-white">
                  <table className="w-full text-[11px] font-mono">
                    <thead className="bg-amber-100/70 text-amber-900">
                      <tr>
                        <th className="text-left px-2 py-1">Heure</th>
                        <th className="text-left px-2 py-1">Trigger</th>
                        <th className="text-left px-2 py-1">Onglet</th>
                        <th className="text-left px-2 py-1">Ville</th>
                        <th className="text-left px-2 py-1">Dates</th>
                        <th className="text-left px-2 py-1">Tri</th>
                        <th className="text-right px-2 py-1">Réelles</th>
                        <th className="text-right px-2 py-1">Démos</th>
                        <th className="text-left px-2 py-1">Positions</th>
                        <th className="text-center px-2 py-1">OK ?</th>
                      </tr>
                    </thead>
                    <tbody>
                      {demoCheckHistory.map((row, idx) => {
                        const time = new Date(row.ts).toLocaleTimeString("fr-FR", {
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                        });
                        const dates =
                          row.startDate || row.endDate
                            ? `${row.startDate || "…"} → ${row.endDate || "…"}`
                            : "—";
                        return (
                          <tr
                            key={`${row.ts}-${idx}`}
                            className={
                              idx === 0
                                ? "bg-amber-50/80 border-b border-amber-100"
                                : "border-b border-amber-50"
                            }
                          >
                            <td className="px-2 py-1 text-muted-foreground whitespace-nowrap">{time}</td>
                            <td className="px-2 py-1">
                              <span className="bg-amber-200/70 px-1.5 py-0.5 rounded">{row.trigger}</span>
                            </td>
                            <td className="px-2 py-1">{row.tab}</td>
                            <td className="px-2 py-1 max-w-[120px] truncate" title={row.city || "—"}>
                              {row.city || "—"}
                            </td>
                            <td className="px-2 py-1 whitespace-nowrap">{dates}</td>
                            <td className="px-2 py-1">{row.sort}</td>
                            <td className="px-2 py-1 text-right text-sky-700 font-semibold">{row.real}</td>
                            <td className="px-2 py-1 text-right text-amber-700 font-semibold">{row.demo}</td>
                            <td className="px-2 py-1 text-muted-foreground">
                              {row.positions.length > 0 ? row.positions.map((p) => `#${p}`).join(", ") : "—"}
                            </td>
                            <td className="px-2 py-1 text-center">
                              {row.tab === "members" ? (
                                <span className="text-sky-600" title="Onglet membres : aucune démo attendue">ℹ️</span>
                              ) : row.interleaveOk ? (
                                <span className="text-emerald-600">✅</span>
                              ) : (
                                <span className="text-red-600" title="Intercalation cassée">❌</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* ─── ÉCHEC : intercalation strictement non conforme ─── */}
            {!inMembersTab && !strictInterleaveOk && (
              <div
                className="rounded-md border-2 border-red-500 bg-white p-3 text-xs space-y-2 shadow-sm"
                data-testid="demo-test-failure"
                role="alert"
                aria-live="polite"
              >
                <p className="font-mono font-bold text-red-700 flex items-center gap-2 text-sm">
                  <span aria-hidden="true">❌</span>
                  ÉCHEC INTERCALATION — la règle « 1 démo toutes les 3 vraies annonces » n'est pas respectée
                </p>
                <p className="text-red-900/80">
                  Cause possible&nbsp;: changement de filtre, pagination ou tri qui réordonne la liste après{" "}
                  <code className="bg-red-100 px-1 rounded">interleaveDemos()</code>.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 font-mono">
                  <div className="bg-red-50 rounded p-2 border border-red-200">
                    <div className="text-red-700/70 text-[10px] uppercase tracking-wide">Positions attendues</div>
                    <div className="text-red-900 font-semibold">
                      {expectedPositions.length > 0 ? expectedPositions.map((p) => `#${p}`).join(", ") : "—"}
                    </div>
                  </div>
                  <div className="bg-red-50 rounded p-2 border border-red-200">
                    <div className="text-red-700/70 text-[10px] uppercase tracking-wide">Positions observées</div>
                    <div className="text-red-900 font-semibold">
                      {observedPositions.length > 0 ? observedPositions.map((p) => `#${p}`).join(", ") : "—"}
                    </div>
                  </div>
                  {missingPositions.length > 0 && (
                    <div className="bg-red-50 rounded p-2 border border-red-200">
                      <div className="text-red-700/70 text-[10px] uppercase tracking-wide">Démos manquantes</div>
                      <div className="text-red-900 font-semibold" data-testid="demo-test-missing">
                        {missingPositions.map((p) => `#${p}`).join(", ")}
                      </div>
                    </div>
                  )}
                  {unexpectedPositions.length > 0 && (
                    <div className="bg-red-50 rounded p-2 border border-red-200">
                      <div className="text-red-700/70 text-[10px] uppercase tracking-wide">Démos hors-règle</div>
                      <div className="text-red-900 font-semibold" data-testid="demo-test-unexpected">
                        {unexpectedPositions.map((p) => `#${p}`).join(", ")}
                      </div>
                    </div>
                  )}
                </div>
                <p className="text-red-900/70 text-[11px] pt-1 border-t border-red-200">
                  Règle&nbsp;: pour <strong>{realCount}</strong> vraies annonces, on attend{" "}
                  <strong>{expectedInterleavedPositions.length}</strong> démo(s) intercalée(s) aux positions{" "}
                  {expectedInterleavedPositions.length > 0
                    ? expectedInterleavedPositions.map((p) => `#${p}`).join(", ")
                    : "—"}
                  {trailingDemosCount > 0 && (
                    <> + <strong>{trailingDemosCount}</strong> démo(s) en fin de liste.</>
                  )}
                </p>
              </div>
            )}

            <p className="text-[11px] text-amber-800/80 pt-1 border-t border-amber-200">
              Astuce&nbsp;: changez d'onglet (Gardes / Missions / Membres) et de filtres pour vérifier que les démos restent visibles partout. Ajoutez <code className="bg-white px-1 rounded">?testDemos=1</code> à n'importe quelle URL de recherche pour réactiver ce mode.
            </p>
          </div>
        );
      })()}

      {/* ─── Content ─── */}
      {viewMode === "list" ? (
        <div className="p-6">
          {loading ? (
            <p className="text-muted-foreground py-10 text-center">Recherche en cours...</p>
          ) : tab === "missions" && missionSubTab === "members" ? (
            availableMembers.length === 0 ? (
              <div className="text-center py-16 space-y-3">
                <Search className="h-12 w-12 mx-auto text-primary/30" />
                <p className="font-heading font-semibold text-lg text-foreground">Aucun membre disponible dans ce rayon</p>
                <p className="text-sm text-muted-foreground">Élargissez votre rayon de recherche.</p>
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
                    <div key={member.id} className="bg-card rounded-2xl border border-border p-4 flex items-center gap-4">
                      {member.avatar_url ? (
                        <img src={member.avatar_url} alt="" className="w-12 h-12 rounded-full object-cover shrink-0" loading="lazy" />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-accent flex items-center justify-center text-sm font-bold shrink-0 text-foreground">
                          {member.first_name?.charAt(0) || "?"}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-base font-heading font-semibold text-foreground">{member.first_name || "Membre"}</p>
                          {member.is_founder && <FounderBadge size="sm" />}
                        </div>
                        {member.city && <p className="text-xs text-muted-foreground">{member.city}{member.distance != null ? ` · à ${Math.round(member.distance)} km` : ""}</p>}
                        <div className="flex flex-wrap gap-1.5 mt-1.5">
                          {visibleSkills.map((s: string) => {
                            const meta = skillMeta[s];
                            if (!meta) return null;
                            const Icon = meta.icon;
                            return (
                              <span key={s} className="flex items-center gap-1 bg-primary/10 text-primary rounded-full text-xs px-3 py-1">
                                <Icon className="h-3 w-3" />{meta.label}
                              </span>
                            );
                          })}
                          {extraCount > 0 && <span className="text-xs text-muted-foreground self-center">+{extraCount}</span>}
                        </div>
                        {(member.avgRating || member.sitsCount > 0) && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {member.avgRating && <>★ {member.avgRating}</>}
                            {member.sitsCount > 0 && <> · {member.sitsCount} garde{member.sitsCount > 1 ? "s" : ""}</>}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-2 shrink-0">
                        <span onClick={(e) => e.stopPropagation()}>
                          <FavoriteButton targetType="sitter" targetId={member.id} size="sm" />
                        </span>
                        <Link
                          to={`/gardiens/${member.id}`}
                          className="text-sm text-primary font-semibold hover:underline"
                        >
                          Voir le profil →
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          ) : results.length === 0 ? (
            <div className="max-w-2xl mx-auto py-12 px-4 space-y-6">
              {/* Hero empty state */}
              <div className="text-center space-y-3">
                <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-primary/10">
                  <Search className="h-8 w-8 text-primary/60" />
                </div>
                <h3 className="font-heading font-semibold text-xl text-foreground">
                  {tab === "sits" ? "Pas encore d'annonce de garde dans votre zone" : "Pas encore de mission dans votre zone"}
                </h3>

                {/* Compteur clair : 0 dans la zone · X ailleurs */}
                {densityCounts.france > 0 && (
                  <div className="inline-flex flex-wrap items-center justify-center gap-2 text-sm">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-foreground/80">
                      <span className="font-semibold text-foreground">0</span>
                      <span className="text-muted-foreground">dans votre zone</span>
                    </span>
                    <span className="text-muted-foreground">·</span>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-primary">
                      <span className="font-semibold">{densityCounts.france}</span>
                      <span>{tab === "sits" ? (densityCounts.france > 1 ? "annonces" : "annonce") : (densityCounts.france > 1 ? "missions" : "mission")} ailleurs en France</span>
                    </span>
                  </div>
                )}

                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                  {densityCounts.france > 0
                    ? "Élargissez la zone, explorez les régions voisines ou créez une alerte pour ne rien rater près de chez vous."
                    : "La communauté grandit chaque jour. Voici comment ne rien rater et tirer profit de votre temps dès maintenant."}
                </p>
              </div>

              {/* Régions / départements voisins disponibles */}
              {(nearbyRegions.length > 0 || nearbyZones.length > 0) && densityCounts.france > 0 && (
                <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <MapPin className="h-5 w-5 text-foreground mt-0.5 shrink-0" />
                    <div className="flex-1 space-y-3">
                      <p className="font-medium text-sm text-foreground">
                        Disponible ailleurs en France
                      </p>

                      {nearbyRegions.length > 0 && (
                        <div>
                          <p className="text-xs text-muted-foreground mb-1.5">Régions où il y en a le plus</p>
                          <div className="flex flex-wrap gap-2">
                            {nearbyRegions.map((r) => (
                              <button
                                key={r.regionCode}
                                type="button"
                                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background hover:border-primary/50 hover:bg-primary/5 px-3 py-1 text-xs text-foreground transition-colors"
                                onClick={() => {
                                  trackEvent("search_empty_action", { source: "search_empty", metadata: { action: "browse_region", region: r.regionCode, count: r.count, tab } });
                                  setZoneMode("france");
                                }}
                              >
                                <span className="font-medium">{r.regionName}</span>
                                <span className="text-muted-foreground">·</span>
                                <span className="text-primary font-semibold">{r.count}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {nearbyZones.length > 0 && (
                        <div>
                          <p className="text-xs text-muted-foreground mb-1.5">Départements actifs</p>
                          <div className="flex flex-wrap gap-2">
                            {nearbyZones.map((d) => (
                              <button
                                key={d.deptCode}
                                type="button"
                                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background hover:border-primary/50 hover:bg-primary/5 px-3 py-1 text-xs text-foreground transition-colors"
                                onClick={() => {
                                  trackEvent("search_empty_action", { source: "search_empty", metadata: { action: "browse_dept", dept: d.deptCode, count: d.count, tab } });
                                  setZoneMode("france");
                                }}
                              >
                                <span className="font-medium">{d.deptCode} · {d.deptName}</span>
                                <span className="text-muted-foreground">·</span>
                                <span className="text-primary font-semibold">{d.count}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Action 0 — Mode Lancement (si plateforme globalement vide) */}
              {launchModeCount === 0 && (
                <div className="rounded-xl border border-primary/40 bg-gradient-to-br from-primary/10 to-primary/5 p-5 space-y-2">
                  <div className="flex items-start gap-3">
                    <Sparkles className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                    <div className="flex-1">
                      <p className="font-heading font-semibold text-sm text-foreground">Vous êtes parmi les premiers</p>
                      <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                        Guardiens vient de lancer. Les premières annonces arrivent en ce moment.
                        En tant que membre fondateur, vous serez notifié dès qu'une mission près de chez vous est publiée — et vous gardez votre statut à vie.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Action 1 — Suggestion d'élargir si pertinent */}
              {zoneMode !== "france" && (densityCounts.dept > densityCounts.radius || densityCounts.region > densityCounts.dept || densityCounts.france > 0) && (
                <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-2">
                  <div className="flex items-start gap-3">
                    <MapPin className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                    <div className="flex-1">
                      <p className="font-medium text-sm text-foreground">Élargissez votre recherche</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {densityCounts.france > 0 && `${densityCounts.france} ${tab === "sits" ? "annonces" : "missions"} disponibles partout en France.`}
                      </p>
                      <div className="flex flex-wrap gap-2 mt-3">
                        {densityCounts.dept > densityCounts.radius && (
                          <Button size="sm" variant="outline" onClick={() => { trackEvent("search_empty_action", { source: "search_empty", metadata: { action: "expand_zone", to: "dept", tab, zone_mode: zoneMode } }); setZoneMode("dept"); }}>
                            Mon département ({densityCounts.dept})
                          </Button>
                        )}
                        {densityCounts.region > densityCounts.dept && (
                          <Button size="sm" variant="outline" onClick={() => { trackEvent("search_empty_action", { source: "search_empty", metadata: { action: "expand_zone", to: "region", tab, zone_mode: zoneMode } }); setZoneMode("region"); }}>
                            Ma région ({densityCounts.region})
                          </Button>
                        )}
                        {densityCounts.france > 0 && (
                          <Button size="sm" variant="outline" onClick={() => { trackEvent("search_empty_action", { source: "search_empty", metadata: { action: "expand_zone", to: "france", tab, zone_mode: zoneMode } }); setZoneMode("france"); }}>
                            Toute la France ({densityCounts.france})
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Action 2 — Créer une alerte */}
              {city && !alertCreated && (
                <div className="rounded-xl border border-border bg-card p-4 space-y-2">
                  <div className="flex items-start gap-3">
                    <Bell className="h-5 w-5 text-foreground mt-0.5 shrink-0" />
                    <div className="flex-1">
                      <p className="font-medium text-sm text-foreground">Soyez prévenu en premier</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Créez une alerte sur {city} et recevez un email dès qu'une annonce est publiée.
                      </p>
                      <Button
                        size="sm"
                        className="mt-3 gap-2"
                        onClick={() => { trackEvent("search_empty_action", { source: "search_empty", metadata: { action: "create_alert", tab, city } }); handleCreateAlert(); }}
                        disabled={isCreatingAlert}
                      >
                        {isCreatingAlert ? <Loader2 className="h-4 w-4 animate-spin" /> : <BellRing className="h-4 w-4" />}
                        Créer mon alerte
                      </Button>
                    </div>
                  </div>
                </div>
              )}
              {alertCreated && (
                <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
                  <div className="flex items-center gap-3">
                    <BellRing className="h-5 w-5 text-primary shrink-0" />
                    <p className="text-sm text-foreground">Alerte créée. On vous prévient dès qu'une annonce arrive !</p>
                  </div>
                </div>
              )}

              {/* Action 3 — Cross-sell vers l'autre onglet (uniquement si l'autre onglet a du contenu) */}
              {crossTabCount !== null && crossTabCount > 0 && (
                <div className="rounded-xl border border-border bg-card p-4 space-y-2">
                  <div className="flex items-start gap-3">
                    <HandshakeIcon className="h-5 w-5 text-foreground mt-0.5 shrink-0" />
                    <div className="flex-1">
                      <p className="font-medium text-sm text-foreground">
                        {tab === "sits"
                          ? `${crossTabCount} mission${crossTabCount > 1 ? "s" : ""} d'entraide ${crossTabCount > 1 ? "disponibles" : "disponible"}`
                          : `${crossTabCount} annonce${crossTabCount > 1 ? "s" : ""} de garde ${crossTabCount > 1 ? "disponibles" : "disponible"}`}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {tab === "sits"
                          ? "L'entraide entre gens du coin reste libre pour tous : promener un chien, nourrir un chat, arroser des plantes…"
                          : "Découvrez les annonces de garde près de chez vous."}
                      </p>
                      <Button
                        size="sm"
                        variant="outline"
                        className="mt-3 gap-2"
                        onClick={() => {
                          trackEvent("search_empty_action", { source: "search_empty", metadata: { action: "switch_tab", to: tab === "sits" ? "missions" : "sits", count: crossTabCount } });
                          setTab(tab === "sits" ? "missions" : "sits");
                        }}
                      >
                        {tab === "sits" ? "Voir les petites missions" : "Voir les annonces de garde"}
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Action 4 — Mode disponible (uniquement si pas déjà actif) */}
              {!sitterProfile?.is_available && (
                <div className="rounded-xl border border-border bg-card p-4 space-y-2">
                  <div className="flex items-start gap-3">
                    <Sparkles className="h-5 w-5 text-foreground mt-0.5 shrink-0" />
                    <div className="flex-1">
                      <p className="font-medium text-sm text-foreground">Soyez visible des propriétaires</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Activez votre disponibilité pour apparaître en haut des recherches et être contacté directement.
                      </p>
                      <Button
                        size="sm"
                        variant="outline"
                        className="mt-3 gap-2"
                        onClick={() => { trackEvent("search_empty_action", { source: "search_empty", metadata: { action: "activate_availability", tab } }); handleActivateAvailable(); }}
                      >
                        <Sparkles className="h-4 w-4" /> Activer le mode disponible
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {results.map((item, idx) => renderCard(item, idx))}
            </div>
          )}
        </div>
      ) : (
        /* ─── Map view ─── */
        <Suspense fallback={<div className="flex items-center justify-center h-[calc(100vh-200px)]"><p className="text-muted-foreground">Chargement de la carte…</p></div>}>
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
