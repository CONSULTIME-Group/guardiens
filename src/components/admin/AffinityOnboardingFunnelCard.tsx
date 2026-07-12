/**
 * AffinityOnboardingFunnelCard
 *
 * Carte de pilotage du funnel d'onboarding affinité (events analytics_events
 * de type `affinity_onboarding_*`), scopée par période.
 *
 * Périmètre "comptes concernés" : profils créés depuis `applies_since` du
 * flag `mandatory_affinity_onboarding` (fallback : depuis `since`).
 */
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";

const KpiTile = ({ label, value }: { label: string; value: string | number }) => (
  <div className="rounded-lg border border-border bg-card p-3">
    <div className="text-xs text-muted-foreground">{label}</div>
    <div className="text-lg font-semibold text-foreground">{value}</div>
  </div>
);

export function AffinityOnboardingFunnelCard({ since }: { since: string }) {
  const { data: flag } = useQuery({
    queryKey: ["ff", "mandatory_affinity_onboarding"],
    queryFn: async () => {
      const { data } = await supabase
        .from("feature_flags")
        .select("applies_since")
        .eq("key", "mandatory_affinity_onboarding")
        .maybeSingle();
      return data as { applies_since: string | null } | null;
    },
    staleTime: 5 * 60_000,
  });

  const cohortSince = useMemo(
    () => (flag?.applies_since && new Date(flag.applies_since) > new Date(since)
      ? flag.applies_since
      : since),
    [flag?.applies_since, since],
  );

  const { data: cohortCount = 0 } = useQuery({
    queryKey: ["affinity-funnel-cohort", cohortSince],
    queryFn: async () => {
      const { count } = await supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .gte("created_at", cohortSince);
      return count ?? 0;
    },
  });

  const { data: events = [] } = useQuery({
    queryKey: ["affinity-funnel-events", since],
    queryFn: async () => {
      const { data } = await supabase
        .from("analytics_events")
        .select("event_type, user_id, metadata, created_at")
        .in("event_type", [
          "affinity_onboarding_started",
          "affinity_onboarding_completed",
          "affinity_onboarding_abandoned",
        ])
        .gte("created_at", since)
        .limit(20000);
      return (data ?? []) as Array<{
        event_type: string;
        user_id: string | null;
        metadata: Record<string, unknown> | null;
        created_at: string;
      }>;
    },
  });

  const stats = useMemo(() => {
    const startedUsers = new Set<string>();
    const completedUsers = new Set<string>();
    const durations: number[] = [];
    for (const e of events) {
      if (!e.user_id) continue;
      if (e.event_type === "affinity_onboarding_started") startedUsers.add(e.user_id);
      if (e.event_type === "affinity_onboarding_completed") {
        completedUsers.add(e.user_id);
        const d = (e.metadata as { duration_seconds?: number } | null)?.duration_seconds;
        if (typeof d === "number" && d > 0 && d < 3600) durations.push(d);
      }
    }
    const started = startedUsers.size;
    const completed = completedUsers.size;
    const abandoned = Math.max(0, started - completed);
    const abandonRate = started > 0 ? abandoned / started : 0;
    const avgDuration =
      durations.length > 0
        ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
        : null;
    return { started, completed, abandonRate, avgDuration };
  }, [events]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Funnel onboarding affinité</CardTitle>
        <p className="text-xs text-muted-foreground">
          Comptes créés depuis {new Date(cohortSince).toLocaleDateString("fr-FR")}, événements analytiques sur la période sélectionnée.
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <KpiTile label="Comptes concernés" value={cohortCount} />
          <KpiTile label="Started" value={stats.started} />
          <KpiTile label="Completed" value={stats.completed} />
          <KpiTile
            label="Taux d'abandon"
            value={`${(stats.abandonRate * 100).toFixed(1)} %`}
          />
          <KpiTile
            label="Durée moyenne"
            value={stats.avgDuration ? `${stats.avgDuration} s` : "–"}
          />
        </div>
        {stats.started === 0 && (
          <p className="mt-3 text-xs text-muted-foreground">
            Aucun événement `affinity_onboarding_started` sur cette période. Vérifiez que l'instrumentation est bien déployée.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
