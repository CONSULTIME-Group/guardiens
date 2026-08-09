import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import PageMeta from "@/components/PageMeta";
import PageBreadcrumb from "@/components/seo/PageBreadcrumb";
import CategoryPills from "@/components/community/CategoryPills";
import QuestionCard from "@/components/community/QuestionCard";
import { useCommunityQuestions } from "@/hooks/useCommunityQuestions";
import type { CommunityCategory } from "@/lib/communityCategories";

const Questions = () => {
  const { t } = useTranslation();
  const [category, setCategory] = useState<CommunityCategory | "all">("all");
  const [status, setStatus] = useState<"all" | "open" | "resolved">("all");
  const { items, loading } = useCommunityQuestions({ category, status, limit: 50 });

  return (
    <>
      <PageMeta
        title={t("questions.page_title")}
        description={t("questions.page_description")}
        path="/questions"
      />
      <div className="min-h-screen bg-background">
        <PageBreadcrumb items={[{ label: t("questions.heading") }]} />

        <section className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
          <div className="flex items-start justify-between gap-4 mb-6">
            <div>
              <h1 className="font-heading text-2xl sm:text-3xl font-bold text-foreground">
                {t("questions.heading")}
              </h1>
              <p className="text-foreground/70 mt-2">
                {t("questions.intro")}
              </p>
            </div>
            <Link to="/questions/nouvelle" className="shrink-0">
              <Button>{t("questions.ask")}</Button>
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
                  {t(`questions.filter_${s}`)}
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
              <p className="font-heading text-lg text-foreground/85">
                {t("questions.empty")}
              </p>
              <Link to="/questions/nouvelle" className="inline-block mt-4">
                <Button>{t("questions.ask_first")}</Button>
              </Link>
            </div>
          )}
        </section>
      </div>
    </>
  );
};

export default Questions;
