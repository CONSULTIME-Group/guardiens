import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { CollapsibleSection } from "@/pages/admin/_components/dashboard/CollapsibleSection";
import { EmptyState, ErrorState, LoadingState } from "@/components/admin/ui";
import { adminLabel, SIT_STATUS_LABELS, EMPTY_TABLE_VALUE } from "@/lib/admin/labels";

interface ExitRow {
  transition: string;
  motif: string;
  libelle: string;
  n: number;
  proprios: number;
  candidatures_perdues: number;
  derniere: string;
}

type Window = 7 | 30 | 90;

/** « published>cancelled » devient « Publiée vers Annulée ». */
function transitionLabel(t: string): string {
  const parts = t.split(/\s*(?:->|>|→|,)\s*/).filter(Boolean);
  if (parts.length === 2) return `${adminLabel(parts[0], SIT_STATUS_LABELS)} vers ${adminLabel(parts[1], SIT_STATUS_LABELS)}`;
  return adminLabel(t, SIT_STATUS_LABELS);
}

/**
 * Lot A11 : bloc « Pourquoi les annonces sortent », déplacé de l'ancienne
 * page Lifecycle vers la page Annonces, replié par défaut. Lecture de
 * sit_status_history via la RPC admin, chargée à l'ouverture.
 */
export const ListingExitsSection = () => {
  const [open, setOpen] = useState(false);
  const [windowDays, setWindowDays] = useState<Window>(30);
  const [rows, setRows] = useState<ExitRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(false);
      const { data, error } = await supabase.rpc("admin_sit_exit_reasons" as any, { p_days: windowDays });
      if (cancelled) return;
      if (error) {
        setError(true);
        setRows([]);
      } else {
        const r = ((data as any[]) || []).map((x) => ({
          transition: x.transition ?? "",
          motif: x.motif ?? "",
          libelle: x.libelle ?? "",
          n: Number(x.n) || 0,
          proprios: Number(x.proprios) || 0,
          candidatures_perdues: Number(x.candidatures_perdues) || 0,
          derniere: x.derniere ?? "",
        })) as ExitRow[];
        r.sort((a, b) => b.candidatures_perdues - a.candidatures_perdues);
        setRows(r);
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [open, windowDays]);

  return (
    <CollapsibleSection title="Pourquoi les annonces sortent" onOpenChange={setOpen}>
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-muted-foreground">
            Ce que les propriétaires déclarent quand leur annonce quitte la plateforme, et les candidatures que ces sorties emportent.
          </p>
          <ToggleGroup type="single" value={String(windowDays)} onValueChange={(v) => v && setWindowDays(Number(v) as Window)} variant="outline" size="sm">
            <ToggleGroupItem value="7">7 j</ToggleGroupItem>
            <ToggleGroupItem value="30">30 j</ToggleGroupItem>
            <ToggleGroupItem value="90">90 j</ToggleGroupItem>
          </ToggleGroup>
        </div>
        {loading ? (
          <LoadingState />
        ) : error ? (
          <ErrorState />
        ) : rows.length === 0 ? (
          <EmptyState>Aucune annonce n'est sortie sur ces {windowDays} jours.</EmptyState>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Passage</TableHead>
                <TableHead>Motif</TableHead>
                <TableHead className="text-right">Nombre</TableHead>
                <TableHead className="text-right hidden md:table-cell">Propriétaires</TableHead>
                <TableHead className="text-right">Candidatures perdues</TableHead>
                <TableHead className="text-right hidden md:table-cell">Dernière</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={`${r.transition}-${r.motif}`}>
                    <TableCell className="text-xs">{transitionLabel(r.transition)}</TableCell>
                    <TableCell className="text-sm">{r.libelle || adminLabel(r.motif)}</TableCell>
                    <TableCell className="text-right tabular-nums">{r.n}</TableCell>
                    <TableCell className="text-right tabular-nums hidden md:table-cell">{r.proprios}</TableCell>
                    <TableCell className="text-right tabular-nums">{r.candidatures_perdues}</TableCell>
                    <TableCell className="text-right tabular-nums hidden md:table-cell">
                      {r.derniere ? new Date(r.derniere).toLocaleDateString("fr-FR") : EMPTY_TABLE_VALUE}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </CollapsibleSection>
  );
};

export default ListingExitsSection;
