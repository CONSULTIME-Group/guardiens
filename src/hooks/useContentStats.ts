import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ContentStatsScope {
  /** Slug d'une page ville publiée, active les clés ville_*. */
  citySlug?: string | null;
  /** Slug d'une page département publiée, active les clés departement_*. */
  departmentSlug?: string | null;
}

export interface ContentStatsResult {
  /** Clés plates renvoyées par la RPC get_content_stats. */
  values: Record<string, number | string | null> | undefined;
  isLoading: boolean;
  isSuccess: boolean;
}

/**
 * Charge les variables dynamiques du contenu éditorial (placeholders).
 * Mise en cache 5 minutes, les compteurs n'ont pas besoin d'être temps réel.
 */
export const useContentStats = (scope: ContentStatsScope = {}): ContentStatsResult => {
  const citySlug = scope.citySlug ?? null;
  const departmentSlug = scope.departmentSlug ?? null;

  const query = useQuery({
    queryKey: ["content-stats", citySlug, departmentSlug],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_content_stats", {
        p_city_slug: citySlug ?? undefined,
        p_department_slug: departmentSlug ?? undefined,
      });
      if (error) throw error;
      return (data ?? {}) as Record<string, number | string | null>;
    },
  });

  return { values: query.data, isLoading: query.isLoading, isSuccess: query.isSuccess };
};
