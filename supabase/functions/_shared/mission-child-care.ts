/**
 * Lot E12 (14/10/2026) : la garde d'enfants est exclue de l'Entraide.
 *
 * Décision de Jérémie du 14/10/2026, qui remplace celle du 11/10/2026 : un
 * besoin qui demande de garder un mineur est refusé à la publication (CGU 7).
 * L'aide aux devoirs reste possible. Module pur, sans dépendance, partagé par
 * le site (src/lib/missionChildCare.ts) et par Alma. Détection volontairement étroite : elle
 * vise la garde d'un enfant, jamais un animal ni une simple mention d'enfants
 * dans le foyer.
 */
const CHILD = "(?:enfants?|fils|filles?|b[ée]b[ée]s?|petits?-enfants?|petite-fille|petit-fils|gamins?|loulous?|petits?|petites?)";
const MINE = "(?:mon|ma|mes|nos|notre|les|leurs?)";

const PATTERNS: RegExp[] = [
  /\bgardes?\s+d['’]\s*enfants?\b/i,
  /\bbaby[\s-]?sitt?(?:ing|eur|euse|er)?\b/i,
  /\bnounou\b/i,
  new RegExp(`\\bgarder\\s+${MINE}\\s+${CHILD}\\b`, "i"),
  new RegExp(`\\bs['’]\\s*occuper\\s+(?:de\\s+)?${MINE}\\s+${CHILD}\\b`, "i"),
  new RegExp(`\\b(?:aller\\s+)?chercher\\s+${MINE}\\s+${CHILD}\\s+(?:à|a)\\s+l['’]\\s*(?:école|ecole|crèche|creche)\\b`, "i"),
  /\bsortie\s+d['’]\s*(?:école|ecole|crèche|creche)\b/i,
];

export function isChildCareRequest(title: string, description = ""): boolean {
  const text = `${title}\n${description}`;
  return PATTERNS.some((p) => p.test(text));
}

export const CHILD_CARE_EXCLUDED_TITLE = "Garde d'enfants";
export const CHILD_CARE_EXCLUDED_MESSAGE =
  "La garde d'enfants reste hors de l'Entraide Guardiens, qui réunit des coups de main entre adultes : jardin, potager, courses, trajets, jeux de société, aide aux devoirs.";
