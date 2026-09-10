/**
 * Questions fréquentes de la page publique des associations.
 * Textes figés, repris tels quels par l'accordéon et par le JSON-LD FAQPage :
 * une seule source de vérité pour l'affichage et pour les moteurs de réponse.
 */

export interface AssociationFaqItem {
  question: string;
  /** Réponse en texte simple, utilisée par le JSON-LD. */
  answer: string;
  /** Fragment cliquable dans la réponse et sa destination interne. */
  link?: { text: string; to: string };
}

export const ASSOCIATIONS_FAQ: AssociationFaqItem[] = [
  {
    question: "Comment aider une association de protection animale près de chez moi ?",
    answer:
      "Choisissez votre département dans la liste : chaque fiche indique ce dont l'association a besoin aujourd'hui (bénévoles, dons, familles d'accueil) et renvoie vers sa propre page pour agir. Partager une fiche aide aussi l'association à se faire connaître.",
  },
  {
    question: "Comment devenir famille d'accueil pour un chat ou un chien ?",
    answer:
      "Une famille d'accueil héberge un animal chez elle le temps qu'il trouve une famille pour la vie. Chaque association fixe ses conditions et son secteur : sur les fiches qui recherchent des familles d'accueil, le bouton « Devenir famille d'accueil » mène directement à sa page.",
  },
  {
    question: "Quelle différence entre un refuge, un sanctuaire et un réseau de familles d'accueil ?",
    answer:
      "Un refuge accueille les animaux dans ses propres locaux avant leur adoption. Un sanctuaire garde ses pensionnaires toute leur vie. Un réseau de familles d'accueil héberge les animaux chez des bénévoles jusqu'à leur adoption. Un centre de soins pour la faune sauvage soigne des animaux sauvages avant de les relâcher dans la nature.",
  },
  {
    question: "Comment faire un don à une association de protection animale ?",
    answer:
      "Sur chaque fiche, le bouton « Faire un don » ouvre la page de dons de l'association elle-même. Le don se fait directement auprès d'elle.",
  },
  {
    question: "Comment devenir bénévole dans une association animale ?",
    answer:
      "Les fiches précisent les missions quand l'association les publie : soins, nourrissage, transport vers le vétérinaire, collectes de nourriture, événements. Le bouton « Devenir bénévole » mène à sa page d'inscription.",
  },
  {
    question: "Je suis famille d'accueil, comment partir en vacances ?",
    answer:
      "Parlez-en d'abord à l'association qui vous a confié l'animal. Avec son accord, un gardien Guardiens peut veiller sur votre maison et vos animaux pendant votre absence.",
    link: { text: "un gardien Guardiens", to: "/annonces" },
  },
  {
    question: "Comment présenter mon association sur Guardiens ?",
    answer:
      "Écrivez-nous depuis le bouton « Présenter mon association ». On échange avec vous, on vérifie l'existence de l'association (numéro SIREN ou RNA), puis on rédige sa fiche avec vous.",
  },
];

/** JSON-LD FAQPage construit depuis une liste de questions/réponses. */
export const faqPageJsonLd = (items: Array<{ question: string; answer: string }>) => ({
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: items.map((item) => ({
    "@type": "Question",
    name: item.question,
    acceptedAnswer: { "@type": "Answer", text: item.answer },
  })),
});
