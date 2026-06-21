import { useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import PageMeta from "@/components/PageMeta";
import PageBreadcrumb from "@/components/seo/PageBreadcrumb";
import { Button } from "@/components/ui/button";
import AnswerThread from "@/components/community/AnswerThread";
import AnswerComposer from "@/components/community/AnswerComposer";
import { useQuestionDetail } from "@/hooks/useQuestionDetail";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { CATEGORY_LABEL } from "@/lib/communityCategories";
import { trackEvent } from "@/lib/analytics";
import { toast } from "sonner";

const SITE_URL = "https://guardiens.fr";

const QuestionDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { question, answers, loading, reload } = useQuestionDetail(id);

  useEffect(() => {
    if (id) trackEvent("question_view", { metadata: { id } });
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
          <div className="h-8 w-2/3 bg-muted/40 rounded animate-pulse mb-4" />
          <div className="h-40 bg-muted/40 rounded-xl animate-pulse" />
        </div>
      </div>
    );
  }

  if (!question) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="text-center">
          <p className="font-heading text-lg mb-4">Question introuvable.</p>
          <Link to="/questions"><Button variant="outline">Voir toutes les questions</Button></Link>
        </div>
      </div>
    );
  }

  const url = `${SITE_URL}/questions/${question.id}`;
  const qaPageSchema = {
    "@context": "https://schema.org",
    "@type": "QAPage",
    mainEntity: {
      "@type": "Question",
      name: question.title,
      text: question.body,
      answerCount: question.answers_count,
      dateCreated: question.created_at,
      ...(answers.length > 0 && {
        suggestedAnswer: answers.slice(0, 5).map((a) => ({
          "@type": "Answer",
          text: a.body,
          upvoteCount: a.helpful_count,
          dateCreated: a.created_at,
          url: `${url}#answer-${a.id}`,
        })),
      }),
      ...(question.accepted_answer_id && answers.find((a) => a.id === question.accepted_answer_id) && {
        acceptedAnswer: {
          "@type": "Answer",
          text: answers.find((a) => a.id === question.accepted_answer_id)!.body,
        },
      }),
    },
  };

  const markResolved = async () => {
    if (!user || user.id !== question.author_id) return;
    const { error } = await supabase
      .from("community_questions")
      .update({ status: "resolved" })
      .eq("id", question.id);
    if (error) {
      toast.error("Action impossible.");
      return;
    }
    trackEvent("question_mark_resolved", { metadata: { id: question.id, answers_count: question.answers_count } });
    toast.success("Question marquée comme résolue.");
    void reload();
  };

  const isAuthor = user?.id === question.author_id;

  return (
    <>
      <PageMeta
        title={`${question.title.slice(0, 60)}, Questions & conseils`}
        description={question.body.slice(0, 160)}
        path={`/questions/${question.id}`}
      />
      <Helmet>
        <script type="application/ld+json">{JSON.stringify(qaPageSchema)}</script>
      </Helmet>

      <div className="min-h-screen bg-background">
        <PageBreadcrumb
          items={[
            { label: "Questions & conseils", href: "/questions" },
            { label: question.title.slice(0, 40) + (question.title.length > 40 ? "…" : "") },
          ]}
        />

        <section className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
              {CATEGORY_LABEL[question.category]}
            </span>
            {question.status === "resolved" && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                Résolu
              </span>
            )}
            {question.city && (
              <span className="text-xs text-foreground/55">{question.city}</span>
            )}
          </div>

          <h1 className="font-heading text-2xl sm:text-3xl font-bold text-foreground">{question.title}</h1>
          <p className="text-foreground/85 mt-4 whitespace-pre-line leading-relaxed">{question.body}</p>

          {isAuthor && question.status === "open" && (
            <div className="mt-4">
              <Button variant="outline" size="sm" onClick={markResolved}>
                Marquer comme résolue
              </Button>
            </div>
          )}

          <div className="mt-10">
            <h2 className="font-heading text-xl font-semibold mb-4">
              {answers.length} réponse{answers.length > 1 ? "s" : ""}
            </h2>
            <AnswerThread answers={answers} questionId={question.id} onPosted={reload} />
          </div>

          <div className="mt-8 pt-6 border-t border-border">
            <h3 className="font-heading text-lg font-semibold mb-3">Votre réponse</h3>
            {user ? (
              <AnswerComposer
                questionId={question.id}
                isFirstAnswer={answers.length === 0}
                onPosted={reload}
              />
            ) : (
              <div className="p-4 rounded-xl bg-accent/40 border border-border">
                <p className="text-sm text-foreground/80 mb-3">Connectez-vous pour répondre.</p>
                <Button onClick={() => navigate(`/login?redirect=/questions/${question.id}`)}>
                  Se connecter
                </Button>
              </div>
            )}
          </div>
        </section>
      </div>
    </>
  );
};

export default QuestionDetail;
