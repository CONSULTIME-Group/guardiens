/**
 * Aides de rédaction par catégorie, pour le formulaire d'entraide.
 *
 * Mesuré : 73 pour cent des publications tombaient en catégorie Animaux, en
 * partie parce que tous les textes d'aide parlaient d'un animal. Chaque
 * catégorie parle désormais de la chose concernée.
 *
 * Règle du réseau : un service contre un service, jamais d'argent. Les
 * suggestions de contrepartie restent des gestes, jamais des sommes.
 */
import type { MissionCategory } from "@/lib/missionCategories";

interface CategoryCopy {
  /** Exemple de titre, pour un besoin. */
  titleNeed: string;
  /** Exemple de titre, pour une offre. */
  titleOffer: string;
  /** Texte d'aide de la description, pour un besoin. */
  descNeed: string;
  /** Texte d'aide de la description, pour une offre. */
  descOffer: string;
  /** Suggestions de contrepartie, pour un besoin. */
  exchangeNeed: string[];
}

const COMMON_OFFER_EXCHANGES = [
  "Un coup de main en retour quand vous voulez",
  "Un moment partagé autour d'un café",
  "Rien, ça me fait plaisir",
];

const COPY: Record<string, CategoryCopy> = {
  animals: {
    titleNeed: "Ex : Promener mon chien 3 fois cette semaine",
    titleOffer: "Ex : Je peux nourrir vos chats en semaine",
    descNeed:
      "Précisez l'animal (espèce, taille, âge), les dates approximatives et ce que vous attendez concrètement (promenade, gamelle, jeu). Plus c'est clair, plus vite vous aurez des propositions.",
    descOffer:
      "Dites avec quels animaux vous êtes à l'aise, vos disponibilités et ce que vous proposez concrètement (promenade, gamelle, visite).",
    exchangeNeed: [
      "Un café et des biscuits maison",
      "Des œufs de la semaine",
      "Un coup de main en retour quand vous voulez",
    ],
  },
  garden: {
    titleNeed: "Ex : Arroser le potager pendant une semaine",
    titleOffer: "Ex : Je peux tondre une pelouse le samedi",
    descNeed:
      "Décrivez le jardin (surface, ce qui pousse), les gestes attendus (arrosage, tonte, taille) et la fréquence souhaitée.",
    descOffer:
      "Dites ce que vous savez faire au jardin, avec quel matériel, et sur quels créneaux vous êtes disponible.",
    exchangeNeed: [
      "Servez-vous dans les tomates et les courgettes",
      "Un café et des biscuits maison",
      "Un coup de main en retour quand vous voulez",
    ],
  },
  house: {
    titleNeed: "Ex : Fixer deux étagères dans le salon",
    titleOffer: "Ex : Je peux dépanner en petit bricolage",
    descNeed:
      "Décrivez la pièce, ce qui est à faire, le matériel déjà sur place et le temps que cela demande selon vous.",
    descOffer:
      "Dites quels travaux simples vous savez faire, votre outillage, et vos créneaux habituels.",
    exchangeNeed: [
      "Un repas partagé après le chantier",
      "Un café et des biscuits maison",
      "Un coup de main en retour quand vous voulez",
    ],
  },
  errand: {
    titleNeed: "Ex : Récupérer un colis en point relais jeudi",
    titleOffer: "Ex : Je fais mes courses le mardi, je peux en prendre",
    descNeed:
      "Précisez ce qu'il faut aller chercher, où, à quel moment, et comment vous récupérez ensuite les affaires.",
    descOffer:
      "Dites votre secteur, vos jours de courses, et ce que vous acceptez de transporter.",
    exchangeNeed: [
      "Un café à la remise du colis",
      "Des confitures maison",
      "Un coup de main en retour quand vous voulez",
    ],
  },
  transport: {
    titleNeed: "Ex : M'accompagner à un rendez-vous médical mardi",
    titleOffer: "Ex : Je peux accompagner à un rendez-vous en journée",
    descNeed:
      "Indiquez le trajet, l'horaire, la durée d'attente prévue et si un accompagnement sur place est utile. Aucun paiement n'est demandé ni proposé.",
    descOffer:
      "Dites votre secteur, vos créneaux, et si vous pouvez attendre sur place. Aucun paiement n'est demandé ni proposé.",
    exchangeNeed: [
      "Un café après le rendez-vous",
      "Un gâteau maison",
      "Un coup de main en retour quand vous voulez",
    ],
  },
  company: {
    titleNeed: "Ex : Un peu de compagnie pour ma mère le mercredi",
    titleOffer: "Ex : Je peux passer discuter une heure par semaine",
    descNeed:
      "Dites qui a besoin de présence, à quel rythme, ce qui fait plaisir (discuter, une promenade, un jeu) et ce qu'il faut savoir.",
    descOffer:
      "Dites ce que vous aimez partager (discussion, promenade, lecture) et vos disponibilités.",
    exchangeNeed: [
      "Un thé et une conversation",
      "Un gâteau maison",
      "Un coup de main en retour quand vous voulez",
    ],
  },
  skills: {
    titleNeed: "Ex : Aide pour remplir un dossier en ligne",
    titleOffer: "Ex : Je peux aider sur les démarches administratives",
    descNeed:
      "Décrivez le savoir-faire recherché ou la démarche à faire, le niveau d'aide attendu et le temps que cela peut prendre.",
    descOffer:
      "Décrivez votre savoir-faire, ce que vous pouvez transmettre, et sur quels créneaux.",
    exchangeNeed: [
      "Un savoir-faire en retour, dites-moi le vôtre",
      "Un café et des biscuits maison",
      "Un coup de main en retour quand vous voulez",
    ],
  },
  other: {
    titleNeed: "Ex : Un coup de main pour un déménagement samedi",
    titleOffer: "Ex : Je propose un coup de main ponctuel",
    descNeed:
      "Décrivez précisément ce dont vous avez besoin, quand, et ce que la personne devra faire concrètement.",
    descOffer:
      "Décrivez ce que vous proposez, quand, et pour qui cela peut être utile.",
    exchangeNeed: [
      "Un café et des biscuits maison",
      "Un repas partagé",
      "Un coup de main en retour quand vous voulez",
    ],
  },
};

const FALLBACK = COPY.other;

export function categoryTitleExample(
  category: string | null | undefined,
  missionType: "besoin" | "offre",
): string {
  const c = (category && COPY[category]) || FALLBACK;
  return missionType === "offre" ? c.titleOffer : c.titleNeed;
}

export function categoryDescHelp(
  category: string | null | undefined,
  missionType: "besoin" | "offre",
): string {
  const c = (category && COPY[category]) || FALLBACK;
  return missionType === "offre" ? c.descOffer : c.descNeed;
}

export function categoryExchangeSuggestions(
  category: string | null | undefined,
  missionType: "besoin" | "offre",
): string[] {
  if (missionType === "offre") return COMMON_OFFER_EXCHANGES;
  const c = (category && COPY[category]) || FALLBACK;
  return c.exchangeNeed;
}

export type { MissionCategory };
