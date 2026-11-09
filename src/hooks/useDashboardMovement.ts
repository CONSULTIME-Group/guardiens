/**
 * Lot D4 (09/11/2026) : ce qui a bougé près du membre, pour l'accueil
 * ordinateur. Une lecture par session et par membre (get_dashboard_movement,
 * lecture seule), partagée par les deux espaces (même clé) ; elle remplace sur
 * ordinateur la ligne get_activity_since_last_visit (budget de lectures
 * inchangé). Fonction absente (site publié avant la migration) ou erreur :
 * aucune donnée, l'accueil garde sa phrase.
 */
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { takePreviousDesktopVisit, type MovementData } from "@/lib/dashboardMovement";

export function useDashboardMovement(userId: string | undefined, enabled: boolean) {
  const [previousVisit] = useState<string | null>(() =>
    enabled && userId ? takePreviousDesktopVisit(userId) : null,
  );
  const query = useQuery<MovementData | null>({
    queryKey: ["dashboard-movement", userId],
    enabled: enabled && !!userId,
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    retry: false,
    queryFn: async () => {
      try {
        // Fonction ajoutée par la migration 0123, absente des types générés.
        const rpc = supabase.rpc.bind(supabase) as unknown as (
          fn: string,
          args: Record<string, unknown>,
        ) => Promise<{ data: unknown; error: unknown }>;
        const { data, error } = await rpc("get_dashboard_movement", { p_since: previousVisit });
        if (error || !data || typeof data !== "object") return null;
        return data as MovementData;
      } catch {
        return null;
      }
    },
  });
  return { data: query.data ?? null, previousVisit };
}
