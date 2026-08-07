// Regles pures du resume hebdomadaire de proximite.
//
// Constat mesure le 07/08/2026 : sur 631 gardiens geolocalises, 533 n'ont
// aucune mission ni question dans 30 km. Deux consequences directes, portees
// par ce module et testees a part :
//
//   1. Un resume vide ne part jamais. Aucune exception.
//   2. En dessous de trois elements, le rayon s'elargit par paliers jusqu'a
//      100 km, et l'email le dit franchement. On ne fait jamais croire a une
//      proximite qui n'existe pas.

export type DigestKind = "sit" | "mission" | "question";

export interface DigestCandidate {
  kind: DigestKind;
  id: string;
  /** Distance en km. `null` quand elle n'est pas calculable. */
  distanceKm: number | null;
}

/** Paliers d'elargissement, en km. Le dernier est le plafond absolu. */
export const WEEKLY_RADIUS_STEPS = [30, 50, 100] as const;

/** En dessous de ce total, on tente le palier suivant. */
export const MIN_ITEMS_BEFORE_WIDENING = 3;

/** Nombre maximum d'elements presentes dans un email. */
export const WEEKLY_MAX_ITEMS = 9;

export interface DigestScope<T> {
  radiusKm: number;
  baseRadiusKm: number;
  widened: boolean;
  items: T[];
}

/** Paliers reellement utilisables a partir du rayon choisi par la personne. */
export function radiusLadder(baseRadiusKm: number): number[] {
  const cap = WEEKLY_RADIUS_STEPS[WEEKLY_RADIUS_STEPS.length - 1];
  const base = Math.min(Math.max(1, Math.round(baseRadiusKm)), cap);
  const ladder = [base, ...WEEKLY_RADIUS_STEPS.filter((r) => r > base)];
  return [...new Set(ladder)].sort((a, b) => a - b);
}

/**
 * Choisit le rayon effectif et les elements a presenter.
 * Les elements sans distance calculable ne sont jamais retenus : un resume de
 * proximite ne peut pas s'appuyer sur une proximite inconnue.
 */
export function resolveDigestScope<T extends { distanceKm: number | null }>(
  candidates: T[],
  baseRadiusKm: number,
): DigestScope<T> {
  const ladder = radiusLadder(baseRadiusKm);
  const base = ladder[0];
  const within = (r: number) =>
    candidates.filter((c) => c.distanceKm != null && (c.distanceKm as number) <= r);

  let chosen = base;
  let items = within(base);
  for (const r of ladder) {
    const found = within(r);
    if (found.length >= MIN_ITEMS_BEFORE_WIDENING) {
      chosen = r;
      items = found;
      break;
    }
    // On garde le palier le plus large tant que le seuil n'est pas atteint.
    chosen = r;
    items = found;
  }

  return { radiusKm: chosen, baseRadiusKm: base, widened: chosen > base, items };
}

/** Un resume sans contenu ne part pas. */
export function shouldSendDigest(itemCount: number): boolean {
  return itemCount > 0;
}

/** Phrase affichee quand le rayon a du etre elargi. Vouvoiement, sans emoji. */
export function wideningSentence(baseRadiusKm: number, radiusKm: number): string | null {
  if (radiusKm <= baseRadiusKm) return null;
  return `Rien dans vos ${baseRadiusKm} km cette semaine, voici ce qui existe un peu plus loin, jusqu'à ${radiusKm} km.`;
}

/** Tri par proximite, puis plafonnement au nombre maximum d'elements. */
export function orderAndCap<T extends { distanceKm: number | null }>(
  items: T[],
  max = WEEKLY_MAX_ITEMS,
): T[] {
  return [...items]
    .sort((a, b) => (a.distanceKm ?? Number.MAX_SAFE_INTEGER) - (b.distanceKm ?? Number.MAX_SAFE_INTEGER))
    .slice(0, max);
}
