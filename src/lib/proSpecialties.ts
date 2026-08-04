/**
 * Libellés des spécialités professionnelles animalières.
 * Source unique, partagée entre les paramètres (saisie) et le profil public (rendu).
 */
export const SPECIALTY_OPTIONS = [
  { value: "educator", label: "Éducateur / comportementaliste canin" },
  { value: "vet", label: "Vétérinaire ou ASV" },
  { value: "groomer", label: "Toiletteur" },
  { value: "boarding", label: "Pension / refuge agréé" },
  { value: "petsitter_pro", label: "Pet-sitter professionnel déclaré" },
  { value: "trainer_equine", label: "Équin / NAC spécialisé" },
  { value: "other", label: "Autre professionnel animalier" },
];

export function specialtyLabel(value?: string | null): string | null {
  if (!value) return null;
  return SPECIALTY_OPTIONS.find((o) => o.value === value)?.label ?? null;
}
