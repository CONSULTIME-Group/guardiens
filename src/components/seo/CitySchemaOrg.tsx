import { Helmet } from "react-helmet-async";
import type { CityData } from "@/data/cities";
import type { CityStats } from "@/hooks/useCityStats";
import { slugify } from "@/lib/normalize";

interface Props {
  city: CityData;
  stats: CityStats;
}

const LYON_FAQ = [
  {
    q: "Comment rencontrer un gardien avant de confier ma maison ?",
    a: "Après avoir accepté une candidature, vous organisez une rencontre directement via la messagerie Guardiens. La plupart des propriétaires à Lyon choisissent un café de quartier ou une visite du logement. Cette étape est systématique et fortement recommandée.",
  },
  {
    q: "Que se passe-t-il en cas d'urgence ou d'imprévu ?",
    a: "Guardiens dispose d'un réseau de gardiens d'urgence à Lyon, mobilisables rapidement. En cas de problème vétérinaire, le gardien contacte la clinique indiquée dans le guide de la maison. En cas de problème technique, il suit les consignes laissées par le propriétaire.",
  },
  {
    q: "Comment sont vérifiés les gardiens à Lyon ?",
    a: "Chaque gardien fournit une pièce d'identité vérifiée manuellement par l'équipe Guardiens. Les avis croisés après chaque garde et les badges de fiabilité complètent le dispositif de confiance.",
  },
  {
    q: "Puis-je publier une annonce pour un chien ET un chat ?",
    a: "Absolument. Votre annonce peut inclure tous vos animaux. Les gardiens qui postulent voient la composition exacte de votre foyer et décident en connaissance de cause.",
  },
  {
    q: "Combien de temps à l'avance faut-il publier mon annonce ?",
    a: "Pour les vacances d'été à Lyon, nous recommandons un mois à l'avance. Pour un week-end, une à deux semaines suffisent généralement. Plus l'annonce est publiée tôt, plus vous recevez de candidatures de gardiens de qualité.",
  },
  {
    q: "Que faire si mon gardien annule au dernier moment ?",
    a: "C'est rare mais cela peut arriver. Guardiens active alors le réseau de gardiens d'urgence de votre zone. Le système de fiabilité pénalise les annulations répétées pour garantir la qualité du réseau.",
  },
  {
    q: "Comment se passe la remise des clés à Lyon ?",
    a: "Lors de la rencontre préalable ou le jour du départ, vous remettez les clés en main propre à votre gardien. Certains propriétaires lyonnais laissent un double dans une boîte à clés sécurisée.",
  },
  {
    q: "Guardiens fonctionne-t-il pour les gardes de plusieurs semaines ?",
    a: "Oui. La plateforme est conçue pour les gardes de toute durée, du week-end prolongé aux absences de plusieurs semaines. Les gardiens indiquent leurs disponibilités sur leur profil.",
  },
];

const DEFAULT_FAQ = (cityName: string) => [
  {
    q: `Comment trouver un gardien de maison à ${cityName} ?`,
    a: `Sur Guardiens, vous publiez une annonce et les gardiens disponibles à ${cityName} et ses environs postulent directement. Chaque gardien est vérifié manuellement avant d'apparaître sur la plateforme.`,
  },
  {
    q: `Est-ce vraiment gratuit pour les propriétaires à ${cityName} ?`,
    a: "Oui. Guardiens est sans frais pour tous les propriétaires, sans limite dans le temps. Seuls les gardiens paient un abonnement pour accéder aux annonces et postuler.",
  },
  {
    q: `Que se passe-t-il en cas d'urgence pendant la garde à ${cityName} ?`,
    a: "Guardiens dispose d'un réseau de Gardiens d'Urgence dans chaque zone. En cas d'imprévu — animal malade, problème technique — le gardien en poste peut déclencher une alerte directement depuis l'application.",
  },
];

const CitySchemaOrg = ({ city }: Props) => {
  const isLyon = city.slug === "lyon";
  const faqItems = isLyon ? LYON_FAQ : DEFAULT_FAQ(city.name);

  const graph: any[] = [
    {
      "@type": "Service",
      name: isLyon
        ? "Garde de chien et de chat à Lyon"
        : `House-sitting et garde d'animaux à ${city.name}`,
      description: city.metaDescription,
      serviceType: ["House Sitting", "Pet Sitting", "Dog Sitting", "Cat Sitting"],
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
        description: "Sans frais pour les propriétaires",
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
          name: city.department,
          // Slug département dérivé du nom (ex: "Haute-Savoie" → "haute-savoie",
          // "Puy-de-Dôme" → "puy-de-dome"). Cohérent avec /departement/:slug.
          item: `https://guardiens.fr/departement/${slugify(city.department)}`,
        },
        {
          "@type": "ListItem",
          position: 3,
          name: isLyon
            ? "Garde chien et chat Lyon"
            : `House-sitting à ${city.name}`,
          // Dernier item : pas de "item" URL (recommandation Google)
        },
      ],
    },
    {
      "@type": "FAQPage",
      mainEntity: faqItems.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: {
          "@type": "Answer",
          text: f.a,
        },
      })),
    },
  ];

  // Add LocalBusiness for Lyon
  if (isLyon) {
    graph.push({
      "@type": "LocalBusiness",
      name: "Guardiens — Garde d'animaux à Lyon",
      description:
        "Plateforme de garde de chien, de chat et de home sitting à Lyon. Gardiens de proximité vérifiés, sans commission.",
      url: "https://guardiens.fr/house-sitting/lyon",
      telephone: "",
      address: {
        "@type": "PostalAddress",
        streetAddress: "Rue Juiverie",
        addressLocality: "Lyon",
        postalCode: "69005",
        addressRegion: "Auvergne-Rhône-Alpes",
        addressCountry: "FR",
      },
      geo: {
        "@type": "GeoCoordinates",
        latitude: 45.764,
        longitude: 4.8357,
      },
      areaServed: {
        "@type": "City",
        name: "Lyon",
      },
      priceRange: "Gratuit pour les propriétaires",
    });
  }

  return (
    <Helmet>
      <script type="application/ld+json">
        {JSON.stringify({ "@context": "https://schema.org", "@graph": graph })}
      </script>
    </Helmet>
  );
};

export default CitySchemaOrg;
