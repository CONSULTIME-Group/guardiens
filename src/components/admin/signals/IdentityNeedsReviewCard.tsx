import { useState } from "react";
import { ScanFace, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SignalPriorityBadge } from "./PriorityBadge";
import { supabase } from "@/integrations/supabase/client";

export interface IdentityNeedsReviewSignal {
  id: string;
  signal_type: string;
  severity: "critical" | "warning" | "info";
  entity_type: string;
  entity_id: string;
  detected_at: string;
  metadata: {
    confidence?: number;
    document_type?: string | null;
    red_flags?: string[];
  };
}

interface Props {
  signal: IdentityNeedsReviewSignal;
}

export const IdentityNeedsReviewCard = ({ signal }: Props) => {
  const qc = useQueryClient();
  const [ignoring, setIgnoring] = useState(false);
  const m = signal.metadata ?? {};
  const confidence = typeof m.confidence === "number" ? Math.round(m.confidence * 100) : null;
  const openUrl = `/admin/verifications?id=${signal.entity_id}`;

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
            <ScanFace className="h-4 w-4" aria-hidden />
          </div>
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-semibold text-foreground">
                Dossier d'identité en attente de décision humaine
              </h3>
              <SignalPriorityBadge severity={signal.severity} />
            </div>
            <p className="text-sm text-foreground">
              Le contrôle automatique n'a pas tranché{confidence !== null ? ` (indice de confiance ${confidence} pour cent)` : ""}. Une décision de l'équipe est attendue sous 24 heures, délai annoncé au membre.
            </p>
            {Array.isArray(m.red_flags) && m.red_flags.length > 0 && (
              <p className="text-xs text-muted-foreground line-clamp-2">
                Points relevés : {m.red_flags.join(" ; ")}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              Détecté le {new Date(signal.detected_at).toLocaleString("fr-FR")}
            </p>
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
