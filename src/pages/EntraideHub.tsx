import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import PageMeta from "@/components/PageMeta";
import PageBreadcrumb from "@/components/seo/PageBreadcrumb";
import CategoryPills from "@/components/community/CategoryPills";
import QuestionCard from "@/components/community/QuestionCard";
import { useCommunityQuestions } from "@/hooks/useCommunityQuestions";
import type { CommunityCategory } from "@/lib/communityCategories";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

type Tab = "questions" | "besoins" | "offres";

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
  category: string;
  city: string | null;
  created_at: string;
  mission_type: "besoin" | "offre" | null;
  user_id: string;
}

const TAB_META: Record<Tab, { label: string; title: string; description: string; how: string[] }> = {
  questions: {
    label: "Questions",
    title: "Questions à la communauté",
    description: "Comportement animal, jardin, garde, bricolage. Posez votre question, recevez plusieurs avis.",
    how: [
      "Vous posez une question publique, courte et précise.",
      "Plusieurs membres répondent en commentaire, sans engagement.",
      "Vous marquez la meilleure réponse quand le sujet est résolu.",
    ],
  },
  besoins: {
    label: "Besoins",
    title: "Demandes de coups de main",
    description: "Les gens du coin qui cherchent un peu d'aide ponctuelle, près de chez vous.",
    how: [
      "Vous publiez votre besoin (catégorie, ville, créneau).",
      "Une personne du coin se propose en message privé.",
      "Vous convenez ensemble du jour et de la contrepartie éventuelle.",
    ],
  },
  offres: {
    label: "Offres",
    title: "Propositions d'aide",
    description: "Celles et ceux qui proposent leur temps ou leurs compétences gratuitement.",
    how: [
      "Vous décrivez ce que vous savez faire et vos disponibilités.",
      "Les personnes intéressées vous contactent en privé.",
      "Vous validez ensemble la date et le cadre de l'aide.",
    ],
  },
};


const VALID_TABS: Tab[] = ["questions", "besoins", "offres"];
const VALID_Q_CATS = ["all", "animaux", "jardin", "maison", "garde", "autre"] as const;
const VALID_Q_STATUS = ["all", "open", "resolved"] as const;

