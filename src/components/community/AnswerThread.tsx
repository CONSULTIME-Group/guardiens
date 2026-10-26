import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import HelpfulButton from "./HelpfulButton";
import AnswerComposer from "./AnswerComposer";
import type { AnswerRow } from "@/hooks/useQuestionDetail";

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

interface Props {
  answers: AnswerRow[];
  questionId: string;
  onPosted?: () => void;
}

const AnswerThread = ({ answers, questionId, onPosted }: Props) => {
  const [replyingTo, setReplyingTo] = useState<string | null>(null);

  const { roots, repliesByParent } = useMemo(() => {
    const roots: AnswerRow[] = [];
    const byParent = new Map<string, AnswerRow[]>();
    for (const a of answers) {
      if (a.parent_answer_id) {
        const arr = byParent.get(a.parent_answer_id) ?? [];
        arr.push(a);
        byParent.set(a.parent_answer_id, arr);
      } else {
        roots.push(a);
      }
    }
    return { roots, repliesByParent: byParent };
  }, [answers]);

  if (answers.length === 0) {
    return (
      <p className="text-sm text-foreground/60 italic">
        Pas encore de réponse. Soyez la première personne à partager votre expérience.
      </p>
    );
  }

  const renderAnswer = (a: AnswerRow, depth = 0) => (
    <div key={a.id} className={depth === 0 ? "" : "ml-4 sm:ml-8 mt-3 border-l-2 border-border pl-3"}>
      <div className="p-3 rounded-xl bg-card border border-border">
        <div className="flex items-center gap-2 mb-2">
          <Avatar className="h-7 w-7">
            <AvatarImage src={a.author_avatar ?? undefined} />
            <AvatarFallback>{(a.author_name ?? "?").slice(0, 1).toUpperCase()}</AvatarFallback>
          </Avatar>
          <Link to={`/gardiens/${a.author_id}`} className="text-sm font-semibold hover:underline">
            {a.author_name ?? "Membre"}
          </Link>
          <span className="text-xs text-foreground/50">· {formatRelative(a.created_at)}</span>
          {a.is_author_pick && (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 ml-auto">
              Choisi par l'auteur
            </span>
          )}
        </div>
        <p className="text-sm text-foreground/85 whitespace-pre-line leading-relaxed">{a.body}</p>
        <div className="flex items-center gap-2 mt-3">
          <HelpfulButton answerId={a.id} initialCount={a.helpful_count} />
          {depth === 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => setReplyingTo(replyingTo === a.id ? null : a.id)}
            >
              {replyingTo === a.id ? "Annuler" : "Répondre"}
            </Button>
          )}
        </div>
        {replyingTo === a.id && (
          <div className="mt-3">
            <AnswerComposer
              questionId={questionId}
              parentAnswerId={a.id}
              onPosted={() => {
                setReplyingTo(null);
                onPosted?.();
              }}
              placeholder="Répondez à ce message…"
            />
          </div>
        )}
      </div>
      {(repliesByParent.get(a.id) ?? []).map((r) => renderAnswer(r, depth + 1))}
    </div>
  );

  return <div className="space-y-3">{roots.map((a) => renderAnswer(a, 0))}</div>;
};

export default AnswerThread;
