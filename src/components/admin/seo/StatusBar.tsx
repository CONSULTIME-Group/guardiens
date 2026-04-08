import { RefreshCw, CheckCircle2, AlertCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import type { SeoData } from "@/hooks/useSeoData";

interface StatusBarProps {
  data: SeoData | null;
  loading: boolean;
  refreshing: boolean;
  onRefresh: () => void;
}

const StatusBar = ({ data, loading, refreshing, onRefresh }: StatusBarProps) => {
  const updatedAt = data?.updated_at
    ? formatDistanceToNow(new Date(data.updated_at), { addSuffix: true, locale: fr })
    : null;

  const ga4Active = data?.ga4 && (data.ga4.current.sessions > 0 || data.ga4.current.activeUsers > 0);
  const gscClicks = data?.gsc?.current?.clicks ?? 0;
  const gscImpressions = data?.gsc?.current?.impressions ?? 0;
  const gscAvailable = gscClicks > 0 || gscImpressions > 0;

  type SourceStatus = "active" | "partial" | "unavailable" | "loading";

  const ga4Status: SourceStatus = loading && !data ? "loading" : ga4Active ? "active" : "unavailable";
  const gscStatus: SourceStatus = loading && !data
    ? "loading"
    : gscAvailable
      ? gscImpressions > 100 ? "active" : "partial"
      : "unavailable";

  const statusIcon = (s: SourceStatus) => {
    if (s === "active") return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />;
    if (s === "partial") return <Clock className="h-3.5 w-3.5 text-orange-500" />;
    if (s === "unavailable") return <AlertCircle className="h-3.5 w-3.5 text-muted-foreground" />;
    return <Clock className="h-3.5 w-3.5 text-muted-foreground animate-pulse" />;
  };

  const statusLabel = (source: string, s: SourceStatus) => {
    if (s === "active") return `${source} : actif`;
    if (s === "partial") return `${source} : partiel`;
    if (s === "unavailable") return `${source} : indisponible`;
    return `${source} : chargement…`;
  };

  return (
    <div className="space-y-2">
      <div className="rounded-lg border bg-card px-4 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-6 min-w-0 text-sm">
          <div className="flex items-center gap-1.5">
            {statusIcon(ga4Status)}
            <span className="text-foreground">{statusLabel("GA4", ga4Status)}</span>
          </div>
          <div className="flex items-center gap-1.5">
            {statusIcon(gscStatus)}
            <span className="text-foreground">{statusLabel("GSC", gscStatus)}</span>
          </div>
          {updatedAt && (
            <span className="text-xs text-muted-foreground">
              Mise à jour {updatedAt}
              {data?.cached && " (cache)"}
            </span>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onRefresh}
          disabled={refreshing || loading}
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {gscStatus === "unavailable" && !loading && (
        <div className="rounded-lg border border-orange-200 bg-orange-50 px-4 py-3 flex items-start gap-3">
          <AlertCircle className="h-4 w-4 text-orange-500 shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-orange-800">Données GSC insuffisantes</p>
            <p className="text-orange-700 mt-0.5">
              La synchronisation GSC peut prendre 48-72h après la première connexion.
              Les métriques SEO apparaîtront une fois les premières données collectées.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default StatusBar;
