import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { CommunityCategory } from "@/lib/communityCategories";

export interface QuestionDetailRow {
  id: string;
  author_id: string;
  category: CommunityCategory;
  title: string;
  body: string;
  city: string | null;
  status: "open" | "resolved" | "closed";
  answers_count: number;
  helpful_count: number;
  accepted_answer_id: string | null;
  is_pinned: boolean;
  created_at: string;
}

export interface AnswerRow {
  id: string;
  question_id: string;
  author_id: string;
  parent_answer_id: string | null;
  body: string;
  helpful_count: number;
  is_author_pick: boolean;
  created_at: string;
  author_name?: string | null;
  author_avatar?: string | null;
}

export const useQuestionDetail = (questionId: string | undefined) => {
  const [question, setQuestion] = useState<QuestionDetailRow | null>(null);
  const [answers, setAnswers] = useState<AnswerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!questionId) return;
    setLoading(true);
    setError(null);

    const [qRes, aRes] = await Promise.all([
      supabase
        .from("community_questions")
        .select("id, author_id, category, title, body, city, status, answers_count, helpful_count, accepted_answer_id, is_pinned, created_at")
        .eq("id", questionId)
        .maybeSingle(),
      supabase
        .from("community_answers")
        .select("id, question_id, author_id, parent_answer_id, body, helpful_count, is_author_pick, created_at")
        .eq("question_id", questionId)
        .eq("is_hidden", false)
        .order("is_author_pick", { ascending: false })
        .order("helpful_count", { ascending: false })
        .order("created_at", { ascending: true }),
    ]);

    if (qRes.error) setError(qRes.error.message);
    setQuestion((qRes.data as QuestionDetailRow) || null);

    const rows = (aRes.data as AnswerRow[]) || [];
    const authorIds = Array.from(new Set(rows.map((r) => r.author_id)));
    if (authorIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, first_name, avatar_url")
        .in("id", authorIds);
      const byId = new Map((profiles || []).map((p: any) => [p.id, p]));
      setAnswers(
        rows.map((r) => ({
          ...r,
          author_name: byId.get(r.author_id)?.first_name ?? null,
          author_avatar: byId.get(r.author_id)?.avatar_url ?? null,
        })),
      );
    } else {
      setAnswers(rows);
    }
    setLoading(false);
  }, [questionId]);

  useEffect(() => {
    void load();
  }, [load]);

  // Realtime subscription on answers
  useEffect(() => {
    if (!questionId) return;
    const channel = supabase
      .channel(`community_answers_${questionId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "community_answers", filter: `question_id=eq.${questionId}` },
        () => {
          void load();
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [questionId, load]);

  return { question, answers, loading, error, reload: load };
};
