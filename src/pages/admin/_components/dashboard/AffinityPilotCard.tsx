/**
 * Carte admin : pilotage du score d'affinité.
 *
 * Affiche la distribution des impressions (badges affichés vs masqués),
 * la médiane des scores, et la répartition par contexte (sit_detail,
 * public_profile, search_listing, favorites).
 *
 * Source : `analytics_events` event_type = 'affinity_badge_seen' sur 30 jours.
 *
 * Sert à décider :
 *  - faut-il abaisser/relever le seuil de 40 % ?
 *  - quelles surfaces génèrent le plus de matches ?
 *  - le CTA `_missing` est-il vu ?
 */
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";

interface Stats {
  total: number;
  displayed: number;
  hidden: number;
  missing: number;
  buckets: { label: string; count: number }[];
  byContext: { context: string; count: number }[];
  hiddenReasons: { reason: string; count: number }[];
}

const SCORE_BUCKETS = [
  { label: "40–49", min: 40, max: 49 },
  { label: "50–59", min: 50, max: 59 },
  { label: "60–69", min: 60, max: 69 },
  { label: "70–79", min: 70, max: 79 },
  { label: "80–89", min: 80, max: 89 },
  { label: "90–100", min: 90, max: 100 },
];

export const AffinityPilotCard = () => {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const since = new Date();
      since.setDate(since.getDate() - 30);

      const { data, error } = await supabase
        .from("analytics_events")
        .select("metadata")
        .eq("event_type", "affinity_badge_seen")
        .gte("created_at", since.toISOString())
        .limit(10000);

      if (error || !data) {
        setStats({ total: 0, displayed: 0, hidden: 0, missing: 0, buckets: [], byContext: [], hiddenReasons: [] });
        setLoading(false);
        return;
      }

      let displayed = 0;
      let hidden = 0;
      let missing = 0;
      const bucketCounts = SCORE_BUCKETS.map((b) => ({ label: b.label, count: 0 }));
      const ctxMap = new Map<string, number>();
      const reasonMap = new Map<string, number>();

      for (const row of data) {
        const m: any = row.metadata ?? {};
        const ctx = String(m.context ?? "unknown");
        ctxMap.set(ctx, (ctxMap.get(ctx) ?? 0) + 1);

        if (ctx.endsWith("_missing")) {
          missing++;
          continue;
        }
        if (m.displayed === false) {
          hidden++;
          const reason = String(m.hidden_reason ?? "unknown");
          reasonMap.set(reason, (reasonMap.get(reason) ?? 0) + 1);
          continue;
        }
        displayed++;
        const score = Number(m.score ?? 0);
        for (let i = 0; i < SCORE_BUCKETS.length; i++) {
          const b = SCORE_BUCKETS[i];
          if (score >= b.min && score <= b.max) {
            bucketCounts[i].count++;
            break;
          }
        }
      }

      setStats({
        total: data.length,
        displayed,
        hidden,
        missing,
        buckets: bucketCounts,
        byContext: Array.from(ctxMap.entries())
          .map(([context, count]) => ({ context, count }))
          .sort((a, b) => b.count - a.count),
        hiddenReasons: Array.from(reasonMap.entries())
          .map(([reason, count]) => ({ reason, count }))
          .sort((a, b) => b.count - a.count),
      });
      setLoading(false);
    };
    void load();
  }, []);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pilotage du score d'affinité (30 j)</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!stats || stats.total === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pilotage du score d'affinité (30 j)</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Aucune donnée sur les 30 derniers jours.</p>
        </CardContent>
      </Card>
    );
  }

  const maxBucket = Math.max(1, ...stats.buckets.map((b) => b.count));
  const visibilityRate =
    stats.displayed + stats.hidden > 0
      ? Math.round((stats.displayed / (stats.displayed + stats.hidden)) * 100)
      : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Pilotage du score d'affinité (30 j)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Metric label="Impressions totales" value={stats.total} />
          <Metric label="Badges affichés" value={stats.displayed} hint={`${visibilityRate}% des scores calculés`} />
          <Metric label="Scores masqués" value={stats.hidden} hint="seuil ou critères" />
          <Metric label="CTA « compléter »" value={stats.missing} hint="profil incomplet" />
        </div>

        <div>
          <p className="text-xs font-medium text-foreground mb-2">Distribution des scores affichés</p>
          <div className="space-y-1.5">
            {stats.buckets.map((b) => (
              <div key={b.label} className="flex items-center gap-3 text-xs">
                <span className="w-14 text-muted-foreground">{b.label}</span>
                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary"
                    style={{ width: `${(b.count / maxBucket) * 100}%` }}
                  />
                </div>
                <span className="w-10 text-right tabular-nums">{b.count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <p className="text-xs font-medium text-foreground mb-2">Par surface</p>
            <ul className="space-y-1 text-xs">
              {stats.byContext.slice(0, 8).map((c) => (
                <li key={c.context} className="flex justify-between text-muted-foreground">
                  <span className="truncate">{c.context}</span>
                  <span className="tabular-nums">{c.count}</span>
                </li>
              ))}
            </ul>
          </div>
          {stats.hiddenReasons.length > 0 && (
            <div>
              <p className="text-xs font-medium text-foreground mb-2">Raisons de masquage</p>
              <ul className="space-y-1 text-xs">
                {stats.hiddenReasons.map((r) => (
                  <li key={r.reason} className="flex justify-between text-muted-foreground">
                    <span>{labelReason(r.reason)}</span>
                    <span className="tabular-nums">{r.count}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

const Metric = ({ label, value, hint }: { label: string; value: number; hint?: string }) => (
  <div className="rounded-xl border border-border bg-card p-3">
    <p className="text-[11px] text-muted-foreground">{label}</p>
    <p className="text-xl font-semibold mt-0.5 tabular-nums">{value.toLocaleString("fr-FR")}</p>
    {hint && <p className="text-[10px] text-muted-foreground mt-0.5">{hint}</p>}
  </div>
);

function labelReason(r: string): string {
  switch (r) {
    case "below_threshold":
      return "Sous le seuil (40 %)";
    case "too_few_criteria":
      return "Moins de 3 critères communs";
    case "disqualified":
      return "Disqualification (allergie, refus)";
    default:
      return r;
  }
}

export default AffinityPilotCard;
