import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useFeatureFlag } from "@/hooks/useFeatureFlag";
import { NoApplicationsCard } from "@/components/admin/signals/NoApplicationsCard";
import { cn } from "@/lib/utils";

interface Signal {
  id: string;
  signal_type: string;
  severity: "critical" | "warning" | "info";
  entity_type: string;
  entity_id: string;
  detected_at: string;
  metadata: Record<string, unknown>;
}

interface Snapshot {
  signals: Signal[];
  generated_at: string;
}

const SEVERITY_STYLE: Record<Signal["severity"], string> = {
  critical: "bg-destructive/10 text-destructive border-destructive/30",
  warning: "bg-warning/10 text-warning-foreground border-warning/30",
  info: "bg-muted text-muted-foreground border-border",
};

function entityLink(s: Signal): string {
  switch (s.entity_type) {
    case "sit":
      return `/admin/listings`;
    case "mission":
      return `/admin/small-missions`;
    case "profile":
      return `/admin/users`;
    case "review":
      return `/admin/reviews`;
    case "report":
      return `/admin/reports`;
    default:
      return "/admin";
  }
}

export const SignalsSection = () => {
  const { enabled: flagEnabled, loading: flagLoading } = useFeatureFlag("admin_signals_active");

  const { data, isLoading, error } = useQuery<Snapshot>({
    queryKey: ["admin_dashboard_snapshot"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_dashboard_snapshot");
      if (error) throw error;
      return data as unknown as Snapshot;
    },
    enabled: flagEnabled,
    staleTime: 30_000,
  });

  if (flagLoading) return null;
  if (!flagEnabled) return null;

  const signals = (data?.signals ?? []).filter((s) => s.severity !== "info");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-heading flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-muted-foreground" aria-hidden />
          À traiter
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-14 rounded-lg" />
            <Skeleton className="h-14 rounded-lg" />
          </div>
        ) : error ? (
          <p className="text-sm text-destructive">
            Chargement des signaux impossible. Réessayez plus tard.
          </p>
        ) : signals.length === 0 ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CheckCircle2 className="h-4 w-4 text-success" aria-hidden />
            Tout est calme, aucun signal ouvert.
          </div>
        ) : (
          <ul className="space-y-2">
            {signals.map((s) => (
              <li key={s.id}>
                {s.signal_type === "no_applications" ? (
                  <NoApplicationsCard signal={s as unknown as import("@/components/admin/signals/NoApplicationsCard").AdminSignal} />
                ) : (
                  <Link
                    to={entityLink(s)}
                    className="flex items-start gap-3 rounded-lg border p-3 hover:bg-accent/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <Badge
                      variant="outline"
                      className={cn("text-[10px] uppercase tracking-wide", SEVERITY_STYLE[s.severity])}
                    >
                      {s.severity === "critical" ? "Critique" : "À traiter"}
                    </Badge>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {(s.metadata?.title as string | undefined) ?? s.signal_type.replace(/_/g, " ")}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {s.entity_type} · {new Date(s.detected_at).toLocaleString("fr-FR")}
                      </p>
                    </div>
                  </Link>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
};