const EntraideHub = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [params, setParams] = useSearchParams();

  const initialTab = (params.get("tab") as Tab) || "questions";
  const [tab, setTab] = useState<Tab>(VALID_TABS.includes(initialTab) ? initialTab : "questions");

  /* ─── Onglet Questions ─── */
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

  /* ─── Onglets Besoins / Offres ─── */
  const [missions, setMissions] = useState<MissionRow[]>([]);
  const [mLoading, setMLoading] = useState(true);
  const initialMCat = params.get("cat") || "all";
  const [mCategory, setMCategory] = useState<string>(initialMCat);

  /* ─── Sync querystring (tab + filtres contextuels) ─── */
  useEffect(() => {
    const next = new URLSearchParams(params);
    if (tab === "questions") next.delete("tab");
    else next.set("tab", tab);

    // Reset puis pose des filtres du tab actif
    next.delete("cat");
    next.delete("status");
    if (tab === "questions") {
      if (qCategory !== "all") next.set("cat", qCategory);
      if (qStatus !== "all") next.set("status", qStatus);
    } else {
      if (mCategory !== "all") next.set("cat", mCategory);
    }
    setParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, qCategory, qStatus, mCategory]);

  /* Toggle "Mes publications" (auth requis) */
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
        .select("id, title, category, city, created_at, mission_type, user_id")
        .eq("status", "open")
        .order("created_at", { ascending: false })
        .limit(60);
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
      if (mCategory !== "all" && m.category !== mCategory) return false;
      if (mineOnly && currentUserId && m.user_id !== currentUserId) return false;
      return true;
    });
  }, [missions, tab, mCategory, mineOnly, currentUserId]);

  const visibleQuestions = useMemo(() => {
    if (!mineOnly || !currentUserId) return questions;
    return questions.filter((q: any) => q.author_id === currentUserId);
  }, [questions, mineOnly, currentUserId]);


  const besoinsTotal = missions.filter((m) => (m.mission_type ?? "besoin") === "besoin").length;
  const offresTotal = missions.filter((m) => (m.mission_type ?? "besoin") === "offre").length;
  const tabCounts: Record<Tab, number> = {
    questions: questions.length,
    besoins: besoinsTotal,
    offres: offresTotal,
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

  const meta = TAB_META[tab];

  return (
    <>
      <PageMeta
        title="Conseils & coups de main, entraide locale, Guardiens"
        description="Posez une question à la communauté, demandez un coup de main, ou proposez votre aide près de chez vous. Gratuit pour tous."
        path="/petites-missions"
      />
      <div className="min-h-screen bg-background">
        <PageBreadcrumb items={[{ label: "Conseils & coups de main" }]} />

        <section className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
          {/* Header + 3 CTA équivalents */}
          <div className="mb-6">
            <h1 className="font-heading text-2xl sm:text-3xl font-bold text-foreground">
              Conseils & coups de main
            </h1>
            <p className="text-foreground/70 mt-2">
              Une question, un besoin ponctuel, ou l'envie de rendre service ? Choisissez ce qui vous correspond.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-5">
              <Button onClick={goAsk} variant="outline" className="w-full">Poser une question</Button>
              <Button onClick={goNeed} variant="outline" className="w-full">Demander un coup de main</Button>
              <Button onClick={goOffer} variant="outline" className="w-full">Proposer mon aide</Button>
            </div>
            {isAuthenticated && (
              <div className="mt-3 flex items-center justify-end">
                <button
                  type="button"
                  onClick={() => setMineOnly((v) => !v)}
                  className={`text-xs font-semibold px-3 py-1 rounded-full border transition-colors ${
                    mineOnly
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-card text-foreground/70 border-border hover:bg-accent"
                  }`}
                >
                  {mineOnly ? "✓ Mes publications" : "Mes publications"}
                </button>
              </div>
            )}
          </div>

          {/* Onglets avec compteurs */}
          <div role="tablist" aria-label="Catégorie de contenu" className="flex gap-2 mb-5 border-b border-border">
            {(Object.keys(TAB_META) as Tab[]).map((t) => (
              <button
                key={t}
                role="tab"
                aria-selected={tab === t}
                onClick={() => setTab(t)}
                className={`px-4 py-2 -mb-px border-b-2 text-sm font-semibold transition-colors flex items-center gap-1.5 ${
                  tab === t
                    ? "border-primary text-primary"
                    : "border-transparent text-foreground/60 hover:text-foreground"
                }`}
              >
                <span>{TAB_META[t].label}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                  tab === t ? "bg-primary/15 text-primary" : "bg-muted text-foreground/50"
                }`}>
                  {tabCounts[t]}
                </span>
              </button>
            ))}
          </div>

          <div className="mb-5">
            <h2 className="font-heading text-lg font-semibold text-foreground">{meta.title}</h2>
            <p className="text-sm text-foreground/65 mt-1">{meta.description}</p>
          </div>

          {/* Comment ça marche, par onglet */}
          <details className="mb-6 rounded-xl border border-border bg-card group">
            <summary className="cursor-pointer list-none px-4 py-3 flex items-center justify-between text-sm font-semibold text-foreground">
              <span>Comment ça marche ?</span>
              <span className="text-foreground/50 group-open:rotate-180 transition-transform">▾</span>
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
                <div className="flex gap-2">
                  {(["all", "open", "resolved"] as const).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setQStatus(s)}
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
                <div className="space-y-3">
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
                <div className="p-8 rounded-2xl border border-dashed border-border bg-accent/20 text-center">
                  <p className="font-heading text-lg text-foreground/85">
                    Aucune question dans cette catégorie.
                  </p>
                  <Button onClick={goAsk} className="mt-4">Poser la première question</Button>
                </div>
              )}
            </>
          )}

          {/* Onglets Besoins / Offres */}
          {(tab === "besoins" || tab === "offres") && (
            <>
              <div className="flex flex-wrap gap-2 mb-6">
                {MISSION_CATEGORIES.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setMCategory(c)}
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

              {mLoading ? (
                <div className="space-y-3">
                  {[0, 1, 2, 3].map((i) => (
                    <div key={i} className="h-28 rounded-xl bg-muted/40 animate-pulse" />
                  ))}
                </div>
              ) : visibleMissions.length > 0 ? (
                <ul className="space-y-3">
                  {visibleMissions.map((m) => (
                    <li key={m.id}>
                      <Link
                        to={`/petites-missions/${m.id}`}
                        className="block p-4 rounded-xl bg-card border border-border hover:bg-accent/50 transition-colors"
                      >
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                            {MISSION_CATEGORY_LABEL[m.category] || "Autre"}
                          </span>
                          {m.city && (
                            <span className="text-xs text-foreground/50">{m.city}</span>
                          )}
                        </div>
                        <p className="font-heading text-base font-semibold text-foreground line-clamp-2">
                          {m.title}
                        </p>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="p-8 rounded-2xl border border-dashed border-border bg-accent/20 text-center">
                  <p className="font-heading text-lg text-foreground/85">
                    {tab === "besoins"
                      ? "Aucune demande ouverte pour le moment."
                      : "Aucune proposition d'aide pour le moment."}
                  </p>
                  <Button
                    onClick={tab === "besoins" ? goNeed : goOffer}
                    className="mt-4"
                  >
                    {tab === "besoins" ? "Publier une demande" : "Proposer mon aide"}
                  </Button>
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </>
  );
};

export default EntraideHub;
