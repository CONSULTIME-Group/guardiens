/**
 * Lot PUB3 (recette du 08/11/2026) : texte de l'onglet « En ligne » vide de
 * Mes annonces. Un brouillon jamais publié n'est pas un historique : un
 * nouveau propriétaire avec son seul brouillon lisait « Vous avez 1 annonce
 * dans votre historique. Republiez une garde ».
 */
export interface EmptyStateSit {
  status: string;
  published_at?: string | null;
}

export const isNeverPublishedDraft = (s: EmptyStateSit) => s.status === "draft" && !s.published_at;

export function ownerActiveEmptyState(sits: EmptyStateSit[]): { description: string; actionLabel: string } {
  const history = sits.filter((s) => !isNeverPublishedDraft(s)).length;
  const drafts = sits.length - history;
  if (history > 0) {
    return {
      description: `Vous avez ${history} annonce${history > 1 ? "s" : ""} dans votre historique. Republiez une garde pour retrouver un gardien de confiance près de chez vous.`,
      actionLabel: "Publier une nouvelle annonce",
    };
  }
  if (drafts > 0) {
    return {
      description: `Votre brouillon est enregistré. Reprenez-le pour le publier : les gardiens près de chez vous le verront aussitôt.`,
      actionLabel: "Publier une nouvelle annonce",
    };
  }
  return {
    description: "Publiez votre première annonce pour trouver un gardien de confiance près de chez vous.",
    actionLabel: "Publier une annonce",
  };
}
