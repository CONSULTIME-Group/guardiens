/**
 * Lot F2 (12/10/2026) : chargement paresseux d'un composant accessoire.
 *
 * Après une publication, un onglet ouvert demande un fichier dont le hash
 * n'existe plus. main.tsx écoute vite:preloadError, recharge la page et
 * appelle preventDefault : Vite résout alors l'import avec `undefined` au
 * lieu d'échouer. Un React.lazy nu reçoit `undefined` et React plante sur
 * « _result.default » avant que le rechargement n'aboutisse (14 occurrences
 * du 05 au 12/10, dont /inscription, /login, /go).
 *
 * Ici, un module absent ou sans export par défaut vaut échec : une nouvelle
 * tentative, puis un composant vide. La page ne tombe jamais pour un
 * accessoire (traceurs, extras après affichage).
 */
import { lazy, type ComponentType } from "react";

const Nothing = () => null;

export function isUsableModule(m: unknown): m is { default: ComponentType<any> } {
  return !!m && typeof m === "object" && !!(m as { default?: unknown }).default;
}

export function optionalLazy<T extends ComponentType<any>>(
  load: () => Promise<{ default: T } | undefined>,
  retryDelayMs = 500,
) {
  const attempt = async () => {
    const m = await load();
    if (!isUsableModule(m)) throw new Error("lazy module without default export");
    return m as { default: T };
  };
  return lazy(async () => {
    try {
      return await attempt();
    } catch {
      try {
        await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
        return await attempt();
      } catch {
        return { default: Nothing as unknown as T };
      }
    }
  });
}
