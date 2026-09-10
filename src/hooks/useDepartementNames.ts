import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Table de correspondance code de département vers nom lisible.
 * 103 lignes, DOM-TOM inclus, chargées une seule fois et partagées par
 * toutes les cartes via le cache react-query.
 *
 * On lit `nom` et jamais `nom_region` : pour la Polynésie française,
 * `nom_region` vaut « Outre-mer », moins informatif.
 */
export const useDepartementNames = (): Map<string, string> => {
  const { data } = useQuery({
    queryKey: ["departement-names"],
    staleTime: 24 * 60 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("departements" as any)
        .select("code, nom");
      if (error) return [] as { code: string; nom: string }[];
      return (data || []) as unknown as { code: string; nom: string }[];
    },
  });

  return new Map((data || []).map((d) => [String(d.code), d.nom]));
};
