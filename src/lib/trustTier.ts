/**
 * Calcule le palier de confiance d'un gardien à partir des signaux déjà
 * disponibles sur les cartes de recherche (aucune requête supplémentaire).
 *
 * Trois paliers :
 *  - elite   : gardien d'élite, anneau doré (Super Gardien implicite).
 *  - trusted : gardien vérifié OU expérimenté, anneau primary.
 *  - none    : aucun signal fort, pas d'anneau.
 *
 * Règles (toutes les conditions du palier doivent être remplies) :
 *  - elite   : identité vérifiée ET note moyenne ≥ 4,5 ET ≥ 5 gardes réalisées
 *  - trusted : identité vérifiée OU ≥ 3 gardes réalisées
 *
 * On utilise `completed_sits_count` comme proxy d'expérience plutôt que
 * `reviews_count` car il est toujours fourni par la requête sitter_profiles.
 */

export type TrustTier = "elite" | "trusted" | "none";

export interface TrustSignals {
  verified?: boolean | null;
  avgRating?: number | null;
  sitsCount?: number | null;
}

export function computeTrustTier({ verified, avgRating, sitsCount }: TrustSignals): TrustTier {
  const v = !!verified;
  const r = typeof avgRating === "number" ? avgRating : 0;
  const c = typeof sitsCount === "number" ? sitsCount : 0;

  if (v && r >= 4.5 && c >= 5) return "elite";
  if (v || c >= 3) return "trusted";
  return "none";
}

export function trustTierLabel(tier: TrustTier): string {
  switch (tier) {
    case "elite":
      return "Confiance élevée";
    case "trusted":
      return "Vérifié";
    default:
      return "";
  }
}
