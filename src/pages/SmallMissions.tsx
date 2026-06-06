import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowRight, X, MapPin } from "lucide-react";
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
import { haversineDistance } from "@/lib/geocode";

import {
  CategoryFilter, ModeFilter, MISSION_TO_SKILL, SKILL_TO_MISSION, formatCity,
} from "@/components/missions/connected/constants";
import MissionsHero from "@/components/missions/connected/MissionsHero";
import MissionsArticlesStrip from "@/components/missions/connected/MissionsArticlesStrip";
import MissionsFilterBar from "@/components/missions/connected/MissionsFilterBar";
import MissionCard from "@/components/missions/connected/MissionCard";
import HelperCard from "@/components/missions/connected/HelperCard";
import ExamplesSection from "@/components/missions/connected/ExamplesSection";
import OfferDialog from "@/components/missions/connected/OfferDialog";
import { geocodeCached, useEntityCoords } from "@/hooks/missions/useGeocodedCoords";
import { useAllMissions, useAvailableHelpers } from "@/hooks/missions/useMissionsData";
import { trackEvent } from "@/lib/analytics";
import { useScrollDepthTracker } from "@/hooks/useScrollDepthTracker";

/**
 * Cohorte before/after pour mesurer l'impact de l'ajout de la mini-bio sur MissionCard.
 * Cette constante n'altère pas le rendu — elle sert uniquement à étiqueter les
 * événements analytics pour comparer pré-release vs post-release côté requête.
 * Bump la date si la copy ou le format change (nouvelle cohorte).
 */
const BIO_RELEASE_TAG = "mission_card_bio_v1_2026_05_17";

