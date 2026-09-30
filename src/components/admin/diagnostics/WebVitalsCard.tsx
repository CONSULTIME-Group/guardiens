import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState, ErrorState, LoadingState } from "@/components/admin/ui";
import { summarizeVitals, type SummaryDevice, type VitalCell, type VitalRow } from "@/lib/webVitalsSummary";

const DEVICE_LABEL: Record<SummaryDevice, string> = { mobile: "Téléphone", tablet: "Tablette", desktop: "Ordinateur" };
const MAX_ROWS = 5000;

const fmt = (c: VitalCell) => (c.p75 == null ? "–" : `${c.p75} ms`);

export async function fetchWebVitalRows(): Promise<VitalRow[]> {
  const since = new Date(Date.now() - 7 * 86_400_000).toISOString();
  const { data, error } = await supabase
    .from("analytics_events")
    .select("metadata")
    .eq("event_type", "web_vital")
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(MAX_ROWS);
  if (error) throw error;
  return (data ?? []) as VitalRow[];
}

/** Carte « Vitesse ressentie » (lot P2b), 7 derniers jours, 75e centile. */
export default function WebVitalsCard() {
  const q = useQuery({ queryKey: ["admin", "web-vitals-7d"], queryFn: fetchWebVitalRows, staleTime: 5 * 60_000 });
  const summary = q.data ? summarizeVitals(q.data) : null;
  return (
    <Card>
      <CardHeader>
        <CardTitle>Vitesse ressentie</CardTitle>
        <CardDescription>
          7 derniers jours, 75e centile (3 visites sur 4 font mieux). Affichage principal (LCP), réactivité (INP), plus longue tâche des 10 premières secondes.
          {summary ? ` ${summary.measures.toLocaleString("fr-FR")} mesures.` : ""}
          {q.data && q.data.length >= MAX_ROWS ? ` Limité aux ${MAX_ROWS.toLocaleString("fr-FR")} plus récentes.` : ""}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {q.isLoading ? <LoadingState /> : q.isError ? <ErrorState onRetry={() => q.refetch()} /> : !summary || summary.paths.length === 0 ? (
          <EmptyState>Aucune mesure sur les 7 derniers jours.</EmptyState>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Page</TableHead>
                  <TableHead>Appareil</TableHead>
                  <TableHead className="text-right">Affichage</TableHead>
                  <TableHead className="text-right">Réactivité</TableHead>
                  <TableHead className="text-right">Plus longue tâche</TableHead>
                  <TableHead className="text-right">Mesures</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {summary.paths.flatMap((p) =>
                  (Object.keys(DEVICE_LABEL) as SummaryDevice[])
                    .filter((d) => Object.values(p.byDevice[d]).some((c) => c.count > 0))
                    .map((d) => {
                      const c = p.byDevice[d];
                      return (
                        <TableRow key={`${p.path}-${d}`}>
                          <TableCell className="font-mono text-xs">{p.path}</TableCell>
                          <TableCell>{DEVICE_LABEL[d]}</TableCell>
                          <TableCell className="text-right">{fmt(c.LCP)}</TableCell>
                          <TableCell className="text-right">{fmt(c.INP)}</TableCell>
                          <TableCell className="text-right">{fmt(c.LONG_TASK)}</TableCell>
                          <TableCell className="text-right">{Math.max(c.LCP.count, c.INP.count, c.LONG_TASK.count)}</TableCell>
                        </TableRow>
                      );
                    }),
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
