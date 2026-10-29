/**
 * Lot SUPPR1 : fenêtre unique « Supprimer l'annonce », depuis la fiche
 * (Gérer cette garde) et depuis Mes annonces. Règles dans src/lib/removeSit.ts.
 */
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { logger } from "@/lib/logger";
import {
  loadSitApplications,
  removalPlan,
  removeSit,
  type RemovalPlan,
} from "@/lib/removeSit";

export const REMOVE_SIT_COPY = {
  title: "Supprimer cette annonce ?",
  delete: "L'annonce disparaît de Guardiens, définitivement.",
  withdraw: (n: number) =>
    `L'annonce disparaît de Guardiens. ${n === 1 ? "La personne qui a candidaté reçoit" : `Les ${n} personnes qui ont candidaté reçoivent`} un message : l'annonce n'est plus d'actualité. Vos échanges restent dans la messagerie.`,
  cancelFirst: "Un gardien est confirmé pour cette garde. Annulez d'abord la garde : il sera prévenu, puis l'annonce sera close.",
  confirmDelete: "Supprimer",
  confirmWithdraw: "Supprimer et prévenir",
  goCancel: "Annuler la garde",
  doneDeleted: "Annonce supprimée",
  doneWithdrawn: "Annonce supprimée, les candidats sont prévenus",
} as const;

interface RemoveSitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sit: { id: string; title: string | null; status: string };
  ownerId: string;
  /** Appelé après suppression ou retrait réussi. */
  onRemoved: () => void;
  /** Gardien confirmé : ouvre le parcours d'annulation existant. */
  onCancelGarde?: () => void;
}

const RemoveSitDialog = ({ open, onOpenChange, sit, ownerId, onRemoved, onCancelGarde }: RemoveSitDialogProps) => {
  const { toast } = useToast();
  const [plan, setPlan] = useState<RemovalPlan | null>(null);
  const [candidates, setCandidates] = useState(0);
  const [loading, setLoading] = useState(false);
  const [working, setWorking] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setPlan(null);
    loadSitApplications(sit.id)
      .then((apps) => {
        if (cancelled) return;
        setCandidates(apps.open.length);
        setPlan(removalPlan({ status: sit.status, applicationCount: apps.total, hasAccepted: apps.hasAccepted }));
      })
      .catch((e) => {
        logger.warn("[RemoveSitDialog] applications load failed", { error: String(e) });
        if (!cancelled) setPlan(null);
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [open, sit.id, sit.status]);

  const confirm = async () => {
    if (working) return;
    setWorking(true);
    try {
      const outcome = await removeSit({ sitId: sit.id, sitTitle: sit.title ?? "", status: sit.status, ownerId });
      if (outcome.kind === "cancel_first") {
        setPlan("cancel_first");
        return;
      }
      toast({ title: outcome.kind === "deleted" ? REMOVE_SIT_COPY.doneDeleted : REMOVE_SIT_COPY.doneWithdrawn });
      onOpenChange(false);
      onRemoved();
    } catch (e) {
      logger.error("[RemoveSitDialog] remove failed", { sitId: sit.id, error: String(e) });
      toast({
        variant: "destructive",
        title: "Suppression impossible",
        description: "La suppression a échoué. Réessayez dans un instant.",
      });
    } finally {
      setWorking(false);
    }
  };

  const description = loading
    ? null
    : plan === "delete"
      ? REMOVE_SIT_COPY.delete
      : plan === "withdraw"
        ? REMOVE_SIT_COPY.withdraw(candidates)
        : plan === "cancel_first"
          ? REMOVE_SIT_COPY.cancelFirst
          : "La suppression est momentanément indisponible. Réessayez dans un instant.";

  return (
    <AlertDialog open={open} onOpenChange={(o) => { if (!working) onOpenChange(o); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{REMOVE_SIT_COPY.title}</AlertDialogTitle>
          <AlertDialogDescription>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-label="Chargement" /> : description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={working}>Annuler</AlertDialogCancel>
          {plan === "cancel_first" ? (
            onCancelGarde && (
              <Button onClick={() => { onOpenChange(false); onCancelGarde(); }}>
                {REMOVE_SIT_COPY.goCancel}
              </Button>
            )
          ) : (
            <Button
              variant="destructive"
              disabled={loading || working || plan === null}
              onClick={() => void confirm()}
            >
              {working && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {plan === "withdraw" ? REMOVE_SIT_COPY.confirmWithdraw : REMOVE_SIT_COPY.confirmDelete}
            </Button>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default RemoveSitDialog;
