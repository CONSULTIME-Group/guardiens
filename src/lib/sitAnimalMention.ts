/**
 * Détection d'incohérence « texte avec animaux, fiche sans animaux ».
 *
 * Contexte : jusqu'au 18/08/2026, un déclencheur serveur
 * (trg_sits_exige_un_animal) REFUSAIT la publication d'une annonce sans
 * animal. Il a été retiré par choix délibéré (migration 20260818073610,
 * décision produit du 12/08/2026) : une garde sans animaux est légitime,
 * Guardiens est du house-sitting. Ce retrait n'est pas un bug.
 *
 * Cette détection remplace le blocage par un SIGNAL (décision du 20/08/2026)
 * : si le titre ou les descriptions parlent d'animaux alors que la fiche ne
 * contient aucun animal, le formulaire propose au propriétaire de les
 * ajouter en un clic, au moment de publier. S'il publie quand même, il
 * publie. La règle ne bloque JAMAIS la publication.
 *
 * Cas concret à l'origine : annonce 5ff70ad0, publiée le 18/08/2026 à 08:15,
 * 39 minutes après le retrait du garde-fou serveur, avec un titre parlant
 * d'animaux et une fiche sans aucun animal.
 */

const SPECIES_RX =
  /\b(chats?|chatons?|chien(ne)?s?|chiots?|cheval|chevaux|poney|poneys|poules?|coqs?|lapins?|hamsters?|cochons?\s+d['’]inde|furets?|oiseaux?|poissons?|tortues?|rongeurs?|nac|animaux|animal)\b/i;

export interface SitAnimalMentionInput {
  title?: string | null;
  absenceReason?: string | null;
  sitterExpectations?: string | null;
  /** Consignes détaillées de l'annonce, lues en republication depuis /sits. */
  specificExpectations?: string | null;
}

/** Vrai si le texte publié mentionne au moins un animal. */
export const sitTextMentionsAnimals = (input: SitAnimalMentionInput): boolean => {
  const text = `${input.title ?? ""} ${input.absenceReason ?? ""} ${input.sitterExpectations ?? ""} ${input.specificExpectations ?? ""}`;
  if (!text.trim()) return false;
  return SPECIES_RX.test(text);
};

/**
 * Vrai quand le signal doit apparaître : le texte parle d'animaux et la
 * fiche n'en contient aucun. Signal uniquement, jamais un blocage.
 */
export const shouldPromptAnimalMention = (
  input: SitAnimalMentionInput,
  petCount: number,
): boolean => petCount === 0 && sitTextMentionsAnimals(input);
