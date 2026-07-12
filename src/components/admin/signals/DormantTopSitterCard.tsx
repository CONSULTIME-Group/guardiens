import { useState } from "react";
import { Star, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

export interface DormantTopSitterSignal {
  id: string;
  signal_type: string;
  severity: "critical" | "warning" | "info";
  entity_type: string;
  entity_id: string;
  detected_at: string;
  metadata: {
    first_name?: string | null;
    avg_rating?: number;
    reviews_count?: number;
    days_since_last_application?: number;
  };
}

interface Props { signal: DormantTopSitterSignal; }

export const DormantTopSitterCard = ({ signal }: Props) => {
  const qc = useQueryClient();
  const [busy, setBusy] = useState<string | null>(null);
  const m = signal.metadata ?? {};
  const first = m.first_name || "Ce gardien";
  const rating = m.avg_rating ?? 0;
  const reviews = m.reviews_count ?? 0;
  const days = m.days_since_last_application ?? 0;
  const profileUrl = `https://guardiens.fr/gardiens/${signal.entity_id}`;

  const resolve = async (action: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    return supabase.from("admin_signals").update({
      resolved_at: new Date().toISOString(),
      action_taken: action,
      admin_id: user?.id ?? null,
    }).eq("id", signal.id);
  };

  const invalidate = () => qc.invalidateQueries({ queryKey: ["admin_dashboard_snapshot"] });

  const handleBoost = async () => {
    setBusy("boost");
    const boostedUntil = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const { error } = await supabase.from("profiles").update({ boosted_until: boostedUntil }).eq("id", signal.entity_id);
    if (error) { toast.error(`Boost impossible : ${error.message}`); setBusy(null); return; }
    await resolve("boosted_7d");
    toast.success("Profil boosté 7 jours.");
    setBusy(null);
    invalidate();
  };

  const handleIgnore = async () => {
    setBusy("ignore");
    const { error } = await resolve("dismissed");
    setBusy(null);
    if (error) { toast.error("Impossible d'ignorer ce signal."); return; }
    toast.success("Signal ignoré.");
    invalidate();
  };

  return (
    <Card className="border-warning/30 bg-warning/5">
      <CardContent className="pt-4 pb-4">
        <div className="flex items-start gap-3">
          <div className="rounded-full p-2 shrink-0 bg-warning/15 text-warning-foreground">
            <Star className="h-4 w-4" aria-hidden />
          </div>
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-semibold text-foreground">Top gardien dormant</h3>
              <Badge variant="outline" className="text-[10px] uppercase tracking-wide bg-warning/10 text-warning-foreground border-warning/30">
                À réactiver
              </Badge>
            </div>
            <div className="text-sm text-foreground">
              {first} (note {rating}/5, {reviews} avis) n'a pas candidaté depuis {days} jours.
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              <Button size="sm" onClick={handleBoost} disabled={busy !== null}>
                {busy === "boost" ? "Boost..." : "Booster 7 jours"}
              </Button>
              <Button size="sm" variant="ghost" asChild>
                <a href={profileUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Contacter
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
