import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import PageMeta from "@/components/PageMeta";
import PageBreadcrumb from "@/components/seo/PageBreadcrumb";
import CategoryPills from "@/components/community/CategoryPills";
import QuestionCard from "@/components/community/QuestionCard";
import { useCommunityQuestions } from "@/hooks/useCommunityQuestions";
import type { CommunityCategory } from "@/lib/communityCategories";

const Questions = () => {
  const [category, setCategory] = useState<CommunityCategory | "all">("all");
  const [status, setStatus] = useState<"all" | "open" | "resolved">("all");
  const { items, loading } = useCommunityQuestions({ category, status, limit: 50 });

  return (
    <>
      <PageMeta
        title="Questions & conseils, communauté Guardiens"
        description="Posez une question à la communauté Guardiens : comportement animal, jardin, garde de maison, bricolage. Recevez plusieurs avis de gens du coin."
        path="/questions"
      />
      <div className="min-h-screen bg-background">
        <PageBreadcrumb items={[{ label: "Questions & conseils" }]} />

        <section className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
          <div className="flex items-start justify-between gap-4 mb-6">
            <div>
              <h1 className="font-heading text-2xl sm:text-3xl font-bold text-foreground">
                Questions & conseils
              </h1>
              <p className="text-foreground/70 mt-2">
                Une question sur un comportement animal, un coup de main, une garde ? Posez-la à la communauté.
              </p>
            </div>
            <Link to="/questions/nouvelle" className="shrink-0">
              <Button>Poser une question</Button>
            </Link>
          </div>

          <div className="space-y-3 mb-6">
            <CategoryPills value={category} onChange={setCategory} />
            <div className="flex gap-2">
              {(["all", "open", "resolved"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatus(s)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${
                    status === s
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-card text-foreground/70 border-border hover:bg-accent"
                  }`}
                >
                  {s === "all" ? "Toutes" : s === "open" ? "Ouvertes" : "Résolues"}
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
          ) : items.length > 0 ? (
            <ul className="space-y-3">
              {items.map((q) => (
                <li key={q.id}>
                  <QuestionCard q={q} />
                </li>
              ))}
            </ul>
          ) : (
            <div className="p-8 rounded-2xl border border-dashed border-border bg-accent/20 text-center">
              <p className="font-heading text-lg text-foreground/85">Aucune question dans cette catégorie.</p>
              <Link to="/questions/nouvelle" className="inline-block mt-4">
                <Button>Poser la première question</Button>
              </Link>
            </div>
          )}
        </section>
      </div>
    </>
  );
};

export default Questions;
