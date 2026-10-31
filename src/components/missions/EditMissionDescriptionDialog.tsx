import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { trackEvent } from "@/lib/analytics";
import { logger } from "@/lib/logger";
import { moneyWordingSignals } from "@/lib/missionContentGuards";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";

export const MISSION_DESC_MIN = 60;
export const MISSION_DESC_MAX = 2000;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mission: { id: string; user_id: string; title?: string | null; description?: string | null };
  onSaved: (patch: { description: string }) => void;
}

/** Message d'erreur de longueur, formulé de façon positive ; null quand le texte convient. */
export function descriptionLengthMessage(value: string): string | null {
  const n = value.trim().length;
  if (n < MISSION_DESC_MIN) return `Quelques mots de plus : ${MISSION_DESC_MIN} caractères au minimum (il en reste ${MISSION_DESC_MIN - n}).`;
  if (n > MISSION_DESC_MAX) return `Un texte plus court : ${MISSION_DESC_MAX} caractères au maximum.`;
  return null;
}

/**
 * Lot UX-V1 : l'auteur corrige la description de son besoin publié.
 * Le titre reste inchangé : le trigger de slug le régénère sinon et l'adresse
 * partagée changerait. Écriture directe sur sa ligne (politique « Users can
 * update own missions »), comme RescheduleMissionDialog.
 */
const EditMissionDescriptionDialog = ({ open, onOpenChange, mission, onSaved }: Props) => {
  const { toast } = useToast();
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setValue(mission.description ?? "");
  }, [open, mission.description]);

  const lengthError = descriptionLengthMessage(value);
  const moneyNote = moneyWordingSignals(mission.title, value) !== null;

  const handleSave = async () => {
    if (saving || lengthError) return;
    const description = value.trim();
    setSaving(true);
    try {
      const { data, error } = await supabase
        .from("small_missions")
        .update({ description })
        .eq("id", mission.id)
        .eq("user_id", mission.user_id)
        .select("id")
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error("La description n'a pas pu être enregistrée.");
      void trackEvent("mission_description_edited", { metadata: { mission_id: mission.id } });
      onSaved({ description });
      onOpenChange(false);
      toast({ title: "Description enregistrée", description: "Votre besoin affiche le nouveau texte." });
    } catch (err: any) {
      logger.error("[EditMissionDescriptionDialog]", { err: String(err?.message || err) });
      toast({
        variant: "destructive",
        title: "Description non enregistrée",
        description: err?.message || "Réessayez dans un instant.",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Modifier la description</DialogTitle>
          <DialogDescription>
            Le titre et l'adresse de votre besoin restent identiques, seul le texte change.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Label htmlFor="edit-mission-description">Description</Label>
          <Textarea
            id="edit-mission-description"
            rows={8}
            value={value}
            maxLength={MISSION_DESC_MAX}
            onChange={(e) => setValue(e.target.value)}
            aria-invalid={Boolean(lengthError)}
            aria-describedby={lengthError ? "edit-mission-description-error" : undefined}
          />
          {lengthError && (
            <p id="edit-mission-description-error" role="alert" className="text-sm text-destructive">{lengthError}</p>
          )}
          {moneyNote && (
            <p role="note" className="text-xs text-muted-foreground">
              L'entraide s'échange en services et en attentions : proposez plutôt un coup de main en retour. C'est une simple relecture, vous restez libre d'enregistrer.
            </p>
          )}
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Garder le texte actuel
          </Button>
          <Button onClick={() => void handleSave()} disabled={saving || Boolean(lengthError)}>
            {saving ? "Enregistrement" : "Enregistrer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EditMissionDescriptionDialog;
