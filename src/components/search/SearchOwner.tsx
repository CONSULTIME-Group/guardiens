import { fetchMyProfile } from "@/lib/myProfile";
import { useState, useEffect, useCallback, useMemo, useRef, lazy, Suspense } from "react";
import { useTranslation } from "react-i18next";
import PageMeta from "@/components/PageMeta";
import { logger } from "@/lib/logger";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import ReportButton from "@/components/reports/ReportButton";
import { supabase } from "@/integrations/supabase/client";
import { geocodeCity } from "@/lib/geocode";
import {
  fetchSitterSearchPool, fetchSitterCountryCounts, poolRowToSitter, distanceFrom,
  applyZone, zoneCounts, changeCountry, selectPlace, suggestionSources,
  fromGeoApiGouv, fromPhoton, computeMapViewport, RESULTS_PAGE_SIZE,
  type ZoneMode, type PlaceSuggestion,
} from "@/lib/sitterSearch";
import { ALLOWED_ALERT_RADII, snapToAllowedRadius } from "@/lib/alertRadius";
import { useAuth } from "@/contexts/AuthContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  MapPin, Star, SlidersHorizontal, MessageCircle, Zap,
  LayoutGrid, Map as MapIcon, ShieldCheck, Crosshair, CircleDot, Car, Calendar,
  Bell, BellRing, Loader2, Share2, AlertCircle, RefreshCw
} from "lucide-react";
import FavoriteButton from "@/components/shared/FavoriteButton";
import { ILLUSTRATIONS } from "@/components/shared/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { useToast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";
import VerifiedBadge from "@/components/profile/VerifiedBadge";
import EmergencyBadge from "@/components/profile/EmergencyBadge";
import { getDeptCode, DEPT_NAMES, deptToRefPostalCode } from "@/lib/departments";
import { getRegionCode, getRegionName, REGION_NAMES, DEPT_TO_REGION } from "@/lib/regions";
import { trackEvent } from "@/lib/analytics";
import TrustHaloAvatar from "@/components/sitters/TrustHaloAvatar";
import ReachReassuranceBanner from "@/components/marketing/ReachReassuranceBanner";
import PresenceBadge from "@/components/messages/PresenceBadge";
import ReplyTimeBadge from "@/components/sitters/ReplyTimeBadge";
import OwnerToSitterAffinity from "@/components/matching/OwnerToSitterAffinity";
import OwnerAffinityBanner from "@/components/matching/OwnerAffinityBanner";
import SitterResultCard from "@/components/search/SitterResultCard";
import { sitterCardLine } from "@/lib/sitterDistinctLine";
import OwnerLocationPicker from "@/components/search/header/OwnerLocationPicker";
import { useViewerOwnerForAffinity } from "@/hooks/useViewerOwnerForAffinity";
import { computeAffinityResultFull, speciesIntersects, type AffinityOwnerInput, type AffinitySitterInput } from "@/lib/affinityScore";

import { TooltipProvider } from "@/components/ui/tooltip";
import { avatarImageUrl } from "@/lib/storageImage";
import { chunkArray } from "@/lib/chunkArray";
import { publicFirstName } from "@/lib/displayName";



const animalChips = ["Chiens", "Chats", "Chevaux", "Oiseaux", "Animaux de ferme", "NAC", "Tous"];
// Pas de table de correspondance locale : `speciesIntersects` (src/lib/affinityScore)
// et `SPECIES_NORMALIZE` (src/lib/affinityVocab) savent déjà ramener les libellés
// français de `sitter_profiles.animal_types` vers les codes canoniques, y compris
// la valeur « Tous » qui satisfait n'importe quelle puce.

const RADIUS_SHORTCUTS = [5, 15, 30, 50];

type SortOption = "affinity" | "closest" | "rating" | "experience";
type ViewMode = "list" | "map";

const SearchOwnerMapView = lazy(() => import("@/components/search/SearchOwnerMapView"));

