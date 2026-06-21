import { Link } from "react-router-dom";
import { CATEGORY_LABEL } from "@/lib/communityCategories";
import type { CommunityQuestionRow } from "@/hooks/useCommunityQuestions";

const formatRelative = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "à l'instant";
  if (m < 60) return `il y a ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `il y a ${h} h`;
  const d = Math.floor(h / 24);
  return `il y a ${d} j`;
};

const QuestionCard = ({ q }: { q: CommunityQuestionRow }) => {
  return (
    <Link
      to={`/questions/${q.id}`}
      className="block p-4 rounded-xl border border-border bg-card hover:bg-accent/50 transition-colors"
    >
      <div className="flex items-center gap-2 mb-2">
        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
          {CATEGORY_LABEL[q.category]}
        </span>
        {q.status === "resolved" && (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
            Résolu
          </span>
        )}
        {q.is_pinned && (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
            Épinglé
          </span>
        )}
      </div>
      <p className="font-heading text-base font-semibold text-foreground line-clamp-2">{q.title}</p>
      <p className="text-sm text-foreground/70 mt-1 line-clamp-2">{q.body}</p>
      <div className="flex items-center gap-3 mt-3 text-xs text-foreground/55">
        <span>{q.answers_count} réponse{q.answers_count > 1 ? "s" : ""}</span>
        {q.city && <span>· {q.city}</span>}
        <span>· {formatRelative(q.created_at)}</span>
      </div>
    </Link>
  );
};

export default QuestionCard;
