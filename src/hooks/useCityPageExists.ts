import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CITIES } from "@/data/cities";

const STATIC_CITY_SLUGS = new Set(CITIES.map((c) => c.slug));

/**
 * Indique si une page ville /house-sitting/<slug> est réellement servie :
 * ville statique (src/data/cities.ts) ou ligne seo_city_pages publiée.
 *
 * Garde-fou maillage interne : tout lien vers une page ville inexistante
 * produit un 404 crawlable (régression SEO constatée via Search Console).
 * En cas d'erreur réseau, fail-closed : le lien n'est pas rendu.
 */
export const useCityPageExists = (slug: string | null | undefined): boolean => {
  const { data } = useQuery({
    queryKey: ["city-page-exists", slug],
    enabled: !!slug && !STATIC_CITY_SLUGS.has(slug),
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("seo_city_pages" as any)
        .select("slug")
        .eq("slug", slug!)
        .eq("published", true)
        .not("slug", "like", "test-%")
        .maybeSingle();
      if (error) return null;
      return data;
    },
  });
  return Boolean(slug && (STATIC_CITY_SLUGS.has(slug) || data));
};
