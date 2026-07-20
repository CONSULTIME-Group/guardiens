/**
 * Carte admin : suivi de la complétude des critères durs d'affinité, côté
 * gardiens et propriétaires. Alimentée par la RPC
 * public.get_affinity_completeness_stats (accès admin uniquement).
 *
 * Objectif : suivre la progression après la campagne complete-affinity.
 */
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";

interface Stats {
  sitter_total: number;
  sitter_ready: number;
  sitter_pct: number;
  owner_total: number;
  owner_ready: number;
  owner_pct: number;
  generated_at?: string;
}

const AffinityCompletenessCard = () => {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await (supabase.rpc as any)(
        "get_affinity_completeness_stats",
      );
      if (cancelled) return;
      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }
      setStats(data as Stats);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          Complétude des critères d'affinité
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-24 w-full" />
        ) : error ? (
          <p className="text-sm text-muted-foreground">
            Impossible de charger les statistiques ({error}).
          </p>
        ) : stats ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Metric
              label="Gardiens avec critères durs remplis"
              pct={stats.sitter_pct}
              ready={stats.sitter_ready}
              total={stats.sitter_total}
              hint="animal_types ET work_during_sit"
            />
            <Metric
              label="Propriétaires avec présence attendue"
              pct={stats.owner_pct}
              ready={stats.owner_ready}
              total={stats.owner_total}
              hint="presence_expected"
            />
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
};

const Metric = ({
  label,
  pct,
  ready,
  total,
  hint,
}: {
  label: string;
  pct: number;
  ready: number;
  total: number;
  hint: string;
}) => (
  <div className="rounded-xl border border-border bg-card p-4">
    <p className="text-xs text-muted-foreground">{label}</p>
    <p className="text-2xl font-semibold mt-1 tabular-nums">
      {pct.toFixed(1)}%
    </p>
    <p className="text-xs text-muted-foreground mt-1 tabular-nums">
      {ready.toLocaleString("fr-FR")} sur {total.toLocaleString("fr-FR")}
    </p>
    <p className="text-[11px] text-muted-foreground mt-1 italic">{hint}</p>
    <div className="mt-3 h-2 bg-muted rounded-full overflow-hidden">
      <div
        className="h-full bg-primary transition-all"
        style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
      />
    </div>
  </div>
);

export default AffinityCompletenessCard;
