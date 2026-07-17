import { useState, useEffect, useCallback, useRef, lazy, Suspense } from "react";
import { logger } from "@/lib/logger";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import ReportButton from "@/components/reports/ReportButton";
import { supabase } from "@/integrations/supabase/client";
import { geocodeCity, haversineDistance } from "@/lib/geocode";
import { ALLOWED_ALERT_RADII, snapToAllowedRadius } from "@/lib/alertRadius";
import { useAuth } from "@/contexts/AuthContext";
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
import { getDeptCode, DEPT_NAMES } from "@/lib/departments";
import { getRegionCode, getRegionName } from "@/lib/regions";
import { trackEvent } from "@/lib/analytics";
import TrustHaloAvatar from "@/components/sitters/TrustHaloAvatar";
import ReachReassuranceBanner from "@/components/marketing/ReachReassuranceBanner";
import PresenceBadge from "@/components/messages/PresenceBadge";
import ReplyTimeBadge from "@/components/sitters/ReplyTimeBadge";
import { useActiveSittersCount } from "@/hooks/useActiveSittersCount";
import { useActiveOwnersCount } from "@/hooks/useActiveOwnersCount";
import OwnerToSitterAffinity from "@/components/matching/OwnerToSitterAffinity";
import OwnerAffinityBanner from "@/components/matching/OwnerAffinityBanner";
import SitterResultCard from "@/components/search/SitterResultCard";
import { useViewerOwnerForAffinity } from "@/hooks/useViewerOwnerForAffinity";
import { computeAffinityResultFull, type AffinityOwnerInput, type AffinitySitterInput } from "@/lib/affinityScore";

import { TooltipProvider } from "@/components/ui/tooltip";



const animalChips = ["Chiens", "Chats", "Chevaux", "Oiseaux", "Animaux de ferme", "NAC", "Tous"];
const animalChipToType: Record<string, string> = {
  Chiens: "dog", Chats: "cat", Chevaux: "horse", Oiseaux: "bird",
  "Animaux de ferme": "farm_animal", NAC: "nac",
};

const RADIUS_SHORTCUTS = [5, 15, 30, 50];

type SortOption = "affinity" | "closest" | "rating" | "experience";
type ViewMode = "list" | "map";
type ZoneMode = "radius" | "dept" | "region" | "france";

const SearchOwnerMapView = lazy(() => import("@/components/search/SearchOwnerMapView"));

