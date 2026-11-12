import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { EmptyState, ErrorState, KpiTile, LoadingState } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { logAdminAction } from "@/lib/admin/adminJournal";
import { reportAdminReadError } from "@/lib/admin/readError";
import {
  ADMIN_OUTING_FLAGS,
  ADMIN_OUTING_SOURCES,
  ADMIN_OUTING_STATE_LABEL,
  adminFillRate,
  adminOutingState,
  adminPlacesLabel,
  adminSourcesLabel,
  fetchAdminOutingsOverview,
  filterAdminOutings,
  lastSeenLabel,
  organizerAway,
  setAdminOutingHidden,
  type AdminOutingFilter,
  type AdminOutingRow,
} from "@/lib/admin/outingsAdmin";
import { OUTING_CATEGORIES, outingDateLabel } from "@/lib/outings";
import { cn } from "@/lib/utils";

const QUERY_KEY = ["admin-outings-overview"];

const STATE_TONE: Record<string, string> = {
  hidden: "bg-destructive/10 text-destructive",
  cancelled: "bg-muted text-muted-foreground",
  past: "bg-muted text-muted-foreground",
  full: "bg-pastel-honey text-pastel-honey-ink",
  open: "bg-pastel-sage text-pastel-sage-ink",
};

function categoryLabel(value: string): string {
  return OUTING_CATEGORIES.find((c) => c.value === value)?.label ?? value;
}

/**
 * Lot SORT5 : les sorties vues par un admin. Une lecture (admin_outings_overview)
 * pour les compteurs de pilotage et la liste ; masquer et rétablir passent par
 * une confirmation et laissent une ligne au journal.
 */
