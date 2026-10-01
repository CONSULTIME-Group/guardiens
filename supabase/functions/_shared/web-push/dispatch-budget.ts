// Budget d'un passage de dispatch-web-push : un seul total pour les deux
// files (messages/candidatures puis annonces proches), jamais additionne.
import { digestRunStatus } from '../cron-trace.ts';

/** Places restantes pour la file proche apres la file principale. */
export function nearbyBudget(limit: number, mainClaimed: number): number {
  return Math.max(0, Math.floor(limit) - Math.max(0, Math.floor(mainClaimed)));
}

/** Une file proche en erreur rend le passage partiel, meme sans autre erreur. */
export function runStatus(persistenceErrors: number, nearbyError: boolean): 'success' | 'partial' {
  return nearbyError ? 'partial' : digestRunStatus(persistenceErrors);
}
