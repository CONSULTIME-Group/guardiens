import { lazy, type ComponentType } from "react";

/**
 * Wrapper autour de React.lazy qui :
 * 1. Retente une fois en cas d'échec réseau transitoire
 * 2. Si toujours en échec après un déploiement (chunk hash périmé),
 *    force un rechargement complet de la page une seule fois
 *    (flag stocké en sessionStorage pour éviter les boucles).
 */
export function lazyWithRetry<T extends ComponentType<any>>(
  factory: () => Promise<{ default: T }>,
  chunkName?: string,
) {
  return lazy(async () => {
    const reloadKey = `chunk-reload-${chunkName ?? factory.toString().slice(0, 50)}`;
    try {
      return await factory();
    } catch (err) {
      // Premier essai raté → on retente après un court délai (réseau flaky)
      try {
        await new Promise((r) => setTimeout(r, 400));
        return await factory();
      } catch (err2) {
        // Deuxième essai raté → probablement un chunk périmé après déploiement
        const alreadyReloaded = sessionStorage.getItem(reloadKey);
        if (!alreadyReloaded) {
          sessionStorage.setItem(reloadKey, "1");
          // Petit toast invisible : on recharge proprement
          window.location.reload();
          // Renvoyer une promise jamais résolue le temps du reload
          return new Promise(() => {}) as never;
        }
        // Déjà rechargé une fois → on laisse l'ErrorBoundary prendre le relais
        throw err2;
      }
    }
  });
}
