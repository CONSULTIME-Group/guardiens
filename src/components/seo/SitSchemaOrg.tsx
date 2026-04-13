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
  const schema: Record<string, any> = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: title,
    description: description.slice(0, 160),
    url,
    provider: {
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
    ...(startDate && { availabilityStarts: startDate }),
    ...(endDate && { availabilityEnds: endDate }),
  };

  return (
    <Helmet>
      <script type="application/ld+json">{JSON.stringify(schema)}</script>
    </Helmet>
  );
};

export default SitSchemaOrg;
