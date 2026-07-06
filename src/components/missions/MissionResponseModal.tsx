import { useState } from "react";
import { Send, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { trackEvent } from "@/lib/analytics";

interface QuickTemplate {
  key: string;
  label: string;
  body: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  missionId: string;
  missionType: "besoin" | "offre";
  authorFirstName?: string | null;
  submitting: boolean;
  onSubmit: (message: string, templateKey: string | null) => Promise<void>;
}

const NEED_TEMPLATES: QuickTemplate[] = [
  {
    key: "available_flexible",
    label: "Disponible, flexible",
    body: "Bonjour, je peux vous donner un coup de main. Dites-moi ce qui vous arrange, je suis flexible sur les horaires.",
  },
  {
    key: "experienced",
    label: "J'ai déjà fait ça",
    body: "Bonjour, j'ai déjà fait ce genre de chose plusieurs fois. Je peux venir sans souci, dites-moi juste quand ça vous convient.",
  },
  {
    key: "questions_first",
    label: "Quelques questions",
    body: "Bonjour, votre demande m'intéresse. J'aurais deux ou trois questions avant de confirmer, pouvez-vous m'en dire un peu plus ?",
  },
];

const OFFER_TEMPLATES: QuickTemplate[] = [
  {
    key: "interested_when",
    label: "Intéressé(e), quand ?",
    body: "Bonjour, votre proposition m'intéresse. Quand seriez-vous disponible ? Je m'adapte.",
  },
  {
    key: "specific_need",
    label: "J'ai un besoin précis",
    body: "Bonjour, j'ai un besoin qui pourrait correspondre à votre offre. Puis-je vous en parler en privé ?",
  },
  {
    key: "recurring",
    label: "Besoin récurrent",
    body: "Bonjour, je cherche quelqu'un régulièrement pour ce type de coup de main. Seriez-vous partant(e) sur la durée ?",
  },
];

const MIN_LEN = 10;
const MAX_LEN = 500;

const MissionResponseModal = ({
  open, onOpenChange, missionId, missionType,
  authorFirstName, submitting, onSubmit,
}: Props) => {
  const [message, setMessage] = useState("");
  const [pickedTemplate, setPickedTemplate] = useState<string | null>(null);

  const templates = missionType === "offre" ? OFFER_TEMPLATES : NEED_TEMPLATES;
  const trimmed = message.trim();
  const valid = trimmed.length >= MIN_LEN && trimmed.length <= MAX_LEN;
  const tooShort = trimmed.length > 0 && trimmed.length < MIN_LEN;

  const pickTemplate = (t: QuickTemplate) => {
    setMessage(t.body);
    setPickedTemplate(t.key);
    trackEvent("mission_response_template_used", {
      metadata: { mission_id: missionId, template_key: t.key },
    });
  };

  const handleSubmit = async () => {
    if (!valid || submitting) return;
    await onSubmit(message, pickedTemplate);
    setMessage("");
    setPickedTemplate(null);
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
