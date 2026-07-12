import { useState } from "react";
import { CalendarX, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

export interface RepeatedCancellationsSignal {
  id: string;
  signal_type: string;
  severity: "critical" | "warning" | "info";
  entity_type: string;
  entity_id: string;
  detected_at: string;
  metadata: {
    first_name?: string | null;
    role?: string;
    cancellations_count?: number;
    period_days?: number;
  };
}

interface Props { signal: RepeatedCancellationsSignal; }

export const RepeatedCancellationsCard = ({ signal }: Props) => {
  const qc = useQueryClient();
  const [busy, setBusy] = useState<string | null>(null);
  const m = signal.metadata ?? {};
  const first = m.first_name || "Utilisateur";
  const role = m.role === "gardien" ? "gardien" : m.role === "proprio" ? "propriétaire" : "utilisateur";
  const count = m.cancellations_count ?? 0;
  const period = m.period_days ?? 90;
  const historyUrl = `/admin/users?user=${signal.entity_id}`;

  const resolve = async (action: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    return supabase.from("admin_signals").update({
      resolved_at: new Date().toISOString(),
      action_taken: action,
      admin_id: user?.id ?? null,
    }).eq("id", signal.id);
  };
  const invalidate = () => qc.invalidateQueries({ queryKey: ["admin_dashboard_snapshot"] });

  const handleWarn = async () => {
    setBusy("warn");
    const { error } = await resolve("warning_sent");
    setBusy(null);
    if (error) { toast.error("Action impossible."); return; }
    toast.success("Avertissement noté (envoi manuel à faire).");
    invalidate();
  };

  const handleIgnore = async () => {
    setBusy("ignore");
    const { error } = await resolve("dismissed");
    setBusy(null);
    if (error) { toast.error("Impossible d'ignorer."); return; }
    toast.success("Signal ignoré.");
    invalidate();
  };

  return (
    <Card className="border-warning/30 bg-warning/5">
      <CardContent className="pt-4 pb-4">
        <div className="flex items-start gap-3">
          <div className="rounded-full p-2 shrink-0 bg-warning/15 text-warning-foreground">
            <CalendarX className="h-4 w-4" aria-hidden />
          </div>
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-semibold text-foreground">Annulations répétées</h3>
              <Badge variant="outline" className="text-[10px] uppercase tracking-wide bg-warning/10 text-warning-foreground border-warning/30">
                À traiter
              </Badge>
            </div>
            <div className="text-sm text-foreground">
              {first} ({role}) a annulé {count} gardes en {period} jours.
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              <Button size="sm" variant="ghost" asChild>
                <a href={historyUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Voir historique
                </a>
              </Button>
              <Button size="sm" onClick={handleWarn} disabled={busy !== null}>
                Envoyer avertissement
              </Button>
              <Button size="sm" variant="ghost" onClick={handleIgnore} disabled={busy !== null}>
                Ignorer
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
