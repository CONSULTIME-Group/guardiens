import { useCallback, useEffect, useMemo, useState } from "react";
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

interface SendCounts {
  sent: number;
  failed: number;
  dlq: number;
  pending: number;
  suppressed: number;
  bounced: number;
  total: number;
}

interface DeferredCounts {
  pending: number;
  sent: number;
  failed: number;
  expired: number;
  oldest_pending_age_seconds: number | null;
}

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
  const [massPaused, setMassPaused] = useState<number>(0);
  const [suppressedTotal, setSuppressedTotal] = useState<number>(0);
  const [suppressedList, setSuppressedList] = useState<
    { id: string; email: string; reason: string; created_at: string }[]
  >([]);
  const [suppressedPage, setSuppressedPage] = useState(0);
  const [suppressedSearch, setSuppressedSearch] = useState("");
  const [suppressedLoading, setSuppressedLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Pipeline health via view
  const fetchHealth = useCallback(async () => {
    setHealthLoading(true);
    const { data, error } = await supabase
      .from("v_email_pipeline_health" as any)
      .select("*")
      .maybeSingle();
    if (error) {
      toast.error("Impossible de charger l'état du pipeline");
    } else {
      setHealth(data as unknown as PipelineHealth);
    }
    setHealthLoading(false);
  }, []);

  // Aggregate send log by status for a window
  const fetchSendCounts = useCallback(
    async (sinceHours: number): Promise<SendCounts> => {
      const since = new Date(Date.now() - sinceHours * 3600 * 1000).toISOString();
      // Fetch minimal cols. Dedupe by message_id keeping latest status.
      const { data, error } = await supabase
        .from("email_send_log")
        .select("message_id, id, status, created_at")
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(10000);
      if (error) throw error;
      const seen = new Map<string, string>();
      (data || []).forEach((r: any) => {
        const key = r.message_id || r.id;
        if (!seen.has(key)) seen.set(key, r.status);
      });
      const counts: SendCounts = {
        sent: 0,
        failed: 0,
        dlq: 0,
        pending: 0,
        suppressed: 0,
        bounced: 0,
        total: 0,
      };
      seen.forEach((status) => {
        counts.total++;
        if (status in counts) (counts as any)[status]++;
      });
      return counts;
    },
    [],
  );

  const fetchDeferred = useCallback(async (): Promise<DeferredCounts> => {
    const { data, error } = await supabase
      .from("email_deferred_queue")
      .select("status, scheduled_for, created_at")
      .limit(10000);
    if (error) throw error;
    const counts: DeferredCounts = {
      pending: 0,
      sent: 0,
      failed: 0,
      expired: 0,
      oldest_pending_age_seconds: null,
    };
    const now = Date.now();
    let oldest: number | null = null;
    (data || []).forEach((r: any) => {
      if (r.status in counts) (counts as any)[r.status]++;
      if (r.status === "pending") {
        const t = new Date(r.created_at).getTime();
        const age = (now - t) / 1000;
        if (oldest == null || age > oldest) oldest = age;
      }
    });
    counts.oldest_pending_age_seconds = oldest;
    return counts;
  }, []);

  const fetchMassPaused = useCallback(async () => {
    const { count, error } = await supabase
      .from("mass_emails")
      .select("id", { count: "exact", head: true })
      .eq("status", "paused");
    if (error) return 0;
    return count ?? 0;
  }, []);

  const fetchSuppressed = useCallback(
    async (page: number, search: string) => {
      setSuppressedLoading(true);
      let countQuery = supabase
        .from("suppressed_emails")
        .select("id", { count: "exact", head: true });
      if (search.trim()) countQuery = countQuery.ilike("email", `%${search.trim()}%`);
      const { count: totalCount } = await countQuery;

      let listQuery = supabase
        .from("suppressed_emails")
        .select("id, email, reason, created_at")
        .order("created_at", { ascending: false })
        .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);
      if (search.trim()) listQuery = listQuery.ilike("email", `%${search.trim()}%`);
      const { data, error } = await listQuery;
      if (error) toast.error("Erreur lors du chargement des désabonnés");
      setSuppressedList((data as any) || []);
      setSuppressedTotal(totalCount ?? 0);
      setSuppressedLoading(false);
    },
    [],
  );

  const refreshAll = useCallback(async () => {
    setRefreshing(true);
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
      setMassPaused(mp);
      await fetchHealth();
    } catch (e: any) {
      toast.error(e?.message || "Erreur de rafraîchissement");
    } finally {
      setRefreshing(false);
    }
  }, [fetchSendCounts, fetchDeferred, fetchMassPaused, fetchHealth]);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  useEffect(() => {
    fetchSuppressed(suppressedPage, suppressedSearch);
  }, [fetchSuppressed, suppressedPage, suppressedSearch]);

  // Pipeline tones
  const lastRunTone = useMemo<"success" | "warning" | "destructive" | "muted">(() => {
    if (!health) return "muted";
    const age = health.last_run_age_seconds;
    if (age == null) return "muted";
    if (age > 600) return "destructive";
    if (age > 300) return "warning";
    return "success";
  }, [health]);

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

  const deferredPendingLate =
    (deferred?.pending ?? 0) > 0 &&
    (deferred?.oldest_pending_age_seconds ?? 0) > 3600;

  const suppressedPageCount = Math.max(1, Math.ceil(suppressedTotal / PAGE_SIZE));

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Santé email</h1>
          <p className="text-sm text-muted-foreground">
            Délivrabilité, différés, campagnes et désabonnés, en un seul écran.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={refreshAll} disabled={refreshing}>
          {refreshing ? "Rafraîchissement…" : "Rafraîchir"}
        </Button>
      </div>

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
              label="Dernier passage worker"
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
              hint="Queue pgmq (auth + transactionnel)"
              tone={oldestPendingTone}
            />
            <StatCard
              label="Taux d'échec (1h)"
              value={
                health.failure_rate_1h == null
                  ? "—"
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
              label="DLQ dernière heure"
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
                {(["sent", "failed", "dlq", "pending", "suppressed", "bounced"] as const).map(
                  (s) => (
                    <TableRow key={s}>
                      <TableCell className="capitalize">{s}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {logs24h ? logs24h[s] : "—"}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {logs7d ? logs7d[s] : "—"}
                      </TableCell>
                    </TableRow>
                  ),
                )}
                <TableRow>
                  <TableCell className="font-medium">Total unique</TableCell>
                  <TableCell className="text-right tabular-nums font-medium">
                    {logs24h ? logs24h.total : "—"}
                  </TableCell>
                  <TableCell className="text-right tabular-nums font-medium">
                    {logs7d ? logs7d.total : "—"}
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
            {deferred!.pending} email{deferred!.pending > 1 ? "s" : ""} en attente depuis plus
            d'une heure (le plus vieux : {formatAge(deferred!.oldest_pending_age_seconds)}).
          </div>
        )}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <StatCard
            label="Pending"
            value={deferred?.pending ?? "—"}
            tone={deferredPendingLate ? "destructive" : "muted"}
          />
          <StatCard label="Sent" value={deferred?.sent ?? "—"} tone="success" />
          <StatCard label="Failed" value={deferred?.failed ?? "—"} tone="warning" />
          <StatCard label="Expired" value={deferred?.expired ?? "—"} tone="muted" />
          <StatCard
            label="Plus vieux pending"
            value={formatAge(deferred?.oldest_pending_age_seconds ?? null)}
            tone={deferredPendingLate ? "destructive" : "muted"}
          />
        </div>
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
                <span className="font-medium">{massPaused}</span> campagne
                {massPaused > 1 ? "s" : ""} en pause.
              </div>
              <div className="text-xs text-muted-foreground">
                À reprendre ou annuler manuellement.
              </div>
            </div>
            <Button asChild size="sm" variant="outline">
              <Link to="/admin/envois-groupes">Voir les campagnes</Link>
            </Button>
          </CardContent>
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
                          {s.reason}
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
    </div>
  );
}
