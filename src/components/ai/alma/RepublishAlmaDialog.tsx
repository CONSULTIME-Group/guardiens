/**
 * <RepublishAlmaDialog /> — Alma propose 2 modes pour republier une annonce archivée.
 *
 * Mode "copy"  : redirige vers /sits/create?from={sitId}&mode=copy → pré-remplit tel quel.
 * Mode "adapt" : redirige vers /sits/create?from={sitId}&mode=adapt&prompt={text} → Alma
 *                réutilise la logique draft-sit-from-prompt avec le contexte de l'ancienne
 *                annonce comme base et le prompt utilisateur comme delta.
 *
 * Vouvoiement owner (l'utilisateur qui republie est toujours un propriétaire).
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { AlmaAvatar } from "./AlmaAvatar";
import { trackEvent } from "@/lib/analytics";

interface RepublishAlmaDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  sitId: string;
  sourceTitle?: string | null;
}

type Mode = "copy" | "adapt";

export function RepublishAlmaDialog({
  open,
  onOpenChange,
  sitId,
  sourceTitle,
}: RepublishAlmaDialogProps) {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("copy");
  const [prompt, setPrompt] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleConfirm = () => {
    setSubmitting(true);
    try {
      trackEvent("alma_republish_mode_selected", {
        source: "republish_dialog",
        metadata: { mode, sit_id: sitId },
      });
    } catch {}

    const params = new URLSearchParams();
    params.set("from", sitId);
    params.set("mode", mode);
    if (mode === "adapt" && prompt.trim()) {
      params.set("prompt", prompt.trim().slice(0, 800));
    }
    navigate(`/sits/create?${params.toString()}`);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <AlmaAvatar size={32} />
            <div className="flex flex-col">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-primary/80">
                Alma
              </span>
              <DialogTitle className="text-base font-semibold leading-tight">
                Republier votre annonce
              </DialogTitle>
            </div>
          </div>
          <DialogDescription className="text-sm text-muted-foreground">
            {sourceTitle
              ? `Je repars de « ${sourceTitle} ». Choisissez comment vous voulez la republier.`
              : "Je repars de votre annonce précédente. Choisissez comment vous voulez la republier."}
          </DialogDescription>
        </DialogHeader>

        <RadioGroup
          value={mode}
          onValueChange={(v) => setMode(v as Mode)}
          className="space-y-2 pt-2"
        >
          <label
            htmlFor="mode-copy"
            className="flex items-start gap-3 rounded-xl border border-border p-3 hover:bg-muted/40 cursor-pointer"
          >
            <RadioGroupItem value="copy" id="mode-copy" className="mt-1" />
            <div>
              <p className="text-sm font-medium">Copier tel quel, ajuster les dates</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Tous les champs sont pré-remplis. Vous saisirez uniquement les nouvelles dates.
              </p>
            </div>
          </label>

          <label
            htmlFor="mode-adapt"
            className="flex items-start gap-3 rounded-xl border border-border p-3 hover:bg-muted/40 cursor-pointer"
          >
            <RadioGroupItem value="adapt" id="mode-adapt" className="mt-1" />
            <div className="flex-1">
              <p className="text-sm font-medium">Adapter avec Alma</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Précisez ce qui change, je réécris le brouillon avant que vous ne repreniez la main.
              </p>
              {mode === "adapt" && (
                <Textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Précisez ce qui change (nouvelles dates, nouveau contexte, différentes préférences…)"
                  maxLength={800}
                  className="mt-2 min-h-[80px] text-sm"
                  aria-label="Décrivez les changements"
                />
              )}
            </div>
          </label>
        </RadioGroup>

        <div className="flex items-center justify-end gap-2 pt-2">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Annuler
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={
              submitting || (mode === "adapt" && prompt.trim().length < 10)
            }
          >
            {mode === "adapt" ? "Adapter avec Alma" : "Continuer"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default RepublishAlmaDialog;
