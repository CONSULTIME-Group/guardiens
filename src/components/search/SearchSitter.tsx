import { useState, useEffect, useCallback, useRef, lazy, Suspense } from "react";
import FounderBadge from "@/components/badges/FounderBadge";
import ReportButton from "@/components/reports/ReportButton";
import InviteToMySitButton from "@/components/sits/owner/InviteToMySitButton";
import { Sprout, PawPrint, GraduationCap, Handshake as HandshakeIcon, LayoutGrid, Map as MapIcon, Cat, Bird, SlidersHorizontal, ShieldCheck, Crosshair, Bell, BellRing, Loader2, Home, Wrench } from "lucide-react";
import EnvironmentPills from "@/components/shared/EnvironmentPills";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";

const SearchMapView = lazy(() => import("@/components/search/SearchMapView"));
import SearchListingCard from "@/components/search/listing/SearchListingCard";
import AffinityMissingCTA from "@/components/matching/AffinityMissingCTA";

import { DEMO_SITS, DEMO_MISSIONS, DEMO_MEMBERS, interleaveDemos, auditInterleave } from "@/data/demoListings";
import { normalize } from "@/lib/normalize";
import { normalizeSkillKey, tokenizeSkillPhrases } from "@/lib/skills/tokenize";
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
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { AdvancedFiltersSheet } from "@/components/search/header/AdvancedFiltersSheet";
import { SearchEmptyState } from "@/components/search/listing/SearchEmptyState";
import { SitterDiscoveryBanner } from "@/components/search/SitterDiscoveryBanner";
import { OutOfZoneBanner } from "@/components/search/listing/OutOfZoneBanner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, MapPin, Calendar, Star, Lock, Zap, Sparkles, Globe2, X } from "lucide-react";
import { format, differenceInDays, differenceInHours } from "date-fns";
import { fr } from "date-fns/locale";
import { geocodeCity, haversineDistance } from "@/lib/geocode";
import { ALLOWED_ALERT_RADII, snapToAllowedRadius } from "@/lib/alertRadius";
import { useSubscriptionAccess } from "@/hooks/useSubscriptionAccess";
import FavoriteButton from "@/components/shared/FavoriteButton";
import { ILLUSTRATIONS } from "@/components/shared/EmptyState";
import { getDeptCode, DEPT_NAMES } from "@/lib/departments";
import { getRegionCode, getRegionName, getDeptsInRegion, REGION_NAMES, DEPT_TO_REGION } from "@/lib/regions";
import { trackEvent } from "@/lib/analytics";
// ReachReassuranceBanner retiré : redondant avec le sélecteur Zone.
import LocationPickerPopover from "@/components/search/header/LocationPickerPopover";
import ZonePickerPopover from "@/components/search/header/ZonePickerPopover";
import DatesPickerPopover from "@/components/search/header/DatesPickerPopover";
import AnimalsPickerPopover from "@/components/search/header/AnimalsPickerPopover";
import { useEmptyStateBreakdown } from "@/hooks/search/useEmptyStateBreakdown";
import { useSearchAlert } from "@/hooks/search/useSearchAlert";
import { useSearchUserProfile } from "@/hooks/search/useSearchUserProfile";
const animalChips = ["Chiens", "Chats", "Chevaux", "Animaux de ferme", "NAC"];
const animalChipToSpecies: Record<string, string> = {
 Chiens: "dog", Chats: "cat", Chevaux: "horse",
 "Animaux de ferme": "farm_animal", NAC: "nac",
};



type SortOption = "closest" | "recent" | "rating";
type SearchTab = "sits" | "missions";
type MissionSubTab = "published" | "members";
type ViewMode = "list" | "map";
type HousingFilter = "all" | "house" | "apartment" | "farm";
type ExperienceFilter = "all" | "1" | "3";
type ZoneMode = "radius" | "dept" | "region" | "france";

interface SearchSitterProps {
  /**
   * "internal" (par défaut) = expérience dashboard sitter complète (onglets
   * Annonces/Coup de main, catégories partagées, démos, bandeaux découverte,
   * affichage des annonces passées en grisé).
   * "public" = page /annonces : un seul onglet Annonces, pas de catégories
   * missions, pas de démos, pas de SitterDiscoveryBanner (redondant avec
   * OutOfZoneBanner), annonces passées masquées.
   */
  mode?: "internal" | "public";
}

