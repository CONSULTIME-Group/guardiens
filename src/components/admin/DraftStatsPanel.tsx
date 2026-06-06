import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

type StatusCounts = {
  draft: number;
  published: number;
  confirmed: number;
  completed: number;
  cancelled: number;
};

type PeriodStats = {
  label: string;
  since: Date | null;
  counts: StatusCounts;
};

const STATUSES: (keyof StatusCounts)[] = ["draft", "published", "confirmed", "completed", "cancelled"];

const STATUS_COLORS: Record<keyof StatusCounts, string> = {
  draft: "text-warning",
  published: "text-success",
  confirmed: "text-info",
  completed: "text-muted-foreground",
  cancelled: "text-destructive",
};

const STATUS_LABELS: Record<keyof StatusCounts, string> = {
  draft: "Brouillons",
  published: "Publiées",
  confirmed: "Confirmées",
  completed: "Terminées",
  cancelled: "Annulées",
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

const emptyCounts = (): StatusCounts => ({ draft: 0, published: 0, confirmed: 0, completed: 0, cancelled: 0 });

export const DraftStatsPanel = () => {
  const [stats, setStats] = useState<PeriodStats[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const periods = buildPeriods();
      const results: PeriodStats[] = await Promise.all(
        periods.map(async (p) => {
          const counts = emptyCounts();
          const { data, error } = await supabase.rpc("admin_get_sits_status_counts" as any, {
            p_since: p.since ? p.since.toISOString() : null,
          });
          if (error) {
            console.error("admin_get_sits_status_counts:", error);
          } else {
            (data as Array<{ status: string; cnt: number }> | null)?.forEach((row) => {
              if (row.status in counts) counts[row.status as keyof StatusCounts] = Number(row.cnt) || 0;
            });
          }
          return { label: p.label, since: p.since, counts };
        })
      );
      setStats(results);
      setLoading(false);
    };
    load();
  }, []);

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
      <div className="flex items-baseline justify-between">
        <h2 className="font-body text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Brouillons & conversion
        </h2>
        <span className="text-xs text-muted-foreground">
          Suivi du passage brouillon → publié, par période de création.
        </span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map((p) => {
          const total = STATUSES.reduce((sum, s) => sum + p.counts[s], 0);
          const visible = total - p.counts.draft;
          const rate = total > 0 ? Math.round((visible / total) * 100) : 0;
          return (
            <Card key={p.label}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{p.label}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-warning">{p.counts.draft}</span>
                  <span className="text-xs text-muted-foreground">brouillons</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  Conversion : <span className="font-semibold text-foreground">{rate}%</span>
                  {" "}
                  <span className="opacity-70">({visible}/{total})</span>
                </div>
                <div className="grid grid-cols-2 gap-x-3 gap-y-1 pt-1 text-xs">
                  {STATUSES.filter((s) => s !== "draft").map((s) => (
                    <div key={s} className="flex justify-between">
                      <span className="text-muted-foreground">{STATUS_LABELS[s]}</span>
                      <span className={`font-medium ${STATUS_COLORS[s]}`}>{p.counts[s]}</span>
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
};

export default DraftStatsPanel;
