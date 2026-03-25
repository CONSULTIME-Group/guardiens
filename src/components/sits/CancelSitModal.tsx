import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

const reasons = [
  "Empêchement personnel",
  "Problème de santé",
  "Changement de dates",
  "Logement non conforme",
  "Autre",
];

interface CancelSitModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sitId: string;
  sitTitle: string;
  sitOwnerId: string;
  startDate?: string;
  endDate?: string;
  onCancelled: () => void;
}

const CancelSitModal = ({
  open,
  onOpenChange,
  sitId,
  sitTitle,
  sitOwnerId,
  startDate,
  endDate,
  onCancelled,
}: CancelSitModalProps) => {
  const { user } = useAuth();
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCancel = async () => {
    if (!user || !reason) return;
    setLoading(true);

    try {
      const isSitterCancelling = user.id !== sitOwnerId;
      const fullReason = details ? `${reason} — ${details}` : reason;

      // Update sit status
      const { error: sitError } = await supabase
        .from("sits")
        .update({
          status: isSitterCancelling ? "published" : "cancelled",
          cancelled_by: user.id,
          cancellation_reason: fullReason,
          cancelled_at: new Date().toISOString(),
        } as any)
        .eq("id", sitId);

      if (sitError) throw sitError;

      // Cancel accepted applications
      await supabase
        .from("applications")
        .update({ status: "cancelled" })
        .eq("sit_id", sitId)
        .eq("status", "accepted");

      // If sitter cancelled, also cancel their specific application
      if (isSitterCancelling) {
        await supabase
          .from("applications")
          .update({ status: "cancelled" })
          .eq("sit_id", sitId)
          .eq("sitter_id", user.id);
      }

      // Send auto-message in conversation
      const { data: convs } = await supabase
        .from("conversations")
        .select("id")
        .eq("sit_id", sitId)
        .or(`owner_id.eq.${user.id},sitter_id.eq.${user.id}`);

      if (convs?.length) {
        const dateRange = startDate && endDate ? ` du ${startDate} au ${endDate}` : "";
        const msgContent = `La garde${dateRange} a été annulée par ${user.firstName}. Raison : ${fullReason}.`;

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

      toast.success(
        isSitterCancelling
          ? "Garde annulée. L'annonce est de nouveau visible pour d'autres gardiens."
          : "Garde annulée. Les gardiens ont été notifiés."
      );

      onCancelled();
      onOpenChange(false);
    } catch (err) {
      console.error(err);
      toast.error("Erreur lors de l'annulation.");
    }

    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Annuler cette garde</DialogTitle>
          <DialogDescription className="text-sm leading-relaxed">
            La vie est imprévisible, on comprend. Une annulation impacte votre taux de fiabilité visible par tous.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Raison de l'annulation</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionnez une raison" />
              </SelectTrigger>
              <SelectContent>
                {reasons.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Précisions (optionnel)</Label>
            <Textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Expliquez brièvement si vous le souhaitez..."
              rows={3}
              maxLength={500}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Revenir
          </Button>
          <Button
            variant="destructive"
            onClick={handleCancel}
            disabled={!reason || loading}
          >
            {loading ? "Annulation..." : "Confirmer l'annulation"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CancelSitModal;
