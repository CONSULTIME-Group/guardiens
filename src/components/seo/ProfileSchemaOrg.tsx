import { Helmet } from "react-helmet-async";

interface ProfileSchemaProps {
  name: string;
  city?: string;
  avatarUrl?: string;
  bio?: string;
  avgRating?: number;
  reviewCount?: number;
  url: string;
}

const ProfileSchemaOrg = ({ name, city, avatarUrl, bio, avgRating, reviewCount, url }: ProfileSchemaProps) => {
  const schema: Record<string, any> = {
    "@context": "https://schema.org",
    "@type": "Person",
    name,
    url,
    ...(avatarUrl && { image: avatarUrl }),
    ...(bio && { description: bio.slice(0, 160) }),
    ...(city && {
      address: {
        "@type": "PostalAddress",
        addressLocality: city,
        addressCountry: "FR",
      },
    }),
  };

  if (avgRating > 0 && reviewCount > 0) {
    schema.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: avgRating,
      reviewCount,
      bestRating: 5,
    };
  }

  return (
    <Helmet>
      <script type="application/ld+json">{JSON.stringify(schema)}</script>
    </Helmet>
  );
};

export default ProfileSchemaOrg;
