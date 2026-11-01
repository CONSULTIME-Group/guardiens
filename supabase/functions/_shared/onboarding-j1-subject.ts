// Sujet de l'email onboarding J+1, dépendant du rôle.
//
// Le corps s'adaptait déjà via isOwner, le sujet restait celui du
// propriétaire : 250 gardiens ont reçu « Votre première annonce en 2 minutes ».

export const ONBOARDING_J1_SUBJECT_OWNER = "Votre première annonce, les gardiens à proximité vous écrivent";
export const ONBOARDING_J1_SUBJECT_SITTER =
  "Bienvenue sur Guardiens, votre profil de gardien vous attend";

export function onboardingJ1Subject(data?: Record<string, unknown> | null): string {
  return data?.isOwner === true
    ? ONBOARDING_J1_SUBJECT_OWNER
    : ONBOARDING_J1_SUBJECT_SITTER;
}
