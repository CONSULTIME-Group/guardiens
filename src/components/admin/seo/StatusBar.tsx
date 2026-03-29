import { RefreshCw, TrendingUp, TrendingDown } from "lucide-react";
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
  const sessions = data?.ga4?.current?.sessions ?? 0;
  const prevSessions = data?.ga4?.previous?.sessions ?? 0;
  const clicks = data?.gsc?.current?.clicks ?? 0;
  const isUp = sessions >= prevSessions;
  const hasData = data && (sessions > 0 || clicks > 0);

  const updatedAt = data?.updated_at
    ? formatDistanceToNow(new Date(data.updated_at), { addSuffix: true, locale: fr })
    : null;

  const bgClass = !hasData
    ? "bg-muted text-muted-foreground"
    : isUp
      ? "bg-emerald-600 text-white"
      : "bg-red-600 text-white";

  return (
    <div className={`rounded-lg px-4 py-2.5 flex items-center justify-between gap-4 text-sm ${bgClass}`}>
      <div className="flex items-center gap-3 min-w-0">
        {hasData && (
          isUp
            ? <TrendingUp className="h-4 w-4 shrink-0" />
            : <TrendingDown className="h-4 w-4 shrink-0" />
        )}
        <span className="truncate">
          {!hasData
            ? "En attente de données GSC / GA4…"
            : `${sessions.toLocaleString()} sessions · ${clicks.toLocaleString()} clics GSC`}
          {updatedAt && (
            <span className="opacity-80 ml-2">
              · Mise à jour {updatedAt}
              {data?.cached && " (cache)"}
              {data?.stale && " ⚠️ périmé"}
            </span>
          )}
        </span>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={onRefresh}
        disabled={refreshing || loading}
        className={hasData ? "text-white hover:bg-white/20" : ""}
      >
        <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
      </Button>
    </div>
  );
};

export default StatusBar;
