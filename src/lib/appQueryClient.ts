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

export function clearAppQueryCache(): void {
  appQueryClient?.clear();
}
