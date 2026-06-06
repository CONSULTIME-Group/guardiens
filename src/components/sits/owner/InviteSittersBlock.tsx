/**
 * Bloc « Inviter des gardiens » affiché sur la fiche annonce côté propriétaire
 * (statut = published). Deux onglets :
 *  - Mes favoris : gardiens favoris du propriétaire, bouton « Inviter ».
 *  - Trouver des gardiens : recherche par nom / ville parmi les profils 'sitter'.
 *
 * Les états par sitter (non invité / invité / a candidaté) sont calculés à
 * partir de la table `sit_invitations` (hook useSitInvitations).
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Search, Send, Check, MailCheck, Heart, Sparkles, ArrowRight, MapPin, SlidersHorizontal, ShieldCheck, ImageIcon, GraduationCap, PawPrint, X, Crosshair, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useFavorites } from "@/hooks/useFavorites";
import { useSitInvitations } from "@/hooks/useSitInvitations";
import { DEPT_NAMES } from "@/lib/departments";
import { Slider } from "@/components/ui/slider";
import { geocodeCity, haversineDistance } from "@/lib/geocode";
import InviteSitterDialog from "./InviteSitterDialog";
import PostPublishRecapDialog from "./PostPublishRecapDialog";
import BulkInviteNearestDialog from "./BulkInviteNearestDialog";

const ANIMAL_OPTIONS: { label: string; value: string }[] = [
  { label: "Chiens", value: "dog" },
  { label: "Chats", value: "cat" },
  { label: "Chevaux", value: "horse" },
  { label: "Ferme", value: "farm_animal" },
  { label: "NAC", value: "nac" },
];

const EXPERIENCE_OPTIONS: { label: string; value: number }[] = [
  { label: "Toutes", value: 0 },
  { label: "1 garde+", value: 1 },
  { label: "3 gardes+", value: 3 },
  { label: "5 gardes+", value: 5 },
];

interface SitterRow {
  id: string;
  first_name: string | null;
  avatar_url: string | null;
  city: string | null;
  bio: string | null;
  /** Distance en km depuis le propriétaire, défini uniquement en mode rayon. */
  distance_km?: number | null;
}

const RADIUS_OPTIONS = [5, 10, 15, 30, 50, 100];

interface InviteSittersBlockProps {
  sitId: string;
  ownerId: string;
  sitTitle: string;
  sitCity: string | null;
  /** Code postal du propriétaire, utilisé pour pré-cibler le département. */
  ownerPostalCode?: string | null;
  /** Pays du propriétaire (ISO ou texte libre). FR/null = comportement standard.
   *  Toute autre valeur désactive la recherche par département/rayon (FR-only). */
  ownerCountry?: string | null;
  startDate: string | null;
  endDate: string | null;
  /** Si true → applique un effet visuel d'accent (juste après publication) */
  highlight?: boolean;
}

