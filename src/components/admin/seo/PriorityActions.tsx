import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, XCircle, FileWarning, CheckCircle2, ExternalLink } from "lucide-react";
import type { GSCRow } from "@/hooks/useSeoData";

interface Article {
  slug: string;
  title: string;
  published_at: string | null;
  created_at: string;
}

interface PriorityActionsProps {
  topPages: GSCRow[];
}

const PriorityActions = ({ topPages }: PriorityActionsProps) => {
  const [toOptimize, setToOptimize] = useState<Article[]>([]);
  const [notIndexed, setNotIndexed] = useState<Article[]>([]);
  const [urgent, setUrgent] = useState<Article[]>([]);

  useEffect(() => {
    const analyze = async () => {
      const { data: articles } = await supabase
        .from("articles")
        .select("slug, title, published_at, created_at")
        .eq("published", true);

      if (!articles) return;

      const now = Date.now();
      const gscPageMap = new Map<string, GSCRow>();
      topPages.forEach((r) => {
        const path = (r.keys?.[0] || "")
          .replace("https://guardiens.fr", "")
          .replace("https://www.guardiens.fr", "");
        gscPageMap.set(path, r);
      });

      const optimizeList: Article[] = [];
      const noIndexList: Article[] = [];
      const urgentList: Article[] = [];

      articles.forEach((a) => {
        const pubDate = new Date(a.published_at || a.created_at).getTime();
        const ageDays = (now - pubDate) / 86400000;
        const articlePath = `/actualites/${a.slug}`;
        const gscRow = gscPageMap.get(articlePath);

        // Urgent: indexed but bad position + low CTR (proxy for "losing positions")
        if (gscRow && gscRow.position > 20 && gscRow.ctr < 0.01 && gscRow.impressions > 50) {
          urgentList.push(a);
        }

        // To optimize: old articles with < 10 clicks
        if (ageDays > 30 && (!gscRow || gscRow.clicks < 10)) {
          optimizeList.push(a);
        }

        // Not indexed: published > 7 days, 0 impressions
        if (ageDays > 7 && (!gscRow || gscRow.impressions === 0)) {
          noIndexList.push(a);
        }
      });

      setUrgent(urgentList.slice(0, 5));
      setToOptimize(optimizeList.slice(0, 5));
      setNotIndexed(noIndexList.slice(0, 5));
    };

    analyze();
  }, [topPages]);

  const allClear = urgent.length === 0 && toOptimize.length === 0 && notIndexed.length === 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Actions prioritaires</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {allClear && (
          <div className="flex items-center gap-3 p-4 rounded-lg bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
            <CheckCircle2 className="h-5 w-5" />
            <span className="text-sm font-medium">Tout va bien — continuez à publier 🚀</span>
          </div>
        )}

        {urgent.length > 0 && (
          <div>
            <h3 className="flex items-center gap-2 text-sm font-semibold text-red-600 mb-3">
              <XCircle className="h-4 w-4" /> 🔴 URGENT — Position en baisse
            </h3>
            <ul className="space-y-2">
              {urgent.map((a) => (
                <li key={a.slug} className="flex items-center justify-between gap-2 text-sm">
                  <span className="text-muted-foreground truncate">{a.title || a.slug}</span>
                  <Button variant="outline" size="sm" className="shrink-0 h-7 text-xs" asChild>
                    <a href={`/admin/articles?slug=${a.slug}`}>Mettre à jour</a>
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {toOptimize.length > 0 && (
          <div>
            <h3 className="flex items-center gap-2 text-sm font-semibold text-orange-500 mb-3">
              <AlertTriangle className="h-4 w-4" /> 🟠 À OPTIMISER — &lt;10 clics en 28j
            </h3>
            <ul className="space-y-2">
              {toOptimize.map((a) => (
                <li key={a.slug} className="flex items-center justify-between gap-2 text-sm">
                  <span className="text-muted-foreground truncate">{a.title || a.slug}</span>
                  <Button variant="outline" size="sm" className="shrink-0 h-7 text-xs" asChild>
                    <a href={`/admin/articles?slug=${a.slug}`}>Title / meta</a>
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {notIndexed.length > 0 && (
          <div>
            <h3 className="flex items-center gap-2 text-sm font-semibold text-yellow-500 mb-3">
              <FileWarning className="h-4 w-4" /> 🟡 PAS ENCORE INDEXÉ — 0 impression après 7j
            </h3>
            <ul className="space-y-2">
              {notIndexed.map((a) => (
                <li key={a.slug} className="flex items-center justify-between gap-2 text-sm">
                  <span className="text-muted-foreground truncate">{a.title || a.slug}</span>
                  <Button variant="outline" size="sm" className="shrink-0 h-7 text-xs gap-1" asChild>
                    <a
                      href={`https://search.google.com/search-console/inspect?resource_id=${encodeURIComponent("https://guardiens.fr/")}&id=${encodeURIComponent(`https://guardiens.fr/actualites/${a.slug}`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Vérifier <ExternalLink className="h-3 w-3" />
                    </a>
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PriorityActions;
