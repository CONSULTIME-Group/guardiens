/**
 * Lot E24 « Une question en public, une proposition d'aide en privé »
 * (maquette Claude Design « Entraide, questions publiques sur un besoin »).
 *
 * Bloc « Questions » de la fiche d'un besoin :
 *  - visiteur : les questions publiques et leur réponse ; le bloc apparaît dès
 *    la première question, avec la connexion pour en poser une ;
 *  - membre : le même bloc, plus « Poser une question » tant que le besoin est
 *    ouvert ; la question s'affiche aussitôt pour lui ;
 *  - auteur du besoin : « Répondre » sous chaque question sans réponse.
 * Une question gardée privée par la modération se lit seulement par la
 * personne qui la pose et par l'auteur, avec la mention qui le dit.
 */
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  ANSWER_MAX_LENGTH,
  QUESTION_MAX_LENGTH,
  QUESTION_MIN_LENGTH,
  answerMissionQuestion,
  askMissionQuestion,
  fetchMissionQuestions,
  questionWhen,
  type MissionQuestion,
} from "@/lib/missionQuestions";

export interface MissionQuestionsProps {
  missionId: string;
  /** Prénom de l'auteur du besoin, affiché dans les textes. */
  authorFirstName: string | null;
  /** Titre du besoin, rappelé dans la fenêtre. */
  needTitle: string;
  /** Membre connecté (null : visiteur). */
  userId: string | null;
  isAuthor: boolean;
  /** Besoin ouvert : on peut poser une question. */
  isOpen: boolean;
  /** Adresse de retour après connexion. */
  loginRedirect: string;
  /** Questions déjà chargées (tests). */
  initialQuestions?: MissionQuestion[];
}

