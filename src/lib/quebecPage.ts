/**
 * Page « Gardiennage de maison au Québec » (lot QC1, 14/10/2026).
 *
 * Décision de Jérémie du 14/10/2026 : parler aux Québécois, propriétaires et
 * gardiens, autant qu'aux gardiens de France qui veulent garder au Québec.
 * Vocabulaire du Québec (« gardiennage de maison », « gardien de maison »,
 * « garde d'animaux à domicile »). Textes réunis ici pour être vérifiés par
 * les tests (doctrine Y3, ponctuation, sources officielles).
 *
 * Sources officielles citées (relues le 14/10/2026) :
 * - AVE : https://www.canada.ca/fr/immigration-refugies-citoyennete/services/visiter-canada/ave.html
 *   (mise à jour du 05/06/2026, « L'AVE ne coûte que 7 $ CA », voyage en avion).
 * - Dispense de visa : https://www.diplomatie.gouv.fr/fr/conseils-aux-voyageurs/conseils-par-pays-destination/canada/
 *   (« il n'y a pas d'obligation de visa pour les ressortissants français »,
 *   séjours touristiques de moins de six mois ; AVE pour un vol vers le Canada).
 * - Règles de séjour : site d'Immigration, Réfugiés et Citoyenneté Canada.
 */

export const QUEBEC_PATH = "/gardiennage-maison-quebec";
export const QUEBEC_URL = `https://guardiens.fr${QUEBEC_PATH}`;

export const QUEBEC_TITLE = "Gardiennage de maison au Québec, gardiens de confiance";
export const QUEBEC_DESCRIPTION =
  "Faites garder votre maison et vos animaux au Québec par un gardien de confiance, ou gardez une maison au Québec. Guardiens est gratuit, pour les propriétaires comme pour les gardiens.";
export const QUEBEC_H1 = "Gardiennage de maison et d'animaux au Québec";

export const QUEBEC_INTRO =
  "Vous partez quelques jours ou quelques semaines et vous cherchez quelqu'un de confiance pour veiller sur votre maison, votre chat ou votre chien ? Sur Guardiens, un gardien de maison s'installe chez vous pendant votre absence, en échange du logement. Vos animaux gardent leurs habitudes et votre maison reste habitée. Guardiens est gratuit, pour les propriétaires comme pour les gardiens.";

export const AVE_URL =
  "https://www.canada.ca/fr/immigration-refugies-citoyennete/services/visiter-canada/ave.html";
export const IRCC_URL = "https://www.canada.ca/fr/immigration-refugies-citoyennete.html";
export const DIPLOMATIE_URL =
  "https://www.diplomatie.gouv.fr/fr/conseils-aux-voyageurs/conseils-par-pays-destination/canada/";

export interface QuebecSection {
  id: string;
  title: string;
  paragraphs: string[];
  steps?: string[];
}

