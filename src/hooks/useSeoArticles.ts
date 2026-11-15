import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { reportAdminReadError } from "@/lib/admin/readError";
import { articleIndexStatus, type SeoArticle } from "@/lib/admin/seoMetrics";

/**
 * Lot SEO-A : articles publiés avec leur statut Google (indexable, redirigé,
 * noindex, canonique ailleurs), lus une seule fois pour tout l'onglet SEO.
 * Mêmes sources que le sitemap : articles.noindex, articles.canonical_url,
 * table redirects (scope article).
 */
export function useSeoArticles(): { articles: SeoArticle[] | null; allSlugs: Set<string> } {
  const [articles, setArticles] = useState<SeoArticle[] | null>(null);
  const [allSlugs, setAllSlugs] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const [art, red] = await Promise.all([
        supabase
          .from("articles")
          .select("slug, title, category, published, published_at, created_at, noindex, canonical_url")
          .order("id")
          .range(0, 9999),
        supabase.from("redirects").select("slug_from").eq("scope", "article").range(0, 9999),
      ]);
      if (cancelled) return;
      if (art.error) { reportAdminReadError("Trafic : articles publiés", art.error); return; }
      if (red.error) reportAdminReadError("Trafic : redirections d'articles", red.error);
      const redirected = new Set((red.data ?? []).map((r) => r.slug_from as string));
      const rows = art.data ?? [];
      setAllSlugs(new Set(rows.map((a) => a.slug)));
      setArticles(
        rows
          .filter((a) => a.published)
          .map((a) => ({
            slug: a.slug,
            title: a.title ?? a.slug,
            category: a.category ?? "",
            published_at: a.published_at,
            created_at: a.created_at,
            status: articleIndexStatus(a, redirected),
          })),
      );
    };
    load();
    return () => { cancelled = true; };
  }, []);

  return { articles, allSlugs };
}
