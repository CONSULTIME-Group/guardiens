import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface InventaireCounts {
  cities_total: number;
  places_total: number;
  places_by_category: Record<string, number>;
  breeds_total: number;
  breeds_by_species: Record<string, number>;
  pros_total: number;
  pros_by_category: Record<string, number>;
  generated_at: string;
}

const EMPTY: InventaireCounts = {
  cities_total: 0,
  places_total: 0,
  places_by_category: {},
  breeds_total: 0,
  breeds_by_species: {},
  pros_total: 0,
  pros_by_category: {},
  generated_at: new Date().toISOString(),
};

export function useInventaireCounts() {
  return useQuery({
    queryKey: ["inventaire-counts"],
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<InventaireCounts> => {
      const { data, error } = await (supabase as any).rpc("get_inventaire_counts");
      if (error) {
        console.error("get_inventaire_counts error", error);
        return EMPTY;
      }
      return { ...EMPTY, ...(data as any) };
    },
  });
}
