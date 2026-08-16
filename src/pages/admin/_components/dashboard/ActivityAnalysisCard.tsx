import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { RefreshCw, Sparkles } from "lucide-react";
import type { ActivityAnalysis } from "./useActivityAnalysis";

interface Props {
  analysis: ActivityAnalysis | null;
  loading: boolean;
  refreshing: boolean;
  onRefresh: () => void;
}

const STALE_AFTER_MS = 24 * 3600_000;

/**
 * Narratif de l'analyse IA de l'activité, avec horodatage et bandeau de
 * péremption. Les actions suggérées sont fusionnées dans la file
 * "À traiter" (SignalsSection) : cette carte ne les affiche plus.
 */
export const ActivityAnalysisCard = ({ analysis, loading, refreshing, onRefresh }: Props) => {
  const stale =
    analysis !== null &&
    Date.now() - new Date(analysis.generated_at).getTime() > STALE_AFTER_MS;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
        <CardTitle className="text-base font-heading flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-muted-foreground" aria-hidden />
          Analyse IA de l'activité
        </CardTitle>
        <Button variant="outline" size="sm" onClick={onRefresh} disabled={refreshing || loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} aria-hidden />
          {refreshing ? "Analyse..." : "Rafraîchir"}
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-4/6" />
          </div>
        ) : !analysis ? (
          <p className="text-sm text-muted-foreground">
            Aucune analyse disponible. Lancez un rafraîchissement pour générer la première.
          </p>
        ) : (
          <>
            {stale && (
              <div className="rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-warning-foreground">
                Analyse basée sur des chiffres de plus de 24 h. Rafraîchir pour actualiser.
              </div>
            )}
            <p className="text-sm text-foreground leading-relaxed whitespace-pre-line">
              {analysis.analysis}
            </p>
            <p className="text-xs text-muted-foreground">
              Chiffres arrêtés au{" "}
              {new Date(analysis.generated_at).toLocaleString("fr-FR", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
};
