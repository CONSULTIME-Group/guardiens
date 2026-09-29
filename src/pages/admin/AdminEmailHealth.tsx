import { adminLabel } from "@/lib/admin/labels";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { fetchAllRows } from "@/lib/admin/fetchAllRows";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createSeqGuard, ilikeContains } from "@/lib/admin/requestSeq";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";
import { reportAdminReadError, UNAVAILABLE_LABEL } from "@/lib/admin/readError";
import { OnboardingReminderCard } from "./_components/dashboard/OnboardingReminderCard";

// ---------------------- Types ----------------------
interface PipelineHealth {
  last_run_at: string | null;
  last_run_age_seconds: number | null;
  oldest_pending_age_seconds: number | null;
  stuck_rate_limit: boolean | null;
  retry_after_until: string | null;
  dlq_last_hour: number | null;
  failure_rate_1h: number | null;
  attempts_1h: number | null;
}

/** Lot A10 : tous les statuts connus, pour que la somme égale le total. */
export const SEND_STATUSES = [
  "sent", "failed", "dlq", "pending", "suppressed", "bounced",
  "deferred", "unsubscribed_category", "cancelled",
] as const;
export const SEND_STATUS_FR: Record<string, string> = {
  sent: "Envoyé", failed: "Échec", dlq: "Échec définitif", pending: "En attente",
  suppressed: "Adresse bloquée", bounced: "Rejeté par le serveur", deferred: "Différé",
  unsubscribed_category: "Catégorie désactivée", cancelled: "Annulé", other: "Autre statut",
};
export type SendCounts = Record<string, number> & { total: number };

export const DEFERRED_STATUS_FR: Record<string, string> = {
  pending: "En attente", sent: "Envoyé", failed: "Échec", expired: "Expiré",
  abandoned: "Abandonné", superseded: "Remplacé",
};
export interface DeferredCounts {
  byStatus: Record<string, number>;
  /** En attente dont l'heure prévue (scheduled_for) est dépassée de plus d'une heure. */
  lateCount: number;
  oldest_late_seconds: number | null;
}

/** Compte par statut, sans perdre de statut inconnu. */
export function countSendStatuses(statuses: string[]): SendCounts {
  const c: SendCounts = { total: 0 } as SendCounts;
  for (const st of SEND_STATUSES) c[st] = 0;
  c.other = 0;
  for (const st of statuses) {
    c.total++;
    if (st in c && st !== "total") c[st]++;
    else c.other++;
  }
  return c;
}

/** File différée : tous les statuts, alerte sur scheduled_for dépassé. */
export function summarizeDeferred(rows: { status: string; scheduled_for: string | null }[], now = Date.now()): DeferredCounts {
  const byStatus: Record<string, number> = {};
  let lateCount = 0;
  let oldest: number | null = null;
  for (const r of rows) {
    byStatus[r.status] = (byStatus[r.status] ?? 0) + 1;
    if (r.status === "pending" && r.scheduled_for) {
      const late = (now - new Date(r.scheduled_for).getTime()) / 1000;
      if (late > 3600) {
        lateCount++;
        if (oldest == null || late > oldest) oldest = late;
      }
    }
  }
  return { byStatus, lateCount, oldest_late_seconds: oldest };
}

interface PausedCampaign { id: string; subject: string; created_at: string; recipients_count: number | null; sent_count: number | null }

// ---------------------- Helpers ----------------------
const formatAge = (seconds: number | null): string => {
  if (seconds == null) return "jamais";
  if (seconds < 60) return `${Math.round(seconds)}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)} min`;
  if (seconds < 86400) return `${Math.round(seconds / 3600)} h`;
  return `${Math.round(seconds / 86400)} j`;
};

