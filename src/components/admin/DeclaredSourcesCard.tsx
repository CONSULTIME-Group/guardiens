/**
 * Lot SRC4 (16/11/2026) : réponses à « Comment avez-vous connu Guardiens ? »,
 * lues par admin_declared_sources sur la même cohorte que « Inscriptions par canal ».
 */
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { reportAdminReadError, UNAVAILABLE_LABEL } from "@/lib/admin/readError";
import { declaredSourceLabel, normalizeDeclaredSourceRows } from "@/lib/declaredSource";

export function DeclaredSourcesCard({ range }: { range: { from: string; to: string } }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["admin-declared-sources", range.from, range.to],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data: rows, error } = await (supabase.rpc as any)("admin_declared_sources", { p_from: range.from, p_to: range.to });
      if (error) {
        reportAdminReadError("Comment ils nous ont connus", error);
        throw error;
      }
      return normalizeDeclaredSourceRows(rows);
    },
  });

  const rows = data ?? [];

  return (
    <Card data-testid="declared-sources-card">
      <CardHeader>
        <CardTitle className="text-base">Comment ils nous ont connus</CardTitle>
        <p className="text-xs text-muted-foreground">
          Réponse des membres à l'étape d'accueil (facultative, une seule réponse), suivie depuis le 16/11/2026. Elle complète le canal mesuré : partage privé, bouche à oreille, nom tapé après une vidéo.
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
          <p className="py-6 text-center text-sm text-muted-foreground">Aucune inscription sur la période.</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Réponse</TableHead>
                  <TableHead className="text-right">Inscrits</TableHead>
                  <TableHead className="text-right">Avec annonce publiée</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.answer} data-testid={`declared-source-${r.answer}`}>
                    <TableCell className="font-medium">{declaredSourceLabel(r.answer === "sans_reponse" ? null : r.answer)}</TableCell>
                    <TableCell className="text-right tabular-nums">{r.members}</TableCell>
                    <TableCell className="text-right tabular-nums">{r.with_published_sit}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default DeclaredSourcesCard;
