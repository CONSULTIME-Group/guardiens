import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Indique si une page département /departement/<slug> est réellement servie :
 * ligne seo_department_pages existante ET publiée.
 *
 * Garde-fou maillage interne : tout lien vers une page département inexistante
 * ou non publiée produit un 404 crawlable (régression SEO constatée sur les
 * guides de Polynésie). En cas d'erreur réseau, fail-closed : le lien n'est
 * pas rendu.
 */
export const useDepartmentPageExists = (slug: string | null | undefined): boolean => {
  const { data } = useQuery({
    queryKey: ["department-page-exists", slug],
    enabled: !!slug,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("seo_department_pages" as any)
        .select("slug")
        .eq("slug", slug!)
        .eq("published", true)
        .maybeSingle();
      if (error) return null;
      return data;
    },
  });
  return Boolean(slug && data);
};
