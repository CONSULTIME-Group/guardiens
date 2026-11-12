import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  HOUSING_HELP_TEXT,
  HOUSING_TYPE_CHOICES,
  buildInlineHousingInsert,
  type HousingTypeValue,
} from "@/lib/sitCreateEntry";
import type { InlineHousingResult } from "@/components/sits/create/InlineHousingBlock";

interface Props {
  userId: string;
  /** Message affiché quand un clic (Enregistrer, Suivant, Publier) renvoie ici. */
  notice?: string | null;
  onSaved: (property: InlineHousingResult) => void;
}

/**
 * Lot ENT1 : le logement se crée en un geste dans le formulaire d'annonce,
 * avec le type seul (comme l'écran P1 de l'arrivée). La description se
 * complète ensuite depuis le profil.
 */
const InlineHousingTypeChoice = ({ userId, notice, onSaved }: Props) => {
  const [saving, setSaving] = useState<HousingTypeValue | null>(null);
  // Verrou synchrone : un double clic rapide ne crée qu'un logement.
  const lockRef = useRef(false);

  const choose = async (type: HousingTypeValue) => {
    if (lockRef.current) return;
    lockRef.current = true;
    setSaving(type);
    try {
      const { data, error } = await supabase
        .from("properties")
        .insert(buildInlineHousingInsert(userId, type) as never)
        .select("id, type, environment, rooms_count, bedrooms_count")
        .single();
      if (error) throw error;
      onSaved(data as InlineHousingResult);
    } catch (e) {
      console.error("[InlineHousingTypeChoice] save failed", e);
      lockRef.current = false;
      setSaving(null);
      toast.error("Enregistrement impossible", {
        description: "Réessayez dans un instant, votre saisie est conservée.",
      });
    }
  };

  return (
    <div
      id="sit-housing-field"
      data-testid="sit-housing-field"
      className={cn(
        "scroll-mt-24 rounded-xl border p-4",
        notice ? "border-destructive bg-destructive/5" : "border-input bg-card",
      )}
    >
      <p id="sit-housing-label" className="text-sm font-medium text-foreground">Votre logement</p>
      <p className="text-xs text-muted-foreground mt-0.5 mb-3">{HOUSING_HELP_TEXT}</p>
      <div role="group" aria-labelledby="sit-housing-label" className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {HOUSING_TYPE_CHOICES.map((c) => (
          <button
            key={c.value}
            type="button"
            disabled={saving !== null}
            onClick={() => void choose(c.value)}
            className={cn(
              "min-h-[44px] rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
              saving === c.value
                ? "border-primary bg-primary/10 ring-2 ring-primary/30"
                : "border-input bg-background hover:bg-accent/40",
              saving !== null && saving !== c.value && "opacity-60",
            )}
          >
            {saving === c.value ? "Enregistrement…" : c.label}
          </button>
        ))}
      </div>
      {notice && (
        <p role="alert" className="mt-3 text-sm font-medium text-destructive">{notice}</p>
      )}
    </div>
  );
};

export default InlineHousingTypeChoice;
