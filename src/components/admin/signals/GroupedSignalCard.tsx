import { useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { ChevronDown, ChevronUp, Send } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  entityNoun,
  signalAdminLink,
  signalTypeLabel,
  SIGNAL_RELAUNCH_FN,
  type AdminSignalBase,
} from "./signalGrouping";
import { SignalPriorityBadge } from "./PriorityBadge";

interface Props {
  signalType: string;
  signals: AdminSignalBase[];
  severity: "critical" | "warning";
  renderDetail: (signal: AdminSignalBase) => ReactNode;
}

/**
 * Carte de regroupement (> 3 signaux non résolus du même type) : compteur,
 * action de masse et détail pliable. "Tout ignorer" et la relance posent
 * resolved_at sur TOUTES les lignes du groupe, pas seulement la première.
 */
export const GroupedSignalCard = ({ signalType, signals, severity, renderDetail }: Props) => {
  const qc = useQueryClient();
  const [expanded, setExpanded] = useState(false);
  const [busy, setBusy] = useState<"relaunch" | "ignore" | null>(null);

  const count = signals.length;
  const relaunchFn = SIGNAL_RELAUNCH_FN[signalType];
  const lastDetected = signals.reduce(
    (max, s) => (s.detected_at > max ? s.detected_at : max),
    signals[0]?.detected_at ?? "",
  );
  const link = signals[0] ? signalAdminLink(signals[0]) : "/admin";

  const invalidate = () =>
    qc.invalidateQueries({ queryKey: ["admin_dashboard_snapshot"] });

  const resolveAll = async (action: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    return supabase
      .from("admin_signals")
      .update({
        resolved_at: new Date().toISOString(),
        action_taken: action,
        admin_id: user?.id ?? null,
      })
      .in("id", signals.map((s) => s.id));
  };

  const handleRelaunch = async () => {
    if (!relaunchFn) return;
    setBusy("relaunch");
    try {
      const { error } = await supabase.functions.invoke(relaunchFn, { body: {} });
      if (error) throw error;
      const { error: resolveError } = await resolveAll("email_sent_manual");
      if (resolveError) throw resolveError;
      toast.success(`Relance déclenchée pour les ${count} signaux.`);
      invalidate();
    } catch (e) {
      toast.error(`Relance impossible : ${(e as Error).message}`);
    } finally {
      setBusy(null);
    }
  };

  const handleIgnoreAll = async () => {
    setBusy("ignore");
    const { error } = await resolveAll("dismissed");
    setBusy(null);
    if (error) {
      toast.error("Impossible d'ignorer ces signaux.");
      return;
    }
    toast.success(`${count} signaux ignorés.`);
    invalidate();
  };

  return (
    <div className="rounded-lg border p-3 space-y-2">
      <div className="flex items-start gap-3">
        <SignalPriorityBadge severity={severity} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground">
            {signalTypeLabel(signalType)}, {count} {entityNoun(signals)}
          </p>
          <p className="text-xs text-muted-foreground">
            Dernier repérage : {new Date(lastDetected).toLocaleString("fr-FR")}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {relaunchFn && (
          <Button size="sm" onClick={handleRelaunch} disabled={busy !== null}>
            <Send className="h-4 w-4 mr-2" aria-hidden />
            {busy === "relaunch" ? "Envoi..." : `Relancer les ${count}`}
          </Button>
        )}
        <Button size="sm" variant="outline" asChild>
          <Link to={link}>Ouvrir la page</Link>
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setExpanded((v) => !v)}>
          {expanded ? (
            <ChevronUp className="h-4 w-4 mr-2" aria-hidden />
          ) : (
            <ChevronDown className="h-4 w-4 mr-2" aria-hidden />
          )}
          {expanded ? "Masquer le détail" : "Voir le détail"}
        </Button>
        <Button size="sm" variant="ghost" onClick={handleIgnoreAll} disabled={busy !== null}>
          {busy === "ignore" ? "En cours..." : "Tout ignorer"}
        </Button>
      </div>
      {expanded && (
        <ul className="space-y-2 pt-1">
          {signals.map((s) => (
            <li key={s.id}>{renderDetail(s)}</li>
          ))}
        </ul>
      )}
    </div>
  );
};
