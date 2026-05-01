import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

export interface ErrorDetailState {
  open: boolean;
  recipient: string;
  sentAt: string;
  error: string;
  content: string;
}

interface Props {
  state: ErrorDetailState;
  onClose: () => void;
}

export const ErrorDetailDialog = ({ state, onClose }: Props) => (
  <Dialog open={state.open} onOpenChange={(o) => !o && onClose()}>
    <DialogContent className="max-w-xl">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-destructive" />
          Détail de l'erreur d'envoi
        </DialogTitle>
      </DialogHeader>
      <div className="space-y-4 text-sm">
        <div>
          <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Destinataire</div>
          <div className="font-medium">{state.recipient}</div>
        </div>
        {state.sentAt && (
          <div>
            <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Tentative</div>
            <div>{new Date(state.sentAt).toLocaleString("fr-FR", { dateStyle: "long", timeStyle: "short" })}</div>
          </div>
        )}
        <div>
          <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Erreur</div>
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-destructive whitespace-pre-wrap break-words">
            {state.error}
          </div>
        </div>
        <div>
          <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Message tenté</div>
          <div className="rounded-lg border bg-muted/40 p-3 whitespace-pre-wrap max-h-48 overflow-y-auto">
            {state.content || "(vide)"}
          </div>
        </div>
      </div>
      <DialogFooter>
        <Button onClick={onClose}>Fermer</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);
