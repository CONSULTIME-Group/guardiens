import { useState, useCallback, useEffect, useMemo } from "react";
const entraideHeader = "https://erhccyqevdyevpyctsjj.supabase.co/storage/v1/object/public/property-photos/misc/entraide-header.webp";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dog, Flower2, Handshake, ArrowRight, Lock, X, Sprout, PawPrint, GraduationCap, Star, MapPin, Search as SearchIcon, Check } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import PageMeta from "@/components/PageMeta";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSubscriptionAccess } from "@/hooks/useSubscriptionAccess";
import { useAccessLevel } from "@/hooks/useAccessLevel";
import AccessGateBanner from "@/components/access/AccessGateBanner";
import ProposeExchangeDialog from "@/components/missions/ProposeExchangeDialog";
import ProposeHelperExchangeDialog from "@/components/missions/ProposeHelperExchangeDialog";
import { geocodeCity, haversineDistance } from "@/lib/geocode";
import CompetenceAutocomplete from "@/components/profile/CompetenceAutocomplete";

const CATEGORY_META: Record<string, { label: string; icon: typeof Dog; colorClass: string }> = {
 animals: { label: "Animaux", icon: Dog, colorClass: "text-primary" },
 garden: { label: "Jardin", icon: Flower2, colorClass: "text-primary" },
 house: { label: "Maison", icon: Handshake, colorClass: "text-primary" },
 skills: { label: "Compétences", icon: Handshake, colorClass: "text-primary" },
 
};

const MISSION_TO_SKILL: Record<string, string> = {
 animals: "animaux",
 garden: "jardin",
 skills: "competences",
 house: "house",
};
const SKILL_TO_MISSION: Record<string, string> = {
 animaux: "animals",
 jardin: "garden",
 competences: "skills",
 coups_de_main: "house",
};

const SKILL_PILL_META: Record<string, { label: string; icon: typeof Sprout }> = {
 jardin: { label: "Jardin", icon: Sprout },
 animaux: { label: "Animaux", icon: PawPrint },
 competences: { label: "Compétences", icon: GraduationCap },
 house: { label: "Maison", icon: Handshake },
};

const DURATION_LABELS: Record<string, string> = {
 "1-2h": "1-2 heures",
 half_day: "Demi-journée",
 full_day: "Journée",
 several: "Plusieurs jours",
 weekend: "Week-end",
 week: "Semaine",
};


