import type { QueryClient } from "@tanstack/react-query";

/**
 * Référence au QueryClient de l'application, pour les modules hors arbre
 * React Query (AuthContext). La déconnexion vide tout le cache : aucune
 * donnée d'un compte (pastilles admin comprises) ne survit au suivant.
 */
let appQueryClient: QueryClient | null = null;

export function registerAppQueryClient(client: QueryClient): void {
  appQueryClient = client;
}

const clearHooks: Array<() => void> = [];
/** Caches hors React Query à vider avec lui (lot P1b). */
export function onAppQueryCacheClear(fn: () => void): void {
  clearHooks.push(fn);
}

export function clearAppQueryCache(): void {
  appQueryClient?.clear();
  clearHooks.forEach((fn) => { try { fn(); } catch { /* silencieux */ } });
}

export function getAppQueryClient(): QueryClient | null {
  return appQueryClient;
}
