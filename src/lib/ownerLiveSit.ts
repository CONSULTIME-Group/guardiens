/**
 * Lot P1 (19/10/2026, arène « annonce en ligne lisible ») : règles pures
 * partagées par le lien de reprise (CreateSit), la carte principale du
 * tableau de bord et l'entrée du formulaire de création.
 *
 * Cas déclencheur : une propriétaire dont l'annonce était en ligne lisait
 * « Votre annonce est presque prête » sur son tableau de bord, recevait
 * « Brouillon introuvable · ne vous appartient pas » en suivant un ancien
 * lien de relance, et recréait la même garde depuis le bouton « Publier ».
 */

export type SitStatusLike = string | null | undefined;

export interface LiveSitLike {
  id: string;
  status?: SitStatusLike;
  title?: string | null;
  start_date?: string | null;
  end_date?: string | null;
}

/** Annonce en ligne ou garde confirmée dont la fin n'est pas passée. */
export function isLiveSit(sit: LiveSitLike | null | undefined, todayIso: string): boolean {
  if (!sit) return false;
  if (sit.status !== "published" && sit.status !== "confirmed") return false;
  if (sit.end_date && sit.end_date < todayIso) return false;
  return true;
}

/** Annonce en ligne la plus proche dans le temps (sans dates en dernier). */
export function pickLiveSit<T extends LiveSitLike>(sits: T[], todayIso: string): T | null {
  const live = sits.filter((s) => isLiveSit(s, todayIso));
  live.sort((a, b) => {
    const at = a.start_date ?? "9999-12-31";
    const bt = b.start_date ?? "9999-12-31";
    return at.localeCompare(bt);
  });
  return live[0] ?? null;
}

export interface ResumeRedirect {
  to: string;
  title: string;
  description?: string;
}

/**
 * Lien `?resume=` ou `?draftId=` qui ne désigne plus un brouillon du compte.
 * `sit` : la ligne lue par identifiant et propriétaire, sans filtre de statut
 * (null si l'identifiant est inconnu ou appartient à un autre compte).
 * Messages neutres : le lien a vieilli, la personne n'a rien fait de travers.
 */
export function resumeRedirectFor(sit: { id: string; status?: SitStatusLike } | null): ResumeRedirect {
  if (!sit) {
    return {
      to: "/dashboard",
      title: "Ce lien mène à un brouillon déjà traité.",
      description: "Votre tableau de bord affiche toutes vos annonces.",
    };
  }
  switch (sit.status) {
    case "published":
      return {
        to: `/sits/${sit.id}`,
        title: "Bonne nouvelle, votre annonce est déjà en ligne.",
        description: "Vous pouvez la voir et la modifier ici.",
      };
    case "confirmed":
    case "in_progress":
      return { to: `/sits/${sit.id}`, title: "Cette garde est déjà organisée." };
    default:
      return {
        to: "/sits?tab=past",
        title: "Cette annonce est terminée.",
        description: "Vous la retrouvez dans vos annonces passées.",
      };
  }
}

/** Deux périodes se recoupent (bornes incluses). Dates ISO yyyy-mm-dd. */
export function periodsOverlap(
  aStart: string | null | undefined,
  aEnd: string | null | undefined,
  bStart: string | null | undefined,
  bEnd: string | null | undefined,
): boolean {
  if (!aStart || !bStart) return false;
  const aE = aEnd || aStart;
  const bE = bEnd || bStart;
  return aStart <= bE && bStart <= aE;
}

/** Entrée nue du formulaire : ni reprise, ni copie, ni parcours express. */
export function isBareCreateEntry(params: URLSearchParams): boolean {
  return !["draftId", "resume", "from", "mode", "express"].some((k) => params.has(k));
}
