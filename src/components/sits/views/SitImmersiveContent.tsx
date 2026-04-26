/**
 * Contenu immersif d'une fiche annonce — adapté de DemoSitDetail pour
 * fonctionner avec les vraies entités (sit, owner, property, pets, ownerProfile).
 *
 * Sections rendues (toutes facultatives, masquées si données absentes) :
 *  - Hero photos + titre + ville
 *  - Quick facts (dates, logement, animaux, environnement)
 *  - Le cadre (description + property.description + équipements)
 *  - Vos pensionnaires (animaux + BreedProfileCard AI)
 *  - Une journée type (sit.daily_routine, formaté en blocs Matin/Midi/Soir si parsable)
 *  - Un mot de l'hôte (sit.owner_message)
 *  - Sidebar : profil hôte, CTA (slot via prop), guide local, page ville, réassurance
 */
import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  Calendar,
  MapPin,
  Home,
  PawPrint,
  ShieldCheck,
  Sun,
  Sunset,
  Moon,
  Heart,
  Wifi,
  Trees,
  Bike,
  Coffee,
  WashingMachine,
  Mountain,
  Waves,
  Flame,
  Building2,
  ChevronRight,
  ArrowRight,
  BookOpen,
  Info,
} from "lucide-react";
import VerifiedBadge from "@/components/profile/VerifiedBadge";
import BreedProfileCard from "@/components/breeds/BreedProfileCard";
import LocationProfileCard from "@/components/location/LocationProfileCard";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Pill,
  Utensils,
  AlertTriangle,
  Activity,
  Footprints,
  Clock,
} from "lucide-react";
import { slugify } from "@/lib/normalize";
import { CITIES } from "@/data/cities";
import { getCityContent } from "@/data/cityContent";

const GUIDE_SLUGS = new Set(CITIES.map((c) => c.slug));

const SPECIES_EMOJI: Record<string, string> = {
  dog: "🐕", cat: "🐈", farm_animal: "🐔", rabbit: "🐰", bird: "🦜",
  fish: "🐠", rodent: "🐹", horse: "🐴", nac: "🦎", reptile: "🦎",
};

const ENV_META: Record<string, { label: string; icon: any }> = {
  city: { label: "Ville", icon: Building2 },
  city_center: { label: "Centre-ville", icon: Building2 },
  countryside: { label: "Campagne", icon: Trees },
  mountain: { label: "Montagne", icon: Mountain },
  lake: { label: "Lac", icon: Waves },
  garden: { label: "Jardin", icon: Trees },
  seaside: { label: "Bord de mer", icon: Waves },
  forest: { label: "Forêt", icon: Trees },
  suburban: { label: "Périurbain", icon: Building2 },
};

const AMENITY_META: Record<string, { label: string; icon: any }> = {
  wifi: { label: "Wifi", icon: Wifi },
  garden: { label: "Jardin", icon: Trees },
  washing_machine: { label: "Lave-linge", icon: WashingMachine },
  bikes: { label: "Vélos", icon: Bike },
  coffee_machine: { label: "Machine à café", icon: Coffee },
  lake_view: { label: "Vue lac", icon: Waves },
  wood_stove: { label: "Poêle à bois", icon: Flame },
  kayak: { label: "Kayak", icon: Waves },
  balcony: { label: "Balcon", icon: Sun },
  dishwasher: { label: "Lave-vaisselle", icon: WashingMachine },
  elevator: { label: "Ascenseur", icon: Building2 },
};

interface SitImmersiveContentProps {
  sit: any;
  owner: any;
  property: any;
  pets: any[];
  ownerProfile: any;
  /** Slot principal de droite (ex : bloc candidature côté gardien, gestion côté propriétaire). */
  ctaSlot?: React.ReactNode;
  /** Ajout sous le quick-facts (ex : badges de matching côté gardien). */
  topSlot?: React.ReactNode;
}

const formatDate = (d: string | null) =>
  d ? format(new Date(d), "d MMMM yyyy", { locale: fr }) : "";

/**
 * Tente de découper la routine en blocs Matin / Midi / Après-midi / Soir / Nuit.
 * Gère :
 *  - retours à la ligne, séparateurs ` / `, `•`, `|`, ` — ` entre blocs
 *  - puces en début de ligne (`-`, `*`, `•`, `–`, `—`, `→`)
 *  - séparateurs label/texte variés (`—`, `–`, `-`, `:`, ` ` simple)
 *  - casse et accents (Matin, MATIN, après-midi, Aprem, Après midi…)
 *  - format partiel (un seul moment renseigné) → on accepte 1 bloc minimum
 *  - texte libre sans label → on retourne null pour fallback whitespace-pre-line
 */
/**
 * Normalise les espaces "exotiques" (NBSP, narrow NBSP, zero-width, tabulations)
 * en simples espaces ASCII pour fiabiliser la suite du parsing.
 */
const normalizeWhitespace = (s: string) =>
  s
    .replace(/[\u00A0\u202F\u2007\u2009\u200A\u200B\u200C\u200D\uFEFF]/g, " ")
    .replace(/\t/g, " ");

