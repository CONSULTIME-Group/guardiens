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
  /** Évènements publics (Person.event) pour enrichir le parcours dans Schema.org. */
  events?: Array<{ name: string; date: string }>;
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
  events,
}: ProfileSchemaProps) => {
  // ── Person de base (toujours présent) ──
  const person: Record<string, any> = {
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
    ...(events && events.length > 0 && {
      subjectOf: events.map((e) => ({
        "@type": "Event",
        name: e.name,
        startDate: e.date.slice(0, 10),
      })),
    }),
  };

  // ── Service (éligible Rich Results, porte aggregateRating + zone desservie) ──
  // Ne crée le bloc Service que pour les gardiens (pas pour les propriétaires purs).
  const isSitter = role === "sitter" || role === "both";
  const hasRating = !!(avgRating && avgRating > 0 && reviewCount && reviewCount > 0);

  let service: Record<string, any> | null = null;
  if (isSitter) {
    service = {
      "@context": "https://schema.org",
      "@type": "Service",
      serviceType: "Garde d'animaux à domicile (house-sitting)",
      provider: { "@type": "Person", name, url, ...(avatarUrl && { image: avatarUrl }) },
      ...(city && { areaServed: { "@type": "City", name: city, addressCountry: "FR" } }),
      ...(bio && { description: bio.slice(0, 200) }),
      url,
    };
    if (hasRating) {
      service.aggregateRating = {
        "@type": "AggregateRating",
        ratingValue: Number(avgRating!.toFixed(1)),
        reviewCount,
        bestRating: 5,
        worstRating: 1,
      };
    }
    if (completedSits && completedSits > 0) {
      service.interactionStatistic = {
        "@type": "InteractionCounter",
        // URL d'enum Action standard (PerformAction = action générique de réalisation)
        interactionType: "https://schema.org/PerformAction",
        userInteractionCount: completedSits,
        name: "Gardes réalisées",
      };
    }
  }

  return (
    <Helmet>
      <script type="application/ld+json">{JSON.stringify(person)}</script>
      {service && (
        <script type="application/ld+json">{JSON.stringify(service)}</script>
      )}
    </Helmet>
  );
};

export default ProfileSchemaOrg;
