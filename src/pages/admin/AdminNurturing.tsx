import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";
import { HelpCircle, Loader2, PlayCircle } from "lucide-react";
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
import { SequenceRecipientsDialog } from "@/components/admin/SequenceRecipientsDialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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
  message_id: string | null;
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

interface EngagementRow {
  message_id: string;
  event_type: "open" | "click";
  target_url: string | null;
}

interface SequenceRow {
  key: string;
  audience: string;
  description: string | null;
  active: boolean;
  anchor_field: string;
  enrollment_rule: { type?: string; days?: number; window_days?: number; min_age_days?: number } | null;
}

interface SequenceStepRow {
  sequence_key: string;
  step_order: number;
  template_name: string;
  delay_hours: number;
  exit_condition: { type?: string; threshold?: number; days?: number } | null;
}

// Libellés humains pour traduire les clés techniques
const SEQUENCE_LABELS: Record<string, string> = {
  "onboarding-owner": "Onboarding Propriétaire",
  "onboarding-sitter": "Onboarding Gardien",
  "reactivation-d30": "Réactivation des inactifs (J+30)",
  "sitter-encourage-candidature": "Gardiens sans candidature (J+14)",
};

const TEMPLATE_LABELS: Record<string, string> = {
  "onboarding-j1": "Bienvenue (J+1)",
  "conseils-publication-annonce": "Conseils pour publier l'annonce",
  "conseils-annonce-personnalises": "Conseils personnalisés sur l'annonce",
  "relance-profil-incomplet": "Relance profil incomplet",
  "availability-nudge": "Rappel disponibilités",
  "reactivation-d30": "Réactivation après inactivité",
  "sitter-encourage-candidature": "Encouragement à candidater",
};

const REASON_LABELS: Record<string, string> = {
  exit_condition_met: "Objectif atteint (sortie normale)",
  no_email: "Pas d'adresse email",
  send_failed_400: "Erreur 400 à l'envoi",
  send_failed_500: "Erreur 500 à l'envoi",
  send_failed: "Échec d'envoi",
  template_not_found: "Template introuvable",
  user_unsubscribed: "Désinscrit",
  user_not_found: "Utilisateur introuvable",
  unknown: "Raison inconnue",
};

const AUDIENCE_LABELS: Record<string, string> = {
  owner: "Propriétaires",
  sitter: "Gardiens",
  all: "Tous",
};

const RULE_TYPE_LABELS: Record<string, string> = {
  signup: "À l'inscription",
  inactivity: "Inactivité prolongée",
  sitter_no_application: "Gardien sans candidature",
  owner_no_sit: "Propriétaire sans annonce",
};

const formatDelay = (hours: number): string => {
  if (hours === 0) return "immédiat";
  if (hours < 24) return `${hours} h`;
  const days = Math.round(hours / 24);
  return `J+${days}`;
};

