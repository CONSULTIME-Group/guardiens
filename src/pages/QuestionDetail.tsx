import { useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import Head from "@/components/seo/Head";
import PageMeta from "@/components/PageMeta";
import PageBreadcrumb from "@/components/seo/PageBreadcrumb";
import { Button } from "@/components/ui/button";
import AnswerThread from "@/components/community/AnswerThread";
import { useQuestionDetail } from "@/hooks/useQuestionDetail";
import { questionCategoryLabel } from "@/lib/communityCategories";
import { trackEvent } from "@/lib/analytics";

const SITE_URL = "https://guardiens.fr";

const QuestionDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { question, answers, loading } = useQuestionDetail(id);

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
          <Link to="/petites-missions"><Button variant="outline">Voir l'Entraide</Button></Link>
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

  return (
    <>
      <PageMeta
        title={`${question.title.slice(0, 60)}, Questions & conseils`}
        description={question.body.slice(0, 160)}
        path={`/questions/${question.id}`}
      />
      <Head>
        <script type="application/ld+json">{JSON.stringify(qaPageSchema)}</script>
      </Head>

      <div className="min-h-screen bg-background">
        <PageBreadcrumb
          items={[
            { label: "Entraide", href: "/petites-missions" },
            { label: question.title.slice(0, 40) + (question.title.length > 40 ? "…" : "") },
          ]}
        />

        <section className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
              {questionCategoryLabel(question.category)}
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

          <div className="mt-10">
            <h2 className="font-heading text-xl font-semibold mb-4">
              {answers.length} réponse{answers.length > 1 ? "s" : ""}
            </h2>
            <AnswerThread answers={answers} questionId={question.id} readOnly />
          </div>

          {/* Lot C0 (26/10/2026) : écriture fermée, La communauté en attente. */}
          <p className="mt-8 pt-6 border-t border-border text-sm text-foreground/70">
            Cette question est en lecture seule. Pour un coup de main près de chez vous, rendez-vous sur{" "}
            <Link to="/petites-missions" className="text-primary hover:underline">l'Entraide</Link>.
          </p>
        </section>
      </div>
    </>
  );
};

export default QuestionDetail;
