/**
 * ownerStarVariant (vague 17), logique pure de sélection de la STAR du
 * dashboard propriétaire.
 *
 * Extraite de `OwnerStarSection` pour être testable en isolation.
 * Retourne l'une des 5 variantes exclusives, par priorité :
 *   1. `ongoing`       , une garde est en cours
 *   2. `applications`  , au moins une candidature pending
 *   3. `annonce`       , une annonce en ligne ou une garde confirmée (lot P1,
 *                        19/10/2026 : elle passe avant le brouillon, qui devient
 *                        une ligne secondaire de la même carte)
 *   4. `draft`         , au moins un brouillon « vivant »
 *   5. `publish`       , aucune annonce, invitation à publier
 *
 * Un brouillon est considéré « vivant » s'il n'est pas archivé et si ses
 * dates ne sont pas déjà passées (cf. règles OwnerDashboard).
 */

export type OwnerStarVariant = "ongoing" | "applications" | "annonce" | "draft" | "publish";

export interface OwnerStarInput {
  ongoingSit: unknown | null | undefined;
  pendingAppsCount: number;
  latestDraft: {
    cancellation_reason?: string | null;
    end_date?: string | null;
  } | null | undefined;
  /** Lot P1 : annonce en ligne ou garde confirmée (défaut : faux). */
  hasActiveAnnonce?: boolean;
  /** ISO date (yyyy-mm-dd) utilisée pour évaluer si un brouillon a expiré. */
  todayIso?: string;
}

const isDraftAlive = (
  draft: OwnerStarInput["latestDraft"],
  todayIso: string,
): boolean => {
  if (!draft) return false;
  if (draft.cancellation_reason === "archived") return false;
  if (draft.end_date && draft.end_date < todayIso) return false;
  return true;
};

export function selectOwnerStarVariant(input: OwnerStarInput): OwnerStarVariant {
  const today = input.todayIso ?? new Date().toISOString().slice(0, 10);
  if (input.ongoingSit) return "ongoing";
  if ((input.pendingAppsCount ?? 0) > 0) return "applications";
  if (input.hasActiveAnnonce) return "annonce";
  if (isDraftAlive(input.latestDraft, today)) return "draft";
  return "publish";
}
