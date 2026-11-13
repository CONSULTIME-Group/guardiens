/**
 * Lot SORT9 (13/11/2026) : « Que souhaitez-vous publier ? ».
 * Demande de Jérémie du 13/11 : le bouton « Publier » propose les trois types
 * (annonce de garde, coup de main, sortie) dans l'espace propriétaire comme dans
 * l'espace gardien. L'ordre suit l'espace : la garde en tête côté propriétaire,
 * le coup de main en tête côté gardien. Règles pures, sans image ni lecture.
 */
export type PublishKind = "garde" | "coup_de_main" | "sortie";

export interface PublishChoice {
  kind: PublishKind;
  to: string;
  eyebrow: string;
  title: string;
  text: string;
}

export const PUBLISH_PATH = "/publier";

export const PUBLISH_COPY = {
  title: "Que souhaitez-vous publier ?",
  intro: "Trois façons de faire appel aux gens du coin. Guardiens est gratuit.",
  introTwo: "Deux façons de faire appel aux gens du coin. Guardiens est gratuit.",
  footer: "La rencontre reste toujours facultative, avant comme après.",
} as const;

const CHOICES: Record<PublishKind, PublishChoice> = {
  garde: {
    kind: "garde",
    to: "/sits/create",
    eyebrow: "Vous partez",
    title: "Une annonce de garde",
    text: "Quelqu'un s'installe chez vous et veille sur la maison et les animaux.",
  },
  coup_de_main: {
    kind: "coup_de_main",
    to: "/petites-missions/creer",
    eyebrow: "Un service ponctuel",
    title: "Un coup de main",
    text: "Demander ou proposer : potager, courses, trajet, bricolage.",
  },
  sortie: {
    kind: "sortie",
    to: "/sorties/proposer",
    eyebrow: "À plusieurs",
    title: "Une sortie",
    text: "Belote, balade, sport, atelier : vous fixez le jour et le nombre de places.",
  },
};

/** Les choix dans l'ordre de l'espace ; la sortie suit l'ouverture de la rubrique. */
export function publishChoices(space: "owner" | "sitter", outingsOpen: boolean): PublishChoice[] {
  const order: PublishKind[] = space === "owner" ? ["garde", "coup_de_main", "sortie"] : ["coup_de_main", "sortie", "garde"];
  return order.filter((k) => k !== "sortie" || outingsOpen).map((k) => CHOICES[k]);
}
