/**
 * Lot TRF-5 (15/11/2026, maquette validée) : ce qui freine l'inscription et la
 * première annonce, par ordre de volume, chaque ligne menant à l'écran concerné.
 * Sources : get_signup_funnel_metrics (blocages et échecs du formulaire) et
 * sits_create_abandoned (création d'annonce quittée à l'étape « L'essentiel »).
 */
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { reportAdminReadError, UNAVAILABLE_LABEL } from "@/lib/admin/readError";
import { buildBrakes, type BrakeInput } from "@/lib/admin/signupBrakes";

export function SignupBrakesCard({ days }: { days: number }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["admin-signup-brakes", days],
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<BrakeInput> => {
      const since = new Date(Date.now() - days * 86_400_000).toISOString();
      const [metrics, abandons] = await Promise.all([
        (supabase.rpc as any)("get_signup_funnel_metrics", { p_period_days: days }),
        supabase.from("analytics_events").select("id", { count: "exact", head: true }).eq("event_type", "sits_create_abandoned").gte("created_at", since),
      ]);
      if (metrics.error) { reportAdminReadError("Freins de l'inscription", metrics.error); throw metrics.error; }
      if (abandons.error) reportAdminReadError("Abandons de création d'annonce", abandons.error);
      const m = (metrics.data ?? {}) as { blocked_reasons?: { reason: string; volume: number }[]; failed_by_code?: { code: string; volume: number }[] };
      return { blocked: m.blocked_reasons ?? [], failed: m.failed_by_code ?? [], sitAbandons: abandons.count ?? 0 };
    },
  });

  const brakes = data ? buildBrakes(data) : [];

  return (
    <Card data-testid="signup-brakes">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Ce qui freine, par ordre de volume</CardTitle>
        <p className="text-xs text-muted-foreground">{days} derniers jours. Chaque ligne mène à l'écran concerné.</p>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="py-8 flex justify-center text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /></div>
        ) : isError ? (
          <p className="py-6 text-center text-sm text-destructive">{UNAVAILABLE_LABEL}</p>
        ) : brakes.length === 0 ? (
          <p className="py-4 text-sm text-muted-foreground">Aucun frein relevé sur la période.</p>
        ) : (
          <ul>
            {brakes.map((b) => (
              <li key={b.key} className="py-3 border-b last:border-b-0 space-y-1">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="text-sm font-semibold">{b.title}</p>
                  <p className="text-sm font-semibold tabular-nums">{b.volume.toLocaleString("fr-FR")}</p>
                </div>
                <p className="text-xs text-muted-foreground">{b.detail}</p>
                <a href={b.href} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center text-sm text-primary underline underline-offset-2">
                  {b.action}
                </a>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

export default SignupBrakesCard;
