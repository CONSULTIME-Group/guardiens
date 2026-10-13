import { useState } from "react";
import { logger } from "@/lib/logger";
import { supabase } from "@/integrations/supabase/client";
import { sendTransactionalEmail } from "@/lib/sendTransactionalEmail";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { cancelOutcomeFromStatus, cancelOutcomeMessage, type CancelOutcome } from "@/lib/sitCancellation";

interface CancelSitModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sitId: string;
  sitTitle: string;
  sitOwnerId: string;
  otherPartyName?: string;
  startDate?: string;
  endDate?: string;
  /** Lot X3a (B-02) : issue réelle, annonce republiée ou garde annulée. */
  onCancelled: (outcome?: CancelOutcome) => void;
}

const CancelSitModal = ({
  open,
  onOpenChange,
  sitId,
  sitTitle,
  sitOwnerId,
  otherPartyName,
  startDate,
  endDate,
  onCancelled,
}: CancelSitModalProps) => {
  const { user } = useAuth();
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  const isSitterCancelling = user?.id !== sitOwnerId;
  const cancelledByRole = isSitterCancelling ? "gardien" : "proprio";
  const otherName = otherPartyName || (isSitterCancelling ? "le propriétaire" : "le gardien");

  const canSubmit = reason.trim().length >= 20;

  const handleCancel = async () => {
    if (!user || !canSubmit) return;
    setLoading(true);

    try {
      // Determine reviewee_id: the other party
      // For owner cancelling: reviewee is the accepted sitter
      // For sitter cancelling: reviewee is the owner
      let revieweeId: string;

      if (isSitterCancelling) {
        revieweeId = sitOwnerId;
      } else {
        // Get accepted sitter
        const { data: acceptedApp } = await supabase
          .from("applications")
          .select("sitter_id")
          .eq("sit_id", sitId)
          .eq("status", "accepted")
          .maybeSingle();
        revieweeId = acceptedApp?.sitter_id || sitOwnerId;
      }

      // Call the RPC function
      const { error: rpcError } = await supabase.rpc("create_avis_annulation", {
        p_sit_id: sitId,
        p_reviewer_id: user.id,
        p_reviewee_id: revieweeId,
        p_cancelled_by_role: cancelledByRole,
        p_reason: reason.trim(),
      });

      if (rpcError) throw rpcError;

      // Lot X3a (B-02) : côté gardien, create_avis_annulation passe la
      // candidature en cancelled et republie une garde à venir. On relit
      // l'annonce pour dire ce qui s'est réellement passé : publiée, la RPC
      // publique la rend ; annulée, elle ne la rend plus.
      let outcome: CancelOutcome = "cancelled";
      if (isSitterCancelling) {
        const { data: afterRows } = await supabase.rpc("get_public_sit", { p_param: sitId });
        outcome = cancelOutcomeFromStatus((afterRows as any[] | null)?.[0]?.status ?? null);
      } else {
        // Propriétaire : la candidature acceptée est close (autorisé au propriétaire).
        await supabase
          .from("applications")
          .update({ status: "cancelled" })
          .eq("sit_id", sitId)
          .eq("status", "accepted");
      }

      // Send system message in conversation
      const { data: convs } = await supabase
        .from("conversations")
        .select("id")
        .eq("sit_id", sitId)
        .or(`owner_id.eq.${user.id},sitter_id.eq.${user.id}`);

      if (convs?.length) {
        const dateRange = startDate && endDate ? ` du ${startDate} au ${endDate}` : "";
        const msgContent = `La garde${dateRange} a été annulée par ${user.firstName || "l'utilisateur"}. Raison : ${reason.trim()}.`;

        await Promise.all(
          convs.map((conv) =>
            supabase.from("messages").insert({
              conversation_id: conv.id,
              sender_id: user.id,
              content: msgContent,
              is_system: true,
            })
          )
        );
      }

      // Trigger transactional email (non-blocking, helper résout l'email)
      const templateName = isSitterCancelling ? "cancellation-by-sitter" : "cancellation-by-owner";
      await sendTransactionalEmail({
        templateName,
        recipientUserId: revieweeId,
        idempotencyKey: `${templateName}-${sitId}-${user.id}`,
        templateData: {
          cancellerFirstName: user.firstName || "Un membre",
          sitTitle: sitTitle,
          startDate: startDate || "",
          reason: reason.trim(),
        },
      });

      toast.success(cancelOutcomeMessage(cancelledByRole, outcome));

      setReason("");
      onCancelled(outcome);
      onOpenChange(false);
    } catch (err: any) {
      logger.error("CancelSitModal error", { err: String(err) });
      toast.error(err?.message || "Erreur lors de l'annulation.");
    }

    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Annuler cette garde ?</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Info banner */}
          <div className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3">
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-sm text-amber-800">
              Votre commentaire sera soumis à validation puis publié sur votre profil.{" "}
              {otherName} pourra y répondre dans les 7 jours.
            </p>
          </div>

          {/* Reason textarea */}
          <div>
            <label className="text-sm font-medium text-foreground mb-1 block">
              Raison de l'annulation *
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value.slice(0, 300))}
              placeholder="Expliquez la raison de votre annulation (20 caractères minimum)..."
              className="w-full border border-border rounded-xl p-3 text-sm resize-none h-24 focus:border-primary focus:outline-none bg-background"
              maxLength={300}
            />
            <p className={`text-xs text-right mt-1 ${reason.trim().length < 20 ? "text-destructive" : "text-muted-foreground"}`}>
              {reason.length}/300 caractères
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border border-border text-foreground"
          >
            Garder la garde
          </Button>
          <Button
            variant="destructive"
            onClick={handleCancel}
            disabled={!canSubmit || loading}
            className={!canSubmit ? "opacity-50 cursor-not-allowed" : ""}
          >
            {loading ? "Annulation..." : "Confirmer l'annulation"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CancelSitModal;
