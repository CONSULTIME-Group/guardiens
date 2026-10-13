/**
 * Bloc affiché dans l'onglet "Candidatures" du propriétaire, annonce publiée.
 *
 * Lot Y1 (décision du fondateur du 13/10/2026) : une annonce au plafond reste
 * publiée, ouverte et visible ; seules les nouvelles candidatures sont
 * refusées côté serveur. Deux cas :
 * - mode "full" : plafond atteint, le propriétaire relève le nombre de
 *   candidatures souhaitées (seule écriture : max_applications) ;
 * - mode "closed" : le propriétaire a fermé lui-même les candidatures
 *   (accepting_applications à false), il les rouvre et peut relever le plafond.
 *
 * Extrait de OwnerSitView pour clarifier le composant principal.
 */
import { useState } from "react";
import { Plus, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { MAX_MAX_APPLICATIONS } from "@/lib/applicationCap";
import type { SitData } from "./types";

interface ReopenApplicationsCardProps {
  sit: SitData;
  setSit: (sit: SitData) => void;
  internalAppCount: number;
  mode: "full" | "closed";
}

const ReopenApplicationsCard = ({
  sit,
  setSit,
  internalAppCount,
  mode,
}: ReopenApplicationsCardProps) => {
  const { toast } = useToast();
  const [extraCount, setExtraCount] = useState(3);
  const [saving, setSaving] = useState(false);

  const base = Math.max(sit.max_applications || 0, internalAppCount);
  const newMax = Math.min(MAX_MAX_APPLICATIONS, base + extraCount);

  const title = mode === "full" ? "Candidatures complètes" : "Candidatures closes";
  const description =
    mode === "full"
      ? `Votre annonce a reçu les ${sit.max_applications} candidature${(sit.max_applications || 0) > 1 ? "s" : ""} prévue${(sit.max_applications || 0) > 1 ? "s" : ""}. Elle reste visible, et vous pouvez en accueillir davantage.`
      : "Vous avez fermé les candidatures. Vous pouvez les rouvrir à tout moment.";

  const submit = async () => {
    setSaving(true);
    // Mode "full" : seule la valeur du plafond change. Mode "closed" : le
    // propriétaire rouvre aussi son annonce, c'est son choix explicite.
    const patch: Partial<SitData> =
      mode === "full" ? { max_applications: newMax } : { accepting_applications: true };
    const { error } = await supabase.from("sits").update(patch as any).eq("id", sit.id);
    setSaving(false);
    if (error) {
      toast({ variant: "destructive", title: "La modification n'a pas pu être enregistrée, réessayez." });
      return;
    }
    setSit({ ...sit, ...patch });
    toast(
      mode === "full"
        ? { title: "Nombre de candidatures relevé", description: `Votre annonce peut recevoir jusqu'à ${newMax} candidatures.` }
        : { title: "Candidatures rouvertes", description: "Votre annonce accueille de nouveau des candidatures." },
    );
  };

  return (
    <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-3" data-testid={`owner-applications-${mode}`}>
      <div>
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        {mode === "full" && (
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => setExtraCount((c) => Math.max(1, c - 1))}
            disabled={extraCount <= 1}
            aria-label="Diminuer"
          >
            <Minus className="h-3.5 w-3.5" />
          </Button>
          <span className="w-8 text-center text-sm font-medium" aria-live="polite">
            {extraCount}
          </span>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => setExtraCount((c) => Math.min(20, c + 1))}
            disabled={extraCount >= 20}
            aria-label="Augmenter"
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>
        )}
        <Button size="sm" disabled={saving} onClick={submit}>
          {mode === "full"
            ? `Accueillir ${extraCount} candidature${extraCount > 1 ? "s" : ""} de plus`
            : "Rouvrir les candidatures"}
        </Button>
      </div>
    </div>
  );
};

export default ReopenApplicationsCard;
