/**
 * Panneau déplié du dock Alma, logique pure.
 *
 * Doctrine : une seule tâche primaire visible. Le panneau ne rend jamais
 * plus d'une ligne de texte ni plus d'une action, et le champ de saisie y
 * est toujours présent.
 *
 * Priorité de la ligne unique : whisper actif, puis proposition
 * contextuelle (buildProposition), puis humeur du jour. L'humeur se tait
 * dès qu'un whisper est affiché.
 */

export interface AlmaPanelLineInput {
  whisperMessage: string | null;
  propositionMessage: string | null;
  moodLine: string | null;
}

export const ALMA_PANEL_FALLBACK_LINE =
  "Je vous écoute. Dites-moi ce que vous cherchez.";

/** La seule ligne de texte du panneau déplié. */
export function resolvePanelLine({
  whisperMessage,
  propositionMessage,
  moodLine,
}: AlmaPanelLineInput): string {
  return whisperMessage ?? propositionMessage ?? moodLine ?? ALMA_PANEL_FALLBACK_LINE;
}

/**
 * Placeholder du champ de saisie, adapté à la surface courante
 * (surfaceFromPath). Un champ vide invite mieux qu'un bouton.
 */
export function composerPlaceholder(surface: string): string {
  switch (surface) {
    case "owner_dashboard":
      return "Une question sur votre annonce\u00A0?";
    case "sitter_dashboard":
      return "Une question sur une garde\u00A0?";
    case "sitter_profile":
      return "Une question sur ce gardien\u00A0?";
    case "sit_detail":
      return "Une question sur cette annonce\u00A0?";
    case "search_page":
    case "listings":
      return "Dites-moi ce que vous cherchez";
    case "mutual_aid":
      return "Une question sur l'entraide\u00A0?";
    default:
      return "Demandez-moi quelque chose";
  }
}
