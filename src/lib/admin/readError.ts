import { toast } from "sonner";

/**
 * Lot A10, règle transverse de l'admin : une lecture en échec s'affiche
 * comme une erreur visible, jamais comme 0 ni comme une liste vide.
 */
export const UNAVAILABLE_LABEL = "Chiffre indisponible";

const shown = new Set<string>();

/** Toast unique par contexte tant que la page reste ouverte. */
export function reportAdminReadError(context: string, error?: unknown): void {
  if (typeof console !== "undefined") console.warn(`[admin] ${context}`, error);
  if (shown.has(context)) return;
  shown.add(context);
  toast.error(UNAVAILABLE_LABEL, { description: context });
}

/** Réinitialisation pour les tests. */
export function __resetAdminReadErrors(): void {
  shown.clear();
}

/** Lève l'erreur Supabase éventuelle, pour les queryFn. */
export function throwIfError<T extends { error: unknown }>(res: T): T {
  if (res.error) throw res.error;
  return res;
}
