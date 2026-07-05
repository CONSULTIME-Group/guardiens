import { useEffect, useMemo, useState } from "react";
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
import { sanitizeUserTitle } from "@/lib/sanitizeTitle";
import { useMissionDistance } from "@/hooks/useMissionDistance";


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
const VALID_M_SORT: MissionSort[] = ["recent", "date_needed"];

const M_STATUS_LABEL: Record<MissionStatus, string> = {
  all: "Tous statuts",
  open: "Ouvertes",
  in_progress: "En cours",
  completed: "Terminées",
};

const M_SORT_LABEL: Record<MissionSort, string> = {
  recent: "Plus récentes",
  date_needed: "Date la plus proche",
};

const formatDateNeeded = (d: string | null) => {
  if (!d) return null;
  try {
    return format(new Date(d), "d MMM yyyy", { locale: fr });
  } catch {
    return null;
  }
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

  useEffect(() => {
    const load = async () => {
      setMLoading(true);
      const { data } = await supabase
        .from("small_missions")
        .select(
          "id, title, description, category, city, postal_code, created_at, date_needed, duration_estimate, status, mission_type, user_id, photos, profiles:user_id(first_name, avatar_url)",
        )
        .in("status", ["open", "in_progress", "completed"] as any)
        .order("created_at", { ascending: false })
        .limit(120);
      setMissions((data || []) as unknown as MissionRow[]);
      setMLoading(false);
    };
    void load();
  }, []);

  // P1 — Si aucun paramètre tab dans l'URL et aucune mission ouverte, bascule par défaut sur Questions.
  useEffect(() => {
    if (mLoading) return;
    if (params.get("tab")) return;
    const openBesoins = missions.filter((m) => (m.mission_type ?? "besoin") === "besoin" && m.status === "open").length;
    const openOffres = missions.filter((m) => m.mission_type === "offre" && m.status === "open").length;
    if (openBesoins === 0 && openOffres === 0) {
      setTab("questions");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mLoading]);

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setCurrentUserId(data.user?.id ?? null));
  }, []);

  const sortMissions = (arr: MissionRow[]): MissionRow[] => {
    if (mSort === "date_needed") {
      return [...arr].sort((a, b) => {
        if (!a.date_needed && !b.date_needed) return 0;
        if (!a.date_needed) return 1;
        if (!b.date_needed) return -1;
        return a.date_needed.localeCompare(b.date_needed);
      });
    }
    return arr;
  };

  const filteredMissions = useMemo(() => {
    const wantType: "besoin" | "offre" = tab === "offres" ? "offre" : "besoin";
    const filtered = missions.filter((m) => {
      if ((m.mission_type ?? "besoin") !== wantType) return false;
      if (mStatus !== "all" && m.status !== mStatus) return false;
      if (mCategory !== "all" && m.category !== mCategory) return false;
      if (mineOnly && currentUserId && m.user_id !== currentUserId) return false;
      return true;
    });
    return sortMissions(filtered);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [missions, tab, mCategory, mStatus, mineOnly, currentUserId, mSort]);

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
        <PageBreadcrumb items={[{ label: "Entraide" }]} />

        <section className="max-w-3xl mx-auto px-4 sm:px-6 pt-4 pb-28 sm:pt-6 sm:pb-8 min-w-0">
          {/* Header ultra-compact : H1 + badge + CTA discret sur une ligne */}
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <h1 className="font-heading text-xl sm:text-2xl font-bold text-foreground truncate">
                Entraide
              </h1>
              <span className="text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-accent/40 text-foreground/70 shrink-0">
                Gratuit
              </span>
            </div>
            <Button onClick={primaryCta.action} size="sm" variant="outline" className="shrink-0 text-xs h-8">
              {primaryCta.label}
            </Button>
          </div>

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
                      : "border-transparent text-foreground/65 hover:text-foreground hover:bg-background/60"
                  }`}
                >
                  <span className="truncate">{TAB_META[t].short}</span>
                  {total > 0 && (
                    <span
                      className={`shrink-0 text-[10px] sm:text-xs px-1.5 py-0.5 rounded-full font-medium tabular-nums ${
                        isActive ? a.pill : "bg-background/80 text-foreground/60"
                      }`}
                      aria-label={showRatio ? `${filtered} affichés sur ${total} au total` : `${total} au total`}
                    >
                      <span className="sm:hidden">{total}</span>
                      <span className="hidden sm:inline">{showRatio ? `${filtered}/${total}` : total}</span>
                    </span>
                  )}
                </button>
              );
            })}
          </div>


          {/* Toggle Mes publications, hors barre d'onglets */}
          {isAuthenticated && (
            <div className="mb-5 flex justify-end">
              <button
                type="button"
                onClick={() => setMineOnly((v) => !v)}
                aria-pressed={mineOnly}
                aria-label={mineOnly ? "Afficher toutes les publications" : "N'afficher que mes publications"}
                className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors ${
                  mineOnly
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card text-foreground/70 border-border hover:bg-accent"
                }`}
              >
                {mineOnly ? "Mes publications ✓" : "Mes publications"}
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
                            : "bg-card text-foreground/70 border-border hover:bg-accent"
                        }`}
                      >
                        {s === "all" ? "Toutes" : s === "open" ? "Ouvertes" : "Résolues"}
                      </button>
                    ))}
                    {hasQuestionFilters && (
                      <button
                        type="button"
                        onClick={resetQuestionFilters}
                        className="ml-auto text-xs text-foreground/60 hover:text-foreground underline underline-offset-2"
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
                {/* Barre de filtres compacte */}
                <div className="space-y-3 mb-6">
                  <div className="-mx-4 px-4 sm:mx-0 sm:px-0 overflow-x-auto">
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
                              : "bg-card text-foreground/70 border-border hover:bg-accent"
                          }`}
                        >
                          {c === "all" ? "Toutes catégories" : MISSION_CATEGORY_LABEL[c]}
                        </button>
                      ))}
                    </div>
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
                          <SelectItem key={s} value={s} className="text-xs">
                            {M_SORT_LABEL[s]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {hasMissionFilters && (
                      <button
                        type="button"
                        onClick={resetMissionFilters}
                        className="ml-auto text-xs text-foreground/60 hover:text-foreground underline underline-offset-2"
                      >
                        Réinitialiser
                      </button>
                    )}
                  </div>
                </div>

                {mLoading ? (
                  <div className="space-y-3" aria-busy="true" aria-live="polite">
                    {[0, 1, 2, 3].map((i) => (
                      <div key={i} className="h-32 rounded-xl bg-muted/40 animate-pulse" />
                    ))}
                  </div>
                ) : visibleMissions.length > 0 ? (
                  <>
                    <ul className="space-y-3">
                      {visibleMissions.map((m) => {
                        const code = getDeptCode(m.postal_code);
                        const dept = code ? DEPT_NAMES[code] : null;
                        const dateLabel = formatDateNeeded(m.date_needed);
                        const isMine = currentUserId && m.user_id === currentUserId;
                        const authorName = m.profiles?.first_name || "Membre";
                        const initial = authorName.charAt(0).toUpperCase();
                        const statusBadge =
                          m.status === "in_progress"
                            ? { label: "En cours", aria: "Statut : en cours" }
                            : m.status === "completed"
                              ? { label: "Terminée", aria: "Statut : terminée" }
                              : null;
                        return (
                          <li key={m.id}>
                            <Link
                              to={`/petites-missions/${m.id}`}
                              aria-label={`Voir la mission : ${sanitizeUserTitle(m.title) || m.title}${m.city ? `, ${m.city}` : ""}`}
                              className="flex gap-4 p-4 rounded-xl bg-card border border-border hover:border-primary/40 hover:shadow-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                            >
                              {Array.isArray(m.photos) && m.photos.length > 0 && (
                                <MissionCardCover
                                  photo={m.photos[0]}
                                  category={m.category}
                                  title={m.title}
                                  className="w-24 sm:w-32 shrink-0 aspect-[4/3] rounded-lg"
                                />
                              )}
                              <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-2 flex-wrap">
                                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary uppercase tracking-wide">
                                  {MISSION_CATEGORY_LABEL[m.category] || "Autre"}
                                </span>
                                {statusBadge && (
                                  <span
                                    className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-muted text-foreground/60 uppercase tracking-wide"
                                    aria-label={statusBadge.aria}
                                  >
                                    {statusBadge.label}
                                  </span>
                                )}
                                {isMine && (
                                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-secondary/40 text-foreground uppercase tracking-wide">
                                    Vous
                                  </span>
                                )}
                              </div>
                              <p className="font-heading text-base font-semibold text-foreground line-clamp-2">
                                {sanitizeUserTitle(m.title) || m.title}
                              </p>
                              {m.description && (
                                <p className="text-sm text-foreground/65 mt-1 line-clamp-2">
                                  {m.description}
                                </p>
                              )}
                              <div className="flex items-center gap-2 mt-3">
                                <Avatar className="h-6 w-6 shrink-0">
                                  <AvatarImage src={m.profiles?.avatar_url || undefined} alt="" loading="lazy" />
                                  <AvatarFallback className="text-[10px]">{initial}</AvatarFallback>
                                </Avatar>
                                <span className="text-xs text-foreground/70 truncate">{authorName}</span>
                              </div>
                              <div className="flex items-center gap-x-3 gap-y-1 mt-2 text-xs text-foreground/55 flex-wrap">
                                {m.city && (
                                  <span>
                                    {m.city}
                                    {dept ? `, ${dept}` : ""}
                                  </span>
                                )}
                                {dateLabel && <span>Pour le {dateLabel}</span>}
                                {m.duration_estimate && <span>{DURATION_LABEL[m.duration_estimate] || m.duration_estimate}</span>}
                                <span className="ml-auto">{formatRelative(m.created_at)}</span>
                              </div>
                              </div>
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                    {filteredMissions.length > visibleCount && (
                      <div className="mt-4 flex justify-center">
                        <Button
                          variant="outline"
                          onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
                        >
                          Charger plus ({filteredMissions.length - visibleCount} restantes)
                        </Button>
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
                  />
                )}
              </>
            )}
          </div>
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
    <p className="font-heading text-lg text-foreground/85">{title}</p>
    {hint && <p className="text-sm text-foreground/60 mt-2">{hint}</p>}
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
        <p className="text-xs font-semibold uppercase tracking-wide text-foreground/55 mb-3 text-center">
          Comment ça marche
        </p>
        <ol className="space-y-2 text-sm text-foreground/75 list-decimal list-inside">
          {howSteps.map((step, i) => (
            <li key={i}>{step}</li>
          ))}
        </ol>
      </div>
    )}
    {examples && examples.length > 0 && onExample && (
      <div className="mt-6 pt-5 border-t border-border/60">
        <p className="text-xs font-semibold uppercase tracking-wide text-foreground/55 mb-3">
          Exemples pour démarrer
        </p>
        <div className="flex flex-col gap-2">
          {examples.map((ex) => (
            <button
              key={ex.label}
              type="button"
              onClick={() => onExample(ex)}
              className="text-left text-sm px-3 py-2 rounded-lg bg-card border border-border hover:border-primary hover:bg-accent/40 transition-colors text-foreground/80"
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
