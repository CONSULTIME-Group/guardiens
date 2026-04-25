import { Helmet } from "react-helmet-async";

interface ProfileSchemaProps {
  name: string;
  city?: string;
  postalCode?: string;
  avatarUrl?: string;
  bio?: string;
  avgRating?: number;
  reviewCount?: number;
  completedSits?: number;
  identityVerified?: boolean;
  knowsAbout?: string[];
  url: string;
  role?: "sitter" | "owner" | "both";
}

const ProfileSchemaOrg = ({
  name,
  city,
  postalCode,
  avatarUrl,
  bio,
  avgRating,
  reviewCount,
  completedSits,
  identityVerified,
  knowsAbout,
  url,
  role,
}: ProfileSchemaProps) => {
  const schema: Record<string, any> = {
    "@context": "https://schema.org",
    "@type": "Person",
    name,
    url,
    ...(avatarUrl && { image: avatarUrl }),
    ...(bio && { description: bio.slice(0, 200) }),
    ...(city && {
      address: {
        "@type": "PostalAddress",
        addressLocality: city,
        ...(postalCode && { postalCode }),
        addressCountry: "FR",
      },
      areaServed: {
        "@type": "City",
        name: city,
      },
    }),
    ...(role === "sitter" || role === "both"
      ? { jobTitle: "Gardien d'animaux de confiance" }
      : role === "owner"
      ? { jobTitle: "Propriétaire d'animaux" }
      : {}),
    ...(knowsAbout && knowsAbout.length > 0 && { knowsAbout }),
    ...(identityVerified && {
      hasCredential: {
        "@type": "EducationalOccupationalCredential",
        credentialCategory: "Identity Verified",
        recognizedBy: { "@type": "Organization", name: "Guardiens" },
      },
    }),
  };

  if (avgRating && avgRating > 0 && reviewCount && reviewCount > 0) {
    schema.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: Number(avgRating.toFixed(1)),
      reviewCount,
      bestRating: 5,
      worstRating: 1,
    };
  }

  if (completedSits && completedSits > 0) {
    schema.interactionStatistic = {
      "@type": "InteractionCounter",
      // Schema.org attend une référence à une Action enum, pas une URL string brute.
      // PerformAction n'est pas un type valide ; on utilise une référence formatée.
      interactionType: { "@type": "Action", name: "Garde réalisée" },
      userInteractionCount: completedSits,
      name: "Gardes réalisées",
    };
  }

  return (
    <Helmet>
      <script type="application/ld+json">{JSON.stringify(schema)}</script>
    </Helmet>
  );
};

export default ProfileSchemaOrg;
