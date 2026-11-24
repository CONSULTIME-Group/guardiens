import { useState } from "react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { refreshAdminBadges } from "@/hooks/useAdminBadges";

/** Durée pendant laquelle « Annuler » rouvre les signaux ignorés. */
export const IGNORE_UNDO_MS = 10_000;

/** Titre de la confirmation : le nombre est dit, jamais deviné. */
export function ignoreConfirmTitle(count: number): string {
  return count > 1 ? `Ignorer ces ${count} signaux ?` : "Ignorer ce signal ?";
}

/**
 * Lot VE-7 : mots de la fermeture. « ignore » pour les cartes (inchangé),
 * « done » pour « Marquer comme traité » sur une ligne de la vue d'ensemble :
 * même action enregistrée (dismissed), la fenêtre et le message parlent de la ligne.
 */
export function closeWording(done: boolean, count: number) {
  const many = count > 1;
  return done
    ? {
        title: "Marquer cette ligne comme traitée ?",
        description: `${many ? `Ses ${count} signaux sortent` : "Elle sort"} de la liste et de l'email du matin. Vous pourrez annuler pendant 10 secondes.`,
        confirm: "Marquer comme traité",
        success: "Ligne marquée comme traitée.",
        failure: "Enregistrement impossible : la ligne reste dans la liste.",
        restored: "Ligne remise dans la liste.",
        restoreFailure: "Annulation impossible : la ligne reste marquée comme traitée.",
      }
    : {
        title: ignoreConfirmTitle(count),
        description: `${many ? "Ils sortent de la liste" : "Il sort de la liste"} et de l'email du matin. Vous pourrez annuler pendant 10 secondes.`,
        confirm: "Ignorer",
        success: many ? `${count} signaux ignorés.` : "Signal ignoré.",
        failure: many ? "Impossible d'ignorer ces signaux." : "Impossible d'ignorer ce signal.",
        restored: many ? "Signaux remis dans la liste." : "Signal remis dans la liste.",
        restoreFailure: "Impossible de rouvrir : le signal reste ignoré.",
      };
}

/** Ferme les signaux comme ignorés par l'admin connecté. */
export async function dismissSignals(ids: string[]) {
  const { data: { user } } = await supabase.auth.getUser();
  return supabase
    .from("admin_signals")
    .update({ resolved_at: new Date().toISOString(), action_taken: "dismissed", admin_id: user?.id ?? null })
    .in("id", ids)
    .is("resolved_at", null);
}

/** Rouvre des signaux ignorés à l'instant (seulement ceux qui le sont encore). */
export async function restoreSignals(ids: string[]) {
  return supabase
    .from("admin_signals")
    .update({ resolved_at: null, action_taken: null, admin_id: null })
    .in("id", ids)
    .eq("action_taken", "dismissed");
}

/**
 * Lot ADM14 (lot A V5 de l'arène admin du 09/11/2026) : « Ignorer » et « Tout
 * ignorer » demandent confirmation avec le nombre de signaux, puis laissent
 * 10 secondes pour annuler. Un seul composant pour toutes les cartes.
 * Lot VE-6 : className habille le bouton en lien sur une ligne de la vue d'ensemble.
 */
export const IgnoreSignalsButton = ({ ids, label, className, done = false }: { ids: string[]; label?: string; className?: string; done?: boolean }) => {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const count = ids.length;
  const words = closeWording(done, count);
  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ["admin_dashboard_snapshot"] });
    refreshAdminBadges();
  };

  const confirm = async () => {
    setBusy(true);
    const { error } = await dismissSignals(ids);
    setBusy(false);
    setOpen(false);
    if (error) {
      toast.error(words.failure);
      return;
    }
    refresh();
    toast.success(words.success, {
      duration: IGNORE_UNDO_MS,
      action: {
        label: "Annuler",
        onClick: async () => {
          const res = await restoreSignals(ids);
          if (res.error) { toast.error(words.restoreFailure); return; }
          refresh();
          toast.success(words.restored);
        },
      },
    });
  };

  return (
    <>
      <Button size="sm" variant="ghost" className={className} onClick={() => setOpen(true)} disabled={busy || count === 0}>
        {label ?? (count > 1 ? "Tout ignorer" : "Ignorer")}
      </Button>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{words.title}</AlertDialogTitle>
            <AlertDialogDescription>{words.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Garder</AlertDialogCancel>
            <AlertDialogAction disabled={busy} onClick={(e) => { e.preventDefault(); void confirm(); }}>
              {busy ? "En cours…" : words.confirm}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
