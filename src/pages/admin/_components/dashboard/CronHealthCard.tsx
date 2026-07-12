/**
 * CronHealthCard : synthèse des exécutions récentes des crons edge
 * (flush-prerender-cache + nudge-*). Signal severity 'critical' quand
 * un cron a échoué 3 fois d'affilée ou n'a pas tourné depuis plus de
 * 2× son intervalle attendu.
 *
 * Respecte le feature flag admin_signals_active.
 */
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useFeatureFlag } from "@/hooks/useFeatureFlag";
import { cn } from "@/lib/utils";

interface CronHealth {
  edge_name: string;
  label: string;
  expected_interval_min: number;
  last_started_at: string | null;
  last_finished_at: string | null;
  last_status: "success" | "failed" | "partial" | null;
  last_error: string | null;
  age_minutes: number | null;
  runs_7d: number;
  failed_7d: number;
  failed_in_last_3: number;
  severity: "critical" | "warning" | "info";
}

const SEVERITY_STYLE: Record<CronHealth["severity"], string> = {
  critical: "bg-destructive/10 text-destructive border-destructive/30",
  warning: "bg-warning/10 text-warning-foreground border-warning/30",
  info: "bg-muted text-muted-foreground border-border",
};

function formatAge(minutes: number | null): string {
  if (minutes == null) return "jamais exécuté";
  if (minutes < 1) return "à l'instant";
  if (minutes < 60) return `il y a ${Math.round(minutes)} min`;
  const h = Math.round(minutes / 60);
  if (h < 48) return `il y a ${h} h`;
  return `il y a ${Math.round(h / 24)} j`;
}

export const CronHealthCard = () => {
  const { enabled: flagEnabled, loading: flagLoading } = useFeatureFlag("admin_signals_active");

  const { data, isLoading, error } = useQuery<CronHealth[]>({
    queryKey: ["admin_cron_health"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_cron_health");
      if (error) throw error;
      return (data as unknown as CronHealth[]) ?? [];
    },
    enabled: flagEnabled,
    staleTime: 30_000,
  });

  if (flagLoading || !flagEnabled) return null;

  const rows = data ?? [];
  const alerts = rows.filter((r) => r.severity !== "info");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-heading flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" aria-hidden />
          Santé des crons
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-12 rounded-lg" />
            <Skeleton className="h-12 rounded-lg" />
          </div>
        ) : error ? (
          <p className="text-sm text-destructive">
            Chargement des indicateurs crons impossible. Réessayez plus tard.
          </p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucune donnée disponible.</p>
        ) : alerts.length === 0 ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CheckCircle2 className="h-4 w-4 text-success" aria-hidden />
            Tous les crons tournent normalement.
          </div>
        ) : (
          <ul className="space-y-2">
            {alerts.map((r) => (
              <li
                key={r.edge_name}
                className="flex items-start gap-3 rounded-lg border p-3"
              >
                <Badge
                  variant="outline"
                  className={cn("text-[10px] uppercase tracking-wide shrink-0", SEVERITY_STYLE[r.severity])}
                >
                  {r.severity === "critical" ? "Critique" : "À surveiller"}
                  {r.severity === "critical" ? (
                    <AlertTriangle className="h-3 w-3 ml-1" aria-hidden />
                  ) : null}
                </Badge>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {r.label}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Dernière exécution : {formatAge(r.age_minutes)} ·
                    {" "}Statut : {r.last_status ?? "inconnu"} ·
                    {" "}Échecs 7 j : {r.failed_7d}/{r.runs_7d}
                  </p>
                  {r.last_error ? (
                    <p className="text-xs text-destructive mt-1 truncate">
                      {r.last_error}
                    </p>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
};