const SearchSitter = ({ mode = "internal" }: SearchSitterProps = {}) => {
  const isPublic = mode === "public";
 const { user } = useAuth();
 const { hasAccess } = useSubscriptionAccess();
 const isMobile = useIsMobile();
 const navigate = useNavigate();
 const { toast } = useToast();
 const [searchParams, setSearchParams] = useSearchParams();
 const [tab, setTab] = useState<SearchTab>("sits");
 const [missionSubTab, setMissionSubTab] = useState<MissionSubTab>("published");
 const [missionTypeFilter, setMissionTypeFilter] = useState<"all" | "besoin" | "offre">("all");
 const [missionCategoryFilter, setMissionCategoryFilter] = useState<"all" | "garden" | "animals" | "skills" | "house">("all");
 const [availableMembers, setAvailableMembers] = useState<any[]>([]);
 const [city, setCity] = useState(() => searchParams.get("ville") || "");
 const [radius, setRadius] = useState(() => {
  const r = parseInt(searchParams.get("rayon") || "", 10);
  return [Number.isFinite(r) && r > 0 && r <= 200 ? r : 15];
 });
 const [zoneMode, setZoneMode] = useState<ZoneMode>(() => {
 if (typeof window === "undefined") return "radius";
 // Param URL ?zone=france, utilisé depuis le dashboard pour ouvrir la
 // recherche directement en mode élargi (« annonces plus loin »).
 const urlZone = searchParams.get("zone");
 if (urlZone === "radius" || urlZone === "dept" || urlZone === "region" || urlZone === "france") return urlZone;
 const saved = localStorage.getItem("search.zoneMode");
 return saved === "radius" || saved === "dept" || saved === "region" || saved === "france" ? saved : "radius";
 });
 const [densityCounts, setDensityCounts] = useState<{ radius: number; dept: number; region: number; france: number }>({ radius: 0, dept: 0, region: 0, france: 0 });
 const [userPostalCode, setUserPostalCode] = useState<string | null>(null);
 const [startDate, setStartDate] = useState(() => searchParams.get("debut") || "");
 const [endDate, setEndDate] = useState(() => searchParams.get("fin") || "");
 const [animalTypes, setAnimalTypes] = useState<string[]>(() => {
  const a = searchParams.get("animaux");
  return a ? a.split(",").map((s) => s.trim()).filter(Boolean) : [];
 });
 const [housingTypes, setHousingTypes] = useState<HousingFilter[]>([]);
 const [duration, setDuration] = useState("all");
 const [verifiedOnly, setVerifiedOnly] = useState(false);
 const [withPhotosOnly, setWithPhotosOnly] = useState(false);
 const [minExperience, setMinExperience] = useState<ExperienceFilter>("all");
 const [visibleCount, setVisibleCount] = useState(12);
 const [emergencyOnly, setEmergencyOnly] = useState(searchParams.get("emergency") === "true");
 // Mode test démos : ?testDemos=1 dans l'URL active un panneau de diagnostic
 // qui vérifie la présence + l'intercalation des annonces d'exemple sur tous
 // les types de recherche (gardes, missions, membres). N'a aucun effet sur la
 // logique de tri/filtre, purement instrumental.
 const testDemoMode = searchParams.get("testDemos") === "1";
 // Historique de vérification (mode test), une ligne par changement de filtre clé
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

 const [sort, setSort] = useState<SortOption>(() => {
  const s = searchParams.get("tri");
  return s === "recent" || s === "rating" || s === "closest" ? s : "closest";
 });
 const [viewMode, setViewMode] = useState<ViewMode>("list");
 const [cityPostalCode, setCityPostalCode] = useState<string | null>(null);

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
 const [intlCount, setIntlCount] = useState<number>(0);
 useEffect(() => {
   let cancelled = false;
   (async () => {
     const { count } = await supabase
       .from("sits")
       .select("id", { count: "exact", head: true })
       .eq("status", "published")
       .not("country", "is", null)
       .neq("country", "FR");
     if (!cancelled) setIntlCount(count || 0);
   })();
   return () => { cancelled = true; };
 }, []);

 // Pill popover states
 const [editingCity, setEditingCity] = useState(false);
 const [cityInput, setCityInput] = useState("");
 const [citySuggestions, setCitySuggestions] = useState<{ nom: string; codesPostaux?: string[] }[]>([]);
  
 const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
 const [filterSheetOpen, setFilterSheetOpen] = useState(false);

 // Environment (visual only for now)
 const [environments, setEnvironments] = useState<string[]>([]);
 const envOptions = [
 { key: "city", label: "Ville" },
 { key: "countryside", label: "Campagne" },
 { key: "mountain", label: "Montagne" },
 { key: "lake", label: "Lac" },
 { key: "vineyard", label: "Vignes" },
 { key: "forest", label: "Forêt" },
 ];

 // Derive housingType for existing filter logic (backward compat)
 const housingType = housingTypes.length === 1 ? housingTypes[0] : "all";

 const activeFiltersCount =
  housingTypes.length +
  environments.length +
  (verifiedOnly ? 1 : 0) +
  (withPhotosOnly ? 1 : 0) +
  (minExperience !== "all" ? 1 : 0);
 const hasActiveFilters = activeFiltersCount > 0;

 // ─── City autocomplete via geo.api.gouv.fr ───
 // Comportement unifié : on normalise (sans accents/casse) côté client puis
 // on aiguille vers l'endpoint pertinent, `codePostal` pour 5 chiffres,
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
 // (normalize est importé depuis @/lib/normalize, comportement unifié partout)

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
 useSearchUserProfile({
  userId: user?.id,
  setUserCity,
  setUserPostalCode,
  setSitterProfile,
  setUserCoords,
  setUserCompletedSits,
  setSitterEligible,
  setCity,
  setCityInput,
 });


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
  // Anon visitors: fire search immediately (no profile coords to wait for), SEO + signup conversion (Nomador model)
  if (!user || userCoords || (user && userCity === "")) {
  initialLoadDone.current = true;
  doSearch();
  }
   }, [userCoords, user, userCity]);



 // Sync filters → URL params (shareable URLs for SEO + UX)
 useEffect(() => {
  if (!initialLoadDone.current) return;
  const next = new URLSearchParams(searchParams);
  const setOrDel = (key: string, value: string | null | undefined) => {
   if (value) next.set(key, value); else next.delete(key);
  };
  setOrDel("ville", city || null);
  setOrDel("rayon", radius[0] !== 15 ? String(radius[0]) : null);
  setOrDel("debut", startDate || null);
  setOrDel("fin", endDate || null);
  setOrDel("animaux", animalTypes.length ? animalTypes.join(",") : null);
  setOrDel("tri", sort !== "closest" ? sort : null);
  const a = next.toString();
  const b = searchParams.toString();
  if (a !== b) setSearchParams(next, { replace: true });
  // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [city, radius, startDate, endDate, animalTypes, sort]);

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
 if (loading || tab !== "sits" || zoneMode === "france") return;
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

 const { crossTabCount, launchModeCount, nearbyZones, nearbyRegions } = useEmptyStateBreakdown({
  loading,
  hasResults: results.length > 0,
  tab,
  cityPostalCode,
  userPostalCode,
 });


 const { alertCreated, isCreatingAlert, handleCreateAlert } = useSearchAlert({
  city,
  cityPostalCode,
  radius,
  setRadius,
  resetKeys: [city, radius],
 });


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
 alwaysIncludeFn?: (item: any) => boolean,
 densityFilterFn?: (item: any) => boolean,
 ) => {
 const cityCoords = new Map<string, { lat: number; lng: number }>();
 const uniqueCities = [...new Set(items.map(getCityFn).filter(Boolean))] as string[];
 await Promise.all(uniqueCities.map(async (c) => {
 const coords = await geocodeCity(c);
 if (coords) cityCoords.set(c, { lat: coords.lat, lng: coords.lng });
 }));

 // Compute density counts for each zone mode (always, for the counter UI).
 // Density est calculée sur les items « actionnables » (open/publiés/non expirés)
 // pour rester aligné avec les compteurs SEO/eyebrow des pages publiques.
 const densityItems = densityFilterFn ? items.filter(densityFilterFn) : items;
 const refDept = getDeptCode(getZoneRefPostalCode());
 const refRegion = getRegionCode(refDept);
 const radiusCount = searchCoords ? densityItems.filter((s) => {
 const c = getCityFn(s); if (!c) return false;
 const co = cityCoords.get(c); if (!co) return false;
 return haversineDistance(searchCoords.lat, searchCoords.lng, co.lat, co.lng) <= radius[0];
 }).length : 0;
 const deptCount = refDept ? densityItems.filter((s) => {
 const cp = getPostalCodeFn?.(s); return cp ? getDeptCode(cp) === refDept : false;
 }).length : 0;
 const regionCount = refRegion ? densityItems.filter((s) => {
 const cp = getPostalCodeFn?.(s); return cp ? getRegionCode(getDeptCode(cp)) === refRegion : false;
 }).length : 0;
 setDensityCounts({ radius: radiusCount, dept: deptCount, region: regionCount, france: densityItems.length });


 // Apply the selected zone filter (international items always pass through)
 const passThrough = (s: any) => alwaysIncludeFn ? alwaysIncludeFn(s) : false;
 let filtered = items;
 if (zoneMode === "radius") {
 if (!searchCoords) return { items, cityCoords };
 filtered = items.filter((s) => {
 if (passThrough(s)) return true;
 const ownerCity = getCityFn(s); if (!ownerCity) return false;
 const coords = cityCoords.get(ownerCity); if (!coords) return false;
 return haversineDistance(searchCoords.lat, searchCoords.lng, coords.lat, coords.lng) <= radius[0];
 });
 } else if (zoneMode === "dept" && refDept) {
 filtered = items.filter((s) => {
 if (passThrough(s)) return true;
 const cp = getPostalCodeFn?.(s); return cp ? getDeptCode(cp) === refDept : false;
 });
 } else if (zoneMode === "region" && refRegion) {
 filtered = items.filter((s) => {
 if (passThrough(s)) return true;
 const cp = getPostalCodeFn?.(s); return cp ? getRegionCode(getDeptCode(cp)) === refRegion : false;
 });
 }
 // zoneMode === "france" → no filter
 return { items: filtered, cityCoords };
 };

   const searchSits = async (searchCoords: { lat: number; lng: number } | null) => {
   // On inclut les statuts passés (expired / completed / cancelled / archived)
   // ainsi que les annonces dépubliées (draft + unpublished_at) pour la
   // transparence côté membre connecté : elles s'affichent grisées avec un
   // libellé explicite et ne sont pas actionnables.
    // On inclut les annonces internationales : elles apparaissent comme bonus
    // sur la carte et dans la grille, même quand un filtre géographique français
    // est actif (rayon / dept / région). Elles bypassent le filtre dans filterByLocation.
    let query = supabase
.from("sits")
.select("*, property:properties!sits_property_id_fkey(type, environment, photos, cover_photo_url)")
.or(isPublic
  ? "status.in.(published,confirmed,in_progress,completed,cancelled)"
  : "status.in.(published,confirmed,in_progress,completed,cancelled,archived),and(status.eq.draft,unpublished_at.not.is.null)")
.order("created_at", { ascending: false });
   if (startDate) query = query.gte("end_date", startDate);
   if (endDate) query = query.lte("start_date", endDate);
   const { data } = await query;
   let items = data || [];

   // Hydrate owner data from public_profiles (safe public view) in a single batched call
   const ownerIds = Array.from(new Set(items.map((s: any) => s.user_id).filter(Boolean)));
   if (ownerIds.length > 0) {
   const [{ data: owners }, { data: galleryRows }] = await Promise.all([
     supabase
.from("public_profiles")
.select("id, first_name, avatar_url, city, postal_code, identity_verified, is_founder")
.in("id", ownerIds),
     supabase
.from("owner_gallery")
.select("user_id, photo_url, position")
.in("user_id", ownerIds)
.order("position", { ascending: true }),
   ]);
   const ownerMap = new Map((owners || []).map((o: any) => [o.id, o]));
   const galleryFirstMap = new Map<string, string>();
   (galleryRows || []).forEach((g: any) => {
     if (g?.user_id && g?.photo_url && !galleryFirstMap.has(g.user_id)) {
       galleryFirstMap.set(g.user_id, g.photo_url);
     }
   });
   items = items.map((s: any) => ({
     ...s,
     owner: ownerMap.get(s.user_id) || null,
     ownerGalleryFirstPhoto: galleryFirstMap.get(s.user_id) || null,
   }));
   }
   // Mark assigned/past sits (will be rendered greyed-out, non-clickable).
   const todayIso = new Date().toISOString().slice(0, 10);
   items = items.map((s: any) => {
     const isCompleted = s.status === "completed";
     const isCancelled = s.status === "cancelled";
     const isArchived = s.status === "archived";
     const isUnpublished = s.status === "draft" && !!s.unpublished_at;
     const isExpired = s.status === "published" && s.end_date && s.end_date < todayIso;
     return {
       ...s,
       isAssigned: s.status === "confirmed" || s.status === "in_progress",
       isCompleted,
       isArchived,
       isUnpublished,
       isPast: isExpired || isCancelled || isArchived || isUnpublished,
     };
   });
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
 const { items: locFiltered, cityCoords } = await filterByLocation(
 items,
 (s: any) => s.owner?.city,
 searchCoords,
 (s: any) => s.owner?.postal_code,
 (s: any) => !!s.country && s.country !== "FR",
 // Density : uniquement les annonces actionnables (publiées, ouvertes aux
 // candidatures, non expirées) pour rester aligné avec l'eyebrow SEO.
 (s: any) => s.status === "published" && s.accepting_applications !== false && (!s.end_date || s.end_date >= todayIso),
 );

 items = locFiltered;
 const enriched = await Promise.all(
 items.map(async (sit: any) => {
 const [{ data: pets }, { data: reviews }, { data: ownerBadges }, { data: ownerProf }] = await Promise.all([
 supabase.from("pets").select("species, name, special_needs").eq("property_id", sit.property_id),
 supabase.from("reviews").select("overall_rating").eq("reviewee_id", sit.user_id).eq("published", true),
 supabase.from("badge_attributions").select("badge_id").eq("user_id", sit.user_id),
 supabase.from("owner_profiles").select("environments, preferred_sitter_types, home_ambiance, languages, interests, life_pace, presence_expected").eq("user_id", sit.user_id).maybeSingle(),
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
 return {...sit, pets: pets || [], avgRating, reviewCount: reviews?.length || 0, topBadges, distance: dist, isNew, durationDays: days, environments: resolvedEnvs, ownerEnvironments: ownerEnvs, ownerMatch: ownerProf || null };
 })
 );

 let final = enriched.filter(Boolean);
 // Public /annonces : on masque les annonces passées/attribuées/terminées
 // pour ne montrer QUE les annonces réellement ouvertes à candidature.
 if (isPublic) {
  final = final.filter((item: any) => !item.isPast && !item.isAssigned && !item.isCompleted);
 }
 // Environment filter (using resolved environments with fallback)
 if (environments.length > 0) {
 final = final.filter((item: any) => {
 const envs: string[] = item.environments || [];
 return envs.some((e: string) => environments.includes(e));
 });
 }
 // `min_gardien_sits` est une préférence propriétaire, pas un critère bloquant :
 // l'annonce doit rester visible dans la recherche, comme indiqué dans le formulaire.
 final = sortResults(final, sort);
 // Démos : visibles uniquement en interne, jamais sur la page publique
 // /annonces (pollue le flux quand de vraies annonces existent).
 //  • public                      → 0 démo
 //  • internal, 0 vraie annonce   → cadence 1/3 (page sinon vide)
 //  • internal, 1-3 vraies        → 1 démo en fin, max 2 démos
 //  • internal, 4+ vraies         → 1 démo tous les 6 résultats
 const realCount = final.length;
 const demoCadence = realCount === 0 ? 3 : realCount <= 3 ? 99 : 6;
 const demoLimit = isPublic ? 0 : (realCount === 0 ? DEMO_SITS.length : realCount <= 3 ? 2 : DEMO_SITS.length);
 final = interleaveDemos(final, DEMO_SITS.slice(0, demoLimit), demoCadence);
  const coordsMap = new Map<string, { lat: number; lng: number }>();
  // Géocodage des annonces internationales (city + country, hors FR)
  const intlItems = final.filter((it: any) => it && !it.latitude && it.country && it.country !== "FR" && (it.city || it.owner?.city));
  const intlKeys = [...new Set(intlItems.map((it: any) => `${it.city || it.owner?.city}, ${it.country}`))];
  const intlCoords = new Map<string, { lat: number; lng: number }>();
  await Promise.all(intlKeys.map(async (k) => {
    const c = await geocodeCity(k);
    if (c) intlCoords.set(k, { lat: c.lat, lng: c.lng });
  }));
  final.forEach((item: any) => {
    if (!item) return;
    if (item.latitude && item.longitude) {
      coordsMap.set(item.id, { lat: item.latitude, lng: item.longitude });
    } else if (item.country && item.country !== "FR") {
      const key = `${item.city || item.owner?.city}, ${item.country}`;
      const c = intlCoords.get(key);
      if (c) coordsMap.set(item.id, c);
    } else if (item.owner?.city) {
      const c = cityCoords.get(item.owner.city);
      if (c) coordsMap.set(item.id, c);
    }
  });
  setResultCoords(coordsMap);
 setResults(final);
 setVisibleCount(12);
 };


  const searchMissions = async (searchCoords: { lat: number; lng: number } | null) => {
  let query = supabase
.from("small_missions")
.select("*")
.eq("status", "open")
.order("created_at", { ascending: false });
  const { data } = await query;
  let items = data || [];
  // Les « offres » sont des disponibilités de membres : elles doivent vivre dans
  // l'onglet Membres disponibles, pas dans le flux des demandes publiées.
  items = items.filter((m: any) => (m.mission_type ?? "besoin") !== "offre");
  // Hydrate owner via public_profiles (anon n'a pas accès à la table profiles
  // utilisée par le FK embed PostgREST).
  const ownerIds = Array.from(new Set(items.map((m: any) => m.user_id).filter(Boolean)));
  if (ownerIds.length > 0) {
    const { data: owners } = await supabase
      .from("public_profiles")
      .select("id, first_name, avatar_url, city, postal_code, identity_verified, is_founder")
      .in("id", ownerIds);
    const ownerMap = new Map<string, any>((owners || []).map((o: any) => [o.id, o]));
    items = items.map((m: any) => ({ ...m, owner: ownerMap.get(m.user_id) || null }));
  }
  if (missionTypeFilter !== "all") {
    items = items.filter((m: any) => (m.mission_type ?? "besoin") === missionTypeFilter);
  }
  if (missionCategoryFilter !== "all") {
    items = items.filter((m: any) => m.category === missionCategoryFilter);
  }
  if (verifiedOnly) items = items.filter((s: any) => s.owner?.identity_verified);

  const getMissionCity = (m: any) => m.city || m.owner?.city;
  const getMissionPostalCode = (m: any) => m.postal_code || m.owner?.postal_code;
  const cityCoords = new Map<string, { lat: number; lng: number }>();
  const uniqueCities = [...new Set(items.filter((m: any) => !(m.latitude && m.longitude)).map(getMissionCity).filter(Boolean))] as string[];
  await Promise.all(uniqueCities.map(async (c) => {
    const coords = await geocodeCity(c);
    if (coords) cityCoords.set(c, { lat: coords.lat, lng: coords.lng });
  }));
  const getMissionCoords = (m: any): { lat: number; lng: number } | null => {
    if (m.latitude && m.longitude) return { lat: m.latitude, lng: m.longitude };
    const cityName = getMissionCity(m);
    return cityName ? cityCoords.get(cityName) || null : null;
  };
  const refDept = getDeptCode(getZoneRefPostalCode());
  const refRegion = getRegionCode(refDept);
  const radiusCount = searchCoords ? items.filter((m: any) => {
    const coords = getMissionCoords(m);
    return coords ? haversineDistance(searchCoords.lat, searchCoords.lng, coords.lat, coords.lng) <= radius[0] : false;
  }).length : items.length;
  const deptCount = refDept ? items.filter((m: any) => getDeptCode(getMissionPostalCode(m)) === refDept).length : 0;
  const regionCount = refRegion ? items.filter((m: any) => getRegionCode(getDeptCode(getMissionPostalCode(m))) === refRegion).length : 0;
  setDensityCounts({ radius: radiusCount, dept: deptCount, region: regionCount, france: items.length });

  if (zoneMode === "radius" && searchCoords) {
    items = items.filter((m: any) => {
      const coords = getMissionCoords(m);
      return coords ? haversineDistance(searchCoords.lat, searchCoords.lng, coords.lat, coords.lng) <= radius[0] : false;
    });
  } else if (zoneMode === "dept" && refDept) {
    items = items.filter((m: any) => getDeptCode(getMissionPostalCode(m)) === refDept);
  } else if (zoneMode === "region" && refRegion) {
    items = items.filter((m: any) => getRegionCode(getDeptCode(getMissionPostalCode(m))) === refRegion);
  }

  items = items.map((m: any) => {
    const coords = searchCoords ? getMissionCoords(m) : null;
    const dist = searchCoords && coords ? haversineDistance(searchCoords.lat, searchCoords.lng, coords.lat, coords.lng) : null;
    return { ...m, distance: dist, isNew: differenceInHours(new Date(), new Date(m.created_at)) < 48 } as any;
  });
  let final: any[] = [...items];
  if (sort === "closest") final.sort((a: any, b: any) => (a.distance ?? 9999) - (b.distance ?? 9999));
  else if (sort === "recent") final.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  // Démos toujours visibles, intercalées
  final = interleaveDemos(final, DEMO_MISSIONS, 3);
 setResults(final);
 setVisibleCount(12);
  };

 const searchAvailableMembers = async (searchCoords: { lat: number; lng: number } | null) => {
 // 1) Profils opt-in « available_for_help »
 const { data: optInData } = await supabase
.from("public_profiles")
.select("id, first_name, avatar_url, city, postal_code, bio, skill_categories, custom_skills, available_for_help, is_founder")
.eq("available_for_help", true)
.not("skill_categories", "eq", "{}");

 // 2) Auteurs ayant publié une « offre » de coup de main encore ouverte
 //    -> considérés disponibles de fait, même sans opt-in available_for_help
 const { data: offreMissions } = await supabase
   .from("small_missions")
    .select("id, user_id, title, category, city, postal_code, created_at")
   .eq("mission_type", "offre")
   .eq("status", "open");
 const offreAuthorIds = Array.from(new Set((offreMissions || []).map((m: any) => m.user_id))).filter(Boolean);
 const offreCatsByUser = new Map<string, Set<string>>();
  const offresByUser = new Map<string, any[]>();
 (offreMissions || []).forEach((m: any) => {
   if (!m.user_id) return;
   const set = offreCatsByUser.get(m.user_id) || new Set<string>();
   if (m.category) set.add(m.category);
   offreCatsByUser.set(m.user_id, set);
    const rows = offresByUser.get(m.user_id) || [];
    rows.push(m);
    rows.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    offresByUser.set(m.user_id, rows);
 });
 let offreProfiles: any[] = [];
 if (offreAuthorIds.length > 0) {
   const { data } = await supabase
     .from("public_profiles")
      .select("id, first_name, avatar_url, city, postal_code, bio, skill_categories, custom_skills, available_for_help, is_founder")
     .in("id", offreAuthorIds);
   const catToSkillKey: Record<string, string> = { garden: "jardin", animals: "animaux", skills: "competences", house: "coups_de_main" };
   offreProfiles = (data || []).map((p: any) => {
     const cats = offreCatsByUser.get(p.id);
      const publishedOffres = offresByUser.get(p.id) || [];
      const primaryOffre = publishedOffres[0] || null;
     const mergedCats = new Set<string>(p.skill_categories || []);
     cats?.forEach((c) => { const k = catToSkillKey[c]; if (k) mergedCats.add(k); });
      return {
        ...p,
        city: p.city || primaryOffre?.city,
        postal_code: p.postal_code || primaryOffre?.postal_code,
        skill_categories: Array.from(mergedCats),
        has_published_offre: true,
        primary_offre: primaryOffre,
        published_offres: publishedOffres,
      };
   });
 }

 // Fusion (dédoublonnée), en excluant l'utilisateur courant
 const mergedMap = new Map<string, any>();
 [...(optInData || []), ...offreProfiles].forEach((p: any) => {
   if (!p?.id || p.id === user?.id) return;
   const existing = mergedMap.get(p.id);
   mergedMap.set(p.id, existing ? { ...existing, ...p, has_published_offre: existing.has_published_offre || p.has_published_offre } : p);
 });
 let items = Array.from(mergedMap.values());
 const catToSkill: Record<string, string> = { garden: "jardin", animals: "animaux", skills: "competences", house: "coups_de_main" };
 if (missionCategoryFilter !== "all") {
 const skillKey = catToSkill[missionCategoryFilter];
 items = items.filter((m: any) => m.skill_categories?.includes(skillKey));
 }
  const getMemberCity = (m: any) => m.city || m.primary_offre?.city;
  const getMemberPostalCode = (m: any) => m.postal_code || m.primary_offre?.postal_code;
  const refDept = getDeptCode(getZoneRefPostalCode());
  const refRegion = getRegionCode(refDept);
  let cityCoords = new Map<string, { lat: number; lng: number }>();
  let radiusCount = items.length;

  if (zoneMode !== "france" && (zoneMode === "radius" || sort === "closest") && searchCoords) {
    const uniqueCities = [...new Set(items.map(getMemberCity).filter(Boolean))] as string[];
    await Promise.all(uniqueCities.map(async (c) => {
      const coords = await geocodeCity(c);
      if (coords) cityCoords.set(c, { lat: coords.lat, lng: coords.lng });
    }));
    radiusCount = items.filter((m: any) => {
      const cityName = getMemberCity(m);
      const coords = cityName ? cityCoords.get(cityName) : null;
      return coords ? haversineDistance(searchCoords.lat, searchCoords.lng, coords.lat, coords.lng) <= radius[0] : false;
    }).length;
  }

  const deptCount = refDept ? items.filter((m: any) => getDeptCode(getMemberPostalCode(m)) === refDept).length : 0;
  const regionCount = refRegion ? items.filter((m: any) => getRegionCode(getDeptCode(getMemberPostalCode(m))) === refRegion).length : 0;
  setDensityCounts({ radius: radiusCount, dept: deptCount, region: regionCount, france: items.length });

  if (zoneMode === "radius" && searchCoords) {
    items = items.filter((m: any) => {
      const cityName = getMemberCity(m);
      const coords = cityName ? cityCoords.get(cityName) : null;
      return coords ? haversineDistance(searchCoords.lat, searchCoords.lng, coords.lat, coords.lng) <= radius[0] : false;
    });
  } else if (zoneMode === "dept" && refDept) {
    items = items.filter((m: any) => getDeptCode(getMemberPostalCode(m)) === refDept);
  } else if (zoneMode === "region" && refRegion) {
    items = items.filter((m: any) => getRegionCode(getDeptCode(getMemberPostalCode(m))) === refRegion);
  }

  items = items.map((m: any) => {
    const cityName = getMemberCity(m);
    const coords = cityName ? cityCoords.get(cityName) : null;
    const dist = searchCoords && coords ? haversineDistance(searchCoords.lat, searchCoords.lng, coords.lat, coords.lng) : null;
    return { ...m, distance: dist };
  });
 const memberIds = items.map((m: any) => m.id);
 if (memberIds.length > 0) {
  const { data: sitterProfiles } = await supabase
    .from("sitter_profiles")
    .select("user_id, competences")
    .in("user_id", memberIds);
  const competenceMap = new Map<string, string[]>();
  (sitterProfiles || []).forEach((sp: any) => {
    if (sp.competences?.length) competenceMap.set(sp.user_id, sp.competences);
  });
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
  return {...m, competences: competenceMap.get(m.id) || [], avgRating: rev ? (rev.total / rev.count).toFixed(1) : null, reviewCount: rev?.count || 0, sitsCount: sitsMap.get(m.id) || 0 };
 });
 }
  if (sort === "closest") items.sort((a: any, b: any) => (a.distance ?? 9999) - (b.distance ?? 9999));
 else if (sort === "rating") items.sort((a: any, b: any) => parseFloat(b.avgRating || "0") - parseFloat(a.avgRating || "0"));
 // Tri prio : savoir-faire particuliers (competences) AVEC photo > competences sans photo > autres avec photo > autres sans photo.
 // Ce tri prime sur les autres pour mettre en avant la valeur ajoutée (reiki, éducation canine, ostéo…).
  const skillRank = (m: any) => {
    const hasSpecificSkills =
      tokenizeSkillPhrases(m.custom_skills || []).length > 0 ||
      tokenizeSkillPhrases(m.competences || []).length > 0 ||
      !!m.specialty_label;
   const hasAvatar = !!m.avatar_url;
    if (hasSpecificSkills && hasAvatar) return 0;
    if (hasSpecificSkills) return 1;
   if (hasAvatar) return 2;
   return 3;
 };
 items.sort((a: any, b: any) => skillRank(a) - skillRank(b));
 // Démos "savoir-faire complémentaires" toujours visibles (reiki, naturopathie, ostéo…)
 //, seulement quand le filtre catégorie est "all" ou "skills".
 const showDemoMembers = missionCategoryFilter === "all" || missionCategoryFilter === "skills";
 if (showDemoMembers) {
   items = interleaveDemos(items, DEMO_MEMBERS as any[], 3);
 }
 setAvailableMembers(items);
 setResults([]);
 };

 const sortResults = (items: any[], sortBy: SortOption) => {
 const sorted = [...items];
 if (sortBy === "closest") sorted.sort((a, b) => (a.distance ?? 9999) - (b.distance ?? 9999));
 else if (sortBy === "recent") sorted.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
 else if (sortBy === "rating") sorted.sort((a, b) => parseFloat(b.avgRating || "0") - parseFloat(a.avgRating || "0"));
  // Tri secondaire : on pousse en bas les annonces inactives (attribuées),
  // puis tout en bas les annonces passées (expirées, complétées, annulées).
  sorted.sort((a, b) => Number(!!a.isAssigned || !!a.isCompleted || !!a.isPast) - Number(!!b.isAssigned || !!b.isCompleted || !!b.isPast));
  sorted.sort((a, b) => Number(!!a.isCompleted || !!a.isPast) - Number(!!b.isCompleted || !!b.isPast));
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
 const availableSitsCount = results.filter((r: any) => !r.isAssigned && !r.isCompleted && !r.isPast && !r.is_demo).length;
 const demoCount = results.filter((r: any) => r.is_demo).length;
 const resultCount = tab === "missions" && missionSubTab === "members" ? availableMembers.length : availableSitsCount;
  // hasNoLocalRealMissions retiré : OutOfZoneBanner couvre déjà ce cas.
 const countLabel = tab === "missions" && missionSubTab === "members"
 ? `${resultCount} membre${resultCount > 1 ? "s" : ""} disponible${resultCount > 1 ? "s" : ""}`
  : resultCount === 0 && demoCount > 0
  ? `${demoCount} exemple${demoCount > 1 ? "s" : ""} ci-dessous, en attendant de vraies annonces`
 : resultCount === 0
 ? (city ? `Aucune annonce ouverte près de ${city}` : "Aucune annonce ouverte sur ce périmètre")
 : city
 ? `${resultCount} annonce${resultCount > 1 ? "s" : ""} disponible${resultCount > 1 ? "s" : ""} près de vous`
 : `${resultCount} annonce${resultCount > 1 ? "s" : ""} disponible${resultCount > 1 ? "s" : ""} en France`;

 // ─── Pill style ───
 const pillClass = "snap-start flex items-center gap-2 px-4 py-2 min-h-11 rounded-full border border-border bg-card cursor-pointer hover:border-primary transition-colors text-sm whitespace-nowrap shrink-0";

   // ─── Card renderer ───
  const renderCard = (item: any, listIndex?: number) => (
    <SearchListingCard
      key={item.id}
      item={item}
      listIndex={listIndex}
      tab={tab}
      radius={radius[0]}
      hasAccess={hasAccess}
      testDemoMode={testDemoMode}
      formatDate={formatDate}
      viewerSitterProfile={sitterProfile}
    />
  );


 // ─── Render ───
  // Visiteurs non connectés : annonces visibles (consultation libre pour conversion).
  // Sitters connectés sans abo : overlay premium maintenu.
  const isSitterLocked = !!user && !hasAccess && tab === "sits";

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
 {/* ─── En-tête onglet ─── (masqué en mode public : /annonces est dédiée gardes)
     L'onglet « Coup de main » a été retiré : les missions et l'entraide
     vivent dans le hub dédié /petites-missions pour éviter la confusion
     entre recherche de gardes et entraide communautaire. */}
 {/* Migration douce : ancien state "missions" forcé sur "sits" via effet */}
 {!isPublic && (
   <div className="px-4 sm:px-6 pt-3 sm:pt-4 border-b border-border flex items-center justify-between gap-3">
     <h2 className="text-sm font-semibold text-foreground pb-2">Annonces de garde</h2>
     <Link
       to="/petites-missions"
       className="text-xs text-primary hover:underline pb-2 shrink-0"
     >
       Coup de main & entraide →
     </Link>
   </div>
 )}

 {/* Mission sub-tabs */}
 {!isPublic && tab === "missions" && (
 <div className="px-6 pt-3">
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
 </div>
 )}

 {/* Catégories partagées (Gardes + Missions)
     Masquées en mode public sur l'onglet sits : ces catégories
     ("Maison / Jardins / Bricolage / Animaux") sont pensées pour les
     missions, pas pour les annonces de garde où elles induisent en erreur. */}
 {tab === "missions" && (
 <div className="px-6 pt-3">
 <div className="flex flex-wrap gap-2">
				{([
					{ key: "all" as const, label: "Tout", icon: null },
					{ key: "house" as const, label: "Maison", icon: Home },
					{ key: "garden" as const, label: "Jardins", icon: Sprout },
					{ key: "skills" as const, label: "Bricolage", icon: Wrench },
					{ key: "animals" as const, label: "Animaux", icon: PawPrint },
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
  {/* Réassurance périmètre retirée : redondante avec le sélecteur Zone (radius / dept / France). */}

  {/* ─── Sticky search bar ─── */}
  <div className="sticky top-[52px] md:top-0 z-[1100] bg-background border-b-2 border-border shadow-sm">
   {/* Mobile compact bar (carte uniquement) : un résumé + bouton qui replie/déplie les filtres */}
   {isMobile && viewMode === "map" && (
    <button
     type="button"
     onClick={() => setMobileFiltersOpen(o => !o)}
     aria-expanded={mobileFiltersOpen}
     aria-controls="search-filter-pills"
     className="w-full flex items-center justify-between gap-2 px-4 py-2.5 text-left border-b border-border/60"
    >
     <span className="flex items-center gap-2 text-sm font-medium text-foreground min-w-0">
      <MapPin className="h-4 w-4 text-primary shrink-0" />
      <span className="truncate">{city || "Lieu"} · {datesLabel}</span>
      {hasActiveFilters && !mobileFiltersOpen && (
       <span className="ml-1 inline-flex items-center rounded-full bg-accent text-accent-foreground px-2 py-0.5 text-[11px] font-semibold shrink-0">
        {activeFiltersCount} filtre{activeFiltersCount > 1 ? "s" : ""} actif{activeFiltersCount > 1 ? "s" : ""}
       </span>
      )}
     </span>
     <span className="ml-2 inline-flex items-center gap-1.5 rounded-full bg-primary text-primary-foreground px-3 py-1.5 text-xs font-semibold shrink-0">
      <SlidersHorizontal className="h-3.5 w-3.5" />
      {mobileFiltersOpen ? "Fermer" : "Filtres"}
     </span>
    </button>
   )}
    {/* ─── Hero search bar (desktop) ─── Champ ville dominant + CTA Rechercher */}
    <div className="hidden md:flex items-center gap-3 px-6 pt-4 pb-2">
      <div className="flex-1 min-w-0">
        <LocationPickerPopover
          open={editingCity}
          onOpenChange={setEditingCity}
          triggerClassName="w-full flex items-center gap-3 rounded-2xl border border-border bg-card hover:border-primary transition-colors px-5 py-4 text-left shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          city={city}
          cityInput={cityInput}
          onCityInputChange={handleCityInputChange}
          onCityConfirm={handleCityConfirm}
          citySuggestions={citySuggestions}
          deptSuggestions={deptSuggestions}
          regionSuggestions={regionSuggestions}
          primaryDeptCode={primaryDeptCode}
          onCitySelect={handleCitySelect}
          onDeptSelect={handleDeptSelect}
          onRegionSelect={handleRegionSelect}
          onGeolocate={handleGeolocation}
        />
      </div>
      {loading && (
        <div className="shrink-0 flex items-center gap-2 text-sm text-muted-foreground px-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          Recherche…
        </div>
      )}
    </div>

    <div
     id="search-filter-pills"
     className={`relative -mr-6 sm:mr-0 ${isMobile && viewMode === "map" && !mobileFiltersOpen ? "hidden" : ""}`}
    >
    <div className="flex flex-row items-center gap-2 px-6 py-3 overflow-x-auto no-scrollbar pr-10 sm:pr-6 snap-x snap-mandatory scroll-px-6 overscroll-x-contain">
  {/* Location pill (mobile uniquement — sur desktop, le champ ville hero est au-dessus) */}
  <div className="md:hidden contents">
  <LocationPickerPopover
    open={editingCity}
    onOpenChange={setEditingCity}
    triggerClassName={pillClass}
    city={city}
    cityInput={cityInput}
    onCityInputChange={handleCityInputChange}
    onCityConfirm={handleCityConfirm}
    citySuggestions={citySuggestions}
    deptSuggestions={deptSuggestions}
    regionSuggestions={regionSuggestions}
    primaryDeptCode={primaryDeptCode}
    onCitySelect={handleCitySelect}
    onDeptSelect={handleDeptSelect}
    onRegionSelect={handleRegionSelect}
    onGeolocate={handleGeolocation}
  />
  </div>


   {/* Zone pill (radius / dept / region / france), désactivé hors connexion */}
   <div
     className={!user ? "opacity-60 pointer-events-none" : ""}
     aria-disabled={!user}
     title={!user ? "Connectez-vous pour filtrer par distance" : undefined}
   >
     <ZonePickerPopover
       pillClass={pillClass}
       zoneMode={zoneMode}
       setZoneMode={setZoneMode}
       radius={radius}
       setRadius={setRadius}
       userPostalCode={userPostalCode}
       densityCounts={densityCounts}
     />
   </div>

   {/* Dates pill */}
   <DatesPickerPopover
     pillClass={pillClass}
     datesLabel={datesLabel}
     startDate={startDate}
     endDate={endDate}
     setStartDate={setStartDate}
     setEndDate={setEndDate}
   />
 
 {/* Animals picker retiré, remplacé par la pill catégorie « Animaux » ci-dessus */}


   {/* Pill "Vérifié" retirée : accessible dans le sheet Filtres. La chip d'actif ci-dessous suffit. */}

   {/* Advanced filters pill, type de logement / environnement, désactivé hors connexion */}
   <div
     className={!user ? "opacity-60 pointer-events-none" : ""}
     aria-disabled={!user}
     title={!user ? "Connectez-vous pour affiner par type de logement et environnement" : undefined}
   >
      <AdvancedFiltersSheet
        open={filterSheetOpen}
        onOpenChange={setFilterSheetOpen}
        pillClass={pillClass}
        hasActiveFilters={hasActiveFilters}
        activeFiltersCount={activeFiltersCount}

        resetFilters={resetFilters}
        housingTypes={housingTypes}
        toggleHousingType={toggleHousingType}
        envOptions={envOptions}
        environments={environments}
        toggleEnv={toggleEnv}
        verifiedOnly={verifiedOnly}
        setVerifiedOnly={setVerifiedOnly}
        withPhotosOnly={withPhotosOnly}
        setWithPhotosOnly={setWithPhotosOnly}
        minExperience={minExperience}
        setMinExperience={setMinExperience}
        currentResultsCount={results.length}
        loading={loading}
        onApply={() => {
          doSearch();
          setFilterSheetOpen(false);
        }}
      />
    </div>
   {/* ─── Chips filtres actifs avec dismiss X ─── */}
   {animalTypes.map((animal) => (
     <span key={animal} className="snap-start inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[36px] rounded-full bg-primary/10 border border-primary text-primary text-xs font-semibold shrink-0 whitespace-nowrap">
       {animal}
       <button
         aria-label={`Retirer ${animal}`}
         onClick={() => toggleAnimalFilter(animal)}
         className="rounded-full hover:bg-primary/20 p-0.5"
       >
         <X className="h-3 w-3" />
       </button>
     </span>
   ))}
   {verifiedOnly && (
     <span className="snap-start inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[36px] rounded-full bg-primary/10 border border-primary text-primary text-xs font-semibold shrink-0 whitespace-nowrap">
       Vérifié
       <button aria-label="Retirer filtre Vérifié" onClick={() => setVerifiedOnly(false)} className="rounded-full hover:bg-primary/20 p-0.5">
         <X className="h-3 w-3" />
       </button>
     </span>
   )}
   <div aria-hidden className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-background to-transparent sm:hidden" />
   </div>
   </div>

 {/* ─── Sort bar + view toggle (sticky avec les pills pour cohérence visuelle) ─── */}
 <div className="flex justify-between items-center gap-2 px-4 sm:px-6 py-2 border-t border-border/60 bg-background flex-nowrap">
 <div className="flex items-center gap-2 min-w-0 flex-1">
 <span className="text-xs sm:text-sm text-muted-foreground truncate flex-1 min-w-0" title={countLabel}>{loading ? "Recherche…" : countLabel}</span>
 <Select value={sort} onValueChange={(v) => handleSortChange(v as SortOption)}>
 <SelectTrigger className="h-8 w-auto gap-1.5 rounded-full border-border bg-card px-3 text-xs shrink-0">
 <span className="text-muted-foreground hidden sm:inline">Trier&nbsp;:</span>
 <SelectValue />
 </SelectTrigger>
 <SelectContent align="start">
 <SelectItem value="closest">Plus proches</SelectItem>
 <SelectItem value="recent">Plus récentes</SelectItem>
 <SelectItem value="rating">Mieux notées</SelectItem>
 </SelectContent>
 </Select>
 </div>
   {/* Lien "Français à l'étranger" retiré du toolbar — trop peu utilisé pour occuper cette place. Déplacé en fin de résultats. */}
  {/* Bouton « Créer une alerte » retiré du toolbar : l'empty state et OutOfZoneBanner exposent déjà ce CTA au bon moment. */}
  <div className="hidden sm:flex border border-border rounded-lg overflow-hidden shrink-0">
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
 </div>

 {/* Densité supprimée, déjà visible dans le sélecteur de Zone et le bandeau hors-zone */}

   {/* ─── Out-of-zone banner ─── PRIORITÉ 1 : quand il s'affiche, il masque
        SitterDiscoveryBanner et AffinityMissingCTA (une seule bannière au-dessus des résultats). */}
   {(() => {
     const showOutOfZone = tab === "sits" && !loading && zoneMode !== "france" && densityCounts.france > densityCounts.radius && availableSitsCount > 0;
     return showOutOfZone ? (
       <OutOfZoneBanner
         zoneMode={zoneMode}
         setZoneMode={setZoneMode}
         densityCounts={densityCounts}
         radius={radius}
         city={city}
         alertCreated={alertCreated}
         isCreatingAlert={isCreatingAlert}
         handleCreateAlert={handleCreateAlert}
         navigate={navigate}
         trackEvent={trackEvent}
       />
     ) : null;
   })()}

  {/* hasNoLocalRealMissions banner retiré : OutOfZoneBanner couvre déjà l'élargissement de zone. */}

 {/* ─── No city warning ─── (masqué si OutOfZoneBanner déjà visible pour éviter l'empilement) */}
 {!userCity && !(tab === "sits" && !loading && zoneMode !== "france" && densityCounts.france > densityCounts.radius) && (
 <div className="mx-6 mt-4 bg-accent border border-border rounded-lg p-3 text-sm">
 <MapPin className="inline h-4 w-4 mr-1.5 text-primary" />
 <Link to="/profile" className="text-primary underline">Renseignez votre ville</Link> pour voir les gardes près de chez vous.
 </div>
 )}

 {/* ─── Mode test démos (?testDemos=1), panneau diagnostique ─── */}
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
 <Sparkles className="h-4 w-4" /> MODE TEST DÉMOS, Onglet&nbsp;: <span className="bg-amber-200 px-2 py-0.5 rounded">{tabLabel}</span>
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
 : "Aucune démo détectée, vérifier interleaveDemos()"}
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
 : "trop peu de vraies annonces, démos placées en fin de liste"
 : `règle violée, ${missingPositions.length} manquante(s), ${unexpectedPositions.length} hors-règle (voir détails ci-dessous)`}
 </span>
 </li>
 )}
 <li className="flex items-center gap-2 text-muted-foreground">
 <span>🎨</span>
 <span>Chaque carte est encadrée et numérotée&nbsp;: <span className="text-amber-700 font-semibold">DEMO</span> en jaune, <span className="text-sky-700 font-semibold">REAL</span> en bleu.</span>
 </li>
 </ul>

 {/* Tableau de vérification par filtre, historique des changements */}
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
 : ",";
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
 <td className="px-2 py-1 max-w-[120px] truncate" title={row.city || ","}>
 {row.city || ","}
 </td>
 <td className="px-2 py-1 whitespace-nowrap">{dates}</td>
 <td className="px-2 py-1">{row.sort}</td>
 <td className="px-2 py-1 text-right text-sky-700 font-semibold">{row.real}</td>
 <td className="px-2 py-1 text-right text-amber-700 font-semibold">{row.demo}</td>
 <td className="px-2 py-1 text-muted-foreground">
 {row.positions.length > 0 ? row.positions.map((p) => `#${p}`).join(", ") : ","}
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
 ÉCHEC INTERCALATION, la règle « 1 démo toutes les 3 vraies annonces » n'est pas respectée
 </p>
 <p className="text-red-900/80">
 Cause possible&nbsp;: changement de filtre, pagination ou tri qui réordonne la liste après{" "}
 <code className="bg-red-100 px-1 rounded">interleaveDemos()</code>.
 </p>
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 font-mono">
 <div className="bg-red-50 rounded p-2 border border-red-200">
 <div className="text-red-700/70 text-[10px] uppercase tracking-wide">Positions attendues</div>
 <div className="text-red-900 font-semibold">
 {expectedPositions.length > 0 ? expectedPositions.map((p) => `#${p}`).join(", ") : ","}
 </div>
 </div>
 <div className="bg-red-50 rounded p-2 border border-red-200">
 <div className="text-red-700/70 text-[10px] uppercase tracking-wide">Positions observées</div>
 <div className="text-red-900 font-semibold">
 {observedPositions.length > 0 ? observedPositions.map((p) => `#${p}`).join(", ") : ","}
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
 : ","}
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
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-6 sm:gap-y-10">
    {Array.from({ length: 6 }).map((_, i) => (
      <div key={i} className="space-y-3">
        <Skeleton className="aspect-[4/3] w-full rounded-xl" />
        <Skeleton className="h-4 w-3/4 rounded" />
        <Skeleton className="h-3 w-1/2 rounded" />
      </div>
    ))}
  </div>
 ) : tab === "missions" && missionSubTab === "members" ? (
 availableMembers.length === 0 ? (
 <div className="text-center py-16 space-y-3">
 <Search className="h-12 w-12 mx-auto text-primary/30" />
 <p className="font-heading font-semibold text-lg text-foreground">Aucun membre disponible dans ce rayon</p>
 <p className="text-sm text-muted-foreground">Élargissez votre rayon de recherche.</p>
 </div>
 ) : (() => {
 const activePublishers = availableMembers.filter((m: any) => m.has_published_offre && !m.is_demo);
 const complementary = availableMembers.filter((m: any) => !m.has_published_offre || m.is_demo);
 const renderCard = (member: any) => {
 const skillMeta: Record<string, { label: string; icon: typeof Sprout }> = {
 jardin: { label: "Jardin", icon: Sprout },
 animaux: { label: "Animaux", icon: PawPrint },
 competences: { label: "Compétences", icon: GraduationCap },
 coups_de_main: { label: "Coups de main", icon: HandshakeIcon },
 };
 const skills: string[] = member.skill_categories || [];
 const visibleSkills = skills.slice(0, 2);
 const extraCount = skills.length - 2;
  const activeOfferTitle = member.primary_offre?.title;
 const seenSpecialSkills = new Set<string>();
 const specialSkills = [
 ...(member.specialty_label ? [member.specialty_label] : []),
 ...tokenizeSkillPhrases(member.custom_skills || []),
 ...tokenizeSkillPhrases(member.competences || []),
 ].filter((label: string) => {
 const key = normalizeSkillKey(label);
 if (!key || seenSpecialSkills.has(key)) return false;
 seenSpecialSkills.add(key);
 return true;
 });
 return (
 <div key={member.id} className={`bg-card rounded-2xl border p-4 flex items-center gap-4 ${member.is_demo ? "border-amber-300/70 border-dashed" : member.has_published_offre ? "border-primary/40 ring-1 ring-primary/20" : "border-border"}`}>
 {member.avatar_url ? (
 <img src={member.avatar_url} alt="" className="w-12 h-12 rounded-full object-cover shrink-0" loading="lazy" />
 ) : (
 <div className="w-12 h-12 rounded-full bg-accent flex items-center justify-center text-sm font-bold shrink-0 text-foreground">
 {member.first_name?.charAt(0) || "?"}
 </div>
 )}
 <div className="flex-1 min-w-0">
 <div className="flex items-center gap-2 flex-wrap">
 <p className="text-base font-heading font-semibold text-foreground">{member.first_name || "Membre"}</p>
 {member.is_founder && <FounderBadge size="sm" />}
 {member.has_published_offre && (
 <span className="text-[10px] font-semibold uppercase tracking-wider bg-primary/15 text-primary rounded-full px-2 py-0.5">
  Offre active
 </span>
 )}
 </div>
 {member.city && <p className="text-xs text-muted-foreground">{member.city}{member.distance != null ? ` · à ${Math.round(member.distance)} km` : ""}</p>}
  {activeOfferTitle && (
  <p className="text-[13px] font-semibold text-foreground mt-1 line-clamp-2">{activeOfferTitle}</p>
  )}
 {member.specialty_label && (
 <p className="text-[13px] font-semibold text-amber-700 mt-1">{member.specialty_label}</p>
 )}
 {member.specialty_description && (
 <p className="text-xs text-muted-foreground italic line-clamp-2 mt-0.5">{member.specialty_description}</p>
 )}
 {!member.specialty_description && member.bio && (
 <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{member.bio}</p>
 )}
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
 {specialSkills.length > 0 && (
 <div className="flex flex-wrap gap-1.5 mt-1.5">
 {specialSkills.slice(0, 3).map((skill: string) => (
 <span key={skill} className="rounded-full border border-accent bg-accent/50 text-accent-foreground text-xs px-2.5 py-0.5">
 {skill}
 </span>
 ))}
 {specialSkills.length > 3 && <span className="text-xs text-muted-foreground self-center">+{specialSkills.length - 3}</span>}
 </div>
 )}
 {(member.avgRating || member.sitsCount > 0) && (
 <p className="text-xs text-muted-foreground mt-1">
 {member.avgRating && <>★ {member.avgRating}</>}
 {member.sitsCount > 0 && <> · {member.sitsCount} garde{member.sitsCount > 1 ? "s" : ""}</>}
 </p>
 )}
 </div>
 <div className="flex flex-col items-end gap-2 shrink-0">
 {member.is_demo ? (
 <span className="text-[10px] font-semibold uppercase tracking-wider bg-amber-100 text-amber-800 rounded-full px-2 py-1">
 Exemple
 </span>
 ) : (
 <>
 <span onClick={(e) => e.stopPropagation()}>
 <FavoriteButton targetType="sitter" targetId={member.id} size="sm" />
 </span>
 <span onClick={(e) => e.stopPropagation()}>
 <InviteToMySitButton sitter={{ id: member.id, first_name: member.first_name }} />
 </span>
 <Link
 to={`/gardiens/${member.id}`}
 className="text-sm text-primary font-semibold hover:underline"
 >
 Voir le profil →
 </Link>
 </>
 )}
 </div>
 </div>
 );
 };
 return (
 <div className="space-y-6">
 {activePublishers.length > 0 && (
 <div className="space-y-3">
 <div className="flex items-baseline justify-between gap-3">
 <h3 className="font-heading font-semibold text-foreground text-base">
 Membres avec une offre publiée
 <span className="ml-2 text-xs font-normal text-muted-foreground">({activePublishers.length})</span>
 </h3>
 <p className="text-xs text-muted-foreground italic">Annonces actives de coup de main</p>
 </div>
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 {activePublishers.map(renderCard)}
 </div>
 </div>
 )}
 {complementary.length > 0 && (
 <details className="group rounded-2xl border border-border bg-muted/30 open:bg-transparent">
 <summary className="cursor-pointer list-none px-4 py-3 flex items-center justify-between gap-3">
 <div>
 <p className="font-heading font-semibold text-foreground text-sm">
 {activePublishers.length > 0 ? "Autres membres déclarés disponibles" : "Membres déclarés disponibles"}
 <span className="ml-2 text-xs font-normal text-muted-foreground">({complementary.length})</span>
 </p>
 <p className="text-xs text-muted-foreground">Pas d'annonce active, mais ouverts à être contactés.</p>
 </div>
 <span className="text-xs text-primary font-semibold group-open:hidden">Afficher ▾</span>
 <span className="text-xs text-primary font-semibold hidden group-open:inline">Masquer ▴</span>
 </summary>
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 pt-2">
 {complementary.map(renderCard)}
 </div>
 </details>
 )}
 </div>
 );
 })()
  ) : results.length === 0 ? (
    <SearchEmptyState
      tab={tab}
      setTab={setTab}
      zoneMode={zoneMode}
      setZoneMode={setZoneMode}
      densityCounts={densityCounts}
      nearbyRegions={nearbyRegions}
      nearbyZones={nearbyZones}
      launchModeCount={launchModeCount}
      crossTabCount={crossTabCount}
      city={city}
      alertCreated={alertCreated}
      isCreatingAlert={isCreatingAlert}
      handleCreateAlert={handleCreateAlert}
      sitterProfile={sitterProfile}
      handleActivateAvailable={handleActivateAvailable}
      trackEvent={trackEvent}
    />
  ) : (
  <>
    {(() => {
      // Priorité UNIQUE : OutOfZoneBanner > SitterDiscoveryBanner > AffinityMissingCTA.
      // Une seule bannière au-dessus des résultats pour éviter l'empilement.
      const outOfZoneVisible = tab === "sits" && !loading && zoneMode !== "france" && densityCounts.france > densityCounts.radius && availableSitsCount > 0;
      const showDiscovery = !isPublic && tab === "sits" && !outOfZoneVisible;
      const showAffinity = tab === "sits" && !!user && !!sitterProfile && !outOfZoneVisible && !showDiscovery;
      return (
        <>
          {showDiscovery && (
            <SitterDiscoveryBanner
              totalFrance={densityCounts.france}
              totalRadius={densityCounts.radius}
              zoneMode={zoneMode}
              city={city}
              alertCreated={alertCreated}
              isCreatingAlert={isCreatingAlert}
              onCreateAlert={handleCreateAlert}
              isAvailable={!!sitterProfile?.is_available}
              onActivateAvailable={handleActivateAvailable}
              onExpandToFrance={() => {
                trackEvent("search_empty_action", { source: "discovery_banner", metadata: { action: "expand_to_france", from: zoneMode, radius_count: densityCounts.radius, france_count: densityCounts.france } });
                setZoneMode("france");
              }}
            />
          )}
          {showAffinity && (
            <div className="mb-4">
              <AffinityMissingCTA
                side="sitter"
                profile={sitterProfile}
                context="search_listing"
                scope="list"
              />
            </div>
          )}
        </>
      );
    })()}

    {tab === "missions" ? (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
        {results.map((item, idx) => renderCard(item, idx))}
      </div>
    ) : (() => {
      // Groupement lecture : Disponibles → Exemples → Passées / Attribuées
      const activeReal = results.filter((r: any) => !r.is_demo && !r.isAssigned && !r.isCompleted && !r.isPast);
      const inactive = results.filter((r: any) => !r.is_demo && (r.isAssigned || r.isCompleted || r.isPast));
      const visibleActive = activeReal.slice(0, visibleCount);
      const hasMore = visibleActive.length < activeReal.length;
      const gridCls = "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-6 lg:gap-x-8 gap-y-8 sm:gap-y-10";
      const groupHeader = (title: string, count: number, sub?: string) => (
        <div className="mb-4 flex items-baseline justify-between gap-3">
          <h3 className="font-heading text-base sm:text-lg font-semibold text-foreground">
            {title} <span className="text-muted-foreground font-normal">({count})</span>
          </h3>
          {sub && <p className="text-xs text-muted-foreground hidden sm:block">{sub}</p>}
        </div>
      );
      let globalIdx = 0;
      return (
        <>
          {visibleActive.length > 0 && (
            <section className="mb-10">
              {inactive.length > 0 && groupHeader("Annonces disponibles", activeReal.length)}
              <div className={gridCls}>
                {visibleActive.map((item) => renderCard(item, globalIdx++))}
              </div>
              {hasMore && (
                <div className="mt-8 flex justify-center">
                  <button
                    onClick={() => setVisibleCount((c) => c + 12)}
                    className="rounded-full border border-border bg-card hover:bg-accent hover:border-primary/40 px-6 py-2.5 text-sm font-medium text-foreground transition-colors"
                  >
                    Voir plus d'annonces ({activeReal.length - visibleActive.length} restantes)
                  </button>
                </div>
              )}
            </section>
          )}

          {inactive.length > 0 && (
            <section className="mb-10">
              {groupHeader(
                "Annonces passées ou attribuées",
                inactive.length,
                "Signal d'activité dans la zone, non actionnables",
              )}
              <div className={gridCls}>
                {inactive.map((item) => renderCard(item, globalIdx++))}
              </div>
            </section>
          )}
        </>
      );
    })()}

     {/* Lien "Français à l'étranger" en pied de résultats (déplacé depuis le toolbar) */}
     {tab === "sits" && intlCount > 0 && !loading && results.length > 0 && (
       <div className="mt-8 flex justify-center">
         <Link
           to="/annonces/international"
           className="inline-flex items-center gap-2 rounded-full border border-border bg-card hover:bg-accent hover:border-primary/40 text-sm text-foreground px-4 py-2 transition-colors"
           aria-label={`Voir les ${intlCount} annonces hors France`}
         >
           <Globe2 className="h-4 w-4 text-muted-foreground" />
           <span>Vous cherchez à l'étranger ? Voir les {intlCount} annonce{intlCount > 1 ? "s" : ""} hors France</span>
         </Link>
       </div>
     )}
  </>
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

  {/* ─── FAB mobile toggle carte/liste ─── */}
   {/* FAB masqué en état vide : rien à afficher sur la carte, il ne ferait que
        chevaucher les CTA de l'empty state. */}
   {isMobile && tab === "sits" && availableSitsCount > 0 && (
    <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[1200] sm:hidden">
      <button
        onClick={() => setViewMode(viewMode === "list" ? "map" : "list")}
        className="inline-flex items-center gap-2 rounded-full bg-foreground text-background shadow-xl px-5 py-3 text-sm font-semibold transition-transform active:scale-95"
        aria-label={viewMode === "list" ? "Voir la carte" : "Voir la liste"}
      >
        {viewMode === "list" ? (
          <><MapIcon className="h-4 w-4" />Carte</>
        ) : (
          <><LayoutGrid className="h-4 w-4" />Liste</>
        )}
      </button>
    </div>
  )}
 </div>
 );
};

export default SearchSitter;
