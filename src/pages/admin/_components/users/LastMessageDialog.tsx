import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

export interface LastMessageState {
  open: boolean;
  loading: boolean;
  userName: string;
  userId: string;
  conversationId: string | null;
  content: string | null;
  sentAt: string | null;
}

interface Props {
  state: LastMessageState;
  onClose: () => void;
  onOpenConversation: (conversationId: string) => void;
}

export const LastMessageDialog = ({ state, onClose, onOpenConversation }: Props) => (
  <Dialog open={state.open} onOpenChange={(o) => !o && onClose()}>
    <DialogContent className="max-w-xl">
      <DialogHeader><DialogTitle>Dernier message envoyé à {state.userName}</DialogTitle></DialogHeader>
      {state.loading ? (
        <p className="text-sm text-muted-foreground py-6 text-center">Chargement…</p>
      ) : !state.content ? (
        <p className="text-sm text-muted-foreground py-6 text-center">
          Aucun message admin envoyé à cet utilisateur pour le moment.
        </p>
      ) : (
        <div className="space-y-3">
          {state.sentAt && (
            <p className="text-xs text-muted-foreground">
              Envoyé {formatDistanceToNow(new Date(state.sentAt), { addSuffix: true, locale: fr })}
              {" · "}
              {new Date(state.sentAt).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}
            </p>
          )}
          <div className="rounded-lg border bg-muted/40 p-4 text-sm whitespace-pre-wrap max-h-[50vh] overflow-y-auto">
            {state.content}
          </div>
        </div>
      )}
      <DialogFooter className="gap-2 sm:gap-2">
        {state.conversationId && (
          <Button variant="outline" onClick={() => onOpenConversation(state.conversationId!)}>
            Ouvrir la conversation
          </Button>
        )}
        <Button onClick={onClose}>Fermer</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);
