import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, XCircle, FileWarning } from "lucide-react";
import type { GSCRow } from "@/hooks/useSeoData";

interface Article {
  slug: string;
  title: string;
  published_at: string | null;
  created_at: string;
}

interface ArticlesIssuesProps {
  topPages: GSCRow[];
}

const ArticlesIssues = ({ topPages }: ArticlesIssuesProps) => {
  const [toOptimize, setToOptimize] = useState<Article[]>([]);
  const [notIndexed, setNotIndexed] = useState<Article[]>([]);
  const [badMeta, setBadMeta] = useState<{ article: Article; position: number; ctr: number }[]>([]);

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

      const optimize: Article[] = [];
      const noIndex: Article[] = [];
      const metaIssues: { article: Article; position: number; ctr: number }[] = [];

      articles.forEach((a) => {
        const pubDate = new Date(a.published_at || a.created_at).getTime();
        const ageMs = now - pubDate;
        const ageDays = ageMs / 86400000;
        const articlePath = `/actualites/${a.slug}`;
        const gscRow = gscPageMap.get(articlePath);

        if (ageDays > 30 && (!gscRow || gscRow.clicks < 10)) {
          optimize.push(a);
        }

        if (ageDays > 7 && (!gscRow || gscRow.impressions === 0)) {
          noIndex.push(a);
        }

        if (gscRow && gscRow.position > 20 && gscRow.ctr < 0.01) {
          metaIssues.push({ article: a, position: gscRow.position, ctr: gscRow.ctr });
        }
      });

      setToOptimize(optimize.slice(0, 5));
      setNotIndexed(noIndex.slice(0, 5));
      setBadMeta(metaIssues.slice(0, 5));
    };

    analyze();
  }, [topPages]);

  if (toOptimize.length === 0 && notIndexed.length === 0 && badMeta.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Articles en difficulté</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {toOptimize.length > 0 && (
          <div>
            <h3 className="flex items-center gap-2 text-sm font-semibold text-[#EF4444] mb-2">
              <XCircle className="h-4 w-4" /> À optimiser (&lt;10 clics en 28j)
            </h3>
            <ul className="space-y-1">
              {toOptimize.map((a) => (
                <li key={a.slug} className="text-sm text-muted-foreground truncate">
                  {a.title || a.slug}
                </li>
              ))}
            </ul>
          </div>
        )}

        {notIndexed.length > 0 && (
          <div>
            <h3 className="flex items-center gap-2 text-sm font-semibold text-[#F59E0B] mb-2">
              <AlertTriangle className="h-4 w-4" /> Pas encore indexé
            </h3>
            <ul className="space-y-1">
              {notIndexed.map((a) => (
                <li key={a.slug} className="text-sm text-muted-foreground truncate">
                  {a.title || a.slug}
                </li>
              ))}
            </ul>
          </div>
        )}

        {badMeta.length > 0 && (
          <div>
            <h3 className="flex items-center gap-2 text-sm font-semibold text-[#FBBF24] mb-2">
              <FileWarning className="h-4 w-4" /> Title/meta à retravailler
            </h3>
            <ul className="space-y-1">
              {badMeta.map((item) => (
                <li key={item.article.slug} className="text-sm text-muted-foreground truncate">
                  {item.article.title || item.article.slug} — pos {item.position.toFixed(0)}, CTR {(item.ctr * 100).toFixed(1)}%
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ArticlesIssues;
