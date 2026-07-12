import { useState } from "react";
import { ShieldAlert, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

export interface StaleVerificationSignal {
  id: string;
  signal_type: string;
  severity: "critical" | "warning" | "info";
  entity_type: string;
  entity_id: string;
  detected_at: string;
  metadata: {
    first_name?: string | null;
    email?: string | null;
    days_since_request?: number;
  };
}

interface Props {
  signal: StaleVerificationSignal;
}

export const StaleVerificationCard = ({ signal }: Props) => {
  const qc = useQueryClient();
  const [ignoring, setIgnoring] = useState(false);
  const m = signal.metadata ?? {};
  const isCritical = signal.severity === "critical";
  const first = m.first_name || "Ce membre";
  const days = m.days_since_request ?? 0;
  const openUrl = `/admin/verifications?id=${signal.entity_id}`;

  const tone = isCritical
    ? "border-destructive/30 bg-destructive/5"
    : "border-warning/30 bg-warning/5";
  const iconTone = isCritical
    ? "bg-destructive/15 text-destructive"
    : "bg-warning/15 text-warning-foreground";
  const badgeTone = isCritical
    ? "bg-destructive/10 text-destructive border-destructive/30"
    : "bg-warning/10 text-warning-foreground border-warning/30";

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
    <Card className={tone}>
      <CardContent className="pt-4 pb-4">
        <div className="flex items-start gap-3">
          <div className={`rounded-full p-2 shrink-0 ${iconTone}`}>
            <ShieldAlert className="h-4 w-4" aria-hidden />
          </div>
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-semibold text-foreground">
                Vérification d'identité en attente
              </h3>
              <Badge variant="outline" className={`text-[10px] uppercase tracking-wide ${badgeTone}`}>
                {isCritical ? "Critique" : "À traiter"}
              </Badge>
            </div>
            <div className="text-sm text-foreground">
              {first} attend depuis {days} jour{days > 1 ? "s" : ""}.
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              <Button size="sm" asChild>
                <a href={openUrl}>
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Ouvrir la vérification
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
