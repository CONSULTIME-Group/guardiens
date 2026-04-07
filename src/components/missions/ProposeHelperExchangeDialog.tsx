import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

interface ProposeHelperExchangeDialogProps {
  open: boolean;
  onClose: () => void;
  helper: {
    id: string;
    first_name: string;
    city?: string;
    competences?: string[];
    custom_skills?: string[];
  };
}

const ProposeHelperExchangeDialog = ({
  open, onClose, helper,
}: ProposeHelperExchangeDialogProps) => {
  const { user, switchRole } = useAuth();
  const navigate = useNavigate();
  const [exchangeOffer, setExchangeOffer] = useState("");
  const [needDescription, setNeedDescription] = useState("");
  const [exchangeDate, setExchangeDate] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!exchangeOffer.trim() || !needDescription.trim() || loading || !user) return;
    setLoading(true);

    try {
      // 1. Create a small_mission from the requester
      const { data: mission, error: missionError } = await supabase
        .from("small_missions")
        .insert({
          user_id: user.id,
          title: needDescription.trim().slice(0, 120),
          description: needDescription.trim(),
          category: "skills" as any,
          exchange_offer: exchangeOffer.trim(),
          city: helper.city || "",
          postal_code: "",
          duration_estimate: "1-2h",
          date_needed: exchangeDate || null,
        } as any)
        .select("id")
        .single();

      if (missionError) throw missionError;
      const missionId = mission.id;

      // 2. Create conversation linked to mission
      const { data: conv, error: convError } = await supabase
        .from("conversations")
        .insert({
          owner_id: user.id,
          sitter_id: helper.id,
          small_mission_id: missionId,
        })
        .select("id")
        .single();

      if (convError) throw convError;

      // 3. Send message
      const messageContent = [
        `💡 Proposition d'échange`,
        `\n🔍 Ce dont j'ai besoin : ${needDescription.trim()}`,
        `\n🎁 Ce que je propose en échange : ${exchangeOffer.trim()}`,
        exchangeDate ? `\n📅 Date proposée : ${exchangeDate}` : "",
      ].filter(Boolean).join("");

      await supabase.from("messages").insert({
        conversation_id: conv.id,
        sender_id: user.id,
        content: messageContent,
        is_system: false,
      });

      // 4. Create a response entry (pending) for the helper to accept/refuse
      await supabase.from("small_mission_responses").insert({
        mission_id: missionId,
        responder_id: helper.id,
        message: exchangeOffer.trim(),
        exchange_offer: exchangeOffer.trim(),
        need_description: needDescription.trim(),
        exchange_date: exchangeDate || null,
        status: "pending" as any,
        conversation_id: conv.id,
      });

      // 5. Notify helper
      await supabase.from("notifications").insert({
        user_id: helper.id,
        type: "mission_proposal",
        title: "Proposition d'échange",
        body: `${(user as any).first_name || "Un membre"} vous propose un échange : "${needDescription.trim().slice(0, 60)}"`,
        link: `/messages?conversationId=${conv.id}`,
      });

      onClose();
      switchRole("owner");
      navigate(`/messages?conversationId=${conv.id}`);
    } catch (err) {
      toast.error("Impossible d'envoyer la proposition. Réessaie.");
    } finally {
      setLoading(false);
    }
  };

  const helperSkills = [
    ...(helper.competences || []),
    ...(helper.custom_skills || []),
  ];

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Proposer un échange à {helper.first_name}</DialogTitle>
          <DialogDescription>
            {helper.first_name} est disponible pour aider.
            {helperSkills.length > 0 && (
              <> Compétences : {helperSkills.slice(0, 3).join(", ")}</>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* What I need */}
          <div className="space-y-1.5">
            <Label htmlFor="helper-need">Ce dont j'ai besoin *</Label>
            <Textarea
              id="helper-need"
              value={needDescription}
              onChange={(e) => setNeedDescription(e.target.value.slice(0, 300))}
              placeholder="Ex : Arroser mon jardin pendant 3 jours, promener mon chien…"
              rows={3}
            />
            <p className="text-xs text-right text-muted-foreground">{needDescription.length}/300</p>
          </div>

          {/* What I offer */}
          <div className="space-y-1.5">
            <Label htmlFor="helper-offer">Ce que je propose en échange *</Label>
            <Textarea
              id="helper-offer"
              value={exchangeOffer}
              onChange={(e) => setExchangeOffer(e.target.value.slice(0, 300))}
              placeholder="Ex : Un bon repas, des légumes du jardin, un coup de main bricolage…"
              rows={3}
            />
            <p className="text-xs text-right text-muted-foreground">{exchangeOffer.length}/300</p>
          </div>

          {/* Date */}
          <div className="space-y-1.5">
            <Label htmlFor="helper-date">Date proposée (optionnel)</Label>
            <Input
              id="helper-date"
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
            disabled={loading || !exchangeOffer.trim() || !needDescription.trim()}
          >
            {loading && <Loader2 className="animate-spin w-4 h-4 mr-2" />}
            Envoyer ma proposition
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ProposeHelperExchangeDialog;
