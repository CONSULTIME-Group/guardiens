/**
 * Lot N2 : pastille de l'icône de l'application installée (écran d'accueil,
 * bureau). Le service worker la pose à la réception d'un push ; le site la
 * tient à jour à chaque lecture des compteurs de messages non lus, et
 * l'efface quand tout est lu. Sans API (navigateur non installé, ancien
 * système), rien ne se passe.
 */
type BadgeNavigator = Navigator & {
  setAppBadge?: (count?: number) => Promise<void>;
  clearAppBadge?: () => Promise<void>;
};

export function syncAppBadge(count: number): void {
  if (typeof navigator === "undefined") return;
  const nav = navigator as BadgeNavigator;
  // Aucun mémo : le service worker peut avoir changé la pastille entre deux
  // lectures, le site réécrit donc toujours la valeur qu'il connaît.
  const next = Number.isFinite(count) && count > 0 ? Math.min(Math.floor(count), 99) : 0;
  try {
    const pending = next > 0 ? nav.setAppBadge?.(next) : nav.clearAppBadge?.();
    void pending?.catch?.(() => undefined);
  } catch {
    /* API refusée : la pastille reste celle posée par le service worker */
  }
}
