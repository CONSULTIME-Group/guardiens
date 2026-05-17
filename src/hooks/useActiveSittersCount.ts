import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Compteur global « gardiens actifs en France ».
 *
 * Pourquoi : sur les empty-states locaux (carousel helpers vide), on rassure
 * que la plateforme n'est pas déserte globalement — juste localement. C'est un
 * signal de preuve sociale, pas un KPI métier ; tolère 5 min de staleness.
 *
 * Définition « actif » : role ∈ {sitter, both}. On exclut les pures
 * propriétaires. Pas de filtre d'activité récente (volontaire : compteur
 * de la base inscrite, pas de la base connectée — plus stable, moins anxiogène).
 */
export function useActiveSittersCount() {
  return useQuery<number>({
    queryKey: ["active-sitters-count"],
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    queryFn: async () => {
      const { count, error } = await supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .in("role", ["sitter", "both"]);
      if (error) throw error;
      return count ?? 0;
    },
  });
}
