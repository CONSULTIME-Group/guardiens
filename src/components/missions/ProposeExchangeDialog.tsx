import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { isPast } from "date-fns";

interface ProposeExchangeDialogProps {
  open: boolean;
  onClose: () => void;
  mission: {
    id: string;
    title: string;
    exchange_offer: string;
    date_needed?: string | null;
    user_id: string;
  };
  targetUserId: string;
  targetFirstName: string;
}

const ProposeExchangeDialog = ({
  open, onClose, mission, targetUserId, targetFirstName,
}: ProposeExchangeDialogProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [message, setMessage] = useState(
    `Bonjour ${targetFirstName}, je suis intéressé(e) par votre mission. En échange je peux...`
  );
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!message.trim() || loading || !user) return;
    setLoading(true);

    try {
      // 1. Check existing conversation for this mission
      const { data: existing } = await supabase
        .from("conversations")
        .select("id")
        .eq("small_mission_id", mission.id)
        .or(
          `and(owner_id.eq.${user.id},sitter_id.eq.${targetUserId}),and(owner_id.eq.${targetUserId},sitter_id.eq.${user.id})`
        )
        .maybeSingle();

      let convId = existing?.id;

      // 2. Create conversation if none exists
      if (!convId) {
        const { data: conv, error: convError } = await supabase
          .from("conversations")
          .insert({
            owner_id: user.id,
            sitter_id: targetUserId,
            small_mission_id: mission.id,
          })
          .select("id")
          .single();
        if (convError) throw convError;
        convId = conv.id;
      }

      // 3. Send message
      const { error: msgError } = await supabase
        .from("messages")
        .insert({
          conversation_id: convId,
          sender_id: user.id,
          content: message.trim(),
          is_system: false,
        });
      if (msgError) throw msgError;

      // 4. Create/upsert small_mission_responses
      await supabase
        .from("small_mission_responses")
        .upsert(
          {
            mission_id: mission.id,
            responder_id: user.id,
            message: message.trim(),
            status: "pending" as any,
            conversation_id: convId,
          },
          { onConflict: "mission_id,responder_id" }
        );

      // 5. Notification
      await supabase.from("notifications").insert({
        user_id: targetUserId,
        type: "mission_proposal",
        title: "Nouvelle proposition d'échange",
        body: `${(user as any).first_name || "Un membre"} vous propose un échange pour "${mission.title}"`,
        link: `/messages?conversationId=${convId}`,
      });

      // 6. Close + navigate
      onClose();
      navigate(`/messages?conversationId=${convId}`);
    } catch {
      toast.error("Impossible d'envoyer la proposition. Réessaie.", {
        duration: 5000,
      });
    } finally {
      setLoading(false);
    }
  };

  const isExpired = mission.date_needed && isPast(new Date(mission.date_needed));

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Proposer un échange à {targetFirstName}</DialogTitle>
          <DialogDescription>{mission.title}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Exchange offer context */}
          <div className="bg-muted/50 rounded-lg p-3 text-sm border border-border">
            <p className="text-xs text-muted-foreground mb-1">
              Ce que propose {targetFirstName} en échange :
            </p>
            <p className="font-medium text-foreground">{mission.exchange_offer}</p>
            {isExpired && (
              <p className="text-xs text-amber-600 mt-1">
                ⚠ Cette mission est peut-être terminée — tu peux quand même envoyer un message.
              </p>
            )}
          </div>

          {/* Message */}
          <div>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value.slice(0, 300))}
              placeholder={`Bonjour ${targetFirstName}, je suis intéressé(e) par votre mission. En échange je peux...`}
              rows={4}
            />
            <p className="text-xs text-right text-muted-foreground mt-1">
              {message.length}/300
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={onClose}>
            Annuler
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading || !message.trim()}
          >
            {loading && <Loader2 className="animate-spin w-4 h-4 mr-2" />}
            Envoyer ma proposition
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ProposeExchangeDialog;
