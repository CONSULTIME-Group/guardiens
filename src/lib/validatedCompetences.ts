import { supabase } from "@/integrations/supabase/client";

/**
 * Lot SEC2 (07/11/2026) : le référentiel competences_validees ne se lit plus
 * en direct (table réservée à l'équipe admin). Les membres connectés passent
 * par la fonction list_validated_competences : libellés et catégories seuls,
 * triés par usage, 500 au plus. Hors connexion, la liste est vide.
 */
export interface ValidatedCompetenceQuery {
  search?: string | null;
  categorie?: string | null;
  limit?: number | null;
}

export async function fetchValidatedCompetenceLabels(
  query: ValidatedCompetenceQuery = {},
): Promise<string[]> {
  const { data, error } = await supabase.rpc("list_validated_competences", {
    p_search: query.search ?? undefined,
    p_categorie: query.categorie ?? undefined,
    p_limit: query.limit ?? undefined,
  });
  if (error || !Array.isArray(data)) return [];
  return data
    .map((row: { label?: unknown }) => row.label)
    .filter((label): label is string => typeof label === "string" && label.length > 0);
}