export default function MissionQuestions({
  missionId, authorFirstName, needTitle, userId, isAuthor, isOpen, loginRedirect, initialQuestions,
}: MissionQuestionsProps) {
  const { toast } = useToast();
  const [questions, setQuestions] = useState<MissionQuestion[]>(initialQuestions ?? []);
  const [loaded, setLoaded] = useState(Boolean(initialQuestions));
  const [askOpen, setAskOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [answering, setAnswering] = useState<string | null>(null);
  const author = authorFirstName?.trim() || "l'auteur";

  const load = useCallback(async () => {
    const rows = await fetchMissionQuestions(missionId);
    setQuestions(rows);
    setLoaded(true);
  }, [missionId]);

  useEffect(() => {
    if (!initialQuestions) void load();
  }, [load, initialQuestions]);

  const canAsk = Boolean(userId) && !isAuthor && isOpen;
  const showVisitorAsk = !userId && isOpen;
  if (!loaded) return null;
  if (questions.length === 0 && !canAsk) return null;

  const submitQuestion = async () => {
    if (sending) return;
    setSending(true);
    const res = await askMissionQuestion(missionId, draft);
    setSending(false);
    if (res.ok === false) {
      toast({ variant: "destructive", title: "Question en attente", description: res.message });
      return;
    }
    setAskOpen(false);
    setDraft("");
    toast({
      title: "Question publiée",
      description: res.isPublic
        ? `${capitalize(author)} répond ici, sur la fiche.`
        : `Votre question est lisible par vous et ${author}, qui répond ici.`,
    });
    await load();
  };

  const submitAnswer = async (q: MissionQuestion) => {
    if (answering) return;
    setAnswering(q.id);
    const res = await answerMissionQuestion(q.id, answers[q.id] ?? "");
    setAnswering(null);
    if (res.ok === false) {
      toast({ variant: "destructive", title: "Réponse en attente", description: res.message });
      return;
    }
    setAnswers((prev) => ({ ...prev, [q.id]: "" }));
    toast({ title: "Réponse publiée", description: "Elle s'affiche sous la question." });
    await load();
  };

  const draftLength = draft.trim().length;

  return (
    <section id="questions" aria-labelledby="questions-title" className="scroll-mt-24 space-y-3" data-mission-questions>
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="questions-title" className="font-heading text-xl font-semibold text-foreground">
          {questions.length > 0 ? `Questions (${questions.length})` : "Une question ?"}
        </h2>
        {questions.length > 0 && <span className="text-xs text-muted-foreground">visibles par tous</span>}
      </div>

      {questions.length > 0 && (
        <ul className="space-y-3 list-none p-0" aria-label="Questions sur ce besoin">
          {questions.map((q) => (
            <li key={q.id} className="rounded-card border border-border bg-card p-4 space-y-2" data-question-id={q.id}>
              <p className="text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">{q.is_mine ? "Vous" : q.asker_first_name || "Un membre"}</span>
                {" · "}{questionWhen(q.created_at)}
              </p>
              <p className="text-[15px] leading-relaxed text-foreground whitespace-pre-line">{q.body}</p>
              {!q.is_public && (
                <p className="text-xs text-muted-foreground">Lisible par vous et {isAuthor ? "la personne qui la pose" : author}.</p>
              )}
              {q.answer ? (
                <div className="ml-3 rounded-field bg-primary/5 px-3 py-2 space-y-1">
                  <p className="text-xs font-semibold text-primary">{isAuthor ? "Votre réponse" : `Réponse de ${capitalize(author)}`}</p>
                  <p className="text-[15px] leading-relaxed text-foreground whitespace-pre-line">{q.answer}</p>
                </div>
              ) : isAuthor && isOpen ? (
                <div className="space-y-2 pt-1">
                  <label htmlFor={`answer-${q.id}`} className="text-sm font-semibold text-foreground">Votre réponse</label>
                  <Textarea
                    id={`answer-${q.id}`}
                    rows={3}
                    maxLength={ANSWER_MAX_LENGTH}
                    value={answers[q.id] ?? ""}
                    onChange={(e) => setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
                    className="rounded-field border-field text-base"
                  />
                  <Button
                    size="sm"
                    className="rounded-full min-h-11"
                    disabled={answering === q.id || (answers[q.id] ?? "").trim().length === 0}
                    aria-busy={answering === q.id}
                    onClick={() => void submitAnswer(q)}
                  >
                    {answering === q.id ? "Publication en cours..." : "Publier ma réponse"}
                  </Button>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">{capitalize(author)} répondra ici.</p>
              )}
            </li>
          ))}
        </ul>
      )}

      {canAsk && (
        <>
          {questions.length === 0 && (
            <p className="text-sm text-muted-foreground leading-relaxed">
              Une précision avant de dire « Je peux » ? Posez votre question ici, {author} répond sur la fiche.
            </p>
          )}
          <Button
            variant="outline"
            className="w-full rounded-full min-h-12 border-primary text-primary font-semibold"
            onClick={() => setAskOpen(true)}
          >
            Poser une question
          </Button>
        </>
      )}
      {showVisitorAsk && questions.length > 0 && (
        <Link to={`/login?redirect=${encodeURIComponent(`${loginRedirect}#questions`)}`} className="block">
          <Button variant="outline" className="w-full rounded-full min-h-12 border-primary text-primary font-semibold">
            Me connecter pour poser une question
          </Button>
        </Link>
      )}
      {questions.length > 0 && !isAuthor && (
        <p className="text-sm text-muted-foreground leading-relaxed">
          Une question se lit par tous, sur cette page. Votre « Je peux » arrive chez {author} seul(e), et vous vous
          organisez ensemble dans la messagerie.
        </p>
      )}

      <Dialog open={askOpen} onOpenChange={(o) => { if (!sending) setAskOpen(o); }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-heading">Une question pour {capitalize(author)}</DialogTitle>
            <DialogDescription>{needTitle}</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <label htmlFor="ask-question" className="text-sm font-semibold text-foreground">Votre question</label>
            <Textarea
              id="ask-question"
              rows={4}
              maxLength={QUESTION_MAX_LENGTH}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Par exemple : les plantes vivent dedans ou sur un balcon ?"
              className="rounded-field border-field text-base"
            />
            <div className="flex justify-between gap-3 text-xs text-muted-foreground">
              <span>{capitalize(author)} répond ici, sur la fiche.</span>
              <span aria-live="polite">{draftLength} / {QUESTION_MAX_LENGTH}</span>
            </div>
          </div>
          <div className="rounded-field bg-muted/60 p-3 text-sm leading-relaxed">
            <p className="font-semibold text-foreground">Visible par tous sur la fiche</p>
            <p className="text-muted-foreground">Gardez adresse et téléphone pour la messagerie, une fois {author} et vous d'accord.</p>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" className="rounded-full min-h-11" onClick={() => setAskOpen(false)} disabled={sending}>
              Annuler
            </Button>
            <Button
              className="rounded-full min-h-11 font-semibold"
              onClick={() => void submitQuestion()}
              disabled={sending || draftLength < QUESTION_MIN_LENGTH}
              aria-busy={sending}
            >
              {sending ? "Publication en cours..." : "Publier ma question"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}

function capitalize(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}
