import { useState } from "react";
import { AlertTriangle, Send } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { BroadcastSitDialog } from "./BroadcastSitDialog";

export interface AdminSignal {
  id: string;
  signal_type: string;
  severity: "critical" | "warning" | "info";
  entity_type: string;
  entity_id: string;
  detected_at: string;
  metadata: {
    sit_title?: string;
    sit_city?: string | null;
    days_since_published?: number;
    eligible_sitters_count?: number;
    eligible_radius_km?: number;
    owner_id?: string;
  };
}

interface Props {
  signal: AdminSignal;
}

export const NoApplicationsCard = ({ signal }: Props) => {
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [ignoring, setIgnoring] = useState(false);

  const m = signal.metadata ?? {};
  const eligible = m.eligible_sitters_count ?? 0;
  const canBroadcast = eligible > 0;

  const invalidate = () =>
    qc.invalidateQueries({ queryKey: ["admin_dashboard_snapshot"] });

  const handleIgnore = async () => {
    setIgnoring(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("admin_signals")
      .update({
        resolved_at: new Date().toISOString(),
        action_taken: "dismissed",
        admin_id: user?.id ?? null,
      })
      .eq("id", signal.id);
    setIgnoring(false);
    if (error) {
      toast.error("Impossible d'ignorer ce signal.");
      return;
    }
    toast.success("Signal ignoré.");
    invalidate();
  };

  return (
    <>
      <Card className="border-warning/30 bg-warning/5">
        <CardContent className="pt-4 pb-4">
          <div className="flex items-start gap-3">
            <div className="rounded-full bg-warning/15 p-2 shrink-0">
              <AlertTriangle className="h-4 w-4 text-warning-foreground" aria-hidden />
            </div>
            <div className="flex-1 min-w-0 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm font-semibold text-foreground">
                  Annonce sans candidature
                </h3>
                <Badge variant="outline" className="text-[10px] uppercase tracking-wide bg-warning/10 text-warning-foreground border-warning/30">
                  À traiter
                </Badge>
              </div>
              <div className="text-sm text-foreground">
                « {m.sit_title ?? "Annonce"} »
                {m.sit_city ? <> à {m.sit_city}</> : null}
              </div>
              <p className="text-xs text-muted-foreground">
                Publiée il y a {m.days_since_published ?? "?"} jours
                {canBroadcast ? (
                  <>
                    {" · "}
                    {eligible} gardien{eligible > 1 ? "s" : ""} éligible
                    {eligible > 1 ? "s" : ""} dans un rayon de{" "}
                    {m.eligible_radius_km ?? 30} km
                  </>
                ) : (
                  <> · aucun gardien éligible à proximité</>
                )}
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                <Button
                  size="sm"
                  onClick={() => setDialogOpen(true)}
                  disabled={!canBroadcast}
                >
                  <Send className="h-4 w-4 mr-2" />
                  Broadcast aux gardiens
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleIgnore}
                  disabled={ignoring}
                >
                  Ignorer
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <BroadcastSitDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        signal={signal}
        onSent={invalidate}
      />
    </>
  );
};
