/**
 * AffinityOnboardingFunnelCard
 *
 * Carte de pilotage du funnel d'onboarding affinité. Les événements
 * réellement émis côté client sont `onboarding_started`,
 * `onboarding_completed`, `onboarding_dismissed` (métadonnées :
 * `role`, `completion`, `step_name` parmi fields/photo_bio/skills_lifestyle).
 * Il n'y a pas de `duration_seconds` : la durée moyenne est calculée à
 * partir de l'écart entre le premier `onboarding_started` et le
 * `onboarding_completed` d'un même utilisateur.
 *
 * Périmètre "comptes concernés" : profils créés depuis `applies_since` du
 * flag `mandatory_affinity_onboarding` (fallback : depuis `since`).
 */
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";

const KpiTile = ({ label, value }: { label: string; value: string | number }) => (
  <div className="rounded-lg border border-border bg-card p-3">
    <div className="text-xs text-muted-foreground">{label}</div>
    <div className="text-lg font-semibold text-foreground">{value}</div>
  </div>
);

const ROW_LIMIT = 20000;

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
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  const { data: events = [] } = useQuery({
    queryKey: ["affinity-funnel-events", since],
    queryFn: async () => {
      const { data } = await supabase
        .from("analytics_events")
        .select("event_type, user_id, metadata, created_at")
        .in("event_type", [
          "onboarding_started",
          "onboarding_completed",
          "onboarding_dismissed",
        ])
        .gte("created_at", since)
        .limit(ROW_LIMIT);
      return (data ?? []) as Array<{
        event_type: string;
        user_id: string | null;
        metadata: Record<string, unknown> | null;
        created_at: string;
      }>;

    },
  });

  const truncated = events.length >= ROW_LIMIT;

  const stats = useMemo(() => {
    const startedUsers = new Set<string>();
    const completedUsers = new Set<string>();
    const firstStartedAt = new Map<string, number>();
    const completedAt = new Map<string, number>();

    for (const e of events) {
      const uid =
        e.user_id ||
        (typeof (e.metadata as { user_id?: unknown } | null)?.user_id === "string"
          ? ((e.metadata as { user_id: string }).user_id)
          : null);
      if (!uid) continue;
      const ts = new Date(e.created_at).getTime();
      if (e.event_type === "onboarding_started") {
        startedUsers.add(uid);
        const prev = firstStartedAt.get(uid);
        if (prev === undefined || ts < prev) firstStartedAt.set(uid, ts);
      } else if (e.event_type === "onboarding_completed") {
        completedUsers.add(uid);
        const prev = completedAt.get(uid);
        if (prev === undefined || ts > prev) completedAt.set(uid, ts);
      }
    }

    const started = startedUsers.size;
    const completed = completedUsers.size;
    const abandoned = Math.max(0, started - completed);
    const abandonRate = started > 0 ? abandoned / started : 0;

    const durations: number[] = [];
    for (const [uid, endMs] of completedAt.entries()) {
      const startMs = firstStartedAt.get(uid);
      if (!startMs) continue;
      const d = (endMs - startMs) / 1000;
      if (d > 0 && d < 3600) durations.push(d);
    }
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
        {truncated && (
          <div className="mb-3 flex items-start gap-2 rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-warning-foreground">
            <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" aria-hidden="true" />
            <span>Données tronquées au-delà de {ROW_LIMIT.toLocaleString("fr-FR")} lignes, les chiffres peuvent sous-compter.</span>
          </div>
        )}
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
            Aucun événement `onboarding_started` sur cette période. Vérifiez que l'instrumentation est bien déployée.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