const stripBullet = (s: string) =>
  s
    // puces classiques + emojis "moment de la journée" en début de ligne
    .replace(/^\s*(?:[-*•–—→▪►●·★☆▶▷▸▹»>]+|[\u{1F300}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u2600-\u27BF])+\s*/u, "")
    // numérotation : "1)", "1.", "1/", "1 -", "1°", "1 :"
    .replace(/^\s*\d+\s*[)°.\-/:]\s*/, "")
    // décorations markdown autour : **Matin**, *Matin*, _Matin_, `Matin`
    .replace(/^[\s*_`~]+/, "")
    .replace(/[\s*_`~]+$/, "")
    .trim();

const normalizeLabel = (k: string): "Matin" | "Midi" | "Après-midi" | "Soir" | "Nuit" => {
  const low = k
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    // retire toute décoration résiduelle (guillemets, ponctuation, espaces internes)
    .replace(/[^a-z]/g, "");
  if (low.startsWith("matin")) return "Matin";
  if (low.startsWith("midi")) return "Midi";
  if (low.startsWith("apres") || low.startsWith("aprem")) return "Après-midi";
  if (low.startsWith("nuit")) return "Nuit";
  return "Soir";
};

/**
 * Nettoie un texte libre multi-lignes :
 *  - trim global
 *  - normalise les espaces multiples sur chaque ligne
 *  - supprime la ponctuation finale répétée (« .. », « ;; », « ,. » → rien)
 *  - réduit les retours à la ligne consécutifs (max 1 ligne vide entre paragraphes)
 *  - supprime les puces résiduelles en début de ligne
 */
export const cleanFreeText = (raw: string): string => {
  return raw
    .trim()
    .split(/\r?\n/)
    .map((line) =>
      stripBullet(line)
        .replace(/[ \t]+/g, " ")
        .trim()
        .replace(/[.;,\s]+$/u, ""),
    )
    .filter((line, idx, arr) => {
      // garde la ligne si non-vide, ou si c'est une ligne vide qui sépare deux paragraphes (pas en début/fin, pas doublée)
      if (line.length > 0) return true;
      if (idx === 0 || idx === arr.length - 1) return false;
      return arr[idx - 1].length > 0;
    })
    .join("\n");
};

export const parseRoutine = (raw: string | null) => {
  if (!raw) return null;
  // Étape 0 : neutralise les espaces exotiques (NBSP, narrow NBSP, ZWSP, tabulations)
  const cleaned = normalizeWhitespace(raw);

  // Étape 1 : éclate sur retours à la ligne ET sur séparateurs inline
  // tolère espaces optionnels autour de • | / et tirets longs — –
  // ainsi qu'une numérotation explicite "  2) ", "  3. " etc.
  const segments = cleaned
    .split(/\r?\n+|\s*[•|]\s*|\s+\/\s+|\s+[—–]\s+(?=(?:matin|midi|soir|nuit|apr|aprem|apr[èeé]m)\b)|\s*[,;]\s+(?=(?:matin|midi|soir|nuit|apr|aprem|apr[èeé]m)\b)|\s+(?=\d+\s*[)°.\-/:]\s*(?:matin|midi|soir|nuit|apr|aprem|apr[èeé]m)\b)/i)
    .map((l) => stripBullet(l))
    .filter(Boolean);

  // Regex tolérante :
  //  - décorations optionnelles autour du label : « » " ' ( [ { * _ ` ~
  //  - label optionnellement entre parenthèses : (Matin) ou Matin
  //  - suivi d'une indication horaire optionnelle, entre () [] ou {} :
  //      (8h), (vers 8h), [8h], [7h-9h], {matinée}…
  //    → on autorise plusieurs blocs successifs (ex: "Matin (7h) [balade] :")
  //  - séparateurs label/texte tolérés : — – - : . ) → = » et tout ça avec
  //    espaces multiples (déjà normalisés) ou collés
  const re =
    /^[\s«»"'(\[\{*_`~]*\s*(matin|midi|soir|nuit|apr[èeé]s?[- ]?midi|apr[èeé]m(?:[- ]?midi)?|aprem(?:[- ]?midi)?)\s*[»"'\]\)\}*_`~]*\s*(?:(?:\([^)]*\)|\[[^\]]*\]|\{[^}]*\})\s*)*[—–\-:.\)=→»]?\s*(.*)$/i;

  const blocks: { key: string; label: string; text: string }[] = [];
  const leftover: string[] = [];

  for (const seg of segments) {
    const m = seg.match(re);
    if (m && m[2] && m[2].trim().length > 0) {
      const label = normalizeLabel(m[1]);
      blocks.push({ key: label.toLowerCase(), label, text: m[2].trim().replace(/[.;,]+$/, "") });
    } else if (m && (!m[2] || m[2].trim().length === 0)) {
      // label seul (ex: "Matin :") — on ignore mais on ne casse pas le parsing
      continue;
    } else {
      leftover.push(seg);
    }
  }

  if (blocks.length === 0) return null;

  // Tri logique Matin → Midi → Après-midi → Soir → Nuit
  const order = ["matin", "midi", "après-midi", "soir", "nuit"];
  blocks.sort((a, b) => order.indexOf(a.key) - order.indexOf(b.key));

  return { blocks, notes: leftover.join(" ").trim() };
};

