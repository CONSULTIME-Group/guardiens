import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AlertTriangle, MessageSquare } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

export interface HistoryItem {
  id: string;
  conversation_id: string | null;
  content: string;
  created_at: string;
  recipient_id: string;
  recipient_name: string;
  recipient_avatar: string | null;
  status: "success" | "failed";
  error_message: string | null;
}

interface Props {
  open: boolean;
  loading: boolean;
  items: HistoryItem[];
  onClose: () => void;
  onOpenConversation: (conversationId: string) => void;
  onShowError: (item: HistoryItem) => void;
}

export const MessageHistoryDialog = ({ open, loading, items, onClose, onOpenConversation, onShowError }: Props) => (
  <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
    <DialogContent className="max-w-2xl">
      <DialogHeader><DialogTitle>Historique de mes messages admin</DialogTitle></DialogHeader>
      {loading ? (
        <p className="text-sm text-muted-foreground py-6 text-center">Chargement…</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-muted-foreground py-6 text-center">Aucun message envoyé pour le moment.</p>
      ) : (
        <div className="max-h-[60vh] overflow-y-auto space-y-3 pr-1">
          {items.map((it) => {
            const failed = it.status === "failed";
            return (
              <div
                key={it.id}
                className={`rounded-lg border p-3 transition ${failed ? "bg-destructive/5 border-destructive/30" : "bg-card hover:bg-accent/40"}`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={it.recipient_avatar || undefined} />
                    <AvatarFallback className="text-xs">
                      {it.recipient_name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="font-medium text-sm truncate">{it.recipient_name}</div>
                      <Badge variant={failed ? "destructive" : "default"} className="shrink-0 text-[10px] px-1.5 py-0">
                        {failed ? "Échec" : "Envoyé"}
                      </Badge>
                    </div>
                    <div
                      className="text-xs text-muted-foreground"
                      title={new Date(it.created_at).toLocaleString("fr-FR")}
                    >
                      {formatDistanceToNow(new Date(it.created_at), { addSuffix: true, locale: fr })}
                      <span className="ml-2 opacity-60">· {new Date(it.created_at).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}</span>
                    </div>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground line-clamp-3 whitespace-pre-wrap">{it.content || "(message vide)"}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {failed ? (
                    <Button variant="outline" size="sm" onClick={() => onShowError(it)}>
                      <AlertTriangle className="h-3.5 w-3.5 mr-1.5" />
                      Voir le détail de l'erreur
                    </Button>
                  ) : it.conversation_id ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onOpenConversation(it.conversation_id!)}
                    >
                      <MessageSquare className="h-3.5 w-3.5 mr-1.5" />
                      Ouvrir la conversation
                    </Button>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>Fermer</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);
