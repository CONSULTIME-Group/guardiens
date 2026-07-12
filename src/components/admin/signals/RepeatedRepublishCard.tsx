import { useState } from "react";
import { Repeat, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

export interface RepeatedRepublishSignal {
  id: string;
  signal_type: string;
  severity: "critical" | "warning" | "info";
  entity_type: string;
  entity_id: string;
  detected_at: string;
  metadata: {
    first_name?: string | null;
    sit_title_pattern?: string;
    republish_count?: number;
  };
}

interface Props { signal: RepeatedRepublishSignal; }

export const RepeatedRepublishCard = ({ signal }: Props) => {
  const qc = useQueryClient();
  const [busy, setBusy] = useState<string | null>(null);
  const m = signal.metadata ?? {};
  const first = m.first_name || "Un propriétaire";
  const pattern = m.sit_title_pattern || "annonce";
  const count = m.republish_count ?? 0;
  const listingsUrl = `/admin/listings?owner=${signal.entity_id}`;

  const resolve = async (action: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    return supabase.from("admin_signals").update({
      resolved_at: new Date().toISOString(),
      action_taken: action,
      admin_id: user?.id ?? null,
    }).eq("id", signal.id);
  };
  const invalidate = () => qc.invalidateQueries({ queryKey: ["admin_dashboard_snapshot"] });

  const handleAdvice = async () => {
    setBusy("advice");
    const { error } = await resolve("advice_sent");
    setBusy(null);
    if (error) { toast.error("Action impossible."); return; }
    toast.success("Contact conseil noté (envoi manuel à faire).");
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
            <Repeat className="h-4 w-4" aria-hidden />
          </div>
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-semibold text-foreground">Annonce republiée sans succès</h3>
              <Badge variant="outline" className="text-[10px] uppercase tracking-wide bg-warning/10 text-warning-foreground border-warning/30">
                À traiter
              </Badge>
            </div>
            <div className="text-sm text-foreground">
              {first} a republié « {pattern}... » {count} fois en 180 jours.
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              <Button size="sm" onClick={handleAdvice} disabled={busy !== null}>
                Contacter avec conseils
              </Button>
              <Button size="sm" variant="ghost" asChild>
                <a href={listingsUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Voir annonces
                </a>
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
