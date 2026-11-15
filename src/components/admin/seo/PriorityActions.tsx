import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import {
  SEO_ACTION_MIN_IMPRESSIONS,
  fmtInt,
  type SeoAction,
} from "@/lib/admin/seoMetrics";
import { frDay, recentActionsByPath, reviewDate, SEO_ACTION_LABELS, type SeoLogEntry } from "@/lib/admin/seoActionLog";
import { useLogSeoAction } from "@/hooks/useSeoActionLog";

interface PriorityActionsProps {
  /** Lot SEO-A : actions calculées sur la liste complète des pages Google (priorityActions). */
  actions: SeoAction[];
  /** Lot TRF-5 : journal des actions SEO ; une action faite attend sa relecture. */
  log?: SeoLogEntry[];
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

/** Nombre d'actions à faire montrées d'emblée ; le reste se déplie. */
const VISIBLE_TODO = 4;

/**
 * Articles indexables que Google montre souvent et sur lesquels on clique peu.
 * Lot TRF-5 (15/11/2026) : une action faite (titre réécrit, « Marquer traité »)
 * passe en tête avec sa date de relecture, quatre semaines plus tard, et sort
 * des actions à faire.
 */
const PriorityActions = ({ actions, log = [] }: PriorityActionsProps) => {
  const [showAll, setShowAll] = useState(false);
  const logAction = useLogSeoAction();
  const recent = recentActionsByPath(log);
  const pathOf = (a: SeoAction) => `/actualites/${a.article.slug}`;
  const treated = actions.filter((a) => recent.has(pathOf(a)));
  const todo = actions.filter((a) => !recent.has(pathOf(a)));
  const shown = showAll ? todo : todo.slice(0, VISIBLE_TODO);

  const markTreated = (a: SeoAction) => {
    logAction.mutate(
      { kind: "traite", path: pathOf(a), before: { impressions: a.impressions, clicks: a.clicks, position: a.position } },
      {
        onSuccess: () => toast.success(`Traité. Relecture le ${frDay(reviewDate(new Date().toISOString()))}.`),
        onError: (e) => toast.error(e instanceof Error ? e.message : "Enregistrement impossible"),
      },
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">À faire cette semaine</CardTitle>
        <p className="text-xs text-muted-foreground">
          Articles affichés au moins {SEO_ACTION_MIN_IMPRESSIONS} fois par Google, avec un taux de clic sous 1 %. Une action faite attend sa relecture, quatre semaines plus tard.
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
            {treated.map((item) => {
              const entry = recent.get(pathOf(item))!;
              return (
                <li key={item.article.slug} className="flex flex-col gap-1 py-2 border-b last:border-b-0" data-testid="seo-action-treated">
                  <div>
                    <Badge variant="outline" className="text-[10px] border-success/30 text-success bg-success/10">
                      Traité le {frDay(entry.created_at)}
                    </Badge>
                  </div>
                  <p className="text-sm font-medium">{item.article.title || item.article.slug}</p>
                  <p className="text-xs text-muted-foreground">
                    {SEO_ACTION_LABELS[entry.kind]}. Aujourd'hui : {reasonOf(item)}. Relecture le {frDay(reviewDate(entry.created_at))}.
                  </p>
                </li>
              );
            })}
            {shown.map((item) => {
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
                  <div className="flex gap-2 shrink-0 self-start sm:self-auto">
                    <Button variant="default" size="sm" className="min-h-11 sm:min-h-9 text-xs" asChild>
                      <a href={`/admin/articles?slug=${item.article.slug}`}>Titre et description</a>
                    </Button>
                    <Button variant="outline" size="sm" className="min-h-11 sm:min-h-9 text-xs" disabled={logAction.isPending} onClick={() => markTreated(item)}>
                      Marquer traité
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        {todo.length > VISIBLE_TODO && (
          <Button variant="link" className="min-h-11 px-0" onClick={() => setShowAll((v) => !v)} data-testid="seo-actions-more">
            {showAll ? "Réduire la liste" : `Voir les ${todo.length - VISIBLE_TODO} autres`}
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

export default PriorityActions;
