import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MAX_MISSION_MESSAGE_LEN, MIN_MISSION_MESSAGE_LEN, QUICK_CAN_HELP_MESSAGE } from "@/lib/missionRespond";

/** Confirmation avant l'envoi d'un « Je peux » : message prérempli et modifiable. */
export const CanHelpDialog = ({ open, firstName, needTitle, sending, onCancel, onSend }: {
  open: boolean;
  firstName: string | null;
  needTitle: string;
  sending: boolean;
  onCancel: () => void;
  onSend: (message: string) => void;
}) => {
  const [message, setMessage] = useState(QUICK_CAN_HELP_MESSAGE);
  useEffect(() => { if (open) setMessage(QUICK_CAN_HELP_MESSAGE); }, [open]);
  const valid = message.trim().length >= MIN_MISSION_MESSAGE_LEN;

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onCancel(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Vous proposez votre aide à {firstName || "l'auteur du besoin"}</DialogTitle>
          <DialogDescription>{needTitle}</DialogDescription>
        </DialogHeader>
        <label htmlFor="can-help-message" className="text-sm font-semibold text-foreground">Votre message</label>
        <Textarea
          id="can-help-message"
          value={message}
          maxLength={MAX_MISSION_MESSAGE_LEN}
          onChange={(event) => setMessage(event.target.value)}
          rows={4}
        />
        <p className="text-xs text-muted-foreground">Votre message part avec votre prénom. La personne vous répond dans la messagerie.</p>
        <DialogFooter className="gap-2">
          <Button type="button" variant="outline" onClick={onCancel}>Annuler</Button>
          <Button type="button" onClick={() => onSend(message.trim())} disabled={!valid || sending}>
            {sending ? "Envoi..." : "Envoyer ma proposition"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CanHelpDialog;
