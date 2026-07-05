import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RefreshCw, Send, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface DayStats {
  date: string;
  sent: number;
  opened: number;
  clicked: number;
  applied: number;
}

const pct = (num: number, den: number) => (den > 0 ? `${((num / den) * 100).toFixed(1)}%` : "–");

/**
 * Onglet admin dédié au digest quotidien sitter.
 * KPIs, table par date, envoi manuel, export CSV.
 * Source de vérité :
 *   - email_send_log filtré template_name='sitter-daily-digest' (dédup message_id)
 *   - analytics_events event_type='sitter_digest_apply_from_email' pour les candidatures attribuées
 *   - sitter_digest_queue pour la file en attente
 */
const SitterDigestTab = () => {
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState("30d");
  const [days, setDays] = useState<DayStats[]>([]);
  const [totals, setTotals] = useState({ sent: 0, opened: 0, clicked: 0, applied: 0, queuedPending: 0 });
  const [manualSitterId, setManualSitterId] = useState("");
  const [sending, setSending] = useState(false);
  const [dryRun, setDryRun] = useState(false);

  const fetchStats = async () => {
    setLoading(true);
    const now = new Date();
    const start = new Date();
    if (timeRange === "24h") start.setHours(now.getHours() - 24);
    else if (timeRange === "7d") start.setDate(now.getDate() - 7);
    else if (timeRange === "30d") start.setDate(now.getDate() - 30);
    else if (timeRange === "90d") start.setDate(now.getDate() - 90);

    // 1) Emails du digest
    const { data: logs, error: logsErr } = await supabase
      .from("email_send_log")
      .select("message_id,status,created_at,delivered_at,open_count,click_count")
      .eq("template_name", "sitter-daily-digest")
      .gte("created_at", start.toISOString())
      .order("created_at", { ascending: false })
      .limit(10000);

    if (logsErr) {
      toast.error("Erreur lors du chargement des logs");
      setLoading(false);
      return;
    }

    // Dédup par message_id, ne garder que le dernier statut
    const byMsg = new Map<string, any>();
    (logs || []).forEach((r) => {
      const k = r.message_id || `no-${r.created_at}`;
      const prev = byMsg.get(k);
      if (!prev || new Date(r.created_at) > new Date(prev.created_at)) byMsg.set(k, r);
    });
    const dedup = Array.from(byMsg.values()).filter((r) => r.status === "sent" || r.delivered_at);

    // 2) Candidatures attribuées au digest via analytics_events
    const { data: applies } = await supabase
      .from("analytics_events")
      .select("created_at")
      .eq("event_type", "sitter_digest_apply_from_email")
      .gte("created_at", start.toISOString())
      .limit(10000);

    // 3) File en attente (status='queued')
    const { count: queuedPending } = await supabase
      .from("sitter_digest_queue")
      .select("id", { count: "exact", head: true })
      .eq("status", "queued");

    // Agrégation par jour (YYYY-MM-DD)
    const byDay = new Map<string, DayStats>();
    const bump = (d: string, key: keyof Omit<DayStats, "date">, n = 1) => {
      const s = byDay.get(d) || { date: d, sent: 0, opened: 0, clicked: 0, applied: 0 };
      s[key] += n;
      byDay.set(d, s);
    };
    dedup.forEach((r) => {
      const d = (r.created_at || "").slice(0, 10);
      if (!d) return;
      bump(d, "sent");
      if ((r.open_count || 0) > 0) bump(d, "opened");
      if ((r.click_count || 0) > 0) bump(d, "clicked");
    });
    (applies || []).forEach((r) => {
      const d = (r.created_at || "").slice(0, 10);
      if (d) bump(d, "applied");
    });

    const list = Array.from(byDay.values()).sort((a, b) => (a.date < b.date ? 1 : -1));
    setDays(list);
    setTotals({
      sent: list.reduce((a, b) => a + b.sent, 0),
      opened: list.reduce((a, b) => a + b.opened, 0),
      clicked: list.reduce((a, b) => a + b.clicked, 0),
      applied: list.reduce((a, b) => a + b.applied, 0),
      queuedPending: queuedPending || 0,
    });
    setLoading(false);
  };

  useEffect(() => { fetchStats(); }, [timeRange]);

  const runManual = async () => {
    setSending(true);
    try {
      const body: any = { manual: true };
      if (dryRun) body.dry_run = true;
      if (manualSitterId.trim()) body.sitter_id = manualSitterId.trim();
      const { data, error } = await supabase.functions.invoke("send-sitter-daily-digest", { body });
      if (error) throw error;
      toast.success(dryRun ? "Dry-run exécuté" : "Envoi manuel déclenché", {
        description: data ? JSON.stringify(data).slice(0, 200) : undefined,
      });
      fetchStats();
    } catch (e: any) {
      toast.error("Envoi échoué", { description: e?.message?.slice(0, 200) });
    } finally {
      setSending(false);
    }
  };

  const exportCsv = () => {
    const header = "date,sent,opened,clicked,applied,open_rate,click_rate,apply_rate";
    const lines = days.map(
      (d) =>
        `${d.date},${d.sent},${d.opened},${d.clicked},${d.applied},${pct(d.opened, d.sent)},${pct(d.clicked, d.sent)},${pct(d.applied, d.sent)}`
    );
    const blob = new Blob([header + "\n" + lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sitter-digest-${timeRange}-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Digest quotidien envoyé à 20h Paris aux gardiens opt-in. Attribution des candidatures via
        <code className="text-xs bg-muted px-1 rounded ml-1">utm_campaign=sitter_daily_digest</code> et event
        <code className="text-xs bg-muted px-1 rounded ml-1">sitter_digest_apply_from_email</code>.
      </p>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card><CardContent className="pt-4 pb-3 text-center">
          <div className="text-2xl font-bold">{totals.sent}</div>
          <div className="text-xs text-muted-foreground">Digests envoyés</div>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-3 text-center">
          <div className="text-2xl font-bold text-success">{pct(totals.opened, totals.sent)}</div>
          <div className="text-xs text-muted-foreground">Ouverture</div>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-3 text-center">
          <div className="text-2xl font-bold text-success">{pct(totals.clicked, totals.sent)}</div>
          <div className="text-xs text-muted-foreground">Clic CTA</div>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-3 text-center">
          <div className="text-2xl font-bold text-primary">{totals.applied}</div>
          <div className="text-xs text-muted-foreground">Candidatures ({pct(totals.applied, totals.sent)})</div>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-3 text-center">
          <div className="text-2xl font-bold text-warning">{totals.queuedPending}</div>
          <div className="text-xs text-muted-foreground">En file (queued)</div>
        </CardContent></Card>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <div className="flex gap-1">
          {["24h", "7d", "30d", "90d"].map((range) => (
            <Button
              key={range}
              size="sm"
              variant={timeRange === range ? "default" : "outline"}
              onClick={() => setTimeRange(range)}
            >
              {range === "24h" ? "24h" : range === "7d" ? "7 jours" : range === "30d" ? "30 jours" : "90 jours"}
            </Button>
          ))}
        </div>
        <Button size="sm" variant="ghost" onClick={fetchStats}>
          <RefreshCw className="h-3.5 w-3.5" />
        </Button>
        <div className="flex-1" />
        <Button size="sm" variant="outline" onClick={exportCsv} disabled={days.length === 0}>
          Export CSV
        </Button>
      </div>

      <Card>
        <CardContent className="pt-4 pb-4 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Envoi manuel (test)
          </p>
          <div className="flex flex-wrap gap-2 items-center">
            <Input
              placeholder="sitter_id (UUID) optionnel, sinon tous"
              value={manualSitterId}
              onChange={(e) => setManualSitterId(e.target.value)}
              className="max-w-md text-xs font-mono"
            />
            <label className="flex items-center gap-1 text-xs">
              <input type="checkbox" checked={dryRun} onChange={(e) => setDryRun(e.target.checked)} />
              Dry-run
            </label>
            <Button size="sm" onClick={runManual} disabled={sending}>
              {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
              <span className="ml-1">{dryRun ? "Simuler" : "Envoyer maintenant"}</span>
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Le mode <code>manual: true</code> contourne la limite anti-doublon 24h. Le dry-run ne modifie ni la file
            ni les logs, il liste seulement le plan d'envoi.
          </p>
        </CardContent>
      </Card>

      <div className="rounded-md border overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs">Date</TableHead>
              <TableHead className="text-xs text-right">Envoyés</TableHead>
              <TableHead className="text-xs text-right">Ouv.</TableHead>
              <TableHead className="text-xs text-right">Clic</TableHead>
              <TableHead className="text-xs text-right">Cand.</TableHead>
              <TableHead className="text-xs text-right">Cand./envoi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  Chargement...
                </TableCell>
              </TableRow>
            ) : days.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  Aucun envoi sur la période
                </TableCell>
              </TableRow>
            ) : (
              days.map((d) => (
                <TableRow key={d.date}>
                  <TableCell className="text-xs">
                    {format(new Date(d.date), "d MMM yyyy", { locale: fr })}
                  </TableCell>
                  <TableCell className="text-xs text-right">{d.sent}</TableCell>
                  <TableCell className="text-xs text-right">
                    <span className="font-medium">{pct(d.opened, d.sent)}</span>
                    <span className="text-muted-foreground text-[10px] ml-1">({d.opened})</span>
                  </TableCell>
                  <TableCell className="text-xs text-right">
                    <span className="font-medium">{pct(d.clicked, d.sent)}</span>
                    <span className="text-muted-foreground text-[10px] ml-1">({d.clicked})</span>
                  </TableCell>
                  <TableCell className="text-xs text-right text-primary font-medium">{d.applied}</TableCell>
                  <TableCell className="text-xs text-right">{pct(d.applied, d.sent)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default SitterDigestTab;
