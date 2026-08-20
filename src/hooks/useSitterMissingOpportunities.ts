/**
 * useSitterMissingOpportunities — charge les compteurs du bloc « occasions
 * manquées » via la RPC `sitter_missing_opportunities` (compteurs recalculés
 * à chaque appel sur les annonces publiées).
 *
 * Silencieux en cas d'erreur ou pour un non-gardien : le bloc ne s'affiche
 * simplement pas (null).
 */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { MissingOpportunitiesStats } from "@/lib/missingOpportunities";

export const useSitterMissingOpportunities = (
  userId?: string,
): MissingOpportunitiesStats | null => {
  const [stats, setStats] = useState<MissingOpportunitiesStats | null>(null);

  useEffect(() => {
    if (!userId) {
      setStats(null);
      return;
    }
    let cancelled = false;

    const load = async () => {
      try {
        const { data, error } = await supabase.rpc("sitter_missing_opportunities" as never);
        if (cancelled) return;
        if (error || !data || typeof data !== "object") {
          setStats(null);
          return;
        }
        const parsed = data as unknown as MissingOpportunitiesStats;
        if (typeof parsed.total_sits !== "number" || !Array.isArray(parsed.items)) {
          setStats(null);
          return;
        }
        setStats(parsed);
      } catch {
        if (!cancelled) setStats(null);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  return stats;
};
