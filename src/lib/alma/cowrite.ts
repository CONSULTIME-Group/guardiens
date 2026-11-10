/**
 * Lot ALMA2 (10/11/2026, arène « Alma vivante », lot L2) : écrire avec Alma.
 *
 * Une seule mesure pour les moments où Alma écrit avec le membre :
 *   alma_cowrite_shown  l'aide est à l'écran (une fois par montage)
 *   alma_cowrite_used   un brouillon d'Alma est arrivé dans le champ
 *   alma_cowrite_sent   le texte part (publication, candidature, message),
 *                       avec edited = le membre a changé le brouillon
 * « Agir avec Alma » (règle du test L5) se lit sur alma_cowrite_sent.
 */
import { trackEvent } from "@/lib/analytics";

export const COWRITE_MOMENTS = [
  "annonce",
  "candidature",
  "besoin",
  "reponse_candidature",
  "premier_message",
] as const;

export type CowriteMoment = (typeof COWRITE_MOMENTS)[number];

export type CowriteStep = "shown" | "used" | "sent";

const EVENT_OF: Record<CowriteStep, string> = {
  shown: "alma_cowrite_shown",
  used: "alma_cowrite_used",
  sent: "alma_cowrite_sent",
};

export function cowriteEventName(step: CowriteStep): string {
  return EVENT_OF[step];
}

/** Le membre a-t-il retouché le brouillon d'Alma avant l'envoi ? */
export function cowriteEdited(draft: string | null | undefined, sent: string | null | undefined): boolean {
  const norm = (s: string | null | undefined) => (s ?? "").replace(/\s+/g, " ").trim();
  return norm(draft) !== norm(sent);
}

export function trackCowrite(
  step: CowriteStep,
  moment: CowriteMoment,
  extra: Record<string, unknown> = {},
): void {
  try {
    void trackEvent(EVENT_OF[step] as "alma_cowrite_shown", { metadata: { moment, ...extra } });
  } catch {
    /* mesure seulement */
  }
}
