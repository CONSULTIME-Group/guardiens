import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { ExternalLink, AlertCircle } from "lucide-react";
import type { GSCRow } from "@/hooks/useSeoData";

interface Article {
  slug: string;
  title: string;
  category: string;
  published_at: string | null;
  created_at: string;
}

interface TopArticlesTableProps {
  topPages: GSCRow[];
}

const CATEGORY_COLORS: Record<string, string> = {
  ville: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  guide_race: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200",
  vie_locale: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  guide_local: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  conseil_gardien: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200",
  conseil_proprio: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200",
  guide_pratique: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  saisonnier: "bg-sky-100 text-sky-800 dark:bg-sky-900 dark:text-sky-200",
};

const CATEGORY_LABELS: Record<string, string> = {
  ville: "Ville",
  guide_race: "Race",
  vie_locale: "Vie locale",
  guide_local: "Guide local",
  conseil_gardien: "Conseil",
  conseil_proprio: "Conseil",
  guide_pratique: "Pratique",
  saisonnier: "Saisonnier",
};

const MEDALS = ["🥇", "🥈", "🥉"];

const TopArticlesTable = ({ topPages }: TopArticlesTableProps) => {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("articles")
        .select("slug, title, category, published_at, created_at")
        .eq("published", true);
      setArticles(data || []);
      setLoading(false);
    };
    load();
  }, []);

  if (loading) return null;

  const articleMap = new Map<string, Article>();
  articles.forEach((a) => articleMap.set(a.slug, a));

  const hasGSC = topPages && topPages.length > 0;

  // Cross-match GSC pages with articles
  type MergedRow = {
    article: Article;
    clicks: number;
    impressions: number;
    ctr: number;
    position: number;
    hasGSC: boolean;
  };

  let mergedRows: MergedRow[] = [];

  if (hasGSC) {
    const seen = new Set<string>();
    topPages.forEach((row) => {
      const url = row.keys?.[0] || "";
      const path = url
        .replace("https://guardiens.fr", "")
        .replace("https://www.guardiens.fr", "");
      const match = path.match(/^\/actualites\/(.+?)$/);
      if (!match) return;
      const slug = match[1];
      const article = articleMap.get(slug);
      if (!article || seen.has(slug)) return;
      seen.add(slug);
      mergedRows.push({
        article,
        clicks: row.clicks,
        impressions: row.impressions,
        ctr: row.ctr,
        position: row.position,
        hasGSC: true,
      });
    });
    // Sort by clicks desc
    mergedRows.sort((a, b) => b.clicks - a.clicks);
    mergedRows = mergedRows.slice(0, 10);
  }

  // Fallback: show latest articles if no GSC data
  if (mergedRows.length === 0) {
    const sorted = [...articles]
      .sort((a, b) => new Date(b.published_at || b.created_at).getTime() - new Date(a.published_at || a.created_at).getTime())
      .slice(0, 10);
    mergedRows = sorted.map((a) => ({
      article: a,
      clicks: 0,
      impressions: 0,
      ctr: 0,
      position: 0,
      hasGSC: false,
    }));
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Top 10 articles par trafic</CardTitle>
          {!hasGSC && (
            <Badge variant="outline" className="text-orange-600 border-orange-300 gap-1">
              <AlertCircle className="h-3 w-3" /> GSC en cours de synchronisation
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8">#</TableHead>
              <TableHead>Titre</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">Clics</TableHead>
              <TableHead className="text-right">Impr.</TableHead>
              <TableHead className="text-right">CTR</TableHead>
              <TableHead className="text-center">Pos.</TableHead>
              <TableHead className="w-20">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {mergedRows.map((row, i) => {
              const clicksColor = !row.hasGSC
                ? "text-muted-foreground"
                : row.clicks > 50
                  ? "text-emerald-600 font-bold"
                  : row.clicks >= 10
                    ? "text-orange-500 font-bold"
                    : "text-red-500 font-bold";

              const posColor = !row.hasGSC
                ? ""
                : row.position <= 3
                  ? "bg-emerald-600 text-white"
                  : row.position <= 10
                    ? "bg-orange-500 text-white"
                    : "bg-red-500 text-white";

              const catClass = CATEGORY_COLORS[row.article.category] || "bg-muted text-muted-foreground";
              const catLabel = CATEGORY_LABELS[row.article.category] || row.article.category;

              return (
                <TableRow key={row.article.slug}>
                  <TableCell className="font-medium text-center">
                    {i < 3 ? MEDALS[i] : i + 1}
                  </TableCell>
                  <TableCell className="max-w-[250px]">
                    <a
                      href={`https://guardiens.fr/actualites/${row.article.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-medium hover:underline truncate block"
                    >
                      {row.article.title || row.article.slug}
                    </a>
                  </TableCell>
                  <TableCell>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${catClass}`}>
                      {catLabel}
                    </span>
                  </TableCell>
                  <TableCell className={`text-right ${clicksColor}`}>
                    {row.hasGSC ? row.clicks : "—"}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {row.hasGSC ? row.impressions.toLocaleString() : "—"}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {row.hasGSC ? `${(row.ctr * 100).toFixed(1)}%` : "—"}
                  </TableCell>
                  <TableCell className="text-center">
                    {row.hasGSC ? (
                      <Badge className={`text-xs ${posColor}`}>
                        {Math.round(row.position * 10) / 10}
                      </Badge>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      asChild
                    >
                      <a href={`/admin/articles?slug=${row.article.slug}`}>
                        Optimiser
                      </a>
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        <div className="mt-3 text-right">
          <a href="/admin/articles" className="text-sm text-primary hover:underline">
            Voir tous les articles →
          </a>
        </div>
      </CardContent>
    </Card>
  );
};

export default TopArticlesTable;
