import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Compteur « gardiens réellement consultables ».
 *
 * On ne compte plus les inscrits au rôle gardien, mais les profils que la
 * recherche affiche vraiment, c'est-à-dire ceux qui disposent d'un profil
 * gardien et dont la complétion atteint le seuil d'affichage (40, aligné sur
 * `SearchOwner`). Un chiffre flatteur qu'aucune liste ne confirme ne sert
 * personne. Signal de preuve sociale, pas KPI métier : 5 min de staleness OK.
 */
const MIN_PROFILE_COMPLETION = 40;

export function useActiveSittersCount() {
  return useQuery<number>({
    queryKey: ["active-sitters-count", MIN_PROFILE_COMPLETION],
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    queryFn: async () => {
      const { count, error } = await (supabase as any)
        .from("public_sitter_profiles")
        .select("user_id, public_profiles!inner(profile_completion)", {
          count: "exact",
          head: true,
        })
        .gte("public_profiles.profile_completion", MIN_PROFILE_COMPLETION);
      if (error) throw error;
      return count ?? 0;
    },
  });
}
