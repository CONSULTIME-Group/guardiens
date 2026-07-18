import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface PublicStats {
  total_inscrits: number;
  maisons_gardees: number;
  animaux_accompagnes: number;
  missions_entraide: number;
  generated_at?: string;
  [key: string]: any;
}

const EMPTY: PublicStats = {
  total_inscrits: 0,
  maisons_gardees: 0,
  animaux_accompagnes: 0,
  missions_entraide: 0,
  generated_at: new Date().toISOString(),
};

export function usePublicStats() {
  return useQuery({
    queryKey: ["public-stats"],
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<PublicStats> => {
      const { data: rows, error } = await (supabase as any).rpc("get_public_stats");
      if (error) {
        console.error("get_public_stats error", error);
        return EMPTY;
      }
      const data = Array.isArray(rows) ? rows[0] : rows;
      return { ...EMPTY, ...(data as any) };
    },
  });
}
