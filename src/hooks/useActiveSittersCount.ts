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
 *
 * Important : `public_sitter_profiles` et `public_profiles` sont des vues, sans
 * clé étrangère déclarée. PostgREST ne sait donc pas résoudre une jointure
 * imbriquée du type `public_profiles!inner(...)`, la requête reste vide. On
 * fait deux lectures paginées séparées et on recoupe côté client.
 */
const MIN_PROFILE_COMPLETION = 40;
const PAGE_SIZE = 1000;

async function fetchAllIds(
  table: string,
  column: string,
  apply: (q: any) => any,
): Promise<string[]> {
  const ids: string[] = [];
  for (let page = 0; ; page++) {
    const from = page * PAGE_SIZE;
    const { data, error } = await apply(
      (supabase as any).from(table).select(column),
    ).range(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    const rows = (data ?? []) as any[];
    rows.forEach((r) => {
      const v = r?.[column];
      if (v) ids.push(v as string);
    });
    if (rows.length < PAGE_SIZE) break;
  }
  return ids;
}

export function useActiveSittersCount() {
  return useQuery<number>({
    queryKey: ["active-sitters-count", MIN_PROFILE_COMPLETION],
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    queryFn: async () => {
      const [sitterIds, eligibleIds] = await Promise.all([
        fetchAllIds("public_sitter_profiles", "user_id", (q) => q),
        fetchAllIds("public_profiles", "id", (q) =>
          q.gte("profile_completion", MIN_PROFILE_COMPLETION),
        ),
      ]);
      const eligible = new Set(eligibleIds);
      return new Set(sitterIds.filter((id) => eligible.has(id))).size;
    },
  });
}
