import { useRecentPublishedSits } from "@/hooks/useRecentPublishedSits";

// Schema.org ItemList des annonces récentes publiées (max 8).
// Aligné avec les filtres qualité du sitemap (titre ≥ 10 car, daily_routine ≥ 100 car).
// Rendu inline dans le corps du composant (react-helmet-async est inerte ici).
const RecentSitsItemListJsonLd = ({ limit = 8 }: { limit?: number }) => {
  const { data } = useRecentPublishedSits();

  const sits = (data ?? [])
    .filter((s) => typeof s.title === "string" && s.title.trim().length >= 10)
    .filter((s) => (s.daily_routine || "").length >= 100)
    .slice(0, limit);

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
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
  );
};

export default RecentSitsItemListJsonLd;
