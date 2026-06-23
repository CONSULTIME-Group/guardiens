import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";

// Schema.org ItemList des annonces récentes publiées (max 8).
// Aligné avec les filtres qualité du sitemap (titre ≥ 10 car, daily_routine ≥ 100 car).
// Inséré dans <head> via Helmet pour éviter d'alourdir le @graph principal.
interface SitRow {
  id: string;
  slug: string | null;
  title: string;
  city: string | null;
  start_date: string | null;
  end_date: string | null;
}

const RecentSitsItemListJsonLd = ({ limit = 8 }: { limit?: number }) => {
  const [sits, setSits] = useState<SitRow[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("sits")
        .select("id, slug, title, city, start_date, end_date, daily_routine, created_at")
        .eq("status", "published")
        .eq("accepting_applications", true)
        .order("created_at", { ascending: false })
        .limit(limit * 3);
      if (cancelled || !data) return;
      const filtered = (data as any[])
        .filter((s) => typeof s.title === "string" && s.title.trim().length >= 10)
        .filter((s) => ((s.daily_routine || "").length) >= 100)
        .slice(0, limit)
        .map((s) => ({
          id: s.id, slug: s.slug ?? null, title: s.title, city: s.city,
          start_date: s.start_date, end_date: s.end_date,
        }));
      setSits(filtered);
    })();
    return () => { cancelled = true; };
  }, [limit]);

  if (sits.length === 0) return null;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "@id": "https://guardiens.fr/#recent-sits",
    name: "Annonces de garde récentes",
    numberOfItems: sits.length,
    itemListOrder: "https://schema.org/ItemListOrderDescending",
    itemListElement: sits.map((s, i) => {
      const seg = s.slug || s.id;
      const url = `https://guardiens.fr/annonces/${seg}`;
      return {
        "@type": "ListItem",
        position: i + 1,
        url,
        name: s.title,
        item: {
          "@type": "Service",
          name: s.title,
          url,
          serviceType: "Home sitting",
          provider: { "@id": "https://guardiens.fr/#organization" },
          ...(s.city && {
            areaServed: { "@type": "City", name: s.city },
          }),
          ...(s.start_date && { validFrom: s.start_date }),
          ...(s.end_date && { validThrough: s.end_date }),
        },
      };
    }),
  };

  return (
    <Helmet>
      <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
    </Helmet>
  );
};

export default RecentSitsItemListJsonLd;