function formatCity(city: string): string {
 return city.replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatDuration(raw: string): string {
 return DURATION_LABELS[raw] || raw;
}

const EXAMPLES = [
 { cat: "animals", title: "Promener Filou 3 fois cette semaine", exchange: "Plateau de fromages maison et une bonne bouteille" },
 { cat: "animals", title: "Nourrir mes 4 chats samedi et dimanche matin", exchange: "Un dîner à mon retour, je cuisine bien !" },
 { cat: "animals", title: "Accompagner mon chien chez le véto mercredi", exchange: "Confitures maison (abricot et figue)" },
 { cat: "animals", title: "Garder mes 3 poules le week-end du 15 juin", exchange: "Les œufs sont pour vous !" },
 { cat: "garden", title: "Arroser le potager pendant 5 jours", exchange: "Servez-vous dans les tomates et les courgettes !" },
 { cat: "garden", title: "Coup de main pour tailler la haie samedi", exchange: "BBQ à midi, je m'occupe de tout" },
 { cat: "garden", title: "Tondre la pelouse une fois par semaine en juillet", exchange: "Profitez du jardin, de la piscine, et du hamac" },
 { cat: "skills", title: "Véto à la retraite — questions sur votre chien", exchange: "Le plaisir de voir des animaux heureux" },
 { cat: "skills", title: "Dog-training : les bases (rappel, marche en laisse)", exchange: "Un bon café et une balade ensemble" },
];

type CategoryFilter = "all" | "animals" | "garden" | "house" | "skills" | "mine";
type ModeFilter = "need" | "offer";

// Geocode cache to avoid repeated API calls
const geoCache = new Map<string, { lat: number; lng: number } | null>();

async function geocodeCached(city: string): Promise<{ lat: number; lng: number } | null> {
 const key = city.toLowerCase().trim();
 if (geoCache.has(key)) return geoCache.get(key)!;
 const result = await geocodeCity(city);
 const coords = result ? { lat: result.lat, lng: result.lng } : null;
 geoCache.set(key, coords);
 return coords;
}

const SmallMissions = () => {
 const { isAuthenticated, user, switchRole } = useAuth();
 const navigate = useNavigate();
 const queryClient = useQueryClient();
 const { hasAccess, status: subStatus } = useSubscriptionAccess();
 const { level: accessLevel, profileCompletion, canApplyMissions } = useAccessLevel();
 const [searchParams] = useSearchParams();
 const initialMode: ModeFilter = searchParams.get("type") === "offre" ? "offer" : "need";
 const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all");
 const [mode, setMode] = useState<ModeFilter>(initialMode);
 const [dialogMission, setDialogMission] = useState<any>(null);
 const [dialogTarget, setDialogTarget] = useState<{ id: string; name: string } | null>(null);
 const [skillPromptDismissed, setSkillPromptDismissed] = useState(() => {
 try { return localStorage.getItem("guardiens_skill_prompt_dismissed") === "true"; } catch { return false; }
 });
 const [contactingHelperId, setContactingHelperId] = useState<string | null>(null);
 const [helperDialogTarget, setHelperDialogTarget] = useState<any>(null);

 // ── User profile query (must be before offer dialog) ──
 const { data: currentUserProfile, refetch: refetchProfile } = useQuery({
 queryKey: ["my-profile-skills", user?.id],
 queryFn: async () => {
 if (!user) return null;
 const { data } = await supabase
.from("profiles")
.select("skill_categories, available_for_help, custom_skills")
.eq("id", user.id)
.single();
 return data;
 },
 enabled: !!user,
 });

 const mySkills: string[] = (currentUserProfile as any)?.skill_categories || [];

 const [postalCodeInput, setPostalCodeInput] = useState("");
 const [radiusKm, setRadiusKm] = useState(0); // 0 = "Partout" — défaut volontaire (cold start, base nationale)
 const [originCoords, setOriginCoords] = useState<{ lat: number; lng: number } | null>(null);
 const [geocodingOrigin, setGeocodingOrigin] = useState(false);

 // ── Competence search state ──
 const [competenceSearch, setCompetenceSearch] = useState("");

 // ── "Proposer mon aide" dialog state ──
 const [offerDialogOpen, setOfferDialogOpen] = useState(false);
 const [offerSkills, setOfferSkills] = useState<string[]>([]);
 const [offerText, setOfferText] = useState("");
 const [offerCompetences, setOfferCompetences] = useState<string[]>([]);
 const [offerValidatedLabels, setOfferValidatedLabels] = useState<string[]>([]);
 const [offerSaving, setOfferSaving] = useState(false);
 const [offerSaved, setOfferSaved] = useState(false);

 // Load validated competence labels for autocomplete
 useEffect(() => {
 supabase
.from("competences_validees")
.select("label")
.then(({ data }) => {
 setOfferValidatedLabels((data || []).map((d: any) => d.label));
 });
 }, []);

 const openOfferDialog = useCallback(async () => {
 const existing: string[] = (currentUserProfile as any)?.skill_categories || [];
 const existingCustom: string[] = (currentUserProfile as any)?.custom_skills || [];
 setOfferSkills(existing.length > 0 ? [...existing] : []);
 setOfferText(existingCustom.length > 0 ? existingCustom[0] : "");
 // Load existing competences from sitter_profiles
 if (user) {
 const { data: sp } = await supabase
.from("sitter_profiles")
.select("competences")
.eq("user_id", user.id)
.maybeSingle();
 setOfferCompetences(sp?.competences || []);
 }
 setOfferSaved(false);
 setOfferDialogOpen(true);
 }, [currentUserProfile, user]);

 const toggleOfferSkill = (key: string) => {
 setOfferSkills((prev) =>
 prev.includes(key) ? prev.filter((s) => s !== key) : [...prev, key]
 );
 };

 const handleAddOfferCompetence = useCallback((label: string) => {
 if (offerCompetences.includes(label)) return;
 setOfferCompetences(prev => [...prev, label]);
 }, [offerCompetences]);

 const handleRemoveOfferCompetence = useCallback((label: string) => {
 setOfferCompetences(prev => prev.filter(c => c !== label));
 }, []);

 const handleSaveOffer = useCallback(async () => {
 if (!user || offerSkills.length === 0) return;
 setOfferSaving(true);
 try {
 const updates: Record<string, any> = {
 skill_categories: offerSkills,
 available_for_help: true,
 };
 if (offerText.trim()) {
 updates.custom_skills = [offerText.trim()];
 } else {
 updates.custom_skills = [];
 }
 await supabase.from("profiles").update(updates).eq("id", user.id);
 // Also save competences to sitter_profiles
 if (offerCompetences.length > 0) {
 const { data: existing } = await supabase
.from("sitter_profiles")
.select("id")
.eq("user_id", user.id)
.maybeSingle();
 if (existing) {
 await supabase.from("sitter_profiles").update({ competences: offerCompetences }).eq("user_id", user.id);
 } else {
 await supabase.from("sitter_profiles").insert({ user_id: user.id, competences: offerCompetences });
 }
 }
 await refetchProfile();
 await queryClient.invalidateQueries({ queryKey: ["available-helpers"] });
 setOfferSaved(true);
 setTimeout(() => setOfferDialogOpen(false), 1200);
 } catch {
 // silent
 } finally {
 setOfferSaving(false);
 }
 }, [user, offerSkills, offerText, offerCompetences, refetchProfile, queryClient]);

 const handleWithdrawOffer = useCallback(async () => {
 if (!user) return;
 await supabase.from("profiles").update({ available_for_help: false }).eq("id", user.id);
 await refetchProfile();
 await queryClient.invalidateQueries({ queryKey: ["available-helpers"] });
 }, [user, refetchProfile, queryClient]);
 // ── Load user's postal code as default origin ──
 useEffect(() => {
 if (!user) return;
 (async () => {
 const { data: p } = await supabase
.from("profiles")
.select("postal_code, city")
.eq("id", user.id)
.single();
 if (p?.postal_code) {
 setPostalCodeInput(p.postal_code);
 setGeocodingOrigin(true);
 const coords = await geocodeCached(p.city || p.postal_code);
 setOriginCoords(coords);
 setGeocodingOrigin(false);
 } else if (p?.city) {
 setPostalCodeInput(p.city);
 setGeocodingOrigin(true);
 const coords = await geocodeCached(p.city);
 setOriginCoords(coords);
 setGeocodingOrigin(false);
 }
 })();
 }, [user]);

 // ── Geocode on postal code change ──
 const handlePostalCodeSearch = useCallback(async () => {
 if (!postalCodeInput.trim()) { setOriginCoords(null); return; }
 setGeocodingOrigin(true);
 const coords = await geocodeCached(postalCodeInput.trim());
 setOriginCoords(coords);
 setGeocodingOrigin(false);
 }, [postalCodeInput]);

 // ── Geocode missions & helpers cities (batch) ──
 const [missionCoords, setMissionCoords] = useState<Map<string, { lat: number; lng: number }>>(new Map());
 const [helperCoords, setHelperCoords] = useState<Map<string, { lat: number; lng: number }>>(new Map());
 const handleContactHelper = useCallback(async (helperId: string) => {
 if (!isAuthenticated || !user) { navigate("/inscription"); return; }
 if (helperId === user.id) return;
 setContactingHelperId(helperId);
 try {
 const { startConversationAndNavigate } = await import("@/lib/conversation");
 // Contact spontané d'un aidant d'entraide (pas de mission précise rattachée)
 // → context dédié `helper_inquiry` (différent de sit_application / sitter_inquiry)
 switchRole("owner");
 await startConversationAndNavigate(
 { otherUserId: helperId, context: "helper_inquiry" },
 navigate,
 );
 } finally {
 setContactingHelperId(null);
 }
 }, [isAuthenticated, user, navigate, switchRole]);


 const { data: allMissions } = useQuery({
 queryKey: ["small-missions-all"],
 queryFn: async () => {
 const { data: missions } = await supabase
.from("small_missions")
.select("*, profiles:user_id(first_name, avatar_url)")
.in("status", ["open", "in_progress", "completed"] as any[])
.order("created_at", { ascending: false })
.limit(50);

 if (!missions || missions.length === 0) return [];

 const missionIds = missions.map((m: any) => m.id);
 const { data: responses } = await supabase
.from("small_mission_responses")
.select("mission_id, responder_id")
.in("mission_id", missionIds);

 const countMap = new Map<string, number>();
 const myResponseSet = new Set<string>();
 (responses || []).forEach((r: any) => {
 countMap.set(r.mission_id, (countMap.get(r.mission_id) || 0) + 1);
 if (r.responder_id === user?.id) myResponseSet.add(r.mission_id);
 });

 return missions.map((m: any) => ({
...m,
 response_count: countMap.get(m.id) || 0,
 already_proposed: myResponseSet.has(m.id),
 }));
 },
 });

 const { data: availableHelpers } = useQuery({
 queryKey: ["available-helpers"],
 queryFn: async () => {
 const { data } = await supabase
.from("profiles")
.select("id, first_name, avatar_url, city, postal_code, skill_categories, available_for_help, custom_skills")
.eq("available_for_help", true)
.not("skill_categories", "eq", "{}")
.limit(50);
 if (!data) return [];

 const helperIds = data.map((h: any) => h.id);

 // Fetch sitter_profiles competences
 const { data: sitterProfiles } = await supabase
.from("sitter_profiles")
.select("user_id, competences")
.in("user_id", helperIds);

 const competenceMap = new Map<string, string[]>();
 (sitterProfiles || []).forEach((sp: any) => {
 if (sp.competences?.length) competenceMap.set(sp.user_id, sp.competences);
 });

 const { data: reviews } = await supabase
.from("reviews")
.select("reviewee_id, overall_rating")
.in("reviewee_id", helperIds)
.eq("published", true);

 const reviewMap = new Map<string, { count: number; total: number }>();
 (reviews || []).forEach((r: any) => {
 const current = reviewMap.get(r.reviewee_id) || { count: 0, total: 0 };
 reviewMap.set(r.reviewee_id, { count: current.count + 1, total: current.total + r.overall_rating });
 });

 const { data: apps } = await supabase
.from("applications")
.select("sitter_id")
.in("sitter_id", helperIds)
.eq("status", "accepted");

 const sitsMap = new Map<string, number>();
 (apps || []).forEach((a: any) => {
 sitsMap.set(a.sitter_id, (sitsMap.get(a.sitter_id) || 0) + 1);
 });

 return data
.filter((h: any) => h.id !== user?.id)
.map((h: any) => {
 const rev = reviewMap.get(h.id);
 return {
...h,
 competences: competenceMap.get(h.id) || [],
 review_avg: rev ? rev.total / rev.count : 0,
 review_count: rev?.count || 0,
 sits_count: sitsMap.get(h.id) || 0,
 };
 });
 },
 enabled: isAuthenticated,
 });

 // ── Geocode missions when loaded ──
 useEffect(() => {
 if (!allMissions?.length) return;
 const toGeocode = allMissions.filter((m: any) => m.city && !missionCoords.has(m.id));
 if (toGeocode.length === 0) return;
 (async () => {
 const newMap = new Map(missionCoords);
 for (const m of toGeocode) {
 if (m.latitude && m.longitude) {
 newMap.set(m.id, { lat: m.latitude, lng: m.longitude });
 } else if (m.city) {
 const c = await geocodeCached(m.city);
 if (c) newMap.set(m.id, c);
 }
 }
 setMissionCoords(newMap);
 })();
 }, [allMissions]);

 // ── Geocode helpers when loaded ──
 useEffect(() => {
 if (!availableHelpers?.length) return;
 const toGeocode = availableHelpers.filter((h: any) => h.city && !helperCoords.has(h.id));
 if (toGeocode.length === 0) return;
 (async () => {
 const newMap = new Map(helperCoords);
 for (const h of toGeocode) {
 if (h.city) {
 const c = await geocodeCached(h.city);
 if (c) newMap.set(h.id, c);
 }
 }
 setHelperCoords(newMap);
 })();
 }, [availableHelpers]);

 const normalizedSearch = competenceSearch.toLowerCase().trim();

 const filteredMissions = useMemo(() => {
 return (allMissions || [])
.filter((m: any) => {
 // "Mes missions" tab shows all statuses including completed
 if (categoryFilter === "mine") return m.user_id === user?.id;
 // Public view: hide completed/cancelled missions
 if (m.status === "completed" || m.status === "cancelled") return false;
 if (categoryFilter !== "all" && m.category !== categoryFilter) return false;
 // Distance filter
 if (originCoords && radiusKm > 0) {
 const mc = missionCoords.get(m.id);
 if (mc) {
 const dist = haversineDistance(originCoords.lat, originCoords.lng, mc.lat, mc.lng);
 if (dist > radiusKm) return false;
 }
 }
 // Competence search also filters missions by title/description
 if (normalizedSearch) {
 const titleMatch = m.title?.toLowerCase().includes(normalizedSearch);
 const descMatch = m.description?.toLowerCase().includes(normalizedSearch);
 const exchangeMatch = m.exchange_offer?.toLowerCase().includes(normalizedSearch);
 if (!titleMatch && !descMatch && !exchangeMatch) return false;
 }
 return true;
 })
.sort((a: any, b: any) => {
 const order: Record<string, number> = { open: 0, in_progress: 1, completed: 2 };
 const diff = (order[a.status] ?? 9) - (order[b.status] ?? 9);
 if (diff !== 0) return diff;
 if (mySkills.length > 0) {
 const aMatches = mySkills.some(s => SKILL_TO_MISSION[s] === a.category);
 const bMatches = mySkills.some(s => SKILL_TO_MISSION[s] === b.category);
 if (aMatches && !bMatches) return -1;
 if (!aMatches && bMatches) return 1;
 }
 return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
 });
 }, [allMissions, categoryFilter, user?.id, originCoords, radiusKm, missionCoords, mySkills, normalizedSearch]);

 const filteredHelpers = useMemo(() => {
 return (availableHelpers || []).filter((h: any) => {
 // Category filter
 if (categoryFilter !== "all" && categoryFilter !== "mine") {
 const skillKey = MISSION_TO_SKILL[categoryFilter];
 if (!h.skill_categories?.includes(skillKey)) return false;
 }
 // Distance filter
 if (originCoords && radiusKm > 0) {
 const hc = helperCoords.get(h.id);
 if (hc) {
 const dist = haversineDistance(originCoords.lat, originCoords.lng, hc.lat, hc.lng);
 if (dist > radiusKm) return false;
 }
 }
 // Competence search filter (specific skills only)
 if (normalizedSearch) {
 const comps: string[] = h.competences || [];
 const customs: string[] = h.custom_skills || [];
 const allComps = [...comps,...customs];
 const matches = allComps.some((c: string) => c.toLowerCase().includes(normalizedSearch));
 if (!matches) return false;
 }
 return true;
 });
 }, [availableHelpers, categoryFilter, originCoords, radiusKm, helperCoords, normalizedSearch]);

 const missionCount = filteredMissions.length;
 const helperCount = filteredHelpers.length;

 // Tri par priorité : ceux qui ont déclaré des compétences spécifiques (au-delà
 // des simples catégories) apparaissent en premier ; les autres sont
 // « complémentaires ».
 const { priorityHelpers, complementaryHelpers } = useMemo(() => {
 const priority: any[] = [];
 const complementary: any[] = [];
 for (const h of filteredHelpers) {
 const hasSpecificSkills =
 (h.competences && h.competences.length > 0) ||
 (h.custom_skills && h.custom_skills.length > 0);
 if (hasSpecificSkills) priority.push(h);
 else complementary.push(h);
 }
 return { priorityHelpers: priority, complementaryHelpers: complementary };
 }, [filteredHelpers]);

 const dismissSkillPrompt = () => {
 setSkillPromptDismissed(true);
 try { localStorage.setItem("guardiens_skill_prompt_dismissed", "true"); } catch {}
 };

  // Pills de filtre — sans icônes Lucide (règle mémoire « No Lucide/Emoji in content »)
 const FILTER_PILLS: { key: CategoryFilter; label: string }[] = [
 { key: "all", label: "Tout" },
 { key: "garden", label: "Jardin" },
 { key: "animals", label: "Animaux" },
 { key: "skills", label: "Compétences" },
 { key: "house", label: "Maison" },
 { key: "mine", label: "Mes missions" },
 ];

 return (
 <>
 <PageMeta
 title="Petites missions — Entre gens du coin | Guardiens"
 description="Des coups de main, des échanges, des compétences. Entre gens du coin qui se choisissent."
 />

  <div className="min-h-screen bg-background">
 {/* Hero compact avec image — hauteur contenue, dégradé fort pour lisibilité */}
 <section className="relative overflow-hidden border-b border-border/40">
 <div className="absolute inset-0">
 <img src={entraideHeader} alt="" loading="eager" className="w-full h-full object-cover" />
 <div className="absolute inset-0 bg-gradient-to-r from-background via-background/85 to-background/50" />
 </div>
 <div className="relative max-w-6xl mx-auto px-4 py-10 md:py-14 text-center space-y-3">
 <h1 className="font-heading text-3xl md:text-4xl font-bold text-foreground leading-tight">
 Petites missions près de chez vous
 </h1>
 <p className="text-sm md:text-base text-muted-foreground max-w-xl mx-auto">
 Demandez un coup de main ou proposez le vôtre — entre gens du coin, sans argent.
 </p>
 <p className="inline-block text-xs font-medium bg-badge-success text-badge-success-foreground px-3 py-1 rounded-full">
 Gratuit pour tous les membres
 </p>
 </div>
 </section>

  <main className="max-w-6xl mx-auto px-4 py-8 md:py-10 space-y-12">
 <section className="space-y-6">
 {/* Actions de création — 2 CTAs explicites côte à côte (remplace l'ancien tab + bouton qui se dupliquaient) */}
 {isAuthenticated && canApplyMissions && (
 <div className="flex flex-col sm:flex-row gap-3 justify-center">
 <Link to="/petites-missions/creer" className="sm:flex-initial">
 <Button variant="hero" size="lg" className="w-full sm:w-auto">
 Publier ma demande
 <ArrowRight className="ml-2 h-4 w-4" />
 </Button>
 </Link>
 <Button variant="outline" size="lg" onClick={openOfferDialog} className="border-2">
 Proposer mon aide
 <ArrowRight className="ml-2 h-4 w-4" />
 </Button>
 </div>
 )}

 {/* Toggle de navigation — clarifié : ce que l'on PARCOURT, pas ce que l'on crée */}
 <div className="flex items-center justify-center">
 <div className="inline-flex items-center gap-1 bg-muted rounded-lg p-1" role="tablist" aria-label="Filtrer la liste">
 <button
 role="tab"
 aria-selected={mode === "need"}
 onClick={() => setMode("need")}
 className={`px-4 py-2 text-sm rounded-md transition-colors ${mode === "need" ? "bg-background text-foreground shadow-sm font-medium" : "text-muted-foreground hover:text-foreground"}`}
 >
 Demandes du coin
 </button>
 <button
 role="tab"
 aria-selected={mode === "offer"}
 onClick={() => setMode("offer")}
 className={`px-4 py-2 text-sm rounded-md transition-colors ${mode === "offer" ? "bg-background text-foreground shadow-sm font-medium" : "text-muted-foreground hover:text-foreground"}`}
 >
 Personnes qui aident
 </button>
 </div>
 </div>
 {isAuthenticated && accessLevel === 1 && (
 <AccessGateBanner level={accessLevel} profileCompletion={profileCompletion} context="mission" />
 )}

 {/* Skill prompt — uniquement en mode "offer" pour éviter le doublon avec le toggle dispo */}
 {isAuthenticated && mode === "offer" && mySkills.length === 0 && !skillPromptDismissed && (
 <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 flex items-start gap-3">
 <div className="flex-1">
 <p className="text-sm text-foreground font-medium">
 Osez dire ce que vous savez faire. Même un petit talent peut changer la semaine de quelqu'un.
 </p>
 <button onClick={openOfferDialog} className="text-sm text-primary font-semibold mt-1 inline-block hover:underline">
 Déclarer mes compétences →
 </button>
 </div>
 <button onClick={dismissSkillPrompt} className="text-muted-foreground hover:text-foreground shrink-0" aria-label="Fermer">
 <X className="h-4 w-4" />
 </button>
 </div>
 )}

 {/* ── Filter bar: distance + competence + category ── */}
 <div className="space-y-3">
 {/* Distance + competence row */}
 <div className="flex flex-col sm:flex-row gap-3">
 {/* Postal code + radius */}
 <div className="flex items-center gap-3 flex-1 min-w-0">
 <div className="relative min-w-0 w-[170px] shrink-0">
 <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
 <input
 type="text"
 value={postalCodeInput}
 onChange={(e) => setPostalCodeInput(e.target.value)}
 onBlur={handlePostalCodeSearch}
 onKeyDown={(e) => e.key === "Enter" && handlePostalCodeSearch()}
 placeholder="Code postal"
 className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
 />
 </div>
  <div className="flex items-center gap-2 flex-1 min-w-0 max-w-[300px]">
 <span className="text-xs font-medium text-muted-foreground whitespace-nowrap shrink-0">Rayon</span>
 <input
 type="range"
 min={1}
 max={100}
 step={1}
 value={radiusKm === 0 ? 100 : radiusKm}
 onChange={(e) => {
 const v = Number(e.target.value);
 setRadiusKm(v >= 100 ? 0 : v);
 }}
 aria-label="Rayon de recherche en kilomètres"
 className="flex-1 h-2 accent-[hsl(var(--primary))] cursor-pointer"
 />
 <span className="text-xs font-semibold text-foreground whitespace-nowrap min-w-[70px] text-right tabular-nums">
 {radiusKm === 0 ? "France entière" : `${radiusKm} km`}
 </span>
 </div>
 {geocodingOrigin && (
 <span className="text-xs text-muted-foreground animate-pulse">…</span>
 )}
 </div>

 {/* Competence search */}
 <div className="relative flex-1 min-w-0 max-w-[300px]">
 <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
 <input
 type="text"
 value={competenceSearch}
 onChange={(e) => setCompetenceSearch(e.target.value)}
 placeholder="Rechercher une compétence (ex: arroser jardin)"
 className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
 />
 {competenceSearch && (
 <button
 onClick={() => setCompetenceSearch("")}
 className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
 >
 <X className="h-3.5 w-3.5" />
 </button>
 )}
 </div>
 </div>

  {/* Category filter pills (sans icônes décoratives) */}
 <div className="-mx-4 px-4 overflow-x-auto sm:overflow-visible sm:mx-0 sm:px-0">
 <div className="flex sm:flex-wrap items-center gap-2 sm:justify-center w-max sm:w-auto">
 {FILTER_PILLS.map(({ key, label }) => (
 <button
 key={key}
 onClick={() => setCategoryFilter(key)}
 className={`rounded-full border px-4 py-2 text-sm whitespace-nowrap transition-colors ${
 categoryFilter === key
 ? "bg-primary text-primary-foreground border-primary"
 : "bg-muted text-foreground border-border hover:border-primary/40"
 }`}
 >
 {label}
 </button>
 ))}
 </div>
 </div>
 </div>

 {/* ═══ Section 1 — Missions près de chez vous ═══ */}
 <h2 className="text-base font-semibold text-foreground mb-4 flex items-center gap-2">
 {mode === "offer" ? "Demandes du coin à aider" : "Demandes près de chez vous"}
  {missionCount > 0 && (
 <span className="text-xs font-normal bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
 {missionCount} demande{missionCount > 1 ? "s" : ""}
 </span>
 )}
 </h2>

 {missionCount > 0 ? (
 <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
 {filteredMissions.map((m: any) => {
 const meta = CATEGORY_META[m.category] || CATEGORY_META.animals;
 const Icon = meta.icon;
 const isCompleted = m.status === "completed";
 const isMine = m.user_id === user?.id;
 const goToDetail = () => navigate(isAuthenticated ? `/petites-missions/${m.id}` : "/inscription");
 return (
 <div
 key={`m-${m.id}`}
 role="button"
 tabIndex={0}
 onClick={goToDetail}
 onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); goToDetail(); } }}
 className="cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-lg"
 >
 <Card className={`border-border transition-colors h-full ${isCompleted ? "opacity-50 grayscale" : "hover:border-primary/30"}`}>
 <CardContent className="p-4 space-y-2">
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-2">
 <Icon className="h-4 w-4 text-primary" />
 <span className="text-xs font-medium text-muted-foreground">{meta.label}</span>
 </div>
 {m.response_count > 0 && (
 <span className="text-xs text-muted-foreground bg-accent px-2 py-0.5 rounded-full">
 {m.response_count} proposition{m.response_count > 1 ? "s" : ""}
 </span>
 )}
 </div>
 <p className="font-medium text-sm text-foreground">{m.title}</p>
 <p className="text-xs text-muted-foreground">
 {formatCity(m.city || "—")} · {formatDuration(m.duration_estimate || "—")}
 </p>
 <p className="text-xs text-muted-foreground">En échange : {m.exchange_offer}</p>
 {isCompleted ? (
 <span className="inline-block text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">Trouvé</span>
 ) : m.status === "in_progress" ? (
 <span className="inline-block text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">En cours</span>
 ) : null}
 {!isCompleted && (
 isMine ? (
 <span className="inline-block text-xs text-muted-foreground text-center w-full mt-2">Votre mission</span>
 ) : isAuthenticated && !canApplyMissions ? (
 <Button size="sm" variant="outline" className="w-full mt-2 gap-1 text-muted-foreground" disabled>
 <Lock className="h-3 w-3" /> Complétez votre profil
 </Button>
 ) : m.already_proposed ? (
 <Button size="sm" variant="outline" className="w-full mt-2 opacity-60 cursor-not-allowed" disabled>
 Proposition envoyée
 </Button>
 ) : (
 <Button
 size="sm"
 variant="outline"
 className="w-full mt-2"
 onClick={(e) => {
 e.preventDefault();
 e.stopPropagation();
 if (!isAuthenticated) { navigate("/inscription"); return; }
 setDialogMission(m);
 setDialogTarget({ id: m.user_id, name: (m.profiles as any)?.first_name || "ce membre" });
 }}
 >
 {mode === "offer" ? "Je peux aider →" : "Proposer un échange →"}
 </Button>
 )
 )}
 </CardContent>
 </Card>
 </div>
 );
 })}
 </div>
 ) : (
 <div className="rounded-2xl border border-dashed border-primary/30 bg-primary/5 p-8 text-center space-y-3">
 <p className="font-heading text-lg font-semibold text-foreground">
 {mode === "offer"
 ? "Aucune demande pour le moment près de chez vous."
 : "Personne n'a encore osé près de chez vous."}
 </p>
 <p className="text-sm text-muted-foreground max-w-md mx-auto">
 {mode === "offer"
 ? "Rendez-vous visible : indiquez vos disponibilités juste en dessous. Quand une demande arrivera, vous serez la première personne à qui l'on pense."
 : "Soyez la première personne à publier. Une demande d'aujourd'hui, c'est des gens du coin qui la voient demain — et souvent une rencontre qui change la semaine."}
 </p>
 {mode === "need" && (
 <Link to="/petites-missions/creer" className="inline-block">
 <Button variant="hero" size="lg" className="mt-2">
 J'ose, je publie ma demande
 <ArrowRight className="ml-2 h-4 w-4" />
 </Button>
 </Link>
 )}
 {mode === "offer" && (
 <Button variant="hero" size="lg" className="mt-2" onClick={openOfferDialog}>
 J'ai du temps à offrir
 <ArrowRight className="ml-2 h-4 w-4" />
 </Button>
 )}
 </div>
 )}

 {/* ═══ Section 2 — Disponibles pour aider ═══ */}
 {(helperCount > 0 || isAuthenticated) && (
 <div className="mt-10">
 {/* Toggle dispo — uniquement en mode "offer" pour rester cohérent avec l'intention */}
 {isAuthenticated && mode === "offer" && (
 <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 mb-4 flex items-center justify-between">
 <div className="flex items-center gap-2">
 <Switch
 checked={!!(currentUserProfile as any)?.available_for_help}
 onCheckedChange={async (checked) => {
 if (checked) {
 openOfferDialog();
 } else {
 await handleWithdrawOffer();
 }
 }}
 />
 <p className="text-sm text-foreground">
 {(currentUserProfile as any)?.available_for_help
 ? "Vous êtes visible — disponible pour aider"
 : "Rendez-vous visible auprès des gens du coin"}
 </p>
 </div>
 {(currentUserProfile as any)?.available_for_help && (
 <button onClick={openOfferDialog} className="text-xs text-primary font-semibold hover:underline">
 Modifier
 </button>
 )}
 </div>
 )}
 <h2 className="text-base font-semibold text-foreground mb-4 flex items-center gap-2">
 {mode === "need" ? "Des gens du coin prêts à aider" : "Autres personnes disponibles"}
 <span className="text-xs font-normal bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
 {helperCount} personne{helperCount > 1 ? "s" : ""} du coin
 </span>
 </h2>
 {(() => {
 const renderHelperCard = (h: any) => {
 const skillCats: string[] = h.skill_categories || [];
 const displayedSkills = skillCats.slice(0, 2);
 const extraCount = skillCats.length - 2;
 return (
 <div key={`h-${h.id}`} className="rounded-2xl border border-primary/20 bg-card p-5 space-y-3">
 <span className="inline-block text-xs rounded-full bg-primary/10 text-primary px-3 py-1">
 Disponible pour aider
 </span>
 <div className="flex items-center gap-3">
 {h.avatar_url ? (
 <img src={h.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover border border-border" />
 ) : (
 <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-sm font-bold text-muted-foreground">
 {h.first_name?.charAt(0) || "?"}
 </div>
 )}
 <div>
 <p className="text-base font-heading font-semibold text-foreground">{h.first_name}</p>
 {h.city && <p className="text-xs text-muted-foreground">{h.city}</p>}
 </div>
 </div>
 <div className="flex flex-wrap gap-1.5">
 {displayedSkills.map((key: string) => {
 const meta = SKILL_PILL_META[key];
 if (!meta) return null;
 const SkIcon = meta.icon;
 return (
 <span key={key} className="flex items-center gap-1 rounded-full border border-primary/20 bg-primary/10 text-primary px-2.5 py-0.5 text-xs">
 <SkIcon className="h-3 w-3" />
 {meta.label}
 </span>
 );
 })}
 {extraCount > 0 && (
 <span className="text-xs text-muted-foreground px-2 py-0.5">+{extraCount}</span>
 )}
 </div>
 {h.sits_count > 0 && (
 <p className="text-xs text-foreground/60 flex items-center gap-1">
 <Star className="h-3 w-3 fill-primary text-primary" />
 {h.review_count > 0 ? `${h.review_avg.toFixed(1)} · ` : ""}{h.sits_count} mission{h.sits_count > 1 ? "s" : ""} accomplie{h.sits_count > 1 ? "s" : ""}
 </p>
 )}
 {/* Compétences spécifiques (au-delà des catégories) */}
 {(() => {
 const comps: string[] = h.competences || [];
 const toShow = comps.length > 0 ? comps : (h.custom_skills as string[] || []);
 if (toShow.length === 0) return null;
 return (
 <div className="flex flex-wrap gap-1">
 {toShow.slice(0, 3).map((c: string) => (
 <span key={c} className="text-xs bg-muted text-foreground/70 px-2 py-0.5 rounded-full border border-border">
 {c}
 </span>
 ))}
 {toShow.length > 3 && (
 <span className="text-xs bg-muted text-foreground/70 px-2 py-0.5 rounded-full border border-border">
 +{toShow.length - 3}
 </span>
 )}
 </div>
 );
 })()}
 <div className="flex items-center justify-between gap-2 pt-1">
 <button
 onClick={() => {
 if (!isAuthenticated) { navigate("/inscription"); return; }
 setHelperDialogTarget(h);
 }}
 className="text-sm text-primary font-semibold hover:underline"
 >
 Proposer un échange →
 </button>
 <button
 onClick={() => navigate(`/gardiens/${h.id}`)}
 className="text-xs text-muted-foreground hover:text-foreground hover:underline"
 >
 Voir le profil
 </button>
 </div>
 </div>
 );
 };

 return (
 <div className="space-y-8">
 {/* Bloc 1 — Compétences spécifiques renseignées (priorité) */}
 {priorityHelpers.length > 0 && (
 <div className="space-y-3">
 <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
 {priorityHelpers.map(renderHelperCard)}
 </div>
 </div>
 )}

 {/* Bloc 2 — Disponibles en complémentaire (catégories seules) */}
 {complementaryHelpers.length > 0 && (
 <div className="space-y-3">
 <div className="flex items-center gap-3">
 <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
 En complémentaire
 </h3>
 <span className="text-xs text-muted-foreground">
 Disponibles sans compétence précisée
 </span>
 <div className="flex-1 h-px bg-border" />
 </div>
 <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
 {complementaryHelpers.map(renderHelperCard)}
 </div>
 </div>
 )}

 {/* Empty state — personne de disponible dans le rayon */}
 {priorityHelpers.length === 0 && complementaryHelpers.length === 0 && (
 <div className="rounded-2xl border border-dashed border-primary/30 bg-primary/5 p-8 text-center space-y-3">
 <p className="font-heading text-lg font-semibold text-foreground">
 {mode === "offer"
 ? "Vous seriez la première personne disponible ici."
 : "Personne ne s'est encore déclaré disponible près de chez vous."}
 </p>
 <p className="text-sm text-muted-foreground max-w-md mx-auto">
 {mode === "offer"
 ? "Activez votre disponibilité ci-dessus : votre présence donne envie aux autres d'oser à leur tour."
 : "Élargissez le rayon, ou publiez votre demande : les personnes du coin reçoivent une alerte et se manifestent souvent dans la journée."}
 </p>
 {mode === "need" && (
 <Link to="/petites-missions/creer" className="inline-block">
 <Button variant="hero" size="lg" className="mt-2">
 J'ose, je publie ma demande
 <ArrowRight className="ml-2 h-4 w-4" />
 </Button>
 </Link>
 )}
 </div>
 )}
 </div>
 );
 })()}
 </div>
 )}
 </section>

 {/* Exemples par catégorie — sans Maison */}
 <section className="space-y-8">
 <h2 className="font-heading text-2xl font-bold text-foreground text-center">Quelques exemples d'échanges</h2>
 {(["animals", "garden", "skills"] as const).map((cat) => {
 const meta = CATEGORY_META[cat];
 const Icon = meta.icon;
 const items = EXAMPLES.filter((e) => e.cat === cat);
 return (
 <div key={cat} className="space-y-3">
 <h3 className="font-heading text-lg font-semibold flex items-center gap-2">
 <Icon className="h-5 w-5 text-primary" />
 {meta.label}
 </h3>
 <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
 {items.map((ex) => (
 <Card key={ex.title} className="border-dashed border-border bg-card">
 <CardContent className="p-4 space-y-2">
 <p className="font-medium text-sm text-foreground">{ex.title}</p>
 <p className="text-xs text-muted-foreground">En échange : {ex.exchange}</p>
 </CardContent>
 </Card>
 ))}
 </div>
 </div>
 );
 })}
 </section>

 {/* CTA final unifié */}
 <section className="text-center space-y-4 py-8">
 <p className="font-heading text-xl md:text-2xl italic text-foreground/80 max-w-xl mx-auto leading-relaxed">
 Le pire qui puisse arriver, c'est que personne ne réponde.<br />
 Le meilleur, c'est de rencontrer quelqu'un qui change votre semaine.
 </p>
 {isAuthenticated ? (
 <Link to="/petites-missions/creer">
 <Button variant="hero" size="xl">
 J'ose demander
 <ArrowRight className="ml-2 h-5 w-5" />
 </Button>
 </Link>
 ) : (
 <Link to="/inscription">
 <Button variant="hero" size="xl">S'inscrire gratuitement</Button>
 </Link>
 )}
 </section>

 {/* Schema.org */}
 <script
 type="application/ld+json"
 dangerouslySetInnerHTML={{
 __html: JSON.stringify({
 "@context": "https://schema.org",
 "@type": "Service",
 name: "Petites missions Guardiens",
 description: "Entraide communautaire entre gens du coin autour des animaux, du jardin et des compétences.",
 areaServed: { "@type": "Country", name: "France" },
 provider: { "@type": "Organization", name: "Guardiens", url: "https://guardiens.fr" },
 }),
 }}
 />
 </main>

 <footer className="border-t border-border py-8 text-center text-sm text-muted-foreground">
 <div className="max-w-6xl mx-auto px-4 flex flex-wrap justify-center gap-4">
 <Link to="/a-propos" className="hover:text-foreground">À propos</Link>
 <Link to="/contact" className="hover:text-foreground">Contact</Link>
 <Link to="/cgu" className="hover:text-foreground">CGU</Link>
 <Link to="/confidentialite" className="hover:text-foreground">Confidentialité</Link>
 <Link to="/mentions-legales" className="hover:text-foreground">Mentions légales</Link>
 </div>
 </footer>
 </div>

 {/* Propose exchange dialog */}
 {dialogMission && dialogTarget && (
 <ProposeExchangeDialog
 open={!!dialogMission}
 onClose={() => { setDialogMission(null); setDialogTarget(null); }}
 mission={{
 id: dialogMission.id,
 title: dialogMission.title,
 exchange_offer: dialogMission.exchange_offer,
 date_needed: dialogMission.date_needed,
 user_id: dialogMission.user_id,
 }}
 targetUserId={dialogTarget.id}
 targetFirstName={dialogTarget.name}
 />
 )}

 {/* Helper exchange dialog */}
 {helperDialogTarget && (
 <ProposeHelperExchangeDialog
 open={!!helperDialogTarget}
 onClose={() => setHelperDialogTarget(null)}
 helper={{
 id: helperDialogTarget.id,
 first_name: helperDialogTarget.first_name,
 city: helperDialogTarget.city,
 competences: helperDialogTarget.competences,
 custom_skills: helperDialogTarget.custom_skills,
 }}
 />
 )}

 {/* ── Proposer mon aide dialog ── */}
 <Dialog open={offerDialogOpen} onOpenChange={setOfferDialogOpen}>
 <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
 <DialogHeader>
 <DialogTitle className="font-heading text-lg">J'ai du temps à offrir</DialogTitle>
 <DialogDescription className="text-sm text-muted-foreground">
 Indiquez dans quels domaines vous pouvez aider, ajoutez vos compétences spécifiques et décrivez ce que vous proposez.
 </DialogDescription>
 </DialogHeader>

 {offerSaved ? (
 <div className="flex flex-col items-center gap-3 py-6">
 <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
 <Check className="h-6 w-6 text-primary" />
 </div>
 <p className="text-sm font-medium text-foreground">Votre disponibilité est enregistrée</p>
 <p className="text-xs text-muted-foreground">Les membres du coin peuvent maintenant vous trouver.</p>
 </div>
 ) : (
 <div className="space-y-5 pt-2">
 {/* Skill categories */}
 <div className="space-y-2">
 <p className="text-sm font-medium text-foreground">Domaines de compétences</p>
 <div className="flex flex-wrap gap-2">
 {Object.entries(SKILL_PILL_META).map(([key, { label, icon: SkIcon }]) => {
 const selected = offerSkills.includes(key);
 return (
 <button
 key={key}
 type="button"
 onClick={() => toggleOfferSkill(key)}
 className={`flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm transition-colors ${
 selected
 ? "bg-primary text-primary-foreground border-primary"
 : "bg-muted text-foreground border-border hover:border-primary/40"
 }`}
 >
 <SkIcon className="h-3.5 w-3.5" />
 {label}
 {selected && <Check className="h-3 w-3" />}
 </button>
 );
 })}
 </div>
 </div>

 {/* Competences autocomplete */}
 <CompetenceAutocomplete
 competences={offerCompetences}
 validatedLabels={offerValidatedLabels}
 activeCategory={offerSkills.length === 1 ? offerSkills[0] : null}
 onAdd={handleAddOfferCompetence}
 onRemove={handleRemoveOfferCompetence}
 />

 {/* Free text */}
 <div className="space-y-2">
 <p className="text-sm font-medium text-foreground">Description libre (optionnel)</p>
 <Textarea
 value={offerText}
 onChange={(e) => setOfferText(e.target.value)}
 placeholder="Ex: Je peux arroser les plantes, promener un chien, donner un coup de main pour du bricolage…"
 rows={3}
 className="resize-none text-sm"
 maxLength={300}
 />
 <p className="text-xs text-muted-foreground text-right">{offerText.length}/300</p>
 </div>

 <Button
 onClick={handleSaveOffer}
 disabled={offerSkills.length === 0 || offerSaving}
 className="w-full min-h-[44px]"
 >
 {offerSaving ? "Enregistrement…" : "Je suis disponible pour aider"}
 </Button>
 {offerSkills.length === 0 && (
 <p className="text-xs text-destructive text-center">Sélectionnez au moins un domaine</p>
 )}
 </div>
 )}
 </DialogContent>
 </Dialog>
 </>
 );
};

export default SmallMissions;
