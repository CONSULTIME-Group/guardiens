import { Link } from "react-router-dom";
import { useCommunityQuestions } from "@/hooks/useCommunityQuestions";
import { CATEGORY_LABEL } from "@/lib/communityCategories";

const CommunityQuestionsSection = () => {
  const { items, loading } = useCommunityQuestions({ status: "open", limit: 3 });

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-1">
        <h2 className="font-heading text-xl font-semibold">Questions & conseils</h2>
        <Link to="/questions" className="text-xs text-primary hover:underline font-medium">
          Voir toutes les questions →
        </Link>
      </div>
      <p className="text-sm text-foreground/60 mt-1 mb-4">
        Posez une question à la communauté, comportement animal, jardin, garde, bricolage, et recevez plusieurs avis.
      </p>

      {loading ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-20 rounded-xl bg-muted/40 animate-pulse" />
          ))}
        </div>
      ) : items.length > 0 ? (
        <div className="space-y-2">
          {items.map((q) => (
            <Link
              key={q.id}
              to={`/questions/${q.id}`}
              className="block p-3 rounded-xl bg-card border border-border hover:bg-accent/50 transition-colors"
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                  {CATEGORY_LABEL[q.category]}
                </span>
                <span className="text-xs text-foreground/50">
                  {q.answers_count} réponse{q.answers_count > 1 ? "s" : ""}
                </span>
              </div>
              <p className="text-sm font-heading font-semibold line-clamp-2">{q.title}</p>
            </Link>
          ))}
        </div>
      ) : (
        <div className="p-6 rounded-xl border border-dashed border-border bg-accent/30 text-center">
          <p className="text-sm text-foreground/80">Aucune question ouverte pour le moment.</p>
          <Link
            to="/questions/nouvelle"
            className="inline-block text-sm text-primary font-semibold mt-2 hover:underline"
          >
            Poser la première question →
          </Link>
        </div>
      )}

      {items.length > 0 && (
        <div className="mt-3 text-center">
          <Link
            to="/questions/nouvelle"
            className="inline-block text-sm text-primary font-semibold hover:underline"
          >
            Poser une question →
          </Link>
        </div>
      )}
    </div>
  );
};

export default CommunityQuestionsSection;
