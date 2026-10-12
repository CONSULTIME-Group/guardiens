/**
 * pickAlmaRailPhrase (vague 17), logique pure de choix de la phrase
 * murmurée par Alma dans le rail du dashboard.
 *
 * Extraite de `AlmaRailWhisper` pour être testable en isolation. Les
 * chaînes retournées sont exactement celles rendues à l'écran (FR,
 * vouvoiement, sans emoji ni tiret cadratin).
 */

import { profileNudgeAllowed } from "@/lib/alma/profileNudge";

export type AlmaVariant = "confirmed" | "newSitter" | "owner";

export interface AlmaOwnerState {
  ongoingSit: boolean;
  ongoingSitterFirstName?: string | null;
  pendingApps: boolean;
  noActiveSit: boolean;
}

export interface AlmaPhraseInput {
  variant: AlmaVariant;
  hidden: boolean;
  /** Contexte gardien (variant confirmed / newSitter). */
  profileCompletion?: number;
  isAvailable?: boolean;
  checklistVisible?: boolean;
  openingCardVisible?: boolean;
  /** Contexte propriétaire (variant owner). */
  ownerState?: AlmaOwnerState;
  /** Lot E5 : aucun savoir-faire déclaré (profil gardien et propriétaire réunis). */
  skillsMissing?: boolean;
}

/** Lot E5 : adresse unique des savoir-faire (lot E1). */
export const SAVOIR_FAIRE_PATH = "/profile?section=savoir-faire";
export const ALMA_SKILLS_SITTER_PHRASE =
  "Ce que vous aimez faire pour les gens du coin compte aussi. Deux savoir-faire, et l'on sait à qui demander un coup de main.";
export const ALMA_SKILLS_OWNER_PHRASE =
  "Vous avez sûrement un savoir-faire à partager près de chez vous. Ajoutez-le, il apparaît sur la page Entraide.";
export const ALMA_SKILLS_ACTION_LABEL = "Ajouter mes savoir-faire";

export interface AlmaRailChoice {
  phrase: string;
  /** Lien direct (lot E5) ; sinon la carte ouvre la conversation avec Alma. */
  action: { id: string; label: string; href: string } | null;
}

/** Lot M1 : identifiant stable de l'action, porté par alma_rail_action_clicked. */
export const ALMA_SKILLS_ACTION_ID = "savoir_faire";
const skillsAction = { id: ALMA_SKILLS_ACTION_ID, label: ALMA_SKILLS_ACTION_LABEL, href: SAVOIR_FAIRE_PATH };

/**
 * Lot E5 : phrase et lien éventuel. Les gardes passent d'abord (garde en
 * cours, candidatures, annonce à raconter, profil, disponibilité) ; l'invitation
 * aux savoir-faire vient ensuite, à la place de la phrase d'ambiance.
 */
export function pickAlmaRail(input: AlmaPhraseInput): AlmaRailChoice {
  const phrase = pickAlmaRailPhraseBase(input);
  const { hidden, variant, skillsMissing, ownerState, checklistVisible = false, profileCompletion = 100, isAvailable = true, openingCardVisible = false } = input;
  if (hidden || !skillsMissing) return { phrase, action: null };
  if (variant === "owner") {
    if (ownerState && !ownerState.ongoingSit && !ownerState.pendingApps && !ownerState.noActiveSit) {
      return { phrase: ALMA_SKILLS_OWNER_PHRASE, action: skillsAction };
    }
    return { phrase, action: null };
  }
  if (variant === "newSitter" && openingCardVisible) return { phrase, action: null };
  if (!checklistVisible && profileNudgeAllowed(profileCompletion)) return { phrase, action: null };
  if (!isAvailable) return { phrase, action: null };
  return { phrase: ALMA_SKILLS_SITTER_PHRASE, action: skillsAction };
}

export function pickAlmaRailPhrase(input: AlmaPhraseInput): string {
  return pickAlmaRail(input).phrase;
}

function pickAlmaRailPhraseBase(input: AlmaPhraseInput): string {
  const {
    variant,
    hidden,
    profileCompletion = 100,
    isAvailable = true,
    checklistVisible = false,
    openingCardVisible = false,
    ownerState,
  } = input;

  if (hidden) {
    return "Je reste à portée de voix si vous changez d'avis.";
  }

  if (variant === "owner" && ownerState) {
    if (ownerState.ongoingSit) {
      return ownerState.ongoingSitterFirstName
        ? `Tout se passe bien chez vous. ${ownerState.ongoingSitterFirstName} veille sur la maison.`
        : "Tout se passe bien chez vous, votre gardien veille sur la maison.";
    }
    if (ownerState.pendingApps) {
      return "Prenez le temps de lire chaque candidature, la bonne rencontre se sent vite.";
    }
    if (ownerState.noActiveSit) {
      return "Quand vous serez prêt à partir, je vous aide à raconter votre maison.";
    }
    return "Votre annonce vit. Les bonnes personnes finissent toujours par se croiser.";
  }

  if (variant === "newSitter" && openingCardVisible) {
    return "Bienvenue chez vous. Une photo, quelques mots, et je vous présente les maisons d'ici.";
  }
  if (!checklistVisible && profileNudgeAllowed(profileCompletion)) {
    return "Quelques touches à votre profil, et les propriétaires vous remarquent davantage.";
  }
  if (!isAvailable) {
    return "Dites que vous êtes disponible, et les bonnes gardes viennent à vous.";
  }
  return "Un coup de main, un projet ou une garde près de chez vous : je vous montre ce qui bouge autour de vous.";
}
