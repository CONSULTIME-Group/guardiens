import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";

interface NearbySit {
  id: string;
  slug: string | null;
  title: string | null;
  city: string | null;
  cover_photo_url: string | null;
}

/**
 * Module « Des annonces près de chez vous » affiché sous le bandeau des
 * annonces pourvues ou terminées : évite l'impasse pour le visiteur et
 * récupère la valeur des liens entrants vers ces pages en noindex.
 */
const NearbySitsModule = ({ city, excludeId }: { city?: string | null; excludeId?: string }) => {
  const [sits, setSits] = useState<NearbySit[]>([]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const base = () =>
          supabase
            .from("sits")
            .select("id, slug, title, city, cover_photo_url")
            .eq("status", "published")
            .eq("accepting_applications", true)
            .order("created_at", { ascending: false })
            .limit(6);

        const results: NearbySit[] = [];
        if (city) {
          const { data } = await base().eq("city", city);
          results.push(...((data || []) as NearbySit[]));
        }
        if (results.length < 3) {
          const { data } = await base();
          results.push(...((data || []) as NearbySit[]));
        }
        const seen = new Set<string>();
        const unique = results.filter((s) => {
          if (s.id === excludeId || seen.has(s.id)) return false;
          seen.add(s.id);
          return true;
        });
        if (!cancelled) setSits(unique.slice(0, 3));
      } catch (e: any) {
        logger.warn("[NearbySitsModule] load failed", { error: e?.message });
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [city, excludeId]);

  if (sits.length === 0) return null;

  return (
    <section className="max-w-6xl mx-auto px-4 md:px-6 py-6">
      <h2 className="font-heading text-lg md:text-xl font-semibold mb-4">Des annonces près de chez vous</h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {sits.map((s) => (
          <Link
            key={s.id}
            to={`/annonces/${s.slug || s.id}`}
            className="group rounded-2xl border border-border overflow-hidden bg-card hover:border-primary/40 transition-colors"
          >
            <div className="aspect-[4/3] bg-muted overflow-hidden">
              {s.cover_photo_url && (
                <img
                  src={s.cover_photo_url}
                  alt={s.title || "Annonce de garde"}
                  loading="lazy"
                  className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform"
                />
              )}
            </div>
            <div className="p-3">
              <p className="text-sm font-medium line-clamp-2">{s.title || "Annonce de garde"}</p>
              {s.city && <p className="text-xs text-muted-foreground mt-1">{s.city}</p>}
            </div>
          </Link>
        ))}
      </div>
      <Link to="/recherche" className="inline-flex mt-4 text-sm font-medium text-primary hover:underline">
        Voir toutes les annonces
      </Link>
    </section>
  );
};

export default NearbySitsModule;
