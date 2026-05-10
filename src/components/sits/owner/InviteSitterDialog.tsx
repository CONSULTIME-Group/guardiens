/**
 * Modal d'envoi d'une invitation à un gardien : message éditable (max 500 car),
 * pré-rempli avec contexte de l'annonce. Vouvoiement strict.
 */
import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useSendSitInvitation } from "@/hooks/useSitInvitations";
import { formatSitPeriod } from "@/lib/dateRange";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  sitter: { id: string; first_name: string | null } | null;
  sitId: string;
  ownerId: string;
  sitTitle: string;
  sitCity: string | null;
  startDate: string | null;
  endDate: string | null;
}

const MAX = 500;

const InviteSitterDialog = ({
  open,
  onOpenChange,
  sitter,
  sitId,
  ownerId,
  sitTitle,
  sitCity,
  startDate,
  endDate,
}: Props) => {
  const { mutate, isPending } = useSendSitInvitation(sitId, ownerId);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!open || !sitter) return;
    const period = formatSitPeriod(startDate, endDate);
    const intro = sitter.first_name ? `Bonjour ${sitter.first_name},` : "Bonjour,";
    const lieu = sitCity ? ` à ${sitCity}` : "";
    const dates = period ? ` du ${period}` : "";
    setMessage(
      `${intro}\n\nJe publie une garde${lieu}${dates}. Votre profil m'a tapé dans l'œil et je serais ravi(e) que vous y candidatiez si cela vous intéresse.\n\nÀ très vite !`,
    );
  }, [open, sitter, sitCity, startDate, endDate]);

  const handleSend = () => {
    if (!sitter) return;
    mutate(
      { sitterId: sitter.id, message },
      {
        onSuccess: () => onOpenChange(false),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Inviter {sitter?.first_name || "ce gardien"}</DialogTitle>
          <DialogDescription>
            Personnalisez votre message. Le gardien recevra une notification et un lien vers «{" "}
            {sitTitle || "votre annonce"} ».
          </DialogDescription>
        </DialogHeader>
        <Textarea
          value={message}
          onChange={(e) => setMessage(e.target.value.slice(0, MAX))}
          rows={8}
          className="resize-none"
        />
        <p className="text-xs text-muted-foreground text-right">
          {message.length}/{MAX}
        </p>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={isPending}>
            Annuler
          </Button>
          <Button onClick={handleSend} disabled={isPending || message.trim().length < 10}>
            {isPending ? "Envoi…" : "Envoyer l'invitation"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default InviteSitterDialog;
