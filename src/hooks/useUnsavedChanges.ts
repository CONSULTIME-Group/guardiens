import { useEffect } from "react";

/**
 * Avertit l'utilisateur (popup natif du navigateur) avant qu'il ne quitte
 * la page si des modifications n'ont pas été sauvegardées.
 *
 * Le message exact est imposé par le navigateur — on ne peut pas le
 * personnaliser depuis JS — mais le simple fait de définir
 * `event.returnValue` déclenche le dialogue de confirmation.
 */
export function useUnsavedChanges(isDirty: boolean) {
  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);
}
