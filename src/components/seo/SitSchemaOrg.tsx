import { Helmet } from "react-helmet-async";

interface SitSchemaProps {
  title: string;
  description: string;
  city: string;
  startDate?: string;
  endDate?: string;
  url: string;
  imageUrl?: string;
}

const SitSchemaOrg = ({ title, description, city, startDate, endDate, url, imageUrl }: SitSchemaProps) => {
  // Une annonce de garde correspond mieux à une `Offer` (avec validité temporelle)
  // qu'à un `Service` générique. `availabilityStarts`/`availabilityEnds` ne sont
  // pas valides sur Service ; sur Offer on utilise `validFrom`/`validThrough` qui
  // sont reconnus par Google et Schema.org.
  const schema: Record<string, any> = {
    "@context": "https://schema.org",
    "@type": "Offer",
    name: title,
    description: description.slice(0, 160),
    url,
    category: "House Sitting",
    price: "0",
    priceCurrency: "EUR",
    availability: "https://schema.org/InStock",
    seller: {
      "@type": "Organization",
      name: "Guardiens",
      url: "https://guardiens.fr",
    },
    areaServed: {
      "@type": "Place",
      address: {
        "@type": "PostalAddress",
        addressLocality: city,
        addressCountry: "FR",
      },
    },
    ...(imageUrl && { image: imageUrl }),
    ...(startDate && { validFrom: startDate }),
    ...(endDate && { validThrough: endDate }),
  };

  return (
    <Helmet>
      <script type="application/ld+json">{JSON.stringify(schema)}</script>
    </Helmet>
  );
};

export default SitSchemaOrg;
