import { useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { SignalPriorityBadge } from "./PriorityBadge";
import type { AdminSignalBase } from "./signalGrouping";
import { sitGroupLine } from "../../../../supabase/functions/_shared/admin-signal-config.ts";

export interface SitInfo {
  id: string;
  title: string | null;
  city: string | null;
  start_date: string | null;
}

interface Props {
  sitId: string;
  sit?: SitInfo;
  items: AdminSignalBase[];
  severity: "critical" | "warning";
}

/**
 * Lot S2 : une entrée par annonce pour les candidatures sans réponse et les
 * discussions à l'arrêt. « Marquer comme traité » résout TOUS les signaux du
 * groupe, aucune ligne n'est supprimée.
 */
export const SitSignalGroupCard = ({ sitId, sit, items, severity }: Props) => {
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const fallbackTitle = (items[0]?.metadata?.sit_title as string | undefined) ?? null;
  const line = sitGroupLine(
    { title: sit?.title ?? fallbackTitle, city: sit?.city, start_date: sit?.start_date },
    items.map((s) => s.signal_type),
  );

  const resolveAll = async () => {
    setBusy(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("admin_signals")
      .update({
        resolved_at: new Date().toISOString(),
        action_taken: "resolved_sit_group",
        admin_id: user?.id ?? null,
      })
      .in("id", items.map((s) => s.id));
    setBusy(false);
    if (error) {
      toast.error("Mise à jour impossible. Réessayez plus tard.");
      return;
    }
    toast.success("Annonce marquée comme traitée.");
    qc.invalidateQueries({ queryKey: ["admin_open_signals"] });
    qc.invalidateQueries({ queryKey: ["admin_dashboard_snapshot"] });
  };

  return (
    <div className="rounded-lg border border-border bg-card p-3 space-y-2" data-testid="sit-signal-group">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm text-foreground">{line}</p>
        <SignalPriorityBadge severity={severity} />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button asChild size="sm" variant="outline">
          <Link to={`/annonces/${sitId}`}>Voir l'annonce</Link>
        </Button>
        <Button size="sm" variant="ghost" onClick={resolveAll} disabled={busy}>
          Marquer comme traité
        </Button>
      </div>
    </div>
  );
};
