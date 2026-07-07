/**
 * useCommunityPulse — agrège des chiffres RÉELS de vitalité communautaire
 * à afficher sur le dashboard (bandeau « Le pouls de la communauté »).
 *
 * Sources : RPC `get_public_stats` (source primaire). Aucun chiffre inventé.
 * Les offsets fondateurs (maisons gardées + animaux accompagnés sur la période
 * 2021-2026 par Jérémie et Elisa, déjà cités sur la Landing et dans
 * cityContent.ts) sont ajoutés au comptage courant pour éviter d'écraser
 * l'historique légitime.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const FOUNDERS_HOUSES_OFFSET = 37;
export const FOUNDERS_ANIMALS_OFFSET = 234;

export interface CommunityPulse {
  maisonsGardees: number;
  animauxAccompagnes: number;
  totalInscrits: number;
  missionsEntraide: number;
}

export function useCommunityPulse() {
  return useQuery<CommunityPulse>({
    queryKey: ["community-pulse"],
    staleTime: 10 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    queryFn: async () => {
      const { data: rows } = await supabase.rpc("get_public_stats");
      const row = Array.isArray(rows) ? rows[0] : rows;
      return {
        maisonsGardees:
          (typeof row?.maisons_gardees === "number" ? row.maisons_gardees : 0) +
          FOUNDERS_HOUSES_OFFSET,
        animauxAccompagnes:
          (typeof row?.animaux_accompagnes === "number" ? row.animaux_accompagnes : 0) +
          FOUNDERS_ANIMALS_OFFSET,
        totalInscrits: typeof row?.total_inscrits === "number" ? row.total_inscrits : 0,
        missionsEntraide:
          typeof row?.missions_entraide === "number" ? row.missions_entraide : 0,
      };
    },
  });
}