const labelSequence = (key: string) => SEQUENCE_LABELS[key] ?? key;
const labelTemplate = (key: string) => TEMPLATE_LABELS[key] ?? key;
const labelReason = (key: string | null) => REASON_LABELS[key ?? "unknown"] ?? (key ?? ",");

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
  const [range, setRange] = useState<Range>("7d");
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [preview, setPreview] = useState<null | {
    sent: number; enrolled: number; exited: number; skipped: number;
    bySequence?: Record<string, { enrolled: number; sent: number; exited: number; skipped: number }>;
  }>(null);
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [journeys, setJourneys] = useState<JourneyRow[]>([]);
  const [queue, setQueue] = useState<QueueRow[]>([]);
  const [engagement, setEngagement] = useState<EngagementRow[]>([]);
  const [logsTruncated, setLogsTruncated] = useState(false);
  const [nurturingTemplates, setNurturingTemplates] = useState<string[]>([]);
  const [lastRunAt, setLastRunAt] = useState<string | null>(null);
  const [lastRunSent, setLastRunSent] = useState<boolean>(false);
  const [sequences, setSequences] = useState<SequenceRow[]>([]);
  const [sequenceSteps, setSequenceSteps] = useState<SequenceStepRow[]>([]);
  const [recipientsDialog, setRecipientsDialog] = useState<{ key: string; label: string } | null>(null);
  const sinceIso = useMemo(() => new Date(Date.now() - RANGE_HOURS[range] * 3600_000).toISOString(), [range]);

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
          "id, journey_id, step_order, template_name, sent, reason, error_detail, created_at, message_id, user_journeys!inner(sequence_key)",
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
      // Déduplication par message_id (dernier statut connu), un même email
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

    // Engagement events (opens/clicks) pour les message_ids des logs de la fenêtre
    const messageIds = Array.from(
      new Set(((logsRes.data ?? []) as LogRow[]).map((l) => l.message_id).filter(Boolean) as string[])
    );
    if (messageIds.length > 0) {
      // Supabase IN limite ~ 1000, on découpe par lots
      const chunks: string[][] = [];
      for (let i = 0; i < messageIds.length; i += 500) chunks.push(messageIds.slice(i, i + 500));
      const all: EngagementRow[] = [];
      for (const c of chunks) {
        const r = await supabase
          .from("email_engagement_events")
          .select("message_id, event_type, target_url")
          .in("message_id", c);
        if (!r.error && r.data) all.push(...(r.data as EngagementRow[]));
      }
      setEngagement(all);
    } else {
      setEngagement([]);
    }

    // Dernier run du cron evaluate-journeys : on lit cron_run_log (populé par
    // le helper _shared/cron-run-log.ts). Fallback sur journey_step_log si le
    // helper n'a encore jamais tourné (première exécution après déploiement).
    const cronRun = await supabase
      .from("cron_run_log")
      .select("started_at, finished_at, status")
      .eq("edge_name", "evaluate-journeys")
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!cronRun.error && cronRun.data) {
      setLastRunAt(cronRun.data.finished_at ?? cronRun.data.started_at);
      setLastRunSent(cronRun.data.status === "success" || cronRun.data.status === "partial");
    } else {
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
    }

    // Métadonnées des séquences (pour affichage humain)
    const [seqRes, stepsRes] = await Promise.all([
      supabase
        .from("nurturing_sequences")
        .select("key, audience, description, active, anchor_field, enrollment_rule")
        .order("key"),
      supabase
        .from("nurturing_steps")
        .select("step_order, template_name, delay_hours, exit_condition, nurturing_sequences!inner(key)")
        .order("step_order"),
    ]);
    if (!seqRes.error) setSequences((seqRes.data ?? []) as unknown as SequenceRow[]);
    if (!stepsRes.error) {
      const rows = (stepsRes.data ?? []) as unknown as Array<
        SequenceStepRow & { nurturing_sequences: { key: string } }
      >;
      setSequenceSteps(
        rows.map((r) => ({
          sequence_key: r.nurturing_sequences.key,
          step_order: r.step_order,
          template_name: r.template_name,
          delay_hours: r.delay_hours,
          exit_condition: r.exit_condition,
        }))
      );
    }

    setLoading(false);
  };

  const runPreview = async () => {
    setPreviewing(true);
    try {
      const { data, error } = await supabase.functions.invoke("evaluate-journeys", {
        body: { manual: true, dryRun: true },
      });
      if (error) throw error;
      const stats = (data as { stats?: {
        sent?: number; skipped?: number; exited?: number; enrolled?: number;
        bySequence?: Record<string, { enrolled: number; sent: number; exited: number; skipped: number }>;
      } } | null)?.stats;
      setPreview({
        sent: stats?.sent ?? 0,
        enrolled: stats?.enrolled ?? 0,
        exited: stats?.exited ?? 0,
        skipped: stats?.skipped ?? 0,
        bySequence: stats?.bySequence,
      });
    } catch (e) {
      toast.error("Échec de l'aperçu", { description: e instanceof Error ? e.message : String(e) });
    } finally {
      setPreviewing(false);
    }
  };

  const confirmEvaluate = async () => {
    setTriggering(true);
    try {
      const { data, error } = await supabase.functions.invoke("evaluate-journeys", { body: { manual: true } });
      if (error) throw error;
      const stats = (data as { stats?: { sent?: number; skipped?: number; exited?: number; enrolled?: number; errors?: number; capped?: boolean } } | null)?.stats;
      if (stats) {
        toast.success(
          `Envoyés ${stats.sent ?? 0} · sautés ${stats.skipped ?? 0} · sortis ${stats.exited ?? 0} · enrôlés ${stats.enrolled ?? 0}${stats.capped ? " (plafond atteint)" : ""}`,
        );
      } else {
        toast.success("Évaluation terminée");
      }
      setPreview(null);
      await fetchData();
    } catch (e) {
      toast.error("Échec du déclenchement", { description: e instanceof Error ? e.message : String(e) });
    } finally {
      setTriggering(false);
    }
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
      const r = map.get(key) ?? { sequence: labelSequence(key), sent: 0, failed: 0, exited: 0 };
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
      const display = `${labelTemplate(l.template_name)} (étape ${l.step_order})`;
      const r = map.get(key) ?? { template: display, sent: 0, failed: 0, exited: 0 };
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

  // Index events par message_id
  const eventsByMid = useMemo(() => {
    const m = new Map<string, { open: boolean; click: boolean }>();
    for (const e of engagement) {
      const r = m.get(e.message_id) ?? { open: false, click: false };
      if (e.event_type === "open") r.open = true;
      if (e.event_type === "click") r.click = true;
      m.set(e.message_id, r);
    }
    return m;
  }, [engagement]);

  // Stats agrégées par séquence (logs + journeys + engagement)
  const sequenceMetrics = useMemo(() => {
    type M = { sent: number; failed: number; exited: number; activeJourneys: number; totalJourneys: number; opens: number; clicks: number; actions: number };
    const def = (): M => ({ sent: 0, failed: 0, exited: 0, activeJourneys: 0, totalJourneys: 0, opens: 0, clicks: 0, actions: 0 });
    const m = new Map<string, M>();
    for (const l of logs) {
      const k = l.user_journeys?.sequence_key;
      if (!k) continue;
      const r = m.get(k) ?? def();
      if (l.sent) {
        r.sent++;
        const ev = l.message_id ? eventsByMid.get(l.message_id) : undefined;
        if (ev?.open) r.opens++;
        if (ev?.click) r.clicks++;
        // Action = clic CTA OU sortie via objectif (cf. plan)
        if (ev?.click) r.actions++;
      } else if (l.reason === "exit_condition_met") {
        r.exited++;
        r.actions++; // exit goal_met compte comme action
      } else {
        r.failed++;
      }
      m.set(k, r);
    }
    for (const j of journeys) {
      const r = m.get(j.sequence_key) ?? def();
      r.totalJourneys++;
      if (j.status === "active") r.activeJourneys++;
      m.set(j.sequence_key, r);
    }
    return m;
  }, [logs, journeys, eventsByMid]);

  // Santé de la mesure d'engagement : un envoi sans message_id ne peut être
  // corrélé aux ouvertures / clics → les taux d'engagement sont sous-estimés.
  const measurementHealth = useMemo(() => {
    const sentLogs = logs.filter((l) => l.sent);
    const sent = sentLogs.length;
    const missing = sentLogs.filter((l) => !l.message_id).length;
    const missingRate = sent > 0 ? Math.round((missing / sent) * 1000) / 10 : 0;
    let tone: "ok" | "warn" | "err" = "ok";
    let label = "Mesure fiable";
    let hint = "Tous les envois sont corrélés aux ouvertures et clics.";
    if (sent === 0) {
      tone = "ok";
      label = "Aucun envoi";
      hint = "Pas d'envoi sur la période, rien à corréler.";
    } else if (missingRate >= 20) {
      tone = "err";
      label = "Mesure dégradée";
      hint = `${missing} envoi(s) sans message_id (${missingRate}%), taux d'ouverture/clic sous-estimés.`;
    } else if (missing > 0) {
      tone = "warn";
      label = "Mesure partielle";
      hint = `${missing} envoi(s) sans message_id (${missingRate}%), légère sous-estimation possible.`;
    }
    return { sent, missing, missingRate, tone, label, hint };
  }, [logs]);

  // Engagement global
  const engagementStats = useMemo(() => {
    let sent = 0, opens = 0, clicks = 0, actions = 0;
    for (const m of sequenceMetrics.values()) {
      sent += m.sent;
      opens += m.opens;
      clicks += m.clicks;
      actions += m.actions;
    }
    const pct = (n: number) => sent > 0 ? Math.round((n / sent) * 1000) / 10 : 0;
    return { sent, opens, clicks, actions, openRate: pct(opens), clickRate: pct(clicks), actionRate: pct(actions) };
  }, [sequenceMetrics]);

  // Classement des étapes (template_name + step_order) par taux d'action
  type StepStat = {
    sequenceKey: string;
    stepOrder: number;
    templateName: string;
    sent: number;
    opens: number;
    clicks: number;
    exited: number;
    actions: number;
    openRate: number;
    clickRate: number;
    actionRate: number;
  };
  const topSteps = useMemo<StepStat[]>(() => {
    const map = new Map<string, StepStat>();
    for (const l of logs) {
      const seqKey = l.user_journeys?.sequence_key ?? ",";
      const k = `${seqKey}::${l.step_order}::${l.template_name}`;
      const r =
        map.get(k) ??
        ({
          sequenceKey: seqKey,
          stepOrder: l.step_order,
          templateName: l.template_name,
          sent: 0,
          opens: 0,
          clicks: 0,
          exited: 0,
          actions: 0,
          openRate: 0,
          clickRate: 0,
          actionRate: 0,
        } as StepStat);
      if (l.sent) {
        r.sent++;
        const ev = l.message_id ? eventsByMid.get(l.message_id) : undefined;
        if (ev?.open) r.opens++;
        if (ev?.click) {
          r.clicks++;
          r.actions++;
        }
      } else if (l.reason === "exit_condition_met") {
        r.exited++;
        r.actions++;
      }
      map.set(k, r);
    }
    const arr = Array.from(map.values());
    for (const r of arr) {
      r.openRate = r.sent > 0 ? Math.round((r.opens / r.sent) * 1000) / 10 : 0;
      r.clickRate = r.sent > 0 ? Math.round((r.clicks / r.sent) * 1000) / 10 : 0;
      const denom = r.sent + r.exited;
      r.actionRate = denom > 0 ? Math.round((r.actions / denom) * 1000) / 10 : 0;
    }
    return arr.sort((a, b) => b.actionRate - a.actionRate || b.sent - a.sent);
  }, [logs, eventsByMid]);

  // Classement des CTA cliqués (par target_url)
  type CtaStat = { url: string; clicks: number; uniqueSends: number; templates: Set<string> };
  const topCtas = useMemo<CtaStat[]>(() => {
    const tplByMid = new Map<string, string>();
    for (const l of logs) {
      if (l.message_id) tplByMid.set(l.message_id, l.template_name);
    }
    const map = new Map<string, CtaStat>();
    const sendsByUrl = new Map<string, Set<string>>();
    for (const e of engagement) {
      if (e.event_type !== "click" || !e.target_url) continue;
      const r =
        map.get(e.target_url) ??
        ({ url: e.target_url, clicks: 0, uniqueSends: 0, templates: new Set<string>() } as CtaStat);
      r.clicks++;
      const tpl = tplByMid.get(e.message_id);
      if (tpl) r.templates.add(tpl);
      map.set(e.target_url, r);
      const s = sendsByUrl.get(e.target_url) ?? new Set<string>();
      s.add(e.message_id);
      sendsByUrl.set(e.target_url, s);
    }
    for (const [url, set] of sendsByUrl) {
      const r = map.get(url);
      if (r) r.uniqueSends = set.size;
    }
    return Array.from(map.values()).sort((a, b) => b.clicks - a.clicks);
  }, [engagement, logs]);


  const stepsBySequence = useMemo(() => {
    const m = new Map<string, SequenceStepRow[]>();
    for (const s of sequenceSteps) {
      const arr = m.get(s.sequence_key) ?? [];
      arr.push(s);
      m.set(s.sequence_key, arr);
    }
    for (const arr of m.values()) arr.sort((a, b) => a.step_order - b.step_order);
    return m;
  }, [sequenceSteps]);

  // --- Pour l'onglet Vue d'ensemble : Top 3 winners / losers ---
  // Seuil de fiabilité 10 envois ; fallback sur tous les steps quand pas assez de volume.
  const reliableSteps = topSteps.filter((s) => s.sent + s.exited >= 10);
  const winnersBase = reliableSteps.length >= 1 ? reliableSteps : topSteps.filter((s) => s.sent > 0);
  const winners = [...winnersBase].sort((a, b) => b.actionRate - a.actionRate || b.sent - a.sent).slice(0, 3);
  const losersBase = reliableSteps.length >= 1
    ? reliableSteps.filter((s) => s.actionRate < 10)
    : topSteps.filter((s) => s.sent > 0 && s.actionRate < 10);
  const losers = [...losersBase].sort((a, b) => a.actionRate - b.actionRate || b.sent - a.sent).slice(0, 3);

  // --- Activité du jour pour Vue d'ensemble ---
  const todayKey = format(new Date(), "yyyy-MM-dd");
  const today = timeSeries.find((b) => b.date === todayKey) ?? { sent: 0, failed: 0, exited: 0 };

  // --- Flux d'envois récents pour Performance (10 derniers) ---
  const recentSends = logs.filter((l) => l.sent).slice(0, 10);

  // --- Santé du système (3 pastilles) ---
  const queueHealthy = queueStats.failed === 0 && queueStats.pending < 20;
  const deliveryRate = stats.successRate;
  const deliveryTone: "ok" | "warn" | "err" =
    stats.sendable === 0 ? "ok" : deliveryRate >= 95 ? "ok" : deliveryRate >= 85 ? "warn" : "err";
  const dotClass = (tone: "ok" | "warn" | "err") =>
    tone === "ok" ? "bg-success" : tone === "warn" ? "bg-warning" : "bg-destructive";

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* En-tête */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-heading font-bold">Pilotage du nurturing</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Quels emails automatiques sont envoyés, à qui, et lesquels créent vraiment de l'action.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {(["24h", "7d", "30d"] as Range[]).map((r) => (
            <Button key={r} size="sm" variant={range === r ? "default" : "outline"} onClick={() => setRange(r)}>
              {r === "24h" ? "24 h" : r === "7d" ? "7 jours" : "30 jours"}
            </Button>
          ))}
          <Button size="sm" variant="ghost" onClick={fetchData} disabled={loading}>
            Rafraîchir
          </Button>
          <Button size="sm" variant="default" onClick={runPreview} disabled={previewing || triggering}>
            {previewing ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <PlayCircle className="h-4 w-4 mr-1" />}
            Lancer une évaluation
          </Button>
          <Popover>
            <PopoverTrigger asChild>
              <Button size="sm" variant="ghost">
                <HelpCircle className="h-4 w-4 mr-1" />
                Comment lire ?
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-96 text-sm space-y-2">
              <p><strong>Séquence</strong> : campagne d'emails automatiques (ex. « Onboarding Propriétaire »). Chaque séquence cible une audience et déclenche selon une règle.</p>
              <p><strong>Étape</strong> : un email donné dans une séquence, envoyé après un délai (J+1, J+3…).</p>
              <p><strong>Parcours</strong> : un utilisateur inscrit dans une séquence. Il avance d'étape en étape, ou « sort » si l'objectif est atteint.</p>
              <p><strong>Action</strong> : un clic sur le CTA de l'email OU une sortie via objectif atteint dans les 7 jours suivants.</p>
              <p><strong>Evaluator</strong> : cron qui décide d'envoyer ou non chaque étape (toutes les heures). <strong>Queue</strong> : file d'attente d'envoi des emails.</p>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Bandeau de santé */}
      <Card>
        <CardContent className="p-4 flex flex-wrap gap-6 items-center">
          <div className="flex items-center gap-2">
            <span className={`inline-block h-2.5 w-2.5 rounded-full ${dotClass(cronHealth.tone)}`} />
            <div>
              <p className="text-xs text-muted-foreground">Cron evaluate-journeys</p>
              <p className="text-sm font-medium">{cronHealth.label}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`inline-block h-2.5 w-2.5 rounded-full ${dotClass(queueHealthy ? "ok" : queueStats.failed > 0 ? "err" : "warn")}`} />
            <div>
              <p className="text-xs text-muted-foreground">Queue d'envoi</p>
              <p className="text-sm font-medium">
                {queueStats.pending} en attente · {queueStats.failed} échec(s)
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`inline-block h-2.5 w-2.5 rounded-full ${dotClass(deliveryTone)}`} />
            <div>
              <p className="text-xs text-muted-foreground">Délivrabilité (evaluator)</p>
              <p className="text-sm font-medium">
                {stats.sendable === 0 ? "," : `${stats.successRate}% (${stats.sent}/${stats.sendable})`}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {logsTruncated && (
        <Card className="border-warning bg-warning-soft">
          <CardContent className="p-4 text-sm text-warning-foreground">
            Plus de 10 000 entrées sur la période, les chiffres affichés sont tronqués. Réduisez la fenêtre.
          </CardContent>
        </Card>
      )}

      {failureBurst && failureBurst.lastRunOk && (
        <Card className="border-success/40 bg-success/5">
          <CardContent className="p-4 text-sm">
            <strong>Bonne nouvelle :</strong> les {failureBurst.count} échecs de la période sont
            tous concentrés sur le {format(new Date(failureBurst.day), "dd MMMM yyyy", { locale: fr })} (il y a {failureBurst.ageDays} j).
            Le dernier passage du cron, {cronHealth.label}, s'est terminé par un envoi réussi ,             l'incident est résolu.
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
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="diagnostic">Diagnostic</TabsTrigger>
          </TabsList>

          {/* =========== ONGLET 1 : VUE D'ENSEMBLE =========== */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid gap-4 md:grid-cols-4">
              <StatCard label="Aujourd'hui, envoyés" value={today.sent} tone="ok" hint={today.sent > 0 ? "Le nurturing tourne" : "Pas encore d'envoi aujourd'hui"} />
              <StatCard label="Aujourd'hui, échecs" value={today.failed} tone={today.failed > 0 ? "err" : "ok"} />
              <StatCard label="Parcours actifs" value={journeyStats.active} hint={`${journeyStats.total} créés sur la période`} />
              <StatCard label="Sortis (objectif atteint)" value={journeyStats.exited} hint="Utilisateurs qui ont fait l'action attendue" />
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Engagement global, l'email a-t-il déclenché de l'action ?</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-4">
                  <StatCard
                    label="Emails envoyés"
                    value={engagementStats.sent}
                    hint={`Sur ${range === "24h" ? "24 h" : range === "7d" ? "7 jours" : "30 jours"}`}
                  />
                  <StatCard
                    label="Taux d'ouverture"
                    value={engagementStats.sent > 0 ? `${engagementStats.openRate}%` : ","}
                    hint={`${engagementStats.opens} ouvertures (sous-estimé : Apple Mail Privacy)`}
                  />
                  <StatCard
                    label="Taux de clic CTA"
                    value={engagementStats.sent > 0 ? `${engagementStats.clickRate}%` : ","}
                    hint={`${engagementStats.clicks} clics`}
                  />
                  <StatCard
                    label="Taux d'action"
                    value={engagementStats.sent > 0 ? `${engagementStats.actionRate}%` : ","}
                    tone="ok"
                    hint={`${engagementStats.actions} actions, clic CTA ou objectif atteint`}
                  />
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Ce qui marche le mieux</CardTitle>
                  <p className="text-xs text-muted-foreground">
                    Top 3 par taux d'action {reliableSteps.length === 0 ? "(petit volume, indicatif)" : "(≥ 10 envois)"}
                  </p>
                </CardHeader>
                <CardContent>
                  {winners.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4 text-center">Aucun envoi encore enregistré sur la période.</p>
                  ) : (
                    <ul className="space-y-3">
                      {winners.map((s) => (
                        <li key={`w-${s.sequenceKey}-${s.stepOrder}-${s.templateName}`} className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-medium">{labelTemplate(s.templateName)}</p>
                            <p className="text-[11px] text-muted-foreground">{labelSequence(s.sequenceKey)} · étape {s.stepOrder} · {s.sent} envois</p>
                          </div>
                          <Badge variant="default" className="bg-success text-success-foreground">{s.actionRate}%</Badge>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Ce qu'il faudrait retravailler</CardTitle>
                  <p className="text-xs text-muted-foreground">
                    Taux d'action &lt; 10 % {reliableSteps.length === 0 ? "(petit volume, indicatif)" : "(≥ 10 envois)"}
                  </p>
                </CardHeader>
                <CardContent>
                  {losers.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4 text-center">Aucun contenu sous-performant, bravo.</p>
                  ) : (
                    <ul className="space-y-3">
                      {losers.map((s) => (
                        <li key={`l-${s.sequenceKey}-${s.stepOrder}-${s.templateName}`} className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-medium">{labelTemplate(s.templateName)}</p>
                            <p className="text-[11px] text-muted-foreground">{labelSequence(s.sequenceKey)} · étape {s.stepOrder} · {s.sent} envois</p>
                          </div>
                          <Badge variant="destructive">{s.actionRate}%</Badge>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Séquences actives</CardTitle>
                <p className="text-xs text-muted-foreground mt-1">Détail complet dans l'onglet Performance.</p>
              </CardHeader>
              <CardContent>
                {sequences.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">Aucune séquence configurée.</p>
                ) : (
                  <div className="space-y-2">
                    {sequences.map((s) => {
                      const m = sequenceMetrics.get(s.key) ?? { sent: 0, failed: 0, exited: 0, activeJourneys: 0, totalJourneys: 0, opens: 0, clicks: 0, actions: 0 };
                      return (
                        <div key={s.key} className="flex items-center justify-between gap-3 border border-border rounded-md px-3 py-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant={s.active ? "default" : "outline"}>{s.active ? "Active" : "Inactive"}</Badge>
                            <span className="font-medium text-sm">{labelSequence(s.key)}</span>
                            <span className="text-xs text-muted-foreground">{AUDIENCE_LABELS[s.audience] ?? s.audience}</span>
                          </div>
                          <div className="flex items-center gap-4 text-xs">
                            <span><span className="text-muted-foreground">Actifs : </span><span className="font-semibold">{m.activeJourneys}</span></span>
                            <span><span className="text-muted-foreground">Envoyés : </span><span className="font-semibold text-success">{m.sent}</span></span>
                            <span><span className="text-muted-foreground">Action : </span><span className="font-semibold">{m.sent > 0 ? `${Math.round((m.actions / m.sent) * 100)}%` : ","}</span></span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* =========== ONGLET 2 : PERFORMANCE =========== */}
          <TabsContent value="performance" className="space-y-6">
            {measurementHealth.tone !== "ok" && (
              <Card
                className={
                  measurementHealth.tone === "err"
                    ? "border-destructive/50 bg-destructive/5"
                    : "border-warning/50 bg-warning/5"
                }
              >
                <CardContent className="py-3 flex items-start gap-3 text-sm">
                  <span
                    className={`inline-block h-2 w-2 rounded-full mt-1.5 ${
                      measurementHealth.tone === "err" ? "bg-destructive" : "bg-warning"
                    }`}
                  />
                  <div>
                    <div className="font-medium">
                      Santé de la mesure d'engagement : {measurementHealth.label}
                    </div>
                    <p className="text-muted-foreground text-xs mt-0.5">
                      {measurementHealth.hint} Les taux d'ouverture et de clic ci-dessous sont
                      calculés uniquement sur les envois corrélés à un message_id.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Top contenus, quelles étapes créent de l'action ?</CardTitle>
                </CardHeader>
                <CardContent>
                  {topSteps.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-6 text-center">Aucun envoi sur la période.</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Étape</TableHead>
                          <TableHead className="text-right">Envoyés</TableHead>
                          <TableHead className="text-right">Ouv.</TableHead>
                          <TableHead className="text-right">Clic</TableHead>
                          <TableHead className="text-right">Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {topSteps.slice(0, 15).map((s) => {
                          const reliable = s.sent >= 10;
                          const tone =
                            !reliable
                              ? "text-muted-foreground"
                              : s.actionRate >= 30
                                ? "text-success font-semibold"
                                : s.actionRate < 10
                                  ? "text-destructive"
                                  : "text-foreground";
                          return (
                            <TableRow key={`${s.sequenceKey}-${s.stepOrder}-${s.templateName}`}>
                              <TableCell>
                                <div className="text-sm font-medium">{labelTemplate(s.templateName)}</div>
                                <div className="text-[11px] text-muted-foreground">
                                  {labelSequence(s.sequenceKey)} · étape {s.stepOrder}
                                </div>
                              </TableCell>
                              <TableCell className="text-right text-sm">{s.sent}</TableCell>
                              <TableCell className="text-right text-sm">{s.sent > 0 ? `${s.openRate}%` : ","}</TableCell>
                              <TableCell className="text-right text-sm">{s.sent > 0 ? `${s.clickRate}%` : ","}</TableCell>
                              <TableCell className={`text-right text-sm ${tone}`}>
                                {s.sent + s.exited > 0 ? `${s.actionRate}%` : ","}
                                {!reliable && s.sent > 0 && (
                                  <span className="text-[9px] text-muted-foreground ml-1">(n&lt;10)</span>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  )}
                  <p className="text-[10px] text-muted-foreground mt-2">
                    Action = clic CTA ou objectif atteint. Surlignage à partir de 10 envois.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Top CTA, quels liens font cliquer ?</CardTitle>
                </CardHeader>
                <CardContent>
                  {topCtas.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-6 text-center">Aucun clic sur la période.</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>URL cliquée</TableHead>
                          <TableHead>Templates</TableHead>
                          <TableHead className="text-right">Clics</TableHead>
                          <TableHead className="text-right">Uniques</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {topCtas.slice(0, 15).map((c) => (
                          <TableRow key={c.url}>
                            <TableCell>
                              <a
                                href={c.url}
                                target="_blank"
                                rel="noreferrer"
                                className="text-sm text-primary hover:underline break-all"
                              >
                                {c.url.replace(/^https?:\/\/[^/]+/, "")}
                              </a>
                            </TableCell>
                            <TableCell className="text-[11px] text-muted-foreground">
                              {Array.from(c.templates).map(labelTemplate).join(", ") || ","}
                            </TableCell>
                            <TableCell className="text-right text-sm font-semibold">{c.clicks}</TableCell>
                            <TableCell className="text-right text-sm text-muted-foreground">{c.uniqueSends}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Détail par séquence</CardTitle>
                <p className="text-xs text-muted-foreground mt-1">
                  Métriques + étapes configurées + accès aux destinataires.
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                {sequences.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">Aucune séquence configurée.</p>
                ) : (
                  sequences.map((s) => {
                    const m = sequenceMetrics.get(s.key) ?? { sent: 0, failed: 0, exited: 0, activeJourneys: 0, totalJourneys: 0, opens: 0, clicks: 0, actions: 0 };
                    const steps = stepsBySequence.get(s.key) ?? [];
                    const ruleType = s.enrollment_rule?.type ?? ",";
                    const ruleLabel = RULE_TYPE_LABELS[ruleType] ?? ruleType;
                    const ruleDetail =
                      ruleType === "inactivity" && s.enrollment_rule?.days
                        ? ` (après ${s.enrollment_rule.days} j d'inactivité)`
                        : ruleType === "sitter_no_application" && s.enrollment_rule?.min_age_days
                          ? ` (après ${s.enrollment_rule.min_age_days} j sans candidature)`
                          : "";
                    return (
                      <div key={s.key} className="border border-border rounded-lg p-4 space-y-3">
                        <div className="flex items-start justify-between gap-3 flex-wrap">
                          <div>
                            <h3 className="font-semibold text-foreground">{labelSequence(s.key)}</h3>
                            {s.description && <p className="text-xs text-muted-foreground mt-1 max-w-2xl">{s.description}</p>}
                          </div>
                          <div className="flex gap-1.5 flex-wrap items-center">
                            <Badge variant={s.active ? "default" : "outline"}>{s.active ? "Active" : "Inactive"}</Badge>
                            <Badge variant="secondary">{AUDIENCE_LABELS[s.audience] ?? s.audience}</Badge>
                            <Badge variant="outline">{ruleLabel}{ruleDetail}</Badge>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-6 text-xs"
                              onClick={() => setRecipientsDialog({ key: s.key, label: labelSequence(s.key) })}
                            >
                              Voir destinataires
                            </Button>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-xs">
                          <div className="bg-muted/40 rounded px-2 py-1.5">
                            <p className="text-muted-foreground">Parcours actifs</p>
                            <p className="font-semibold text-foreground text-base">{m.activeJourneys}</p>
                          </div>
                          <div className="bg-muted/40 rounded px-2 py-1.5">
                            <p className="text-muted-foreground">Nouveaux (période)</p>
                            <p className="font-semibold text-foreground text-base">{m.totalJourneys}</p>
                          </div>
                          <div className="bg-muted/40 rounded px-2 py-1.5">
                            <p className="text-muted-foreground">Emails envoyés</p>
                            <p className="font-semibold text-success text-base">{m.sent}</p>
                          </div>
                          <div className="bg-muted/40 rounded px-2 py-1.5">
                            <p className="text-muted-foreground">Échecs</p>
                            <p className={`font-semibold text-base ${m.failed > 0 ? "text-destructive" : "text-foreground"}`}>{m.failed}</p>
                          </div>
                          <div className="bg-muted/40 rounded px-2 py-1.5">
                            <p className="text-muted-foreground">Sorties (objectif)</p>
                            <p className="font-semibold text-foreground text-base">{m.exited}</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-2 text-xs">
                          <div className="bg-primary/5 border border-primary/15 rounded px-2 py-1.5">
                            <p className="text-muted-foreground">Taux d'ouverture</p>
                            <p className="font-semibold text-foreground text-base">
                              {m.sent > 0 ? `${Math.round((m.opens / m.sent) * 100)}%` : ","}
                            </p>
                            <p className="text-[10px] text-muted-foreground">{m.opens} / {m.sent}</p>
                          </div>
                          <div className="bg-primary/5 border border-primary/15 rounded px-2 py-1.5">
                            <p className="text-muted-foreground">Taux de clic CTA</p>
                            <p className="font-semibold text-foreground text-base">
                              {m.sent > 0 ? `${Math.round((m.clicks / m.sent) * 100)}%` : ","}
                            </p>
                            <p className="text-[10px] text-muted-foreground">{m.clicks} / {m.sent}</p>
                          </div>
                          <div className="bg-success/10 border border-success/25 rounded px-2 py-1.5">
                            <p className="text-muted-foreground">Taux d'action</p>
                            <p className="font-semibold text-success text-base">
                              {m.sent > 0 ? `${Math.round((m.actions / m.sent) * 100)}%` : ","}
                            </p>
                            <p className="text-[10px] text-muted-foreground">clic ou objectif</p>
                          </div>
                        </div>
                        <div className="text-xs">
                          <p className="text-muted-foreground mb-1.5">Étapes ({steps.length}) :</p>
                          <div className="flex flex-wrap gap-1.5">
                            {steps.map((st) => (
                              <span
                                key={st.step_order}
                                className="inline-flex items-center gap-1.5 bg-background border border-border rounded px-2 py-1"
                                title={`Template : ${st.template_name}`}
                              >
                                <span className="font-mono text-muted-foreground">{formatDelay(st.delay_hours)}</span>
                                <span>{labelTemplate(st.template_name)}</span>
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Derniers envois</CardTitle>
                <p className="text-xs text-muted-foreground mt-1">10 emails de nurturing les plus récents (avec engagement).</p>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                {recentSends.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-6 text-center">Aucun envoi sur la période.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Séquence</TableHead>
                        <TableHead>Étape</TableHead>
                        <TableHead>Engagement</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recentSends.map((l) => {
                        const ev = l.message_id ? eventsByMid.get(l.message_id) : undefined;
                        return (
                          <TableRow key={l.id}>
                            <TableCell className="text-xs whitespace-nowrap">{format(new Date(l.created_at), "dd MMM HH:mm", { locale: fr })}</TableCell>
                            <TableCell className="text-sm">{labelSequence(l.user_journeys?.sequence_key ?? ",")}</TableCell>
                            <TableCell className="text-sm">{labelTemplate(l.template_name)} <span className="text-[10px] text-muted-foreground">· étape {l.step_order}</span></TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                <Badge variant={ev?.open ? "default" : "outline"} className="text-[10px]">{ev?.open ? "Ouvert" : "Non ouvert"}</Badge>
                                {ev?.click && <Badge variant="default" className="bg-success text-success-foreground text-[10px]">Cliqué</Badge>}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* =========== ONGLET 3 : DIAGNOSTIC =========== */}
          <TabsContent value="diagnostic" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span
                    className={`inline-block h-2.5 w-2.5 rounded-full ${
                      measurementHealth.tone === "err"
                        ? "bg-destructive"
                        : measurementHealth.tone === "warn"
                          ? "bg-warning"
                          : "bg-success"
                    }`}
                  />
                  Santé de la mesure d'engagement
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-1">
                  Un envoi sans <code className="text-[11px]">message_id</code> ne peut pas être
                  corrélé aux ouvertures et clics : les taux d'engagement sont alors sous-estimés.
                </p>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-4">
                  <StatCard label="Envois sur la période" value={measurementHealth.sent} />
                  <StatCard
                    label="Sans message_id"
                    value={measurementHealth.missing}
                    tone={
                      measurementHealth.missing === 0
                        ? "ok"
                        : measurementHealth.tone === "err"
                          ? "err"
                          : "warn"
                    }
                  />
                  <StatCard
                    label="Part non corrélée"
                    value={`${measurementHealth.missingRate}%`}
                    tone={
                      measurementHealth.missingRate === 0
                        ? "ok"
                        : measurementHealth.missingRate >= 20
                          ? "err"
                          : "warn"
                    }
                    hint="Seuil d'alerte : ≥ 20%"
                  />
                  <StatCard
                    label="État"
                    value={measurementHealth.label}
                    tone={measurementHealth.tone}
                    hint={measurementHealth.hint}
                  />
                </div>
                {measurementHealth.missing > 0 && (
                  <p className="text-xs text-muted-foreground mt-3">
                    Vérifier que <code className="text-[11px]">send-transactional-email</code>{" "}
                    renvoie bien <code className="text-[11px]">messageId</code>, et qu'à défaut le
                    fallback via <code className="text-[11px]">email_send_log.metadata.idempotency_key</code>{" "}
                    fonctionne dans <code className="text-[11px]">evaluate-journeys</code>.
                  </p>
                )}
              </CardContent>
            </Card>

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
                hint={`${stats.successRate}% de réussite`}
              />
              <StatCard
                label="Échecs evaluator"
                value={stats.failed}
                tone={stats.failed > 0 ? "err" : "ok"}
                hint={`${stats.failureRate}% des tentatives`}
              />
              <StatCard
                label="Parcours créés"
                value={journeyStats.total}
                hint={`${journeyStats.active} actifs · ${journeyStats.exited} sortis`}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-5">
              <StatCard
                label="Queue, total"
                value={queueStats.total}
                hint={
                  nurturingTemplates.length > 0
                    ? `${nurturingTemplates.length} templates suivis`
                    : "Aucun template configuré"
                }
              />
              <StatCard label="Queue, sent" value={queueStats.sent} tone="ok" />
              <StatCard label="Queue, pending" value={queueStats.pending} tone={queueStats.pending > 0 ? "warn" : "ok"} />
              <StatCard
                label="Queue, failed/DLQ"
                value={queueStats.failed}
                tone={queueStats.failed > 0 ? "err" : "ok"}
              />
              <StatCard label="Queue, suppressed" value={queueStats.suppressed} />
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
                            <TableCell className="text-sm" title={r.reason}>{labelReason(r.reason)}</TableCell>
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
                            <TableCell className="text-sm">{s.template}</TableCell>
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
                  Le détail HTTP (status + extrait de body) est capturé pour chaque échec.
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
                        <TableHead>Détail HTTP</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recentFailures.map((l) => (
                        <TableRow key={l.id}>
                          <TableCell className="text-xs whitespace-nowrap">
                            {format(new Date(l.created_at), "dd MMM HH:mm", { locale: fr })}
                          </TableCell>
                          <TableCell className="text-sm" title={l.user_journeys?.sequence_key ?? ""}>{labelSequence(l.user_journeys?.sequence_key ?? ",")}</TableCell>
                          <TableCell>{l.step_order}</TableCell>
                          <TableCell className="text-sm" title={l.template_name}>{labelTemplate(l.template_name)}</TableCell>
                          <TableCell>
                            <Badge variant="destructive" title={l.reason ?? ""}>{labelReason(l.reason)}</Badge>
                          </TableCell>
                          <TableCell className="font-mono text-[11px] max-w-md truncate" title={l.error_detail?.body_excerpt ?? ""}>
                            {l.error_detail?.status ? `${l.error_detail.status} · ${l.error_detail.body_excerpt?.slice(0, 80) ?? ""}` : ","}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {recipientsDialog && (
        <SequenceRecipientsDialog
          open={!!recipientsDialog}
          onOpenChange={(v) => !v && setRecipientsDialog(null)}
          sequenceKey={recipientsDialog.key}
          sequenceLabel={recipientsDialog.label}
          sinceIso={sinceIso}
        />
      )}

      <AlertDialog open={preview !== null} onOpenChange={(v) => { if (!v && !triggering) setPreview(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer l'envoi réel</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-sm">
                <p>
                  <strong>{preview?.sent ?? 0} email{(preview?.sent ?? 0) > 1 ? "s" : ""}</strong> {" "}
                  ser{(preview?.sent ?? 0) > 1 ? "ont" : "a"} envoyé{(preview?.sent ?? 0) > 1 ? "s" : ""} {" "}
                  maintenant à de vrais utilisateurs.
                </p>
                <p className="text-muted-foreground">
                  Enrôlés : {preview?.enrolled ?? 0} · Sortis : {preview?.exited ?? 0} · Sautés : {preview?.skipped ?? 0}
                </p>
                {preview?.bySequence && Object.keys(preview.bySequence).length > 0 && (
                  <div className="border border-border rounded-md p-3 space-y-1">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Détail par séquence</p>
                    {Object.entries(preview.bySequence).map(([key, s]) => (
                      <div key={key} className="flex justify-between text-xs">
                        <span>{labelSequence(key)}</span>
                        <span className="text-muted-foreground">
                          envoyés {s.sent} · enrôlés {s.enrolled} · sortis {s.exited} · sautés {s.skipped}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                <p className="text-destructive font-medium">
                  Ce sont de vrais envois, immédiats et non annulables.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={triggering}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              disabled={triggering}
              onClick={(e) => { e.preventDefault(); confirmEvaluate(); }}
            >
              {triggering ? (
                <><Loader2 className="h-4 w-4 mr-1 animate-spin" />Envoi en cours,</>
              ) : (
                <>Envoyer {preview?.sent ?? 0} email{(preview?.sent ?? 0) > 1 ? "s" : ""}</>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminNurturing;