export default function AdminOutings() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<AdminOutingFilter>("all");
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      try {
        return await fetchAdminOutingsOverview();
      } catch (error) {
        reportAdminReadError("admin_outings_overview", error);
        throw error;
      }
    },
    staleTime: 60_000,
    retry: 1,
  });

  const rows = useMemo(() => filterAdminOutings(data?.outings ?? [], filter), [data, filter]);

  const toggleHidden = async (row: AdminOutingRow, hidden: boolean) => {
    const res = await setAdminOutingHidden(row.id, hidden);
    if (!res.ok) {
      toast.error(hidden ? "Masquage impossible pour le moment." : "Rétablissement impossible pour le moment.");
      return;
    }
    const logged = await logAdminAction({
      action: hidden ? "outing_hidden" : "outing_restored",
      targetType: "outing",
      targetId: row.id,
      metadata: { title: row.title, reports_open: row.reports_open },
    });
    const done = hidden ? "Sortie masquée" : "Sortie rétablie";
    if (logged.ok) toast.success(done);
    else toast.warning(`${done}, journal à compléter.`);
    await queryClient.invalidateQueries({ queryKey: QUERY_KEY });
  };

  const c = data?.counters;
  const fill = c ? adminFillRate(c) : null;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Sorties"
        description="Les sorties proposées par les membres, leurs inscrits et les alertes. Masquer retire une sortie des listes et de sa fiche."
      />

      {isLoading ? (
        <LoadingState />
      ) : isError || !data || !c ? (
        <ErrorState onRetry={() => refetch()} />
      ) : (
        <>
          <section aria-label="État des drapeaux" className="flex flex-wrap gap-2">
            {ADMIN_OUTING_FLAGS.map((f) => {
              const on = c.flags[f.key] === true;
              return (
                <span
                  key={f.key}
                  data-testid={`flag-${f.key}`}
                  className={cn(
                    "rounded-full px-3 py-1 text-xs font-medium",
                    on ? "bg-pastel-sage text-pastel-sage-ink" : "bg-muted text-muted-foreground",
                  )}
                >
                  {f.label} : {on ? "allumé" : "éteint"}
                </span>
              );
            })}
          </section>

          <section aria-label="Pilotage" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <KpiTile
              label="Sorties publiées"
              value={c.published_total}
              hint={`${c.published_30d} sur 30 jours, ${c.organizers} ${c.organizers > 1 ? "organisateurs" : "organisateur"}`}
            />
            <KpiTile
              label="Avec au moins un inscrit"
              value={c.with_attendee}
              hint={fill === null ? "Aucune sortie publiée" : `${fill} % des sorties publiées`}
            />
            <KpiTile
              label="« Je viens »"
              value={c.joins_total}
              hint={adminSourcesLabel(c.joins_by_source)}
            />
            <KpiTile
              label="Alertes posées"
              value={c.alerts_sent}
              hint={`${c.alerts_sent_7d} sur 7 jours, ${c.alerts_stopped} ${c.alerts_stopped > 1 ? "membres ont arrêté" : "membre a arrêté"} l'alerte`}
            />
            <KpiTile label="À venir, ouvertes" value={c.upcoming_open} />
            <KpiTile label="Annulées" value={c.cancelled} hint={`${c.left_total} places libérées par des inscrits`} />
            <KpiTile label="Masquées" value={c.hidden} tone={c.hidden > 0 ? "warning" : "default"} />
            <KpiTile
              label="Signalements ouverts"
              value={c.reports_open}
              tone={c.reports_open > 0 ? "destructive" : "default"}
              hint={<Link to="/admin/reports" className="underline">Ouvrir les signalements</Link>}
            />
          </section>

          <section aria-label="Origine des inscrits" className="rounded-xl border border-border bg-card p-4">
            <h2 className="font-heading text-base font-semibold">Origine des « Je viens »</h2>
            <dl className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {ADMIN_OUTING_SOURCES.map((s) => (
                <div key={s.value}>
                  <dt className="text-xs text-muted-foreground">{s.label}</dt>
                  <dd className="font-heading text-xl font-semibold tabular-nums">{Number(c.joins_by_source[s.value] ?? 0)}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section aria-label="Liste des sorties" className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-heading text-base font-semibold">
                {rows.length} {rows.length > 1 ? "sorties" : "sortie"}
              </h2>
              <ToggleGroup
                type="single"
                value={filter}
                onValueChange={(v) => v && setFilter(v as AdminOutingFilter)}
                variant="outline"
                size="sm"
                aria-label="Filtrer les sorties"
              >
                <ToggleGroupItem value="all">Toutes</ToggleGroupItem>
                <ToggleGroupItem value="upcoming">À venir</ToggleGroupItem>
                <ToggleGroupItem value="attention">À regarder</ToggleGroupItem>
              </ToggleGroup>
            </div>

            {rows.length === 0 ? (
              <EmptyState>
                {filter === "all" ? "Aucune sortie publiée pour le moment." : "Aucune sortie dans cette vue."}
              </EmptyState>
            ) : (
              <ul className="space-y-3">
                {rows.map((row) => {
                  const state = adminOutingState(row);
                  const away = organizerAway(row);
                  return (
                    <li key={row.id} data-testid="admin-outing-row" className="rounded-xl border border-border bg-card p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0 space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <Link to={`/sorties/${row.slug}`} className="font-medium text-foreground underline-offset-2 hover:underline">
                              {row.title}
                            </Link>
                            <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", STATE_TONE[state])}>
                              {ADMIN_OUTING_STATE_LABEL[state]}
                            </span>
                            {row.reports_open > 0 && (
                              <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive">
                                {row.reports_open} {row.reports_open > 1 ? "signalements" : "signalement"}
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {outingDateLabel(row.starts_at)} · {categoryLabel(row.category)}
                            {row.place_kind === "online" ? " · En ligne" : row.city ? ` · ${row.city}` : ""}
                          </p>
                          <p className="text-sm">
                            <span className="font-medium tabular-nums">{adminPlacesLabel(row)}</span> places prises ·{" "}
                            {adminSourcesLabel(row.sources)}
                            {row.alerts_sent > 0 ? ` · ${row.alerts_sent} ${row.alerts_sent > 1 ? "alertes posées" : "alerte posée"}` : ""}
                          </p>
                          <p className={cn("text-sm", away ? "text-destructive" : "text-muted-foreground")}>
                            Organisée par{" "}
                            <Link to={`/admin/users?user=${row.organizer_id}`} className="underline">
                              {row.organizer_first_name || "un membre"}
                            </Link>{" "}
                            · {lastSeenLabel(row.organizer_last_seen_at)}
                          </p>
                        </div>
                        {row.hidden_at ? (
                          <ConfirmDialog
                            trigger={<Button variant="outline" size="sm">Rétablir</Button>}
                            title="Rétablir cette sortie ?"
                            description={`« ${row.title} » revient dans les listes et sa fiche redevient lisible. Les signalements se traitent dans leur écran.`}
                            confirmLabel="Rétablir"
                            onConfirm={() => toggleHidden(row, false)}
                          />
                        ) : (
                          <ConfirmDialog
                            trigger={<Button variant="outline" size="sm">Masquer</Button>}
                            title="Masquer cette sortie ?"
                            description={`« ${row.title} » sort des listes et sa fiche se ferme. Les inscrits restent sans message : écrivez-leur si la sortie est maintenue ailleurs.`}
                            confirmLabel="Masquer"
                            destructive
                            onConfirm={() => toggleHidden(row, true)}
                          />
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}