const SearchOwner = () => {
  const { user, switchRole } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { owner: viewerOwner } = useViewerOwnerForAffinity();

  const { toast: toastUi } = useToast();
  const isMobile = useIsMobile();
  const [searchParams] = useSearchParams();

  // Filter state
  const [city, setCity] = useState("");
  // Saisie brute du champ de lieu, découplée de l'état métier `city` : taper
  // ne doit plus relancer le cycle réseau complet (handleSearch est debouncé
  // sur `city`). `city` n'est écrit que par une sélection explicite.
  const [cityInput, setCityInput] = useState("");
  // Vrai dès que l'utilisateur a touché au champ, empêche le chargement
  // asynchrone du profil d'écraser la saisie en cours.
  const cityTouchedRef = useRef(false);
  const [cityPostalCode, setCityPostalCode] = useState<string | null>(null);
  const [userPostalCode, setUserPostalCode] = useState<string | null>(null);
  const [citySuggestions, setCitySuggestions] = useState<PlaceSuggestion[]>([]);
  // Pays de la ville choisie et centre fourni par la suggestion.
  const [cityCountry, setCityCountry] = useState<string | null>(null);
  const [cityCenter, setCityCenter] = useState<{ lat: number; lng: number } | null>(null);
  const [radius, setRadius] = useState([15]);
  const [zoneMode, setZoneMode] = useState<ZoneMode>("radius");
  // Pays de recherche (ISO 2 lettres), null = « Tous les pays » : aucune
  // restriction de pays. Appliqué côté serveur, avant pagination.
  const [selectedCountry, setSelectedCountry] = useState<string | null>("FR");
  // Nombre de cartes affichées dans la grille (« Afficher plus »).
  const [visibleCount, setVisibleCount] = useState(RESULTS_PAGE_SIZE);
  // Note: filtre Dates retiré tant que la disponibilité datée n'est pas modélisée côté gardien.
  const [animalTypes, setAnimalTypes] = useState<string[]>([]);
  const [vehicled, setVehicled] = useState(false);
  const [availableOnly, setAvailableOnly] = useState(false);
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [emergencyOnly, setEmergencyOnly] = useState(false);
  const [minSits, setMinSits] = useState<string>("all");
  const [minRating, setMinRating] = useState<string>("all");
  const [sort, setSort] = useState<SortOption>("affinity");
  const [sortUserOverride, setSortUserOverride] = useState(false);
  // Sans profil owner (visiteur anonyme ou gardien pur), l'affinité n'a pas de sens :
  // on force le Select mobile sur « Plus proches » pour ne jamais afficher une valeur vide.
  useEffect(() => {
    if (!viewerOwner && !sortUserOverride && sort === "affinity") {
      setSort("closest");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewerOwner]);
  const [viewMode, setViewMode] = useState<ViewMode>("list");

  // rawResults = jeu brut rapatrié et enrichi par le fetch réseau (sitters + coords + reviews + badges + gallery + affinité).
  // Les filtres purement clients (avec véhicule, vérifié, note min, animaux, etc.) sont appliqués en mémoire via useMemo,
  // sans relancer aucune requête Supabase ni géocodage.
  const [rawResults, setRawResults] = useState<any[]>([]);
  const [searchCenter, setSearchCenter] = useState<{ lat: number; lng: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  // Vrai quand la requête serveur a atteint le plafond (jeu potentiellement tronqué → tri distance/affinité partiel).
  // Le plafond reste à 500 tant que le géocodage en éventail n'est pas résolu :
  // au delà, le nombre d'appels de géocodage déclenche la limitation de débit et
  // la liste se vide. La tranche est rendue déterministe par un tri sur user_id.
  // Le vrai correctif est une RPC `search_sitters` en SQL (filtrage et tri côté
  // serveur, plus de rapatriement massif côté client).
  const SITTERS_SERVER_CAP = 500;
  const [contactingId, setContactingId] = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [initialLoaded, setInitialLoaded] = useState(false);

  // Empty state intelligence
  const [alertCreated, setAlertCreated] = useState(false);
  const [isCreatingAlert, setIsCreatingAlert] = useState(false);

  // Popover open states (only one at a time)
  const [openPop, setOpenPop] = useState<string | null>(null);

  // Debounce ref
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // Autocomplétion selon le pays : France = geo.api.gouv.fr, autre pays =
  // Photon (OpenStreetMap) restreint à ce pays, tous pays = les deux. Chaque
  // suggestion porte son pays. Numéro de requête : une réponse tardive
  // n'écrase jamais une frappe plus récente.
  const cityDebounceRef = useRef<ReturnType<typeof setTimeout>>();
  const suggestSeqRef = useRef(0);
  const fetchCitySuggestions = useCallback((q: string) => {
    clearTimeout(cityDebounceRef.current);
    const seq = ++suggestSeqRef.current;
    if (q.trim().length < 2) { setCitySuggestions([]); return; }
    cityDebounceRef.current = setTimeout(async () => {
      const src = suggestionSources(selectedCountry);
      const [gouv, photon] = await Promise.all([
        src.gouv
          ? fetch(`https://geo.api.gouv.fr/communes?nom=${encodeURIComponent(q)}&fields=nom,codesPostaux,centre&boost=population&limit=5`)
              .then((r) => r.json()).then(fromGeoApiGouv).catch(() => [] as PlaceSuggestion[])
          : Promise.resolve([] as PlaceSuggestion[]),
        src.photon
          ? fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=15&lang=fr&layer=city&layer=locality&layer=district`)
              .then((r) => r.json()).then((j) => fromPhoton(j, selectedCountry)).catch(() => [] as PlaceSuggestion[])
          : Promise.resolve([] as PlaceSuggestion[]),
      ]);
      if (seq !== suggestSeqRef.current) return;
      const photonOut = selectedCountry === null ? photon.filter((p) => p.country !== "FR") : photon;
      setCitySuggestions([...gouv, ...photonOut].slice(0, 8));
    }, 300);
  }, [selectedCountry]);

  // Saisie brute du champ de lieu : sert uniquement aux suggestions locales
  // (départements / régions). Vidée dès qu'une suggestion est choisie, pour ne
  // pas re-proposer une zone déjà sélectionnée.
  const [locQuery, setLocQuery] = useState("");

  const normalizeLoc = (s: string) =>
    s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");

  // Départements et régions : seulement quand la recherche porte sur la
  // France ou sur tous les pays.
  const frZonesOffered = selectedCountry === "FR" || selectedCountry === null;

  const deptSuggestions = useMemo<string[]>(() => {
    const q = locQuery.trim();
    if (q.length < 2 || !frZonesOffered) return [];
    const nq = normalizeLoc(q);
    const out: string[] = [];
    if (/^\d{5}$/.test(q)) {
      const d = getDeptCode(q);
      if (d && DEPT_NAMES[d]) out.push(d);
    }
    for (const code of Object.keys(DEPT_NAMES)) {
      if (out.length >= 4) break;
      if (out.includes(code)) continue;
      if (normalizeLoc(code).startsWith(nq) || normalizeLoc(DEPT_NAMES[code]).includes(nq)) out.push(code);
    }
    return out.slice(0, 4);
  }, [locQuery, frZonesOffered]);

  const regionSuggestions = useMemo<string[]>(() => {
    const q = locQuery.trim();
    if (q.length < 2 || !frZonesOffered) return [];
    const nq = normalizeLoc(q);
    return Object.keys(REGION_NAMES)
      .filter((code) => normalizeLoc(REGION_NAMES[code]).includes(nq))
      .slice(0, 3);
  }, [locQuery, frZonesOffered]);

  const handleSelectDept = useCallback((deptCode: string) => {
    cityTouchedRef.current = true;
    setCity(`${deptCode} ${DEPT_NAMES[deptCode]}`);
    setCityInput(`${deptCode} ${DEPT_NAMES[deptCode]}`);
    setCityPostalCode(deptToRefPostalCode(deptCode));
    setCityCountry("FR");
    setCityCenter(null);
    // Un département est français : le pays de recherche devient la France.
    setSelectedCountry("FR");
    setZoneMode("dept");
    setCitySuggestions([]);
    setLocQuery("");
    setOpenPop(null);
  }, []);

  const handleSelectRegion = useCallback((regionCode: string) => {
    cityTouchedRef.current = true;
    const firstDept = Object.keys(DEPT_TO_REGION).find((d) => DEPT_TO_REGION[d] === regionCode);
    setCity(REGION_NAMES[regionCode] ?? "");
    setCityInput(REGION_NAMES[regionCode] ?? "");
    if (firstDept) setCityPostalCode(deptToRefPostalCode(firstDept));
    setCityCountry("FR");
    setCityCenter(null);
    setSelectedCountry("FR");
    setZoneMode("region");
    setCitySuggestions([]);
    setLocQuery("");
    setOpenPop(null);
  }, []);

  // Sélection d'une ville : chaque suggestion porte son pays, le pays de
  // recherche le suit (sauf en « Tous les pays »), le centre vient de la
  // suggestion elle-même (aucun second géocodage ambigu).
  const handleSelectCity = useCallback((s: PlaceSuggestion) => {
    cityTouchedRef.current = true;
    const next = selectPlace(
      { country: selectedCountry, zoneMode, city, cityCountry, cityPostalCode },
      s,
    );
    setCity(next.city);
    setCityInput(next.city);
    setCityPostalCode(next.cityPostalCode);
    setCityCountry(next.cityCountry);
    setCityCenter(s.lat != null && s.lng != null ? { lat: s.lat, lng: s.lng } : null);
    setSelectedCountry(next.country);
    setZoneMode(next.zoneMode);
    setCitySuggestions([]);
    setLocQuery("");
    setOpenPop(null);
  }, [selectedCountry, zoneMode, city, cityCountry, cityPostalCode]);

  // À chaque ouverture du sélecteur de lieu, la saisie repart de la valeur
  // métier courante et les suggestions sont vidées, sinon la nouvelle frappe
  // se concatène à l'ancienne.
  useEffect(() => {
    if (openPop !== "loc" && openPop !== "loc-hero") return;
    setCityInput(city);
    setCitySuggestions([]);
    setLocQuery("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openPop]);

  // Validation clavier : la touche Entrée promeut la saisie en état métier.
  // Saisie : identique desktop et mobile, portée par le composant partagé.
  const handleCityInputChange = useCallback((value: string) => {
    cityTouchedRef.current = true;
    setCityInput(value);
    setLocQuery(value);
    fetchCitySuggestions(value);
  }, [fetchCitySuggestions]);

  // Validation clavier : la touche Entrée promeut la saisie en état métier.
  const handleCityKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter") return;
    cityTouchedRef.current = true;
    setCity(cityInput);
    // Saisie libre validée au clavier : la référence postale et le centre
    // précédents ne correspondent plus. Le pays est celui de la recherche.
    setCityPostalCode(null);
    setCityCenter(null);
    setCityCountry(selectedCountry);
    if (cityInput.trim()) setZoneMode((z) => (z === "country" ? "radius" : z));
    setCitySuggestions([]);
    setOpenPop(null);
  }, [cityInput, selectedCountry]);

  // Pays peuplés : RPC search_sitter_country_counts, exactement la même
  // population que la recherche (gardiens consultables, compte courant exclu).
  // Le chiffre du menu est donc celui que la liste affiche, filtres retirés.
  const [sitterCountries, setSitterCountries] = useState<Array<{ code: string; count: number }>>([]);

  useEffect(() => {
    let cancelled = false;
    fetchSitterCountryCounts()
      .then((rows) => { if (!cancelled) setSitterCountries(rows); })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, [user?.id]);

  const countryName = useCallback((code: string) => {
    try {
      return new Intl.DisplayNames(["fr"], { type: "region" }).of(code) || code;
    } catch {
      return code;
    }
  }, []);

  // Changement de pays, y compris « Tous les pays » (null) : règle unique
  // changeCountry (ville d'un autre pays retirée, département et région
  // réservés à la France).
  const handleCountryChange = useCallback((next: string | null) => {
    cityTouchedRef.current = true;
    const s = changeCountry(
      { country: selectedCountry, zoneMode, city, cityCountry, cityPostalCode },
      next,
    );
    setSelectedCountry(s.country);
    setZoneMode(s.zoneMode);
    if (s.city !== city) {
      setCity(s.city);
      setCityInput(s.city);
      setCityCenter(null);
      setSearchCenter(null);
    }
    setCityCountry(s.cityCountry);
    setCityPostalCode(s.cityPostalCode);
    setCitySuggestions([]);
    setOpenPop(null);
  }, [selectedCountry, zoneMode, city, cityCountry, cityPostalCode]);

  // Geolocation (communes françaises, geo.api.gouv.fr)
  const handleGeolocate = useCallback(() => {
    if (!navigator.geolocation) { toast.error("Géolocalisation non disponible"); return; }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const res = await fetch(`https://geo.api.gouv.fr/communes?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&fields=nom,codesPostaux&limit=1`);
          const data = await res.json();
          if (data?.[0]) {
            cityTouchedRef.current = true;
            setCity(data[0].nom);
            setCityInput(data[0].nom);
            setCityPostalCode(data[0].codesPostaux?.[0] ?? null);
            setCityCountry("FR");
            setCityCenter({ lat: Math.round(pos.coords.latitude * 100) / 100, lng: Math.round(pos.coords.longitude * 100) / 100 });
            if (selectedCountry !== null) setSelectedCountry("FR");
            setZoneMode((prev) => (prev === "country" ? "radius" : prev));
            setCitySuggestions([]);
          } else {
            toast.error("Position hors de France : saisissez votre ville.");
          }
        } catch { toast.error("Impossible de déterminer votre ville"); }
      },
      () => toast.error("Géolocalisation refusée")
    );
  }, [selectedCountry]);

  // Load owner city + postal code on mount, URL params take precedence
  useEffect(() => {
    const urlCity = searchParams.get("city") || searchParams.get("ville");
    const urlPostal = searchParams.get("postal_code");
    const urlZone = searchParams.get("zone");
    const urlCountry = (searchParams.get("pays") || "").trim().toUpperCase();
    const urlRadius = parseInt(searchParams.get("rayon") || "", 10);
    if (Number.isFinite(urlRadius) && urlRadius > 0 && urlRadius <= 200) setRadius([snapToAllowedRadius(urlRadius)]);
    if (urlCountry === "TOUS") setSelectedCountry(null);
    else if (/^[A-Z]{2}$/.test(urlCountry)) setSelectedCountry(urlCountry);

    if (urlCity) {
      cityTouchedRef.current = true;
      setCity(urlCity);
      setCityInput(urlCity);
      setCityCountry(/^[A-Z]{2}$/.test(urlCountry) ? urlCountry : "FR");
      if (urlPostal) {
        setCityPostalCode(urlPostal);
        setUserPostalCode(urlPostal);
      }
      if (urlZone === "dept") setZoneMode("dept");
      else if (urlZone === "region") setZoneMode("region");
      else if (urlZone === "france" || urlZone === "pays") setZoneMode("country");
      else setZoneMode("radius");
      setInitialLoaded(true);
      return;
    }
    if (urlZone === "france" || urlZone === "pays") setZoneMode("country");

    if (!user) {
      setZoneMode((z) => (z === "radius" ? "country" : z));
      setInitialLoaded(true);
      return;
    }
    (async () => {
      const { data } = await fetchMyProfile(user.id!);
      const profileCountry = String((data as any)?.country || "FR").trim().toUpperCase() || "FR";
      if (!cityTouchedRef.current) {
        if (!/^[A-Z]{2}$/.test(urlCountry)) setSelectedCountry(profileCountry);
        if (data?.city) {
          setCity(data.city);
          setCityInput(data.city);
          setCityCountry(profileCountry);
        } else {
          setZoneMode((z) => (z === "radius" ? "country" : z));
        }
      }
      if (data?.postal_code && profileCountry === "FR") {
        setUserPostalCode(data.postal_code);
        setCityPostalCode(data.postal_code);
      }
      setInitialLoaded(true);
    })();
  }, [user, searchParams]);

  // Total consultable, même population que la liste.
  const totalSearchable = useMemo(() => sitterCountries.reduce((a, c) => a + c.count, 0), [sitterCountries]);
  const countryCount = useCallback(
    (code: string | null) => (code === null ? totalSearchable : sitterCountries.find((c) => c.code === code)?.count ?? 0),
    [sitterCountries, totalSearchable],
  );

  // Reset alert state when zone changes
  useEffect(() => { setAlertCreated(false); }, [city, radius, zoneMode]);

  // Reference postal code (selected city if available, else user CP)
  const getZoneRefPostalCode = (): string | null => cityPostalCode ?? userPostalCode;

  // Contact handler, propriétaire qui sonde un gardien (context: sitter_inquiry).
  // Anonyme (vague 40) : renvoi propre vers l'inscription avec redirect encodé, sans toast.
  const handleContact = async (sitterId: string) => {
    if (!user) {
      navigate(`/inscription?redirect=${encodeURIComponent(`/gardiens/${sitterId}`)}`);
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

  // Alerte : anonyme → redirection propre vers l'inscription (vague 40).
  const handleCreateAlertGated = () => {
    if (!user) {
      const target = `/recherche-gardiens${city ? `?city=${encodeURIComponent(city)}` : ""}`;
      navigate(`/inscription?redirect=${encodeURIComponent(target)}`);
      return;
    }
    void handleCreateAlert();
  };

  // Create sitter alert
  const handleCreateAlert = async () => {
    if ((!(zoneMode === "country" && selectedCountry === "FR") && !city) || alertCreated || isCreatingAlert) return;
    setIsCreatingAlert(true);
    trackEvent("search_empty_action", { source: "owner", metadata: { action: "create_alert", zone_mode: zoneMode } });

    let usedRadius: number | null = null;
    let savedScope = city;
    let error: any = null;

    if (zoneMode === "country" && selectedCountry === "FR") {
      savedScope = "France entière";
      const { data: existing } = await supabase
        .from("alert_preferences")
        .select("id")
        .eq("active", true)
        .eq("zone_type", "region")
        .eq("region_code", "FR")
        .contains("alert_types", ["gardes"])
        .limit(1);

      if (existing && existing.length > 0) {
        error = { message: "DOUBLON" };
      } else {
        ({ error } = await supabase.rpc("create_alert_preference", {
          p_label: "Gardes · France entière",
          p_zone_type: "region",
          p_city: null,
          p_postal_code: null,
          p_radius_km: null,
          p_departement: null,
          p_region_code: "FR",
          p_alert_types: ["gardes"],
          p_heure_envoi: "08:00",
          p_frequence: "quotidien",
        }));
      }
    } else if (zoneMode === "dept") {
      const deptCode = getDeptCode(cityPostalCode ?? userPostalCode ?? null);
      savedScope = deptCode ? `département ${deptCode}` : city;
      if (!deptCode) {
        error = { message: "INVALID_DEPARTMENT" };
      } else {
        const { data: existing } = await supabase
          .from("alert_preferences")
          .select("id")
          .eq("active", true)
          .eq("zone_type", "departement")
          .eq("departement", deptCode)
          .contains("alert_types", ["gardes"])
          .limit(1);

        if (existing && existing.length > 0) {
          error = { message: "DOUBLON" };
        } else {
          ({ error } = await supabase.rpc("create_alert_preference", {
            p_label: `Gardes · Département ${deptCode}`,
            p_zone_type: "departement",
            p_city: null,
            p_postal_code: null,
            p_radius_km: null,
            p_departement: deptCode,
            p_region_code: null,
            p_alert_types: ["gardes"],
            p_heure_envoi: "08:00",
            p_frequence: "quotidien",
          }));
        }
      }
    } else {
      // Snap au rayon autorisé le plus proche (la RPC n'accepte que 5/15/30/50/100)
      usedRadius = snapToAllowedRadius(radius[0]);
      ({ error } = await supabase.rpc("create_alert_from_search", {
        p_city: city,
        p_postal_code: cityPostalCode ?? null,
        p_radius_km: usedRadius,
      }));

      // Fallback : si INVALID_RADIUS (désync UI / cache), on réessaye une fois avec 15 km par défaut
      if (error && (error.message || "").includes("INVALID_RADIUS")) {
        logger.warn("create_alert_from_search INVALID_RADIUS, retry with fallback", {
          attempted: usedRadius,
          original: radius[0],
        });
        usedRadius = 15;
        ({ error } = await supabase.rpc("create_alert_from_search", {
          p_city: city,
          p_postal_code: cityPostalCode ?? null,
          p_radius_km: usedRadius,
        }));
        if (!error) {
          // Aligne l'UI sur le rayon réellement utilisé
          setRadius([usedRadius]);
        }
      }
    }

    setIsCreatingAlert(false);
    if (error) {
      const msg = error.message || "";
      if (msg.includes("DOUBLON")) {
        toastUi({ title: "Vous avez déjà cette alerte", description: "Une alerte identique existe déjà pour cette zone." });
        setAlertCreated(true);
      } else if (msg.includes("MAX_ZONES") || msg.includes("Maximum 3")) {
        toastUi({
          variant: "destructive",
          title: "Maximum atteint",
          description: "Vous avez déjà 3 alertes actives. Supprimez-en une dans vos paramètres.",
          action: <ToastAction altText="Gérer mes alertes" onClick={() => navigate("/settings")}>Gérer</ToastAction>,
        });
      } else if (msg.includes("INVALID_CITY")) {
        toastUi({ variant: "destructive", title: "Ville requise", description: "Sélectionnez une ville avant de créer une alerte." });
      } else if (msg.includes("INVALID_DEPARTMENT")) {
        toastUi({ variant: "destructive", title: "Département indisponible", description: "Sélectionnez une ville avec code postal avant de créer cette alerte." });
      } else if (msg.includes("INVALID_RADIUS")) {
        toastUi({
          variant: "destructive",
          title: "Rayon non disponible",
          description: "Choisissez un rayon parmi 5, 15, 30, 50 ou 100 km, puis réessayez.",
        });
      } else {
        toastUi({ variant: "destructive", title: "Erreur", description: "Une erreur est survenue. Veuillez réessayer." });
      }
    } else {
      toastUi({
        title: "Alerte créée",
        description: usedRadius
          ? `Vous recevrez un e-mail dès qu'une nouvelle garde apparaît autour de ${city} (rayon ${usedRadius} km).`
          : `Vous recevrez un e-mail dès qu'une nouvelle garde apparaît sur ${savedScope}.`,
        action: <ToastAction altText="Personnaliser" onClick={() => navigate("/settings")}>Personnaliser</ToastAction>,
      });
      setAlertCreated(true);
    }
  };

  // Share invite link
  const handleShareInvite = async () => {
    trackEvent("search_empty_action", { source: "owner", metadata: { action: "share_invite", zone_mode: zoneMode } });
    const url = `${window.location.origin}/inscription?role=sitter`;
    const shareText = `Je cherche un gardien d'animaux près de ${city || "chez moi"} sur Guardiens. Vous pouvez vous inscrire ici :`;
    if (navigator.share) {
      try {
        await navigator.share({ title: "Guardiens, devenez gardien", text: shareText, url });
      } catch { /* user cancelled */ }
    } else {
      await navigator.clipboard.writeText(`${shareText} ${url}`);
      toast.success("Lien copié, partagez-le à une personne de confiance.");
    }
  };

  // Search logic (lot 1 international) : vivier complet du pays choisi, lu
  // par la RPC search_sitter_pool (pays et éligibilité filtrés côté serveur,
  // pagination par pages de 1 000, aucune tranche). Chaque lancement porte un
  // numéro : une réponse qui arrive après un changement de pays ou de ville
  // est ignorée, jamais affichée.
  const searchSeqRef = useRef(0);
  const handleSearch = useCallback(async () => {
    const seq = ++searchSeqRef.current;
    const stale = () => seq !== searchSeqRef.current;
    setLoading(true);
    setSearchError(null);

    let pool: any[];
    try {
      pool = (await fetchSitterSearchPool(selectedCountry)).map(poolRowToSitter);
    } catch (err) {
      if (stale()) return;
      console.error("[SearchOwner] Erreur chargement gardiens:", err);
      setSearchError("Impossible de charger les gardiens.");
      setLoading(false);
      return;
    }
    if (stale()) return;
    const rawSitters = pool;
    const sitterUserIds = rawSitters.map((s: any) => s.user_id) as string[];

    // Données d'affinité : vue réservée aux membres connectés, chargée
    // uniquement lorsque le visiteur dispose d'un profil propriétaire.
    // Elle apporte notamment work_during_sit et sensitivities, indispensables
    // au critère de présence (poids 2) et à la disqualification.
    if (viewerOwner && sitterUserIds.length > 0) {
      // Découpage par lots de 50 identifiants au maximum : au delà, la chaîne
      // de requête GET dépasse la limite de longueur d'URL et l'appel échoue.
      const batches = chunkArray(sitterUserIds, 50);
      const affinityResults = await Promise.all(
        batches.map((ids) =>
          supabase
            .from("sitter_profiles_affinity")
            .select("user_id, experience_years, life_pace, lifestyle, availability_during, has_vehicle, has_license, languages, interests, work_during_sit, sensitivities, animal_types, sitter_type, travels_with_children, travels_with_own_animals, special_animal_skills, farm_animals_ok")
            .in("user_id", ids),
        ),
      );
      if (stale()) return;
      const affinityMap = new Map<string, any>();
      affinityResults.forEach((res: any) => {
        if (res?.error) {
          console.error("[SearchOwner] Erreur chargement affinité:", res.error);
          return;
        }
        (res?.data ?? []).forEach((a: any) => affinityMap.set(a.user_id, a));
      });
      rawSitters.forEach((s: any) => {
        const a = affinityMap.get(s.user_id);
        if (a) Object.assign(s, a);
      });
    }

    const items = rawSitters;

    // Coordonnées : latitude_approx / longitude_approx (2 décimales, environ 1,1 km), jamais les coordonnées brutes. Le géocodage à la volée n'est qu'un repli pour les profils sans coordonnées, toujours avec le pays du profil.
    const hasStoredCoords = (p: any) =>
      typeof p?.latitude_approx === "number" && typeof p?.longitude_approx === "number";

    const noCoordSitters = items.filter((s: any) => !hasStoredCoords(s.profile));
    const cityKey = (c: string, co: string | null) => `${c}::${co ?? ""}`;
    const uniqueCities = new Map<string, { city: string; country: string | null }>();
    noCoordSitters.forEach((s: any) => {
      const c = s.profile?.city;
      if (c) uniqueCities.set(cityKey(c, s.country), { city: c, country: s.country ?? null });
    });
    const cityCoords = new Map<string, { lat: number; lng: number }>();
    const GEOCODE_CONCURRENCY = 10;
    const cityList = Array.from(uniqueCities.entries());
    for (let i = 0; i < cityList.length; i += GEOCODE_CONCURRENCY) {
      await Promise.all(cityList.slice(i, i + GEOCODE_CONCURRENCY).map(async ([k, v]) => {
        const coords = await geocodeCity(v.city, v.country);
        if (coords) cityCoords.set(k, { lat: coords.lat, lng: coords.lng });
      }));
    }
    if (stale()) return;

    // Centre de recherche : coordonnées de la suggestion choisie, sinon
    // géocodage avec le pays de la ville (Montréal au Canada, pas en France).
    let searchCoords: { lat: number; lng: number } | null = null;
    if (city) {
      searchCoords = cityCenter ?? (await geocodeCity(city, cityCountry ?? selectedCountry ?? undefined));
    }
    if (stale()) return;

    const withCoords = (s: any) => {
      const p = s.profile;
      const coords = hasStoredCoords(p)
        ? { lat: p.latitude_approx as number, lng: p.longitude_approx as number }
        : (p?.city ? cityCoords.get(cityKey(p.city, s.country)) ?? null : null);
      return { ...s, _dist: distanceFrom(searchCoords, coords?.lat, coords?.lng), _lat: coords?.lat ?? null, _lng: coords?.lng ?? null };
    };
    const allItems = items.map(withCoords);

    // Enrichissement par lots de 100 identifiants : URL bornée et réponses
    // sous le plafond serveur de 1 000 lignes, quelle que soit la taille du vivier.
    const allUserIds = allItems.map((s: any) => s.user_id);
    const idChunks = chunkArray(allUserIds, 100);
    const [badgeResults, emergencyResults, galleryResults, reviewResults] = await Promise.all([
      Promise.all(idChunks.map((ids) => supabase.from("public_badge_attributions").select("user_id, badge_id").in("user_id", ids))),
      Promise.all(idChunks.map((ids) => supabase.from("public_emergency_sitter_profiles").select("user_id, is_active").in("user_id", ids).eq("is_active", true))),
      Promise.all(idChunks.map((ids) => supabase.from("sitter_gallery").select("user_id, photo_url, created_at").in("user_id", ids).order("created_at", { ascending: false }))),
      Promise.all(idChunks.map((ids) => supabase.from("reviews").select("reviewee_id, overall_rating").in("reviewee_id", ids).eq("published", true))),
    ]);
    if (stale()) return;

    const enrichError = [...badgeResults, ...emergencyResults, ...galleryResults, ...reviewResults].find((r: any) => r.error)?.error;
    if (enrichError) {
      console.error("[SearchOwner] Erreur enrichissement gardiens:", enrichError);
      setSearchError("Impossible de charger les informations complètes des gardiens.");
      setLoading(false);
      return;
    }

    const emergencySet = new Set(emergencyResults.flatMap((r: any) => r.data ?? []).map((e: any) => e.user_id));

    const reviewsAgg = new Map<string, { sum: number; count: number }>();
    reviewResults.flatMap((r: any) => r.data ?? []).forEach((r: any) => {
      const cur = reviewsAgg.get(r.reviewee_id) || { sum: 0, count: 0 };
      cur.sum += r.overall_rating || 0;
      cur.count += 1;
      reviewsAgg.set(r.reviewee_id, cur);
    });

    const badgeMap = new Map<string, Map<string, number>>();
    badgeResults.flatMap((r: any) => r.data ?? []).forEach((b: any) => {
      if (!badgeMap.has(b.user_id)) badgeMap.set(b.user_id, new Map());
      const m = badgeMap.get(b.user_id)!;
      m.set(b.badge_id, (m.get(b.badge_id) || 0) + 1);
    });

    // Galerie : max 4 photos par gardien, avatar prépendu si présent.
    const photoMap = new Map<string, string[]>();
    galleryResults.flatMap((r: any) => r.data ?? []).forEach((g: any) => {
      const arr = photoMap.get(g.user_id) || [];
      if (arr.length < 4 && g.photo_url) arr.push(g.photo_url);
      photoMap.set(g.user_id, arr);
    });

    const enrichedAll = allItems.map((s: any) => {
      const agg = reviewsAgg.get(s.user_id);
      const avgRating = agg && agg.count > 0 ? agg.sum / agg.count : null;
      const userBadges = badgeMap.get(s.user_id);
      const topBadges = userBadges
        ? Array.from(userBadges.entries()).map(([badge_key, count]) => ({ badge_key, count })).sort((a, b) => b.count - a.count).slice(0, 3)
        : [];
      const gallery = photoMap.get(s.user_id) || [];
      const avatar = s.profile?.avatar_url;
      const photos = avatar ? [avatar, ...gallery.filter((p) => p !== avatar)] : gallery;
      const affinity = viewerOwner
        ? computeAffinityResultFull(viewerOwner as AffinityOwnerInput, s as AffinitySitterInput)
        : null;
      return { ...s, avgRating, reviewCount: agg?.count || 0, topBadges, isEmergency: emergencySet.has(s.user_id), _photos: photos, _affinity: affinity };
    });

    setRawResults(enrichedAll);
    setSearchCenter(searchCoords);
    setLoading(false);
  }, [city, cityCenter, cityCountry, selectedCountry, viewerOwner, user?.id]);

  // Auto-search on network dep change (debounced) : ville / code postal uniquement.
  // Les filtres purement clients (véhicule, vérifié, note min, animaux, radius, zone, tri…)
  // sont appliqués en mémoire via le useMemo ci-dessous, sans refetch ni géocodage.
  useEffect(() => {
    if (!initialLoaded) return;
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => { handleSearch(); }, 400);
    return () => clearTimeout(debounceRef.current);
  }, [initialLoaded, handleSearch]);

  // Dérivé mémoïsé : applique tous les filtres clients + le tri + la zone + les compteurs
  // de densité sur `rawResults`. Recalculé sans coût réseau.
  const { results, densityCounts } = useMemo(() => {
    const refPostal = cityPostalCode ?? userPostalCode;
    // Département de référence : seulement pour une recherche en France.
    const refDept = selectedCountry === "FR" || (selectedCountry === null && (cityCountry ?? "FR") === "FR")
      ? getDeptCode(refPostal)
      : null;

    let filtered = rawResults;
    if (vehicled) filtered = filtered.filter((s: any) => s.has_vehicle);
    if (availableOnly) filtered = filtered.filter((s: any) => s.is_available);
    if (verifiedOnly) filtered = filtered.filter((s: any) => s.profile?.identity_verified);
    if (animalTypes.length > 0 && !animalTypes.includes("Tous")) {
      filtered = filtered.filter(
        (s: any) => speciesIntersects(animalTypes, s.animal_types || []) > 0,
      );
    }
    if (minSits !== "all") {
      const min = parseInt(minSits);
      filtered = filtered.filter((s: any) => (s.profile?.completed_sits_count || 0) >= min);
    }
    if (emergencyOnly) filtered = filtered.filter((s: any) => s.isEmergency);
    if (minRating !== "all") {
      const min = parseFloat(minRating);
      filtered = filtered.filter((s: any) => s.avgRating !== null && s.avgRating >= min);
    }

    // Zones : règles uniques de src/lib/sitterSearch (département et région
    // réservés aux gardiens établis en France, repli département du rayon
    // pour un gardien sans coordonnées). Le vivier est déjà celui du pays.
    const ctx = { zoneMode, country: selectedCountry, center: searchCenter, radiusKm: radius[0], refDept };
    const density = zoneCounts(filtered, ctx);

    let zoned = applyZone(filtered, ctx);
    if (zoneMode === "radius" && !searchCenter && city) {
      // Ville introuvable au géocodage : repli sur le nom de commune.
      zoned = zoned.filter((s: any) => s.profile?.city?.toLowerCase().includes(city.toLowerCase()));
    }

    let effectiveSort: SortOption = sort;
    if (!sortUserOverride && sort === "affinity" && !viewerOwner) {
      effectiveSort = "closest";
    }

    const affinityRank = (s: any) => {
      const a = s._affinity;
      if (!a || a.displayed === false) return -1;
      // Tri sur le score pondéré par la confiance (défaut 1b, 20/08/2026) :
      // le score brut reste affiché, le classement ne récompense plus le
      // profil vide.
      return a.sortScore ?? 0;
    };

    const sorted = [...zoned];
    if (effectiveSort === "affinity") {
      sorted.sort((a, b) => {
        if (a.isEmergency !== b.isEmergency) return a.isEmergency ? -1 : 1;
        const ra = affinityRank(a);
        const rb = affinityRank(b);
        if (rb !== ra) return rb - ra;
        return (a._dist ?? Infinity) - (b._dist ?? Infinity);
      });
    } else if (effectiveSort === "closest") {
      sorted.sort((a, b) => {
        if (a.isEmergency !== b.isEmergency) return a.isEmergency ? -1 : 1;
        return (a._dist ?? Infinity) - (b._dist ?? Infinity);
      });
    } else if (effectiveSort === "rating") {
      sorted.sort((a, b) => {
        if (a.isEmergency !== b.isEmergency) return a.isEmergency ? -1 : 1;
        return (b.avgRating || 0) - (a.avgRating || 0);
      });
    } else {
      sorted.sort((a, b) => {
        if (a.isEmergency !== b.isEmergency) return a.isEmergency ? -1 : 1;
        return (b.profile?.completed_sits_count || 0) - (a.profile?.completed_sits_count || 0);
      });
    }

    return { results: sorted, densityCounts: density };
  }, [rawResults, searchCenter, city, cityCountry, cityPostalCode, userPostalCode, radius, zoneMode, selectedCountry, animalTypes, vehicled, availableOnly, verifiedOnly, emergencyOnly, minSits, minRating, sort, sortUserOverride, viewerOwner]);

  // La grille repart du premier palier à chaque changement de résultats.
  useEffect(() => { setVisibleCount(RESULTS_PAGE_SIZE); }, [results]);

  const hasActiveFilters = vehicled || availableOnly || verifiedOnly || emergencyOnly || animalTypes.length > 0 || minSits !== "all" || minRating !== "all";
  const hasAnyRating = results.some((s: any) => s.avgRating !== null);

  // Zone helpers
  const isFranceSearch = selectedCountry === "FR";
  const refDept = isFranceSearch || (selectedCountry === null && (cityCountry ?? "FR") === "FR")
    ? getDeptCode(getZoneRefPostalCode())
    : null;
  const refRegion = getRegionCode(refDept);
  const deptLabel = refDept ? `${refDept} ${DEPT_NAMES[refDept] || ""}`.trim() : "Département";
  const scopeLabel = selectedCountry === null ? "Tous les pays" : countryName(selectedCountry);

  // Élargissement proposé seulement vers une zone qui a réellement des
  // gardiens : rayon, département (France), pays entier, puis tous les pays.
  const suggestExpansion = (): { target: ZoneMode | "all"; count: number; label: string } | null => {
    if (results.length > 0) return null;
    if (zoneMode === "radius" && refDept && densityCounts.dept > 0) {
      return { target: "dept", count: densityCounts.dept, label: deptLabel };
    }
    if (zoneMode !== "country" && densityCounts.country > 0) {
      return { target: "country", count: densityCounts.country, label: selectedCountry === null ? "tous les pays" : scopeLabel };
    }
    if (selectedCountry !== null && !hasActiveFilters && totalSearchable > countryCount(selectedCountry)) {
      return { target: "all", count: totalSearchable, label: "tous les pays" };
    }
    return null;
  };

  const expansion = suggestExpansion();
  const isLaunchMode = sitterCountries.length > 0 && totalSearchable === 0;

  const applyExpansion = (target: ZoneMode | "all") => {
    if (target === "all") handleCountryChange(null);
    else setZoneMode(target);
  };

  const resetFilters = () => {
    setVehicled(false);
    setAvailableOnly(false);
    setVerifiedOnly(false);
    setEmergencyOnly(false);
    setAnimalTypes([]);
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

  const pillBase = "snap-start flex items-center gap-2 px-4 py-2 min-h-11 rounded-full border border-border bg-card cursor-pointer hover:border-primary transition-colors text-sm whitespace-nowrap shrink-0";
  const pillActive = "snap-start flex items-center gap-2 px-4 py-2 min-h-11 rounded-full border border-primary bg-primary/10 text-primary cursor-pointer transition-colors text-sm font-medium whitespace-nowrap shrink-0";

  const sortPillBase = "snap-start shrink-0 rounded-full px-3 py-1 min-h-9 inline-flex items-center text-xs border border-border text-muted-foreground cursor-pointer hover:border-primary transition-colors whitespace-nowrap";
  const sortPillActive = "snap-start shrink-0 rounded-full px-3 py-1 min-h-9 inline-flex items-center text-xs bg-primary/10 text-primary border border-primary/30 font-semibold cursor-pointer whitespace-nowrap";

  // Rayon : dès qu'une ville est choisie, dans tout pays (centre géocodé
  // avec son pays). Département et région : France seulement, masqués
  // ailleurs plutôt que laissés grisés avec des chiffres français.
  const zoneChips: Array<{ key: ZoneMode; label: string; count: number; disabled?: boolean }> = [
    { key: "radius", label: `${radius[0]} km`, count: densityCounts.radius, disabled: !city },
    ...(refDept
      ? [
          { key: "dept" as ZoneMode, label: `Dép. ${refDept}`, count: densityCounts.dept },
          ...(refRegion ? [{ key: "region" as ZoneMode, label: REGION_NAMES[refRegion] ?? "Ma région", count: densityCounts.region }] : []),
        ]
      : []),
    { key: "country", label: scopeLabel, count: densityCounts.country },
  ];

  // Carte : points des résultats (coordonnées approximées), cadrage sur la
  // ville, sinon sur les résultats, sinon sur le pays choisi.
  const [countryCenter, setCountryCenter] = useState<{ lat: number; lng: number } | null>(null);
  useEffect(() => {
    let cancelled = false;
    setCountryCenter(null);
    if (!selectedCountry || selectedCountry === "FR") return;
    void geocodeCity(countryName(selectedCountry), selectedCountry).then((c) => {
      if (!cancelled && c) setCountryCenter({ lat: c.lat, lng: c.lng });
    });
    return () => { cancelled = true; };
  }, [selectedCountry, countryName]);

  const mapPins = useMemo(() => results
    .filter((s: any) => s._lat != null && s._lng != null)
    .map((s: any) => ({
      id: s.id,
      user_id: s.user_id,
      firstName: publicFirstName(s.profile?.first_name) || "Gardien",
      city: s.profile?.city ?? null,
      avatar: s.profile?.avatar_url ?? null,
      avgRating: s.avgRating ?? null,
      dist: s._dist ?? null,
      coords: { lat: s._lat, lng: s._lng },
    })), [results]);
  const mapViewport = useMemo(() => computeMapViewport({
    country: selectedCountry,
    center: city ? searchCenter : null,
    points: mapPins.map((p) => p.coords),
    countryCenter,
  }), [selectedCountry, city, searchCenter, mapPins, countryCenter]);

  // SEO vague 40 : page indexable pour capter la demande organique.
  const seoTitle = "Trouver un gardien d'animaux près de chez vous · Guardiens";
  const seoDescription = "Consultez librement les profils de gardiens d'animaux en France : chats, chiens, NAC. Inscription avec une adresse email pour contacter un gardien.";
  const seoCanonical = "https://guardiens.fr/recherche-gardiens";
  const seoJsonLd = [
    { "@context": "https://schema.org", "@type": "WebPage", name: seoTitle, description: seoDescription, url: seoCanonical, inLanguage: "fr-FR", isPartOf: { "@type": "WebSite", name: "Guardiens", url: "https://guardiens.fr" } },
    { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [
      { "@type": "ListItem", position: 1, name: "Accueil", item: "https://guardiens.fr/" },
      { "@type": "ListItem", position: 2, name: "Trouver un gardien", item: seoCanonical },
    ] },
  ];

  return (
    <>
    <PageMeta
      title={seoTitle}
      description={seoDescription}
      canonical={seoCanonical}
      noindex
      jsonLd={seoJsonLd}
    />
    <div className="animate-fade-in">
      {/* Hero signature vague 42, eyebrow terra + H1 Playfair + lede contextuel */}
      <div className="px-6 pt-6 pb-3 md:pt-10 md:pb-4 space-y-3">
        <p className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-terra">
          <span aria-hidden className="inline-block h-[1.5px] w-5 bg-terra" />
          Les gardiens
        </p>
        <h1 className="font-heading text-[clamp(26px,4vw,34px)] font-semibold leading-tight text-foreground">
          Quelqu'un du coin veille sur eux.
        </h1>
        <p className="text-sm md:text-[15px] text-muted-foreground max-w-2xl leading-relaxed">
          Des gardiens de confiance près de chez vous, que vous pouvez rencontrer avant une garde.{" "}
          {viewerOwner
            ? "Classés par affinité avec votre foyer."
            : "Classés du plus proche au plus loin."}
        </p>
        {totalSearchable > 0 && (
          <p className="hidden md:flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground pt-0.5">
            <span className="inline-flex items-center">
              <span className="font-semibold text-foreground mr-1">{totalSearchable.toLocaleString("fr-FR")}</span>
              gardiens consultables
            </span>
            {countryCount("FR") > 0 && (
              <>
                <span className="text-muted-foreground/60">·</span>
                <span className="inline-flex items-center">
                  dont
                  <span className="font-semibold text-foreground mx-1">{countryCount("FR").toLocaleString("fr-FR")}</span>
                  en France
                </span>
              </>
            )}
          </p>
        )}
      </div>




      {/* Sticky search bar */}
      <div className="search-sticky-offset sticky z-[1100] bg-background border-b-2 border-border shadow-sm px-6 py-3 space-y-3">
        {/* ─── Hero search (desktop V2) : ville dominante + rayon + CTA ─── */}
        {/* Une seule instance du sélecteur de lieu est montée : rendu
            conditionné en JavaScript, jamais masqué en CSS (le portail du
            popover échappe au display:none). */}
        {!isMobile && (
        <div className="flex items-center gap-3">
          <OwnerLocationPicker
            open={openPop === "loc-hero"}
            onOpenChange={(o) => setOpenPop(o ? "loc-hero" : null)}
            contentClassName="w-[420px] p-3 space-y-3"
            communesClassName="max-h-64 overflow-y-auto"
            autoFocus
            trigger={
              <button
                className="flex-1 min-w-0 flex items-center gap-3 rounded-2xl border border-border bg-card hover:border-primary transition-colors px-5 py-3.5 text-left shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                aria-label="Choisir une ville"
              >
                <MapPin className="h-4 w-4 shrink-0 text-primary" />
                <span className="flex-1 min-w-0 truncate">
                  {city ? (
                    <span className="font-medium text-foreground">{city}</span>
                  ) : (
                    <span className="text-muted-foreground">Où cherchez-vous un gardien&nbsp;?</span>
                  )}
                </span>
                <span className="text-xs text-muted-foreground shrink-0 hidden lg:inline">Ville, département ou région</span>
              </button>
            }
            cityInput={cityInput}
            onCityInputChange={handleCityInputChange}
            onCityKeyDown={handleCityKeyDown}
            onGeolocate={handleGeolocate}
            citySuggestions={citySuggestions}
            deptSuggestions={deptSuggestions}
            regionSuggestions={regionSuggestions}
            onSelectCity={handleSelectCity}
            onSelectDept={handleSelectDept}
            onSelectRegion={handleSelectRegion}
          />

          {/* Select « Rayon » retiré : contrôle unique porté par la chip rayon du sélecteur de zone. */}

          {/* CTA « Rechercher » retiré : la recherche est live (ville/rayon → refetch auto),
              le bouton primary volait l'attention pour zéro action utile. */}
        </div>
        )}

        <div className="relative -mr-6 sm:mr-0">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar scroll-fade-r sm:[mask-image:none] pr-10 sm:pr-0 snap-x snap-mandatory scroll-px-6 overscroll-x-contain">
          {/* PILL 1, Localisation (mobile uniquement, desktop a le hero search au-dessus) */}
          {isMobile && (
          <OwnerLocationPicker
            open={openPop === "loc"}
            onOpenChange={(o) => setOpenPop(o ? "loc" : null)}
            contentClassName="w-72 p-3 space-y-3"
            trigger={
              <button className={city ? pillActive : pillBase}>
                <MapPin className="h-3.5 w-3.5 shrink-0" />
                {city || "Localisation"}
              </button>
            }
            cityInput={cityInput}
            onCityInputChange={handleCityInputChange}
            onCityKeyDown={handleCityKeyDown}
            onGeolocate={handleGeolocate}
            citySuggestions={citySuggestions}
            deptSuggestions={deptSuggestions}
            regionSuggestions={regionSuggestions}
            onSelectCity={handleSelectCity}
            onSelectDept={handleSelectDept}
            onSelectRegion={handleSelectRegion}
          />
          )}

          {/* PILL rayon retirée : le réglage du rayon est porté par la chip « x km » du sélecteur de zone. */}


          {/* PILL 3, Dates : retiré tant que la disponibilité datée gardien n'est pas modélisée */}
          {/* PILL 4, Animaux */}
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

          {/* PILL 5, Filtres avancés */}
          <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
            <SheetTrigger asChild>
              <button className={pillBase + " relative"}>
                <SlidersHorizontal className="h-3.5 w-3.5 shrink-0" />
                Filtres
                {hasActiveFilters && <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-primary" />}
              </button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[88vw] sm:w-80 max-w-sm overflow-y-auto">
              <SheetTitle className="sr-only">Filtres de recherche</SheetTitle>
              <SheetDescription className="sr-only">Affinez votre recherche avec les filtres ci-dessous.</SheetDescription>
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-heading font-semibold text-lg">Filtres</h3>
                <button onClick={resetFilters} className="text-sm text-primary hover:underline">Réinitialiser</button>
              </div>

              <div className="space-y-6">
                {/* Section 1, Disponibilité */}
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

                {/* Section 2, Profil de confiance */}
                <div className="space-y-3">
                  <h4 className="text-sm font-medium">Profil de confiance</h4>
                  <div className="flex items-center justify-between">
                    <p className="text-sm">Identité vérifiée uniquement</p>
                    <Switch checked={verifiedOnly} onCheckedChange={setVerifiedOnly} />
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-sm flex items-center gap-1.5"><Zap className="h-3.5 w-3.5 text-warning" /> Gardiens d'urgence</p>
                    <Switch checked={emergencyOnly} onCheckedChange={setEmergencyOnly} />
                  </div>
                </div>

                {/* Section 3, Mobilité */}
                <div className="space-y-3">
                  <h4 className="text-sm font-medium">Mobilité</h4>
                  <div className="flex items-center justify-between">
                    <p className="text-sm">Avec véhicule</p>
                    <Switch checked={vehicled} onCheckedChange={setVehicled} />
                  </div>
                </div>

                {/* Section 4, Expérience */}
                <div className="space-y-3">
                  <h4 className="text-sm font-medium">Gardes validées minimum</h4>
                  <div className="flex gap-2 flex-wrap">
                    {[{ label: "Tous", value: "all" }, { label: "1+", value: "1" }, { label: "3+", value: "3" }, { label: "5+", value: "5" }].map(opt => (
                      <button key={opt.value} onClick={() => setMinSits(opt.value)} className={`rounded-full px-3 py-1 text-xs border transition-colors ${minSits === opt.value ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary"}`}>{opt.label}</button>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">Basé sur les gardes réalisées sur Guardiens</p>
                </div>

                {/* Section 5, Note moyenne */}
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
          <div aria-hidden className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-background to-transparent sm:hidden" />
        </div>

        {/* Sélecteur de zone : rayon / département / France entière.
            Toujours visible pour permettre d'élargir sans passer par l'empty state. */}
        <div
          role="group"
          aria-label="Périmètre de recherche"
          className="flex items-center gap-1.5 flex-wrap pt-1"
        >
          {zoneChips.map((z) => {
            const active = zoneMode === z.key;
            const chipClass = `min-h-9 rounded-full border px-3 py-1 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40 disabled:cursor-not-allowed ${
              active
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card text-muted-foreground border-border hover:border-primary"
            }`;
            const chipInner = (
              <>
                {z.label}
                {z.count > 0 && (
                  <span className={`ml-1 text-[10px] ${active ? "text-primary-foreground/80" : "text-muted-foreground/70"}`}>
                    ({z.count})
                  </span>
                )}
              </>
            );

            // Chip rayon : unique contrôle de rayon du fichier. Un clic active le mode radius
            // ET ouvre le réglage, sur tous les breakpoints.
            if (z.key === "radius") {
              return (
                <Popover
                  key={z.key}
                  open={openPop === "rad"}
                  onOpenChange={(o) => setOpenPop(o ? "rad" : null)}
                >
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      onClick={() => setZoneMode("radius")}
                      disabled={z.disabled}
                      aria-pressed={active}
                      className={chipClass}
                    >
                      {chipInner}
                    </button>
                  </PopoverTrigger>
                  <PopoverContent align="start" className="w-64 p-3 space-y-3">
                    <div className="flex gap-2 flex-wrap">
                      {RADIUS_SHORTCUTS.map(r => (
                        <button key={r} onClick={() => setRadius([r])} className={`rounded-full px-3 py-1 text-xs border transition-colors ${radius[0] === r ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary"}`}>{r} km</button>
                      ))}
                    </div>
                    {(() => {
                      const currentIdx = Math.max(0, ALLOWED_ALERT_RADII.indexOf(radius[0] as any));
                      return (
                        <>
                          <Slider
                            value={[currentIdx]}
                            onValueChange={(v) => setRadius([ALLOWED_ALERT_RADII[v[0]]])}
                            min={0}
                            max={ALLOWED_ALERT_RADII.length - 1}
                            step={1}
                          />
                          <p className="text-xs text-muted-foreground text-center">{radius[0]} km</p>
                        </>
                      );
                    })()}
                  </PopoverContent>
                </Popover>
              );
            }

            return (
              <button
                key={z.key}
                type="button"
                onClick={() => setZoneMode(z.key)}
                disabled={z.disabled}
                aria-pressed={active}
                className={chipClass}
              >
                {chipInner}
              </button>
            );
          })}

          {/* Pays : liste et chiffres de search_sitter_country_counts, même
              population que la liste. « Tous les pays » lève la restriction. */}
          {sitterCountries.length > 1 && (() => {
            const chipClass = "min-h-9 rounded-full border px-3 py-1 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring bg-card text-foreground border-border hover:border-primary";
            return (
              <Popover open={openPop === "country"} onOpenChange={(o) => setOpenPop(o ? "country" : null)}>
                <PopoverTrigger asChild>
                  <button type="button" className={chipClass} aria-label={`Pays de recherche : ${scopeLabel}`}>
                    Pays : {scopeLabel}
                  </button>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-56 p-2 space-y-1 max-h-72 overflow-y-auto">
                  <button
                    type="button"
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${selectedCountry === null ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted"}`}
                    onClick={() => handleCountryChange(null)}
                  >
                    Tous les pays
                    <span className="ml-1 text-muted-foreground">({totalSearchable})</span>
                  </button>
                  {sitterCountries.map((c) => (
                    <button
                      key={c.code}
                      type="button"
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${selectedCountry === c.code ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted"}`}
                      onClick={() => handleCountryChange(c.code)}
                    >
                      {countryName(c.code)}
                      <span className="ml-1 text-muted-foreground">({c.count})</span>
                    </button>
                  ))}
                </PopoverContent>
              </Popover>
            );
          })()}
        </div>


        {/* Sort bar + view toggle (sticky avec les pills pour cohérence visuelle) */}
        <div className="flex items-start justify-between gap-3 -mx-6 px-6 pt-3 border-t border-border/60 flex-nowrap">
          <div className="flex items-center gap-2 min-w-0 flex-1 overflow-x-auto no-scrollbar snap-x snap-mandatory">
            <div className="shrink-0 min-w-0" aria-live="polite">
              <p className="font-heading text-[17px] sm:text-lg font-semibold leading-tight text-foreground">
                {loading
                  ? t("search_results.sitters_searching")
                  : t("search_results.sitters_found", { count: results.length })}
              </p>
              {!loading && results.length > 0 && (
                <p className="text-[11.5px] text-muted-foreground leading-snug mt-0.5">
                  {sort === "affinity" && viewerOwner
                    ? t("search_results.sitters_hint_affinity")
                    : sort === "rating"
                      ? t("search_results.sitters_hint_rating")
                      : sort === "experience"
                        ? t("search_results.sitters_hint_experience")
                        : t("search_results.sitters_hint_closest")}
                </p>
              )}
            </div>
            {hasActiveFilters && (
              <button onClick={resetFilters} className="text-xs text-primary hover:underline whitespace-nowrap shrink-0">{t("search_results.reset_short")}</button>
            )}

            {/* Options de tri : « Meilleure affinité » n'apparaît que si le viewer
                a un profil owner (sinon le score est masqué et le tri n'a pas de sens). */}
            {(() => {
              const sortOptions: Array<{ value: SortOption; label: string }> = [
                ...(viewerOwner ? [{ value: "affinity" as SortOption, label: t("search_results.sort_affinity") }] : []),
                { value: "closest", label: t("search_results.sort_closest") },
                { value: "rating", label: t("search_results.sort_rating_sitters") },
                { value: "experience", label: t("search_results.sort_experience") },
              ];
              const handleSort = (v: SortOption) => {
                setSort(v);
                setSortUserOverride(true);
              };
              return (
                <>
                  <Select value={sort} onValueChange={(v) => handleSort(v as SortOption)}>
                    <SelectTrigger className="sm:hidden h-8 w-auto gap-1.5 rounded-full border-border bg-card px-3 text-xs shrink-0">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent align="start">
                      {sortOptions.map((o) => (
                        <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="hidden sm:flex gap-1.5 shrink-0">
                    {sortOptions.map((opt) => (
                      <button key={opt.value} onClick={() => handleSort(opt.value)} className={sort === opt.value ? sortPillActive : sortPillBase}>{opt.label}</button>
                    ))}
                  </div>
                </>
              );
            })()}

          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {city && (
              <button
                type="button"
                onClick={alertCreated ? undefined : handleCreateAlertGated}
                disabled={!city || isCreatingAlert}
                aria-label={alertCreated ? "Alerte créée" : "Créer une alerte pour cette recherche"}
                title={alertCreated ? "Alerte créée" : "Créer une alerte"}
                className={`inline-flex items-center justify-center h-9 w-9 rounded-lg border transition-colors ${alertCreated ? "border-primary/40 bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary hover:text-primary"}`}
              >
                {isCreatingAlert ? <Loader2 className="h-4 w-4 animate-spin" /> : alertCreated ? <BellRing className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
              </button>
            )}
            <div className="flex items-center gap-1 border border-border rounded-lg p-0.5" role="group" aria-label="Mode d'affichage des résultats">
              <button
                type="button"
                onClick={() => setViewMode("list")}
                aria-label={t("search_results.view_grid")}
                aria-pressed={viewMode === "list"}
                className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${viewMode === "list" ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:bg-muted"}`}
              >
                <LayoutGrid className="h-3.5 w-3.5" aria-hidden="true" />
                <span className="hidden sm:inline">Grille</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("map")}
                aria-label={t("search_results.view_map")}
                aria-pressed={viewMode === "map"}
                className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${viewMode === "map" ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:bg-muted"}`}
              >
                <MapIcon className="h-3.5 w-3.5" aria-hidden="true" />
                <span className="hidden sm:inline">Carte</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Results */}
      {viewMode === "list" ? (
        <div className="p-6">
          {searchError ? (
            <div
              role="alert"
              className="max-w-2xl mx-auto my-8 rounded-2xl border border-destructive/40 bg-destructive/5 p-6 text-center space-y-3"
            >
              <AlertCircle className="h-10 w-10 mx-auto text-destructive" aria-hidden="true" />
              <h2 className="font-heading text-lg font-semibold text-foreground">
                Une erreur est survenue lors de la recherche
              </h2>
              <p className="text-sm text-muted-foreground">
                {searchError} Vérifiez votre connexion, puis réessayez.
              </p>
              <Button
                type="button"
                variant="outline"
                onClick={() => { void handleSearch(); }}
                className="gap-2"
              >
                <RefreshCw className="h-4 w-4" aria-hidden="true" />
                Réessayer
              </Button>
            </div>
          ) : loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" aria-busy="true" aria-label="Chargement des gardiens">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="bg-card rounded-xl overflow-hidden border border-border">
                  <Skeleton className="aspect-square w-full rounded-none" />
                  <div className="p-3 space-y-2">
                    <Skeleton className="h-4 w-2/3" />
                    <Skeleton className="h-3 w-1/2" />
                    <Skeleton className="h-3 w-3/4" />
                    <Skeleton className="h-8 w-full mt-2" />
                  </div>
                </div>
              ))}
            </div>
          ) : results.length === 0 ? (
            <div className="max-w-2xl mx-auto py-12 md:py-16 space-y-6 md:space-y-8">
              <div className="text-center space-y-4">
                {(() => { const Illu = ILLUSTRATIONS.walkingDog; return <Illu />; })()}
                <h2 className="font-heading text-xl md:text-2xl font-semibold">
                  {isLaunchMode
                    ? "Soyez parmi les premiers propriétaires"
                    : hasActiveFilters
                      ? "Aucun gardien ne correspond à ces filtres"
                      : city && zoneMode === "radius"
                        ? `Aucun gardien à moins de ${radius[0]} km de ${city} pour l'instant`
                        : zoneMode === "dept" && refDept
                          ? `Aucun gardien dans ${deptLabel} pour l'instant`
                          : zoneMode === "country" && selectedCountry
                            ? `Aucun gardien consultable dans ce pays (${scopeLabel}) pour l'instant`
                            : "Aucun gardien dans cette zone pour l'instant"}
                </h2>
                <p className="text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
                  {isLaunchMode
                    ? "La communauté de gardiens se construit. Créez une alerte pour recevoir un e-mail dès qu'un gardien rejoint votre zone."
                    : expansion
                      ? "Vous pouvez élargir la zone ci-dessous, ou activer une alerte pour être prévenu dès qu'un gardien la rejoint."
                      : "Activez une alerte pour être prévenu dès qu'un gardien rejoint votre zone."}
                </p>
                {hasActiveFilters && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={resetFilters}
                    className="rounded-full mt-2"
                  >
                    Réinitialiser les filtres
                  </Button>
                )}
              </div>

              {/* Bloc suggestions pour relancer la recherche */}
              {!isLaunchMode && (
                <div className="bg-card rounded-xl border border-border shadow-sm p-5 space-y-3">
                  <h3 className="text-sm font-semibold">Suggestions pour relancer votre recherche</h3>
                  <div className="flex flex-wrap gap-2">
                    {hasActiveFilters && (
                      <button
                        onClick={resetFilters}
                        className="rounded-full px-3 py-1.5 text-xs border border-border bg-background hover:border-primary hover:bg-primary/5 transition-colors"
                      >
                        Supprimer les filtres actifs
                      </button>
                    )}
                    {animalTypes.length > 0 && !animalTypes.includes("Tous") && (
                      <button
                        onClick={() => setAnimalTypes([])}
                        className="rounded-full px-3 py-1.5 text-xs border border-border bg-background hover:border-primary hover:bg-primary/5 transition-colors"
                      >
                        Tous les animaux
                      </button>
                    )}
                    {zoneMode === "radius" && (() => {
                      const next = ALLOWED_ALERT_RADII.find(r => r > radius[0]);
                      return next ? (
                        <button
                          onClick={() => setRadius([next])}
                          className="rounded-full px-3 py-1.5 text-xs border border-border bg-background hover:border-primary hover:bg-primary/5 transition-colors"
                        >
                          {t("search_results.expand_zone", { zone: `${next} km` })}
                        </button>
                      ) : null;
                    })()}
                    {zoneMode === "radius" && (
                      <button
                        onClick={() => setZoneMode("dept")}
                        className="rounded-full px-3 py-1.5 text-xs border border-border bg-background hover:border-primary hover:bg-primary/5 transition-colors"
                      >
                        Rechercher dans le département
                      </button>
                    )}
                    {(zoneMode === "dept" || zoneMode === "region") && (
                      <button
                        onClick={() => setZoneMode("country")}
                        className="rounded-full px-3 py-1.5 text-xs border border-border bg-background hover:border-primary hover:bg-primary/5 transition-colors"
                      >
                        {scopeLabel === "France" ? "France entière" : scopeLabel}
                      </button>
                    )}
                    {minRating !== "all" && (
                      <button
                        onClick={() => setMinRating("all")}
                        className="rounded-full px-3 py-1.5 text-xs border border-border bg-background hover:border-primary hover:bg-primary/5 transition-colors"
                      >
                        Toutes les notes
                      </button>
                    )}
                    {minSits !== "all" && (
                      <button
                        onClick={() => setMinSits("all")}
                        className="rounded-full px-3 py-1.5 text-xs border border-border bg-background hover:border-primary hover:bg-primary/5 transition-colors"
                      >
                        Toutes les expériences
                      </button>
                    )}
                    {animalTypes.length === 0 && (
                      <button
                        onClick={() => toggleAnimal("Chiens")}
                        className="rounded-full px-3 py-1.5 text-xs border border-border bg-background hover:border-primary hover:bg-primary/5 transition-colors"
                      >
                        Essayer Chiens
                      </button>
                    )}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Carte 1, Élargir la zone (si une zone plus large a des résultats) */}
                {expansion && (
                  <button
                    onClick={() => {
                      applyExpansion(expansion.target);
                      trackEvent("search_empty_action", { source: "owner", metadata: { action: "expand_zone", from: zoneMode, to: expansion.target } });
                    }}
                    className="text-left p-4 rounded-xl border border-primary bg-primary/5 hover:bg-primary/10 transition-colors"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <MapPin className="h-4 w-4 text-primary" />
                      <span className="font-medium text-sm">{t("search_results.expand_zone", { zone: expansion.label })}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {t("search_results.expand_zone_count", { count: expansion.count })}
                    </p>
                  </button>
                )}

                {/* Carte 2, Créer une alerte */}
                <button
                  onClick={handleCreateAlertGated}
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
                        ? `Alerte active : un e-mail partira dès qu'un gardien rejoint la zone autour de ${city}.`
                        : `Recevez un e-mail dès qu'un gardien s'inscrit près de ${city}.`}
                  </p>
                </button>

                {/* Carte 3, Inviter un voisin */}
                <button
                  onClick={handleShareInvite}
                  className="text-left p-4 rounded-xl border border-border bg-card hover:border-primary transition-colors"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Share2 className="h-4 w-4 text-primary" />
                    <span className="font-medium text-sm">Inviter une personne de confiance</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Vous connaissez quelqu'un de fiable près de chez vous ? Invitez-le à rejoindre Guardiens.
                  </p>
                </button>

                {/* Carte 4, Publier annonce visible */}
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
            <>
              {/* Bandeau alerte pied de liste : nudge terracotta doux avec le SEUL
                  bouton primaire de la page. Masqué quand la zone est déjà bien
                  peuplée (≥ 8 résultats) ou quand l'alerte a déjà été créée. */}
              {city && !alertCreated && results.length > 0 && results.length < 8 && (
                <div className="mb-5 rounded-[20px] border border-terra-border bg-terra-soft px-5 py-4 md:px-6 md:py-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-heading text-[16px] font-semibold text-foreground">
                      Peu de gardiens correspondent encore&nbsp;?
                    </p>
                    <p className="text-[13px] text-muted-foreground mt-1 leading-snug">
                      Recevez un e-mail dès qu'un nouveau gardien rejoint la zone autour de&nbsp;{city}.
                    </p>
                  </div>
                  <button
                    onClick={handleCreateAlertGated}
                    disabled={isCreatingAlert}
                    className="shrink-0 inline-flex items-center justify-center gap-2 min-h-11 rounded-full bg-primary px-5 py-2.5 text-[13px] font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 disabled:opacity-60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {isCreatingAlert ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Bell className="h-4 w-4" aria-hidden />}
                    Créer mon alerte
                  </button>
                </div>
              )}
              {city && alertCreated && (
                <div className="mb-5 flex items-center gap-2 rounded-[20px] border border-primary/30 bg-primary/5 px-4 py-3 text-sm text-primary">
                  <BellRing className="h-4 w-4 shrink-0" aria-hidden="true" />
                  Alerte créée, l'e-mail partira automatiquement.
                </div>
              )}
            {results.length > 0 && <OwnerAffinityBanner className="mb-4" />}
            {/* Grille dense 4 col desktop / 3 laptop / 2 tablette / 1 mobile.
                Padding-right sur >= xl pour éviter que la dernière colonne passe
                sous le AlmaDock fixé (right-6 md:). */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 auto-rows-fr xl:pr-16">
              {(() => {
                const nameCounts: Record<string, number> = {};
                results.forEach((s: any) => {
                  const fn = (publicFirstName(s.profile?.first_name) || "Gardien").toLowerCase();
                  nameCounts[fn] = (nameCounts[fn] || 0) + 1;
                });
                return results.slice(0, visibleCount).map((s: any) => (
                  <SitterResultCard
                    key={s.id}
                    sitter={s}
                    photos={s._photos || []}
                    affinity={s._affinity || null}
                    hasOwnerProfile={!!viewerOwner}
                    duplicateName={nameCounts[(publicFirstName(s.profile?.first_name) || "Gardien").toLowerCase()] > 1}
                    city={city}
                  />
                ));
              })()}
            </div>
            {results.length > visibleCount && (
              <div className="mt-6 flex flex-col items-center gap-1">
                <Button variant="outline" onClick={() => setVisibleCount((n) => n + RESULTS_PAGE_SIZE)}>
                  Afficher plus de gardiens
                </Button>
                <p className="text-xs text-muted-foreground">
                  {visibleCount} affichés sur {results.length}
                </p>
              </div>
            )}
            </>
          )}
        </div>

      ) : (
        <div className="flex flex-col md:flex-row h-[calc(100dvh-180px)] md:h-[calc(100dvh-220px)]">
          <div className="order-2 md:order-1 w-full md:w-1/2 flex-1 min-h-0 overflow-y-auto border-r border-border p-4 space-y-3">
            {results.map((s: any) => {
              const profile = s.profile;
              const firstName = publicFirstName(profile?.first_name) || "Gardien";
              const nSits = profile?.completed_sits_count || 0;
              const distTxt =
                s._dist === 0 ? "Dans votre ville" : (s._dist != null && s._dist !== Infinity) ? `${s._dist} km` : null;
              const metaBits = [
                distTxt,
                s.avgRating != null && nSits > 0
                  ? `${s.avgRating.toFixed(1).replace(".", ",")} sur ${nSits} garde${nSits > 1 ? "s" : ""}`
                  : nSits > 0
                    ? `${nSits} garde${nSits > 1 ? "s" : ""}`
                    : null,
              ].filter(Boolean) as string[];
              return (
                <div
                  key={s.id}
                  role="link"
                  tabIndex={0}
                  aria-label={`Voir le profil de ${firstName}`}
                  className="flex gap-3 p-3 rounded-xl border border-border bg-card hover:shadow-sm hover:border-primary/40 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  onClick={() => navigate(`/gardiens/${s.user_id}`)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      navigate(`/gardiens/${s.user_id}`);
                    }
                  }}
                >
                  {profile?.avatar_url ? (
                    <img src={avatarImageUrl(profile.avatar_url, 112)} alt={firstName} className="h-14 w-14 rounded-xl object-cover shrink-0" />
                  ) : (
                    <div className="h-14 w-14 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <span className="text-lg text-primary font-bold">{firstName.charAt(0)}</span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-heading text-[16px] font-semibold truncate text-foreground">{firstName}</p>
                    {metaBits.length > 0 && (
                      <p className="text-[12.5px] text-muted-foreground truncate">{metaBits.join(" · ")}</p>
                    )}
                    {(() => {
                      const line = sitterCardLine(s, { omitSitsAndReviews: true });
                      return line ? (
                        <p className="text-[13px] leading-snug text-muted-foreground line-clamp-2">{line}</p>
                      ) : null;
                    })()}
                    <div className="flex items-center gap-1.5 flex-wrap mt-1">
                      <PresenceBadge lastSeenAt={profile?.last_seen_at} />
                      <ReplyTimeBadge minutes={s.reply_median_minutes} />
                    </div>
                  </div>
                  <span
                    aria-hidden
                    className="shrink-0 self-center inline-flex items-center rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground shadow-sm"
                  >
                    Voir le profil
                  </span>
                </div>
              );
            })}

          </div>
          <div className="order-1 md:order-2 w-full md:w-1/2 h-[45vh] md:h-auto relative bg-muted/30">
            <Suspense fallback={<div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">Chargement de la carte…</div>}>
              <SearchOwnerMapView
                sitters={mapPins}
                viewport={mapViewport}
                onContact={handleContact}
                contactingId={contactingId}
              />
            </Suspense>
          </div>
        </div>
      )}
    </div>
    </>
  );
};

export default SearchOwner;
