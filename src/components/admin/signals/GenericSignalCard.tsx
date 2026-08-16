import { useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { signalAdminLink, signalTypeLabel, type AdminSignalBase } from "./signalGrouping";

const SEVERITY_STYLE: Record<AdminSignalBase["severity"], string> = {
  critical: "bg-destructive/10 text-destructive border-destructive/30",
  warning: "bg-warning/10 text-warning-foreground border-warning/30",
  info: "bg-muted text-muted-foreground border-border",
};

/**
 * Carte générique des signaux sans rendu dédié : libellé français (repli
 * sur le signal_type brut si inconnu), lien vers la page admin concernée
 * et bouton "Ignorer" qui pose resolved_at sur la ligne.
 */
export const GenericSignalCard = ({ signal }: { signal: AdminSignalBase }) => {
  const qc = useQueryClient();
  const [ignoring, setIgnoring] = useState(false);
  const excerpt =
    typeof signal.metadata?.excerpt === "string" ? signal.metadata.excerpt : null;

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
    if (error) {
      toast.error("Impossible d'ignorer ce signal.");
      return;
    }
    toast.success("Signal ignoré.");
    qc.invalidateQueries({ queryKey: ["admin_dashboard_snapshot"] });
  };

  return (
    <div className="rounded-lg border p-3 space-y-2">
      <div className="flex items-start gap-3">
        <Badge
          variant="outline"
          className={cn("text-[10px] uppercase tracking-wide shrink-0", SEVERITY_STYLE[signal.severity])}
        >
          {signal.severity === "critical" ? "Critique" : "À traiter"}
        </Badge>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground">
            {signalTypeLabel(signal.signal_type)}
          </p>
          {excerpt && (
            <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
              {excerpt}
            </p>
          )}
          <p className="text-xs text-muted-foreground mt-0.5">
            {signal.entity_type} · {new Date(signal.detected_at).toLocaleString("fr-FR")}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" asChild>
          <Link to={signalAdminLink(signal)}>Ouvrir la page</Link>
        </Button>
        <Button size="sm" variant="ghost" onClick={handleIgnore} disabled={ignoring}>
          {ignoring ? "En cours..." : "Ignorer"}
        </Button>
      </div>
    </div>
  );
};
