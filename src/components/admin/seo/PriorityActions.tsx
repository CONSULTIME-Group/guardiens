import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, ExternalLink } from "lucide-react";
import type { GSCRow } from "@/hooks/useSeoData";

interface Article {
  slug: string;
  title: string;
  published_at: string | null;
  created_at: string;
}

interface ActionItem {
  article: Article;
  type: "urgent" | "optimize" | "not_indexed";
  reason: string;
  source: string;
}

interface PriorityActionsProps {
  topPages: GSCRow[];
}

const TYPE_CONFIG = {
  urgent: { label: "Position en baisse", badgeClass: "border-red-300 text-red-700 bg-red-50" },
  optimize: { label: "À optimiser", badgeClass: "border-orange-300 text-orange-700 bg-orange-50" },
  not_indexed: { label: "Non indexé", badgeClass: "border-yellow-300 text-yellow-700 bg-yellow-50" },
};

const PriorityActions = ({ topPages }: PriorityActionsProps) => {
  const [actions, setActions] = useState<ActionItem[]>([]);

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

      const items: ActionItem[] = [];

      articles.forEach((a) => {
        const pubDate = new Date(a.published_at || a.created_at).getTime();
        const ageDays = (now - pubDate) / 86400000;
        const articlePath = `/actualites/${a.slug}`;
        const gscRow = gscPageMap.get(articlePath);

        if (gscRow && gscRow.position > 20 && gscRow.ctr < 0.01 && gscRow.impressions > 50) {
          items.push({
            article: a,
            type: "urgent",
            reason: `Position ${Math.round(gscRow.position)}, CTR < 1%`,
            source: "GSC",
          });
        }

        if (ageDays > 30 && (!gscRow || gscRow.clicks < 10)) {
          items.push({
            article: a,
            type: "optimize",
            reason: "Moins de 10 clics en 28 jours",
            source: "GSC",
          });
        }

        if (ageDays > 7 && (!gscRow || gscRow.impressions === 0)) {
          items.push({
            article: a,
            type: "not_indexed",
            reason: "0 impression après 7 jours",
            source: "GSC",
          });
        }
      });

      const urgentItems = items.filter((i) => i.type === "urgent").slice(0, 5);
      const optimizeItems = items.filter((i) => i.type === "optimize").slice(0, 5);
      const notIndexedItems = items.filter((i) => i.type === "not_indexed").slice(0, 5);

      setActions([...urgentItems, ...optimizeItems, ...notIndexedItems]);
    };

    analyze();
  }, [topPages]);

  if (actions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Actions prioritaires</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 p-4 rounded-lg bg-emerald-50 text-emerald-700">
            <CheckCircle2 className="h-5 w-5" />
            <span className="text-sm font-medium">Tout va bien — continuez à publier 🚀</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Actions prioritaires</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-3">
          {actions.map((item) => {
            const config = TYPE_CONFIG[item.type];
            const isNotIndexed = item.type === "not_indexed";

            return (
              <li
                key={`${item.type}-${item.article.slug}`}
                className="flex items-center justify-between gap-3 py-2 border-b last:border-b-0"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Badge variant="outline" className={`text-[10px] shrink-0 ${config.badgeClass}`}>
                    {config.label}
                  </Badge>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{item.article.title || item.article.slug}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.reason} · Source : {item.source}
                    </p>
                  </div>
                </div>
                <Button variant="outline" size="sm" className="shrink-0 h-7 text-xs gap-1" asChild>
                  {isNotIndexed ? (
                    <a
                      href={`https://search.google.com/search-console/inspect?resource_id=${encodeURIComponent("https://guardiens.fr/")}&id=${encodeURIComponent(`https://guardiens.fr/actualites/${item.article.slug}`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Vérifier <ExternalLink className="h-3 w-3" />
                    </a>
                  ) : (
                    <a href={`/admin/articles?slug=${item.article.slug}`}>
                      {item.type === "urgent" ? "Mettre à jour" : "Title / meta"}
                    </a>
                  )}
                </Button>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
};

export default PriorityActions;
