/**
 * Bloc affiché dans l'onglet "Candidatures" du propriétaire quand
 * `accepting_applications` est false (max atteint ou fermeture manuelle).
 *
 * Permet de rouvrir N candidatures supplémentaires (1–20) en un seul clic
 * et de mettre à jour `max_applications` en conséquence.
 *
 * Extrait de OwnerSitView pour clarifier le composant principal.
 */
import { useState } from "react";
import { Plus, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { SitData } from "./types";

interface ReopenApplicationsCardProps {
  sit: SitData;
  setSit: (sit: SitData) => void;
  internalAppCount: number;
}

const ReopenApplicationsCard = ({
  sit,
  setSit,
  internalAppCount,
}: ReopenApplicationsCardProps) => {
  const { toast } = useToast();
  const [reopenCount, setReopenCount] = useState(3);

  return (
    <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-3">
      <div>
        <p className="text-sm font-semibold text-foreground">Candidatures closes</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {sit.max_applications
            ? `Le maximum de ${sit.max_applications} candidature${sit.max_applications > 1 ? "s" : ""} a été atteint.`
            : "Vous avez fermé les candidatures."}
        </p>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => setReopenCount((c) => Math.max(1, c - 1))}
            disabled={reopenCount <= 1}
            aria-label="Diminuer"
          >
            <Minus className="h-3.5 w-3.5" />
          </Button>
          <span className="w-8 text-center text-sm font-medium" aria-live="polite">
            {reopenCount}
          </span>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => setReopenCount((c) => Math.min(20, c + 1))}
            disabled={reopenCount >= 20}
            aria-label="Augmenter"
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>
        <Button
          size="sm"
          onClick={async () => {
            const newMax = (sit.max_applications || internalAppCount) + reopenCount;
            await supabase
              .from("sits")
              .update({
                accepting_applications: true,
                max_applications: newMax,
              } as any)
              .eq("id", sit.id);
            setSit({
              ...sit,
              accepting_applications: true,
              max_applications: newMax,
            });
            toast({
              title: "Candidatures rouvertes",
              description: `${reopenCount} place${reopenCount > 1 ? "s" : ""} supplémentaire${reopenCount > 1 ? "s" : ""} ouverte${reopenCount > 1 ? "s" : ""}.`,
            });
          }}
        >
          Ouvrir {reopenCount} candidature{reopenCount > 1 ? "s" : ""} de plus
        </Button>
      </div>
    </div>
  );
};

export default ReopenApplicationsCard;
