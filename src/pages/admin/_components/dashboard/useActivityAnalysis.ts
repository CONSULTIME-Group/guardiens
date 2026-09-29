import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { SuggestedAction } from "@/components/admin/signals/actionQueue";

export type { SuggestedAction };

export interface ActivityAnalysis {
  generated_at: string;
  analysis: string;
  actions: SuggestedAction[];
}

/**
 * Lot A13 : la dernière analyse est lue directement dans la table
 * admin_activity_analysis (lecture réservée aux admins), sans appel de
 * fonction serveur au chargement. La fonction admin-activity-analysis n'est
 * appelée qu'au clic sur « Générer » ou « Régénérer l'analyse ».
 */
export function useActivityAnalysis() {
  const [analysis, setAnalysis] = useState<ActivityAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase
          .from("admin_activity_analysis")
          .select("summary, actions, generated_at")
          .order("generated_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (error) throw error;
        if (cancelled) return;
        setAnalysis(
          data && typeof data.summary === "string"
            ? { analysis: data.summary, actions: Array.isArray(data.actions) ? (data.actions as unknown as SuggestedAction[]) : [], generated_at: data.generated_at }
            : null,
        );
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-activity-analysis", { body: { mode: "refresh" } });
      if (error) throw error;
      // La fonction renvoie { analysis: {...} } : la charge utile est déballée.
      const payload = data?.analysis as ActivityAnalysis | null | undefined;
      if (payload && typeof payload.analysis === "string") { setAnalysis(payload); setError(false); }
      toast.success("Analyse régénérée.");
    } catch (e) {
      toast.error(`Analyse impossible : ${(e as Error).message}`);
    } finally {
      setRefreshing(false);
    }
  }, []);

  return { analysis, loading, error, refreshing, refresh };
}
