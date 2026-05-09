import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  LineChart,
  Line,
} from "recharts";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

type Range = "24h" | "7d" | "30d";
const RANGE_HOURS: Record<Range, number> = { "24h": 24, "7d": 24 * 7, "30d": 24 * 30 };

interface LogRow {
  id: string;
  journey_id: string;
  step_order: number;
  template_name: string;
  sent: boolean;
  reason: string | null;
  error_detail: { status?: number; body_excerpt?: string; template?: string; at?: string } | null;
  created_at: string;
  user_journeys: { sequence_key: string } | null;
}

interface JourneyRow {
  status: string;
  sequence_key: string;
  exit_reason: string | null;
  started_at: string;
}

interface QueueRow {
  status: string;
  metadata: { source?: string } | null;
}

const StatCard = ({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string | number;
  hint?: string;
  tone?: "ok" | "warn" | "err";
}) => {
  const toneClass =
    tone === "err"
      ? "text-destructive"
      : tone === "warn"
        ? "text-warning"
        : tone === "ok"
          ? "text-success"
          : "text-foreground";
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className={`mt-1 text-3xl font-heading font-bold ${toneClass}`}>{value}</p>
        {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  );
};

const AdminNurturing = () => {
  const [range, setRange] = useState<Range>("30d");
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [journeys, setJourneys] = useState<JourneyRow[]>([]);
  const [queue, setQueue] = useState<QueueRow[]>([]);
  const [logsTruncated, setLogsTruncated] = useState(false);
  const [nurturingTemplates, setNurturingTemplates] = useState<string[]>([]);
  const [lastRunAt, setLastRunAt] = useState<string | null>(null);
  const [lastRunSent, setLastRunSent] = useState<boolean>(false);

  const fetchData = async () => {
    setLoading(true);
    const since = new Date(Date.now() - RANGE_HOURS[range] * 3600_000).toISOString();
    const LIMIT = 10000;

    // 1) Récupère la liste des templates de nurturing pour cibler email_send_log
    const tplRes = await supabase.from("nurturing_steps").select("template_name");
    const templates = Array.from(
      new Set((tplRes.data ?? []).map((r: { template_name: string }) => r.template_name).filter(Boolean))
    );
    setNurturingTemplates(templates);

    const [logsRes, journeysRes, queueRes] = await Promise.all([
      supabase
        .from("journey_step_log")
        .select(
          "id, journey_id, step_order, template_name, sent, reason, created_at, user_journeys!inner(sequence_key)",
          { count: "exact" }
        )
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(LIMIT),
      supabase
        .from("user_journeys")
        .select("status, sequence_key, exit_reason, started_at")
        .gte("started_at", since)
        .limit(LIMIT),
      templates.length > 0
        ? supabase
            .from("email_send_log")
            .select("message_id, status, created_at, metadata")
            .gte("created_at", since)
            .in("template_name", templates)
            .order("created_at", { ascending: false })
            .limit(LIMIT)
        : Promise.resolve({ data: [], error: null } as { data: unknown[]; error: null }),
    ]);

    if (!logsRes.error) {
      setLogs((logsRes.data ?? []) as unknown as LogRow[]);
      setLogsTruncated((logsRes.count ?? 0) > LIMIT);
    }
    if (!journeysRes.error) setJourneys((journeysRes.data ?? []) as JourneyRow[]);
    if (!queueRes.error) {
      // Déduplication par message_id (dernier statut connu) — un même email
      // génère plusieurs lignes (pending puis sent/failed/dlq).
      const rows = (queueRes.data ?? []) as Array<{
        message_id: string | null;
        status: string;
        created_at: string;
        metadata: { source?: string } | null;
      }>;
      const latest = new Map<string, { status: string; metadata: { source?: string } | null }>();
      for (const r of rows) {
        const key = r.message_id ?? `${r.status}-${r.created_at}-${Math.random()}`;
        if (!latest.has(key)) latest.set(key, { status: r.status, metadata: r.metadata });
      }
      setQueue(Array.from(latest.values()) as QueueRow[]);
    }

    // Dernier run du cron evaluate-journeys (toutes périodes confondues)
    const lastRunRes = await supabase
      .from("journey_step_log")
      .select("created_at, sent")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!lastRunRes.error && lastRunRes.data) {
      setLastRunAt(lastRunRes.data.created_at);
      setLastRunSent(lastRunRes.data.sent);
    } else {
      setLastRunAt(null);
      setLastRunSent(false);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range]);

  const stats = useMemo(() => {
    const total = logs.length;
    const sent = logs.filter((l) => l.sent).length;
    const exited = logs.filter((l) => !l.sent && l.reason === "exit_condition_met").length;
    const failed = logs.filter((l) => !l.sent && l.reason !== "exit_condition_met").length;
    const sendable = sent + failed;
    const successRate = sendable > 0 ? Math.round((sent / sendable) * 1000) / 10 : 0;
    const failureRate = sendable > 0 ? Math.round((failed / sendable) * 1000) / 10 : 0;
    return { total, sent, failed, exited, successRate, failureRate, sendable };
  }, [logs]);

  const queueStats = useMemo(() => {
    const total = queue.length;
    const sent = queue.filter((q) => q.status === "sent").length;
    const pending = queue.filter((q) => q.status === "pending").length;
    const failed = queue.filter((q) => ["failed", "dlq", "bounced"].includes(q.status)).length;
    const suppressed = queue.filter((q) => q.status === "suppressed").length;
    return { total, sent, pending, failed, suppressed };
  }, [queue]);

  const reasonBreakdown = useMemo(() => {
    const map = new Map<string, number>();
    for (const l of logs) {
      if (l.sent) continue;
      const key = l.reason ?? "unknown";
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return Array.from(map.entries())
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count);
  }, [logs]);

  const bySequence = useMemo(() => {
    const map = new Map<string, { sequence: string; sent: number; failed: number; exited: number }>();
    for (const l of logs) {
      const key = l.user_journeys?.sequence_key ?? "unknown";
      const r = map.get(key) ?? { sequence: key, sent: 0, failed: 0, exited: 0 };
      if (l.sent) r.sent++;
      else if (l.reason === "exit_condition_met") r.exited++;
      else r.failed++;
      map.set(key, r);
    }
    return Array.from(map.values()).sort((a, b) => b.sent + b.failed - (a.sent + a.failed));
  }, [logs]);

  const byStep = useMemo(() => {
    const map = new Map<string, { template: string; sent: number; failed: number; exited: number }>();
    for (const l of logs) {
      const key = `${l.template_name} · step ${l.step_order}`;
      const r = map.get(key) ?? { template: key, sent: 0, failed: 0, exited: 0 };
      if (l.sent) r.sent++;
      else if (l.reason === "exit_condition_met") r.exited++;
      else r.failed++;
      map.set(key, r);
    }
    return Array.from(map.values()).sort((a, b) => b.failed - a.failed || b.sent - a.sent);
  }, [logs]);

  const timeSeries = useMemo(() => {
    const days = range === "24h" ? 1 : range === "7d" ? 7 : 30;
    const buckets = new Map<string, { date: string; sent: number; failed: number; exited: number }>();
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400_000);
      const key = format(d, "yyyy-MM-dd");
      buckets.set(key, { date: key, sent: 0, failed: 0, exited: 0 });
    }
    for (const l of logs) {
      const key = format(new Date(l.created_at), "yyyy-MM-dd");
      const b = buckets.get(key);
      if (!b) continue;
      if (l.sent) b.sent++;
      else if (l.reason === "exit_condition_met") b.exited++;
      else b.failed++;
    }
    return Array.from(buckets.values()).map((b) => ({
      ...b,
      label: format(new Date(b.date), days <= 7 ? "EEE dd" : "dd/MM", { locale: fr }),
    }));
  }, [logs, range]);

  const journeyStats = useMemo(() => {
    const total = journeys.length;
    const active = journeys.filter((j) => j.status === "active").length;
    const exited = journeys.filter((j) => j.status === "exited").length;
    return { total, active, exited };
  }, [journeys]);

  const cronHealth = useMemo(() => {
    if (!lastRunAt) return { label: "Jamais exécuté", tone: "err" as const, ageMin: null as number | null };
    const ageMin = Math.round((Date.now() - new Date(lastRunAt).getTime()) / 60_000);
    let tone: "ok" | "warn" | "err" = "ok";
    if (ageMin > 24 * 60) tone = "err";
    else if (ageMin > 60) tone = "warn";
    const label = ageMin < 60 ? `il y a ${ageMin} min` : `il y a ${Math.round(ageMin / 60)} h`;
    return { label, tone, ageMin };
  }, [lastRunAt]);

  // Bannière contextuelle : tous les échecs de la fenêtre concentrés sur 1 seul jour ancien
  // ET dernier run récent et propre → on rassure plutôt que d'alarmer.
  const failureBurst = useMemo(() => {
    const failures = logs.filter((l) => !l.sent && l.reason !== "exit_condition_met");
    if (failures.length === 0) return null;
    const days = new Set(failures.map((f) => f.created_at.slice(0, 10)));
    if (days.size > 1) return null;
    const onlyDay = Array.from(days)[0];
    const ageDays = Math.floor((Date.now() - new Date(onlyDay).getTime()) / 86400_000);
    if (ageDays < 1) return null;
    const lastRunOk = !!lastRunAt && Date.now() - new Date(lastRunAt).getTime() < 6 * 3600_000 && lastRunSent;
    return { count: failures.length, day: onlyDay, ageDays, lastRunOk };
  }, [logs, lastRunAt, lastRunSent]);

  const recentFailures = useMemo(
    () => logs.filter((l) => !l.sent && l.reason !== "exit_condition_met").slice(0, 30),
    [logs]
  );

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-heading font-bold">Nurturing — Suivi des envois</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Volumes, taux d'échec, répartition par séquence et par étape, couverture queue.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {(["24h", "7d", "30d"] as Range[]).map((r) => (
            <Button key={r} size="sm" variant={range === r ? "default" : "outline"} onClick={() => setRange(r)}>
              {r === "24h" ? "24 h" : r === "7d" ? "7 jours" : "30 jours"}
            </Button>
          ))}
          <Button size="sm" variant="ghost" onClick={fetchData}>
            Rafraîchir
          </Button>
        </div>
      </div>

      {logsTruncated && (
        <Card className="border-warning bg-warning-soft">
          <CardContent className="p-4 text-sm text-warning-foreground">
            Plus de 10 000 entrées sur la période — les chiffres affichés sont tronqués. Réduisez la fenêtre.
          </CardContent>
        </Card>
      )}

      {failureBurst && failureBurst.lastRunOk && (
        <Card className="border-success/40 bg-success/5">
          <CardContent className="p-4 text-sm">
            <strong>Bonne nouvelle :</strong> les {failureBurst.count} échecs de la période sont
            tous concentrés sur le {format(new Date(failureBurst.day), "dd MMMM yyyy", { locale: fr })} (il y a {failureBurst.ageDays} j).
            Le dernier passage du cron, {cronHealth.label}, s'est terminé par un envoi réussi —
            l'incident est résolu, les chiffres restent visibles à titre historique.
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="grid gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            <StatCard
              label="Étapes évaluées"
              value={stats.total}
              hint={`Dont ${stats.exited} sorties (objectif atteint)`}
            />
            <StatCard
              label="Étapes envoyées"
              value={stats.sent}
              tone="ok"
              hint={`${stats.successRate}% de réussite côté evaluator`}
            />
            <StatCard
              label="Échecs evaluator"
              value={stats.failed}
              tone={stats.failed > 0 ? "err" : "ok"}
              hint={`${stats.failureRate}% des tentatives`}
            />
            <StatCard
              label="Couverture (sent vs failed)"
              value={`${stats.sent}/${stats.sendable}`}
              tone={stats.failureRate > 5 ? "err" : stats.failureRate > 1 ? "warn" : "ok"}
              hint={stats.sendable === 0 ? "Aucun envoi sur la période" : `${stats.successRate}% délivrés à la queue`}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-5">
            <StatCard
              label="Queue — total"
              value={queueStats.total}
              hint={
                nurturingTemplates.length > 0
                  ? `${nurturingTemplates.length} templates suivis (dédup. par message_id)`
                  : "Aucun template configuré"
              }
            />
            <StatCard label="Queue — sent" value={queueStats.sent} tone="ok" />
            <StatCard label="Queue — pending" value={queueStats.pending} tone={queueStats.pending > 0 ? "warn" : "ok"} />
            <StatCard
              label="Queue — failed/DLQ"
              value={queueStats.failed}
              tone={queueStats.failed > 0 ? "err" : "ok"}
            />
            <StatCard label="Queue — suppressed" value={queueStats.suppressed} />
          </div>

          <div className="grid gap-4 md:grid-cols-4">
            <StatCard label="Parcours créés (période)" value={journeyStats.total} />
            <StatCard label="Actifs" value={journeyStats.active} tone="ok" />
            <StatCard label="Sortis (objectif atteint)" value={journeyStats.exited} />
            <StatCard
              label="Cron evaluate-journeys"
              value={cronHealth.label}
              tone={cronHealth.tone}
              hint={
                cronHealth.ageMin === null
                  ? "Aucun log trouvé"
                  : lastRunSent
                    ? "Dernier log = envoi réussi"
                    : "Dernier log = échec ou sortie"
              }
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Évolution dans le temps</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={timeSeries}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="sent" name="Envoyés" stroke="hsl(var(--success))" strokeWidth={2} />
                  <Line type="monotone" dataKey="failed" name="Échecs" stroke="hsl(var(--destructive))" strokeWidth={2} />
                  <Line
                    type="monotone"
                    dataKey="exited"
                    name="Sorties"
                    stroke="hsl(var(--muted-foreground))"
                    strokeWidth={1.5}
                    strokeDasharray="4 4"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Raisons d'échec</CardTitle>
              </CardHeader>
              <CardContent>
                {reasonBreakdown.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-8 text-center">Aucun échec sur la période.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Raison</TableHead>
                        <TableHead className="text-right">Occurrences</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reasonBreakdown.map((r) => (
                        <TableRow key={r.reason}>
                          <TableCell className="font-mono text-xs">{r.reason}</TableCell>
                          <TableCell className="text-right">
                            <Badge
                              variant={
                                r.reason === "exit_condition_met"
                                  ? "outline"
                                  : r.reason === "no_email"
                                    ? "secondary"
                                    : "destructive"
                              }
                            >
                              {r.count}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Répartition par séquence</CardTitle>
              </CardHeader>
              <CardContent>
                {bySequence.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-8 text-center">Aucune donnée sur la période.</p>
                ) : (
                  <ResponsiveContainer width="100%" height={Math.max(220, bySequence.length * 56)}>
                    <BarChart data={bySequence} layout="vertical" margin={{ left: 40, right: 16 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" allowDecimals={false} />
                      <YAxis type="category" dataKey="sequence" width={160} tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="sent" name="Envoyés" stackId="a" fill="hsl(var(--success))" />
                      <Bar dataKey="failed" name="Échecs" stackId="a" fill="hsl(var(--destructive))" />
                      <Bar dataKey="exited" name="Sorties" stackId="a" fill="hsl(var(--muted-foreground))" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Répartition par étape (template)</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              {byStep.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">Aucune donnée sur la période.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Étape</TableHead>
                      <TableHead className="text-right">Envoyés</TableHead>
                      <TableHead className="text-right">Échecs</TableHead>
                      <TableHead className="text-right">Sorties</TableHead>
                      <TableHead className="text-right">Taux d'échec</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {byStep.map((s) => {
                      const sendable = s.sent + s.failed;
                      const rate = sendable > 0 ? (s.failed / sendable) * 100 : 0;
                      return (
                        <TableRow key={s.template}>
                          <TableCell className="font-mono text-xs">{s.template}</TableCell>
                          <TableCell className="text-right">{s.sent}</TableCell>
                          <TableCell className="text-right">
                            {s.failed > 0 ? <span className="text-destructive font-medium">{s.failed}</span> : 0}
                          </TableCell>
                          <TableCell className="text-right text-muted-foreground">{s.exited}</TableCell>
                          <TableCell className="text-right">
                            <Badge variant={rate > 5 ? "destructive" : rate > 0 ? "secondary" : "outline"}>
                              {rate.toFixed(1)}%
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Échecs récents</CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                Le détail HTTP (status, body) n'est pas encore stocké en base — il est consultable
                dans les logs de la fonction <code className="font-mono">evaluate-journeys</code>.
                Étape 2 du chantier : ajouter une colonne <code className="font-mono">error_detail</code>.
              </p>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              {recentFailures.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">Aucun échec sur la période.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Séquence</TableHead>
                      <TableHead>Step</TableHead>
                      <TableHead>Template</TableHead>
                      <TableHead>Raison</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentFailures.map((l) => (
                      <TableRow key={l.id}>
                        <TableCell className="text-xs whitespace-nowrap">
                          {format(new Date(l.created_at), "dd MMM HH:mm", { locale: fr })}
                        </TableCell>
                        <TableCell className="font-mono text-xs">{l.user_journeys?.sequence_key ?? "—"}</TableCell>
                        <TableCell>{l.step_order}</TableCell>
                        <TableCell className="font-mono text-xs">{l.template_name}</TableCell>
                        <TableCell>
                          <Badge variant="destructive">{l.reason ?? "unknown"}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default AdminNurturing;
