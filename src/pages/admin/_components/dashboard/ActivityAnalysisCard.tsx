import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { ErrorState, LoadingState } from "@/components/admin/ui";
import type { ActivityAnalysis } from "./useActivityAnalysis";
import { CollapsibleSection } from "./CollapsibleSection";

interface Props {
  analysis: ActivityAnalysis | null;
  loading: boolean;
  error?: boolean;
  refreshing: boolean;
  onRefresh: () => void;
  /** Rendu dans une section repliée (vue d'ensemble, lot A13). */
  collapsible?: boolean;
}

const STALE_AFTER_MS = 24 * 3600_000;

/**
 * Narratif de l'analyse IA de l'activité, avec horodatage et bandeau de
 * péremption. Les actions suggérées sont fusionnées dans la file
 * « À traiter » (SignalsSection) : cette carte ne les affiche pas.
 */
export const ActivityAnalysisCard = ({ analysis, loading, error, refreshing, onRefresh, collapsible }: Props) => {
  const valid = !!analysis && typeof analysis.analysis === "string";
  const stale = valid && Date.now() - new Date(analysis!.generated_at).getTime() > STALE_AFTER_MS;

  const body = (
    <div className="space-y-4">
      {loading ? (
        <LoadingState />
      ) : error && !valid ? (
        <ErrorState />
      ) : !valid ? (
        <p className="text-sm text-muted-foreground">
          Aucune analyse disponible. Lancez la génération pour obtenir la première.
        </p>
      ) : (
        <>
          {stale && (
            <div className="rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-warning-foreground">
              Analyse basée sur des chiffres de plus de 24 h. Régénérez pour actualiser.
            </div>
          )}
          <p className="text-sm text-foreground leading-relaxed whitespace-pre-line">{analysis!.analysis}</p>
          <p className="text-xs text-muted-foreground">
            Chiffres arrêtés au{" "}
            {new Date(analysis!.generated_at).toLocaleString("fr-FR", {
              day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
            })}
          </p>
        </>
      )}
      <Button variant="outline" size="sm" onClick={onRefresh} disabled={refreshing || loading}>
        <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} aria-hidden />
        {refreshing ? "Analyse en cours…" : valid ? "Régénérer l'analyse" : "Générer l'analyse"}
      </Button>
    </div>
  );

  if (collapsible) return <CollapsibleSection title="Analyse IA de l'activité">{body}</CollapsibleSection>;
  return (
    <section className="rounded-xl border border-border bg-card p-6 shadow-sm">
      <h2 className="mb-4 text-base font-heading font-semibold">Analyse IA de l'activité</h2>
      {body}
    </section>
  );
};