const SmallMissions = () => {
  const { isAuthenticated, user, switchRole } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { } = useSubscriptionAccess();
  const { level: accessLevel, profileCompletion, canApplyMissions } = useAccessLevel();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialMode: ModeFilter = (searchParams.get("type") === "offre" || searchParams.get("mode") === "offer") ? "offer" : "need";
  const initialCat = (searchParams.get("cat") as CategoryFilter) || "all";
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>(initialCat);
  const [mode, setMode] = useState<ModeFilter>(initialMode);
  const [dialogMission, setDialogMission] = useState<any>(null);
  const [dialogTarget, setDialogTarget] = useState<{ id: string; name: string } | null>(null);
  const [skillPromptDismissed, setSkillPromptDismissed] = useState(() => {
    try { return localStorage.getItem("guardiens_skill_prompt_dismissed") === "true"; } catch { return false; }
  });
  const [, setContactingHelperId] = useState<string | null>(null);
  const [helperDialogTarget, setHelperDialogTarget] = useState<any>(null);

  // ── User profile query ──
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
  const initialRadius = Number(searchParams.get("radius") || "0");
  const [radiusKm, setRadiusKm] = useState(Number.isFinite(initialRadius) ? initialRadius : 0);
  const [originCoords, setOriginCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [geocodingOrigin, setGeocodingOrigin] = useState(false);

  const [competenceSearch, setCompetenceSearch] = useState(searchParams.get("q") || "");

  // ── Sync filters → URL ──
  useEffect(() => {
    const next = new URLSearchParams(searchParams);
    if (categoryFilter !== "all") next.set("cat", categoryFilter); else next.delete("cat");
    if (mode === "offer") next.set("mode", "offer"); else next.delete("mode");
    if (radiusKm > 0) next.set("radius", String(radiusKm)); else next.delete("radius");
    if (competenceSearch.trim()) next.set("q", competenceSearch.trim()); else next.delete("q");
    next.delete("type");
    setSearchParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryFilter, mode, radiusKm, competenceSearch]);

  // ── Offer dialog state ──
  const [offerDialogOpen, setOfferDialogOpen] = useState(false);
  const [offerSkills, setOfferSkills] = useState<string[]>([]);
  const [offerText, setOfferText] = useState("");
  const [offerCompetences, setOfferCompetences] = useState<string[]>([]);
  const [offerValidatedLabels, setOfferValidatedLabels] = useState<string[]>([]);
  const [offerSaving, setOfferSaving] = useState(false);
  const [offerSaved, setOfferSaved] = useState(false);

  useEffect(() => {
    supabase.from("competences_validees").select("label").then(({ data }) => {
      setOfferValidatedLabels((data || []).map((d: any) => d.label));
    });
  }, []);

  const openOfferDialog = useCallback(async () => {
    const existing: string[] = (currentUserProfile as any)?.skill_categories || [];
    const existingCustom: string[] = (currentUserProfile as any)?.custom_skills || [];
    setOfferSkills(existing.length > 0 ? [...existing] : []);
    setOfferText(existingCustom.length > 0 ? existingCustom[0] : "");
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
    setOfferSkills((prev) => prev.includes(key) ? prev.filter((s) => s !== key) : [...prev, key]);
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
      updates.custom_skills = offerText.trim() ? [offerText.trim()] : [];
      await supabase.from("profiles").update(updates).eq("id", user.id);
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
        if (!searchParams.get("radius")) setRadiusKm(30);
      } else if (p?.city) {
        setPostalCodeInput(p.city);
        setGeocodingOrigin(true);
        const coords = await geocodeCached(p.city);
        setOriginCoords(coords);
        setGeocodingOrigin(false);
        if (!searchParams.get("radius")) setRadiusKm(30);
      }
    })();
  }, [user]);

  const handlePostalCodeSearch = useCallback(async () => {
    if (!postalCodeInput.trim()) { setOriginCoords(null); return; }
    setGeocodingOrigin(true);
    const coords = await geocodeCached(postalCodeInput.trim());
    setOriginCoords(coords);
    setGeocodingOrigin(false);
  }, [postalCodeInput]);

  const handleContactHelper = useCallback(async (helperId: string) => {
    if (!isAuthenticated || !user) { navigate("/inscription"); return; }
    if (helperId === user.id) return;
    setContactingHelperId(helperId);
    try {
      const { startConversationAndNavigate } = await import("@/lib/conversation");
      switchRole("owner");
      await startConversationAndNavigate(
        { otherUserId: helperId, context: "helper_inquiry" },
        navigate,
      );
    } finally {
      setContactingHelperId(null);
    }
  }, [isAuthenticated, user, navigate, switchRole]);
  void handleContactHelper;

  const { data: allMissions, isLoading: missionsLoading } = useAllMissions(user?.id);
  const { data: availableHelpers, isLoading: helpersLoading } = useAvailableHelpers(user?.id, isAuthenticated);

  // ── Realtime: refresh missions list on any small_missions change ──
  useEffect(() => {
    const channel = supabase
      .channel("small-missions-list")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "small_missions" },
        () => { queryClient.invalidateQueries({ queryKey: ["small-missions-all"] }); },
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  const normalizedSearch = competenceSearch.toLowerCase().trim();

  // ── Pagination ──
  const PAGE_SIZE = 12;
  const [visibleMissions, setVisibleMissions] = useState(PAGE_SIZE);
  const [visibleHelpers, setVisibleHelpers] = useState(PAGE_SIZE);
  // Reset pagination when filters change
  useEffect(() => { setVisibleMissions(PAGE_SIZE); setVisibleHelpers(PAGE_SIZE); }, [categoryFilter, mode, radiusKm, normalizedSearch]);

  const missionCoords = useEntityCoords(allMissions as any[], { useDbCoords: true });
  const helperCoords = useEntityCoords(availableHelpers as any[], { useDbCoords: true });

  const filteredMissionsWithZone = useMemo(() => {
    return (allMissions || [])
      .filter((m: any) => {
        if (categoryFilter === "mine") return m.user_id === user?.id;
        if (m.status === "completed" || m.status === "cancelled") return false;
        if (categoryFilter !== "all" && m.category !== categoryFilter) return false;
        if (normalizedSearch) {
          const titleMatch = m.title?.toLowerCase().includes(normalizedSearch);
          const descMatch = m.description?.toLowerCase().includes(normalizedSearch);
          const exchangeMatch = m.exchange_offer?.toLowerCase().includes(normalizedSearch);
          if (!titleMatch && !descMatch && !exchangeMatch) return false;
        }
        return true;
      })
      .map((m: any) => {
        let distance: number | null = null;
        let outOfZone = false;
        if (originCoords) {
          const mc = missionCoords.get(m.id);
          if (mc) {
            distance = haversineDistance(originCoords.lat, originCoords.lng, mc.lat, mc.lng);
            if (radiusKm > 0 && distance > radiusKm) outOfZone = true;
          }
        }
        return { ...m, _distance: distance, _outOfZone: outOfZone };
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

  const filteredMissions = useMemo(
    () => filteredMissionsWithZone.filter((m: any) => !m._outOfZone),
    [filteredMissionsWithZone],
  );
  const outOfZoneMissions = useMemo(
    () => filteredMissionsWithZone
      .filter((m: any) => m._outOfZone)
      .sort((a: any, b: any) => (a._distance ?? 9999) - (b._distance ?? 9999)),
    [filteredMissionsWithZone],
  );

  const filteredHelpers = useMemo(() => {
    return (availableHelpers || []).filter((h: any) => {
      if (categoryFilter !== "all" && categoryFilter !== "mine") {
        const skillKey = MISSION_TO_SKILL[categoryFilter];
        if (!h.skill_categories?.includes(skillKey)) return false;
      }
      if (originCoords && radiusKm > 0) {
        const hc = helperCoords.get(h.id);
        if (hc) {
          const dist = haversineDistance(originCoords.lat, originCoords.lng, hc.lat, hc.lng);
          if (dist > radiusKm) return false;
        }
      }
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

  // Préférence d'affichage : mini-bio compacte (1 ligne, ~80 car.) vs étendue (2 lignes).
  // Persistée localement pour respecter le choix de l'utilisateur entre sessions.
  const [compactBio, setCompactBio] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem("missions:compactBio") === "1";
  });
  useEffect(() => {
    try { window.localStorage.setItem("missions:compactBio", compactBio ? "1" : "0"); } catch { /* quota */ }
  }, [compactBio]);

  // ---------------------------------------------------------------------------
  // Mesure before/after : impact de la mini-bio sur MissionCard.
  // Plus de bucketing A/B (trafic trop faible pour atteindre la significativité).
  // Tous les utilisateurs voient la bio (showBio = true). On compare les KPI
  // pré-release vs post-release via le tag de cohorte `BIO_RELEASE_TAG`.
  // Événements :
  //   - exp_mission_bio_exposure : 1 fois par session/page (release)
  //   - exp_mission_bio_click    : à chaque clic carte (release, position, hasBio)
  //   - exp_mission_bio_scroll   : scroll max % à la sortie de page (release, isMobile)
  // ---------------------------------------------------------------------------
  const showBio = true;

  const exposureFiredRef = useRef(false);
  useEffect(() => {
    if (exposureFiredRef.current) return;
    if (missionCount === 0) return;
    exposureFiredRef.current = true;
    void trackEvent("exp_mission_bio_exposure", {
      source: "small_missions",
      metadata: { release: BIO_RELEASE_TAG, mission_count: missionCount },
    });
  }, [missionCount]);

  const isMobile = typeof window !== "undefined" && window.matchMedia("(max-width: 640px)").matches;
  useScrollDepthTracker(
    (maxPct) => {
      void trackEvent("exp_mission_bio_scroll", {
        source: "small_missions",
        metadata: { release: BIO_RELEASE_TAG, max_scroll_pct: maxPct, is_mobile: isMobile },
      });
    },
    missionCount > 0
  );

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

  const renderHelperCard = useCallback((h: any) => (
    <HelperCard
      key={`h-${h.id}`}
      helper={h}
      onPropose={() => {
        if (!isAuthenticated) { navigate("/inscription"); return; }
        setHelperDialogTarget(h);
      }}
      onViewProfile={() => navigate(`/gardiens/${h.id}`)}
    />
  ), [isAuthenticated, navigate]);

  // Paginated slices
  const visibleMissionsList = useMemo(() => filteredMissions.slice(0, visibleMissions), [filteredMissions, visibleMissions]);
  const visiblePriorityHelpers = useMemo(() => priorityHelpers.slice(0, visibleHelpers), [priorityHelpers, visibleHelpers]);
  const remainingHelperBudget = Math.max(0, visibleHelpers - visiblePriorityHelpers.length);
  const visibleComplementaryHelpers = useMemo(() => complementaryHelpers.slice(0, remainingHelperBudget), [complementaryHelpers, remainingHelperBudget]);
  const totalHelpersShown = visiblePriorityHelpers.length + visibleComplementaryHelpers.length;
  const totalHelpersAvailable = priorityHelpers.length + complementaryHelpers.length;

  return (
    <>
      <PageMeta
        title="Petites missions — Entre gens du coin | Guardiens"
        description="Des coups de main, des échanges, des compétences. Entre gens du coin qui se choisissent."
        noindex
      />

      <div className="min-h-screen bg-background">
        <MissionsHero
          missionCount={(allMissions || []).filter((m: any) => m.status === "open" || m.status === "in_progress").length}
          helperCount={(availableHelpers || []).length}
          onPropose={() => {
            if (!isAuthenticated) { navigate("/inscription?redirect=/petites-missions"); return; }
            openOfferDialog();
          }}
        />

        <main className="max-w-6xl mx-auto px-4 py-8 md:py-10 pb-28 md:pb-10 space-y-12">
          <section className="space-y-6">
            {isAuthenticated && !canApplyMissions && (
              <div className="flex justify-center">
                <Button variant="hero" size="lg" disabled className="gap-1">
                  Complétez votre profil pour publier
                </Button>
              </div>
            )}

            <div className="flex items-center justify-center">
              <div className="inline-flex items-center gap-1 bg-muted rounded-lg p-1" role="tablist" aria-label="Filtrer la liste">
                <button
                  role="tab"
                  aria-selected={mode === "need"}
                  onClick={() => setMode("need")}
                  className={`px-4 py-2 text-sm rounded-md transition-colors ${mode === "need" ? "bg-background text-foreground shadow-sm font-medium" : "text-muted-foreground hover:text-foreground"}`}
                >
                  Je cherche un coup de main
                </button>
                <button
                  role="tab"
                  aria-selected={mode === "offer"}
                  onClick={() => setMode("offer")}
                  className={`px-4 py-2 text-sm rounded-md transition-colors ${mode === "offer" ? "bg-background text-foreground shadow-sm font-medium" : "text-muted-foreground hover:text-foreground"}`}
                >
                  J'offre mon aide
                </button>
              </div>
            </div>
            {isAuthenticated && accessLevel === 1 && (
              <AccessGateBanner level={accessLevel} profileCompletion={profileCompletion} context="mission" />
            )}

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

            <MissionsFilterBar
              postalCodeInput={postalCodeInput}
              setPostalCodeInput={setPostalCodeInput}
              onPostalCodeSearch={handlePostalCodeSearch}
              geocodingOrigin={geocodingOrigin}
              radiusKm={radiusKm}
              setRadiusKm={setRadiusKm}
              competenceSearch={competenceSearch}
              setCompetenceSearch={setCompetenceSearch}
              categoryFilter={categoryFilter}
              setCategoryFilter={setCategoryFilter}
            />

            {/* ═══ Section 1 — Demandes visibles (HERO) ═══ */}
            <div className="flex items-center gap-3 mb-2">
              <span className="h-8 w-1.5 rounded-full bg-primary" aria-hidden />
              <h2 className="text-xl md:text-2xl font-heading font-bold text-foreground leading-tight">
                {mode === "offer" ? "Demandes à aider" : "Demandes publiées près de chez vous"}
              </h2>
              {missionCount > 0 && (
                <span className="text-xs font-semibold bg-primary/10 text-primary px-2.5 py-1 rounded-full">
                  {missionCount} demande{missionCount > 1 ? "s" : ""}
                </span>
              )}
            </div>
            {missionCount > 0 && (
              <label className="flex items-center gap-2 mb-4 text-xs text-muted-foreground cursor-pointer select-none">
                <Switch
                  checked={compactBio}
                  onCheckedChange={setCompactBio}
                  aria-label="Afficher les bios en version compacte"
                />
                <span>Bios compactes (1 ligne)</span>
              </label>
            )}

            {missionsLoading ? (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Card key={`m-skel-${i}`} className="border-border">
                    <CardContent className="p-4 space-y-3">
                      <Skeleton className="h-3 w-20" />
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                      <Skeleton className="h-3 w-2/3" />
                      <Skeleton className="h-9 w-full mt-2" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : missionCount > 0 ? (
              <>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {visibleMissionsList.map((m: any, idx: number) => (
                    <MissionCard
                      key={`m-${m.id}`}
                      mission={m}
                      currentUserId={user?.id}
                      isAuthenticated={isAuthenticated}
                      canApplyMissions={canApplyMissions}
                      mode={mode}
                      compactBio={compactBio}
                      showBio={showBio}
                      onNavigateDetail={() => {
                        const hasBio = Boolean(((m.profiles as any)?.bio || "").trim());
                        void trackEvent("exp_mission_bio_click", {
                          source: "small_missions",
                          metadata: { release: BIO_RELEASE_TAG, has_bio: hasBio, position: idx, mission_id: m.id },
                        });
                        navigate(isAuthenticated ? `/petites-missions/${m.id}` : "/inscription");
                      }}
                      onPropose={() => {
                        if (!isAuthenticated) { navigate("/inscription"); return; }
                        setDialogMission(m);
                        setDialogTarget({ id: m.user_id, name: (m.profiles as any)?.first_name || "ce membre" });
                      }}
                    />
                  ))}
                </div>
                {missionCount > visibleMissions && (
                  <div className="flex justify-center pt-4">
                    <Button variant="outline" onClick={() => setVisibleMissions((n) => n + PAGE_SIZE)}>
                      Voir plus de demandes ({missionCount - visibleMissions} restantes)
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <div className="rounded-2xl border border-dashed border-primary/30 bg-primary/5 p-8 text-center space-y-3">
                <p className="font-heading text-lg font-semibold text-foreground">
                  {mode === "offer"
                    ? `Aucune demande à moins de ${radiusKm || 25} km de chez vous.`
                    : `Personne n'a encore osé à moins de ${radiusKm || 25} km de chez vous.`}
                </p>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                  {outOfZoneMissions.length > 0 ? (
                    <>
                      <strong className="text-foreground">Bonne nouvelle :</strong> {outOfZoneMissions.length} demande{outOfZoneMissions.length > 1 ? "s sont visibles" : " est visible"} un peu plus loin ↓
                    </>
                  ) : mode === "offer" ? (
                    "Rendez-vous visible : indiquez vos disponibilités juste en dessous. Quand une demande arrivera, vous serez la première personne à qui l'on pense."
                  ) : (
                    "Soyez la première personne à publier. Une demande d'aujourd'hui, c'est des gens du coin qui la voient demain — et souvent une rencontre qui change la semaine."
                  )}
                </p>
                <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                  {mode === "need" && (
                    <Link to="/petites-missions/creer" className="inline-block">
                      <Button variant="hero" size="lg">
                        J'ose, je publie ma demande
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </Link>
                  )}
                  {mode === "offer" && (
                    <Button variant="hero" size="lg" onClick={openOfferDialog}>
                      J'ai du temps à offrir
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  )}
                  {radiusKm > 0 && (
                    <Button variant="outline" size="lg" onClick={() => setRadiusKm(0)}>
                      Élargir à la France entière
                    </Button>
                  )}
                </div>
              </div>
            )}

            {/* ═══ Section 1bis — Hors périmètre ═══ */}
            {outOfZoneMissions.length > 0 && (
              <div className="mt-8 rounded-2xl border-2 border-primary/30 bg-gradient-to-br from-primary/10 to-primary/5 p-5 shadow-sm">
                <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
                  <div className="flex items-start gap-3">
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary/15 text-primary shrink-0">
                      <MapPin className="h-5 w-5" />
                    </span>
                    <div>
                      <h3 className="font-heading text-base font-semibold text-foreground">
                        {outOfZoneMissions.length} {outOfZoneMissions.length > 1 ? "autres demandes existent" : "autre demande existe"} un peu plus loin
                      </h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Au-delà de votre périmètre actuel ({radiusKm} km). Élargissez pour les voir toutes.
                      </p>
                    </div>
                  </div>
                  <Button variant="hero" size="sm" onClick={() => setRadiusKm(0)}>
                    Élargir à la France entière
                    <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                  </Button>
                </div>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {outOfZoneMissions.slice(0, 6).map((m: any, idx: number) => (
                    <div key={`oz-${m.id}`} className="relative">
                      <span className="absolute top-2 left-2 z-10 inline-flex items-center gap-1 bg-background/95 backdrop-blur-sm rounded-full px-2.5 py-1 text-[11px] font-semibold text-foreground shadow-sm border border-border">
                        {formatCity((m.profiles as any)?.city) || "Ailleurs"}
                        {m._distance != null && (
                          <span className="text-muted-foreground"> · {Math.round(m._distance)} km</span>
                        )}
                      </span>
                      <div className="opacity-90">
                        <MissionCard
                          mission={m}
                          currentUserId={user?.id}
                          isAuthenticated={isAuthenticated}
                          canApplyMissions={canApplyMissions}
                          mode={mode}
                          compactBio={compactBio}
                          showBio={showBio}
                          onNavigateDetail={() => navigate(isAuthenticated ? `/petites-missions/${m.id}` : "/inscription")}
                          onPropose={() => {
                            if (!isAuthenticated) { navigate("/inscription"); return; }
                            setDialogMission(m);
                            setDialogTarget({ id: m.user_id, name: (m.profiles as any)?.first_name || "ce membre" });
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ═══ Section 2 — Membres disponibles (secondaire) ═══ */}
            {(helperCount > 0 || isAuthenticated) && (
              <div className="mt-12 pt-8 border-t border-border">
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
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Et aussi</p>
                <h3 className="text-base font-semibold text-foreground mb-4 flex items-center gap-2">
                  {mode === "need" ? "Membres disponibles pour aider" : "Autres membres disponibles"}
                  <span className="text-xs font-normal bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                    {helperCount} personne{helperCount > 1 ? "s" : ""} du coin
                  </span>
                </h3>
                <div className="space-y-8">
                  {helpersLoading ? (
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {Array.from({ length: 6 }).map((_, i) => (
                        <div key={`h-skel-${i}`} className="rounded-2xl border border-primary/20 bg-card p-5 space-y-3">
                          <Skeleton className="h-5 w-32 rounded-full" />
                          <div className="flex items-center gap-3">
                            <Skeleton className="h-10 w-10 rounded-full" />
                            <div className="space-y-2">
                              <Skeleton className="h-4 w-24" />
                              <Skeleton className="h-3 w-16" />
                            </div>
                          </div>
                          <Skeleton className="h-3 w-3/4" />
                          <Skeleton className="h-8 w-full" />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <>
                      {visiblePriorityHelpers.length > 0 && (
                        <div className="space-y-3">
                          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {visiblePriorityHelpers.map(renderHelperCard)}
                          </div>
                        </div>
                      )}

                      {visibleComplementaryHelpers.length > 0 && (
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
                            {visibleComplementaryHelpers.map(renderHelperCard)}
                          </div>
                        </div>
                      )}

                      {totalHelpersAvailable > totalHelpersShown && (
                        <div className="flex justify-center pt-2">
                          <Button variant="outline" onClick={() => setVisibleHelpers((n) => n + PAGE_SIZE)}>
                            Voir plus de personnes ({totalHelpersAvailable - totalHelpersShown} restantes)
                          </Button>
                        </div>
                      )}

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
                          <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                            {mode === "need" && (
                              <Link to="/petites-missions/creer" className="inline-block">
                                <Button variant="hero" size="lg">
                                  J'ose, je publie ma demande
                                  <ArrowRight className="ml-2 h-4 w-4" />
                                </Button>
                              </Link>
                            )}
                            {radiusKm > 0 && (
                              <Button variant="outline" size="lg" onClick={() => setRadiusKm(0)}>
                                Élargir à la France entière
                              </Button>
                            )}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}
          </section>

          {missionCount === 0 && helperCount === 0 && <ExamplesSection />}

          <MissionsArticlesStrip />
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

        {/* Sticky CTA mobile — masqué quand l'empty-state expose déjà sa CTA
            (item 8 : éviter 4 boutons verts empilés sur mobile). */}
        {(missionCount > 0 || helperCount > 0) && (
          <div className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <Button
              variant="hero"
              size="lg"
              className="w-full"
              onClick={() => {
                if (!isAuthenticated) { navigate("/inscription?redirect=/petites-missions/creer"); return; }
                if (!canApplyMissions) return;
                navigate("/petites-missions/creer");
              }}
              disabled={isAuthenticated && !canApplyMissions}
            >
              {mode === "offer" ? "Proposer mon aide" : "Publier ma demande"}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

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

      <OfferDialog
        open={offerDialogOpen}
        onOpenChange={setOfferDialogOpen}
        saved={offerSaved}
        saving={offerSaving}
        offerSkills={offerSkills}
        toggleOfferSkill={toggleOfferSkill}
        offerCompetences={offerCompetences}
        validatedLabels={offerValidatedLabels}
        onAddCompetence={handleAddOfferCompetence}
        onRemoveCompetence={handleRemoveOfferCompetence}
        offerText={offerText}
        setOfferText={setOfferText}
        onSave={handleSaveOffer}
      />
    </>
  );
};

export default SmallMissions;
