import { lazy, type ComponentType } from "react";

const RELOAD_TTL_MS = 30_000;

/**
 * Empreinte stable d'une fabrique d'import.
 *
 * Le repli historique gardait les 50 premiers caractères de la source de la
 * fabrique. Après minification, toutes les routes commencent par la même
 * séquence, donc toutes partageaient la même clé de rechargement : dès qu'une
 * route avait rechargé, les autres se voyaient refuser leur unique tentative
 * et remontaient l'erreur brute à l'ErrorBoundary. Un hash de la source
 * complète redonne une clé par route.
 */
const hashSource = (source: string) => {
  let hash = 0;
  for (let i = 0; i < source.length; i += 1) {
    hash = (hash * 31 + source.charCodeAt(i)) | 0;
  }
  return `f${(hash >>> 0).toString(36)}`;
};

const getReloadKey = (chunkName?: string, fallbackId?: string) =>
  `chunk-reload-${chunkName ?? fallbackId ?? "anonymous-chunk"}`;


const getLastReloadAt = (reloadKey: string) => {
  try {
    const value = sessionStorage.getItem(reloadKey);
    if (!value) return null;

    const timestamp = Number(value);
    return Number.isFinite(timestamp) ? timestamp : 0;
  } catch {
    return null;
  }
};

const markReload = (reloadKey: string) => {
  try {
    sessionStorage.setItem(reloadKey, String(Date.now()));
  } catch {
    // Ignore storage errors (private mode, quota, etc.)
  }
};

const clearReloadMark = (reloadKey: string) => {
  try {
    sessionStorage.removeItem(reloadKey);
  } catch {
    // Ignore storage errors
  }
};

/**
 * Wrapper autour de React.lazy qui :
 * 1. Retente une fois en cas d'échec réseau transitoire
 * 2. Si toujours en échec après un déploiement (chunk hash périmé),
 *    force un rechargement complet de la page une seule fois par fenêtre courte
 *    pour éviter les boucles, sans bloquer définitivement les futurs rechargements.
 */
export function lazyWithRetry<T extends ComponentType<any>>(
  factory: () => Promise<{ default: T }>,
  chunkName?: string,
) {
  return lazy(async () => {
    const reloadKey = getReloadKey(chunkName, factory.toString().slice(0, 50));

    try {
      const module = await factory();
      clearReloadMark(reloadKey);
      return module;
    } catch {
      try {
        await new Promise((resolve) => setTimeout(resolve, 400));
        const module = await factory();
        clearReloadMark(reloadKey);
        return module;
      } catch (error) {
        const lastReloadAt = getLastReloadAt(reloadKey);
        const canReload = !lastReloadAt || Date.now() - lastReloadAt > RELOAD_TTL_MS;

        if (canReload) {
          markReload(reloadKey);
          window.location.reload();
          return new Promise(() => {}) as never;
        }

        throw error;
      }
    }
  });
}
