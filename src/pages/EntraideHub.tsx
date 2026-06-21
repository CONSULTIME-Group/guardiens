import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ChevronDown } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import PageMeta from "@/components/PageMeta";
import PageBreadcrumb from "@/components/seo/PageBreadcrumb";
import CategoryPills from "@/components/community/CategoryPills";
import QuestionCard from "@/components/community/QuestionCard";
import { useCommunityQuestions } from "@/hooks/useCommunityQuestions";
import type { CommunityCategory } from "@/lib/communityCategories";
import { DEPT_NAMES, getDeptCode } from "@/lib/departments";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

type Tab = "questions" | "besoins" | "offres";
type MissionStatus = "all" | "open" | "in_progress" | "completed";

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
      "Les gens du coin qui cherchent un peu d'aide ponctuelle, près de chez vous. Couverture France entière.",
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

const M_STATUS_LABEL: Record<MissionStatus, string> = {
  all: "Toutes",
  open: "Ouvertes",
  in_progress: "En cours",
  completed: "Terminées",
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

const EntraideHub = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [params, setParams] = useSearchParams();

  const initialTab = (params.get("tab") as Tab) || "questions";
  const [tab, setTab] = useState<Tab>(VALID_TABS.includes(initialTab) ? initialTab : "questions");

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

  /* Sync querystring */
  useEffect(() => {
    const next = new URLSearchParams(params);
    if (tab === "questions") next.delete("tab");
    else next.set("tab", tab);

    next.delete("cat");
    next.delete("status");
    if (tab === "questions") {
      if (qCategory !== "all") next.set("cat", qCategory);
      if (qStatus !== "all") next.set("status", qStatus);
    } else {
      if (mCategory !== "all") next.set("cat", mCategory);
      if (mStatus !== "open") next.set("status", mStatus);
    }
    setParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, qCategory, qStatus, mCategory, mStatus]);

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
          "id, title, description, category, city, postal_code, created_at, date_needed, duration_estimate, status, mission_type, user_id",
        )
        .in("status", ["open", "in_progress", "completed"] as any)
        .order("created_at", { ascending: false })
        .limit(120);
      setMissions((data || []) as unknown as MissionRow[]);
      setMLoading(false);
    };
    void load();
  }, []);

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setCurrentUserId(data.user?.id ?? null));
  }, []);

  const visibleMissions = useMemo(() => {
    const wantType: "besoin" | "offre" = tab === "offres" ? "offre" : "besoin";
    return missions.filter((m) => {
      if ((m.mission_type ?? "besoin") !== wantType) return false;
      if (mStatus !== "all" && m.status !== mStatus) return false;
      if (mCategory !== "all" && m.category !== mCategory) return false;
      if (mineOnly && currentUserId && m.user_id !== currentUserId) return false;
      return true;
    });
  }, [missions, tab, mCategory, mStatus, mineOnly, currentUserId]);

  const visibleQuestions = useMemo(() => {
    if (!mineOnly || !currentUserId) return questions;
    return questions.filter((q: any) => q.author_id === currentUserId);
  }, [questions, mineOnly, currentUserId]);

  // Compteurs cohérents avec ce qui s'affiche réellement (filtres appliqués)
  const tabCounts: Record<Tab, number> = useMemo(() => {
    const filterMissions = (type: "besoin" | "offre") =>
      missions.filter((m) => {
        if ((m.mission_type ?? "besoin") !== type) return false;
        if (mStatus !== "all" && m.status !== mStatus) return false;
        if (mineOnly && currentUserId && m.user_id !== currentUserId) return false;
        return true;
      }).length;
    return {
      questions: visibleQuestions.length,
      besoins: filterMissions("besoin"),
      offres: filterMissions("offre"),
    };
  }, [missions, mStatus, mineOnly, currentUserId, visibleQuestions.length]);

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

  const primaryCta = tab === "questions" ? { label: "Poser une question", action: goAsk } : tab === "besoins" ? { label: "Publier une demande", action: goNeed } : { label: "Proposer mon aide", action: goOffer };

  const meta = TAB_META[tab];
  const accentClasses: Record<Tab, { border: string; text: string; pill: string }> = {
    questions: { border: "border-primary", text: "text-primary", pill: "bg-primary/15 text-primary" },
    besoins: { border: "border-secondary", text: "text-secondary-foreground", pill: "bg-secondary/40 text-foreground" },
    offres: { border: "border-accent", text: "text-foreground", pill: "bg-accent/60 text-foreground" },
  };

  return (
    <>
      <PageMeta
        title="Conseils & coups de main, entraide locale, Guardiens"
        description="Posez une question à la communauté, demandez un coup de main, ou proposez votre aide près de chez vous. Gratuit pour tous."
        path="/petites-missions"
      />
      <div className="min-h-screen bg-background">
        <PageBreadcrumb items={[{ label: "Conseils & coups de main" }]} />

        <section className="max-w-3xl mx-auto px-4 sm:px-6 py-8 min-w-0">
          {/* Header */}
          <div className="mb-6">
            <h1 className="font-heading text-2xl sm:text-3xl font-bold text-foreground">
              Conseils & coups de main
            </h1>
            <p className="text-foreground/70 mt-2">
              Une question, un besoin ponctuel, ou l'envie de rendre service ? Choisissez ce qui vous correspond.
            </p>
            <p className="text-xs text-foreground/55 mt-1">
              Gratuit pour tous, sans engagement.
            </p>

            {/* CTA primaire (création) selon onglet actif + secondaires repliés */}
            <div className="mt-5 space-y-2">
              <Button onClick={primaryCta.action} className="w-full sm:w-auto">
                {primaryCta.label}
              </Button>
              <div className="flex flex-wrap gap-2 text-xs">
                {tab !== "questions" && (
                  <button onClick={goAsk} className="text-foreground/60 hover:text-foreground underline underline-offset-2">
                    Poser une question
                  </button>
                )}
                {tab !== "besoins" && (
                  <button onClick={goNeed} className="text-foreground/60 hover:text-foreground underline underline-offset-2">
                    Demander un coup de main
                  </button>
                )}
                {tab !== "offres" && (
                  <button onClick={goOffer} className="text-foreground/60 hover:text-foreground underline underline-offset-2">
                    Proposer mon aide
                  </button>
                )}
              </div>
            </div>

            {isAuthenticated && (
              <div className="mt-4 flex items-center justify-end">
                <button
                  type="button"
                  onClick={() => setMineOnly((v) => !v)}
                  aria-pressed={mineOnly}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors ${
                    mineOnly
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-card text-foreground/70 border-border hover:bg-accent"
                  }`}
                >
                  {mineOnly ? "Mes publications (actif)" : "Voir mes publications"}
                </button>
              </div>
            )}
          </div>

          {/* Onglets */}
          <div role="tablist" aria-label="Catégorie de contenu" className="flex gap-1 sm:gap-2 mb-5 border-b border-border overflow-x-auto">
            {(Object.keys(TAB_META) as Tab[]).map((t) => {
              const isActive = tab === t;
              const a = accentClasses[t];
              return (
                <button
                  key={t}
                  role="tab"
                  id={`tab-${t}`}
                  aria-selected={isActive}
                  aria-controls={`panel-${t}`}
                  tabIndex={isActive ? 0 : -1}
                  onClick={() => setTab(t)}
                  className={`shrink-0 px-3 sm:px-4 py-2 -mb-px border-b-2 text-sm font-semibold transition-colors flex items-center gap-2 ${
                    isActive
                      ? `${a.border} ${a.text}`
                      : "border-transparent text-foreground/60 hover:text-foreground"
                  }`}
                >
                  <span>{TAB_META[t].short}</span>
                  <span
                    className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                      isActive ? a.pill : "bg-muted text-foreground/60"
                    }`}
                  >
                    {tabCounts[t]}
                  </span>
                </button>
              );
            })}
          </div>

          <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
            <div className="mb-4">
              <h2 className="font-heading text-lg font-semibold text-foreground">{meta.title}</h2>
              <p className="text-sm text-foreground/65 mt-1">{meta.description}</p>
            </div>

            {/* Comment ça marche, ouvert par défaut */}
            <details open className="mb-6 rounded-xl border border-border bg-card group">
              <summary className="cursor-pointer list-none px-4 py-3 flex items-center justify-between text-sm font-semibold text-foreground">
                <span>Comment ça marche ?</span>
                <ChevronDown
                  className="h-4 w-4 text-foreground/50 transition-transform group-open:rotate-180"
                  aria-hidden="true"
                />
              </summary>
              <ol className="px-4 pb-4 space-y-2 text-sm text-foreground/75 list-decimal list-inside">
                {meta.how.map((step, i) => (
                  <li key={i}>{step}</li>
                ))}
              </ol>
            </details>

            {/* Onglet Questions */}
            {tab === "questions" && (
              <>
                <div className="space-y-3 mb-6">
                  <CategoryPills value={qCategory} onChange={setQCategory} />
                  <div className="flex gap-2" role="group" aria-label="Filtrer par statut">
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
                        : qCategory !== "all" || qStatus !== "all"
                          ? "Aucune question avec ces filtres."
                          : "Aucune question pour le moment."
                    }
                    hint={
                      qCategory !== "all" || qStatus !== "all"
                        ? "Élargissez les filtres ou posez la première question de cette catégorie."
                        : "Soyez la première personne à lancer le sujet."
                    }
                    ctaLabel="Poser une question"
                    onCta={goAsk}
                  />
                )}
              </>
            )}

            {/* Onglets Besoins / Offres */}
            {(tab === "besoins" || tab === "offres") && (
              <>
                <div className="space-y-3 mb-6">
                  <div className="flex flex-wrap gap-2">
                    {MISSION_CATEGORIES.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setMCategory(c)}
                        aria-pressed={mCategory === c}
                        className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${
                          mCategory === c
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-card text-foreground/70 border-border hover:bg-accent"
                        }`}
                      >
                        {c === "all" ? "Toutes" : MISSION_CATEGORY_LABEL[c]}
                      </button>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrer par statut">
                    {VALID_M_STATUS.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setMStatus(s)}
                        aria-pressed={mStatus === s}
                        className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${
                          mStatus === s
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-card text-foreground/70 border-border hover:bg-accent"
                        }`}
                      >
                        {M_STATUS_LABEL[s]}
                      </button>
                    ))}
                  </div>
                </div>

                {mLoading ? (
                  <div className="space-y-3" aria-busy="true" aria-live="polite">
                    {[0, 1, 2, 3].map((i) => (
                      <div key={i} className="h-32 rounded-xl bg-muted/40 animate-pulse" />
                    ))}
                  </div>
                ) : visibleMissions.length > 0 ? (
                  <ul className="space-y-3">
                    {visibleMissions.map((m) => {
                      const code = getDeptCode(m.postal_code);
                      const dept = code ? DEPT_NAMES[code] : null;
                      const dateLabel = formatDateNeeded(m.date_needed);
                      const isMine = currentUserId && m.user_id === currentUserId;
                      return (
                        <li key={m.id}>
                          <Link
                            to={`/petites-missions/${m.id}`}
                            className="block p-4 rounded-xl bg-card border border-border hover:border-primary/40 hover:shadow-sm transition-all"
                          >
                            <div className="flex items-center gap-2 mb-2 flex-wrap">
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary uppercase tracking-wide">
                                {MISSION_CATEGORY_LABEL[m.category] || "Autre"}
                              </span>
                              {m.status !== "open" && (
                                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-muted text-foreground/60 uppercase tracking-wide">
                                  {m.status === "in_progress" ? "En cours" : "Terminée"}
                                </span>
                              )}
                              {isMine && (
                                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-secondary/40 text-foreground uppercase tracking-wide">
                                  Vous
                                </span>
                              )}
                            </div>
                            <p className="font-heading text-base font-semibold text-foreground line-clamp-2">
                              {m.title}
                            </p>
                            {m.description && (
                              <p className="text-sm text-foreground/65 mt-1 line-clamp-2">
                                {m.description}
                              </p>
                            )}
                            <div className="flex items-center gap-x-3 gap-y-1 mt-3 text-xs text-foreground/55 flex-wrap">
                              {m.city && (
                                <span>
                                  {m.city}
                                  {dept ? `, ${dept}` : ""}
                                </span>
                              )}
                              {dateLabel && <span>Pour le {dateLabel}</span>}
                              {m.duration_estimate && <span>{m.duration_estimate}</span>}
                              <span className="ml-auto">{formatRelative(m.created_at)}</span>
                            </div>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <EmptyState
                    title={
                      mineOnly
                        ? tab === "besoins"
                          ? "Vous n'avez pas encore publié de demande."
                          : "Vous n'avez pas encore publié d'offre."
                        : mCategory !== "all" || mStatus !== "open"
                          ? "Aucun résultat avec ces filtres."
                          : tab === "besoins"
                            ? "Aucune demande ouverte pour le moment."
                            : "Aucune proposition d'aide pour le moment."
                    }
                    hint={
                      mCategory !== "all" || mStatus !== "open"
                        ? "Essayez « Toutes » pour élargir, ou publiez la première."
                        : "Lancez le mouvement, votre publication apparaît immédiatement."
                    }
                    ctaLabel={tab === "besoins" ? "Publier une demande" : "Proposer mon aide"}
                    onCta={tab === "besoins" ? goNeed : goOffer}
                  />
                )}
              </>
            )}
          </div>
        </section>
      </div>
    </>
  );
};

const EmptyState = ({
  title,
  hint,
  ctaLabel,
  onCta,
}: {
  title: string;
  hint?: string;
  ctaLabel: string;
  onCta: () => void;
}) => (
  <div className="p-8 rounded-2xl border border-dashed border-border bg-accent/20 text-center">
    <p className="font-heading text-lg text-foreground/85">{title}</p>
    {hint && <p className="text-sm text-foreground/60 mt-2">{hint}</p>}
    <Button onClick={onCta} className="mt-4">
      {ctaLabel}
    </Button>
  </div>
);

export default EntraideHub;
