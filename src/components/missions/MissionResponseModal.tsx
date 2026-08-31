import { useState } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  missionId: string;
  missionType: "besoin" | "offre";
  authorFirstName?: string | null;
  submitting: boolean;
  onSubmit: (message: string, templateKey: string | null) => Promise<void>;
}

/**
 * Repères de rédaction, en lecture seule. Aucun texte de cet encadré ne peut
 * atterrir dans le champ : les messages tout faits produisaient des réponses
 * identiques d'un membre à l'autre.
 */
const WRITING_TIPS = [
  "Dites qui vous êtes en une phrase.",
  "Dites ce que vous pouvez faire concrètement, et quand.",
  "Posez la question qui vous manque pour vous décider.",
];

const MIN_LEN = 10;
const MAX_LEN = 500;

const MissionResponseModal = ({
  open, onOpenChange, missionId, missionType,
  authorFirstName, submitting, onSubmit,
}: Props) => {
  const [message, setMessage] = useState("");

  const trimmed = message.trim();
  const valid = trimmed.length >= MIN_LEN && trimmed.length <= MAX_LEN;
  const tooShort = trimmed.length > 0 && trimmed.length < MIN_LEN;

  const handleSubmit = async () => {
    if (!valid || submitting) return;
    // Modération pré-envoi (content_type "message") : coordonnées autorisées,
    // seule une proposition de paiement direct est interceptée.
    const { moderateContent } = await import("@/lib/moderation");
    const { toast } = await import("@/hooks/use-toast");
    const verdict = await moderateContent("message", trimmed);
    if (verdict.status === "block") {
      toast({
        title: "Message bloqué",
        description: verdict.reasons.join(" · ") || "Ce message n'a pas pu être envoyé. Reformulez-le, ou écrivez-nous si le problème persiste.",
        variant: "destructive",
      });
      return;
    }
    await onSubmit(message, null);
    setMessage("");
  };



  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {missionType === "offre"
              ? `Solliciter ${authorFirstName || "cette personne"}`
              : `Répondre à ${authorFirstName || "l'auteur"}`}
          </DialogTitle>
          <DialogDescription>
            Votre réponse est publique. Un mot bienveillant et concret suffit.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5" /> Modèles rapides
            </p>
            <div className="flex flex-wrap gap-2">
              {templates.map((t) => {
                const active = pickedTemplate === t.key;
                return (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => pickTemplate(t)}
                    className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                      active
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-muted/50 text-foreground border-border hover:bg-muted"
                    }`}
                  >
                    {t.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <Textarea
              value={message}
              onChange={(e) => {
                setMessage(e.target.value.slice(0, MAX_LEN));
                if (pickedTemplate) setPickedTemplate(null);
              }}
              placeholder="Écrivez votre réponse…"
              rows={5}
              className={`resize-none ${tooShort ? "ring-1 ring-destructive/40" : ""}`}
              aria-invalid={tooShort}
            />
            <div className="flex items-center justify-between mt-1.5">
              <span className={`text-[11px] ${tooShort ? "text-destructive" : "text-muted-foreground"}`}>
                {tooShort
                  ? `Encore ${MIN_LEN - trimmed.length} caractères minimum`
                  : "Visible par tout le monde"}
              </span>
              <span className={`text-[11px] ${message.length > 450 ? "text-warning" : "text-muted-foreground"}`}>
                {message.length}/{MAX_LEN}
              </span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Annuler
          </Button>
          <Button onClick={handleSubmit} disabled={!valid || submitting} className="gap-1.5">
            <Send className="h-3.5 w-3.5" />
            {submitting ? "Envoi…" : "Publier ma réponse"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default MissionResponseModal;
