import { useState } from "react";
import { MapPin, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SignalPriorityBadge } from "./PriorityBadge";
import { supabase } from "@/integrations/supabase/client";
import {
  buildCoverageGapMessage,
  buildSeoTensionMessage,
} from "@/lib/admin/cityCoverage";

export interface CityCoverageSignal {
  id: string;
  signal_type: string;
  severity: "critical" | "warning" | "info";
  entity_type: string;
  entity_id: string;
  detected_at: string;
  metadata: {
    city?: string;
    slug?: string;
    radius_km?: number;
    local_sitters_count?: number;
    verified_sitters_count?: number;
    active_sits_count?: number;
    gsc_impressions?: number;
    gsc_clicks?: number;
    tension_ratio?: number;
  };
}

interface Props { signal: CityCoverageSignal; }

export const CityCoverageCard = ({ signal }: Props) => {
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const m = signal.metadata ?? {};
  const city = m.city ?? "Ville inconnue";
  const metrics = {
    city,
    sittersCount: m.local_sitters_count ?? 0,
    verifiedSittersCount: m.verified_sitters_count ?? 0,
    radiusKm: m.radius_km ?? 30,
    activeSitsCount: m.active_sits_count ?? 0,
  };
  const isTension = signal.signal_type === "city_seo_tension";
  const title = isTension
    ? `Tension SEO, ${city}`
    : `Trou de couverture, ${city}`;
  const message = isTension
    ? buildSeoTensionMessage({
        ...metrics,
        impressions: m.gsc_impressions ?? 0,
        ratio: m.tension_ratio ?? 0,
      })
    : buildCoverageGapMessage(metrics);
  const gscUrl = `https://search.google.com/search-console?resource_id=sc-domain%3Aguardiens.fr&query=${encodeURIComponent(city)}`;

  const handleIgnore = async () => {
    setBusy(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("admin_signals").update({
      resolved_at: new Date().toISOString(),
      action_taken: "dismissed",
      admin_id: user?.id ?? null,
    }).eq("id", signal.id);
    setBusy(false);
    if (error) { toast.error("Impossible d'ignorer ce signal."); return; }
    toast.success("Signal ignoré.");
    qc.invalidateQueries({ queryKey: ["admin_dashboard_snapshot"] });
  };

  return (
    <Card className="border-warning/30 bg-warning/5">
      <CardContent className="pt-4 pb-4">
        <div className="flex items-start gap-3">
          <div className="rounded-full p-2 shrink-0 bg-warning/15 text-warning-foreground">
            <MapPin className="h-4 w-4" aria-hidden />
          </div>
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-semibold text-foreground">{title}</h3>
              <SignalPriorityBadge severity={signal.severity} />
            </div>
            <div className="text-sm text-foreground">{message}</div>
            <div className="flex flex-wrap gap-2 pt-1">
              <Button size="sm" variant="ghost" asChild>
                <a href={gscUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Voir GSC
                </a>
              </Button>
              <Button size="sm" variant="ghost" onClick={handleIgnore} disabled={busy}>
                Ignorer
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
