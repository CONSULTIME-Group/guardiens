import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface SuggestedAction {
  title: string;
  why: string;
  link: string;
  priority: "haute" | "moyenne" | "basse";
}

export interface ActivityAnalysis {
  generated_at: string;
  analysis: string;
  actions: SuggestedAction[];
}

/**
 * Charge la dernière analyse IA de l'activité (mode "latest") et expose une
 * régénération manuelle (mode "refresh"). Partagé entre la carte narrative
 * (ActivityAnalysisCard) et la file d'actions fusionnée (SignalsSection).
 */
export function useActivityAnalysis() {
  const [analysis, setAnalysis] = useState<ActivityAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (mode: "latest" | "refresh") => {
    try {
      const { data, error } = await supabase.functions.invoke("admin-activity-analysis", { body: { mode } });
      if (error) throw error;
      if (data?.analysis) setAnalysis(data as ActivityAnalysis);
      else if (mode === "latest") setAnalysis(null);
      if (mode === "refresh") toast.success("Analyse régénérée.");
    } catch (e) {
      if (mode === "refresh") toast.error(`Analyse impossible : ${(e as Error).message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load("latest");
  }, [load]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await load("refresh");
    setRefreshing(false);
  }, [load]);

  return { analysis, loading, refreshing, refresh };
}
