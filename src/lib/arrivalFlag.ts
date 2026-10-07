/** Lot 1 : module minimal (aucune dépendance) pour la coquille membre. */
/** Compte concerné par C4 et la suite : même règle que mandatory_affinity_onboarding. */
export function isArrivalV2Account(
  flag: { enabled: boolean; appliesSince: string | null },
  profileCreatedAt: string | null | undefined,
): boolean {
  if (!flag.enabled || !flag.appliesSince || !profileCreatedAt) return false;
  return new Date(profileCreatedAt).getTime() >= new Date(flag.appliesSince).getTime();
}

