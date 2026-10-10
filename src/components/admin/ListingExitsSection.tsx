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
  derniere: string;
}

type Window = 7 | 30 | 90;

/** « published>cancelled » devient « Publiée vers Annulée ». */
function transitionLabel(t: string): string {
  if (t === "Dépubliée par le propriétaire") return "Remise en brouillon";
  if (t === "Expirée sans gardien") return "Expirée";
  const parts = t.split(/\s*(?:->|>|→|,)\s*/).filter(Boolean);
  const label = parts.length === 2
    ? `${adminLabel(parts[0], SIT_STATUS_LABELS)} vers ${adminLabel(parts[1], SIT_STATUS_LABELS)}`
    : adminLabel(t, SIT_STATUS_LABELS);
  return label.replace(/Dépubliée par le propriétaire/g, "Remise en brouillon").replace(/Expirée sans gardien/g, "Expirée");
}

const REASON_LABELS: Record<string, string> = {
  found_offline: "Solution trouvée ailleurs",
  found_onplatform: "Gardien trouvé sur Guardiens",
  plans_changed: "Dates ou projets changés",
  no_relevant_apps: "Aucune candidature adaptée",
  other: "Autre raison déclarée",
  archived: "Archivage enregistré",
  expired: "Expiration enregistrée",
  cancelled: "Annulation enregistrée",
};

function reasonLabel(row: ExitRow): string {
  const reason = row.motif.trim();
  if (!reason || reason === "(non renseigné)") return "Motif non renseigné";
  return REASON_LABELS[reason] ?? (row.libelle || reason).replace(/^Texte libre\s*:?\s*/i, "").trim();
}

/**
 * Lot A11 : bloc « Retraits et clôtures récents », déplacé de l'ancienne
 * page Lifecycle vers la page Annonces, replié par défaut. Lecture de
 * sit_status_history via la RPC admin, chargée à l'ouverture.
 */
export const ListingExitsSection = () => {
  const [open, setOpen] = useState(false);
  const [windowDays, setWindowDays] = useState<Window>(30);
  const [rows, setRows] = useState<ExitRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);

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
          derniere: x.derniere ?? "",
        })) as ExitRow[];
        r.sort((a, b) => b.n - a.n || (Date.parse(b.derniere) || 0) - (Date.parse(a.derniere) || 0));
        setRows(r);
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [open, windowDays, retry]);

  return (
    <CollapsibleSection title="Retraits et clôtures récents" onOpenChange={setOpen}>
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-muted-foreground">
            L'historique compte des événements : une même annonce peut en avoir plusieurs. Le motif est celui enregistré à ce moment-là.
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
          <ErrorState onRetry={() => setRetry((n) => n + 1)} />
        ) : rows.length === 0 ? (
          <EmptyState>Aucun événement enregistré sur ces {windowDays} jours.</EmptyState>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Action enregistrée</TableHead>
                <TableHead>Motif enregistré</TableHead>
                <TableHead className="text-right">Événements</TableHead>
                <TableHead className="text-right">Dernier événement</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={`${r.transition}-${r.motif}`}>
                    <TableCell className="text-xs">{transitionLabel(r.transition)}</TableCell>
                    <TableCell className="text-sm">{reasonLabel(r)}</TableCell>
                    <TableCell className="text-right tabular-nums">{r.n}</TableCell>
                    <TableCell className="text-right tabular-nums">
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
