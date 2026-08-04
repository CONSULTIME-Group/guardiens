import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface BreakdownRow {
  cle: string;
  nombre: number;
  part_pourcent: number;
}

export interface SpeciesBreakdown {
  total_membres: number;
  departements_couverts: number;
  total_animaux: number;
  total_logements: number;
  par_espece: BreakdownRow[];
  par_autonomie: BreakdownRow[];
  par_niveau_activite: BreakdownRow[];
  par_type_logement: BreakdownRow[];
  par_environnement: BreakdownRow[];
  calcule_le: string | null;
}

const EMPTY: Omit<SpeciesBreakdown, "calcule_le"> & { calcule_le: string | null } = {
  total_membres: 0,
  departements_couverts: 0,
  total_animaux: 0,
  total_logements: 0,
  par_espece: [],
  par_autonomie: [],
  par_niveau_activite: [],
  par_type_logement: [],
  par_environnement: [],
  calcule_le: null,
};

export function useSpeciesBreakdown() {
  return useQuery({
    queryKey: ["species-breakdown"],
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<SpeciesBreakdown> => {
      const { data, error } = await (supabase as any).rpc("get_species_breakdown");
      // Un échec doit remonter comme une erreur : renvoyer des compteurs à zéro
      // afficherait une donnée fausse au lieu d'une absence de donnée.
      if (error) throw error;
      if (!data) throw new Error("get_species_breakdown: réponse vide");
      return { ...EMPTY, ...(data as any) };
    },
  });
}
