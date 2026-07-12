import { useState } from "react";
import { UserMinus, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

export interface DormantSitterSignal {
  id: string;
  signal_type: string;
  severity: "critical" | "warning" | "info";
  entity_type: string;
  entity_id: string;
  detected_at: string;
  metadata: {
    nature?: string;
    first_name?: string | null;
    email?: string | null;
    days_since_signup?: number;
    profile_completion?: number | null;
  };
}

interface Props {
  signal: DormantSitterSignal;
}

export const DormantSitterCard = ({ signal }: Props) => {
  const qc = useQueryClient();
  const [ignoring, setIgnoring] = useState(false);
  const [relaunching, setRelaunching] = useState(false);

  const m = signal.metadata ?? {};
  const first = m.first_name || "Ce gardien";
  const days = m.days_since_signup ?? 0;
  const completion = m.profile_completion ?? 0;
  const profileUrl = `https://guardiens.fr/gardiens/${signal.entity_id}`;

  const invalidate = () =>
    qc.invalidateQueries({ queryKey: ["admin_dashboard_snapshot"] });

  const resolve = async (action: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    return supabase
      .from("admin_signals")
      .update({
        resolved_at: new Date().toISOString(),
        action_taken: action,
        admin_id: user?.id ?? null,
      })
      .eq("id", signal.id);
  };

  const handleRelaunch = async () => {
    setRelaunching(true);
    try {
      const { error } = await supabase.functions.invoke("nudge-sitter-dormant", {
        body: {},
      });
      if (error) throw error;
      await resolve("email_sent_manual");
      toast.success("Relance déclenchée.");
      invalidate();
    } catch (e) {
      toast.error(`Relance impossible : ${(e as Error).message}`);
    } finally {
      setRelaunching(false);
    }
  };

  const handleIgnore = async () => {
    setIgnoring(true);
    const { error } = await resolve("dismissed");
    setIgnoring(false);
    if (error) { toast.error("Impossible d'ignorer ce signal."); return; }
    toast.success("Signal ignoré.");
    invalidate();
  };

  return (
    <Card className="border-warning/30 bg-warning/5">
      <CardContent className="pt-4 pb-4">
        <div className="flex items-start gap-3">
          <div className="rounded-full p-2 shrink-0 bg-warning/15 text-warning-foreground">
            <UserMinus className="h-4 w-4" aria-hidden />
          </div>
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-semibold text-foreground">Gardien dormant</h3>
              <Badge
                variant="outline"
                className="text-[10px] uppercase tracking-wide bg-warning/10 text-warning-foreground border-warning/30"
              >
                À réactiver
              </Badge>
            </div>
            <div className="text-sm text-foreground">
              {first}, inscrit il y a {days} jour{days > 1 ? "s" : ""}, profil {completion} %,
              aucune candidature envoyée.
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              <Button size="sm" onClick={handleRelaunch} disabled={relaunching}>
                {relaunching ? "Envoi..." : "Relancer par email"}
              </Button>
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