const ROUTINE_ICONS: Record<string, { icon: any; bg: string; fg: string }> = {
  Matin: { icon: Sun, bg: "bg-amber-100", fg: "text-amber-700" },
  Midi: { icon: Sun, bg: "bg-orange-100", fg: "text-orange-700" },
  "Après-midi": { icon: Sunset, bg: "bg-sky-100", fg: "text-sky-700" },
  Soir: { icon: Moon, bg: "bg-indigo-100", fg: "text-indigo-700" },
  Nuit: { icon: Moon, bg: "bg-slate-100", fg: "text-slate-700" },
};

const ACTIVITY_LEVEL_LABEL: Record<string, string> = {
  low: "Calme",
  moderate: "Modéré",
  high: "Très actif",
};
const WALK_DURATION_LABEL: Record<string, string> = {
  short: "Courte (15–30 min)",
  medium: "Moyenne (30–60 min)",
  long: "Longue (1 h ou +)",
  none: "Pas de balade",
};
const ALONE_DURATION_LABEL: Record<string, string> = {
  none: "Jamais seul",
  short: "1 à 2 h",
  medium: "3 à 5 h",
  long: "Une journée",
};

const SitImmersiveContent = ({
  sit,
  owner,
  property,
  pets,
  ownerProfile,
  ctaSlot,
  topSlot,
}: SitImmersiveContentProps) => {
  // Onglet actif (contrôlé pour permettre la navigation depuis le résumé "Garde")
  const [activeTab, setActiveTab] = useState<"garde" | "animaux" | "logement" | "attentes">(
    "garde",
  );

  // -- Photos / hero
  const photos: string[] = Array.isArray(property?.photos)
    ? property.photos.filter((p: any) => typeof p === "string" && p.trim().length > 0)
    : [];
  const coverPhoto = photos[0] || null;
  

  // -- Hôte / localisation
  const ownerName = owner?.first_name || "L'hôte";
  const cityName = owner?.city || "";
  const citySlug = cityName ? slugify(cityName) : null;
  const department: string | undefined =
    owner?.department || (owner?.postal_code ? String(owner.postal_code).slice(0, 2) : undefined);

  // -- Environnement & équipements (filtrés)
  const environments: string[] = (
    sit?.environments?.length ? sit.environments : ownerProfile?.environments || []
  ).filter(Boolean);
  const amenities: string[] = ((property?.equipments || property?.amenities) ?? []).filter(Boolean);

  // -- Durée
  const durationDays =
    sit?.start_date && sit?.end_date
      ? Math.max(
          1,
          Math.round(
            (new Date(sit.end_date).getTime() - new Date(sit.start_date).getTime()) /
              86400000,
          ),
        )
      : null;

  // -- Animaux (sécurisé)
  const safePets = Array.isArray(pets) ? pets.filter(Boolean) : [];
  const speciesEmojis = safePets.map((p) => SPECIES_EMOJI[p.species] || "🐾");

  // -- Routine
  const routine = parseRoutine(sit?.daily_routine || null);
  const hasRoutine = Boolean(
    routine || (typeof sit?.daily_routine === "string" && sit.daily_routine.trim().length > 0),
  );

  // -- Mot de l'hôte
  const ownerMessage =
    typeof sit?.owner_message === "string" ? sit.owner_message.trim() : "";
  const hasOwnerMessage = ownerMessage.length > 0;

  // -- Sections "Le cadre" : visible uniquement si au moins une donnée existe
  const expectations =
    typeof sit?.specific_expectations === "string" ? sit.specific_expectations.trim() : "";
  const propertyDescription =
    typeof property?.description === "string" ? property.description.trim() : "";
  const hasFrame = Boolean(expectations || propertyDescription || amenities.length > 0);

  // -- Bio hôte (sidebar)
  const ownerBio = (owner?.bio || ownerProfile?.welcome_notes || "").toString().trim();
  const hasOwnerCard = Boolean(owner && (ownerName || cityName || ownerBio));

  // -- Guide local : vérification dynamique en base (auto-mise à jour quand un guide est publié)
  const { data: dbGuide } = useQuery({
    queryKey: ["city-guide-by-slug", citySlug],
    enabled: !!citySlug,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      if (!citySlug) return null;
      const { data } = await supabase
        .from("city_guides" as any)
        .select("id, slug, published")
        .eq("slug", citySlug)
        .eq("published", true)
        .maybeSingle();
      return data as any;
    },
  });
  // Soit un guide éditorial statique (CITIES), soit un guide DB publié
  const hasLocalGuide = Boolean(citySlug && (GUIDE_SLUGS.has(citySlug) || dbGuide));
  // Encart "Guide en préparation" : ville renseignée mais pas encore de guide
  const showGuideComingSoon = Boolean(citySlug && cityName && !hasLocalGuide);
  // -- Page ville (silo SEO) : seulement si du contenu éditorial existe
  const hasCityPage = Boolean(citySlug && getCityContent(citySlug));

  // -- Comptage gardiens : ville d'abord, département en repli si < 20 résultats
  const ownerPostalCode: string | undefined = owner?.postal_code
    ? String(owner.postal_code)
    : undefined;
  const deptCode = ownerPostalCode ? ownerPostalCode.slice(0, 2) : undefined;
  const CITY_THRESHOLD = 20;

  const { data: sittersScope } = useQuery({
    queryKey: ["sitters-scope", cityName, deptCode],
    enabled: !!cityName,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      // 1. Compte ville
      const { data: cityRows } = await supabase
        .from("profiles")
        .select("id, sitter_profiles!inner(user_id)")
        .ilike("city", cityName)
        .limit(50);
      const cityCount = cityRows?.length ?? 0;

      if (cityCount >= CITY_THRESHOLD || !deptCode) {
        return { mode: "city" as const, count: cityCount };
      }

      // 2. Repli département (CP commençant par dept)
      const { data: deptRows } = await supabase
        .from("profiles")
        .select("id, postal_code, sitter_profiles!inner(user_id)")
        .like("postal_code", `${deptCode}%`)
        .limit(50);
      const deptCount = deptRows?.length ?? 0;

      return {
        mode: "dept" as const,
        count: deptCount,
        cityCount,
      };
    },
  });

  const sittersLink = (() => {
    if (!sittersScope || !cityName) return null;
    const params = new URLSearchParams();
    params.set("city", cityName);
    if (ownerPostalCode) params.set("postal_code", ownerPostalCode);
    if (sittersScope.mode === "dept" && deptCode) {
      params.set("zone", "dept");
      params.set("dept", deptCode);
    } else {
      params.set("zone", "city");
    }
    return `/search?${params.toString()}`;
  })();

  const showSittersLink = Boolean(sittersLink && sittersScope && sittersScope.count > 0);


  return (
    <div>
      {/* Hero */}
      {coverPhoto && (
        <div className="rounded-3xl overflow-hidden border border-border bg-card mb-6">
          <div className="relative">
            <img
              src={coverPhoto}
              alt={sit?.title || "Photo de l'annonce"}
              className="w-full h-[280px] md:h-[420px] object-cover"
            />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-5 md:p-8">
              {(cityName || department) && (
                <div className="flex items-center gap-2 mb-2 text-white/90 text-sm">
                  <MapPin className="h-4 w-4" />
                  <span>
                    {cityName}
                    {department ? ` · ${department}` : ""}
                  </span>
                </div>
              )}
              {sit?.title && (
                <h1 className="text-2xl md:text-4xl font-bold text-white leading-tight max-w-3xl">
                  {sit.title}
                </h1>
              )}
            </div>
          </div>

          {photos.length > 1 && (
            <div className="grid grid-cols-2 gap-1 p-1">
              {photos.slice(1, 3).map((p, i) => (
                <img key={i} src={p} alt="" className="w-full h-32 md:h-44 object-cover" />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Quick facts — chaque carte s'affiche uniquement si la donnée existe */}
      {(() => {
        const cards: React.ReactNode[] = [];
        if (sit?.start_date || sit?.end_date) {
          cards.push(
            <div key="dates" className="rounded-2xl border border-border bg-card p-4">
              <Calendar className="h-5 w-5 text-primary mb-2" />
              <p className="text-xs text-muted-foreground">Dates</p>
              {sit?.start_date && (
                <p className="text-sm font-medium">{formatDate(sit.start_date)}</p>
              )}
              {sit?.end_date && (
                <p className="text-sm font-medium">→ {formatDate(sit.end_date)}</p>
              )}
              {durationDays && (
                <p className="text-xs text-muted-foreground mt-1">{durationDays} jours</p>
              )}
            </div>,
          );
        }
        if (property?.type || property?.surface_m2 || property?.rooms_count) {
          cards.push(
            <div key="housing" className="rounded-2xl border border-border bg-card p-4">
              <Home className="h-5 w-5 text-primary mb-2" />
              <p className="text-xs text-muted-foreground">Logement</p>
              {property?.type && (
                <p className="text-sm font-medium capitalize">
                  {property.type === "house"
                    ? "Maison"
                    : property.type === "apartment"
                      ? "Appartement"
                      : property.type}
                </p>
              )}
              {(property?.surface_m2 || property?.rooms_count) && (
                <p className="text-xs text-muted-foreground">
                  {[
                    property?.surface_m2 && `${property.surface_m2} m²`,
                    property?.rooms_count && `${property.rooms_count} pièces`,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              )}
            </div>,
          );
        }
        if (safePets.length > 0) {
          cards.push(
            <div key="pets" className="rounded-2xl border border-border bg-card p-4">
              <PawPrint className="h-5 w-5 text-primary mb-2" />
              <p className="text-xs text-muted-foreground">Animaux</p>
              <p className="text-sm font-medium">
                {safePets.length} pensionnaire{safePets.length > 1 ? "s" : ""}
              </p>
              {speciesEmojis.length > 0 && (
                <p className="text-xs text-muted-foreground">{speciesEmojis.join(" ")}</p>
              )}
            </div>,
          );
        }
        const knownEnvironments = environments.filter((e) => ENV_META[e]);
        if (knownEnvironments.length > 0) {
          cards.push(
            <div key="frame" className="rounded-2xl border border-border bg-card p-4">
              <Trees className="h-5 w-5 text-primary mb-2" />
              <p className="text-xs text-muted-foreground">Cadre</p>
              <div className="flex flex-wrap gap-1 mt-1">
                {knownEnvironments.map((e) => {
                  const meta = ENV_META[e]!;
                  const Ico = meta.icon;
                  return (
                    <span
                      key={e}
                      className="inline-flex items-center gap-1 text-xs bg-muted rounded-full px-2 py-0.5"
                    >
                      <Ico className="h-3 w-3" /> {meta.label}
                    </span>
                  );
                })}
              </div>
            </div>,
          );
        }
        if (cards.length === 0) return null;
        // Grille adaptative : 1, 2, 3 ou 4 colonnes max selon le nombre de cartes
        const cols =
          cards.length === 1
            ? "grid-cols-1"
            : cards.length === 2
              ? "grid-cols-2"
              : cards.length === 3
                ? "grid-cols-2 md:grid-cols-3"
                : "grid-cols-2 md:grid-cols-4";
        return <div className={`grid ${cols} gap-3 mb-6`}>{cards}</div>;
      })()}

      {topSlot}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Colonne principale */}
        <div className="lg:col-span-2 space-y-6">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)} className="w-full">
            <TabsList className="w-full grid grid-cols-2 md:grid-cols-4 h-auto p-1 bg-muted/50 rounded-xl mb-6 sticky top-2 z-10 backdrop-blur supports-[backdrop-filter]:bg-muted/70">
              <TabsTrigger value="garde" className="text-xs md:text-sm py-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                <Heart className="h-3.5 w-3.5 mr-1.5 hidden md:inline" />
                La garde
              </TabsTrigger>
              <TabsTrigger value="animaux" className="text-xs md:text-sm py-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                <PawPrint className="h-3.5 w-3.5 mr-1.5 hidden md:inline" />
                Animaux{safePets.length > 0 ? ` (${safePets.length})` : ""}
              </TabsTrigger>
              <TabsTrigger value="logement" className="text-xs md:text-sm py-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                <Home className="h-3.5 w-3.5 mr-1.5 hidden md:inline" />
                Logement & quartier
              </TabsTrigger>
              <TabsTrigger value="attentes" className="text-xs md:text-sm py-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                <ShieldCheck className="h-3.5 w-3.5 mr-1.5 hidden md:inline" />
                Attentes
              </TabsTrigger>
            </TabsList>

            {/* ========== ONGLET GARDE ========== */}
            <TabsContent value="garde" className="space-y-6 mt-0">
              {/* Mot du proprio — visible uniquement si owner_message non vide */}
              {hasOwnerMessage && (
                <section className="rounded-2xl border-2 border-primary/20 bg-primary/5 p-5 md:p-6">
                  <div className="flex items-center gap-2 mb-3">
                    <Heart className="h-4 w-4 text-primary" />
                    <h2 className="text-base font-semibold">Un mot de {ownerName}</h2>
                  </div>
                  <p className="text-sm text-foreground/90 leading-relaxed italic whitespace-pre-line">
                    « {ownerMessage} »
                  </p>
                </section>
              )}

              {/* Journée type */}
              {hasRoutine && (
                <section className="rounded-2xl border border-border bg-card p-5 md:p-6">
                  <h2 className="text-lg font-semibold mb-4">Une journée type</h2>
                  {routine ? (
                    <div className="space-y-4">
                      {routine.blocks.map((b, i) => {
                        const meta = ROUTINE_ICONS[b.label] || ROUTINE_ICONS.Matin;
                        const Ico = meta.icon;
                        return (
                          <div key={i} className="flex gap-3">
                            <div
                              className={`shrink-0 w-9 h-9 rounded-full flex items-center justify-center ${meta.bg} ${meta.fg}`}
                            >
                              <Ico className="h-4 w-4" />
                            </div>
                            <div>
                              <p className="text-sm font-medium">{b.label}</p>
                              <p className="text-sm text-muted-foreground">{b.text}</p>
                            </div>
                          </div>
                        );
                      })}
                      {routine.notes && (
                        <p className="text-xs text-muted-foreground italic pt-2 border-t border-border">
                          {routine.notes}
                        </p>
                      )}
                    </div>
                  ) : (
                    (() => {
                      const isEn =
                        typeof navigator !== "undefined" &&
                        !!navigator.language?.toLowerCase().startsWith("en");
                      const chipLabel = isEn ? "Free format" : "Format libre";
                      const chipTooltip = isEn
                        ? "The text could not be structured into Morning / Noon / Evening blocks. Encourage the owner to prefix each line with a time of day."
                        : "Le texte n'a pas pu être structuré en blocs Matin / Midi / Soir. Encouragez le propriétaire à préfixer chaque ligne par un moment de la journée.";
                      return (
                        <div className="space-y-2" data-testid="routine-fallback-freetext">
                          <span
                            className="inline-flex items-center gap-1 rounded-full bg-muted/60 text-muted-foreground text-[11px] px-2 py-0.5 border border-border"
                            title={chipTooltip}
                            aria-label={chipLabel}
                          >
                            <Info className="h-3 w-3" />
                            {chipLabel}
                          </span>
                          <p className="text-sm text-foreground whitespace-pre-line leading-relaxed">
                            {cleanFreeText(sit.daily_routine)}
                          </p>
                        </div>
                      );
                    })()
                  )}
                </section>
              )}

              {!hasOwnerMessage && !hasRoutine && (
                <p className="text-sm text-muted-foreground italic text-center py-8">
                  {ownerName} n'a pas encore détaillé le déroulé de la garde.
                </p>
              )}
            </TabsContent>

            {/* ========== ONGLET ANIMAUX ========== */}
            <TabsContent value="animaux" className="space-y-5 mt-0">
              {safePets.length > 0 ? (
                safePets.map((pet, i) => {
                  const hasMedication =
                    typeof pet.medication === "string" &&
                    pet.medication.trim().length > 0 &&
                    !/^aucune?$|^non$|^rien$/i.test(pet.medication.trim());
                  const hasFood = typeof pet.food === "string" && pet.food.trim().length > 0;
                  const hasSpecialNeeds =
                    typeof pet.special_needs === "string" && pet.special_needs.trim().length > 0;
                  const hasCharacter =
                    typeof pet.character === "string" && pet.character.trim().length > 0;
                  const activityLabel = pet.activity_level
                    ? ACTIVITY_LEVEL_LABEL[pet.activity_level]
                    : null;
                  const walkLabel = pet.walk_duration
                    ? WALK_DURATION_LABEL[pet.walk_duration]
                    : null;
                  const aloneLabel = pet.alone_duration
                    ? ALONE_DURATION_LABEL[pet.alone_duration]
                    : null;

                  return (
                    <section
                      key={pet.id || i}
                      className="rounded-2xl border border-border bg-card p-5 md:p-6"
                    >
                      <div className="flex gap-4 mb-4">
                        {/* Photo */}
                        <div className="shrink-0">
                          {pet.photo_url ? (
                            <img
                              src={pet.photo_url}
                              alt={pet.name || "Animal"}
                              loading="lazy"
                              className="w-24 h-24 md:w-28 md:h-28 rounded-xl object-cover border border-border"
                            />
                          ) : (
                            <div className="w-24 h-24 md:w-28 md:h-28 rounded-xl bg-muted border border-border flex items-center justify-center text-4xl">
                              {SPECIES_EMOJI[pet.species] || "🐾"}
                            </div>
                          )}
                        </div>

                        {/* En-tête */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline gap-2 flex-wrap mb-1">
                            <span className="text-xl">{SPECIES_EMOJI[pet.species] || "🐾"}</span>
                            {pet.name && (
                              <h3 className="text-lg font-semibold text-foreground">{pet.name}</h3>
                            )}
                            {pet.breed && (
                              <span className="text-sm text-muted-foreground">· {pet.breed}</span>
                            )}
                            {pet.age && (
                              <span className="text-xs text-muted-foreground">· {pet.age}</span>
                            )}
                          </div>
                          {hasCharacter && (
                            <p className="text-sm text-muted-foreground leading-relaxed">
                              {pet.character}
                            </p>
                          )}
                          {pet.owner_breed_note && (
                            <p className="text-sm text-foreground/90 leading-relaxed mt-1">
                              <span className="font-medium">Selon {ownerName} :</span>{" "}
                              <span className="italic text-muted-foreground">
                                {pet.owner_breed_note}
                              </span>
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Médication — alerte mise en avant */}
                      {hasMedication && (
                        <div className="rounded-xl border-2 border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-700/50 p-3 md:p-4 mb-3 flex gap-3">
                          <Pill className="h-5 w-5 text-amber-700 dark:text-amber-300 shrink-0 mt-0.5" />
                          <div className="min-w-0">
                            <p className="text-xs font-semibold uppercase tracking-wide text-amber-800 dark:text-amber-200 mb-1">
                              Médication à administrer
                            </p>
                            <p className="text-sm text-amber-900 dark:text-amber-100 whitespace-pre-line leading-relaxed">
                              {pet.medication}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Besoins spéciaux */}
                      {hasSpecialNeeds && (
                        <div className="rounded-xl border border-border bg-muted/40 p-3 md:p-4 mb-3 flex gap-3">
                          <AlertTriangle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                          <div className="min-w-0">
                            <p className="text-xs font-semibold uppercase tracking-wide text-foreground mb-1">
                              Besoins spéciaux
                            </p>
                            <p className="text-sm text-foreground/90 whitespace-pre-line leading-relaxed">
                              {pet.special_needs}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Alimentation */}
                      {hasFood && (
                        <div className="rounded-xl border border-border bg-card p-3 md:p-4 mb-3 flex gap-3">
                          <Utensils className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                          <div className="min-w-0">
                            <p className="text-xs font-semibold uppercase tracking-wide text-foreground mb-1">
                              Alimentation
                            </p>
                            <p className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">
                              {pet.food}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Quotidien : activité, balade, solitude */}
                      {(activityLabel || walkLabel || aloneLabel) && (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-3">
                          {activityLabel && (
                            <div className="rounded-lg bg-muted/40 p-3 flex items-start gap-2">
                              <Activity className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                              <div>
                                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                                  Activité
                                </p>
                                <p className="text-sm font-medium">{activityLabel}</p>
                              </div>
                            </div>
                          )}
                          {walkLabel && (
                            <div className="rounded-lg bg-muted/40 p-3 flex items-start gap-2">
                              <Footprints className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                              <div>
                                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                                  Balade
                                </p>
                                <p className="text-sm font-medium">{walkLabel}</p>
                              </div>
                            </div>
                          )}
                          {aloneLabel && (
                            <div className="rounded-lg bg-muted/40 p-3 flex items-start gap-2">
                              <Clock className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                              <div>
                                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                                  Solitude tolérée
                                </p>
                                <p className="text-sm font-medium">{aloneLabel}</p>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Fiche de race repliée */}
                      {pet.breed && (
                        <Accordion type="single" collapsible className="mt-2">
                          <AccordionItem
                            value={`breed-${pet.id || i}`}
                            className="border border-border rounded-lg bg-accent/20 px-3"
                          >
                            <AccordionTrigger className="py-2.5 text-sm font-medium hover:no-underline">
                              <span className="flex items-center gap-2">
                                <Info className="h-4 w-4 text-primary" />
                                Voir la fiche race — {pet.breed}
                              </span>
                            </AccordionTrigger>
                            <AccordionContent className="pb-3">
                              <BreedProfileCard
                                species={pet.species}
                                breed={pet.breed}
                                ownerFirstName={ownerName}
                              />
                            </AccordionContent>
                          </AccordionItem>
                        </Accordion>
                      )}
                    </section>
                  );
                })
              ) : (
                <p className="text-sm text-muted-foreground italic text-center py-8">
                  Aucun animal renseigné pour cette annonce.
                </p>
              )}
            </TabsContent>

            {/* ========== ONGLET LOGEMENT & QUARTIER ========== */}
            <TabsContent value="logement" className="space-y-6 mt-0">
              {/* Description du logement + équipements */}
              {(propertyDescription || amenities.length > 0) && (
                <section className="rounded-2xl border border-border bg-card p-5 md:p-6">
                  <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    <Home className="h-5 w-5 text-primary" /> Le logement
                  </h2>
                  {propertyDescription && (
                    <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                      {propertyDescription}
                    </p>
                  )}
                  {amenities.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-border">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">
                        Équipements disponibles
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {amenities.map((a) => {
                          const meta = AMENITY_META[a];
                          if (!meta) {
                            return (
                              <span
                                key={a}
                                className="inline-flex items-center gap-1.5 text-xs bg-accent text-accent-foreground rounded-full px-3 py-1"
                              >
                                {a}
                              </span>
                            );
                          }
                          const Ico = meta.icon;
                          return (
                            <span
                              key={a}
                              className="inline-flex items-center gap-1.5 text-xs bg-accent text-accent-foreground rounded-full px-3 py-1"
                            >
                              <Ico className="h-3.5 w-3.5" /> {meta.label}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </section>
              )}

              {/* Photos supplémentaires */}
              {photos.length > 3 && (
                <section className="rounded-2xl border border-border bg-card p-5 md:p-6">
                  <h2 className="text-lg font-semibold mb-3">Photos du logement</h2>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {photos.slice(3).map((p, i) => (
                      <img
                        key={i}
                        src={p}
                        alt={`Photo ${i + 4}`}
                        loading="lazy"
                        className="w-full h-32 md:h-40 object-cover rounded-lg border border-border"
                      />
                    ))}
                  </div>
                </section>
              )}

              {/* Profil quartier (LocationProfileCard) */}
              {cityName && ownerPostalCode && (
                <section className="rounded-2xl border border-border bg-card p-5 md:p-6">
                  <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-primary" /> Le quartier
                  </h2>
                  <LocationProfileCard city={cityName} postalCode={ownerPostalCode} />
                </section>
              )}

              {/* Lien guide local */}
              {hasLocalGuide && (
                <Link
                  to={`/guides/${citySlug}`}
                  className="block rounded-2xl border border-border bg-card p-5 hover:border-primary/50 transition-colors group"
                >
                  <div className="flex items-start gap-3">
                    <div className="shrink-0 w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                      <BookOpen className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground mb-0.5">
                        Guide local
                      </p>
                      <p className="font-semibold text-sm group-hover:text-primary transition-colors">
                        Découvrir {cityName}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                        Bonnes adresses, vétérinaires, parcs à chiens et spots à connaître.
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0 mt-2" />
                  </div>
                </Link>
              )}

              {!propertyDescription && amenities.length === 0 && photos.length <= 3 && !cityName && (
                <p className="text-sm text-muted-foreground italic text-center py-8">
                  Pas encore d'information sur le logement ou le quartier.
                </p>
              )}
            </TabsContent>

            {/* ========== ONGLET ATTENTES ========== */}
            <TabsContent value="attentes" className="space-y-6 mt-0">
              {expectations ? (
                <section className="rounded-2xl border border-border bg-card p-5 md:p-6">
                  <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5 text-primary" />
                    Ce que {ownerName} attend du gardien
                  </h2>
                  <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-line">
                    {expectations}
                  </p>
                </section>
              ) : (
                <p className="text-sm text-muted-foreground italic text-center py-8">
                  {ownerName} n'a pas formulé d'attentes spécifiques. N'hésitez pas à en discuter
                  ensemble.
                </p>
              )}

              {environments.filter((e) => ENV_META[e]).length > 0 && (
                <section className="rounded-2xl border border-border bg-card p-5 md:p-6">
                  <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    <Trees className="h-5 w-5 text-primary" /> Cadre de vie
                  </h2>
                  <div className="flex flex-wrap gap-2">
                    {environments
                      .filter((e) => ENV_META[e])
                      .map((e) => {
                        const meta = ENV_META[e]!;
                        const Ico = meta.icon;
                        return (
                          <span
                            key={e}
                            className="inline-flex items-center gap-1.5 text-sm bg-muted rounded-full px-3 py-1.5"
                          >
                            <Ico className="h-4 w-4" /> {meta.label}
                          </span>
                        );
                      })}
                  </div>
                </section>
              )}
            </TabsContent>
          </Tabs>
        </div>

        {/* Sidebar */}
        <aside className="space-y-4">
          {/* Profil hôte — visible si données suffisantes */}
          {hasOwnerCard && (
            <div className="rounded-2xl border border-border bg-card p-5">
              <p className="text-xs uppercase tracking-wide text-muted-foreground mb-3">
                Votre hôte
              </p>
              <div className="flex items-center gap-3 mb-3">
                {owner.avatar_url ? (
                  <img
                    src={owner.avatar_url}
                    alt={ownerName}
                    className="w-14 h-14 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center text-xl font-semibold text-muted-foreground">
                    {ownerName[0]}
                  </div>
                )}
                <div>
                  <div className="flex items-center gap-1.5">
                    <Link
                      to={`/gardiens/${owner.id}`}
                      className="font-semibold hover:text-primary transition-colors"
                    >
                      {ownerName}
                    </Link>
                    {owner.identity_verified && <VerifiedBadge size="sm" />}
                  </div>
                  {cityName && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <MapPin className="h-3 w-3" /> {cityName}
                    </p>
                  )}
                </div>
              </div>
              {ownerBio && (
                <p className="text-sm text-muted-foreground leading-relaxed line-clamp-6">
                  {ownerBio}
                </p>
              )}
            </div>
          )}

          {/* Slot CTA principal (candidature, gestion owner…) */}
          {ctaSlot}

          {/* Guide local & encart "guide à venir" — désormais dans l'onglet "Logement & quartier" */}

          {/* Autres gardiens du coin — lien vers la recherche pré-remplie */}
          {showSittersLink && (
            <Link
              to={sittersLink!}
              className="block rounded-2xl border border-border bg-card p-5 hover:border-primary/50 transition-colors group"
            >
              <div className="flex items-start gap-3">
                <div className="shrink-0 w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                  <Building2 className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground mb-0.5">
                    Communauté locale
                  </p>
                  <p className="font-semibold text-sm group-hover:text-primary transition-colors">
                    {sittersScope!.mode === "city"
                      ? `Voir les gardiens à ${cityName}`
                      : `Voir les gardiens du ${deptCode}`}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    {sittersScope!.mode === "city"
                      ? `${sittersScope!.count}+ profils vérifiés à ${cityName}.`
                      : `${sittersScope!.count}+ profils vérifiés dans le département.`}
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0 mt-2" />
              </div>
            </Link>
          )}


          {/* Réassurance */}
          <div className="rounded-2xl bg-muted/50 p-5 text-xs text-muted-foreground space-y-2">
            <p className="flex items-center gap-2 font-medium text-foreground">
              <ShieldCheck className="h-4 w-4 text-primary" />
              Sur Guardiens, c'est gratuit, entre voisins
            </p>
            <p>
              Aucun paiement entre membres. Profils vérifiés, avis croisés, accord de garde
              signé. La confiance entre gens du coin.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default SitImmersiveContent;
