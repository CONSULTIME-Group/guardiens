import { lazy, type ComponentType } from "react";
import { reloadOnceForStaleChunk } from "./staleChunk";

/**
 * Wrapper autour de React.lazy qui :
 * 1. Retente une fois en cas d'échec réseau transitoire
 * 2. Si toujours en échec après un déploiement (chunk hash périmé),
 *    recharge la page une seule fois. Lot F1 : l'ancienne fenêtre de 30 s
 *    par route laissait un second chunk (AppLayout puis MessageBell)
 *    échouer après rechargement, et les cloches utilisaient le lazy nu.
 *    Un seul marqueur global de 60 s, partagé avec l'ErrorBoundary et
 *    vite:preloadError (src/lib/staleChunk.ts).
 *
 * Le second paramètre (nom de chunk) est conservé pour la lisibilité des
 * appels existants.
 */
export function lazyWithRetry<T extends ComponentType<any>>(
  factory: () => Promise<{ default: T }>,
  _chunkName?: string,
) {
  return lazy(async () => {
    try {
      return await factory();
    } catch {
      try {
        await new Promise((resolve) => setTimeout(resolve, 400));
        return await factory();
      } catch (error) {
        if (reloadOnceForStaleChunk()) {
          return new Promise(() => {}) as never;
        }
        throw error;
      }
    }
  });
}
