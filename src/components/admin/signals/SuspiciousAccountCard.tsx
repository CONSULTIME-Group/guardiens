import { useState } from "react";
import { ShieldAlert, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

export interface SuspiciousAccountSignal {
  id: string;
  signal_type: string;
  severity: "critical" | "warning" | "info";
  entity_type: string;
  entity_id: string;
  detected_at: string;
  metadata: {
    first_name?: string | null;
    email?: string | null;
    signal?: string;
    detail?: string;
  };
}

interface Props { signal: SuspiciousAccountSignal; }

export const SuspiciousAccountCard = ({ signal }: Props) => {
  const qc = useQueryClient();
  const [busy, setBusy] = useState<string | null>(null);
  const m = signal.metadata ?? {};
  const first = m.first_name || "Utilisateur";
  const email = m.email || "email inconnu";
  const detail = m.detail || "";
  const profileUrl = `/admin/users?user=${signal.entity_id}`;

  const resolve = async (action: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    return supabase.from("admin_signals").update({
      resolved_at: new Date().toISOString(),
      action_taken: action,
      admin_id: user?.id ?? null,
    }).eq("id", signal.id);
  };
  const invalidate = () => qc.invalidateQueries({ queryKey: ["admin_dashboard_snapshot"] });

  const handleSuspend = async () => {
    setBusy("suspend");
    const until = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const { error } = await supabase.from("profiles").update({ suspended_until: until }).eq("id", signal.entity_id);
    if (error) { toast.error(`Suspension impossible : ${error.message}`); setBusy(null); return; }
    await resolve("suspended_7d");
    toast.success("Compte suspendu 7 jours.");
    setBusy(null); invalidate();
  };

  const handleVerify = async () => {
    setBusy("verify");
    const { error } = await resolve("verified_ok");
    setBusy(null);
    if (error) { toast.error("Action impossible."); return; }
    toast.success("Compte marqué vérifié.");
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
    <Card className="border-destructive/30 bg-destructive/5">
      <CardContent className="pt-4 pb-4">
        <div className="flex items-start gap-3">
          <div className="rounded-full p-2 shrink-0 bg-destructive/15 text-destructive">
            <ShieldAlert className="h-4 w-4" aria-hidden />
          </div>
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-semibold text-foreground">Compte à examiner</h3>
              <Badge variant="outline" className="text-[10px] uppercase tracking-wide bg-destructive/10 text-destructive border-destructive/30">
                Critique
              </Badge>
            </div>
            <div className="text-sm text-foreground">
              {first} ({email}) : {detail}
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              <Button size="sm" variant="ghost" asChild>
                <a href={profileUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Voir le profil
                </a>
              </Button>
              <Button size="sm" variant="destructive" onClick={handleSuspend} disabled={busy !== null}>
                {busy === "suspend" ? "Suspension..." : "Suspendre 7 jours"}
              </Button>
              <Button size="sm" variant="ghost" onClick={handleVerify} disabled={busy !== null}>
                Marquer vérifié
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
