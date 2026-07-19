/**
 * pickAlmaRailPhrase (vague 17) — logique pure de choix de la phrase
 * murmurée par Alma dans le rail du dashboard.
 *
 * Extraite de `AlmaRailWhisper` pour être testable en isolation. Les
 * chaînes retournées sont exactement celles rendues à l'écran (FR,
 * vouvoiement, sans emoji ni tiret cadratin).
 */

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
}

export function pickAlmaRailPhrase(input: AlmaPhraseInput): string {
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
  if (!checklistVisible && profileCompletion < 100) {
    return "Quelques touches à votre profil, et les propriétaires vous remarquent davantage.";
  }
  if (!isAvailable) {
    return "Dites que vous êtes disponible, et les bonnes gardes viennent à vous.";
  }
  return "Votre profil est prêt. Une belle rencontre peut arriver à tout moment.";
}
