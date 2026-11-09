/**
 * Lot SEO1 : sous le voyant « Rendu SEO » en alerte, la date de reprise
 * estimée et l'arriéré. Monté seulement quand le voyant est rouge : aucune
 * lecture quand le rendu tourne.
 *
 * Sources lisibles par un admin : prerender_recache_log (rendus réussis depuis
 * le début du cycle, le 4 du mois à 0 h à Paris, comme seo_reserve_render) et
 * seo_dirty_at des pages publiées (villes, départements, guides, articles).
 * La file d'adresses seo_url_outbox reste fermée aux comptes admin : elle
 * n'entre pas dans l'arriéré affiché.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  nextRenderCycleStart,
  prerenderResumeSentence,
  renderCycleStart,
} from "@/lib/admin/prerenderResume";

const DIRTY_TABLES = ["seo_city_pages", "seo_department_pages", "city_guides", "articles"] as const;

export const PRERENDER_RESUME_QUERY_KEY = ["admin_prerender_resume"] as const;

export function PrerenderResumeLine() {
  const { data, isLoading, isError } = useQuery({
    queryKey: PRERENDER_RESUME_QUERY_KEY,
    staleTime: 10 * 60_000,
    queryFn: async () => {
      const db = supabase as any;
      const now = new Date();
      const cycleStart = renderCycleStart(now);
      const okCount = await db
        .from("prerender_recache_log")
        .select("id", { count: "exact", head: true })
        .eq("ok", true)
        .gte("created_at", cycleStart.toISOString());
      if (okCount.error) throw okCount.error;
      const okRendersInCycle = okCount.count ?? 0;

      const dirty = await Promise.all(
        DIRTY_TABLES.map((t) =>
          db.from(t).select("id", { count: "exact", head: true }).eq("published", true).not("seo_dirty_at", "is", null),
        ),
      );
      const failed = dirty.find((r: any) => r.error);
      if (failed) throw failed.error;
      const backlog = dirty.reduce((n: number, r: any) => n + (r.count ?? 0), 0);
      return { okRendersInCycle, cycleStart, nextCycleStart: nextRenderCycleStart(now), backlog };
    },
  });

  if (isLoading) return null;
  if (isError || !data) {
    return <p className="text-xs text-muted-foreground" data-testid="prerender-resume">Reprise du rendu : lecture impossible.</p>;
  }
  return (
    <p className="text-xs text-muted-foreground" data-testid="prerender-resume">
      {prerenderResumeSentence(data)}
    </p>
  );
}