const SearchOwner = () => {
  const { user, switchRole } = useAuth();
  const navigate = useNavigate();
  const { owner: viewerOwner } = useViewerOwnerForAffinity();

  const { toast: toastUi } = useToast();
  const [searchParams] = useSearchParams();

  // Filter state
  const [city, setCity] = useState("");
  const [cityPostalCode, setCityPostalCode] = useState<string | null>(null);
  const [userPostalCode, setUserPostalCode] = useState<string | null>(null);
  const [citySuggestions, setCitySuggestions] = useState<any[]>([]);
  const [radius, setRadius] = useState([15]);
  const [zoneMode, setZoneMode] = useState<ZoneMode>("radius");
  const [densityCounts, setDensityCounts] = useState<{ radius: number; dept: number; region: number; france: number }>({ radius: 0, dept: 0, region: 0, france: 0 });
  // Note: filtre Dates retiré tant que la disponibilité datée n'est pas modélisée côté gardien.
  const [animalTypes, setAnimalTypes] = useState<string[]>([]);
  const [vehicled, setVehicled] = useState(false);
  const [availableOnly, setAvailableOnly] = useState(false);
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [emergencyOnly, setEmergencyOnly] = useState(false);
  const [proOnly, setProOnly] = useState(false);
  const [minSits, setMinSits] = useState<string>("all");
  const [minRating, setMinRating] = useState<string>("all");
  const [sort, setSort] = useState<SortOption>("affinity");
  const [sortUserOverride, setSortUserOverride] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("list");

  const [results, setResults] = useState<any[]>([]);
  const [searchCenter, setSearchCenter] = useState<{ lat: number; lng: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
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

  // Load owner city + postal code on mount, URL params take precedence
  useEffect(() => {
    const urlCity = searchParams.get("city") || searchParams.get("ville");
    const urlPostal = searchParams.get("postal_code");
    const urlZone = searchParams.get("zone");
    const urlRadius = parseInt(searchParams.get("rayon") || "", 10);
    if (Number.isFinite(urlRadius) && urlRadius > 0 && urlRadius <= 200) setRadius([snapToAllowedRadius(urlRadius)]);

    if (urlCity) {
      setCity(urlCity);
      if (urlPostal) {
        setCityPostalCode(urlPostal);
        setUserPostalCode(urlPostal);
      }
      if (urlZone === "dept") setZoneMode("dept");
      else if (urlZone === "region") setZoneMode("region");
      else if (urlZone === "france") setZoneMode("france");
      else setZoneMode("radius");
      setInitialLoaded(true);
      return;
    }

    if (!user) {
      setInitialLoaded(true);
      return;
    }
    (async () => {
      const { data } = await supabase.from("profiles").select("city, postal_code").eq("id", user.id).single();
      if (data?.city) setCity(data.city);
      if (data?.postal_code) {
        setUserPostalCode(data.postal_code);
        setCityPostalCode(data.postal_code);
      }
      setInitialLoaded(true);
    })();
  }, [user, searchParams]);

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

  // Contact handler, propriétaire qui sonde un gardien (context: sitter_inquiry)
  const handleContact = async (sitterId: string) => {
    if (!user) {
      toast.error("Connectez-vous pour contacter un gardien");
      const redirect = `/gardiens/${sitterId}`;
      navigate(`/login?redirect=${encodeURIComponent(redirect)}`);
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
    if ((zoneMode !== "france" && !city) || alertCreated || isCreatingAlert) return;
    setIsCreatingAlert(true);
    trackEvent("search_empty_action", { source: "owner", metadata: { action: "create_alert", zone_mode: zoneMode } });

    let usedRadius: number | null = null;
    let savedScope = city;
    let error: any = null;

    if (zoneMode === "france") {
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
    const shareText = `Je cherche un gardien d'animaux près de ${city || "chez moi"} sur Guardiens. Tu peux t'inscrire ici :`;
    if (navigator.share) {
      try {
        await navigator.share({ title: "Guardiens, devenez gardien", text: shareText, url });
      } catch { /* user cancelled */ }
    } else {
      await navigator.clipboard.writeText(`${shareText} ${url}`);
      toast.success("Lien copié, partagez-le à une personne de confiance.");
    }
  };

  // Search logic
  const handleSearch = useCallback(async () => {
    setLoading(true);
    setSearchError(null);

    const { data: sitters, error: sittersError } = await supabase
      .from("sitter_profiles")
      .select("*, reply_median_minutes, profile:profiles!sitter_profiles_user_id_fkey(first_name, last_name, avatar_url, city, postal_code, profile_completion, identity_verified, completed_sits_count, bio, pro_status, pro_specialty, last_seen_at)")
      .limit(500);

    if (sittersError) {
      console.error("[SearchOwner] Erreur chargement gardiens:", sittersError);
      setSearchError("Impossible de charger les gardiens.");
      setLoading(false);
      return;
    }

    let items = (sitters || []).filter((s: any) => s.profile?.profile_completion >= 60);

    // Geocode all sitter cities once
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

    // Helper: enrich a sitter with coords and distance
    const withCoords = (s: any) => {
      const sitterCity = s.profile?.city;
      const coords = sitterCity ? cityCoords.get(sitterCity) : null;
      const dist = coords && searchCoords ? Math.round(haversineDistance(searchCoords.lat, searchCoords.lng, coords.lat, coords.lng)) : null;
      return { ...s, _dist: dist, _lat: coords?.lat ?? null, _lng: coords?.lng ?? null };
    };

    // Enrich ALL items with coords (needed for density counts across zones)
    const allItems = items.map(withCoords);

    // Fetch badges, emergency profiles, reviews et galerie pour TOUS les candidats
    const allUserIds = allItems.map((s: any) => s.user_id);
    const [allBadgesRes, emergencyRes, galleryRes] = allUserIds.length > 0
      ? await Promise.all([
          supabase.from("badge_attributions").select("user_id, badge_id").in("user_id", allUserIds),
          supabase.from("emergency_sitter_profiles").select("user_id, is_active").in("user_id", allUserIds).eq("is_active", true),
          supabase.from("sitter_gallery").select("user_id, photo_url, created_at").in("user_id", allUserIds).order("created_at", { ascending: false }),
        ])
      : [{ data: [] as any[], error: null }, { data: [] as any[], error: null }, { data: [] as any[], error: null }] as const;

    const enrichError = (allBadgesRes as any).error || (emergencyRes as any).error || (galleryRes as any).error;
    if (enrichError) {
      console.error("[SearchOwner] Erreur enrichissement gardiens:", enrichError);
      setSearchError("Impossible de charger les informations complètes des gardiens.");
      setLoading(false);
      return;
    }

    const emergencySet = new Set((emergencyRes.data || []).map((e: any) => e.user_id));

    const reviewsAgg = new Map<string, { sum: number; count: number }>();
    if (allUserIds.length > 0) {
      const { data: reviewRows, error: reviewsError } = await supabase
        .from("reviews")
        .select("reviewee_id, overall_rating")
        .in("reviewee_id", allUserIds)
        .eq("published", true);
      if (reviewsError) {
        console.error("[SearchOwner] Erreur chargement avis:", reviewsError);
        setSearchError("Impossible de charger les avis des gardiens.");
        setLoading(false);
        return;
      }
      (reviewRows || []).forEach((r: any) => {
        const cur = reviewsAgg.get(r.reviewee_id) || { sum: 0, count: 0 };
        cur.sum += r.overall_rating || 0;
        cur.count += 1;
        reviewsAgg.set(r.reviewee_id, cur);
      });
    }

    const badgeMap = new Map<string, Map<string, number>>();
    (allBadgesRes.data || []).forEach((b: any) => {
      if (!badgeMap.has(b.user_id)) badgeMap.set(b.user_id, new Map());
      const m = badgeMap.get(b.user_id)!;
      m.set(b.badge_id, (m.get(b.badge_id) || 0) + 1);
    });

    // Galerie : max 4 photos par gardien, avatar prépendu si présent.
    const photoMap = new Map<string, string[]>();
    (galleryRes.data || []).forEach((g: any) => {
      const arr = photoMap.get(g.user_id) || [];
      if (arr.length < 4 && g.photo_url) arr.push(g.photo_url);
      photoMap.set(g.user_id, arr);
    });

    // Enrich all items
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
      // Score d'affinité pré-calculé pour permettre le tri "Meilleure affinité".
      const affinity = viewerOwner
        ? computeAffinityResultFull(viewerOwner as AffinityOwnerInput, s as AffinitySitterInput)
        : null;
      return { ...s, avgRating, reviewCount: agg?.count || 0, topBadges, isEmergency: emergencySet.has(s.user_id), _photos: photos, _affinity: affinity };
    });

    // Apply ALL advanced filters (non-zone) to get the pool used for density counts
    let filtered = enrichedAll;
    if (vehicled) filtered = filtered.filter((s: any) => s.has_vehicle);
    if (availableOnly) filtered = filtered.filter((s: any) => s.is_available);
    if (verifiedOnly) filtered = filtered.filter((s: any) => s.profile?.identity_verified);
    if (proOnly) filtered = filtered.filter((s: any) => s.profile?.pro_status === "verified");
    if (animalTypes.length > 0 && !animalTypes.includes("Tous")) {
      const wanted = animalTypes.map(a => animalChipToType[a]).filter(Boolean);
      filtered = filtered.filter((s: any) => {
        const types: string[] = s.animal_types || [];
        return wanted.some(w => types.includes(w));
      });
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

    // Compute density counts on the FILTERED pool (before zone filter)
    const radiusCount = searchCoords ? filtered.filter((s: any) => s._dist != null && s._dist <= radius[0]).length : 0;
    const deptCount = refDept ? filtered.filter((s: any) => {
      const cp = s.profile?.postal_code; return cp ? getDeptCode(cp) === refDept : false;
    }).length : 0;
    const regionCount = refRegion ? filtered.filter((s: any) => {
      const cp = s.profile?.postal_code; return cp ? getRegionCode(getDeptCode(cp)) === refRegion : false;
    }).length : 0;
    setDensityCounts({
      radius: radiusCount,
      dept: deptCount,
      region: regionCount,
      france: filtered.length,
    });

    // Apply zone filter to the filtered pool
    let results = filtered;
    if (zoneMode === "radius") {
      if (searchCoords) {
        results = results.filter((s: any) => s._dist != null && s._dist <= radius[0]);
      } else if (city) {
        results = results.filter((s: any) => s.profile?.city?.toLowerCase().includes(city.toLowerCase()));
      }
    } else if (zoneMode === "dept" && refDept) {
      results = results.filter((s: any) => {
        const cp = s.profile?.postal_code; return cp ? getDeptCode(cp) === refDept : false;
      });
    } else if (zoneMode === "region" && refRegion) {
      results = results.filter((s: any) => {
        const cp = s.profile?.postal_code; return cp ? getRegionCode(getDeptCode(cp)) === refRegion : false;
      });
    }
    // france: no zone filter applied

    // Sort
    // Bascule automatique : si l'utilisateur n'a jamais choisi de tri
    // manuellement et n'a pas de profil owner (donc pas de scoring possible),
    // on retombe sur « Plus proches » comme défaut fonctionnel.
    let effectiveSort: SortOption = sort;
    if (!sortUserOverride && sort === "affinity" && !viewerOwner) {
      effectiveSort = "closest";
    }

    const affinityRank = (s: any) => {
      const a = s._affinity;
      if (!a || a.displayed === false) return -1;
      return a.score ?? 0;
    };

    let final = results;
    if (effectiveSort === "affinity") {
      final.sort((a, b) => {
        if (a.isEmergency !== b.isEmergency) return a.isEmergency ? -1 : 1;
        const ra = affinityRank(a);
        const rb = affinityRank(b);
        if (rb !== ra) return rb - ra;
        return (a._dist ?? Infinity) - (b._dist ?? Infinity);
      });
    } else if (effectiveSort === "closest") {
      final.sort((a, b) => {
        if (a.isEmergency !== b.isEmergency) return a.isEmergency ? -1 : 1;
        return (a._dist ?? Infinity) - (b._dist ?? Infinity);
      });
    } else if (effectiveSort === "rating") {
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
    setSearchCenter(searchCoords);
    setLoading(false);
  }, [city, cityPostalCode, userPostalCode, radius, zoneMode, animalTypes, vehicled, availableOnly, verifiedOnly, emergencyOnly, proOnly, minSits, minRating, sort, sortUserOverride, viewerOwner]);

  // Auto-search on filter change (debounced)
  useEffect(() => {
    if (!initialLoaded) return;
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => { handleSearch(); }, 400);
    return () => clearTimeout(debounceRef.current);
  }, [initialLoaded, city, cityPostalCode, radius, zoneMode, animalTypes, vehicled, availableOnly, verifiedOnly, emergencyOnly, proOnly, minSits, minRating, sort, handleSearch]);

  const hasActiveFilters = vehicled || availableOnly || verifiedOnly || emergencyOnly || proOnly || minSits !== "all" || minRating !== "all";
  const hasAnyRating = results.some((s: any) => s.avgRating !== null);

  // Zone helpers
  const refDept = getDeptCode(getZoneRefPostalCode());
  const refRegion = getRegionCode(refDept);
  const deptLabel = refDept ? `${refDept} ${DEPT_NAMES[refDept] || ""}`.trim() : "Département";
  // regionLabel volontairement supprimé (mémoire "No AURA").

  // Suggest expanding when current zone is empty and a wider zone has results.
  // L'étape "région" est volontairement omise : la promesse produit est « France
  // entière », pas régionale (voir mémoire core "No AURA").
  const suggestExpansion = (): { target: ZoneMode; count: number; label: string } | null => {
    if (results.length > 0) return null;
    if (zoneMode === "radius" && densityCounts.dept > 0) {
      return { target: "dept", count: densityCounts.dept, label: deptLabel };
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
    setProOnly(false);
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
  const sortPillActive = "snap-start shrink-0 rounded-full px-3 py-1 min-h-9 inline-flex items-center text-xs bg-foreground text-background cursor-pointer whitespace-nowrap";

  // Zone mode chips, l'option "région" est volontairement absente : la
  // promesse produit est « France entière », pas régionale (mémoire "No AURA").
  const zoneChips: Array<{ key: ZoneMode; label: string; count: number; disabled?: boolean }> = [
    { key: "radius", label: `${radius[0]} km`, count: densityCounts.radius, disabled: !city },
    { key: "dept", label: refDept ? `Dép. ${refDept}` : "Département", count: densityCounts.dept, disabled: !refDept },
    { key: "france", label: "France", count: densityCounts.france },
  ];

  const { data: activeSittersCount } = useActiveSittersCount();
  const { data: activeOwnersCount } = useActiveOwnersCount();

  return (
    <div className="animate-fade-in">
      {/* Title */}
      <div className="px-6 pt-6 pb-2 md:pt-8 space-y-1.5">
        <h2 className="font-heading text-3xl font-bold">Trouver un gardien</h2>
        <p className="text-sm text-muted-foreground">Près de chez vous par défaut, partout en France en un clic.</p>
        {/* KPI preuve sociale, desktop uniquement, discret (masqué mobile pour désencombrer above-the-fold) */}
        {(activeSittersCount || activeOwnersCount) && (
          <p className="hidden md:flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground pt-1">
            {!!activeSittersCount && (
              <span className="inline-flex items-center">
                <span className="font-semibold text-foreground mr-1">{activeSittersCount.toLocaleString("fr-FR")}</span>
                gardiens en France
              </span>
            )}
            {!!activeSittersCount && !!activeOwnersCount && (
              <span className="text-muted-foreground/60">·</span>
            )}
            {!!activeOwnersCount && (
              <span className="inline-flex items-center">
                <span className="font-semibold text-foreground mr-1">{activeOwnersCount.toLocaleString("fr-FR")}</span>
                propriétaires inscrits
              </span>
            )}
          </p>
        )}
      </div>



      {/* Sticky search bar */}
      <div className="sticky top-[52px] md:top-0 z-[1100] bg-background border-b-2 border-border shadow-sm px-6 py-3 space-y-3">
        {/* ─── Hero search (desktop V2) : ville dominante + rayon + CTA ─── */}
        <div className="hidden md:flex items-center gap-3">
          <Popover open={openPop === "loc-hero"} onOpenChange={(o) => setOpenPop(o ? "loc-hero" : null)}>
            <PopoverTrigger asChild>
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
                <span className="text-xs text-muted-foreground shrink-0 hidden lg:inline">Ville, code postal…</span>
              </button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-[420px] p-3 space-y-3">
              <div className="relative">
                <Input
                  placeholder="Rechercher une ville..."
                  value={city}
                  onChange={(e) => {
                    setCity(e.target.value);
                    setCityPostalCode(null);
                    fetchCitySuggestions(e.target.value);
                  }}
                  className="pr-10"
                  aria-label="Ville ou commune"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={handleGeolocate}
                  aria-label="Utiliser ma position actuelle"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary"
                >
                  <Crosshair className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
              {citySuggestions.length > 0 && (
                <div className="space-y-1 max-h-64 overflow-y-auto">
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

          {zoneMode === "radius" && (
            <Select value={String(radius[0])} onValueChange={(v) => setRadius([Number(v)])}>
              <SelectTrigger className="w-[140px] h-[52px] rounded-2xl border-border bg-card shadow-sm">
                <SelectValue placeholder="Rayon" />
              </SelectTrigger>
              <SelectContent>
                {ALLOWED_ALERT_RADII.map((r) => (
                  <SelectItem key={r} value={String(r)}>{r} km</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* CTA « Rechercher » retiré : la recherche est live (ville/rayon → refetch auto),
              le bouton primary volait l'attention pour zéro action utile. */}
        </div>

        <div className="relative -mr-6 sm:mr-0">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pr-10 sm:pr-0 snap-x snap-mandatory scroll-px-6 overscroll-x-contain">
          {/* PILL 1, Localisation (mobile — desktop a le hero search au-dessus) */}
          <Popover open={openPop === "loc"} onOpenChange={(o) => setOpenPop(o ? "loc" : null)}>
            <PopoverTrigger asChild>
              <button className={`md:hidden ${city ? pillActive : pillBase}`}>
                <MapPin className="h-3.5 w-3.5 shrink-0" />
                {city || "Localisation"}
              </button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-72 p-3 space-y-3">
              <div className="relative">
                <Input
                  placeholder="Rechercher une ville..."
                  value={city}
                  onChange={(e) => {
                    setCity(e.target.value);
                    // Reset le code postal si l'utilisateur tape sans choisir de suggestion
                    setCityPostalCode(null);
                    fetchCitySuggestions(e.target.value);
                  }}
                  className="pr-10"
                  aria-label="Ville ou commune"
                />
                <button
                  type="button"
                  onClick={handleGeolocate}
                  aria-label="Utiliser ma position actuelle"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary"
                >
                  <Crosshair className="h-4 w-4" aria-hidden="true" />
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

          {/* PILL 2, Rayon — mobile uniquement (desktop a le Select rayon dans le hero) */}
          {zoneMode === "radius" && (
            <Popover open={openPop === "rad"} onOpenChange={(o) => setOpenPop(o ? "rad" : null)}>
              <PopoverTrigger asChild>
                <button className={`md:hidden ${pillBase}`}>{radius[0]} km</button>
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
          )}


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
                    <p className="text-sm">Profils vérifiés uniquement</p>
                    <Switch checked={verifiedOnly} onCheckedChange={setVerifiedOnly} />
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-sm flex items-center gap-1.5"><Zap className="h-3.5 w-3.5 text-amber-500" /> Gardiens d'urgence</p>
                    <Switch checked={emergencyOnly} onCheckedChange={setEmergencyOnly} />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm">Gardiens Pro uniquement</p>
                      <p className="text-xs text-muted-foreground">Professionnels animaliers déclarés et vérifiés</p>
                    </div>
                    <Switch checked={proOnly} onCheckedChange={setProOnly} />
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
            return (
              <button
                key={z.key}
                type="button"
                onClick={() => setZoneMode(z.key)}
                disabled={z.disabled}
                aria-pressed={active}
                className={`min-h-9 rounded-full border px-3 py-1 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40 disabled:cursor-not-allowed ${
                  active
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card text-muted-foreground border-border hover:border-primary"
                }`}
              >
                {z.label}
                {z.count > 0 && (
                  <span className={`ml-1 text-[10px] ${active ? "text-primary-foreground/80" : "text-muted-foreground/70"}`}>
                    ({z.count})
                  </span>
                )}
              </button>
            );
          })}
        </div>


        {/* Sort bar + view toggle (sticky avec les pills pour cohérence visuelle) */}
        <div className="flex items-center justify-between gap-2 -mx-6 px-6 pt-2.5 border-t border-border/60 flex-nowrap">
          <div className="flex items-center gap-2 min-w-0 flex-1 overflow-x-auto no-scrollbar snap-x snap-mandatory">
            <p className="text-xs sm:text-sm font-medium text-foreground shrink-0" aria-live="polite">{loading ? "Recherche en cours…" : (<>{results.length} gardien{results.length !== 1 ? "s" : ""}<span className="hidden sm:inline"> disponible{results.length !== 1 ? "s" : ""}</span></>)}</p>
            {hasActiveFilters && (
              <button onClick={resetFilters} className="text-xs text-primary hover:underline whitespace-nowrap shrink-0">Réinit.</button>
            )}
            {/* Options de tri : « Meilleure affinité » n'apparaît que si le viewer
                a un profil owner (sinon le score est masqué et le tri n'a pas de sens). */}
            {(() => {
              const sortOptions: Array<{ value: SortOption; label: string }> = [
                ...(viewerOwner ? [{ value: "affinity" as SortOption, label: "Meilleure affinité" }] : []),
                { value: "closest", label: "Plus proches" },
                { value: "rating", label: "Mieux notés" },
                { value: "experience", label: "Plus expérimentés" },
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
                onClick={alertCreated ? undefined : handleCreateAlert}
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
                aria-label="Vue grille"
                aria-pressed={viewMode === "list"}
                className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${viewMode === "list" ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:bg-muted"}`}
              >
                <LayoutGrid className="h-3.5 w-3.5" aria-hidden="true" />
                <span className="hidden sm:inline">Grille</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("map")}
                aria-label="Vue carte"
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
                    : city
                      ? `Aucun gardien à ${city} pour l'instant`
                      : zoneMode === "france"
                        ? "Aucun gardien en France pour l'instant"
                        : zoneMode === "dept" && refDept
                          ? `Aucun gardien dans ${deptLabel} pour l'instant`
                          : "Aucun gardien dans cette zone pour l'instant"}
                </h2>
                <p className="text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
                  {isLaunchMode
                    ? "La communauté de gardiens se construit. Créez une alerte pour recevoir un e-mail dès qu'un gardien rejoint votre zone."
                    : zoneMode !== "france"
                      ? "Essayez d'élargir à la France entière, ou activez une alerte pour être prévenu dès qu'un gardien rejoint votre zone."
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
                          Élargir à {next} km
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
                    {zoneMode === "dept" && (
                      <button
                        onClick={() => setZoneMode("france")}
                        className="rounded-full px-3 py-1.5 text-xs border border-border bg-background hover:border-primary hover:bg-primary/5 transition-colors"
                      >
                        France entière
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

                {/* Carte 2, Créer une alerte */}
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
              {/* Bandeau « Recevez une alerte » : masqué quand la zone est déjà bien peuplée
                  (≥ 8 résultats). L'action reste accessible via la cloche dans le toolbar. */}
              {city && !alertCreated && results.length > 0 && results.length < 8 && (
                <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-muted/40 px-4 py-2.5">
                  <p className="text-xs text-muted-foreground flex items-center gap-2">
                    <Bell className="h-3.5 w-3.5 text-primary shrink-0" aria-hidden="true" />
                    Recevez une alerte e-mail dès qu'un nouveau gardien rejoint la zone autour de {city}.
                  </p>
                  <button
                    onClick={handleCreateAlert}
                    disabled={isCreatingAlert}
                    className="text-xs font-medium text-primary hover:underline disabled:opacity-60 whitespace-nowrap"
                  >
                    {isCreatingAlert ? "Création…" : "Créer une alerte"}
                  </button>
                </div>
              )}
              {city && alertCreated && (
                <div className="mb-4 flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-4 py-2.5 text-xs text-primary">
                  <BellRing className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  Alerte créée, l'e-mail partira automatiquement.
                </div>
              )}
            {results.length > 0 && <OwnerAffinityBanner className="mb-4" />}
            {/* Grille dense 4 col desktop / 3 laptop / 2 tablette / 1 mobile.
                Padding-right sur >= xl pour éviter que la dernière colonne passe
                sous le AlmaDock fixé (right-6 md:). */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 auto-rows-fr xl:pr-16">
              {(() => {
                const nameCounts: Record<string, number> = {};
                results.forEach((s: any) => {
                  const fn = (s.profile?.first_name || "Gardien").toLowerCase();
                  nameCounts[fn] = (nameCounts[fn] || 0) + 1;
                });
                return results.map((s: any) => (
                  <SitterResultCard
                    key={s.id}
                    sitter={s}
                    photos={s._photos || []}
                    affinity={s._affinity || null}
                    hasOwnerProfile={!!viewerOwner}
                    onContact={handleContact}
                    contactingId={contactingId}
                    duplicateName={nameCounts[(s.profile?.first_name || "Gardien").toLowerCase()] > 1}
                    city={city}
                  />
                ));
              })()}
            </div>
            </>
          )}
        </div>
      ) : (
        <div className="flex flex-col md:flex-row h-[calc(100dvh-180px)] md:h-[calc(100dvh-220px)]">
          <div className="order-2 md:order-1 w-full md:w-1/2 flex-1 min-h-0 overflow-y-auto border-r border-border p-4 space-y-3">
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
                    {s._dist != null && s._dist !== Infinity && <p className="text-xs text-muted-foreground">{s._dist === 0 ? "Dans votre ville" : `${s._dist} km`}</p>}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <PresenceBadge lastSeenAt={profile?.last_seen_at} />
                      <ReplyTimeBadge minutes={s.reply_median_minutes} />
                    </div>
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
          <div className="order-1 md:order-2 w-full md:w-1/2 h-[45vh] md:h-auto relative bg-muted/30">
            <Suspense fallback={<div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">Chargement de la carte…</div>}>
              <SearchOwnerMapView
                sitters={results
                  .filter((s: any) => s._lat != null && s._lng != null)
                  .map((s: any) => ({
                    id: s.id,
                    user_id: s.user_id,
                    firstName: s.profile?.first_name || "Gardien",
                    city: s.profile?.city ?? null,
                    avatar: s.profile?.avatar_url ?? null,
                    avgRating: s.avgRating ?? null,
                    dist: s._dist ?? null,
                    coords: { lat: s._lat, lng: s._lng },
                  }))}
                centerCoords={searchCenter}
                onContact={handleContact}
                contactingId={contactingId}
              />
            </Suspense>
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchOwner;
