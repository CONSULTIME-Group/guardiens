/**
 * Plafond de candidatures d'une annonce de garde.
 *
 * Source de vérité : `public.sits.max_applications`, DEFAULT 5 en base.
 * Convention alignée sur l'entraide (`small_missions`, cap de 5 réponses).
 *
 * `max_applications = NULL` signifie « pas de plafond » : tout le code de
 * candidature garde derrière `if (sit.max_applications)`, donc une valeur
 * absente laisse l'annonce ouverte indéfiniment.
 */

export const DEFAULT_MAX_APPLICATIONS = 5;

/** Paliers proposés au propriétaire pour relever son plafond, sans champ libre. */
export const MAX_APPLICATION_STEPS = [5, 10, 20] as const;

type AppLike = { status?: string | null };

/** Candidatures qui occupent une place, les refusées et annulées n'en occupent pas. */
export function countOpenApplications(applications: AppLike[] | null | undefined): number {
  return (applications || []).filter(
    (a) => a.status !== "rejected" && a.status !== "cancelled",
  ).length;
}

/** Vrai quand le plafond défini par le propriétaire est atteint. */
export function isCapReached(
  maxApplications: number | null | undefined,
  openApplications: number,
): boolean {
  if (!maxApplications) return false;
  return openApplications >= maxApplications;
}

/** Prochain palier strictement supérieur au plafond courant, null si déjà au sommet. */
export function nextCapSteps(current: number | null | undefined): number[] {
  const base = current ?? DEFAULT_MAX_APPLICATIONS;
  return MAX_APPLICATION_STEPS.filter((s) => s > base);
}