const InviteSittersBlock = ({
  sitId,
  ownerId,
  sitTitle,
  sitCity,
  ownerPostalCode = null,
  ownerCountry = null,
  startDate,
  endDate,
  highlight = false,
}: InviteSittersBlockProps) => {
  const isInternational = !!ownerCountry && ownerCountry !== "FR" && ownerCountry.toLowerCase() !== "france";
  const { data: favorites = [] } = useFavorites("sitter");
  const { data: invitations = [] } = useSitInvitations(sitId);

  const invitedById = useMemo(() => {
    const map = new Map<string, "sent" | "viewed" | "applied" | "declined">();
    invitations.forEach((i) => map.set(i.sitter_id, i.status));
    return map;
  }, [invitations]);

  const favoriteIds = useMemo(() => favorites.map((f) => f.target_id), [favorites]);
  const [favSitters, setFavSitters] = useState<SitterRow[]>([]);
  useEffect(() => {
    let cancel = false;
    if (favoriteIds.length === 0) {
      setFavSitters([]);
      return;
    }
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, first_name, avatar_url, city, bio")
        .in("id", favoriteIds)
        .eq("role", "sitter");
      if (!cancel) setFavSitters((data as SitterRow[]) || []);
    })();
    return () => {
      cancel = true;
    };
  }, [favoriteIds]);

  // Recherche : par mots-clés (prénom/ville) et/ou par département (code postal)
  // OU par rayon depuis la ville du propriétaire
  // + filtres avancés (animaux, expérience min, vérifié, photo)
  const [query, setQuery] = useState("");
  const [searchMode, setSearchMode] = useState<"dept" | "radius">("dept");
  const [deptCode, setDeptCode] = useState<string>(""); // "" = tous départements
  const [radiusKm, setRadiusKm] = useState<number>(15);
  const [animals, setAnimals] = useState<string[]>([]);
  const [minExperience, setMinExperience] = useState<number>(0);
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [withPhotoOnly, setWithPhotoOnly] = useState(false);
  const [searchResults, setSearchResults] = useState<SitterRow[]>([]);
  const [searching, setSearching] = useState(false);

  // Coords du propriétaire (géocodage de sitCity, fait une seule fois).
  const [ownerCoords, setOwnerCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [ownerCoordsLoading, setOwnerCoordsLoading] = useState(false);
  useEffect(() => {
    if (!sitCity || ownerCoords) return;
    setOwnerCoordsLoading(true);
    geocodeCity(sitCity).then((r) => {
      if (r) setOwnerCoords({ lat: r.lat, lng: r.lng });
      setOwnerCoordsLoading(false);
    });
  }, [sitCity, ownerCoords]);

  // Cache mémoire des géocodages de villes candidates pour limiter les
  // appels à l'edge function `geocode` lors d'une session.
  const cityGeoCache = useRef<Map<string, { lat: number; lng: number } | null>>(new Map());

  const activeAdvancedFilters =
    animals.length + (minExperience > 0 ? 1 : 0) + (verifiedOnly ? 1 : 0) + (withPhotoOnly ? 1 : 0);

  useEffect(() => {
    const q = query.trim();
    const radiusActive = searchMode === "radius" && !!ownerCoords;
    // Au moins un critère requis
    if (q.length < 2 && !deptCode && !radiusActive && activeAdvancedFilters === 0) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    const t = setTimeout(async () => {
      const needsSitterJoin = animals.length > 0;
      const selectCols = needsSitterJoin
        ? "id, first_name, avatar_url, city, bio, postal_code, identity_verified, completed_sits_count, sitter_profiles!inner(animal_types)"
        : "id, first_name, avatar_url, city, bio, postal_code, identity_verified, completed_sits_count";

      let req = supabase
        .from("profiles")
        .select(selectCols)
        .eq("role", "sitter")
        .neq("id", ownerId);

      if (q.length >= 2) {
        req = req.or(`first_name.ilike.%${q}%,city.ilike.%${q}%`);
      }
      // Mode département : filtre côté DB par préfixe code postal.
      // Mode rayon : pas de filtre DB sur le CP, on filtre côté client par distance
      // (limité à 200 candidats max pour préserver les perfs de géocodage).
      if (searchMode === "dept" && deptCode) {
        req = req.like("postal_code", `${deptCode}%`);
      }
      if (verifiedOnly) {
        req = req.eq("identity_verified", true);
      }
      if (withPhotoOnly) {
        req = req.not("avatar_url", "is", null);
      }
      if (minExperience > 0) {
        req = req.gte("completed_sits_count", minExperience);
      }
      if (animals.length > 0) {
        req = req.overlaps("sitter_profiles.animal_types", animals);
      }

      const limit = radiusActive ? 200 : 30;
      const { data } = await req.limit(limit);
      let rows: SitterRow[] = ((data as any[]) || []) as SitterRow[];

      if (radiusActive && ownerCoords) {
        // Géocodage parallèle (avec cache) des villes candidates,
        // puis filtrage par distance et tri croissant.
        const uniqueCities = Array.from(
          new Set(rows.map((r) => (r.city || "").trim()).filter((c) => c.length > 0)),
        );
        await Promise.all(
          uniqueCities.map(async (c) => {
            if (cityGeoCache.current.has(c)) return;
            const g = await geocodeCity(c);
            cityGeoCache.current.set(c, g ? { lat: g.lat, lng: g.lng } : null);
          }),
        );
        rows = rows
          .map((r) => {
            const g = r.city ? cityGeoCache.current.get(r.city.trim()) : null;
            if (!g) return { ...r, distance_km: null };
            const d = haversineDistance(ownerCoords.lat, ownerCoords.lng, g.lat, g.lng);
            return { ...r, distance_km: Math.round(d) };
          })
          .filter((r) => r.distance_km !== null && (r.distance_km as number) <= radiusKm)
          .sort(
            (a, b) =>
              ((a.distance_km ?? Number.POSITIVE_INFINITY) as number) -
              ((b.distance_km ?? Number.POSITIVE_INFINITY) as number),
          )
          .slice(0, 30);
      }

      setSearchResults(rows);
      setSearching(false);
    }, 300);
    return () => clearTimeout(t);
  }, [query, searchMode, deptCode, radiusKm, ownerCoords, animals, minExperience, verifiedOnly, withPhotoOnly, ownerId, activeAdvancedFilters]);

  const resetAdvanced = () => {
    setAnimals([]);
    setMinExperience(0);
    setVerifiedOnly(false);
    setWithPhotoOnly(false);
  };

  const toggleAnimal = (v: string) =>
    setAnimals((prev) => (prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]));

  const [inviteTarget, setInviteTarget] = useState<SitterRow | null>(null);

  // Compteurs
  const sentCount = invitations.filter((i) => i.status === "sent" || i.status === "viewed").length;
  const appliedCount = invitations.filter((i) => i.status === "applied").length;

  const renderCard = (s: SitterRow) => {
    const status = invitedById.get(s.id);
    return (
      <div
        key={s.id}
        className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card hover:border-primary/40 transition"
      >
        <Avatar className="h-10 w-10 shrink-0">
          <AvatarImage src={s.avatar_url || undefined} alt={s.first_name || "Gardien"} />
          <AvatarFallback>{(s.first_name || "?").slice(0, 1).toUpperCase()}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <Link
            to={`/gardiens/${s.id}`}
            className="font-medium text-sm hover:underline truncate block"
          >
            {s.first_name || "Gardien"}
          </Link>
          {s.city && (
            <p className="text-xs text-muted-foreground truncate">
              {s.city}
              {typeof s.distance_km === "number" && (
                <span className="ml-1 text-primary font-medium">· {s.distance_km} km</span>
              )}
            </p>
          )}
        </div>
        {status === "applied" ? (
          <span className="text-xs flex items-center gap-1 text-success font-medium">
            <Check className="h-3.5 w-3.5" /> A candidaté
          </span>
        ) : status ? (
          <span className="text-xs flex items-center gap-1 text-muted-foreground">
            <MailCheck className="h-3.5 w-3.5" /> Invité
          </span>
        ) : (
          <Button
            size="sm"
            variant="outline"
            onClick={() => setInviteTarget(s)}
            className="shrink-0"
          >
            <Send className="h-3.5 w-3.5 mr-1" /> Inviter
          </Button>
        )}
      </div>
    );
  };

  // Liste triée des départements pour le sélecteur
  const deptOptions = useMemo(
    () =>
      Object.entries(DEPT_NAMES).sort(([a], [b]) => a.localeCompare(b)),
    [],
  );

  const hasSearchCriteria =
    query.trim().length >= 2 ||
    (searchMode === "dept" && !!deptCode) ||
    (searchMode === "radius" && !!ownerCoords) ||
    activeAdvancedFilters > 0;

  // Onglet actif (contrôlé) pour permettre au récap post-publication de
  // rediriger immédiatement l'utilisateur vers le bon onglet.
  const [activeTab, setActiveTab] = useState<"favorites" | "search">(
    highlight ? "search" : "favorites",
  );

  // Récap post-publication : s'ouvre une seule fois quand `highlight` passe à true.
  const [recapOpen, setRecapOpen] = useState(false);
  const [recapShown, setRecapShown] = useState(false);
  useEffect(() => {
    if (highlight && !recapShown) {
      setRecapOpen(true);
      setRecapShown(true);
    }
  }, [highlight, recapShown]);

  // Envoi groupé aux 20 plus proches
  const [bulkOpen, setBulkOpen] = useState(false);
  const remainingQuota = Math.max(0, 20 - sentCount);
  const alreadyInvitedIds = useMemo(() => Array.from(invitedById.keys()), [invitedById]);

  return (
    <section
      id="invite-sitters-block"
      className={`mt-8 mb-8 rounded-2xl border-2 bg-primary/[0.03] p-5 md:p-6 transition-all ${
        highlight
          ? "border-primary/60 shadow-[0_0_0_4px_hsl(var(--primary)/0.12)] animate-pulse-once"
          : "border-primary/20"
      }`}
    >
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Proposer votre annonce à des gardiens
            </h2>
            <Badge variant="outline" className="text-[11px] font-normal border-primary/30 text-primary">
              Recommandé
            </Badge>
            {highlight && (
              <Badge className="text-[11px] font-medium bg-primary text-primary-foreground">
                Annonce publiée, à vous de jouer
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Ne laissez pas le hasard faire tout le travail. Envoyez votre annonce directement à des gardiens :
            vos favoris, par prénom/ville, par département, ou via la recherche avancée.
          </p>
          {(sentCount > 0 || appliedCount > 0) && (
            <p className="text-xs text-primary/80 mt-2 font-medium">
              {sentCount} invitation{sentCount > 1 ? "s" : ""} envoyée{sentCount > 1 ? "s" : ""}
              {appliedCount > 0 && ` · ${appliedCount} candidature${appliedCount > 1 ? "s" : ""} reçue${appliedCount > 1 ? "s" : ""}`}
              {sentCount >= 20 && ", limite de 20 par 24 h atteinte"}
            </p>
          )}
          {ownerCoords && remainingQuota > 0 && !isInternational && (
            <div className="mt-3">
              <Button
                size="sm"
                onClick={() => setBulkOpen(true)}
                className="gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90"
              >
                <Crosshair className="h-3.5 w-3.5" />
                Inviter les {Math.min(20, remainingQuota)} gardiens disponibles les plus proches
              </Button>
              <p className="text-[11px] text-muted-foreground mt-1">
                Envoi groupé en un clic, autour de {sitCity || "votre ville"}.
              </p>
            </div>
          )}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "favorites" | "search")} className="w-full">
        <TabsList className="bg-background/80">
          <TabsTrigger value="favorites">
            <Heart className="h-4 w-4 mr-1.5" /> Mes favoris ({favSitters.length})
          </TabsTrigger>
          <TabsTrigger value="search">
            <Search className="h-4 w-4 mr-1.5" /> Rechercher
          </TabsTrigger>
        </TabsList>

        <TabsContent value="favorites" className="mt-4">
          {favSitters.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-card p-6 text-center">
              <Heart className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                Vous n'avez pas encore de gardiens en favoris.
              </p>
              <p className="text-xs text-muted-foreground mt-1 mb-3">
                En parcourant les profils, cliquez sur le cœur pour sauvegarder les gardiens qui vous plaisent.
                Vous pourrez ensuite les inviter ici en un clic.
              </p>
              <Link to="/recherche">
                <Button variant="outline" size="sm">
                  Parcourir les gardiens <ArrowRight className="h-3.5 w-3.5 ml-1" />
                </Button>
              </Link>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-2">{favSitters.map(renderCard)}</div>
          )}
        </TabsContent>

        <TabsContent value="search" className="mt-4 space-y-3">
          {isInternational && (
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-xs text-foreground">
              <p className="font-medium mb-1">Annonce internationale</p>
              <p className="text-muted-foreground">
                Votre annonce est hors France : la recherche par département et le rayon
                géographique sont désactivés (notre base de gardiens est principalement
                française). Vous pouvez toujours rechercher par prénom/ville et inviter
                directement, ou inviter depuis vos favoris.
              </p>
            </div>
          )}
          {/* Toggle mode : Département vs Rayon depuis ma ville */}
          <div className="inline-flex rounded-lg border border-border bg-background/80 p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setSearchMode("dept")}
              className={`px-3 py-1.5 rounded-md transition flex items-center gap-1.5 ${
                searchMode === "dept"
                  ? "bg-primary text-primary-foreground font-medium"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <MapPin className="h-3.5 w-3.5" /> Département
            </button>
            <button
              type="button"
              onClick={() => setSearchMode("radius")}
              disabled={!sitCity}
              title={!sitCity ? "Renseignez votre ville pour activer la recherche par rayon" : undefined}
              className={`px-3 py-1.5 rounded-md transition flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed ${
                searchMode === "radius"
                  ? "bg-primary text-primary-foreground font-medium"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Crosshair className="h-3.5 w-3.5" /> Rayon depuis ma ville
            </button>
          </div>

          <div className="grid sm:grid-cols-[1fr_220px] gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Prénom ou ville du gardien…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-9 bg-background/80"
              />
            </div>
            {searchMode === "dept" ? (
              <Select
                value={deptCode || "all"}
                onValueChange={(v) => setDeptCode(v === "all" ? "" : v)}
              >
                <SelectTrigger className="bg-background/80">
                  <MapPin className="h-4 w-4 mr-1.5 text-muted-foreground" />
                  <SelectValue placeholder="Tous les départements" />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  <SelectItem value="all">Tous les départements</SelectItem>
                  {deptOptions.map(([code, name]) => (
                    <SelectItem key={code} value={code}>
                      {code}, {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Select
                value={String(radiusKm)}
                onValueChange={(v) => setRadiusKm(parseInt(v, 10))}
              >
                <SelectTrigger className="bg-background/80">
                  <Crosshair className="h-4 w-4 mr-1.5 text-muted-foreground" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RADIUS_OPTIONS.map((r) => (
                    <SelectItem key={r} value={String(r)}>
                      {r} km
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {searchMode === "radius" && (
            <div className="rounded-lg border border-border bg-background/60 p-3 space-y-2">
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <Crosshair className="h-3.5 w-3.5" />
                  {sitCity ? (
                    <>
                      Autour de <span className="font-medium text-foreground">{sitCity}</span>
                      {ownerPostalCode && ` (${ownerPostalCode})`}
                    </>
                  ) : (
                    <span className="text-destructive">Ville du propriétaire manquante</span>
                  )}
                </span>
                <span className="font-medium text-primary tabular-nums">{radiusKm} km</span>
              </div>
              {sitCity && (
                <Slider
                  value={[radiusKm]}
                  onValueChange={(v) => setRadiusKm(v[0])}
                  min={5}
                  max={100}
                  step={5}
                  className="py-1"
                />
              )}
              {ownerCoordsLoading && (
                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <Loader2 className="h-3 w-3 animate-spin" /> Localisation de votre ville…
                </p>
              )}
              {!ownerCoordsLoading && !ownerCoords && sitCity && (
                <p className="text-xs text-destructive">
                  Impossible de localiser « {sitCity} ». Réessayez ou utilisez le mode département.
                </p>
              )}
            </div>
          )}

          <div className="flex items-center justify-between gap-3 flex-wrap">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5">
                  <SlidersHorizontal className="h-3.5 w-3.5" />
                  Filtres avancés
                  {activeAdvancedFilters > 0 && (
                    <Badge className="ml-1 h-5 min-w-5 px-1.5 text-[10px] bg-primary text-primary-foreground">
                      {activeAdvancedFilters}
                    </Badge>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-4 space-y-4" align="start">
                {/* Animaux acceptés */}
                <div>
                  <Label className="text-xs font-medium flex items-center gap-1.5 mb-2">
                    <PawPrint className="h-3.5 w-3.5" /> Animaux acceptés
                  </Label>
                  <div className="flex flex-wrap gap-1.5">
                    {ANIMAL_OPTIONS.map((a) => {
                      const active = animals.includes(a.value);
                      return (
                        <button
                          key={a.value}
                          type="button"
                          onClick={() => toggleAnimal(a.value)}
                          className={
                            active
                              ? "bg-primary text-primary-foreground rounded-full px-2.5 py-1 text-xs"
                              : "border border-border rounded-full px-2.5 py-1 text-xs text-muted-foreground hover:border-primary"
                          }
                        >
                          {a.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Expérience minimum */}
                <div>
                  <Label className="text-xs font-medium flex items-center gap-1.5 mb-2">
                    <GraduationCap className="h-3.5 w-3.5" /> Expérience minimum
                  </Label>
                  <div className="flex flex-wrap gap-1.5">
                    {EXPERIENCE_OPTIONS.map((e) => {
                      const active = minExperience === e.value;
                      return (
                        <button
                          key={e.value}
                          type="button"
                          onClick={() => setMinExperience(e.value)}
                          className={
                            active
                              ? "bg-primary text-primary-foreground rounded-full px-2.5 py-1 text-xs"
                              : "border border-border rounded-full px-2.5 py-1 text-xs text-muted-foreground hover:border-primary"
                          }
                        >
                          {e.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Vérifié */}
                <div className="flex items-center justify-between gap-3">
                  <Label htmlFor="invite-verified" className="text-xs font-medium flex items-center gap-1.5 cursor-pointer">
                    <ShieldCheck className="h-3.5 w-3.5" /> Identité vérifiée seulement
                  </Label>
                  <Switch
                    id="invite-verified"
                    checked={verifiedOnly}
                    onCheckedChange={setVerifiedOnly}
                  />
                </div>

                {/* Avec photo */}
                <div className="flex items-center justify-between gap-3">
                  <Label htmlFor="invite-photo" className="text-xs font-medium flex items-center gap-1.5 cursor-pointer">
                    <ImageIcon className="h-3.5 w-3.5" /> Avec photo de profil
                  </Label>
                  <Switch
                    id="invite-photo"
                    checked={withPhotoOnly}
                    onCheckedChange={setWithPhotoOnly}
                  />
                </div>

                {activeAdvancedFilters > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full text-xs text-muted-foreground"
                    onClick={resetAdvanced}
                  >
                    <X className="h-3.5 w-3.5 mr-1" /> Réinitialiser les filtres
                  </Button>
                )}
              </PopoverContent>
            </Popover>

            <Link to="/recherche">
              <Button variant="ghost" size="sm" className="gap-1.5 text-xs text-muted-foreground hover:text-primary">
                Voir aussi sur la carte <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>

          {/* Chips de filtres actifs */}
          {activeAdvancedFilters > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              {animals.map((a) => {
                const opt = ANIMAL_OPTIONS.find((o) => o.value === a);
                return (
                  <Badge key={a} variant="secondary" className="gap-1 pr-1">
                    {opt?.label}
                    <button
                      type="button"
                      onClick={() => toggleAnimal(a)}
                      className="hover:text-destructive"
                      aria-label={`Retirer ${opt?.label}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                );
              })}
              {minExperience > 0 && (
                <Badge variant="secondary" className="gap-1 pr-1">
                  {EXPERIENCE_OPTIONS.find((e) => e.value === minExperience)?.label}
                  <button type="button" onClick={() => setMinExperience(0)} className="hover:text-destructive" aria-label="Retirer expérience">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              {verifiedOnly && (
                <Badge variant="secondary" className="gap-1 pr-1">
                  Vérifié
                  <button type="button" onClick={() => setVerifiedOnly(false)} className="hover:text-destructive" aria-label="Retirer vérifié">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              {withPhotoOnly && (
                <Badge variant="secondary" className="gap-1 pr-1">
                  Avec photo
                  <button type="button" onClick={() => setWithPhotoOnly(false)} className="hover:text-destructive" aria-label="Retirer photo">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
            </div>
          )}

          {!hasSearchCriteria ? (
            <div className="rounded-xl border border-dashed border-border bg-card p-6 text-center">
              <Search className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                Tapez au moins 2 caractères, sélectionnez un département ou activez le rayon depuis votre ville.
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Astuce : choisir le département de votre logement permet d'inviter les gardiens du coin.
              </p>
            </div>
          ) : searching ? (
            <p className="text-sm text-muted-foreground py-4">Recherche en cours…</p>
          ) : searchResults.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-card p-6 text-center">
              <Search className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                Aucun gardien trouvé avec ces critères.
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Essayez un autre département, élargissez la recherche, ou utilisez la recherche avancée.
              </p>
              <Link to="/recherche" className="inline-block mt-3">
                <Button variant="outline" size="sm">
                  Recherche avancée <ArrowRight className="h-3.5 w-3.5 ml-1" />
                </Button>
              </Link>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-2">{searchResults.map(renderCard)}</div>
          )}
        </TabsContent>
      </Tabs>

      <InviteSitterDialog
        open={!!inviteTarget}
        onOpenChange={(o) => !o && setInviteTarget(null)}
        sitter={inviteTarget}
        sitId={sitId}
        ownerId={ownerId}
        sitTitle={sitTitle}
        sitCity={sitCity}
        startDate={startDate}
        endDate={endDate}
      />

      <PostPublishRecapDialog
        open={recapOpen}
        onOpenChange={setRecapOpen}
        ownerId={ownerId}
        ownerPostalCode={ownerPostalCode}
        onInviteFavorites={() => {
          setActiveTab("favorites");
          requestAnimationFrame(() => {
            document.getElementById("invite-sitters-block")?.scrollIntoView({ behavior: "smooth", block: "start" });
          });
        }}
        onTargetDepartment={(code) => {
          setActiveTab("search");
          setDeptCode(code);
          requestAnimationFrame(() => {
            document.getElementById("invite-sitters-block")?.scrollIntoView({ behavior: "smooth", block: "start" });
          });
        }}
      />

      {ownerCoords && (
        <BulkInviteNearestDialog
          open={bulkOpen}
          onOpenChange={setBulkOpen}
          sitId={sitId}
          ownerId={ownerId}
          sitTitle={sitTitle}
          sitCity={sitCity}
          startDate={startDate}
          endDate={endDate}
          ownerCoords={ownerCoords}
          alreadyInvitedIds={alreadyInvitedIds}
          remainingQuota={remainingQuota}
        />
      )}
    </section>
  );
};

export default InviteSittersBlock;
