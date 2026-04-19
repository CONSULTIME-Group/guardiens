import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  const { user, switchRole } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [exchangeOffer, setExchangeOffer] = useState("");
  const [needDescription, setNeedDescription] = useState("");
  const [exchangeDate, setExchangeDate] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!exchangeOffer.trim() || loading || !user) return;
    setLoading(true);

    try {
      // 0. Pre-check: mission still open
      const { data: freshMission, error: mErr } = await supabase
        .from("small_missions")
        .select("status")
        .eq("id", mission.id)
        .single();
      if (mErr) throw mErr;
      if (freshMission?.status === "cancelled" || freshMission?.status === "completed") {
        toast.error("Cette mission est clôturée — vous ne pouvez plus y répondre.");
        setLoading(false);
        return;
      }

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

      // 3. Build and send message
      const messageContent = [
        `💡 Proposition d'échange pour « ${mission.title} »`,
        `\n🎁 Ce que je propose : ${exchangeOffer.trim()}`,
        needDescription.trim() ? `\n🔍 Ce dont j'ai besoin : ${needDescription.trim()}` : "",
        exchangeDate ? `\n📅 Date proposée : ${exchangeDate}` : "",
      ].filter(Boolean).join("");

      const { error: msgError } = await supabase
        .from("messages")
        .insert({
          conversation_id: convId,
          sender_id: user.id,
          content: messageContent,
          is_system: false,
        });
      if (msgError) throw msgError;

      // 4. Create/upsert small_mission_responses with new fields
      await supabase
        .from("small_mission_responses")
        .upsert(
          {
            mission_id: mission.id,
            responder_id: user.id,
            message: exchangeOffer.trim(),
            exchange_offer: exchangeOffer.trim(),
            need_description: needDescription.trim(),
            exchange_date: exchangeDate || null,
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

      // 6. Invalidate caches so the list reflects "already_proposed"
      await queryClient.invalidateQueries({ queryKey: ["small-missions-all"] });

      // 7. Close + switch role + navigate
      onClose();
      switchRole('sitter');
      navigate(`/messages?conversationId=${convId}`);
    } catch (err: any) {
      console.error("[ProposeExchangeDialog]", err);
      toast.error(err?.message || "Impossible d'envoyer la proposition. Réessayez.", {
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
                ⚠ Cette mission est peut-être terminée — vous pouvez quand même envoyer un message.
              </p>
            )}
          </div>

          {/* What I offer */}
          <div className="space-y-1.5">
            <Label htmlFor="exchange-offer">Ce que je propose en échange *</Label>
            <Textarea
              id="exchange-offer"
              value={exchangeOffer}
              onChange={(e) => setExchangeOffer(e.target.value.slice(0, 300))}
              placeholder="Ex : Un bon repas, un coup de main au jardin, une promenade avec votre chien…"
              rows={3}
            />
            <p className="text-xs text-right text-muted-foreground">{exchangeOffer.length}/300</p>
          </div>

          {/* What I need */}
          <div className="space-y-1.5">
            <Label htmlFor="need-desc">Ce dont j'ai besoin (optionnel)</Label>
            <Textarea
              id="need-desc"
              value={needDescription}
              onChange={(e) => setNeedDescription(e.target.value.slice(0, 300))}
              placeholder="Ex : J'aurais aussi besoin d'un coup de main pour…"
              rows={2}
            />
            <p className="text-xs text-right text-muted-foreground">{needDescription.length}/300</p>
          </div>

          {/* Date */}
          <div className="space-y-1.5">
            <Label htmlFor="exchange-date">Date proposée (optionnel)</Label>
            <Input
              id="exchange-date"
              type="date"
              value={exchangeDate}
              onChange={(e) => setExchangeDate(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={onClose}>
            Annuler
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading || !exchangeOffer.trim()}
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
