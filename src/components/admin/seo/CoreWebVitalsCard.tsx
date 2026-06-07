import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Gauge, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type MetricBucket = { p75: number | null; good: number | null; ni: number | null; poor: number | null } | null;
interface CruxDevice {
  lcp?: MetricBucket;
  inp?: MetricBucket;
  cls?: MetricBucket;
  fcp?: MetricBucket;
  ttfb?: MetricBucket;
  collectionPeriod?: unknown;
  error?: string;
}
interface CruxResponse {
  error?: string;
  phone?: CruxDevice;
  desktop?: CruxDevice;
  updated_at?: string;
}

const THRESHOLDS = {
  lcp: { good: 2500, poor: 4000, unit: "ms", fmt: (v: number) => `${(v / 1000).toFixed(2)}s` },
  inp: { good: 200, poor: 500, unit: "ms", fmt: (v: number) => `${Math.round(v)}ms` },
  cls: { good: 0.1, poor: 0.25, unit: "", fmt: (v: number) => v.toFixed(3) },
  fcp: { good: 1800, poor: 3000, unit: "ms", fmt: (v: number) => `${(v / 1000).toFixed(2)}s` },
  ttfb: { good: 800, poor: 1800, unit: "ms", fmt: (v: number) => `${Math.round(v)}ms` },
};

function rating(metric: keyof typeof THRESHOLDS, p75: number | null): "good" | "ni" | "poor" | null {
  if (p75 === null) return null;
  const t = THRESHOLDS[metric];
  if (p75 <= t.good) return "good";
  if (p75 <= t.poor) return "ni";
  return "poor";
}

const ratingBadge: Record<string, "default" | "secondary" | "destructive"> = {
  good: "default", ni: "secondary", poor: "destructive",
};
const ratingLabel: Record<string, string> = {
  good: "Bon", ni: "À améliorer", poor: "Médiocre",
};

function MetricLine({ name, code, bucket }: { name: string; code: keyof typeof THRESHOLDS; bucket: MetricBucket }) {
  if (!bucket || bucket.p75 === null) {
    return (
      <div className="flex items-center justify-between text-xs py-1 border-b border-border/40">
        <span className="font-medium">{name}</span>
        <span className="text-muted-foreground">–</span>
      </div>
    );
  }
  const r = rating(code, bucket.p75);
  return (
    <div className="flex items-center justify-between text-xs py-1 border-b border-border/40">
      <span className="font-medium">{name}</span>
      <div className="flex items-center gap-2">
        <span className="font-mono">{THRESHOLDS[code].fmt(bucket.p75)}</span>
        {r && <Badge variant={ratingBadge[r]} className="text-[10px] py-0">{ratingLabel[r]}</Badge>}
      </div>
    </div>
  );
}

function DeviceBlock({ title, d }: { title: string; d?: CruxDevice }) {
  if (!d || d.error) {
    return (
      <div>
        <p className="text-xs font-semibold text-muted-foreground mb-2">{title}</p>
        <p className="text-xs text-muted-foreground">{d?.error ?? "Pas de données."}</p>
      </div>
    );
  }
  return (
    <div>
      <p className="text-xs font-semibold text-muted-foreground mb-2">{title}</p>
      <MetricLine name="LCP" code="lcp" bucket={d.lcp ?? null} />
      <MetricLine name="INP" code="inp" bucket={d.inp ?? null} />
      <MetricLine name="CLS" code="cls" bucket={d.cls ?? null} />
      <MetricLine name="FCP" code="fcp" bucket={d.fcp ?? null} />
      <MetricLine name="TTFB" code="ttfb" bucket={d.ttfb ?? null} />
    </div>
  );
}

export default function CoreWebVitalsCard() {
  const { data, isLoading } = useQuery({
    queryKey: ["crux-origin"],
    staleTime: 6 * 60 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
    retry: 1,
    queryFn: async (): Promise<CruxResponse> => {
      const { data, error } = await supabase.functions.invoke("fetch-crux", {
        body: { origin: "https://guardiens.fr" },
      });
      if (error) return { error: error.message };
      return data as CruxResponse;
    },
  });

  if (data?.error === "CRUX_API_KEY not configured") {
    return (
      <Card className="border-warning">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Gauge className="h-4 w-4 text-warning" />
            Core Web Vitals (CrUX)
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2">
          <div className="flex gap-2">
            <AlertCircle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">Configuration en attente</p>
              <ol className="list-decimal pl-4 mt-1 space-y-1 text-muted-foreground text-xs">
                <li>Aller sur <a className="underline" href="https://console.cloud.google.com/apis/library/chromeuxreport.googleapis.com" target="_blank" rel="noreferrer">console Google Cloud</a></li>
                <li>Activer "Chrome UX Report API"</li>
                <li>Créer une clé API (Credentials, Create API key)</li>
                <li>Ajouter en secret <code className="bg-muted px-1 rounded">CRUX_API_KEY</code></li>
              </ol>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Gauge className="h-4 w-4 text-primary" />
          Core Web Vitals (CrUX)
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Données réelles utilisateurs Chrome, 28 derniers jours, percentile 75. Origin: guardiens.fr
        </p>
      </CardHeader>
      <CardContent>
        {isLoading && <p className="text-sm text-muted-foreground">Chargement…</p>}
        {data?.error && data.error !== "CRUX_API_KEY not configured" && (
          <p className="text-sm text-destructive">{data.error}</p>
        )}
        {!isLoading && !data?.error && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <DeviceBlock title="Mobile" d={data?.phone} />
            <DeviceBlock title="Desktop" d={data?.desktop} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
