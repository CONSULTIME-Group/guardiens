import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface SpeciesRow {
  espece: string;
  nombre: number;
  part_pourcent: number;
}

export interface SpeciesBreakdown {
  total_animaux_declares: number;
  total_membres: number;
  par_espece: SpeciesRow[];
  calcule_le: string | null;
}

const EMPTY: SpeciesBreakdown = {
  total_animaux_declares: 0,
  total_membres: 0,
  par_espece: [],
  calcule_le: null,
};

export function useSpeciesBreakdown() {
  return useQuery({
    queryKey: ["species-breakdown"],
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<SpeciesBreakdown> => {
      const { data, error } = await (supabase as any).rpc("get_species_breakdown");
      if (error) {
        console.error("get_species_breakdown error", error);
        return EMPTY;
      }
      return { ...EMPTY, ...(data as any) };
    },
  });
}
