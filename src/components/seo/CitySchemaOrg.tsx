import { Helmet } from "react-helmet-async";
import type { CityData } from "@/data/cities";
import type { CityStats } from "@/hooks/useCityStats";

interface Props {
  city: CityData;
  stats: CityStats;
}

const CitySchemaOrg = ({ city }: Props) => {
  const graph = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Service",
        name: `House-sitting et garde d'animaux à ${city.name}`,
        description: city.metaDescription,
        serviceType: ["House Sitting", "Pet Sitting"],
        provider: {
          "@type": "Organization",
          name: "Guardiens",
          url: "https://guardiens.fr",
        },
        areaServed: {
          "@type": "City",
          name: city.name,
          containedInPlace: {
            "@type": "AdministrativeArea",
            name: "Auvergne-Rhône-Alpes",
            containedInPlace: {
              "@type": "Country",
              name: "France",
            },
          },
        },
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "EUR",
          description: "Gratuit pour les propriétaires",
        },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Accueil",
            item: "https://guardiens.fr",
          },
          {
            "@type": "ListItem",
            position: 2,
            name: "House-sitting en Auvergne-Rhône-Alpes",
            item: "https://guardiens.fr/house-sitting-aura",
          },
          {
            "@type": "ListItem",
            position: 3,
            name: `House-sitting à ${city.name}`,
            item: `https://guardiens.fr/house-sitting-${city.slug}`,
          },
        ],
      },
      {
        "@type": "FAQPage",
        mainEntity: [
          {
            "@type": "Question",
            name: `Comment trouver un gardien de maison à ${city.name} ?`,
            acceptedAnswer: {
              "@type": "Answer",
              text: `Sur Guardiens, vous publiez une annonce gratuite et les gardiens disponibles à ${city.name} et ses environs postulent directement. Chaque gardien est vérifié manuellement avant d'apparaître sur la plateforme.`,
            },
          },
          {
            "@type": "Question",
            name: `Est-ce vraiment gratuit pour les propriétaires à ${city.name} ?`,
            acceptedAnswer: {
              "@type": "Answer",
              text: "Oui. Guardiens est gratuit pour tous les propriétaires, sans limite dans le temps. Seuls les gardiens paient un abonnement annuel de 49€ pour accéder aux annonces et postuler.",
            },
          },
          {
            "@type": "Question",
            name: `Que se passe-t-il en cas d'urgence pendant la garde à ${city.name} ?`,
            acceptedAnswer: {
              "@type": "Answer",
              text: "Guardiens dispose d'un réseau de Gardiens d'Urgence dans chaque zone, disponibles sous 15 minutes. En cas d'imprévu — animal malade, problème technique — le gardien en poste peut déclencher une alerte directement depuis l'application.",
            },
          },
        ],
      },
    ],
  };

  return (
    <Helmet>
      <script type="application/ld+json">{JSON.stringify(graph)}</script>
    </Helmet>
  );
};

export default CitySchemaOrg;
