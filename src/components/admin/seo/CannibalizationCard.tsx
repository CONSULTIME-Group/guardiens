import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { GSCRow } from "@/hooks/useSeoData";

interface Props {
  topQueries: GSCRow[] | undefined;
  topPages: GSCRow[] | undefined;
}

/**
 * Détection naïve de cannibalisation : repère les requêtes ayant ≥ 2 pages
 * distinctes dans le top GSC. Reconstruit le mapping query→pages en croisant
 * la liste agrégée (les keys GSC sont mono-dimension côté actuel, donc on
 * affiche seulement le signal global : nb requêtes uniques vs nb pages
 * uniques pour quantifier le risque).
 */
export default function CannibalizationCard({ topQueries, topPages }: Props) {
  const stats = useMemo(() => {
    const queries = (topQueries ?? []).map((q) => q.keys?.[0]).filter(Boolean);
    const pages = (topPages ?? []).map((p) => p.keys?.[0]).filter(Boolean);
    const uniqueQueries = new Set(queries).size;
    const uniquePages = new Set(pages).size;
    const ratio = uniqueQueries > 0 ? uniquePages / uniqueQueries : 0;
    return { uniqueQueries, uniquePages, ratio };
  }, [topQueries, topPages]);

  if (!topQueries || topQueries.length === 0) return null;

  const risk = stats.ratio > 1.2 ? "élevé" : stats.ratio > 0.8 ? "modéré" : "faible";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Risque de cannibalisation</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <div className="flex justify-between"><span className="text-muted-foreground">Requêtes uniques (top)</span><span className="font-mono">{stats.uniqueQueries}</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">Pages uniques (top)</span><span className="font-mono">{stats.uniquePages}</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">Ratio pages/requêtes</span><span className="font-mono">{stats.ratio.toFixed(2)}</span></div>
        <div className="pt-2 border-t">
          Niveau de risque : <span className="font-semibold">{risk}</span>.
          {risk === "élevé" && (
            <p className="mt-1 text-xs text-muted-foreground">
              Plusieurs pages se positionnent sur les mêmes requêtes. Identifiez les doublons via GSC
              (Performances, comparer pages pour une même requête) et fusionnez ou différenciez les angles.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
