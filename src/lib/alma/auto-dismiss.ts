/**
 * Décision d'auto-dismiss du whisper courant dans le dock.
 *
 * Logique isolée pour être testable : dès qu'une conversation est ouverte,
 * le message d'Alma reste à l'écran, il devient le premier message du fil.
 * Le reste du scheduler garde son comportement.
 */
export const ALMA_AUTO_DISMISS_MS = 20_000;

export function shouldScheduleAutoDismiss(args: {
  hasWhisper: boolean;
  conversationOpen: boolean;
}): boolean {
  return args.hasWhisper && !args.conversationOpen;
}

export function autoDismissDelay(autoDismissMs?: number | null): number {
  return autoDismissMs ?? ALMA_AUTO_DISMISS_MS;
}
