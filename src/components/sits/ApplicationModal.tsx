import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { Send, CheckCircle2 } from "lucide-react";

interface ApplicationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sitId: string;
  ownerId: string;
  ownerFirstName: string;
  petNames: string[];
  city: string;
  startDate: string;
  endDate: string;
  onSuccess: () => void;
}

const ApplicationModal = ({
  open,
  onOpenChange,
  sitId,
  ownerId,
  ownerFirstName,
  petNames,
  city,
  startDate,
  endDate,
  onSuccess,
}: ApplicationModalProps) => {
  const { user } = useAuth();
  const animalText = petNames.length > 0 ? petNames.join(", ") : "vos animaux";
  const defaultMessage = `Bonjour ${ownerFirstName || ""},\n\nVotre annonce pour ${animalText} à ${city || "votre ville"} m'intéresse beaucoup.\n\n\n\nJe serais disponible du ${startDate} au ${endDate}.`;

  const [message, setMessage] = useState(defaultMessage);
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!user || !message.trim()) return;
    setSending(true);
    const { error } = await supabase.from("applications").insert({
      sit_id: sitId,
      sitter_id: user.id,
      message: message.trim(),
      status: "pending",
    });
    setSending(false);
    if (error) {
      toast({ title: "Erreur", description: "Impossible d'envoyer la candidature.", variant: "destructive" });
      return;
    }
    toast({
      title: "Candidature envoyée !",
      description: "Vous serez notifié quand le propriétaire répondra.",
    });
    onOpenChange(false);
    onSuccess();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-heading">Postuler à cette garde</DialogTitle>
          <DialogDescription>Personnalisez votre message de candidature avant de l'envoyer.</DialogDescription>
        </DialogHeader>
        <Textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={8}
          className="resize-none"
          placeholder="Votre message de candidature..."
        />
        <div className="flex justify-end gap-2 mt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button onClick={handleSend} disabled={sending || !message.trim()} className="gap-2">
            <Send className="h-4 w-4" />
            {sending ? "Envoi..." : "Envoyer ma candidature"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ApplicationModal;
