/**
 * useCommunityPulse, agrège des chiffres RÉELS de vitalité communautaire
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
import { communityTotals, FOUNDERS_ANIMALS, FOUNDERS_HOUSES } from "../../supabase/functions/_shared/community-totals.js";

// Lot CPT1 : socle et cumul lus dans le module partagé, mêmes chiffres que l'accueil.
export const FOUNDERS_HOUSES_OFFSET = FOUNDERS_HOUSES;
export const FOUNDERS_ANIMALS_OFFSET = FOUNDERS_ANIMALS;

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
      const totals = communityTotals(row);
      return {
        maisonsGardees: totals.houses,
        animauxAccompagnes: totals.animals,
        totalInscrits: typeof row?.total_inscrits === "number" ? row.total_inscrits : 0,
        missionsEntraide:
          typeof row?.missions_entraide === "number" ? row.missions_entraide : 0,
      };
    },
  });
}
