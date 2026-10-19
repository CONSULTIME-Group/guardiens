/**
 * Lot P2 (arène du 19/10/2026) : abandons à l'étape 0 « L'essentiel » de la
 * création d'annonce, par dernier champ touché, sur 30 jours. Lecture seule
 * de analytics_events (sits_create_abandoned, étape 0), paginée.
 */
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { fetchAllRows } from "@/lib/admin/fetchAllRows";
import { reportAdminReadError, UNAVAILABLE_LABEL } from "@/lib/admin/readError";
import { aggregateStep0Abandons } from "@/lib/sitCreateAbandon";

export function Step0AbandonsCard() {
  const since = useMemo(() => new Date(Date.now() - 30 * 86_400_000).toISOString(), []);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["admin-step0-abandons", since],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      try {
        const res = await fetchAllRows<{ metadata: Record<string, unknown> | null }>((from, to) =>
          supabase
            .from("analytics_events")
            .select("metadata")
            .eq("event_type", "sits_create_abandoned")
            .eq("metadata->>step", "0")
            .gte("created_at", since)
            .order("created_at", { ascending: false })
            .order("id", { ascending: true })
            .range(from, to) as unknown as PromiseLike<{ data: Array<{ metadata: Record<string, unknown> | null }> | null; error: unknown }>,
        );
        return { rows: aggregateStep0Abandons(res.rows.map((r) => r.metadata)), truncated: res.truncated };
      } catch (error) {
        reportAdminReadError("Abandons à l'étape 0", error);
        throw error;
      }
    },
  });

  const rows = data?.rows ?? [];
  const total = rows.reduce((n, r) => n + r.count, 0);

  return (
    <Card data-testid="step0-abandons-card">
      <CardHeader>
        <CardTitle className="text-base">Abandons à l'étape 0, par dernier champ touché, 30 jours</CardTitle>
        <p className="text-xs text-muted-foreground">
          Création d'annonce quittée à l'étape « L'essentiel » sans publication (sits_create_abandoned). Le champ indiqué est le dernier touché avant la sortie ; la colonne Brouillon compte les sorties après un enregistrement réussi du brouillon.
        </p>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="py-8 flex items-center justify-center text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : isError ? (
          <p className="py-6 text-center text-sm text-destructive">{UNAVAILABLE_LABEL}</p>
        ) : rows.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Aucun abandon à l'étape 0 sur 30 jours.</p>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Dernier champ touché</TableHead>
                  <TableHead className="text-right">Abandons</TableHead>
                  <TableHead className="text-right">Part</TableHead>
                  <TableHead className="text-right">Brouillon enregistré</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.bucket}>
                    <TableCell className="text-sm">{r.label}</TableCell>
                    <TableCell className="text-right tabular-nums">{r.count.toLocaleString("fr-FR")}</TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">
                      {total > 0 ? `${Math.round((r.count / total) * 100)} %` : "·"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {r.bucket === "before_measure" ? "·" : r.draftSaved.toLocaleString("fr-FR")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <p className="mt-2 text-xs text-muted-foreground">
              {total.toLocaleString("fr-FR")} abandons à l'étape 0. Un même membre peut sortir plusieurs fois.
              {data?.truncated ? " Données partielles : plafond de lecture atteint." : ""}
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default Step0AbandonsCard;
