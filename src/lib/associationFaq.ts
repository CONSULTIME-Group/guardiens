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
    question: "Comment aider une association près de chez moi ?",
    answer:
      "Choisissez votre département et le thème qui vous parle (animaux, chantiers et nature, partage et solidarité, randonnées) : chaque fiche indique ce dont l'association a besoin aujourd'hui (bénévoles, dons, familles d'accueil, participants) et renvoie vers sa propre page pour agir. Partager une fiche aide aussi l'association à se faire connaître.",
  },
  {
    question: "Quelles associations Guardiens présente-t-il en dehors de la protection animale ?",
    answer:
      "Guardiens présente aussi des associations de chantiers participatifs, de nature et d'environnement, de jardins partagés et de réemploi, de solidarité et de randonnée. Le filtre « Thème » en haut de la page les regroupe, et les associations pour animaux restent en tête de liste.",
  },
  {
    question: "Comment donner un coup de main ponctuel à une association ?",
    answer:
      "Plusieurs fiches proposent des missions courtes : un chantier nature d'une demi-journée, une collecte de denrées, un ramassage de déchets, une sortie en groupe. Le détail et la prochaine date figurent sur la fiche, et l'inscription se fait directement auprès de l'association.",
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
    question: "Comment faire un don à une association ?",
    answer:
      "Sur chaque fiche qui propose un don, le bouton « Faire un don » ouvre la page de dons de l'association elle-même. Le don se fait directement auprès d'elle.",
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
