import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { IgnoreSignalsButton } from "./IgnoreSignalsButton";
import { signalAdminLink, signalTypeLabel, type AdminSignalBase } from "./signalGrouping";
import { SIGNAL_ACTIONS } from "../../../../supabase/functions/_shared/admin-signal-config.ts";

/**
 * Carte générique des signaux sans rendu dédié : libellé français (repli
 * sur le signal_type brut si inconnu), lien vers la page admin concernée
 * et bouton "Ignorer" qui pose resolved_at sur la ligne.
 */
export const GenericSignalCard = ({ signal }: { signal: AdminSignalBase }) => {
  const excerpt =
    typeof signal.metadata?.excerpt === "string" ? signal.metadata.excerpt : null;


  return (
    <div className="rounded-lg border p-3 space-y-2">
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground">
            {signalTypeLabel(signal.signal_type)}
          </p>
          {SIGNAL_ACTIONS[signal.signal_type] && (
            <p className="text-sm text-foreground mt-0.5">{SIGNAL_ACTIONS[signal.signal_type]}</p>
          )}
          {excerpt && (
            <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
              {excerpt}
            </p>
          )}
          <p className="text-xs text-muted-foreground mt-0.5">
            Repéré le {new Date(signal.detected_at).toLocaleString("fr-FR", { dateStyle: "long", timeStyle: "short" })}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" asChild>
          <Link to={signalAdminLink(signal)}>Ouvrir la page</Link>
        </Button>
        <IgnoreSignalsButton ids={[signal.id]} />
      </div>
    </div>
  );
};
