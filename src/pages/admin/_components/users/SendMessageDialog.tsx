import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Sparkles } from "lucide-react";
import { useMessageAiAssistant, type MessageAiAction } from "@/hooks/useMessageAiAssistant";

export interface MessageModalState {
  open: boolean;
  userId: string;
  userName: string;
  content: string;
  step: "edit" | "preview";
}

interface Props {
  state: MessageModalState;
  sending: boolean;
  onChange: (next: MessageModalState) => void;
  onClose: () => void;
  onSend: () => void;
}

export const SendMessageDialog = ({ state, sending, onChange, onClose, onSend }: Props) => {
  const ai = useMessageAiAssistant({
    getBody: () => state.content,
    setBody: (next) => onChange({ ...state, content: next.slice(0, 5000) }),
  });
  const disabled = sending || ai.isLoading;
  const aiButtons: Array<{ action: MessageAiAction; label: string }> = [
    { action: "warmer", label: "Reformuler" },
    { action: "proofread", label: "Corriger" },
    { action: "shorten", label: "Raccourcir" },
  ];

  return (
    <Dialog open={state.open} onOpenChange={(o) => !o && !sending && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {state.step === "edit" ? "Rédiger un message à " : "Prévisualisation, message à "}
            {state.userName}
          </DialogTitle>
        </DialogHeader>
        {state.step === "edit" ? (
          <div className="space-y-2">
            <Textarea
              placeholder="Votre message…"
              value={state.content}
              onChange={(e) => onChange({ ...state, content: e.target.value })}
              rows={6}
              maxLength={5000}
              disabled={disabled}
            />
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
                <Sparkles className="h-3 w-3 text-primary" /> Assistant IA :
              </span>
              {aiButtons.map((b) => (
                <Button
                  key={b.action}
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  disabled={disabled}
                  onClick={() => ai.run(b.action)}
                >
                  {ai.loading === b.action ? (
                    <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />
                  ) : null}
                  {b.label}
                </Button>
              ))}
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Le message sera envoyé en votre nom dans la messagerie de l'utilisateur.</span>
              <span>{state.content.length}/5000</span>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="rounded-lg border bg-muted/40 p-4 whitespace-pre-wrap text-sm leading-relaxed">
              {state.content || <span className="text-muted-foreground italic">Message vide</span>}
            </div>
            <p className="text-xs text-muted-foreground">
              Vérifiez le contenu, le ton et l'orthographe. Une fois envoyé, le message apparaîtra immédiatement dans la messagerie de <strong>{state.userName}</strong>.
            </p>
          </div>
        )}
        <DialogFooter className="gap-2 sm:gap-2">
          {state.step === "edit" ? (
            <>
              <Button variant="outline" onClick={onClose} disabled={sending}>Annuler</Button>
              <Button onClick={() => onChange({ ...state, step: "preview" })} disabled={!state.content.trim() || ai.isLoading}>
                Prévisualiser →
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => onChange({ ...state, step: "edit" })} disabled={sending}>
                ← Modifier
              </Button>
              <Button onClick={onSend} disabled={sending || !state.content.trim()}>
                {sending ? "Envoi…" : "Confirmer & envoyer"}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
