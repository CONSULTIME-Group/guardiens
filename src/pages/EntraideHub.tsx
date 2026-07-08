import { useEffect, useMemo, useState, useRef } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { format, formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import PageMeta from "@/components/PageMeta";
import PublicHeader from "@/components/layout/PublicHeader";
import PageBreadcrumb from "@/components/seo/PageBreadcrumb";
import CategoryPills from "@/components/community/CategoryPills";
import QuestionCard from "@/components/community/QuestionCard";
import { useCommunityQuestions } from "@/hooks/useCommunityQuestions";
import type { CommunityCategory } from "@/lib/communityCategories";
import { DEPT_NAMES, getDeptCode } from "@/lib/departments";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import MissionCardCover from "@/components/missions/MissionCardCover";
import ProximityFilter from "@/components/missions/ProximityFilter";
import EntraideGeolocBanner from "@/components/missions/EntraideGeolocBanner";
import { sanitizeUserTitle } from "@/lib/sanitizeTitle";
import { useMissionDistance } from "@/hooks/useMissionDistance";
import { trackEvent } from "@/lib/analytics";
import MobileEntraideFeed from "@/components/community/MobileEntraideFeed";


type Tab = "questions" | "besoins" | "offres";
type MissionStatus = "all" | "open" | "in_progress" | "completed";
type MissionSort = "recent" | "date_needed" | "distance";

const MISSION_CATEGORY_LABEL: Record<string, string> = {
  animals: "Animaux",
  garden: "Jardin",
  house: "Maison",
  errand: "Courses",
  tech: "Technique",
  company: "Compagnie",
  other: "Autre",
};

const MISSION_CATEGORIES = ["all", "animals", "garden", "house", "errand", "tech", "company", "other"] as const;
const PAGE_SIZE = 20;

interface MissionRow {
  id: string;
  title: string;
  description: string | null;
  category: string;
  city: string | null;
  postal_code: string | null;
  created_at: string;
  date_needed: string | null;
  end_date: string | null;
  duration_estimate: string | null;
  status: string;
  mission_type: "besoin" | "offre" | null;
  user_id: string;
  photos?: string[] | null;
  profiles?: { first_name: string | null; avatar_url: string | null } | null;
}

const TAB_META: Record<
  Tab,
  {
    label: string;
    short: string;
    title: string;
    description: string;
    how: string[];
    accent: "primary" | "secondary" | "accent";
  }
> = {
  questions: {
    label: "Questions",
    short: "Questions",
    title: "Questions à la communauté",
    description:
      "Comportement animal, jardin, garde, bricolage. Posez votre question, recevez plusieurs avis.",
    how: [
      "Vous posez une question publique, courte et précise.",
      "Plusieurs membres répondent en commentaire, sans engagement.",
      "Vous marquez la meilleure réponse quand le sujet est résolu.",
    ],
    accent: "primary",
  },
  besoins: {
    label: "Coups de main demandés",
    short: "Demandes",
    title: "Coups de main demandés",
    description:
      "Les gens du coin qui cherchent un peu d'aide ponctuelle.",
    how: [
      "Vous publiez votre demande (catégorie, ville, créneau).",
      "Une personne du coin se propose en message privé.",
      "Vous convenez ensemble du jour et de la contrepartie éventuelle.",
    ],
    accent: "secondary",
  },
  offres: {
    label: "Coups de main proposés",
    short: "Offres",
    title: "Coups de main proposés",
    description:
      "Celles et ceux qui proposent leur temps ou leurs compétences gratuitement, près de chez vous.",
    how: [
      "Vous décrivez ce que vous savez faire et vos disponibilités.",
      "Les personnes intéressées vous contactent en privé.",
      "Vous validez ensemble la date et le cadre de l'aide.",
    ],
    accent: "accent",
  },
};

const VALID_TABS: Tab[] = ["questions", "besoins", "offres"];
const VALID_Q_CATS = ["all", "animaux", "jardin", "maison", "garde", "autre"] as const;
const VALID_Q_STATUS = ["all", "open", "resolved"] as const;
const VALID_M_STATUS: MissionStatus[] = ["all", "open", "in_progress", "completed"];
const VALID_M_SORT: MissionSort[] = ["recent", "date_needed", "distance"];

const M_STATUS_LABEL: Record<MissionStatus, string> = {
  all: "Tous statuts",
  open: "Ouvertes",
  in_progress: "En cours",
  completed: "Terminées",
};

const M_SORT_LABEL: Record<MissionSort, string> = {
  recent: "Plus récentes",
  date_needed: "Date la plus proche",
  distance: "Proches d'abord",
};

const formatDateNeeded = (d: string | null) => {
  if (!d) return null;
  try {
    return format(new Date(d), "d MMM yyyy", { locale: fr });
  } catch {
    return null;
  }
};

// Retourne une période lisible :
//  - start + end : « Du 5 juil. au 12 sept. 2026 »
//  - end seul    : « Jusqu'au 12 sept. 2026 »
//  - start seul  : « Pour le 5 juil. 2026 »
const formatMissionPeriod = (start: string | null, end: string | null) => {
  const fmtShort = (iso: string) => {
    try { return format(new Date(iso), "d MMM yyyy", { locale: fr }); } catch { return null; }
  };
  if (start && end) {
    const s = fmtShort(start); const e = fmtShort(end);
    if (s && e) return { prefix: "Du ", value: `${s} au ${e}` };
  }
  if (end) {
    const e = fmtShort(end);
    if (e) return { prefix: "Jusqu'au ", value: e };
  }
  if (start) {
    const s = fmtShort(start);
    if (s) return { prefix: "Pour le ", value: s };
  }
  return null;
};

const formatRelative = (iso: string) => {
  try {
    return formatDistanceToNow(new Date(iso), { addSuffix: true, locale: fr });
  } catch {
    return "";
  }
};

const DURATION_LABEL: Record<string, string> = {
  quick: "Moins d'1 h",
  short: "1 à 2 h",
  medium: "Une demi-journée",
  long: "Une journée",
  several: "Plusieurs jours",
};

const EntraideHub = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [params, setParams] = useSearchParams();

  // Deep link : ?mode=offer → tab=offres, ?mode=need → tab=besoins
  const modeParam = params.get("mode");
  const mappedFromMode: Tab | null =
    modeParam === "offer" ? "offres" : modeParam === "need" ? "besoins" : null;
  const initialTab = mappedFromMode || (params.get("tab") as Tab) || "besoins";
  const [tab, setTab] = useState<Tab>(VALID_TABS.includes(initialTab) ? initialTab : "besoins");

  /* Onglet Questions */
  const initialQCat = params.get("cat") as CommunityCategory | "all" | null;
  const initialQStatus = params.get("status") as "all" | "open" | "resolved" | null;
  const [qCategory, setQCategory] = useState<CommunityCategory | "all">(
    initialQCat && (VALID_Q_CATS as readonly string[]).includes(initialQCat) ? initialQCat : "all",
  );
  const [qStatus, setQStatus] = useState<"all" | "open" | "resolved">(
    initialQStatus && (VALID_Q_STATUS as readonly string[]).includes(initialQStatus) ? initialQStatus : "all",
  );
  const { items: questions, loading: qLoading } = useCommunityQuestions({
    category: qCategory,
    status: qStatus,
    limit: 50,
  });

  /* Onglets Besoins / Offres */
  const [missions, setMissions] = useState<MissionRow[]>([]);
  const [mLoading, setMLoading] = useState(true);
  const initialMCat = params.get("cat") || "all";
  const [mCategory, setMCategory] = useState<string>(initialMCat);
  const initialMStatus = (params.get("status") as MissionStatus) || "open";
  const [mStatus, setMStatus] = useState<MissionStatus>(
    VALID_M_STATUS.includes(initialMStatus) ? initialMStatus : "open",
  );
  const initialSort = (params.get("sort") as MissionSort) || "recent";
  const [mSort, setMSort] = useState<MissionSort>(
    VALID_M_SORT.includes(initialSort) ? initialSort : "recent",
  );
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  /* Sync querystring */
  useEffect(() => {
    const next = new URLSearchParams(params);
    if (tab === "besoins") next.delete("tab");
    else next.set("tab", tab);

    next.delete("cat");
    next.delete("status");
    next.delete("sort");
    if (tab === "questions") {
      if (qCategory !== "all") next.set("cat", qCategory);
      if (qStatus !== "all") next.set("status", qStatus);
    } else {
      if (mCategory !== "all") next.set("cat", mCategory);
      if (mStatus !== "open") next.set("status", mStatus);
      if (mSort !== "recent") next.set("sort", mSort);
    }
    setParams(next, { replace: true });
    setVisibleCount(PAGE_SIZE);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, qCategory, qStatus, mCategory, mStatus, mSort]);

  /* Toggle "Mes publications" */
  const initialMine = params.get("mine") === "1";
  const [mineOnly, setMineOnly] = useState<boolean>(initialMine && isAuthenticated);

  useEffect(() => {
    const next = new URLSearchParams(params);
    if (mineOnly) next.set("mine", "1");
    else next.delete("mine");
    setParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mineOnly]);

  // Chantier 4 : fallback status=all si <20 missions en base
  const autoSwitchedStatusRef = useRef(false);
  const allStatusFallbackTrackedRef = useRef(false);
  useEffect(() => {
    const load = async () => {
      setMLoading(true);
      const { data } = await supabase
        .from("small_missions")
        .select(
          "id, title, description, category, city, postal_code, created_at, date_needed, end_date, duration_estimate, status, mission_type, user_id, photos, profiles:user_id(first_name, avatar_url)",
        )
        .in("status", ["open", "in_progress", "completed"] as any)
        .order("created_at", { ascending: false })
        .limit(120);
      const rows = (data || []) as unknown as MissionRow[];
      setMissions(rows);
      setMLoading(false);
      // Auto-switch vers "all" si moins de 20 missions ET user n'a pas forcé un statut
      if (!autoSwitchedStatusRef.current && rows.length < 20 && !params.get("status")) {
        autoSwitchedStatusRef.current = true;
        setMStatus("all");
        if (!allStatusFallbackTrackedRef.current) {
          allStatusFallbackTrackedRef.current = true;
          void trackEvent("entraide_all_status_default_used", { metadata: { missions_count: rows.length } });
        }
      }
    };
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Note : plus de bascule automatique vers Questions quand aucune mission ouverte.
  // L'utilisateur qui clique « Coup de main » dans la nav doit rester sur Demandes,
  // même vide — l'empty state guide l'action de publication.

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setCurrentUserId(data.user?.id ?? null));
  }, []);

  /* Filtre proximité (CP + rayon) */
  const proximity = useMissionDistance(missions);

  // Une mission est expirée seulement si sa date de FIN est passée.
  // Si `end_date` existe, on l'utilise ; sinon on retombe sur `date_needed`.
  const isMissionExpired = (m: MissionRow) => {
    const ref = m.end_date || m.date_needed;
    if (!ref) return false;
    try {
      const today = new Date(new Date().setHours(0, 0, 0, 0));
      return new Date(ref) < today;
    } catch { return false; }
  };
  const isMissionPast = (m: MissionRow) => m.status === "completed" || isMissionExpired(m);

  const sortMissions = (arr: MissionRow[]): MissionRow[] => {
    const applyPrimary = (list: MissionRow[]): MissionRow[] => {
      if (mSort === "date_needed") {
        return [...list].sort((a, b) => {
          if (!a.date_needed && !b.date_needed) return 0;
          if (!a.date_needed) return 1;
          if (!b.date_needed) return -1;
          return a.date_needed.localeCompare(b.date_needed);
        });
      }
      if (mSort === "distance" && proximity.active) {
        return [...list].sort((a, b) => {
          const da = proximity.getDistance(a.id);
          const db = proximity.getDistance(b.id);
          if (da == null && db == null) return 0;
          if (da == null) return 1;
          if (db == null) return -1;
          return da - db;
        });
      }
      return list;
    };
    // Chantier 8 : missions expirées en fin de liste quel que soit le tri
    const sorted = applyPrimary(arr);
    return [...sorted].sort((a, b) => {
      const ea = isMissionPast(a) ? 1 : 0;
      const eb = isMissionPast(b) ? 1 : 0;
      return ea - eb;
    });
  };

  const filteredMissions = useMemo(() => {
    const wantType: "besoin" | "offre" = tab === "offres" ? "offre" : "besoin";
    const filtered = missions.filter((m) => {
      if ((m.mission_type ?? "besoin") !== wantType) return false;
      if (mStatus !== "all" && m.status !== mStatus) return false;
      if (mCategory !== "all" && m.category !== mCategory) return false;
      if (mineOnly && currentUserId && m.user_id !== currentUserId) return false;
      if (proximity.active) {
        const d = proximity.getDistance(m.id);
        if (d == null || d > proximity.radius) return false;
      }
      return true;
    });
    return sortMissions(filtered);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [missions, tab, mCategory, mStatus, mineOnly, currentUserId, mSort, proximity.active, proximity.radius, proximity.getDistance]);

  const visibleMissions = filteredMissions.slice(0, visibleCount);

  const visibleQuestions = useMemo(() => {
    if (!mineOnly || !currentUserId) return questions;
    return questions.filter((q: any) => q.author_id === currentUserId);
  }, [questions, mineOnly, currentUserId]);

  // Totaux (mine-only seulement, sans filtres) pour afficher "filtré / total"
  const tabTotals: Record<Tab, number> = useMemo(() => {
    const filterByType = (type: "besoin" | "offre") =>
      missions.filter((m) => {
        if ((m.mission_type ?? "besoin") !== type) return false;
        if (mineOnly && currentUserId && m.user_id !== currentUserId) return false;
        return true;
      }).length;
    return {
      questions: visibleQuestions.length,
      besoins: filterByType("besoin"),
      offres: filterByType("offre"),
    };
  }, [missions, mineOnly, currentUserId, visibleQuestions.length]);

  const tabFiltered: Record<Tab, number> = {
    questions: visibleQuestions.length,
    besoins: tab === "besoins" ? filteredMissions.length : tabTotals.besoins,
    offres: tab === "offres" ? filteredMissions.length : tabTotals.offres,
  };

  const goAsk = () =>
    navigate(isAuthenticated ? "/questions/nouvelle" : "/inscription?redirect=/questions/nouvelle");
  const goNeed = () =>
    navigate(
      isAuthenticated
        ? "/petites-missions/creer?type=besoin"
        : "/inscription?redirect=/petites-missions/creer?type=besoin",
    );
  const goOffer = () =>
    navigate(
      isAuthenticated
        ? "/petites-missions/creer?type=offre"
        : "/inscription?redirect=/petites-missions/creer?type=offre",
    );

  const primaryCta =
    tab === "questions"
      ? { label: "Poser une question", action: goAsk }
      : tab === "besoins"
        ? { label: "Publier une demande", action: goNeed }
        : { label: "Proposer mon aide", action: goOffer };

  const meta = TAB_META[tab];
  const accentClasses: Record<Tab, { active: string; pill: string }> = {
    questions: { active: "bg-primary text-primary-foreground border-primary", pill: "bg-primary-foreground/20 text-primary-foreground" },
    besoins: { active: "bg-secondary text-secondary-foreground border-secondary", pill: "bg-secondary-foreground/15 text-secondary-foreground" },
    offres: { active: "bg-accent text-accent-foreground border-accent", pill: "bg-accent-foreground/15 text-accent-foreground" },
  };

  const hasMissionFilters = mCategory !== "all" || mStatus !== "open" || mSort !== "recent";
  const hasQuestionFilters = qCategory !== "all" || qStatus !== "all";

  const resetMissionFilters = () => {
    setMCategory("all");
    setMStatus("open");
    setMSort("recent");
  };
  const resetQuestionFilters = () => {
    setQCategory("all");
    setQStatus("all");
  };

  return (
    <>
      <PageMeta
        title="Entraide, questions et coups de main entre gens du coin, Guardiens"
        description="Posez une question, demandez un coup de main (garde animaux, jardin, promenade) ou proposez votre aide près de chez vous. Gratuit."
        path="/petites-missions"
      />
      <div className="min-h-screen bg-background">
        <PublicHeader />
        <PageBreadcrumb items={[{ label: "Entraide" }]} />

        <section className="max-w-3xl mx-auto px-4 sm:px-6 pt-4 pb-28 sm:pt-6 sm:pb-8 min-w-0">
          <EntraideGeolocBanner
            hasCoords={proximity.active}
            onUseMyLocation={proximity.useMyLocation}
          />
          {/* Header : H1 + sous-titre + badge + CTA principal en couleur pleine */}
          <div className="mb-5">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="font-heading text-2xl sm:text-3xl font-bold text-foreground">
                    Entraide
                  </h1>
                  <span className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full bg-primary/10 text-primary shrink-0">
                    Gratuit
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mt-1.5 max-w-xl">
                  Questions à la communauté, demandes et propositions de coups de main entre gens du coin.
                </p>
              </div>
              <Button onClick={primaryCta.action} size="sm" className="shrink-0 h-9">
                {primaryCta.label}
              </Button>
            </div>
          </div>

          {/* Chantier 5 Pass 3 : feed unifié mobile (md:hidden). */}
          <MobileEntraideFeed
            missions={missions}
            questions={questions as any}
            loading={mLoading || qLoading}
            onAsk={goAsk}
            onNeed={goNeed}
            onOffer={goOffer}
          />

          {/* Desktop : onglets classiques 3 tabs. */}
          <div className="hidden md:block">
          {/* Onglets pill, grille 3 colonnes, aucun scroll horizontal */}
          <div
            role="tablist"
            aria-label="Catégorie de contenu"
            className="mb-4 grid grid-cols-3 gap-1.5 sm:gap-2 p-1 rounded-2xl bg-muted/60"
          >
            {(Object.keys(TAB_META) as Tab[]).map((t) => {
              const isActive = tab === t;
              const a = accentClasses[t];
              const filtered = tabFiltered[t];
              const total = tabTotals[t];
              const showRatio = filtered !== total;
              return (
                <button
                  key={t}
                  role="tab"
                  id={`tab-${t}`}
                  aria-selected={isActive}
                  aria-controls={`panel-${t}`}
                  tabIndex={isActive ? 0 : -1}
                  onClick={() => setTab(t)}
                  className={`min-w-0 rounded-xl px-2 sm:px-3 py-2 border text-xs sm:text-sm font-semibold transition-colors flex items-center justify-center gap-1.5 ${
                    isActive
                      ? `${a.active} shadow-sm`
                      : "border-transparent text-muted-foreground hover:text-foreground hover:bg-background/60"
                  }`}
                >
                  <span className="truncate">{TAB_META[t].short}</span>
                  {total > 0 && (
                    <span
                      className={`shrink-0 text-[10px] sm:text-xs px-1.5 py-0.5 rounded-full font-medium tabular-nums ${
                        isActive ? a.pill : "bg-background/80 text-muted-foreground"
                      }`}
                      aria-label={showRatio ? `${filtered} affichés sur ${total} au total` : `${total} au total`}
                    >
                      {total}
                    </span>
                  )}
                </button>
              );
            })}
          </div>


          {/* Toggle Mes publications, discret sous les onglets */}
          {isAuthenticated && (
            <div className="mb-4 flex justify-end items-center gap-2">
              <span className="text-[11px] text-muted-foreground">Affichage :</span>
              <button
                type="button"
                onClick={() => setMineOnly((v) => !v)}
                aria-pressed={mineOnly}
                aria-label={mineOnly ? "Afficher toutes les publications" : "N'afficher que mes publications"}
                className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border transition-colors ${
                  mineOnly
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-transparent text-muted-foreground border-border/70 hover:bg-accent hover:text-foreground"
                }`}
              >
                {mineOnly ? "Mes publications ✓" : "Toutes"}
              </button>
            </div>
          )}

          <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>

            {/* Comment ça marche affiché uniquement dans les empty states ci-dessous */}

            {/* Onglet Questions */}
            {tab === "questions" && (
              <>
                <div className="space-y-3 mb-6">
                  <CategoryPills value={qCategory} onChange={setQCategory} />
                  <div className="flex items-center gap-2 flex-wrap" role="group" aria-label="Filtrer par statut">
                    {(["all", "open", "resolved"] as const).map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setQStatus(s)}
                        aria-pressed={qStatus === s}
                        className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${
                          qStatus === s
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-card text-muted-foreground border-border hover:bg-accent"
                        }`}
                      >
                        {s === "all" ? "Toutes" : s === "open" ? "Ouvertes" : "Résolues"}
                      </button>
                    ))}
                    {hasQuestionFilters && (
                      <button
                        type="button"
                        onClick={resetQuestionFilters}
                        className="ml-auto text-xs text-muted-foreground hover:text-foreground underline underline-offset-2"
                      >
                        Réinitialiser
                      </button>
                    )}
                  </div>
                </div>

                {qLoading ? (
                  <div className="space-y-3" aria-busy="true" aria-live="polite">
                    {[0, 1, 2, 3].map((i) => (
                      <div key={i} className="h-28 rounded-xl bg-muted/40 animate-pulse" />
                    ))}
                  </div>
                ) : visibleQuestions.length > 0 ? (
                  <ul className="space-y-3">
                    {visibleQuestions.map((q) => (
                      <li key={q.id}>
                        <QuestionCard q={q} />
                      </li>
                    ))}
                  </ul>
                ) : (
                  <EmptyState
                    title={
                      mineOnly
                        ? "Vous n'avez pas encore posé de question."
                        : hasQuestionFilters
                          ? "Aucune question avec ces filtres."
                          : "Aucune question pour le moment."
                    }
                    hint={
                      hasQuestionFilters
                        ? "Élargissez les filtres ou posez la première question de cette catégorie."
                        : "Soyez la première personne à lancer le sujet, ou inspirez-vous d'un exemple ci-dessous."
                    }
                    ctaLabel="Poser une question"
                    onCta={goAsk}
                    onReset={hasQuestionFilters ? resetQuestionFilters : undefined}
                    howSteps={meta.how}
                    examples={
                      !mineOnly && !hasQuestionFilters
                        ? [
                            { label: "Mon chat ne mange plus depuis 2 jours, dois-je m'inquiéter ?", cat: "animaux" },
                            { label: "Quel arrosage pour mes tomates pendant 10 jours d'absence ?", cat: "jardin" },
                            { label: "Comment réinitialiser le disjoncteur principal de la maison ?", cat: "maison" },
                          ]
                        : undefined
                    }
                    onExample={(ex) =>
                      navigate(
                        isAuthenticated
                          ? `/questions/nouvelle?cat=${ex.cat}&title=${encodeURIComponent(ex.label)}`
                          : `/inscription?redirect=${encodeURIComponent(`/questions/nouvelle?cat=${ex.cat}&title=${encodeURIComponent(ex.label)}`)}`,
                      )
                    }
                  />
                )}
              </>
            )}

            {/* Onglets Besoins / Offres */}
            {(tab === "besoins" || tab === "offres") && (
              <>
                {/* Bloc filtres unifié dans une card */}
                <div className="mb-6 rounded-2xl border border-border bg-card/50 p-3 sm:p-4 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Filtrer
                    </p>
                    {hasMissionFilters && (
                      <button
                        type="button"
                        onClick={resetMissionFilters}
                        className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2"
                      >
                        Réinitialiser
                      </button>
                    )}
                  </div>
                  <div className="relative -mx-3 sm:mx-0">
                    <div className="px-3 sm:px-0 overflow-x-auto scrollbar-none">
                      <div className="flex gap-2 w-max sm:w-auto sm:flex-wrap">
                        {MISSION_CATEGORIES.map((c) => (
                          <button
                            key={c}
                            type="button"
                            onClick={() => setMCategory(c)}
                            aria-pressed={mCategory === c}
                            className={`shrink-0 px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${
                              mCategory === c
                                ? "bg-primary text-primary-foreground border-primary"
                                : "bg-card text-muted-foreground border-border hover:bg-accent"
                            }`}
                          >
                            {c === "all" ? "Toutes catégories" : MISSION_CATEGORY_LABEL[c]}
                          </button>
                        ))}
                      </div>
                    </div>
                    {/* Fade edges mobile pour indiquer le scroll horizontal */}
                    <div className="sm:hidden pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-card/80 to-transparent rounded-r-2xl" aria-hidden="true" />
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Select value={mStatus} onValueChange={(v) => setMStatus(v as MissionStatus)}>
                      <SelectTrigger className="h-8 w-auto min-w-[140px] text-xs" aria-label="Filtrer par statut">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {VALID_M_STATUS.map((s) => (
                          <SelectItem key={s} value={s} className="text-xs">
                            {M_STATUS_LABEL[s]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={mSort} onValueChange={(v) => setMSort(v as MissionSort)}>
                      <SelectTrigger className="h-8 w-auto min-w-[160px] text-xs" aria-label="Trier les publications">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {VALID_M_SORT.map((s) => (
                          <SelectItem
                            key={s}
                            value={s}
                            disabled={s === "distance" && !proximity.active}
                            className="text-xs"
                          >
                            {M_SORT_LABEL[s]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="pt-2 border-t border-border/60">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                      Proximité
                    </p>
                    <ProximityFilter
                      postal={proximity.postal}
                      onPostalChange={proximity.setPostal}
                      radius={proximity.radius}
                      onRadiusChange={proximity.setRadius}
                      active={proximity.active}
                      resolving={proximity.resolving}
                      isValidPostal={proximity.isValidPostal}
                      onUseMyLocation={proximity.useMyLocation}
                      onClear={() => proximity.setPostal("")}
                    />
                    {!proximity.active && (
                      <p className="text-[11px] text-muted-foreground mt-2">
                        Saisissez un code postal ou utilisez votre position pour activer le tri par distance.
                      </p>
                    )}
                  </div>
                  <p className="sr-only" role="status" aria-live="polite">
                    {proximity.active
                      ? proximity.computing
                        ? `Calcul des distances autour de votre position dans un rayon de ${proximity.radius} kilomètres.`
                        : `Tri par proximité activé. Rayon : ${proximity.radius} kilomètres. ${filteredMissions.length} mission${filteredMissions.length > 1 ? "s" : ""} affichée${filteredMissions.length > 1 ? "s" : ""}.`
                      : "Tri par proximité désactivé."}
                  </p>
                </div>


                {mLoading ? (
                  <div className="space-y-3" aria-busy="true" aria-live="polite">
                    {[0, 1, 2, 3].map((i) => (
                      <div key={i} className="h-32 rounded-xl bg-muted/40 animate-pulse" />
                    ))}
                  </div>
                ) : visibleMissions.length > 0 ? (
                  <>
                    {(() => {
                      const activeItems = visibleMissions.filter((m) => !isMissionPast(m));
                      const pastItems = visibleMissions.filter((m) => isMissionPast(m));
                      const renderCard = (m: MissionRow) => {
                        const code = getDeptCode(m.postal_code);
                        const dept = code ? DEPT_NAMES[code] : null;
                        const period = formatMissionPeriod(m.date_needed, m.end_date);
                        const isMine = currentUserId && m.user_id === currentUserId;
                        const authorName = m.profiles?.first_name || "Membre";
                        const initial = authorName.charAt(0).toUpperCase();
                        const statusBadge =
                          m.status === "in_progress"
                            ? { label: "En cours", aria: "Statut : en cours" }
                            : m.status === "completed"
                              ? { label: "Terminée", aria: "Statut : terminée" }
                              : null;
                        const expired = isMissionExpired(m);
                        const d = proximity.active ? proximity.getDistance(m.id) : null;
                        const hasDist = proximity.active ? proximity.hasDistance(m.id) : false;
                        const distanceLabel =
                          proximity.active
                            ? d != null
                              ? d < 1
                                ? "moins d'1 km"
                                : `à ${Math.round(d)} km`
                              : proximity.computing || !hasDist
                                ? "Distance en cours de calcul"
                                : "Distance indisponible"
                            : null;
                        const cardAria = [
                          `Voir la mission : ${sanitizeUserTitle(m.title) || m.title}`,
                          m.city ? `à ${m.city}` : "",
                          proximity.active && d != null
                            ? d < 1
                              ? "à moins d'1 kilomètre de vous"
                              : `à environ ${Math.round(d)} kilomètres de vous`
                            : "",
                        ]
                          .filter(Boolean)
                          .join(", ");
                        return (
                          <li key={m.id}>
                            <Link
                              to={`/petites-missions/${m.id}`}
                              aria-label={cardAria}
                              className="flex gap-4 p-4 rounded-xl bg-card border border-border hover:border-primary/40 hover:shadow-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                            >
                              <MissionCardCover
                                photo={m.photos && m.photos[0] ? m.photos[0] : null}
                                category={m.category}
                                title={m.title}
                                className="w-24 sm:w-32 shrink-0 aspect-[4/3] rounded-lg"
                              />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2 mb-2">
                                  <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary uppercase tracking-wide">
                                      {MISSION_CATEGORY_LABEL[m.category] || "Autre"}
                                    </span>
                                    {statusBadge && (
                                      <span
                                        className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-muted text-muted-foreground uppercase tracking-wide"
                                        aria-label={statusBadge.aria}
                                      >
                                        {statusBadge.label}
                                      </span>
                                    )}
                                    {isMine && (
                                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground uppercase tracking-wide">
                                        Vous
                                      </span>
                                    )}
                                    {expired && m.status !== "completed" && (
                                      <span
                                        className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-warning/15 text-warning-foreground uppercase tracking-wide border border-warning/30"
                                        aria-label="Statut : période passée"
                                      >
                                        Passée
                                      </span>
                                    )}
                                  </div>
                                  {proximity.active && (
                                    d != null ? (
                                      <span
                                        className="shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary tabular-nums"
                                        aria-label={
                                          d < 1
                                            ? "Distance : moins d'un kilomètre"
                                            : `Distance : environ ${Math.round(d)} kilomètres`
                                        }
                                      >
                                        {distanceLabel}
                                      </span>
                                    ) : proximity.computing || !hasDist ? (
                                      <span
                                        className="shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-muted text-muted-foreground italic"
                                        aria-live="polite"
                                        aria-busy="true"
                                        aria-label="Calcul de la distance en cours"
                                      >
                                        …
                                      </span>
                                    ) : (
                                      <span
                                        className="shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-muted text-muted-foreground"
                                        aria-label="Distance indisponible"
                                        title="Distance indisponible"
                                      >
                                        – km
                                      </span>
                                    )
                                  )}
                                </div>
                                <p className="font-heading text-base font-semibold text-foreground line-clamp-2">
                                  {sanitizeUserTitle(m.title) || m.title}
                                </p>
                                {m.description && (
                                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                    {m.description}
                                  </p>
                                )}
                                <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground flex-wrap">
                                  <Avatar className="h-5 w-5 shrink-0">
                                    <AvatarImage src={m.profiles?.avatar_url || undefined} alt="" loading="lazy" />
                                    <AvatarFallback className="text-[9px]">{initial}</AvatarFallback>
                                  </Avatar>
                                  <span className="truncate max-w-[10rem]">{authorName}</span>
                                  {m.city && (
                                    <>
                                      <span aria-hidden="true">·</span>
                                      <span className="truncate">{m.city}{dept ? `, ${dept}` : ""}</span>
                                    </>
                                  )}
                                  {period && (
                                    <>
                                      <span aria-hidden="true">·</span>
                                      <span>{period.prefix}{period.value}</span>
                                    </>
                                  )}
                                  <span className="ml-auto">{formatRelative(m.created_at)}</span>
                                </div>
                              </div>

                            </Link>
                          </li>
                        );
                      };
                      return (
                        <>
                          {activeItems.length > 0 && (
                            <ul className="space-y-3">
                              {activeItems.map(renderCard)}
                            </ul>
                          )}
                          {pastItems.length > 0 && (
                            <section aria-labelledby="past-missions-title" className="mt-10">
                              <div className="mb-4 flex items-baseline justify-between gap-3 border-t border-border pt-6">
                                <h3
                                  id="past-missions-title"
                                  className="font-heading text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground"
                                >
                                  Passées et terminées
                                </h3>
                                <span className="text-[11px] text-muted-foreground">
                                  {pastItems.length} publication{pastItems.length > 1 ? "s" : ""}
                                </span>
                              </div>
                              <ul className="space-y-3 opacity-70">
                                {pastItems.map(renderCard)}
                              </ul>
                            </section>
                          )}
                        </>
                      );
                    })()}
                    {filteredMissions.length > visibleCount ? (
                      <div className="mt-4 flex justify-center">
                        <Button
                          variant="outline"
                          onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
                        >
                          Charger plus ({filteredMissions.length - visibleCount} restantes)
                        </Button>
                      </div>
                    ) : (
                      <div className="mt-8 p-5 rounded-2xl border border-dashed border-border bg-accent/20 text-center">
                        <p className="text-sm text-muted-foreground">
                          Vous avez vu {filteredMissions.length === 1 ? "l'unique publication" : `les ${filteredMissions.length} publications`} qui correspondent.
                        </p>
                        <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                          <Button size="sm" onClick={tab === "besoins" ? goNeed : goOffer}>
                            {tab === "besoins" ? "Publier une demande" : "Proposer mon aide"}
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setTab(tab === "besoins" ? "offres" : "besoins")}>
                            Voir {tab === "besoins" ? "les offres d'aide" : "les demandes"}
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <EmptyState
                    title={
                      mineOnly
                        ? tab === "besoins"
                          ? "Vous n'avez pas encore publié de demande."
                          : "Vous n'avez pas encore publié d'offre."
                        : hasMissionFilters
                          ? "Aucun résultat avec ces filtres."
                          : tab === "besoins"
                            ? "Aucune demande ouverte pour le moment."
                            : "Aucune proposition d'aide pour le moment."
                    }
                    hint={
                      hasMissionFilters
                        ? "Essayez « Toutes » pour élargir, ou publiez la première."
                        : "Lancez le mouvement, votre publication apparaît immédiatement."
                    }
                    ctaLabel={tab === "besoins" ? "Publier une demande" : "Proposer mon aide"}
                    onCta={tab === "besoins" ? goNeed : goOffer}
                    onReset={hasMissionFilters ? resetMissionFilters : undefined}
                    howSteps={meta.how}
                    examples={
                      !mineOnly && !hasMissionFilters
                        ? tab === "besoins"
                          ? [
                              { label: "Arroser mon potager 15 jours en août", cat: "need-garden-august" },
                              { label: "Récupérer un colis Amazon en mon absence, samedi 12", cat: "need-amazon-pickup" },
                              { label: "Un coup de main pour monter une bibliothèque IKEA", cat: "need-ikea-bookshelf" },
                            ]
                          : [
                              { label: "Je peux vous garder votre chat le week-end si vous partez", cat: "offer-cat-weekend" },
                              { label: "Prof de yoga bénévole en échange de bricolage", cat: "offer-yoga-barter" },
                              { label: "Compétences en électricité, je peux dépanner un ami", cat: "offer-electricity" },
                            ]
                        : undefined
                    }
                    onExample={(ex) => {
                      const type = tab === "besoins" ? "besoin" : "offre";
                      void trackEvent("entraide_empty_state_template_clicked", { metadata: { tab, template_key: ex.cat } });
                      const dest = `/petites-missions/creer?type=${type}&template=${ex.cat}`;
                      navigate(
                        isAuthenticated
                          ? dest
                          : `/inscription?redirect=${encodeURIComponent(dest)}`,
                      );
                    }}
                  />
                )}
              </>
            )}
          </div>
          </div>{/* /desktop hidden md:block */}
        </section>

        {/* FAB mobile retiré : le CTA primaire du header (full-width) et la bottom nav suffisent */}
      </div>
    </>
  );
};

const EmptyState = ({
  title,
  hint,
  ctaLabel,
  onCta,
  onReset,
  examples,
  onExample,
  howSteps,
}: {
  title: string;
  hint?: string;
  ctaLabel: string;
  onCta: () => void;
  onReset?: () => void;
  examples?: { label: string; cat: string }[];
  onExample?: (ex: { label: string; cat: string }) => void;
  howSteps?: string[];
}) => (
  <div className="p-8 rounded-2xl border border-dashed border-border bg-accent/20 text-center">
    <p className="font-heading text-lg text-foreground">{title}</p>
    {hint && <p className="text-sm text-muted-foreground mt-2">{hint}</p>}
    <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
      <Button onClick={onCta}>{ctaLabel}</Button>
      {onReset && (
        <Button variant="ghost" onClick={onReset}>
          Réinitialiser les filtres
        </Button>
      )}
    </div>
    {howSteps && howSteps.length > 0 && (
      <div className="mt-6 pt-5 border-t border-border/60 text-left">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3 text-center">
          Comment ça marche
        </p>
        <ol className="space-y-2 text-sm text-foreground/80 list-decimal list-inside">
          {howSteps.map((step, i) => (
            <li key={i}>{step}</li>
          ))}
        </ol>
      </div>
    )}
    {examples && examples.length > 0 && onExample && (
      <div className="mt-6 pt-5 border-t border-border/60">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
          Exemples pour démarrer
        </p>
        <div className="flex flex-col gap-2">
          {examples.map((ex) => (
            <button
              key={ex.label}
              type="button"
              onClick={() => onExample(ex)}
              className="text-left text-sm px-3 py-2 rounded-lg bg-card border border-border hover:border-primary hover:bg-accent/40 transition-colors text-foreground"
            >
              « {ex.label} »
            </button>
          ))}
        </div>
      </div>
    )}
  </div>
);

export default EntraideHub;
