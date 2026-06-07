import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";
import { useBingData, type BingTrafficRow, type BingPeriodDays } from "@/hooks/useBingData";

export default function BingVisibilityCard({ period = 28 }: { period?: BingPeriodDays }) {
  const { data, isLoading } = useBingData(period);


  if (isLoading) {
    return (
      <Card>
        <CardHeader><CardTitle className="text-lg">Visibilité Bing, détail</CardTitle></CardHeader>
        <CardContent className="text-sm text-muted-foreground">Chargement…</CardContent>
      </Card>
    );
  }

  if (data?.error === "BING_WEBMASTER_API_KEY not configured") {
    return (
      <Card className="border-warning">
        <CardHeader><CardTitle className="text-lg">Visibilité Bing</CardTitle></CardHeader>
        <CardContent className="text-sm space-y-2">
          <div className="flex gap-2"><AlertCircle className="h-4 w-4 text-warning shrink-0 mt-0.5" /><div>
            <p className="font-medium">Configuration en attente</p>
            <ol className="list-decimal pl-4 mt-1 space-y-1 text-muted-foreground text-xs">
              <li>Aller sur <a className="underline" href="https://www.bing.com/webmasters" target="_blank" rel="noreferrer">bing.com/webmasters</a></li>
              <li>Importer le site depuis Google Search Console (1 clic)</li>
              <li>Settings, API access, générer la clé</li>
              <li>Ajouter la clé en secret <code className="bg-muted px-1 rounded">BING_WEBMASTER_API_KEY</code></li>
            </ol>
          </div></div>
        </CardContent>
      </Card>
    );
  }

  if (data?.error) {
    return (
      <Card className="border-destructive">
        <CardHeader><CardTitle className="text-lg">Visibilité Bing</CardTitle></CardHeader>
        <CardContent className="text-sm text-destructive">{data.error}</CardContent>
      </Card>
    );
  }

  const queryRows = (data?.queries && "d" in data.queries ? data.queries.d : undefined) as BingTrafficRow[] | undefined;
  const pageRows = (data?.pages && "d" in data.pages ? data.pages.d : undefined) as BingTrafficRow[] | undefined;
  const byDay = data?.summary?.byDay ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Visibilité Bing, détail</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {byDay.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-2">Impressions Bing par jour ({period}j)</p>
            <div className="h-24 flex items-end gap-[2px]">
              {byDay.map((d, i) => {
                const max = Math.max(...byDay.map((x) => x.impressions), 1);
                const height = (d.impressions / max) * 100;
                return (
                  <div
                    key={i}
                    className="flex-1 bg-primary/50 hover:bg-primary rounded-t transition-colors relative group cursor-default"
                    style={{ height: `${Math.max(2, height)}%` }}
                  >
                    <div className="absolute -top-9 left-1/2 -translate-x-1/2 bg-foreground text-background text-[10px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                      {d.date.slice(8, 10)}/{d.date.slice(5, 7)}, {d.impressions} imp · {d.clicks} cl
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {queryRows && queryRows.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-2">Top requêtes Bing</p>
              <div className="space-y-1 text-xs">
                {queryRows.slice(0, 10).map((q, i) => (
                  <div key={i} className="flex justify-between gap-2 border-b border-border/40 pb-1">
                    <span className="truncate">{q.Query ?? "–"}</span>
                    <span className="font-mono shrink-0 text-muted-foreground">
                      {q.Clicks ?? 0} cl · {q.Impressions ?? 0} imp
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {pageRows && pageRows.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-2">Top pages Bing</p>
              <div className="space-y-1 text-xs">
                {pageRows.slice(0, 10).map((p, i) => (
                  <div key={i} className="flex justify-between gap-2 border-b border-border/40 pb-1">
                    <span className="truncate font-mono">{(p.Page ?? "–").replace(/^https?:\/\/[^/]+/, "")}</span>
                    <span className="font-mono shrink-0 text-muted-foreground">
                      {p.Clicks ?? 0} cl · {p.Impressions ?? 0} imp
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {!queryRows?.length && !pageRows?.length && byDay.length === 0 && (
          <p className="text-sm text-muted-foreground py-4 text-center">
            Aucune donnée Bing pour le moment. Vérifiez que le site est bien vérifié dans Bing Webmaster.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
