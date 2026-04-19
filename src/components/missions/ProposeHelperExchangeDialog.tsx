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
      // 1. Check existing private conversation between the two users (no mission, no sit)
      const { data: existing } = await supabase
        .from("conversations")
        .select("id")
        .or(
          `and(owner_id.eq.${user.id},sitter_id.eq.${helper.id}),and(owner_id.eq.${helper.id},sitter_id.eq.${user.id})`
        )
        .is("sit_id", null)
        .is("small_mission_id", null)
        .maybeSingle();

      let convId = existing?.id;

      // 2. Create only if none exists
      if (!convId) {
        const { data: conv, error: convError } = await supabase
          .from("conversations")
          .insert({
            owner_id: user.id,
            sitter_id: helper.id,
            sit_id: null,
            small_mission_id: null,
          })
          .select("id")
          .single();
        if (convError) throw convError;
        convId = conv.id;
      }

      // Send structured message
      const messageContent = [
        `💡 Proposition d'échange`,
        `\n🔍 Ce dont j'ai besoin : ${needDescription.trim()}`,
        `\n🎁 Ce que je propose en échange : ${exchangeOffer.trim()}`,
        exchangeDate ? `\n📅 Date proposée : ${exchangeDate}` : "",
      ].filter(Boolean).join("");

      const { error: msgError } = await supabase.from("messages").insert({
        conversation_id: convId,
        sender_id: user.id,
        content: messageContent,
        is_system: false,
      });
      if (msgError) throw msgError;

      // Notify helper (non-blocking)
      await supabase.from("notifications").insert({
        user_id: helper.id,
        type: "mission_proposal",
        title: "Proposition d'échange",
        body: `${(user as any).first_name || "Un membre"} vous propose un échange : "${needDescription.trim().slice(0, 60)}"`,
        link: `/messages?conversationId=${convId}`,
      });

      onClose();
      switchRole("owner");
      navigate(`/messages?conversationId=${convId}`);
    } catch (err: any) {
      console.error("[ProposeHelperExchangeDialog]", err);
      toast.error(err?.message || "Impossible d'envoyer la proposition. Réessayez.");
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
          </DialogDescription>
        </DialogHeader>

        {helperSkills.length > 0 && (
          <div className="flex flex-wrap gap-1.5 -mt-1">
            {helperSkills.slice(0, 6).map((skill) => (
              <span
                key={skill}
                className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20"
              >
                {skill}
              </span>
            ))}
          </div>
        )}

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
