/**
 * Lot D7 (09/11/2026, état G3) : zones d'alerte proposées au gardien loin de tout, avec
 * le nombre réel de gardes ouvertes par zone (get_alert_zone_options, lecture
 * seule, migration 0125). Lue seulement dans l'état G3 sur ordinateur.
 * Fonction absente (site publié avant la migration) ou erreur : aucune carte.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { AlertZoneData } from "@/lib/alertZoneOptions";

export const alertZoneOptionsKey = (userId: string | undefined) => ["alert-zone-options", userId] as const;

export function useAlertZoneOptions(userId: string | undefined, enabled: boolean) {
  const query = useQuery<AlertZoneData | null>({
    queryKey: alertZoneOptionsKey(userId),
    enabled: enabled && !!userId,
    staleTime: 30 * 60 * 1000,
    retry: false,
    queryFn: async () => {
      try {
        // Fonction ajoutée par la migration 0125, absente des types générés.
        const rpc = supabase.rpc.bind(supabase) as unknown as (
          fn: string,
          args?: Record<string, unknown>,
        ) => Promise<{ data: unknown; error: unknown }>;
        const { data, error } = await rpc("get_alert_zone_options");
        if (error || !data || typeof data !== "object") return null;
        return data as AlertZoneData;
      } catch {
        return null;
      }
    },
  });
  return query.data ?? null;
}
