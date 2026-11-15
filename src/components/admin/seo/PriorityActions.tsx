import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2 } from "lucide-react";
import {
  SEO_ACTION_MIN_IMPRESSIONS,
  fmtInt,
  type SeoAction,
} from "@/lib/admin/seoMetrics";

interface PriorityActionsProps {
  /** Lot SEO-A : actions calculées sur la liste complète des pages Google (priorityActions). */
  actions: SeoAction[];
}

const KIND_CONFIG = {
  loin: { label: "Loin dans Google", badgeClass: "border-destructive/30 text-destructive bg-destructive/10" },
  titre: { label: "Titre à revoir", badgeClass: "border-warning/30 text-warning bg-warning-soft" },
} as const;

function reasonOf(a: SeoAction): string {
  const ctr = (a.ctr * 100).toLocaleString("fr-FR", { maximumFractionDigits: 1 });
  const base = `${fmtInt(a.impressions)} impressions, ${a.clicks} clic${a.clicks > 1 ? "s" : ""}, taux de clic ${ctr} %`;
  return a.position !== null ? `${base}, position ${Math.round(a.position)}` : base;
}

/**
 * Articles indexables que Google montre souvent et sur lesquels on clique peu,
 * une ligne par article, du plus vu au moins vu. Les articles sans impression
 * ont leur propre bloc (NoImpressionActionable).
 */
const PriorityActions = ({ actions }: PriorityActionsProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Actions prioritaires</CardTitle>
        <p className="text-xs text-muted-foreground">
          Articles affichés au moins {SEO_ACTION_MIN_IMPRESSIONS} fois par Google, avec un taux de clic sous 1 %. Les plus vus d'abord.
        </p>
      </CardHeader>
      <CardContent>
        {actions.length === 0 ? (
          <div className="flex items-center gap-3 p-4 rounded-lg bg-success/10 text-success" data-testid="seo-actions-empty">
            <CheckCircle2 className="h-5 w-5" />
            <span className="text-sm font-medium">Chaque article bien vu par Google est aussi cliqué.</span>
          </div>
        ) : (
          <ul className="space-y-3" data-testid="seo-actions">
            {actions.map((item) => {
              const config = KIND_CONFIG[item.kind];
              return (
                <li
                  key={item.article.slug}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3 py-2 border-b last:border-b-0"
                >
                  <div className="flex items-start sm:items-center gap-3 min-w-0">
                    <Badge variant="outline" className={`text-[10px] shrink-0 ${config.badgeClass}`}>
                      {config.label}
                    </Badge>
                    <div className="min-w-0">
                      <p className="text-sm font-medium sm:truncate">{item.article.title || item.article.slug}</p>
                      <p className="text-xs text-muted-foreground">{reasonOf(item)} · Search Console</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" className="shrink-0 min-h-11 sm:min-h-0 sm:h-7 text-xs self-start sm:self-auto" asChild>
                    <a href={`/admin/articles?slug=${item.article.slug}`}>Titre et description</a>
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
};

export default PriorityActions;
