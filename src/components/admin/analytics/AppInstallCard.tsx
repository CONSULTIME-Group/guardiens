/**
 * Lot TRF-6 (15/11/2026) : installation de l'application, lue dans « Vue
 * d'ensemble » (rubrique Activation). Elle quitte l'onglet Entonnoir de
 * /admin/traffic, qui se resserre sur l'inscription.
 */
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { reportAdminReadError, UNAVAILABLE_LABEL } from "@/lib/admin/readError";

const EVENTS: [string, string][] = [
  ["pwa_install_suggestion_shown", "Propositions d'installation"],
  ["pwa_install_guide_viewed", "Consultations du guide"],
  ["pwa_installed", "Installations confirmées par le navigateur"],
  ["pwa_app_open", "Ouvertures en mode app"],
];

export function AppInstallCard({ days = 30 }: { days?: number }) {
  const { data, isError } = useQuery({
    queryKey: ["admin-app-install", days],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const until = new Date();
      const since = new Date(until.getTime() - days * 86_400_000);
      const { data: rows, error } = await supabase.rpc("admin_analytics_event_counts", {
        _since: since.toISOString(), _until: until.toISOString(), _role: null,
      } as never);
      if (error) { reportAdminReadError("Installation de l'application", error); throw error; }
      return new Map(((rows ?? []) as { event_type: string; cnt: number }[]).map((r) => [r.event_type, Number(r.cnt)]));
    },
  });

  return (
    <Card data-testid="app-install-card">
      <CardHeader><CardTitle className="text-base">Installation de Guardiens</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">{days} derniers jours, tous rôles.</p>
        {isError ? (
          <p className="text-sm text-destructive">{UNAVAILABLE_LABEL}</p>
        ) : (
          <dl className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {EVENTS.map(([event, label]) => (
              <div key={event}>
                <dt className="text-sm text-muted-foreground">{label}</dt>
                <dd className="text-2xl font-semibold tabular-nums">{data ? (data.get(event) ?? 0).toLocaleString("fr-FR") : "·"}</dd>
              </div>
            ))}
          </dl>
        )}
        <p className="text-xs text-muted-foreground">Les confirmations dépendent du navigateur : les installations manuelles sur iPhone s'ajoutent à part. Les ouvertures sont comptées une fois par session et par compte connecté.</p>
      </CardContent>
    </Card>
  );
}

export default AppInstallCard;
