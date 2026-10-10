import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CollapsibleSection } from "@/pages/admin/_components/dashboard/CollapsibleSection";
import { ErrorState } from "@/components/admin/ui";
import { canonicalSitStatuses, SIT_STATUS_SHORT_LABELS, isSitStatus, type SitStatus } from "@/lib/sitStatus";

type StatusCounts = Record<SitStatus, number>;

type PeriodStats = {
  label: string;
  since: Date | null;
  counts: StatusCounts;
};

/** Tous les statuts de l'enum, sans exception : un total partiel est un total faux. */
const STATUSES: SitStatus[] = canonicalSitStatuses();

const STATUS_COLORS: Partial<Record<SitStatus, string>> = {
  draft: "text-warning",
  published: "text-success",
  confirmed: "text-info",
  in_progress: "text-info",
  completed: "text-muted-foreground",
  cancelled: "text-destructive",
  archived: "text-muted-foreground",
  expired: "text-muted-foreground",
};

const buildPeriods = (): { label: string; since: Date | null }[] => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  return [
    { label: "Aujourd'hui", since: today },
    { label: "7 derniers jours", since: sevenDaysAgo },
    { label: "30 derniers jours", since: thirtyDaysAgo },
    { label: "Tout", since: null },
  ];
};

const emptyCounts = (): StatusCounts =>
  STATUSES.reduce((acc, s) => { acc[s] = 0; return acc; }, {} as StatusCounts);


export const DraftStatsPanel = () => {
  const [stats, setStats] = useState<PeriodStats[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [failed, setFailed] = useState(false);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    if (!open) return;
    const load = async () => {
      setLoading(true);
      setFailed(false);
      let anyError = false;
      const periods = buildPeriods();
      const results: PeriodStats[] = await Promise.all(
        periods.map(async (p) => {
          const counts = emptyCounts();
          const { data, error } = await supabase.rpc("admin_get_sits_status_counts" as any, {
            p_since: p.since ? p.since.toISOString() : null,
          });
          if (error) {
            console.error("admin_get_sits_status_counts:", error);
            anyError = true;
          } else {
            (data as Array<{ status: string; cnt: number }> | null)?.forEach((row) => {
              if (isSitStatus(row.status)) counts[row.status] = Number(row.cnt) || 0;
              else console.error("admin_get_sits_status_counts, statut inconnu :", row.status);
            });
          }
          return { label: p.label, since: p.since, counts };
        })
      );
      // Une période en échec ne s'affiche pas comme des zéros.
      setFailed(anyError);
      setStats(anyError ? null : results);
      setLoading(false);
    };
    load();
  }, [open, nonce]);

  return (
    <CollapsibleSection title="Répartition actuelle par date de création" onOpenChange={setOpen}>
      {failed ? <ErrorState detail="Répartition par période" onRetry={() => setNonce((n) => n + 1)} /> : renderBody()}
    </CollapsibleSection>
  );

  function renderBody() {
  if (loading || !stats) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-44 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">
        État actuel des annonces créées sur chaque période. Ce n'est pas un taux de conversion : une annonce peut avoir changé d'état plusieurs fois.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map((p) => {
          const total = STATUSES.reduce((sum, s) => sum + p.counts[s], 0);
          return (
            <Card key={p.label}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{p.label}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-foreground">{total}</span>
                  <span className="text-xs text-muted-foreground">annonces créées</span>
                </div>
                <div className="grid grid-cols-2 gap-x-3 gap-y-1 pt-1 text-xs">
                  {STATUSES.map((s) => (
                    <div key={s} className="flex justify-between">
                      <span className="text-muted-foreground">{SIT_STATUS_SHORT_LABELS[s]}</span>
                      <span className={`font-medium ${STATUS_COLORS[s] ?? "text-foreground"}`}>{p.counts[s]}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
  }
};

export default DraftStatsPanel;
