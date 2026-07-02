import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import PageMeta from "@/components/PageMeta";
import PageBreadcrumb from "@/components/seo/PageBreadcrumb";
import PublicHeader from "@/components/layout/PublicHeader";
import PublicFooter from "@/components/layout/PublicFooter";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import MissionCardCover from "@/components/missions/MissionCardCover";

type MissionCategory = "animals" | "garden" | "house" | "errand" | "tech" | "company" | "other";

const CATEGORY_LABEL: Record<string, string> = {
  animals: "Animaux",
  garden: "Jardin",
  house: "Maison",
  errand: "Courses",
  tech: "Technique",
  company: "Compagnie",
  other: "Autre",
};

const CATEGORIES: { value: MissionCategory | "all"; label: string }[] = [
  { value: "all", label: "Toutes" },
  { value: "animals", label: "Animaux" },
  { value: "garden", label: "Jardin" },
  { value: "house", label: "Maison" },
  { value: "errand", label: "Courses" },
  { value: "tech", label: "Technique" },
  { value: "company", label: "Compagnie" },
  { value: "other", label: "Autre" },
];

interface MissionRow {
  id: string;
  title: string;
  category: string;
  city: string | null;
  created_at: string;
  mission_type: "besoin" | "offre" | null;
  photos: string[] | null;
}

const SmallMissionsPublic = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [items, setItems] = useState<MissionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState<MissionCategory | "all">("all");
  const [type, setType] = useState<"all" | "besoin" | "offre">("all");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("small_missions")
        .select("id, title, category, city, created_at, mission_type")
        .eq("status", "open")
        .order("created_at", { ascending: false })
        .limit(50);
      setItems((data || []) as unknown as MissionRow[]);
      setLoading(false);
    };
    void load();
  }, []);

  const filtered = useMemo(() => {
    return items.filter((m) => {
      if (category !== "all" && m.category !== category) return false;
      if (type !== "all" && (m.mission_type ?? "besoin") !== type) return false;
      return true;
    });
  }, [items, category, type]);

  const goCreate = () =>
    navigate(isAuthenticated ? "/petites-missions/creer" : "/inscription?redirect=/petites-missions/creer");

  return (
    <>
      <PageMeta
        title="Conseils & petites missions, entraide locale, Guardiens"
        description="Échangez des coups de main entre gens du coin : jardin, animaux, bricolage, courses. Gratuit pour tous, sans engagement."
        path="/petites-missions"
      />
      <div className="min-h-screen bg-background">
        <PublicHeader />
        <PageBreadcrumb items={[{ label: "Conseils & petites missions" }]} />

        <section className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <h1 className="font-heading text-2xl sm:text-3xl font-bold text-foreground">
                Conseils & petites missions
              </h1>
              <p className="text-foreground/70 mt-2">
                Un coup de main près de chez vous : jardin, animaux, bricolage, courses. Vous pouvez aussi{" "}
                <Link to="/questions" className="text-primary font-semibold hover:underline">
                  poser une question à la communauté
                </Link>
                .
              </p>
            </div>
            <Button onClick={goCreate} className="shrink-0">Publier une mission</Button>
          </div>

          {/* Bloc pédagogique : à quoi sert Coup de main */}
          <div className="rounded-xl border border-border bg-card p-5 mb-6">
            <h2 className="font-heading text-lg font-semibold text-foreground mb-3">
              À quoi sert Coup de main&nbsp;?
            </h2>
            <p className="text-sm text-foreground/80 mb-3">
              Coup de main, ce sont des échanges ponctuels et gratuits entre gens du coin. Vous publiez un besoin (ou une offre d'aide) ; une personne de confiance proche répond. Aucune transaction financière, aucun engagement.
            </p>
            <div className="grid sm:grid-cols-2 gap-3 mb-3">
              <div className="rounded-lg bg-accent/30 p-3">
                <p className="text-xs font-semibold text-foreground mb-1">Exemples de demandes</p>
                <ul className="text-xs text-foreground/75 space-y-0.5 list-disc list-inside">
                  <li>Visite ou balade pour mon chien</li>
                  <li>Garde de mon chat chez la personne</li>
                  <li>Arrosage de plantes pendant 3 jours</li>
                  <li>Aide pour monter un meuble, faire des courses</li>
                </ul>
              </div>
              <div className="rounded-lg bg-accent/30 p-3">
                <p className="text-xs font-semibold text-foreground mb-1">Exemples d'offres d'aide</p>
                <ul className="text-xs text-foreground/75 space-y-0.5 list-disc list-inside">
                  <li>Je peux promener un chien le matin</li>
                  <li>Je tiens compagnie aux seniors</li>
                  <li>Je donne un coup de main au jardin</li>
                  <li>Je dépanne en informatique</li>
                </ul>
              </div>
            </div>
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs text-foreground/80">
              <span className="font-semibold text-foreground">Différence avec une garde&nbsp;:</span>{" "}
              une <Link to="/maisons-a-garder" className="text-primary underline underline-offset-2">annonce de garde</Link> concerne uniquement les gardes <strong>à votre domicile</strong> (le gardien s'installe chez vous). Toute autre forme de garde (visite, balade, chez la personne, pension) se publie ici, dans Coup de main.
            </div>
          </div>


          <div className="space-y-3 mb-6">
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setCategory(c.value)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${
                    category === c.value
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-card text-foreground/70 border-border hover:bg-accent"
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              {(["all", "besoin", "offre"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setType(s)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${
                    type === s
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-card text-foreground/70 border-border hover:bg-accent"
                  }`}
                >
                  {s === "all" ? "Toutes" : s === "besoin" ? "Demandes" : "Propositions d'aide"}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="h-28 rounded-xl bg-muted/40 animate-pulse" />
              ))}
            </div>
          ) : filtered.length > 0 ? (
            <ul className="space-y-3">
              {filtered.map((m) => {
                const isOffre = (m.mission_type ?? "besoin") === "offre";
                return (
                  <li key={m.id}>
                    <Link
                      to={`/petites-missions/${m.id}`}
                      className="block p-4 rounded-xl bg-card border border-border hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                          {CATEGORY_LABEL[m.category] || "Autre"}
                        </span>
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                            isOffre ? "bg-success/15 text-success" : "bg-primary/10 text-primary"
                          }`}
                        >
                          {isOffre ? "Propose son aide" : "Demande"}
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
                );
              })}
            </ul>
          ) : (
            <div className="p-8 rounded-2xl border border-dashed border-border bg-accent/20 text-center">
              <p className="font-heading text-lg text-foreground/85">
                Aucune mission ouverte dans cette catégorie.
              </p>
              <Button onClick={goCreate} className="mt-4">Publier la première mission</Button>
            </div>
          )}
        </section>

        <PublicFooter />
      </div>
    </>
  );
};

export default SmallMissionsPublic;
