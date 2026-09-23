/**
 * Lot E6 : garde de plusieurs jours, signal d'ouverture de la question.
 * On ne décide plus ici, on détecte. Le composant pose la question.
 */

export const SIT_REDIRECT_TITLE = "Pour une garde de plusieurs jours, publiez une annonce de garde";
export const SIT_REDIRECT_TEXT =
  "Les gardiens de votre secteur la reçoivent, et vous choisissez après les avoir rencontrés.";
export const SIT_REDIRECT_PRIMARY = "Publier une annonce de garde";
export const SIT_REDIRECT_SECONDARY = "Publier quand même un besoin";

/** Vocabulaire de garde prolongée, hors coup de main ponctuel. */
const MULTI_DAY_RX = new RegExp(
  [
    "\\bgardes?\\b",
    "\\bgarder\\b",
    "\\bgardiennage\\b",
    "pendant\\s+(les\\s+)?vacances",
    "pendant\\s+(mon|notre)\\s+absence",
    "pendant\\s+\\d+\\s*(jours?|semaines?|mois)",
    "pendant\\s+(deux|trois|quatre|cinq|plusieurs)\\s+(jours?|semaines?|mois)",
    "\\bnoel\\b",
    "\\bsejour\\b",
    "nourrir\\s+pendant\\s+(mon|notre)\\s+absence",
  ].join("|"),
  "i",
);

const normalize = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[’]/g, "'");

/** Écart en jours entiers entre deux dates ISO, ou null. */
function dayGap(start?: string | null, end?: string | null): number | null {
  if (!start || !end) return null;
  const a = new Date(start).getTime();
  const b = new Date(end).getTime();
  if (Number.isNaN(a) || Number.isNaN(b)) return null;
  return Math.round((b - a) / 86_400_000);
}

export function looksLikeMultiDaySit(
  title: string | null | undefined,
  description: string | null | undefined,
  dateNeeded?: string | null,
  endDate?: string | null,
): boolean {
  const gap = dayGap(dateNeeded, endDate);
  if (gap !== null && gap > 2) return true;
  const text = normalize(`${title ?? ""} ${description ?? ""}`);
  if (!text.trim()) return false;
  return MULTI_DAY_RX.test(text);
}
