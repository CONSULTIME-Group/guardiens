/**
 * Libellé public unique pour les expériences externes.
 * Décision produit (vague 33) : on ne nomme jamais une plateforme concurrente
 * sur une surface publique. La preuve vient de la vérification Guardiens,
 * pas de la marque tierce. Le vrai `platform_name` reste stocké en base et
 * visible uniquement par l'admin (contrôle) et par le membre propriétaire
 * (dans son espace privé de gestion).
 */
export const EXTERNAL_EXPERIENCE_PUBLIC_LABEL =
  "une autre plateforme de garde d'animaux";

export function getPublicExperienceLabel(_platformName?: string | null): string {
  return EXTERNAL_EXPERIENCE_PUBLIC_LABEL;
}
