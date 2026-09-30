/**
 * Garde légère de l'appareil push (lot P2b). Le module web-push (4 Ko) n'est
 * chargé que lorsqu'il y a réellement un abonnement à nettoyer : un visiteur
 * sans abonnement ne le télécharge jamais. Comportement identique à
 * reconcilePushSession / cleanupPushOnLogout de src/lib/web-push.ts.
 */
export const PUSH_OWNER_KEY = "guardiens_push_device_owner";

export async function cleanupPushOnLogoutLazy(userId?: string): Promise<void> {
  try {
    if (!localStorage.getItem(PUSH_OWNER_KEY)) return;
  } catch { return; }
  const m = await import("@/lib/web-push");
  await m.cleanupPushOnLogout(userId);
}

export function reconcilePushSessionLazy(userId?: string): void {
  try {
    const owner = localStorage.getItem(PUSH_OWNER_KEY);
    if (owner && owner !== userId) {
      setTimeout(() => { void import("@/lib/web-push").then((m) => m.cleanupPushOnLogout()).catch(() => {}); }, 0);
    }
  } catch { /* stockage indisponible : aucun propriétaire mémorisé */ }
}
