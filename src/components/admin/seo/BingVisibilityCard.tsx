import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { AlertCircle } from "lucide-react";

interface BingTrafficRow {
  Date?: string;
  Clicks?: number;
  Impressions?: number;
  Query?: string;
  Page?: string;
  AvgClickPosition?: number;
  AvgImpressionPosition?: number;
}

interface BingResponse {
  error?: string;
  traffic?: { d?: BingTrafficRow[] } | { error: string };
  queries?: { d?: BingTrafficRow[] } | { error: string };
  pages?: { d?: BingTrafficRow[] } | { error: string };
}

function sum(rows: BingTrafficRow[] | undefined, key: keyof BingTrafficRow): number {
  if (!rows) return 0;
  return rows.reduce((acc, r) => acc + (Number(r[key]) || 0), 0);
}

export default function BingVisibilityCard() {
  const [data, setData] = useState<BingResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.functions.invoke("fetch-bing-data");
      if (error) setData({ error: error.message });
      else setData(data as BingResponse);
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <Card>
        <CardHeader><CardTitle className="text-lg">Visibilité Bing</CardTitle></CardHeader>
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

  const trafficRows = (data?.traffic && "d" in data.traffic ? data.traffic.d : undefined) as BingTrafficRow[] | undefined;
  const queryRows = (data?.queries && "d" in data.queries ? data.queries.d : undefined) as BingTrafficRow[] | undefined;
  const pageRows = (data?.pages && "d" in data.pages ? data.pages.d : undefined) as BingTrafficRow[] | undefined;

  const clicks = sum(trafficRows, "Clicks");
  const impressions = sum(trafficRows, "Impressions");

  return (
    <Card>
      <CardHeader><CardTitle className="text-lg">Visibilité Bing</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
          <div><div className="text-muted-foreground text-xs">Clics</div><div className="font-mono text-xl">{clicks.toLocaleString()}</div></div>
          <div><div className="text-muted-foreground text-xs">Impressions</div><div className="font-mono text-xl">{impressions.toLocaleString()}</div></div>
          <div><div className="text-muted-foreground text-xs">CTR</div><div className="font-mono text-xl">{impressions > 0 ? ((clicks / impressions) * 100).toFixed(2) : "0"}%</div></div>
        </div>

        {queryRows && queryRows.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-2">Top requêtes Bing</p>
            <div className="space-y-1 text-xs">
              {queryRows.slice(0, 10).map((q, i) => (
                <div key={i} className="flex justify-between gap-2">
                  <span className="truncate">{q.Query ?? "–"}</span>
                  <span className="font-mono shrink-0">{q.Clicks ?? 0} · {q.Impressions ?? 0}</span>
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
                <div key={i} className="flex justify-between gap-2">
                  <span className="truncate font-mono">{p.Page ?? "–"}</span>
                  <span className="font-mono shrink-0">{p.Clicks ?? 0} · {p.Impressions ?? 0}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
