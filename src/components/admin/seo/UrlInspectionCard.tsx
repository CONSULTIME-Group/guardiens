import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type InspectResult = {
  ok?: boolean;
  status?: number;
  error?: string;
  result?: {
    inspectionResult?: {
      indexStatusResult?: {
        verdict?: string;
        coverageState?: string;
        robotsTxtState?: string;
        indexingState?: string;
        lastCrawlTime?: string;
        pageFetchState?: string;
        googleCanonical?: string;
        userCanonical?: string;
        crawledAs?: string;
      };
      mobileUsabilityResult?: { verdict?: string };
      richResultsResult?: { verdict?: string; detectedItems?: Array<{ richResultType?: string; items?: unknown[] }> };
      inspectionResultLink?: string;
    };
  };
};

const verdictColor = (v?: string) => {
  if (!v) return "secondary";
  if (v === "PASS") return "default";
  if (v === "NEUTRAL") return "secondary";
  if (v === "PARTIAL") return "outline";
  return "destructive";
};

export default function UrlInspectionCard() {
  const [url, setUrl] = useState("https://guardiens.fr/");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<InspectResult | null>(null);

  async function inspect() {
    setLoading(true);
    setData(null);
    try {
      const { data: res, error } = await supabase.functions.invoke("gsc-url-inspect", {
        body: { url },
      });
      if (error) setData({ error: error.message });
      else setData(res as InspectResult);
    } catch (e) {
      setData({ error: e instanceof Error ? e.message : String(e) });
    } finally {
      setLoading(false);
    }
  }

  const idx = data?.result?.inspectionResult?.indexStatusResult;
  const mob = data?.result?.inspectionResult?.mobileUsabilityResult;
  const rich = data?.result?.inspectionResult?.richResultsResult;
  const link = data?.result?.inspectionResult?.inspectionResultLink;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Search className="h-4 w-4 text-primary" />
          URL Inspection (GSC)
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Verdict d'indexation Google en temps réel pour une URL précise. Quota: 2 000 requêtes/jour.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-2">
          <Input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://guardiens.fr/..."
            className="font-mono text-xs"
          />
          <Button onClick={inspect} disabled={loading || !url}>
            {loading ? "…" : "Inspecter"}
          </Button>
        </div>

        {data?.error && <p className="text-sm text-destructive">{data.error}</p>}

        {idx && (
          <div className="space-y-2 text-sm">
            <div className="flex flex-wrap gap-2">
              <Badge variant={verdictColor(idx.verdict) as any}>Verdict: {idx.verdict ?? "–"}</Badge>
              {idx.coverageState && <Badge variant="outline">{idx.coverageState}</Badge>}
              {idx.robotsTxtState && <Badge variant="outline">robots: {idx.robotsTxtState}</Badge>}
              {idx.indexingState && <Badge variant="outline">{idx.indexingState}</Badge>}
              {idx.pageFetchState && <Badge variant="outline">fetch: {idx.pageFetchState}</Badge>}
            </div>
            <dl className="text-xs grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-muted-foreground">
              {idx.lastCrawlTime && <div><dt className="inline font-medium">Dernière exploration:</dt> <dd className="inline">{new Date(idx.lastCrawlTime).toLocaleString("fr-FR")}</dd></div>}
              {idx.crawledAs && <div><dt className="inline font-medium">Crawlé en:</dt> <dd className="inline">{idx.crawledAs}</dd></div>}
              {idx.googleCanonical && <div className="sm:col-span-2 truncate"><dt className="inline font-medium">Canonical Google:</dt> <dd className="inline font-mono">{idx.googleCanonical}</dd></div>}
              {idx.userCanonical && idx.userCanonical !== idx.googleCanonical && (
                <div className="sm:col-span-2 truncate"><dt className="inline font-medium">Canonical déclaré:</dt> <dd className="inline font-mono">{idx.userCanonical}</dd></div>
              )}
            </dl>

            <div className="flex flex-wrap gap-2 pt-1">
              {mob?.verdict && <Badge variant={verdictColor(mob.verdict) as any}>Mobile: {mob.verdict}</Badge>}
              {rich?.verdict && <Badge variant={verdictColor(rich.verdict) as any}>Rich results: {rich.verdict}</Badge>}
              {rich?.detectedItems?.map((d, i) => (
                <Badge key={i} variant="secondary">{d.richResultType} ({d.items?.length ?? 0})</Badge>
              ))}
            </div>

            {link && (
              <a href={link} target="_blank" rel="noreferrer noopener" className="text-xs text-primary hover:underline inline-flex items-center gap-1">
                Voir dans Search Console <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
