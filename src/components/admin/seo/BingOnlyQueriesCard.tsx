import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useBingData, type BingTrafficRow } from "@/hooks/useBingData";
import type { GSCRow } from "@/hooks/useSeoData";

interface Props {
  gscQueries: GSCRow[] | undefined;
}

/**
 * Requêtes qui apportent du trafic Bing mais sont absentes (ou très loin)
 * du top Google. Mine d'or de contenu sous-optimisé pour Google.
 */
export default function BingOnlyQueriesCard({ gscQueries }: Props) {
  const { data } = useBingData();

  const diff = useMemo(() => {
    const bingRows = (data?.queries && "d" in data.queries ? data.queries.d : undefined) as BingTrafficRow[] | undefined;
    if (!bingRows?.length) return [];
    const gscSet = new Set<string>(
      (gscQueries ?? []).map((r) => (r.keys?.[0] ?? "").toLowerCase().trim()).filter(Boolean),
    );
    return bingRows
      .filter((r) => {
        const q = (r.Query ?? "").toLowerCase().trim();
        return q && !gscSet.has(q) && (Number(r.Impressions) || 0) >= 3;
      })
      .sort((a, b) => (Number(b.Impressions) || 0) - (Number(a.Impressions) || 0))
      .slice(0, 15);
  }, [data, gscQueries]);

  if (diff.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Requêtes uniquement Bing</CardTitle>
        <p className="text-xs text-muted-foreground mt-1">
          Mots-clés qui vous apportent du trafic Bing mais absents du top Google.
          Opportunités à optimiser côté Google (titre, intro, H2, FAQ).
        </p>
      </CardHeader>
      <CardContent>
        <table className="w-full text-sm">
          <thead className="text-xs text-muted-foreground border-b">
            <tr>
              <th className="text-left font-medium py-2">Requête</th>
              <th className="text-right font-medium py-2">Clics Bing</th>
              <th className="text-right font-medium py-2">Impr. Bing</th>
              <th className="text-right font-medium py-2">Pos. Bing</th>
            </tr>
          </thead>
          <tbody>
            {diff.map((r, i) => (
              <tr key={i} className="border-b border-border/40 hover:bg-muted/30">
                <td className="py-1.5 pr-2">{r.Query}</td>
                <td className="py-1.5 text-right font-mono">{r.Clicks ?? 0}</td>
                <td className="py-1.5 text-right font-mono">{r.Impressions ?? 0}</td>
                <td className="py-1.5 text-right font-mono text-muted-foreground">
                  {r.AvgImpressionPosition ? Number(r.AvgImpressionPosition).toFixed(1) : "–"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
