/**
 * Charge une fois les seuils de matching affinité (feature_flags) et les
 * pousse dans le module `src/lib/affinityScore.ts` via `setAffinityThresholds`.
 *
 * À monter au niveau racine (App.tsx). Silencieux en cas d'erreur réseau :
 * on garde les valeurs par défaut (2 critères / 40 %) codées en dur, ce qui
 * évite tout freeze visuel du discovery.
 */
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { setAffinityThresholds } from "@/lib/affinityScore";

const KEYS = ["affinity_min_common_criteria", "affinity_min_score_percent"] as const;

export function useAffinityThresholdsBootstrap() {
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("feature_flags")
        .select("key, value_int, enabled")
        .in("key", KEYS as unknown as string[]);
      if (cancelled || error || !data) return;
      const patch: { minCommonCriteria?: number; minScorePercent?: number } = {};
      for (const row of data as { key: string; value_int: number | null; enabled: boolean | null }[]) {
        if (row.enabled === false || row.value_int == null) continue;
        if (row.key === "affinity_min_common_criteria") patch.minCommonCriteria = row.value_int;
        if (row.key === "affinity_min_score_percent") patch.minScorePercent = row.value_int;
      }
      setAffinityThresholds(patch);
    })();
    return () => { cancelled = true; };
  }, []);
}
