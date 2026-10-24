import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MAX_MISSION_MESSAGE_LEN, MIN_MISSION_MESSAGE_LEN, QUICK_CAN_HELP_MESSAGE } from "@/lib/missionRespond";

/**
 * Confirmation avant l'envoi d'un « Je peux » : message prérempli et modifiable.
 * Lot E13 (24/10/2026) : la fenêtre redit le besoin (lieu, date, description,
 * lien vers l'annonce) avant le message, pour répondre en connaissance de cause,
 * et défile sur un petit écran.
 */
export const CanHelpDialog = ({ open, firstName, needTitle, needMeta, needDescription, detailPath, sending, onCancel, onSend }: {
  open: boolean;
  firstName: string | null;
  needTitle: string;
  needMeta?: string | null;
  needDescription?: string | null;
  detailPath?: string | null;
  sending: boolean;
  onCancel: () => void;
  onSend: (message: string) => void;
}) => {
  const [message, setMessage] = useState(QUICK_CAN_HELP_MESSAGE);
  useEffect(() => { if (open) setMessage(QUICK_CAN_HELP_MESSAGE); }, [open]);
  const valid = message.trim().length >= MIN_MISSION_MESSAGE_LEN;

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onCancel(); }}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Vous proposez votre aide à {firstName || "l'auteur du besoin"}</DialogTitle>
          <DialogDescription className="text-[15px] font-semibold leading-snug text-foreground">{needTitle}</DialogDescription>
        </DialogHeader>
        <section aria-label="Le besoin" className="space-y-2 rounded-lg border border-border bg-muted/30 p-3" data-testid="can-help-need">
          {needMeta && <p className="text-xs text-muted-foreground">{needMeta}</p>}
          {needDescription && (
            <p className="max-h-48 overflow-y-auto whitespace-pre-line text-sm leading-relaxed text-foreground" data-testid="can-help-description">
              {needDescription}
            </p>
          )}
          {detailPath && (
            <Link to={detailPath} className="inline-flex min-h-11 items-center text-sm font-semibold text-primary underline underline-offset-2">
              Voir l'annonce en entier
            </Link>
          )}
        </section>
        <label htmlFor="can-help-message" className="text-sm font-semibold text-foreground">Votre message</label>
        <Textarea
          id="can-help-message"
          value={message}
          maxLength={MAX_MISSION_MESSAGE_LEN}
          onChange={(event) => setMessage(event.target.value)}
          rows={3}
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
