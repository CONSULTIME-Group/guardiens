/**
 * CronHealthCard : santé des crons edge, sourcée à 100 % de cron_run_log
 * via admin_cron_health (l'âge de la dernière exécution et le ratio
 * d'échecs 7 j proviennent de la même table de logs).
 *
 * Trois états calculés côté RPC :
 *  - ok : 0 échec sur 7 j et dernière exécution dans la fenêtre attendue
 *  - degraded : au moins 1 échec sur 7 j
 *  - critical : aucune exécution dans la fenêtre attendue (2x la périodicité
 *    déclarée du cron, convention historique du contrôle de fraîcheur)
 *
 * Affichage : une ligne de résumé, puis uniquement les crons dégradés ou
 * critiques. Les crons sains sont repliés derrière un accordéon fermé.
 *
 * Respecte le feature flag admin_signals_active.
 */
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useFeatureFlag } from "@/hooks/useFeatureFlag";
import { cn } from "@/lib/utils";

type CronState = "ok" | "degraded" | "critical";

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
  state: CronState;
}

const STATE_STYLE: Record<CronState, string> = {
  critical: "bg-destructive/10 text-destructive border-destructive/30",
  degraded: "bg-warning/10 text-warning-foreground border-warning/30",
  ok: "bg-muted text-muted-foreground border-border",
};

const STATE_LABEL: Record<CronState, string> = {
  critical: "Critique",
  degraded: "Dégradé",
  ok: "OK",
};

function formatAge(minutes: number | null): string {
  if (minutes == null) return "jamais exécuté";
  if (minutes < 1) return "à l'instant";
  if (minutes < 60) return `il y a ${Math.round(minutes)} min`;
  const h = Math.round(minutes / 60);
  if (h < 48) return `il y a ${h} h`;
  return `il y a ${Math.round(h / 24)} j`;
}

const pluralize = (n: number, one: string, many: string) => (n > 1 ? many : one);

const CronRow = ({ r }: { r: CronHealth }) => (
  <li className="flex items-start gap-3 rounded-lg border p-3">
    <Badge
      variant="outline"
      className={cn("text-[10px] uppercase tracking-wide shrink-0", STATE_STYLE[r.state])}
    >
      {STATE_LABEL[r.state]}
      {r.state === "critical" ? (
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
);

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
  const critical = rows.filter((r) => r.state === "critical");
  const degraded = rows.filter((r) => r.state === "degraded");
  const ok = rows.filter((r) => r.state === "ok");
  const attention = [...critical, ...degraded];

  const summary = `${ok.length} ${pluralize(ok.length, "cron", "crons")} OK, ${degraded.length} ${pluralize(degraded.length, "dégradé", "dégradés")}, ${critical.length} ${pluralize(critical.length, "critique", "critiques")}`;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-heading flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" aria-hidden />
          Santé des crons
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
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
        ) : (
          <>
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              {attention.length === 0 ? (
                <CheckCircle2 className="h-4 w-4 text-success shrink-0" aria-hidden />
              ) : (
                <AlertTriangle className="h-4 w-4 text-warning-foreground shrink-0" aria-hidden />
              )}
              {summary}
            </p>

            {attention.length > 0 && (
              <ul className="space-y-2">
                {attention.map((r) => (
                  <CronRow key={r.edge_name} r={r} />
                ))}
              </ul>
            )}

            {attention.length > 0 && ok.length > 0 && (
              <Accordion type="single" collapsible>
                <AccordionItem value="healthy" className="border-none">
                  <AccordionTrigger className="py-2 text-sm text-muted-foreground hover:no-underline">
                    Voir les {ok.length} crons sains
                  </AccordionTrigger>
                  <AccordionContent>
                    <ul className="space-y-2">
                      {ok.map((r) => (
                        <CronRow key={r.edge_name} r={r} />
                      ))}
                    </ul>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};
