/**
 * Une seule question pour les trajets sur place (lot SC1, 10/11/2026, arène
 * claude/arene/2026-11-10-score-completion) : trois réponses qui écrivent le
 * couple (has_license, has_vehicle). Les colonnes et le moteur d'affinité
 * restent inchangés (evalVehicle de supabase/functions/_shared/affinity/score.ts).
 *
 * Un second clic sur la réponse choisie efface la réponse (null, null) : le
 * silence reste neutre dans le calcul d'affinité.
 */

export type TripsAnswer = "own_vehicle" | "license_only" | "other_means";

export const TRIPS_OPTIONS: { value: TripsAnswer; label: string }[] = [
  { value: "own_vehicle", label: "J'ai mon véhicule" },
  { value: "license_only", label: "J'ai le permis, sans véhicule" },
  { value: "other_means", label: "Je me déplace autrement" },
];

export interface TripsColumns {
  has_license: boolean | null;
  has_vehicle: boolean | null;
}

const COLUMNS: Record<TripsAnswer, TripsColumns> = {
  own_vehicle: { has_license: true, has_vehicle: true },
  license_only: { has_license: true, has_vehicle: false },
  other_means: { has_license: false, has_vehicle: false },
};

/** Colonnes écrites pour une réponse ; null efface la réponse. */
export function tripsColumns(answer: TripsAnswer | null): TripsColumns {
  return answer ? COLUMNS[answer] : { has_license: null, has_vehicle: null };
}

/**
 * Réponse lue depuis les colonnes existantes. Les combinaisons anciennes se
 * rattachent à la réponse la plus proche :
 *  - véhicule oui, permis inconnu (accueil /arrivee) : « J'ai mon véhicule » ;
 *  - véhicule non, permis inconnu (ancien « Non » de /arrivee) : « Je me
 *    déplace autrement », comme la phrase lue par le propriétaire ;
 *  - permis oui, véhicule inconnu : aucune présélection.
 */
export function tripsAnswerOf(c: Partial<TripsColumns>): TripsAnswer | null {
  const license = c.has_license ?? null;
  const vehicle = c.has_vehicle ?? null;
  if (vehicle === true) return "own_vehicle";
  if (vehicle === false && license === true) return "license_only";
  if (vehicle === false) return "other_means";
  return null;
}

/** Une réponse sur le véhicule existe (oui ou non). */
export function hasTripsAnswer(c: Partial<TripsColumns>): boolean {
  return c.has_vehicle === true || c.has_vehicle === false;
}
