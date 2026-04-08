/**
 * City-specific content for geo-localized destination pages.
 * Each city entry enriches the base DB data with editorial content,
 * hero images, POIs, and article sections for the CRO template.
 * Replicable: just add a new key per city.
 */

export interface CityPOI {
  title: string;
  description: string;
  icon: "mountain" | "water" | "stethoscope" | "tree" | "building" | "map";
}

export interface CityArticleSection {
  id: string;
  title: string;
  content: string;
}

export interface CityContentData {
  heroImage?: string;
  heroAlt: string;
  h1Override?: string;
  subtitle: string;
  articleSections: CityArticleSection[];
  pois: CityPOI[];
  nearbyTowns: string[];
}

const cityContent: Record<string, CityContentData> = {
  annecy: {
    heroAlt: "Vue panoramique du lac d'Annecy et des montagnes enneigées",
    subtitle: "Confiez votre maison et vos animaux à des voisins de confiance en Haute-Savoie.",
    articleSections: [
      {
        id: "pourquoi",
        title: "Pourquoi le house-sitting à Annecy ?",
        content: `Annecy, c'est le cadre de vie dont rêvent beaucoup de Français : le lac, les montagnes, une vieille ville colorée. Mais quand on part en vacances ou en déplacement, la question se pose : **qui s'occupe de la maison et des animaux ?**

Les pensions pour animaux autour d'Annecy coûtent entre 25 et 45 € par jour. Pour deux semaines, ça fait vite 350 à 600 €. Et votre chat qui déteste les cages ? Votre chien qui a besoin de son jardin ?

Le house-sitting, c'est la solution de bon sens : un gardien vérifié vient chez vous, s'occupe de vos animaux dans leur environnement, arrose le jardin, et veille sur la maison. **Gratuit pour le propriétaire. Logement offert pour le gardien.**

À Annecy, cette logique de proximité est naturelle. Les gens se connaissent entre quartiers, l'entraide est dans l'ADN savoyard. Guardiens digitalise cette confiance de voisinage.`,
      },
      {
        id: "securite",
        title: "Sécurité et vigilance : gel, jardin, montagne",
        content: `En Haute-Savoie, les hivers sont rudes. Un house-sitter à Annecy, ce n'est pas juste quelqu'un qui nourrit le chat — c'est quelqu'un qui :

- **Surveille les canalisations** quand il fait -10°C
- **Déneige les accès** pour éviter les chutes et les dégâts
- **Aère la maison** pour prévenir l'humidité
- **Vérifie le chauffage** et la chaudière en votre absence

En été, c'est l'arrosage du jardin, la gestion des volets contre la chaleur, et une présence dissuasive contre les cambriolages — un vrai sujet dans les zones résidentielles autour du lac.

**Un gardien local connaît ces réalités.** Il sait que la route du Semnoz peut geler en novembre, que les jardins en bord de lac demandent un arrosage spécifique, et que les vétos d'urgence sont à Seynod ou Meythet.`,
      },
      {
        id: "match",
        title: "Le match : pension animale vs Guardiens",
        content: `| | Pension | Guardiens |
|---|---|---|
| **Coût** | 25-45 €/jour | Gratuit |
| **Environnement** | Cage / box collectif | Chez vous |
| **Stress animal** | Élevé (changement) | Minimal (habitudes) |
| **Maison surveillée** | Non | Oui |
| **Jardin entretenu** | Non | Oui |
| **Lien humain** | Personnel de pension | Gardien de confiance |

Pour un séjour de 14 jours avec un chien et un chat, **vous économisez 500 à 800 € en moyenne** tout en offrant un meilleur confort à vos animaux.`,
      },
      {
        id: "comment",
        title: "Comment ça marche ?",
        content: `**1. Inscrivez-vous** — gratuit en 2 minutes, que vous soyez propriétaire ou gardien.

**2. Publiez votre annonce** — décrivez votre maison, vos animaux, les dates, et vos attentes.

**3. Recevez des candidatures** — les gardiens vérifiés de la région postulent. Regardez leurs avis, leur profil, leur expérience.

**4. Choisissez et partez serein** — échangez par messagerie, organisez la passation, et c'est parti.

Tout est sur la plateforme : messagerie, avis croisés, guide de la maison, et même des gardiens d'urgence en cas d'imprévu.`,
      },
    ],
    pois: [
      {
        title: "Balades au Semnoz",
        description: "Randonnées accessibles à 20 min d'Annecy. Parfait pour les gardiens avec chien — sentiers balisés et panoramas sur le lac.",
        icon: "mountain",
      },
      {
        title: "Baignades à Veyrier",
        description: "Plages dog-friendly en été. Les gardiens qui aiment la nature apprécient ce coin préservé au pied de la Tournette.",
        icon: "water",
      },
      {
        title: "Urgences vétérinaires 74",
        description: "Clinique VetAdom à Seynod et Urgences Vétérinaires du Lac à Meythet — ouvertes week-end et nuit.",
        icon: "stethoscope",
      },
    ],
    nearbyTowns: [
      "Annecy-le-Vieux",
      "Seynod",
      "Cran-Gevrier",
      "Meythet",
      "Pringy",
      "Argonay",
      "Veyrier-du-Lac",
      "Talloires",
      "Thônes",
      "La Clusaz",
    ],
  },

  lyon: {
    heroAlt: "Vue de Lyon depuis Fourvière avec la Saône et les toits dorés",
    subtitle: "Des gardiens de confiance dans la capitale des Gaules — quartier par quartier.",
    articleSections: [
      {
        id: "pourquoi",
        title: "Pourquoi le house-sitting à Lyon ?",
        content: `Lyon, deuxième ville de France, concentre une vie de quartier intense. Du Vieux Lyon à la Croix-Rousse, de Monplaisir à Confluence — chaque arrondissement a son caractère. Et quand on part, on veut quelqu'un qui connaît le coin.

Le house-sitting à Lyon, c'est confier sa maison et ses animaux à un voisin vérifié. Pas une pension impersonnelle, pas un inconnu trouvé sur un réseau social. **Un gardien local, de confiance, qui vit dans votre quartier.**`,
      },
      {
        id: "securite",
        title: "Sécurité urbaine et présence rassurante",
        content: `En ville, une maison vide se repère vite : volets fermés, boîte aux lettres pleine, pas de lumière le soir. Un house-sitter maintient les apparences et dissuade les intrusions.

À Lyon, les quartiers résidentiels comme le 5ème, le 3ème ou Tassin sont particulièrement concernés pendant les vacances scolaires.`,
      },
      {
        id: "match",
        title: "Pension vs Guardiens à Lyon",
        content: `Les pensions pour chiens à Lyon coûtent entre 30 et 50 €/jour. Avec Guardiens, c'est **gratuit pour le propriétaire**, et vos animaux restent chez eux, dans leur environnement.`,
      },
    ],
    pois: [
      {
        title: "Parc de la Tête d'Or",
        description: "Le plus grand parc urbain de France. Idéal pour les gardiens avec chien — grandes pelouses et sentiers ombragés.",
        icon: "tree",
      },
      {
        title: "Berges du Rhône",
        description: "Promenades dog-friendly le long du fleuve. Les gardiens sportifs adorent ce parcours de 5 km en plein cœur de ville.",
        icon: "water",
      },
      {
        title: "Urgences vétérinaires Lyon",
        description: "VetEmergency Lyon 8ème et Clinique Vétérinaire de Garde — 24h/24, 7j/7.",
        icon: "stethoscope",
      },
    ],
    nearbyTowns: [
      "Villeurbanne",
      "Écully",
      "Tassin-la-Demi-Lune",
      "Caluire-et-Cuire",
      "Sainte-Foy-lès-Lyon",
      "Oullins",
      "Bron",
      "Vénissieux",
    ],
  },

  grenoble: {
    heroAlt: "Vue de Grenoble avec les Alpes et la Bastille en arrière-plan",
    subtitle: "House-sitting au pied des Alpes — des gardiens de confiance dans l'agglomération grenobloise.",
    articleSections: [
      {
        id: "pourquoi",
        title: "Pourquoi le house-sitting à Grenoble ?",
        content: `Grenoble, ceinturée par trois massifs montagneux — Chartreuse, Vercors, Belledonne — attire des passionnés d'outdoor. Mais quand on part randonner, skier ou voyager, qui garde la maison et les animaux ?

Le house-sitting à Grenoble, c'est la réponse locale : un gardien vérifié s'installe chez vous, s'occupe de vos animaux dans leur environnement, et veille sur votre logement. **Gratuit pour le propriétaire.**

La cuvette grenobloise crée des contraintes spécifiques : pics de pollution en hiver, chaleur estivale concentrée, et quartiers en pente parfois difficiles d'accès par temps de neige. Un gardien local connaît ces réalités.`,
      },
      {
        id: "securite",
        title: "Pollution, montagne et vigilance : les réflexes d'un gardien grenoblois",
        content: `Grenoble est régulièrement touchée par des épisodes de pollution aux particules fines, surtout entre novembre et février. Un house-sitter averti sait :

- **Limiter les sorties** des animaux lors des alertes pollution (seuil PM10)
- **Fermer les fenêtres** et utiliser la VMC en mode recirculation
- **Adapter les promenades** vers les hauteurs mieux ventilées (Bastille, Meylan)

En hiver, les quartiers en pente de La Tronche, Corenc ou Eybens peuvent geler. Un gardien grenoblois anticipe le salage, connaît les parkings en contrebas et sait gérer un chauffage collectif.

En été, la cuvette concentre la chaleur : un bon gardien maintient les volets fermés la journée et aère en soirée — un réflexe vital pour les animaux sensibles.`,
      },
      {
        id: "match",
        title: "Pension vs Guardiens à Grenoble",
        content: `Les pensions pour chiens autour de Grenoble facturent entre 25 et 40 €/jour. Pour un chat, comptez 15 à 20 €.

| | Pension | Guardiens |
|---|---|---|
| **Coût** | 25-40 €/jour | Gratuit |
| **Environnement** | Cage / box | Chez vous |
| **Stress animal** | Élevé | Minimal |
| **Maison surveillée** | Non | Oui |
| **Jardin entretenu** | Non | Oui |

Pour un séjour ski de 10 jours avec un chien, **vous économisez 250 à 400 €** et votre animal reste dans son environnement.`,
      },
      {
        id: "quartiers",
        title: "Grenoble quartier par quartier",
        content: `Chaque quartier grenoblois a ses spécificités pour le house-sitting :

- **Centre-ville / Championnet** : appartements, copropriétés strictes, sorties chien au Parc Paul Mistral
- **Île Verte** : résidentiel calme, proximité Isère, idéal familles avec jardin
- **Bastille / Saint-Laurent** : logements en pente, vue exceptionnelle, accès parfois compliqué en hiver
- **Eybens / Échirolles** : maisons avec jardin, parking facile, quartiers familiaux
- **Meylan / La Tronche** : résidentiel chic, grands jardins, altitude = meilleur air mais risque verglas

Nos gardiens grenoblois connaissent ces spécificités et adaptent leur approche en conséquence.`,
      },
    ],
    pois: [
      {
        title: "Bastille & sentiers",
        description: "Réseau de randonnées accessible depuis le centre-ville. Montée à pied ou en téléphérique. Parfait pour les gardiens avec chien actif.",
        icon: "mountain",
      },
      {
        title: "Parc Paul Mistral",
        description: "Grand parc urbain central avec pelouses et zones ombragées — le poumon vert des gardiens en ville.",
        icon: "tree",
      },
      {
        title: "Urgences vétérinaires 38",
        description: "Clinique vétérinaire de garde à Échirolles — urgences 24h/24. Clinique du Drac à Fontaine en journée.",
        icon: "stethoscope",
      },
    ],
    nearbyTowns: [
      "Meylan",
      "Saint-Martin-d'Hères",
      "Échirolles",
      "Fontaine",
      "Sassenage",
      "La Tronche",
      "Corenc",
      "Voiron",
      "Eybens",
      "Seyssinet-Pariset",
    ],
  },
};

/**
 * Get city content by slug (normalized: lowercase, no accents, dashes).
 * Falls back to a generic structure if no specific content exists.
 */
export function getCityContent(slug: string): CityContentData | null {
  const normalized = slug
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "-");

  return cityContent[normalized] || null;
}

export default cityContent;
