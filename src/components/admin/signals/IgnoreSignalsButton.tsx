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
 */
export const IgnoreSignalsButton = ({ ids, label }: { ids: string[]; label?: string }) => {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const count = ids.length;
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
      toast.error(count > 1 ? "Impossible d'ignorer ces signaux." : "Impossible d'ignorer ce signal.");
      return;
    }
    refresh();
    toast.success(count > 1 ? `${count} signaux ignorés.` : "Signal ignoré.", {
      duration: IGNORE_UNDO_MS,
      action: {
        label: "Annuler",
        onClick: async () => {
          const res = await restoreSignals(ids);
          if (res.error) { toast.error("Impossible de rouvrir : le signal reste ignoré."); return; }
          refresh();
          toast.success(count > 1 ? "Signaux remis dans la liste." : "Signal remis dans la liste.");
        },
      },
    });
  };

  return (
    <>
      <Button size="sm" variant="ghost" onClick={() => setOpen(true)} disabled={busy || count === 0}>
        {label ?? (count > 1 ? "Tout ignorer" : "Ignorer")}
      </Button>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{ignoreConfirmTitle(count)}</AlertDialogTitle>
            <AlertDialogDescription>
              {count > 1 ? "Ils sortent de la liste" : "Il sort de la liste"} et de l'email du matin. Vous pourrez annuler pendant 10 secondes.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Garder</AlertDialogCancel>
            <AlertDialogAction disabled={busy} onClick={(e) => { e.preventDefault(); void confirm(); }}>
              {busy ? "En cours…" : "Ignorer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
