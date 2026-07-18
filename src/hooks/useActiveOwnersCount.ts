import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Compteur global « propriétaires actifs en France ».
 *
 * Symétrique à useActiveSittersCount : role ∈ {owner, both}.
 * Sert la preuve sociale côté gardien (« il y a de la demande »)
 * ET côté propriétaire (« je ne suis pas seul »).
 */
export function useActiveOwnersCount() {
  return useQuery<number>({
    queryKey: ["active-owners-count"],
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    queryFn: async () => {
      const { count, error } = await supabase
        .from("public_profiles")
        .select("id", { count: "exact", head: true })
        .in("role", ["owner", "both"]);
      if (error) throw error;
      return count ?? 0;
    },
  });
}
