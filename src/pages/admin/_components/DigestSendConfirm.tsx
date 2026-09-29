import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

/**
 * Lot A8 : confirmation obligatoire avant « Envoyer maintenant » d'un digest.
 * Le nombre vient d'une simulation (dry_run) avec les mêmes paramètres.
 */
export interface DigestConfirmState { count: number; targeted: boolean }

export function digestConfirmText(s: DigestConfirmState): string {
  const n = `${s.count} ${s.count === 1 ? "destinataire" : "destinataires"}`;
  if (s.targeted) {
    return `${n}. Envoi ciblé sur un seul membre : il contourne l'anti-doublon 24 h, la réservation inter-canaux et le verrou.`;
  }
  return `${n}. Mêmes garde-fous que l'envoi automatique : anti-doublon 24 h, réservation inter-canaux et verrou.`;
}

/** Nombre de destinataires d'un plan de simulation. */
export const planRecipientCount = (data: unknown): number => {
  const plan = (data as { plan?: unknown[] } | null)?.plan;
  return Array.isArray(plan) ? plan.length : 0;
};

export const DigestSendConfirm = ({ state, onCancel, onConfirm }: {
  state: DigestConfirmState | null; onCancel: () => void; onConfirm: () => void;
}) => (
  <AlertDialog open={!!state} onOpenChange={(o) => { if (!o) onCancel(); }}>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Envoyer le digest maintenant ?</AlertDialogTitle>
        <AlertDialogDescription data-testid="digest-confirm-text">{state ? digestConfirmText(state) : ""}</AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>Annuler</AlertDialogCancel>
        <AlertDialogAction onClick={onConfirm} disabled={!state || state.count === 0}>Envoyer</AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
);
