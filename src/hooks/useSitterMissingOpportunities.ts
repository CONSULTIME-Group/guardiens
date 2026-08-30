/**
 * useSitterMissingOpportunities — charge les compteurs du bloc « occasions
 * manquées » via la RPC `sitter_missing_opportunities` (compteurs recalculés
 * à chaque appel sur les annonces publiées).
 *
 * La base porte deux surcharges de cette fonction (sans paramètre, et avec
 * `_sitter_id uuid DEFAULT NULL`). Un appel sans argument est ambigu et
 * échoue en 42725. On vise donc explicitement la surcharge paramétrée.
 *
 * Le bloc reste silencieux à l'écran en cas d'erreur (null), mais l'erreur
 * est toujours tracée en console : un échec de base ne doit plus disparaître.
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
        const { data, error } = await supabase.rpc(
          "sitter_missing_opportunities" as never,
          { _sitter_id: userId } as never,
        );
        if (cancelled) return;
        if (error) {
          console.error("[missing-opportunities] échec de la RPC", error);
          setStats(null);
          return;
        }
        if (!data || typeof data !== "object") {
          setStats(null);
          return;
        }
        const parsed = data as unknown as MissingOpportunitiesStats;
        if (typeof parsed.total_sits !== "number" || !Array.isArray(parsed.items)) {
          console.error("[missing-opportunities] réponse inattendue", parsed);
          setStats(null);
          return;
        }
        setStats(parsed);
      } catch (e) {
        if (!cancelled) {
          console.error("[missing-opportunities] exception", e);
          setStats(null);
        }
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  return stats;
};