export const QUEBEC_SECTIONS: QuebecSection[] = [
  {
    id: "proprietaires",
    title: "Propriétaires au Québec : faire garder votre maison",
    paragraphs: [
      "Vous décrivez votre maison, vos animaux et vos dates. Les gardiens intéressés vous écrivent, vous consultez leur profil, leurs avis et leur vérification d'identité, puis vous choisissez la personne qui vous convient.",
      "Votre annonce paraît aussi dans les annonces internationales de Guardiens, consultées par les gardiens inscrits au Canada comme en France. La communauté québécoise de Guardiens démarre : publier tôt laisse aux gardiens qui viennent de loin le temps d'organiser leur séjour autour de votre garde.",
    ],
    steps: [
      "Publiez votre annonce : dates, animaux, maison, attentes.",
      "Lisez les messages des gardiens et leurs profils.",
      "Échangez dans la messagerie, et proposez une rencontre ou un appel vidéo si vous le souhaitez tous les deux.",
      "Choisissez votre gardien et préparez son arrivée avec le guide de la maison.",
    ],
  },
  {
    id: "gardiens-quebec",
    title: "Gardiens au Québec : rejoindre la communauté",
    paragraphs: [
      "Vous aimez les animaux et vous aimez découvrir de nouveaux coins ? Créez votre profil de gardien, indiquez votre ville et vos disponibilités : les annonces publiées près de chez vous vous arrivent en premier.",
      "Les premiers gardiens inscrits dans une région sont aussi les premiers que voient les propriétaires qui la rejoignent. Chaque garde réussie vous apporte un avis qui compte pour la suivante.",
    ],
  },
  {
    id: "gardiens-france",
    title: "Gardiens de France : garder une maison au Québec",
    paragraphs: [
      "Garder une maison au Québec, c'est vivre quelques semaines au rythme d'une ville ou d'un village, avec un chien à promener ou un chat qui vous attend le soir. Les annonces publiées au Canada figurent dans les annonces internationales de Guardiens.",
      "Pour un séjour touristique de moins de six mois, les citoyens français sont dispensés de visa. En avion, ils demandent une autorisation de voyage électronique (AVE), au prix de 7 $ CA, sur le site officiel du gouvernement du Canada.",
      "Une garde sur Guardiens est un échange entre particuliers : le logement contre une présence attentive et les soins aux animaux. Les règles qui encadrent votre séjour sont publiées par Immigration, Réfugiés et Citoyenneté Canada et par le ministère français des Affaires étrangères : consultez-les avant de confirmer une garde.",
    ],
  },
  {
    id: "vivre-la-garde",
    title: "Une garde au Québec, en pratique",
    paragraphs: [
      "De décembre à mars, l'hiver québécois est long et enneigé. Parlez ensemble du déneigement, du chauffage, des sorties du chien par grand froid et des contacts utiles en cas de tempête.",
      "Hors des grandes villes, les distances se comptent souvent en voiture : précisez dans l'annonce si un véhicule est disponible et où se trouvent l'épicerie et la clinique vétérinaire les plus proches.",
      "Au Québec, on parle de gardiennage de maison, de gardien ou de gardienne de maison et de garde d'animaux à domicile : autant de mots pour la même confiance.",
    ],
  },
];

export interface QuebecFaq {
  question: string;
  answer: string;
}

export const QUEBEC_FAQ: QuebecFaq[] = [
  {
    question: "Comment faire garder sa maison au Québec ?",
    answer:
      "Publiez une annonce sur Guardiens avec vos dates, vos animaux et votre maison. Les gardiens intéressés vous écrivent, vous échangez dans la messagerie et vous choisissez la personne qui vous convient.",
  },
  {
    question: "Combien coûte le gardiennage de maison sur Guardiens ?",
    answer:
      "Guardiens est gratuit, pour les propriétaires comme pour les gardiens. La garde est un échange : le gardien est logé, le propriétaire part l'esprit tranquille.",
  },
  {
    question: "Faut-il rencontrer le gardien avant la garde ?",
    answer:
      "La rencontre est proposée si vous le souhaitez tous les deux, en personne ou par appel vidéo quand le gardien arrive de loin.",
  },
  {
    question: "Un gardien qui vient de France a-t-il besoin d'un visa ?",
    answer:
      "Pour un séjour touristique de moins de six mois, les citoyens français sont dispensés de visa. En avion, ils demandent une autorisation de voyage électronique (AVE) sur le site officiel du gouvernement du Canada, au prix de 7 $ CA.",
  },
  {
    question: "Qui peut garder ma maison au Québec ?",
    answer:
      "Des gardiens inscrits sur Guardiens, au Québec comme en France. Chaque profil présente une présentation, des avis de gardes passées et, pour beaucoup, une identité vérifiée.",
  },
];

export function quebecJsonLd(): object[] {
  return [
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      "@id": `${QUEBEC_URL}#page`,
      url: QUEBEC_URL,
      name: QUEBEC_H1,
      description: QUEBEC_DESCRIPTION,
      inLanguage: "fr",
      about: {
        "@type": "Place",
        name: "Québec",
        address: { "@type": "PostalAddress", addressRegion: "QC", addressCountry: "CA" },
      },
      isPartOf: { "@type": "WebSite", name: "Guardiens", url: "https://guardiens.fr" },
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: QUEBEC_FAQ.map((f) => ({
        "@type": "Question",
        name: f.question,
        acceptedAnswer: { "@type": "Answer", text: f.answer },
      })),
    },
  ];
}
