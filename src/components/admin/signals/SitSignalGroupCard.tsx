import { useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  WriteToMemberDialog,
  type WriteToMemberTarget,
} from "@/pages/admin/_components/users/WriteToMemberDialog";
import { SignalPriorityBadge } from "./PriorityBadge";
import type { AdminSignalBase } from "./signalGrouping";
import {
  daysUntilStart,
  signalAction,
  sitGroupLine,
  SIT_ACTION_PRIORITY,
} from "../../../../supabase/functions/_shared/admin-signal-config.ts";

/** Lot ADM1 : échéance lisible de la garde (« commence aujourd'hui », « dans 3 jours »). */
export function startCountdown(startDate: string | null | undefined, now: number = Date.now()): string | null {
  const d = daysUntilStart(startDate, now);
  if (d === null || d < 0) return null;
  if (d === 0) return "La garde commence aujourd'hui.";
  if (d === 1) return "La garde commence demain.";
  return `La garde commence dans ${d} jours.`;
}

/** Lot ADM1 : verbe d'action de l'annonce, même règle que l'email du matin. */
export function sitGroupAction(types: string[]): string {
  const main = SIT_ACTION_PRIORITY.find((t) => types.includes(t)) ?? types[0] ?? "";
  return signalAction(main);
}

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

/** Lot ADM2 : propriétaire de l'annonce, lu dans les métadonnées du groupe. */
export function sitGroupOwner(items: AdminSignalBase[]): { userId: string; name: string } | null {
  for (const s of items) {
    const id = s.metadata?.owner_id;
    if (typeof id === "string" && id) {
      const first = s.metadata?.owner_first_name;
      return { userId: id, name: typeof first === "string" && first.trim() ? first.trim() : "le propriétaire" };
    }
  }
  return null;
}

/**
 * Lot S2 : une entrée par annonce pour les candidatures sans réponse et les
 * discussions à l'arrêt. « Marquer comme traité » résout TOUS les signaux du
 * groupe, aucune ligne n'est supprimée.
 * Lot ADM2 : « Écrire au propriétaire » envoie un vrai email (admin-personal-message)
 * et ne ferme les signaux qu'après un envoi accepté.
 */
export const SitSignalGroupCard = ({ sitId, sit, items, severity }: Props) => {
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const fallbackTitle = (items[0]?.metadata?.sit_title as string | undefined) ?? null;
  const line = sitGroupLine(
    { title: sit?.title ?? fallbackTitle, city: sit?.city, start_date: sit?.start_date },
    items.map((s) => s.signal_type),
  );

  const countdown = startCountdown(sit?.start_date);
  const owner = sitGroupOwner(items);
  const [writeTarget, setWriteTarget] = useState<WriteToMemberTarget | null>(null);

  const resolveAll = async (action: "resolved_sit_group" | "owner_written" = "resolved_sit_group") => {
    setBusy(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("admin_signals")
      .update({
        resolved_at: new Date().toISOString(),
        action_taken: action,
        admin_id: user?.id ?? null,
      })
      .in("id", items.map((s) => s.id));
    setBusy(false);
    if (error) {
      toast.error("Mise à jour impossible. Réessayez plus tard.");
      return;
    }
    if (action === "resolved_sit_group") toast.success("Annonce marquée comme traitée.");
    // La file lit ["admin_dashboard_snapshot", "open"] : le préfixe la rafraîchit.
    qc.invalidateQueries({ queryKey: ["admin_dashboard_snapshot"] });
  };

  return (
    <div className="rounded-lg border border-border bg-card p-3 space-y-2" data-testid="sit-signal-group">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <p className="text-sm font-medium text-foreground">{sitGroupAction(items.map((s) => s.signal_type))}</p>
          <p className="text-sm text-muted-foreground">{line}</p>
          {countdown && <p className="text-xs font-medium text-foreground" data-testid="sit-countdown">{countdown}</p>}
        </div>
        <SignalPriorityBadge severity={severity} />
      </div>
      <div className="flex flex-wrap gap-2">
        {owner && (
          <Button
            size="sm"
            onClick={() => setWriteTarget({ userId: owner.userId, userName: owner.name, sitId })}
            disabled={busy}
          >
            Écrire au propriétaire
          </Button>
        )}
        <Button asChild size="sm" variant="outline">
          <Link to={`/admin/listings?sit=${sitId}`}>Voir l'annonce</Link>
        </Button>
        <Button size="sm" variant="ghost" onClick={() => resolveAll()} disabled={busy}>
          Marquer comme traité
        </Button>
      </div>
      <WriteToMemberDialog
        target={writeTarget}
        onClose={() => setWriteTarget(null)}
        onSent={() => { void resolveAll("owner_written"); }}
      />
    </div>
  );
};
