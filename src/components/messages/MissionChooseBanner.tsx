import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { capitalizeFirstName } from "@/lib/displayName";
import { chooseMissionResponse } from "@/lib/missionResponseDecision";

/**
 * Bandeau « Choisir {prénom} » dans une conversation liée à un besoin ouvert.
 * Visible seulement pour l'auteur du besoin, tant que la réponse de l'autre
 * personne est en attente. Même chemin que la page du besoin : accept_mission_response
 * puis notify-mission-event (lot Z, src/lib/missionResponseDecision.ts).
 */
export const MissionChooseBanner = ({ missionId, userId, otherUserId, otherFirstName, onChosen }: {
  missionId: string;
  userId: string;
  otherUserId: string;
  otherFirstName: string | null | undefined;
  onChosen?: () => void;
}) => {
  const [state, setState] = useState<{ responseId: string; title: string; isProjet: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  const name = capitalizeFirstName(otherFirstName) || "cette personne";

  useEffect(() => {
    let active = true;
    setState(null);
    const load = async () => {
      const { data: mission } = await supabase.from("small_missions").select("id, title, status, user_id, category").eq("id", missionId).maybeSingle();
      if (!active || !mission || mission.user_id !== userId || mission.status !== "open") return;
      const { data: response } = await supabase.from("small_mission_responses").select("id, status")
        .eq("mission_id", missionId).eq("responder_id", otherUserId).maybeSingle();
      if (!active || !response || response.status !== "pending") return;
      setState({ responseId: response.id, title: mission.title, isProjet: mission.category === "projet" });
    };
    void load();
    return () => { active = false; };
  }, [missionId, userId, otherUserId]);

  if (!state) return null;

  const choose = async () => {
    setBusy(true);
    const result = await chooseMissionResponse({
      responseId: state.responseId,
      missionId,
      actorId: userId,
      responderId: otherUserId,
      declineOthers: !state.isProjet,
    });
    setBusy(false);
    if (result.ok === false) { toast.error("Réessayez dans un instant."); return; }
    toast.success(`C'est noté, ${name} vous aide.`);
    setState(null);
    onChosen?.();
  };

  return (
    <div className="mx-4 mt-3 flex flex-col gap-3 rounded-lg border border-primary/30 bg-primary/5 p-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-foreground">
        Vous échangez avec {name} au sujet de « {state.title} ». C'est {name} qui vous aide ?
      </p>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button size="sm" className="shrink-0 rounded-full" disabled={busy}>Choisir {name}</Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Choisir {name} ?</AlertDialogTitle>
            <AlertDialogDescription>
              {state.isProjet
                ? "Votre projet passe en cours et les candidatures se ferment. Vous pouvez les rouvrir à tout moment."
                : "Votre besoin passe en cours et les autres réponses sont écartées."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={() => void choose()}>Choisir {name}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default MissionChooseBanner;
