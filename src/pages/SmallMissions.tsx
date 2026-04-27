import { useState, useCallback, useEffect, useMemo } from "react";
const entraideHeader = "https://erhccyqevdyevpyctsjj.supabase.co/storage/v1/object/public/property-photos/misc/entraide-header.webp";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dog, Flower2, Handshake, ArrowRight, Lock, X, Sprout, PawPrint, GraduationCap, Star, MapPin, Search as SearchIcon, Check } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

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
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all");
  const [mode, setMode] = useState<ModeFilter>("need");
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
  const [radiusKm, setRadiusKm] = useState(15);
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
        const allComps = [...comps, ...customs];
        const matches = allComps.some((c: string) => c.toLowerCase().includes(normalizedSearch));
        if (!matches) return false;
      }
      return true;
    });
  }, [availableHelpers, categoryFilter, originCoords, radiusKm, helperCoords, normalizedSearch]);

  const missionCount = filteredMissions.length;
  const helperCount = filteredHelpers.length;

  const dismissSkillPrompt = () => {
    setSkillPromptDismissed(true);
    try { localStorage.setItem("guardiens_skill_prompt_dismissed", "true"); } catch {}
  };

  const FILTER_PILLS: { key: CategoryFilter; label: string; icon: typeof Dog | null }[] = [
    { key: "all", label: "Tout", icon: null },
    { key: "garden", label: "Jardin", icon: Sprout },
    { key: "animals", label: "Animaux", icon: PawPrint },
    { key: "skills", label: "Compétences", icon: GraduationCap },
    { key: "house", label: "Maison", icon: Handshake },
    { key: "mine", label: "Mes missions", icon: null },
  ];

  return (
    <>
      <PageMeta
        title="Petites missions — Entre gens du coin | Guardiens"
        description="Des coups de main, des échanges, des compétences. Entre gens du coin qui se choisissent."
      />

      <div className="min-h-screen bg-background">
        {/* Hero */}
        <section className="relative overflow-hidden rounded-b-2xl">
          <div className="absolute inset-0">
            <img src={entraideHeader} alt="" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-r from-background/90 via-background/75 to-background/60" />
          </div>
          <div className="relative max-w-6xl mx-auto px-4 py-16 md:py-24 text-center space-y-4">
            <h1 className="font-heading text-4xl md:text-5xl font-bold text-foreground">
              Petites missions — Entre gens du coin
            </h1>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Des coups de main, des échanges, des compétences. Entre gens du coin qui se choisissent.
            </p>
          </div>
        </section>

        <main className="max-w-6xl mx-auto px-4 py-12 space-y-16">
          <section className="space-y-6">
            {/* Mode toggle: need / offer */}
            <div className="flex items-center justify-center gap-1 bg-muted rounded-lg p-1 w-fit mx-auto">
              <button
                onClick={() => setMode("need")}
                className={`px-4 py-2 text-sm rounded-md transition-colors ${mode === "need" ? "bg-background text-foreground shadow-sm font-medium" : "text-muted-foreground hover:text-foreground"}`}
              >
                Je cherche de l'aide
              </button>
              <button
                onClick={() => setMode("offer")}
                className={`px-4 py-2 text-sm rounded-md transition-colors ${mode === "offer" ? "bg-background text-foreground shadow-sm font-medium" : "text-muted-foreground hover:text-foreground"}`}
              >
                Je propose mon aide
              </button>
            </div>

            {isAuthenticated && canApplyMissions && (
              <div className="text-center">
                {mode === "need" ? (
                  <Link to="/petites-missions/creer">
                    <Button variant="hero" size="lg">
                      Poster une mission
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                ) : (
                  <Button variant="hero" size="lg" onClick={openOfferDialog}>
                    Proposer mon aide
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                )}
              </div>
            )}
            {isAuthenticated && accessLevel === 1 && (
              <AccessGateBanner level={accessLevel} profileCompletion={profileCompletion} context="mission" />
            )}

            {/* Skill prompt */}
            {isAuthenticated && mySkills.length === 0 && !skillPromptDismissed && (
              <div className="bg-muted rounded-xl p-4 flex items-start gap-3">
                <div className="flex-1">
                  <p className="text-sm text-foreground font-medium">
                    Déclarez vos compétences pour voir en priorité les échanges qui vous correspondent.
                  </p>
                  <button onClick={openOfferDialog} className="text-sm text-primary font-semibold mt-1 inline-block hover:underline">
                    Déclarer mes compétences →
                  </button>
                </div>
                <button onClick={dismissSkillPrompt} className="text-muted-foreground hover:text-foreground shrink-0">
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
                  <div className="flex items-center gap-2 flex-1 min-w-0 max-w-[280px]">
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
                      className="flex-1 h-2 accent-[hsl(var(--primary))] cursor-pointer"
                    />
                    <span className="text-xs font-medium text-foreground whitespace-nowrap min-w-[50px] text-right">
                      {radiusKm === 0 ? "∞" : `${radiusKm} km`}
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

              {/* Category filter pills */}
              <div className="flex flex-wrap items-center gap-2 justify-center">
                {FILTER_PILLS.map(({ key, label, icon: Icon }) => (
                  <button
                    key={key}
                    onClick={() => setCategoryFilter(key)}
                    className={`flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm transition-colors ${
                      categoryFilter === key
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-muted text-foreground border-border hover:border-primary/40"
                    }`}
                  >
                    {Icon && <Icon className="h-3.5 w-3.5" />}
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* ═══ Section 1 — Missions près de chez vous ═══ */}
            <h2 className="text-base font-semibold text-foreground mb-4 flex items-center gap-2">
              Missions près de chez vous
              <span className="text-xs font-normal bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                {missionCount} mission{missionCount > 1 ? "s" : ""}
              </span>
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
                                Proposer un échange →
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
              <div>
                <p className="text-sm text-muted-foreground">
                  Aucune mission publiée près de chez vous.
                </p>
                <Link to="/petites-missions/creer" className="text-sm text-primary underline mt-1 inline-block">
                  Publiez la vôtre →
                </Link>
              </div>
            )}

            {/* ═══ Section 2 — Disponibles pour aider ═══ */}
            {(helperCount > 0 || isAuthenticated) && (
              <div className="mt-10">
                {/* Toggle dispo */}
                {isAuthenticated && (
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
                          : "Indiquez-vous comme disponible pour aider"}
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
                  Disponibles pour aider
                  <span className="text-xs font-normal bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                    {helperCount} personne{helperCount > 1 ? "s" : ""} du coin
                  </span>
                </h2>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredHelpers.map((h: any) => {
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
                            {h.review_count > 0 ? `${h.review_avg.toFixed(1)} · ` : ""}{h.sits_count} garde{h.sits_count > 1 ? "s" : ""}
                          </p>
                        )}
                        {/* Competences spécifiques (priorité) puis catégories */}
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
                  })}
                </div>
              </div>
            )}
          </section>

          {(!allMissions || allMissions.length === 0) && (
            <section className="text-center space-y-6 max-w-3xl mx-auto">
              <h1 className="font-heading text-4xl md:text-5xl font-bold text-foreground">
                Petites missions — L'entraide entre gens du coin, version Guardiens
              </h1>
            </section>
          )}

          <section className="text-left space-y-4 text-muted-foreground max-w-3xl mx-auto">
            <p>
              Chez Guardiens, tout a commencé par un coup de main. Promener un chien, nourrir des chats le temps d'un week-end, arroser un jardin. Avant les gardes longues, il y avait ces petits gestes — et c'est eux qui ont créé la confiance.
            </p>
            <p>
              Les petites missions, c'est ce même esprit. Vous avez besoin d'un coup de main avec vos animaux, votre jardin ? Quelqu'un du coin est là. Pas contre de l'argent — contre un bon repas, des tomates du jardin, ou simplement le plaisir de se rendre service.
            </p>
          </section>

          {/* Exemples par catégorie — sans Maison */}
          <section className="space-y-8">
            <h2 className="font-heading text-2xl font-bold text-foreground text-center">Exemples de missions</h2>
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

          {/* Comment ça marche — une seule occurrence */}
          <section className="space-y-8">
            <h2 className="font-heading text-2xl font-bold text-foreground text-center">Comment ça marche</h2>
            <div className="grid md:grid-cols-3 gap-6">
              {[
                { step: "1", title: "Poster votre mission", desc: "Décrivez ce dont vous avez besoin et ce que vous proposez en échange." },
                { step: "2", title: "Quelqu'un répond", desc: "Un membre du coin vous propose son aide. Échangez en messagerie." },
                { step: "3", title: "Rendez-vous et entraidez-vous", desc: "Vous vous rencontrez, vous vous aidez, et souvent ça finit autour d'un café." },
              ].map((s) => (
                <div key={s.step} className="text-center space-y-2">
                  <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center mx-auto font-bold">
                    {s.step}
                  </div>
                  <h3 className="font-heading font-semibold text-foreground">{s.title}</h3>
                  <p className="text-sm text-muted-foreground">{s.desc}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Encart pédagogique */}
          <section className="rounded-2xl p-6 md:p-8 text-center space-y-4 border border-border bg-muted">
            <h2 className="font-heading text-xl font-bold text-foreground">L'entraide, c'est l'esprit Guardiens</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Les petites missions, c'est l'entraide entre gens du coin. Pas de l'argent, pas du travail — du lien.
              Proposez un coup de main, l'autre vous offre un bon repas, des légumes du jardin, ou simplement sa gratitude.
              C'est comme ça qu'on a commencé : un chien à promener, un café qui s'éternise, et une amitié qui dure.
            </p>
          </section>

          {/* CTA */}
          <section className="text-center space-y-4 py-8">
            <p className="text-lg text-muted-foreground max-w-xl mx-auto">
              Rejoignez une communauté qui s'entraide — pas une marketplace.
            </p>
            {isAuthenticated ? (
              <Link to="/petites-missions/creer">
                <Button variant="hero" size="xl">
                  Poster une petite mission
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
                areaServed: { "@type": "AdministrativeArea", name: "Auvergne-Rhône-Alpes" },
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
            <DialogTitle className="font-heading text-lg">Proposer mon aide</DialogTitle>
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
