// Même liste, même ordre et mêmes titres que les cartes effectivement rendues.
const RecentSitsItemListJsonLd = ({ listings, name }: {
  listings: readonly { href: string; title: string }[];
  name: string;
}) => {
  if (listings.length === 0) return null;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "@id": "https://guardiens.fr/#en-ce-moment",
    name,
    numberOfItems: listings.length,
    itemListOrder: "https://schema.org/ItemListOrderAscending",
    itemListElement: listings.map((listing, i) => {
      const url = `https://guardiens.fr${listing.href}`;
      return {
        "@type": "ListItem",
        position: i + 1,
        url,
        name: listing.title,
      };
    }),
  };

  return (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
  );
};

export default RecentSitsItemListJsonLd;
