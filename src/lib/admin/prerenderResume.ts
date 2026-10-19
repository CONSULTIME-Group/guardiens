/**
 * Reprise estimée du pré-rendu et arriéré (lot SEO1, 19/10/2026).
 *
 * Le consommateur (public.seo_reserve_render) refuse tout rendu tant que la
 * fenêtre glissante de 30 jours compte 9 900 rendus réussis ou plus. Depuis le
 * lot SEO1, seuls les rendus réussis (ok = true) comptent, comme dans
 * detect-deploy-and-mark-dirty. La reprise arrive quand assez de rendus
 * sortent de la fenêtre : celui de rang (rendus - 9 900), par date croissante,
 * sort 30 jours après sa création, et le compte passe alors à 9 899.
 * Estimation faite sans nouveau rendu d'ici là.
 */
export const CONSUMER_RENDER_CEILING = 9_900;
export const RENDER_WINDOW_DAYS = 30;
const DAY_MS = 86_400_000;

export function renderWindowStart(now: Date): Date {
  return new Date(now.getTime() - RENDER_WINDOW_DAYS * DAY_MS);
}

/** Rang (0 pour le plus ancien) du rendu dont la sortie libère le consommateur, null si rien ne bloque. */
export function blockingRenderOffset(okRendersInWindow: number): number | null {
  if (!Number.isFinite(okRendersInWindow) || okRendersInWindow < CONSUMER_RENDER_CEILING) return null;
  return okRendersInWindow - CONSUMER_RENDER_CEILING;
}

/** Date de reprise estimée : création du rendu bloquant plus 30 jours. */
export function estimatedResumeAt(blockingRenderCreatedAt: string | null | undefined): Date | null {
  if (!blockingRenderCreatedAt) return null;
  const t = Date.parse(blockingRenderCreatedAt);
  return Number.isFinite(t) ? new Date(t + RENDER_WINDOW_DAYS * DAY_MS) : null;
}

export function formatParisDay(d: Date): string {
  return new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", day: "2-digit", month: "2-digit", year: "numeric" }).format(d);
}

export interface PrerenderResumeInput {
  okRendersInWindow: number;
  resumeAt: Date | null;
  backlog: number;
}

/** Phrase de la Vue d'ensemble. */
export function prerenderResumeSentence({ okRendersInWindow, resumeAt, backlog }: PrerenderResumeInput): string {
  const pages = `${backlog} page${backlog > 1 ? "s" : ""} en attente de rendu`;
  if (okRendersInWindow < CONSUMER_RENDER_CEILING) {
    return `Rendu actif : ${okRendersInWindow} rendus sur 30 jours (plafond ${CONSUMER_RENDER_CEILING}), ${pages}.`;
  }
  const when = resumeAt ? `reprise estimée le ${formatParisDay(resumeAt)}` : "date de reprise à calculer";
  return `Plafond atteint : ${okRendersInWindow} rendus sur 30 jours (plafond ${CONSUMER_RENDER_CEILING}), ${when}, ${pages}.`;
}
