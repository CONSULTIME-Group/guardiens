import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { fixRequestState, type PresentedError, type PriorResolution } from "@/lib/admin/errorPresentation";

interface Props {
  rows: PresentedError[];
  /** Lot ERR1 : récidive d'une famille déjà marquée résolue. */
  prior?: Map<string, PriorResolution>;
  loading: boolean;
  loadError: boolean;
  onRetry: () => void;
  onSelect: (row: PresentedError) => void;
}

export const NetworkErrorsSection = ({ rows, prior, loading, loadError, onRetry, onSelect }: Props) => (
  <Card>
    <CardHeader>
      <CardTitle className="text-lg">Dossiers réseau</CardTitle>
      <CardDescription>Les filtres et chiffres ci-dessus couvrent aussi ces dossiers.</CardDescription>
    </CardHeader>
    <CardContent className="p-0">
      {loadError ? <div className="p-8 text-center">Indisponible <Button variant="outline" onClick={onRetry}>Réessayer</Button></div>
        : loading ? <div className="p-8 text-center text-muted-foreground">Chargement…</div>
        : rows.length === 0 ? <div className="p-8 text-center text-muted-foreground">Aucun dossier réseau dans cette vue.</div>
        : <div className="overflow-x-auto"><Table>
          <TableHeader><TableRow>
            <TableHead>Statut</TableHead><TableHead>Route et requête</TableHead><TableHead>Situation</TableHead><TableHead>Occurrences</TableHead><TableHead>Dernière vue</TableHead><TableHead>Détail</TableHead>
          </TableRow></TableHeader>
          <TableBody>{rows.map(row => {
            const ctx = row.context ?? {};
            const status = typeof ctx.status === "number" ? ctx.status : null;
            return <TableRow key={row.id}>
              <TableCell><Badge variant={status && status >= 500 ? "destructive" : "secondary"}>{status ?? "Non renseigné"}</Badge></TableCell>
              <TableCell className="max-w-[400px] break-all text-xs">
                <p>{typeof ctx.route === "string" ? ctx.route : "Route non renseignée"}</p>
                <p className="text-muted-foreground">{typeof ctx.method === "string" ? ctx.method : ""} {typeof ctx.url === "string" ? ctx.url : row.message}</p>
              </TableCell>
              <TableCell className="max-w-[260px]">
                {row.refusalReason ? <><Badge variant="outline">Refus attendu</Badge><p className="mt-1 text-xs">{row.refusalReason}</p></>
                  : row.hostingReason ? <><Badge variant="outline">Hors du site</Badge><p className="mt-1 text-xs">{row.hostingReason}</p></>
                  : "Incident technique"}
                {prior?.get(row.id) && <p className="mt-1"><Badge variant="destructive">Récidive</Badge></p>}
                {fixRequestState(row) === "requested" && <p className="mt-1"><Badge variant="secondary">Confiée à Claude</Badge></p>}
                {fixRequestState(row) === "pr_opened" && <p className="mt-1"><Badge variant="outline">PR à fusionner</Badge></p>}
                {row.admin_notes && <p className="mt-1 text-xs line-clamp-2"><span className="font-medium">Note :</span> {row.admin_notes}</p>}
                {row.resolved_at && <p className="text-xs text-muted-foreground">Marqué résolu</p>}
              </TableCell>
              <TableCell>{row.occurrences}</TableCell>
              <TableCell className="text-xs">{formatDistanceToNow(new Date(row.last_seen_at), { addSuffix: true, locale: fr })}</TableCell>
              <TableCell><Button variant="outline" size="sm" onClick={() => onSelect(row)}>Détails</Button></TableCell>
            </TableRow>;
          })}</TableBody>
        </Table></div>}
    </CardContent>
  </Card>
);
export default NetworkErrorsSection;
