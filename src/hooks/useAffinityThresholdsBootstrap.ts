/**
 * Charge les seuils de matching affinité (feature_flags) uniquement pour un
 * utilisateur authentifié, puis les pousse dans le module
 * `src/lib/affinityScore.ts` via `setAffinityThresholds`.
 *
 * À monter au niveau racine (App.tsx). Silencieux en cas d'erreur réseau :
 * on garde les valeurs par défaut codées en dur dans `affinityScore.ts`,
 * ce qui évite tout freeze visuel du discovery.
 * Défauts réels : 3 critères communs, 35 % de score minimum.
 */
import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { setAffinityThresholds } from "@/lib/affinityScore";

const KEYS = ["affinity_min_common_criteria", "affinity_min_score_percent"] as const;

export function useAffinityThresholdsBootstrap() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user?.id) return;

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
  }, [user?.id]);
}
