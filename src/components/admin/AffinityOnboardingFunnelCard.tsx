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
import { reportAdminReadError, UNAVAILABLE_LABEL } from "@/lib/admin/readError";

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
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  // Lot A10 : agrégat SQL par personne, sans plafond.
  const { data: agg, isError } = useQuery({
    queryKey: ["affinity-funnel-agg", since],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_a10_affinity_onboarding_stats" as any, { p_since: since });
      if (error) { reportAdminReadError("Onboarding affinité", error); throw error; }
      return data as unknown as { started: number; completed: number; avg_duration_s: number | null };
    },
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  const truncated = false;
  const stats = useMemo(() => {
    const started = Number(agg?.started) || 0;
    const completed = Number(agg?.completed) || 0;
    const abandoned = Math.max(0, started - completed);
    return {
      started,
      completed,
      abandonRate: started > 0 ? abandoned / started : 0,
      avgDuration: agg?.avg_duration_s == null ? null : Number(agg.avg_duration_s),
    };
  }, [agg]);

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
            value={stats.avgDuration ? `${stats.avgDuration} s` : "·"}
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
