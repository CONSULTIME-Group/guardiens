import { useState } from "react";
import { MapPin, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

export interface UntappedCitySignal {
  id: string;
  signal_type: string;
  severity: "critical" | "warning" | "info";
  entity_type: string;
  entity_id: string;
  detected_at: string;
  metadata: {
    city?: string;
    gsc_impressions?: number;
    gsc_clicks?: number;
    local_sitters_count?: number;
    active_sits_count?: number;
  };
}

interface Props { signal: UntappedCitySignal; }

export const UntappedCityCard = ({ signal }: Props) => {
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const m = signal.metadata ?? {};
  const city = m.city ?? "Ville inconnue";
  const impressions = m.gsc_impressions ?? 0;
  const sitters = m.local_sitters_count ?? 0;
  const gscUrl = `https://search.google.com/search-console?resource_id=sc-domain%3Aguardiens.fr&query=${encodeURIComponent(city)}`;

  const resolve = async (action: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    return supabase.from("admin_signals").update({
      resolved_at: new Date().toISOString(),
      action_taken: action,
      admin_id: user?.id ?? null,
    }).eq("id", signal.id);
  };

  const handleIgnore = async () => {
    setBusy(true);
    const { error } = await resolve("dismissed");
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
              <h3 className="text-sm font-semibold text-foreground">Opportunité de recrutement, {city}</h3>
              <Badge variant="outline" className="text-[10px] uppercase tracking-wide bg-warning/10 text-warning-foreground border-warning/30">
                À traiter
              </Badge>
            </div>
            <div className="text-sm text-foreground">
              {city} génère {impressions} impressions Google mais compte seulement {sitters} gardien{sitters > 1 ? "s" : ""}. Cibler la ville en recrutement.
            </div>
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
