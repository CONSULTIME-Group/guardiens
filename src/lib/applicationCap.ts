/**
 * Plafond de candidatures d'une annonce de garde.
 *
 * Source de vérité : `public.sits.max_applications`, DEFAULT 10 en base
 * (lot Y1, décision du fondateur du 13/10/2026).
 *
 * Une annonce qui atteint son plafond reste publiée, ouverte et visible
 * partout : seules les nouvelles candidatures sont refusées, côté serveur
 * (trg_guard_application_sit_open, erreur SIT_CLOSED). Aucun écran n'écrit
 * `accepting_applications`, sauf le propriétaire qui ferme ou rouvre lui-même
 * son annonce. L'état « Candidatures complètes » se calcule à l'écran à partir
 * du nombre de candidatures vivantes et du plafond.
 *
 * `max_applications = NULL` signifie « pas de plafond ».
 */

export const DEFAULT_MAX_APPLICATIONS = 10;

/** Bornes du réglage proposé au propriétaire (création et modification). */
export const MIN_MAX_APPLICATIONS = 1;
export const MAX_MAX_APPLICATIONS = 50;

/** Paliers proposés au propriétaire pour relever son plafond, sans champ libre. */
export const MAX_APPLICATION_STEPS = [10, 15, 20, 30] as const;

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

/** Valeur saisie ramenée dans les bornes du réglage, null pour « sans plafond ». */
export function clampMaxApplications(value: number | null | undefined): number | null {
  if (value === null || value === undefined || Number.isNaN(value)) return null;
  return Math.max(MIN_MAX_APPLICATIONS, Math.min(MAX_MAX_APPLICATIONS, Math.round(value)));
}

export type ApplicationAvailability = "open" | "full" | "closed";

/**
 * État de candidature d'une annonce vu par un gardien.
 * - closed : le propriétaire a fermé les candidatures, ou l'annonce n'est plus publiée ;
 * - full : annonce publiée et ouverte, plafond atteint (« Candidatures complètes ») ;
 * - open : une candidature est possible.
 */
export function applicationAvailability(input: {
  status?: string | null;
  acceptingApplications?: boolean | null;
  maxApplications?: number | null;
  liveApplications: number;
}): ApplicationAvailability {
  if (input.status && input.status !== "published") return "closed";
  if (input.acceptingApplications === false) return "closed";
  if (isCapReached(input.maxApplications, input.liveApplications)) return "full";
  return "open";
}

export type SitClosedNotice = { reason: "full" | "closed"; title: string; description: string };

export const SIT_FULL_NOTICE: SitClosedNotice = {
  reason: "full",
  title: "Candidatures complètes",
  description:
    "Cette annonce a reçu toutes les candidatures prévues par le propriétaire. Elle reste visible, et d'autres gardes vous attendent dans la recherche.",
};

export const SIT_CLOSED_NOTICE: SitClosedNotice = {
  reason: "closed",
  title: "Candidatures fermées",
  description:
    "Les candidatures de cette annonce sont closes. D'autres gardes vous attendent dans la recherche.",
};

/**
 * Traduit l'erreur SIT_CLOSED de trg_guard_application_sit_open en message
 * lisible. Renvoie null pour toute autre erreur.
 */
export function describeSitClosedError(message: string | null | undefined): SitClosedNotice | null {
  const text = String(message ?? "");
  if (!text.includes("SIT_CLOSED")) return null;
  if (text.includes("toutes les candidatures prévues")) return SIT_FULL_NOTICE;
  return SIT_CLOSED_NOTICE;
}
