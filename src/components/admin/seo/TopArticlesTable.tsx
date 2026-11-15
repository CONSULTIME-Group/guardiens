import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { ExternalLink } from "lucide-react";
import { ARTICLE_CATEGORIES } from "@/lib/admin/articleCategories";
import type { TopArticleRow } from "@/lib/admin/seoMetrics";

interface TopArticlesTableProps {
  /** Lot SEO-A : dix articles les plus cliqués, lus sur la liste complète des pages (topArticles). */
  rows: TopArticleRow[];
}

const CATEGORY_COLORS: Record<string, string> = {
  ville: "bg-info/10 text-info dark:bg-info dark:text-info",
  guide_race: "bg-success/10 text-success dark:bg-success dark:text-success",
  vie_locale: "bg-warning-soft text-warning-foreground dark:bg-warning dark:text-warning",
  guide_local: "bg-primary/10 text-primary dark:bg-primary dark:text-primary",
  conseil_gardien: "bg-muted text-muted-foreground dark:bg-foreground dark:text-muted-foreground",
  conseil_proprio: "bg-muted text-muted-foreground dark:bg-foreground dark:text-muted-foreground",
  guide_pratique: "bg-warning-soft text-warning-foreground dark:bg-warning dark:text-warning",
  saisonnier: "bg-info/10 text-info dark:bg-info dark:text-info",
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


const TopArticlesTable = ({ rows }: TopArticlesTableProps) => {
  const mergedRows = rows.map((r) => ({ ...r, hasGSC: true }));

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Articles les plus cliqués</CardTitle>

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
              <TableHead className="text-right">Taux de clic</TableHead>
              <TableHead className="text-center">Pos.</TableHead>
              <TableHead className="w-20">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {mergedRows.map((row, i) => {
              const clicksColor = !row.hasGSC
                ? "text-muted-foreground"
                : row.clicks > 50
                  ? "text-success font-bold"
                  : row.clicks >= 10
                    ? "text-warning font-bold"
                    : "text-destructive font-bold";

              const posColor = row.position === null
                ? ""
                : row.position <= 3
                  ? "bg-success text-white"
                  : row.position <= 10
                    ? "bg-warning text-white"
                    : "bg-destructive text-white";

              const catClass = CATEGORY_COLORS[row.article.category] || "bg-muted text-muted-foreground";
              const catLabel = CATEGORY_LABELS[row.article.category] || ARTICLE_CATEGORIES[row.article.category] || row.article.category;

              return (
                <TableRow key={row.article.slug}>
                  <TableCell className="font-medium text-center">
                    {i + 1}
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
                    {row.hasGSC ? row.clicks : "·"}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {row.impressions.toLocaleString("fr-FR")}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {`${(row.ctr * 100).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} %`}
                  </TableCell>
                  <TableCell className="text-center">
                    {row.position !== null ? (
                      <Badge className={`text-xs ${posColor}`}>
                        {Math.round(row.position * 10) / 10}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground" title="Position lue pour les 25 premières pages seulement">·</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      asChild
                    >
                      <a
                        href={`/actualites/${row.article.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Optimiser <ExternalLink className="h-3 w-3 ml-1 inline" />
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
