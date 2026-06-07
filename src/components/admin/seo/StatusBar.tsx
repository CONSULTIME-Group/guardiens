import { useState } from "react";
import { RefreshCw, CheckCircle2, AlertCircle, Clock, ChevronDown, ChevronUp, Database } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format, formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import type { SeoData } from "@/hooks/useSeoData";
import { useBingData } from "@/hooks/useBingData";

interface StatusBarProps {
  data: SeoData | null;
  loading: boolean;
  refreshing: boolean;
  onRefresh: () => void;
}

const StatusBar = ({ data, loading, refreshing, onRefresh }: StatusBarProps) => {
  const [expert, setExpert] = useState(false);

  const updatedAtDate = data?.updated_at ? new Date(data.updated_at) : null;
  const updatedAtRelative = updatedAtDate
    ? formatDistanceToNow(updatedAtDate, { addSuffix: true, locale: fr })
    : null;
  const cacheAgeMs = updatedAtDate ? Date.now() - updatedAtDate.getTime() : null;
  const cacheAgeMin = cacheAgeMs !== null ? Math.floor(cacheAgeMs / 60000) : null;

  const ga4Active = data?.ga4 && (data.ga4.current.sessions > 0 || data.ga4.current.activeUsers > 0);
  const gscClicks = data?.gsc?.current?.clicks ?? 0;
  const gscImpressions = data?.gsc?.current?.impressions ?? 0;
  const gscAvailable = gscClicks > 0 || gscImpressions > 0;

  // Statut Bing (best-effort, ne bloque pas le rendu)
  const { data: bingData, isLoading: bingLoading } = useBingData();
  const bingImpressions = bingData?.summary?.current?.impressions ?? 0;
  const bingAvailable = !bingData?.error && bingImpressions > 0;
  const bingConfigured = bingData?.error !== "BING_WEBMASTER_API_KEY not configured";

  type SourceStatus = "active" | "partial" | "unavailable" | "loading";

  const ga4Status: SourceStatus = loading && !data ? "loading" : ga4Active ? "active" : "unavailable";
  const gscStatus: SourceStatus = loading && !data
    ? "loading"
    : gscAvailable
      ? gscImpressions > 100 ? "active" : "partial"
      : "unavailable";
  const bingStatus: SourceStatus = bingLoading
    ? "loading"
    : !bingConfigured
      ? "unavailable"
      : bingAvailable
        ? bingImpressions > 50 ? "active" : "partial"
        : "unavailable";

  const statusIcon = (s: SourceStatus) => {
    if (s === "active") return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />;
    if (s === "partial") return <Clock className="h-3.5 w-3.5 text-warning" />;
    if (s === "unavailable") return <AlertCircle className="h-3.5 w-3.5 text-muted-foreground" />;
    return <Clock className="h-3.5 w-3.5 text-muted-foreground animate-pulse" />;
  };

  const statusLabel = (source: string, s: SourceStatus) => {
    if (s === "active") return `${source} : actif`;
    if (s === "partial") return `${source} : partiel`;
    if (s === "unavailable") return `${source} : indisponible`;
    return `${source} : chargement…`;
  };

  // Date ranges réellement utilisés par l'edge function fetch-seo-data
  const today = new Date();
  const fmt = (d: Date) => format(d, "dd MMM", { locale: fr });
  const minus = (n: number) => {
    const d = new Date(today);
    d.setDate(d.getDate() - n);
    return d;
  };
  const ga4Range = `${fmt(minus(29))} → ${fmt(today)}`;
  const gscRange = `${fmt(minus(30))} → ${fmt(minus(2))}`;

  // Dernier jour réellement présent dans GA4 (format YYYYMMDD)
  const ga4Days = data?.ga4?.current?.sessionsByDay ?? [];
  const lastGa4Raw = ga4Days[ga4Days.length - 1]?.date ?? null;
  const lastGa4Date = lastGa4Raw
    ? `${lastGa4Raw.slice(6, 8)}/${lastGa4Raw.slice(4, 6)}/${lastGa4Raw.slice(0, 4)}`
    : ",";

  const isStale = cacheAgeMin !== null && cacheAgeMin > 15;

  return (
    <div className="space-y-2">
      <div className="rounded-lg border bg-card px-4 py-3 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-6 min-w-0 text-sm flex-wrap">
          <div className="flex items-center gap-1.5">
            {statusIcon(ga4Status)}
            <span className="text-foreground">{statusLabel("GA4", ga4Status)}</span>
          </div>
          <div className="flex items-center gap-1.5">
            {statusIcon(gscStatus)}
            <span className="text-foreground">{statusLabel("GSC", gscStatus)}</span>
          </div>
          {updatedAtRelative && (
            <span className={`text-xs ${isStale ? "text-warning font-medium" : "text-muted-foreground"}`}>
              Mise à jour {updatedAtRelative}
              {data?.cached && " (cache)"}
              {data?.stale && " · périmé"}
            </span>
          )}
          {data?.ga4 && (
            <span
              className="text-xs text-muted-foreground"
              title="Dernier jour pour lequel GA4 a renvoyé des données"
            >
              Dernier jour GA4 : <span className="font-medium text-foreground">{lastGa4Date}</span>
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpert((v) => !v)}
            aria-expanded={expert}
            aria-label="Mode expert"
            className="text-xs"
          >
            <Database className="h-3.5 w-3.5 mr-1" />
            Expert
            {expert ? <ChevronUp className="h-3.5 w-3.5 ml-1" /> : <ChevronDown className="h-3.5 w-3.5 ml-1" />}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onRefresh}
            disabled={refreshing || loading}
            aria-label="Forcer le rafraîchissement (bypass cache)"
            title="Forcer le rafraîchissement (bypass cache 1h)"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {expert && (
        <div className="rounded-lg border bg-muted/40 px-4 py-3 text-xs space-y-2 font-mono">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1.5">
            <ExpertRow label="updated_at (UTC)" value={updatedAtDate ? updatedAtDate.toISOString() : ","} />
            <ExpertRow
              label="updated_at (local)"
              value={updatedAtDate ? format(updatedAtDate, "dd/MM/yyyy HH:mm:ss", { locale: fr }) : ","}
            />
            <ExpertRow
              label="Âge du cache"
              value={cacheAgeMin !== null ? `${cacheAgeMin} min` : ","}
              warn={isStale}
            />
            <ExpertRow label="TTL cache" value="15 min (puis fallback 24h si erreur)" />
            <ExpertRow label="Source" value={data?.cached ? (data?.stale ? "cache périmé (fallback)" : "cache") : "live API"} />
            <ExpertRow label="GA4 propertyId" value={data?.ga4?.propertyId ?? ","} />
            <ExpertRow label="Plage GA4 demandée" value={`${ga4Range} (J-29 → aujourd'hui)`} />
            <ExpertRow label="Dernier jour GA4 reçu" value={lastGa4Date} />
            <ExpertRow label="Plage GSC demandée" value={`${gscRange} (J-30 → J-2)`} />
            <ExpertRow label="GA4 sessions" value={data?.ga4?.current?.sessions?.toLocaleString() ?? ","} />
            <ExpertRow label="GA4 utilisateurs actifs" value={data?.ga4?.current?.activeUsers?.toLocaleString() ?? ","} />
            <ExpertRow label="GSC clics" value={gscClicks.toLocaleString()} />
            <ExpertRow label="GSC impressions" value={gscImpressions.toLocaleString()} />
          </div>
          <div className="pt-2 border-t border-border/60 text-[11px] text-muted-foreground font-sans leading-relaxed">
            <p>
              <strong className="text-foreground">Délais natifs Google :</strong> GA4 met à jour en quasi
              temps réel mais peut renvoyer le jour J avec quelques heures de latence. GSC publie avec
              2-3 jours de retard (J-2 minimum). Si le « dernier jour GA4 reçu » date de plusieurs jours,
              vérifiez le compte de service / la propriété GA4.
            </p>
            <p className="mt-1">
              <strong className="text-foreground">Cache :</strong> les données sont mises en cache 15 min
              pour limiter les quotas Google. Cliquez sur l'icône{" "}
              <RefreshCw className="inline h-3 w-3 -mt-0.5" /> pour forcer un appel live.
            </p>
          </div>
        </div>
      )}

      {gscStatus === "unavailable" && !loading && (
        <div className="rounded-lg border border-warning-border bg-warning-soft px-4 py-3 flex items-start gap-3">
          <AlertCircle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-warning-foreground">Données GSC insuffisantes</p>
            <p className="text-warning mt-0.5">
              La synchronisation GSC peut prendre 48-72h après la première connexion.
              Les métriques SEO apparaîtront une fois les premières données collectées.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

const ExpertRow = ({ label, value, warn }: { label: string; value: string; warn?: boolean }) => (
  <div className="flex items-baseline justify-between gap-3 border-b border-border/40 pb-1">
    <span className="text-muted-foreground font-sans text-[11px]">{label}</span>
    <span className={`tabular-nums truncate ${warn ? "text-warning font-semibold" : "text-foreground"}`}>
      {value}
    </span>
  </div>
);

export default StatusBar;
