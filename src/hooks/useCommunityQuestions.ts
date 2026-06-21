import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { CommunityCategory } from "@/lib/communityCategories";

export interface CommunityQuestionRow {
  id: string;
  author_id: string;
  category: CommunityCategory;
  title: string;
  body: string;
  city: string | null;
  status: "open" | "resolved" | "closed";
  answers_count: number;
  helpful_count: number;
  is_pinned: boolean;
  created_at: string;
}

export interface UseCommunityQuestionsParams {
  category?: CommunityCategory | "all";
  status?: "all" | "open" | "resolved";
  limit?: number;
}

export const useCommunityQuestions = (params: UseCommunityQuestionsParams = {}) => {
  const { category = "all", status = "all", limit = 50 } = params;
  const [items, setItems] = useState<CommunityQuestionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    let query = supabase
      .from("community_questions")
      .select("id, author_id, category, title, body, city, status, answers_count, helpful_count, is_pinned, created_at")
      .eq("is_hidden", false)
      .order("is_pinned", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(limit);

    if (category !== "all") query = query.eq("category", category);
    if (status !== "all") query = query.eq("status", status);

    const { data, error: qErr } = await query;
    if (qErr) {
      setError(qErr.message);
      setItems([]);
    } else {
      setItems((data as CommunityQuestionRow[]) || []);
    }
    setLoading(false);
  }, [category, status, limit]);

  useEffect(() => {
    void load();
  }, [load]);

  return { items, loading, error, reload: load };
};
