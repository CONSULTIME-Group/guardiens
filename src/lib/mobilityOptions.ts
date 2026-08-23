/**
 * Source unique des choix de mobilité gardien.
 * Une seule liste de valeurs, un seul dictionnaire de libellés, partagés par
 * le formulaire (StepMobility), la fiche publique (PublicSitterProfile) et la
 * vue public_sitter_profiles (qui expose la valeur brute).
 *
 * VEHICLE_OPTIONS retiré le 23/08/2026 : `vehicle_type` est un champ mort
 * (3 profils sur 1 037, jamais scoré, doctrine règle 6). Le critère véhicule
 * du moteur lit les tri-états `has_vehicle` / `has_license`.
 */

export interface MobilityOption {
  /** Valeur stockée en base. */
  value: string;
  /** Libellé affiché dans le formulaire. */
  label: string;
  /** Libellé affiché sur la fiche publique. */
  publicLabel: string;
}

export const MIN_STAY_DURATION_OPTIONS: MobilityOption[] = [
  { value: "1_3_days", label: "1-3 jours", publicLabel: "1 à 3 jours minimum" },
  { value: "1_week", label: "1 semaine", publicLabel: "1 semaine minimum" },
  { value: "2_weeks", label: "2 semaines", publicLabel: "2 semaines minimum" },
  { value: "1_month", label: "1 mois", publicLabel: "1 mois minimum" },
  // "Flexible" n'est pas une information publiable : rien à afficher.
  { value: "flexible", label: "Flexible", publicLabel: "" },
];

export const FREQUENCY_OPTIONS: MobilityOption[] = [
  { value: "occasional", label: "Occasionnel", publicLabel: "Gardes occasionnelles" },
  { value: "regular", label: "Régulier", publicLabel: "Gardes régulières" },
  { value: "flexible", label: "Flexible", publicLabel: "" },
];

export const NOTICE_OPTIONS: MobilityOption[] = [
  { value: "asap", label: "Dès que possible", publicLabel: "" },
  { value: "1_week", label: "1 semaine", publicLabel: "Préavis : 1 semaine" },
  { value: "2_weeks", label: "2 semaines", publicLabel: "Préavis : 2 semaines" },
  { value: "1_month", label: "1 mois", publicLabel: "Préavis : 1 mois" },
];

/** Libellé public d'une valeur stockée. Chaîne vide si valeur inconnue ou absente. */
export function mobilityPublicLabel(options: MobilityOption[], value: string | null | undefined): string {
  if (!value) return "";
  return options.find(o => o.value === value)?.publicLabel ?? "";
}
