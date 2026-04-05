import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface FeedbackDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const MAX_LENGTH = 1000;

const FeedbackDialog = ({ open, onOpenChange }: FeedbackDialogProps) => {
  const { user } = useAuth();
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const handleSubmit = async () => {
    const trimmed = message.trim();
    if (!trimmed || !user) return;

    setSending(true);
    const { error } = await supabase.from("contact_messages").insert({
      email: user.email || "",
      name: user.firstName || "Utilisateur",
      subject: "Feedback utilisateur",
      message: trimmed,
      source: "feedback",
    });
    setSending(false);

    if (error) {
      toast.error("Une erreur est survenue, veuillez réessayer.", { duration: 5000 });
      return;
    }

    toast.success("Merci, on a bien reçu votre retour.", { duration: 3000 });
    setMessage("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">Votre avis nous aide à avancer</DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">
          Parce que votre avis compte pour améliorer chaque jour un peu plus la plateforme, dites-nous ce qui fonctionne, ce qui coince, ou ce que vous aimeriez voir.
        </p>

        <div className="relative">
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value.slice(0, MAX_LENGTH))}
            placeholder="Un bug ? Une idée ? Quelque chose qui vous a manqué ?"
            rows={5}
            maxLength={MAX_LENGTH}
            className="resize-none"
          />
          <span className="absolute bottom-2 right-3 text-xs text-muted-foreground">
            {message.length}/{MAX_LENGTH}
          </span>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={sending}>
            Annuler
          </Button>
          <Button onClick={handleSubmit} disabled={!message.trim() || sending}>
            {sending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Envoyer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default FeedbackDialog;
