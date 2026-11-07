import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CollapsibleSection } from "@/pages/admin/_components/dashboard/CollapsibleSection";
import { ErrorState } from "@/components/admin/ui";
import {
  DRAFT_ATTRIBUTION_LIMITS, DRAFT_STOCK_LIMITS, loadDraftConversion, type ReminderDetail,
} from "@/lib/admin/draftReminderConversion";

const PERIODS = [
  { value: "30", label: "30 derniers jours", days: 30 },
  { value: "90", label: "90 derniers jours", days: 90 },
  { value: "all", label: "Depuis la première relance", days: null },
] as const;
const DETAIL_PAGE = 20;

const day = (iso: string | null) => (iso ? format(new Date(iso), "d MMM yyyy", { locale: fr }) : "–");
const pct = (v: number | null) => (v === null ? "–" : `${Math.round(v * 100)} %`);

function Stat({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="rounded-lg border bg-background px-3 py-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-xl font-semibold tabular-nums text-foreground">{typeof value === "number" ? value.toLocaleString("fr-FR") : value}</p>
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

function deliveryLabel(d: ReminderDetail): string {
  if (d.bounced) return "Non remise";
  if (d.clickedAt) return `Cliquée le ${day(d.clickedAt)}`;
  if (d.deliveredAt) return "Remise";
  return "Envoyée, remise non confirmée";
}

function publicationLabel(d: ReminderDetail): string {
  if (d.sitDeleted) return "Annonce supprimée";
  if (!d.sitId) return "Annonce non identifiée";
  if (!d.publishedAt) return d.mature ? "Pas de publication" : "Pas encore (moins de 7 jours)";
  if (d.attributed === "after_click") return `Publiée le ${day(d.publishedAt)}, après le clic`;
  if (d.attributed === "after_send") return `Publiée le ${day(d.publishedAt)}, sous 7 jours`;
  return `Publiée le ${day(d.publishedAt)}, hors fenêtre`;
}

/** Suivi des relances de brouillon : chargé à l'ouverture, aucune adresse email. */
export function DraftReminderConversionPanel() {
  const [open, setOpen] = useState(false);
  const [period, setPeriod] = useState<(typeof PERIODS)[number]["value"]>("30");
  const [shown, setShown] = useState(DETAIL_PAGE);
  const days = PERIODS.find(p => p.value === period)!.days;
  const query = useQuery({
    queryKey: ["admin-draft-reminder-conversion", period],
    queryFn: () => loadDraftConversion(supabase, days),
    enabled: open,
    staleTime: 5 * 60_000,
  });

  return (
    <CollapsibleSection title="Relances des brouillons : effet mesuré" onOpenChange={setOpen} testId="draft-reminder-conversion">
      {query.isError ? (
        <ErrorState detail="Suivi des relances de brouillon : lecture impossible, aucun chiffre affiché." onRetry={() => query.refetch()} />
      ) : !query.data ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">{[0, 1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}</div>
      ) : (() => {
        const { stock, campaign, details, warnings } = query.data;
        return (
          <div className="space-y-5 text-sm">
            <section className="space-y-2" aria-labelledby="draft-stock-title">
              <h3 id="draft-stock-title" className="font-medium text-foreground">Aujourd'hui</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <Stat label="Brouillons jamais publiés" value={stock.active} />
                <Stat label="Admissibles à une relance" value={stock.eligible} />
                <Stat label="Non relançables" value={stock.active - stock.eligible} />
              </div>
              {stock.reasons.length > 0 && (
                <ul className="grid sm:grid-cols-2 gap-x-6 gap-y-1 text-xs">
                  {stock.reasons.map(r => (
                    <li key={r.reason} className="flex justify-between gap-2">
                      <span className="text-muted-foreground">{r.label}</span>
                      <span className="font-medium tabular-nums">{r.count}</span>
                    </li>
                  ))}
                </ul>
              )}
              <p className="text-xs text-muted-foreground">{DRAFT_STOCK_LIMITS}</p>
            </section>

            <section className="space-y-2" aria-labelledby="draft-campaign-title">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 id="draft-campaign-title" className="font-medium text-foreground">Relances envoyées</h3>
                <Select value={period} onValueChange={v => { setPeriod(v as typeof period); setShown(DETAIL_PAGE); }}>
                  <SelectTrigger className="w-[230px]" aria-label="Période des relances"><SelectValue /></SelectTrigger>
                  <SelectContent>{PERIODS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <Stat label="Envoyées" value={campaign.sent} />
                <Stat label="Remises" value={campaign.delivered} hint={campaign.bounced ? `${campaign.bounced} non remise(s)` : undefined} />
                <Stat label="Cliquées" value={campaign.clicked} hint={`${pct(campaign.clickRate)} des remises`} />
                <Stat label="Publiées sous 7 jours" value={`${campaign.publishedSits} / ${campaign.remindedSits}`} hint={`annonces, dont ${campaign.publishedAfterClickSits} après un clic`} />
                <Stat label="Taux de publication" value={pct(campaign.conversionRate)} hint="relances de plus de 7 jours" />
              </div>
              {Object.keys(campaign.otherStatuses).length > 0 && (
                <p className="text-xs text-muted-foreground">
                  Autres traces sur la période :{" "}
                  {Object.entries(campaign.otherStatuses).map(([status, n]) => `${status} ${n}`).join(", ")} (reports, annulations ou refus, jamais comptés comme envois).
                </p>
              )}
              {warnings.length > 0 && (
                <ul role="status" className="rounded-md border border-warning/40 bg-warning/5 px-3 py-2 text-xs space-y-1">
                  {warnings.map(w => <li key={w}>{w}</li>)}
                </ul>
              )}
              <p className="text-xs text-muted-foreground">{DRAFT_ATTRIBUTION_LIMITS}</p>
            </section>

            {details.length > 0 && (
              <details className="rounded-lg border px-3 py-2">
                <summary className="cursor-pointer text-muted-foreground">Détail des relances ({details.length})</summary>
                <div className="mt-2 overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Envoi</TableHead>
                        <TableHead>Rang</TableHead>
                        <TableHead>Origine</TableHead>
                        <TableHead>Remise et clic</TableHead>
                        <TableHead>Publication</TableHead>
                        <TableHead>Annonce</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {details.slice(0, shown).map(d => (
                        <TableRow key={d.logId}>
                          <TableCell className="whitespace-nowrap">{day(d.sentAt)}</TableCell>
                          <TableCell>{d.stage === 2 ? "Seconde" : "Première"}</TableCell>
                          <TableCell>{d.source === "admin" ? "Admin" : "Automatique"}</TableCell>
                          <TableCell>{deliveryLabel(d)}</TableCell>
                          <TableCell>{publicationLabel(d)}</TableCell>
                          <TableCell className="max-w-[220px] truncate">
                            {d.sitId && !d.sitDeleted
                              ? <a className="underline hover:text-primary" href={`/admin/listings?sit=${d.sitId}`}>{d.title?.trim() || "Sans titre"}</a>
                              : "–"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                {shown < details.length && (
                  <Button variant="outline" size="sm" className="mt-2" onClick={() => setShown(n => n + DETAIL_PAGE)}>
                    Afficher {Math.min(DETAIL_PAGE, details.length - shown)} de plus
                  </Button>
                )}
              </details>
            )}
            <p className="text-[11px] text-muted-foreground">Lu le {format(query.dataUpdatedAt, "d MMMM yyyy à HH:mm", { locale: fr })}.</p>
          </div>
        );
      })()}
    </CollapsibleSection>
  );
}

export default DraftReminderConversionPanel;
