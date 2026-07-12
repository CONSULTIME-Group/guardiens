import { useState } from "react";
import { Sparkles, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

export interface AffinityStaleSignal {
  id: string;
  signal_type: string;
  severity: "critical" | "warning" | "info";
  entity_type: string;
  entity_id: string;
  detected_at: string;
  metadata: {
    first_name?: string | null;
    email?: string | null;
    hours_since_started?: number;
  };
}

interface Props {
  signal: AffinityStaleSignal;
}

export const AffinityStaleCard = ({ signal }: Props) => {
  const qc = useQueryClient();
  const [ignoring, setIgnoring] = useState(false);
  const m = signal.metadata ?? {};
  const first = m.first_name || "Ce membre";
  const hours = m.hours_since_started ?? 0;
  const profileUrl = `https://guardiens.fr/gardiens/${signal.entity_id}`;

  const handleIgnore = async () => {
    setIgnoring(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("admin_signals")
      .update({
        resolved_at: new Date().toISOString(),
        action_taken: "dismissed",
        admin_id: user?.id ?? null,
      })
      .eq("id", signal.id);
    setIgnoring(false);
    if (error) { toast.error("Impossible d'ignorer ce signal."); return; }
    toast.success("Signal ignoré.");
    qc.invalidateQueries({ queryKey: ["admin_dashboard_snapshot"] });
  };

  return (
    <Card className="border-warning/30 bg-warning/5">
      <CardContent className="pt-4 pb-4">
        <div className="flex items-start gap-3">
          <div className="rounded-full p-2 shrink-0 bg-warning/15 text-warning-foreground">
            <Sparkles className="h-4 w-4" aria-hidden />
          </div>
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-semibold text-foreground">
                Onboarding affinité inachevé
              </h3>
              <Badge
                variant="outline"
                className="text-[10px] uppercase tracking-wide bg-warning/10 text-warning-foreground border-warning/30"
              >
                À relancer
              </Badge>
            </div>
            <div className="text-sm text-foreground">
              {first} a commencé son profil d'affinité il y a {hours} heure{hours > 1 ? "s" : ""} sans le terminer.
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              <Button size="sm" variant="ghost" asChild>
                <a href={profileUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Voir le profil
                </a>
              </Button>
              <Button size="sm" variant="ghost" onClick={handleIgnore} disabled={ignoring}>
                Ignorer
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