const StatCard = ({
  label,
  value,
  hint,
  tone = "muted",
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  tone?: "muted" | "success" | "warning" | "destructive";
}) => {
  const toneClass =
    tone === "destructive"
      ? "border-destructive/50"
      : tone === "warning"
        ? "border-warning-border"
        : tone === "success"
          ? "border-success/50"
          : "";
  const textClass =
    tone === "destructive"
      ? "text-destructive"
      : tone === "warning"
        ? "text-warning"
        : tone === "success"
          ? "text-success"
          : "text-foreground";
  return (
    <Card className={toneClass}>
      <CardContent className="pt-4 pb-3">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className={`text-2xl font-semibold mt-1 ${textClass}`}>{value}</div>
        {hint && <div className="text-[11px] text-muted-foreground mt-1">{hint}</div>}
      </CardContent>
    </Card>
  );
};

// ---------------------- Page ----------------------
const PAGE_SIZE = 25;

export default function AdminEmailHealth() {
  const [health, setHealth] = useState<PipelineHealth | null>(null);
  const [healthLoading, setHealthLoading] = useState(true);
  const [logs24h, setLogs24h] = useState<SendCounts | null>(null);
  const [logs7d, setLogs7d] = useState<SendCounts | null>(null);
  const [deferred, setDeferred] = useState<DeferredCounts | null>(null);
  const [pausedList, setPausedList] = useState<PausedCampaign[] | null>(null);
  const [showPaused, setShowPaused] = useState(false);
  const massPaused = pausedList?.length ?? 0;
  const [suppressedTotal, setSuppressedTotal] = useState<number>(0);
  const [suppressedList, setSuppressedList] = useState<
    { id: string; email: string; reason: string; created_at: string }[]
  >([]);
  const [suppressedPage, setSuppressedPage] = useState(0);
  const [suppressedSearch, setSuppressedSearch] = useState("");
  const [suppressedLoading, setSuppressedLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [partial, setPartial] = useState(false);

  // Pipeline health via view
  const fetchHealth = useCallback(async () => {
    setHealthLoading(true);
    // La vue n'est plus lisible par les comptes connectés (migration du
    // 02/08) : lecture via la fonction réservée aux admins.
    const { data, error } = await (supabase.rpc as any)("admin_email_pipeline_health");
    if (error) {
      toast.error("Impossible de charger l'état du pipeline");
    } else {
      const row = Array.isArray(data) ? data[0] : data;
      setHealth((row ?? null) as PipelineHealth | null);
    }
    setHealthLoading(false);
  }, []);

  // Aggregate send log by status for a window
  const fetchSendCounts = useCallback(
    async (sinceHours: number): Promise<SendCounts> => {
      const since = new Date(Date.now() - sinceHours * 3600 * 1000).toISOString();
      // Fetch minimal cols. Dedupe by message_id keeping latest status.
      // Lecture paginée (l'API coupe à 1 000 lignes), ordre stable
      // created_at desc puis id : la première ligne vue par message_id
      // reste la plus récente, comme avant.
      const { rows: data, truncated } = await fetchAllRows<any>((from, to) =>
        supabase
          .from("email_send_log")
          .select("message_id, id, status, created_at")
          .gte("created_at", since)
          .order("created_at", { ascending: false })
          .order("id", { ascending: false })
          .range(from, to),
      );
      if (truncated) setPartial(true);
      const seen = new Map<string, string>();
      (data || []).forEach((r: any) => {
        const key = r.message_id || r.id;
        if (!seen.has(key)) seen.set(key, r.status);
      });
      return countSendStatuses([...seen.values()]);
    },
    [],
  );

  const fetchDeferred = useCallback(async (): Promise<DeferredCounts> => {
    const { rows: data, truncated } = await fetchAllRows<any>((from, to) =>
      supabase
        .from("email_deferred_queue")
        .select("status, scheduled_for, created_at")
        .order("id", { ascending: true })
        .range(from, to),
    );
    if (truncated) setPartial(true);
    return summarizeDeferred(data || []);
  }, []);

  const fetchMassPaused = useCallback(async () => {
    const { data, error } = await supabase
      .from("mass_emails")
      .select("id, subject, created_at, recipients_count, sent_count")
      .eq("status", "paused")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as PausedCampaign[];
  }, []);

  const suppressedSeq = useRef(createSeqGuard());
  const fetchSuppressed = useCallback(
    async (page: number, search: string) => {
      const token = suppressedSeq.current.next();
      setSuppressedLoading(true);
      const term = search.trim();
      let countQuery = supabase
        .from("suppressed_emails")
        .select("id", { count: "exact", head: true });
      if (term) countQuery = countQuery.ilike("email", ilikeContains(term));
      const { count: totalCount } = await countQuery;

      let listQuery = supabase
        .from("suppressed_emails")
        .select("id, email, reason, created_at")
        .order("created_at", { ascending: false })
        .order("id", { ascending: true })
        .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);
      if (term) listQuery = listQuery.ilike("email", ilikeContains(term));
      const { data, error } = await listQuery;
      if (!suppressedSeq.current.isCurrent(token)) return;
      if (error) toast.error("Erreur lors du chargement des désabonnés");
      setSuppressedList((data as any) || []);
      setSuppressedTotal(totalCount ?? 0);
      setSuppressedLoading(false);
    },
    [],
  );

  const refreshAll = useCallback(async () => {
    setRefreshing(true);
    setPartial(false);
    try {
      const [a, b, def, mp] = await Promise.all([
        fetchSendCounts(24),
        fetchSendCounts(24 * 7),
        fetchDeferred(),
        fetchMassPaused(),
      ]);
      setLogs24h(a);
      setLogs7d(b);
      setDeferred(def);
      setPausedList(mp);
      await fetchHealth();
    } catch (e: any) {
      reportAdminReadError("Santé email", e);
    } finally {
      setRefreshing(false);
    }
  }, [fetchSendCounts, fetchDeferred, fetchMassPaused, fetchHealth]);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  // Recherche différée de 300 ms, comme la liste des utilisateurs.
  const [suppressedSearchDebounced, setSuppressedSearchDebounced] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setSuppressedSearchDebounced(suppressedSearch), 300);
    return () => clearTimeout(t);
  }, [suppressedSearch]);

  useEffect(() => {
    fetchSuppressed(suppressedPage, suppressedSearchDebounced);
  }, [fetchSuppressed, suppressedPage, suppressedSearchDebounced]);

  // Pipeline tones
  // Le worker est event-driven : un âge élevé quand les files sont vides est normal.
  // Cette carte reste informative ; seule oldestPendingTone reflète un vrai backlog.
  const lastRunTone: "muted" = "muted";


  const failureRateTone = useMemo<"success" | "warning" | "destructive" | "muted">(() => {
    if (!health || health.failure_rate_1h == null) return "muted";
    if (health.failure_rate_1h > 0.3) return "destructive";
    if (health.failure_rate_1h > 0.1) return "warning";
    return "success";
  }, [health]);

  const oldestPendingTone = useMemo<"success" | "warning" | "destructive" | "muted">(() => {
    if (!health || health.oldest_pending_age_seconds == null) return "success";
    if (health.oldest_pending_age_seconds > 900) return "destructive";
    if (health.oldest_pending_age_seconds > 300) return "warning";
    return "success";
  }, [health]);

  const stuckTone: "destructive" | "success" | "muted" = health?.stuck_rate_limit
    ? "destructive"
    : health
      ? "success"
      : "muted";

  const dlqTone = (health?.dlq_last_hour ?? 0) > 0 ? "destructive" : "success";

  const failureRate7d =
    logs7d && logs7d.total > 0
      ? ((logs7d.failed + logs7d.dlq + logs7d.bounced) / logs7d.total) * 100
      : 0;

  const deferredPendingLate = (deferred?.lateCount ?? 0) > 0;

  const suppressedPageCount = Math.max(1, Math.ceil(suppressedTotal / PAGE_SIZE));

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      {partial && (
        <p className="text-xs text-warning">Données partielles : plafond de 50 000 lignes atteint.</p>
      )}
      <AdminPageHeader
        title="Santé email"
        description="Délivrabilité, différés, campagnes et désabonnés, en un seul écran."
        actions={<Button variant="outline" size="sm" onClick={refreshAll} disabled={refreshing}>
          {refreshing ? "Rafraîchissement…" : "Rafraîchir"}
        </Button>}
      />

      {/* 1. Pipeline */}
      <section className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
          Pipeline d'envoi
        </h2>
        {healthLoading ? (
          <p className="text-sm text-muted-foreground">Chargement…</p>
        ) : health ? (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <StatCard
              label="Dernier passage du worker (file d'authentification)"
              value={formatAge(health.last_run_age_seconds)}
              hint={
                health.last_run_at
                  ? format(new Date(health.last_run_at), "d MMM HH:mm", { locale: fr })
                  : "aucun run"
              }
              tone={lastRunTone}
            />
            <StatCard
              label="Plus vieux message en attente"
              value={formatAge(health.oldest_pending_age_seconds)}
              hint="File d'envoi (connexion et transactionnel)"
              tone={oldestPendingTone}
            />
            <StatCard
              label="Taux d'échec (1h)"
              value={
                health.failure_rate_1h == null
                  ? "·"
                  : `${Math.round(health.failure_rate_1h * 100)}%`
              }
              hint={`${health.attempts_1h ?? 0} tentative${(health.attempts_1h ?? 0) > 1 ? "s" : ""}`}
              tone={failureRateTone}
            />
            <StatCard
              label="Rate limit bloqué"
              value={health.stuck_rate_limit ? "Oui" : "Non"}
              hint={
                health.retry_after_until
                  ? `jusqu'à ${format(new Date(health.retry_after_until), "HH:mm", { locale: fr })}`
                  : "429 non actif"
              }
              tone={stuckTone}
            />
            <StatCard
              label="Abandonnés, dernière heure"
              value={health.dlq_last_hour ?? 0}
              hint="Échecs définitifs après 5 tentatives"
              tone={dlqTone}
            />
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Aucune donnée.</p>
        )}
      </section>

      {/* 2. Envois */}
      <section className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
          Envois (email_send_log)
        </h2>
        <Card>
          <CardContent className="pt-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">24h</TableHead>
                  <TableHead className="text-right">7 jours</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {([...SEND_STATUSES, "other"] as string[]).filter((s) => s !== "other" || (logs7d?.other ?? 0) > 0).map(
                  (s) => (
                    <TableRow key={s}>
                      <TableCell>{SEND_STATUS_FR[s] ?? adminLabel(s)}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {logs24h ? logs24h[s] : "·"}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {logs7d ? logs7d[s] : "·"}
                      </TableCell>
                    </TableRow>
                  ),
                )}
                <TableRow>
                  <TableCell className="font-medium">Total unique</TableCell>
                  <TableCell className="text-right tabular-nums font-medium">
                    {logs24h ? logs24h.total : "·"}
                  </TableCell>
                  <TableCell className="text-right tabular-nums font-medium">
                    {logs7d ? logs7d.total : "·"}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
            <div className="mt-3 text-sm">
              <span className="text-muted-foreground">Taux d'échec 7 jours : </span>
              <span
                className={
                  failureRate7d > 30
                    ? "text-destructive font-medium"
                    : failureRate7d > 10
                      ? "text-warning font-medium"
                      : "text-success font-medium"
                }
              >
                {failureRate7d.toFixed(1)}%
              </span>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* 3. Différés */}
      <section className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
          Emails différés (email_deferred_queue)
        </h2>
        {deferredPendingLate && (
          <div className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm">
            {deferred!.lateCount} email{deferred!.lateCount > 1 ? "s" : ""} en attente dont l'heure prévue est dépassée
            de plus d'une heure (le plus en retard : {formatAge(deferred!.oldest_late_seconds)}).
          </div>
        )}
        {!deferred ? (
          <p className="text-sm text-destructive">{UNAVAILABLE_LABEL}</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Object.entries(deferred.byStatus).sort((a, b) => b[1] - a[1]).map(([st, n]) => (
              <StatCard
                key={st}
                label={DEFERRED_STATUS_FR[st] ?? adminLabel(st)}
                value={n.toLocaleString("fr-FR")}
                tone={st === "pending" && deferredPendingLate ? "destructive" : st === "sent" ? "success" : st === "failed" ? "warning" : "muted"}
              />
            ))}
            <StatCard
              label="Retard du plus ancien en attente"
              value={formatAge(deferred.oldest_late_seconds)}
              hint="Mesuré depuis l'heure prévue d'envoi"
              tone={deferredPendingLate ? "destructive" : "muted"}
            />
          </div>
        )}
      </section>

      {/* 4. Mass emails paused */}
      <section className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
          Campagnes de masse
        </h2>
        <Card>
          <CardContent className="pt-4 pb-4 flex items-center justify-between gap-3">
            <div>
              <div className="text-sm">
                <span className="font-medium">{pausedList ? massPaused : UNAVAILABLE_LABEL}</span> campagne
                {massPaused > 1 ? "s" : ""} en pause.
              </div>
              <div className="text-xs text-muted-foreground">
                À reprendre ou annuler manuellement.
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" disabled={massPaused === 0} onClick={() => setShowPaused((v) => !v)}>
                {showPaused ? "Masquer la liste" : "Voir la liste"}
              </Button>
              <Button asChild size="sm" variant="ghost">
                <Link to="/admin/envois-groupes">Envois groupés</Link>
              </Button>
            </div>
          </CardContent>
          {showPaused && pausedList && pausedList.length > 0 && (
            <CardContent className="pt-0">
              <ul className="divide-y divide-border text-sm" data-testid="paused-campaigns">
                {pausedList.map((c) => (
                  <li key={c.id} className="flex items-center justify-between gap-3 py-2">
                    <span className="truncate">{c.subject}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {format(new Date(c.created_at), "d MMM yyyy", { locale: fr })} · {(c.sent_count ?? 0).toLocaleString("fr-FR")} envoyés sur {(c.recipients_count ?? 0).toLocaleString("fr-FR")}
                    </span>
                  </li>
                ))}
              </ul>
            </CardContent>
          )}
        </Card>
      </section>

      {/* 5. Suppressed / unsubscribes */}
      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Désabonnés & suppression list
          </h2>
          <Badge variant="secondary">{suppressedTotal} au total</Badge>
        </div>
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Input
                placeholder="Rechercher un email…"
                value={suppressedSearch}
                onChange={(e) => {
                  setSuppressedPage(0);
                  setSuppressedSearch(e.target.value);
                }}
                className="max-w-sm"
              />
            </div>
          </CardHeader>
          <CardContent>
            {suppressedLoading ? (
              <p className="text-sm text-muted-foreground py-4">Chargement…</p>
            ) : suppressedList.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">Aucune entrée.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Raison</TableHead>
                    <TableHead className="text-right">Ajouté le</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {suppressedList.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-mono text-xs">{s.email}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs capitalize">
                          {adminLabel(s.reason)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-xs text-muted-foreground">
                        {format(new Date(s.created_at), "d MMM yyyy HH:mm", { locale: fr })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
            {suppressedTotal > PAGE_SIZE && (
              <div className="flex items-center justify-between mt-3">
                <div className="text-xs text-muted-foreground">
                  Page {suppressedPage + 1} / {suppressedPageCount}
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={suppressedPage === 0}
                    onClick={() => setSuppressedPage((p) => Math.max(0, p - 1))}
                  >
                    Précédent
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={suppressedPage + 1 >= suppressedPageCount}
                    onClick={() => setSuppressedPage((p) => p + 1)}
                  >
                    Suivant
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      {/* 5. Rappels onboarding (déplacé de la vue d'ensemble) */}
      <section className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
          Rappels onboarding
        </h2>
        <OnboardingReminderCard />
      </section>
    </div>
  );
}
