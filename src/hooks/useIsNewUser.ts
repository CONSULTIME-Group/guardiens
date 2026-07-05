/**
 * Hooks de détection du nouveau propriétaire / nouveau gardien.
 *
 * Utilisés par les dashboards pour appliquer les préceptes UX 2026
 * (une seule NBA dominante, pas de surfaces concurrentes above the fold).
 */

export function useIsNewOwner(input: {
  sitsCount: number;
  petsCount: number;
}): boolean {
  return input.sitsCount === 0 && input.petsCount === 0;
}

export function useIsNewSitter(input: {
  totalApps: number;
  completedSits: number;
}): boolean {
  return input.totalApps === 0 && input.completedSits === 0;
}
