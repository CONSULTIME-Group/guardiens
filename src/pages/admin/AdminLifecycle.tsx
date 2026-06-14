import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { supabase } from "@/integrations/supabase/client";
import PageMeta from "@/components/PageMeta";
import { useAdmin } from "@/hooks/useAdmin";
import { Navigate } from "react-router-dom";

type Window = 7 | 30 | 90;

interface SeqRow {
  sequence_key: string;
  active: number;
  completed: number;
  exited: number;
  total: number;
  exit_rate: number;
}

interface TplRow {
  template_name: string;
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  bounced: number;
  open_rate: number;
  click_rate: number;
  bounce_rate: number;
}

const pct = (n: number, d: number) => (d > 0 ? Math.round((n / d) * 1000) / 10 : 0);

const AdminLifecycle = () => {
  const { isAdmin, loading: adminLoading } = useAdmin();
  const [windowDays, setWindowDays] = useState<Window>(30);
  const [seqs, setSeqs] = useState<SeqRow[]>([]);
  const [tpls, setTpls] = useState<TplRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAdmin) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const since = new Date(Date.now() - windowDays * 86400_000).toISOString();

      // Sequences agg
      const { data: jRows } = await supabase
        .from("user_journeys")
        .select("sequence_key, status, started_at")
        .gte("started_at", since);
      const seqMap = new Map<string, SeqRow>();
      for (const r of jRows || []) {
        const key = (r as any).sequence_key as string;
        const s = (r as any).status as string;
        if (!seqMap.has(key)) seqMap.set(key, { sequence_key: key, active: 0, completed: 0, exited: 0, total: 0, exit_rate: 0 });
        const row = seqMap.get(key)!;
        row.total++;
        if (s === "active") row.active++;
        else if (s === "completed") row.completed++;
        else if (s === "exited") row.exited++;
      }
      const seqArr = Array.from(seqMap.values()).map((r) => ({ ...r, exit_rate: pct(r.exited, r.total) }))
        .sort((a, b) => b.total - a.total);

      // Templates engagement
      const { data: logs } = await supabase
        .from("email_send_log")
        .select("template_name, status, delivered_at, first_opened_at, first_clicked_at, bounced_at")
        .gte("created_at", since)
        .limit(50000);
      const tplMap = new Map<string, TplRow>();
      for (const r of logs || []) {
        const k = (r as any).template_name as string;
        if (!k) continue;
        if (!tplMap.has(k)) tplMap.set(k, {
          template_name: k, sent: 0, delivered: 0, opened: 0, clicked: 0, bounced: 0,
          open_rate: 0, click_rate: 0, bounce_rate: 0,
        });
        const t = tplMap.get(k)!;
        if ((r as any).status === "sent") t.sent++;
        if ((r as any).delivered_at) t.delivered++;
        if ((r as any).first_opened_at) t.opened++;
        if ((r as any).first_clicked_at) t.clicked++;
        if ((r as any).bounced_at) t.bounced++;
      }
      const tplArr = Array.from(tplMap.values()).map((t) => ({
        ...t,
        open_rate: pct(t.opened, t.delivered || t.sent),
        click_rate: pct(t.clicked, t.delivered || t.sent),
        bounce_rate: pct(t.bounced, t.sent),
      })).sort((a, b) => b.sent - a.sent);

      if (cancelled) return;
      setSeqs(seqArr);
      setTpls(tplArr);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [isAdmin, windowDays]);

  if (adminLoading) return <div className="p-6 text-muted-foreground">Chargement…</div>;
  if (!isAdmin) return <Navigate to="/" replace />;

  const totalActive = seqs.reduce((s, r) => s + r.active, 0);
  const totalCompleted = seqs.reduce((s, r) => s + r.completed, 0);
  const totalExited = seqs.reduce((s, r) => s + r.exited, 0);
  const totalSent = tpls.reduce((s, t) => s + t.sent, 0);
  const totalOpened = tpls.reduce((s, t) => s + t.opened, 0);
  const totalClicked = tpls.reduce((s, t) => s + t.clicked, 0);

  return (
    <div className="min-w-0 max-w-7xl mx-auto px-4 py-6 md:py-10 space-y-6">
      <PageMeta title="Lifecycle, pilotage des séquences" description="Dashboard admin lifecycle : séquences actives, taux de sortie, performance des templates email." noindex />

      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl md:text-3xl font-semibold">Lifecycle</h1>
          <p className="text-sm text-muted-foreground mt-1">Pilotage des séquences email et taux d'engagement.</p>
        </div>
        <ToggleGroup
          type="single"
          value={String(windowDays)}
          onValueChange={(v) => v && setWindowDays(Number(v) as Window)}
          variant="outline"
          size="sm"
        >
          <ToggleGroupItem value="7">7 j</ToggleGroupItem>
          <ToggleGroupItem value="30">30 j</ToggleGroupItem>
          <ToggleGroupItem value="90">90 j</ToggleGroupItem>
        </ToggleGroup>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <Kpi label="Séquences actives" value={totalActive} />
        <Kpi label="Complétées" value={totalCompleted} />
        <Kpi label="Sorties" value={totalExited} />
        <Kpi label="Emails envoyés" value={totalSent} />
        <Kpi label="Taux ouverture" value={`${pct(totalOpened, totalSent)} %`} />
        <Kpi label="Taux clic" value={`${pct(totalClicked, totalSent)} %`} />
      </div>

      <Card>
        <CardHeader><CardTitle className="text-lg">Séquences (fenêtre {windowDays} j)</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          {loading ? <p className="text-sm text-muted-foreground">Chargement…</p> : seqs.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune séquence sur la période.</p>
          ) : (
            <Table>
              <TableHeader><TableRow>
                <TableHead>Séquence</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Actives</TableHead>
                <TableHead className="text-right">Complétées</TableHead>
                <TableHead className="text-right">Sorties</TableHead>
                <TableHead className="text-right">Taux sortie</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {seqs.map((r) => (
                  <TableRow key={r.sequence_key}>
                    <TableCell className="font-mono text-xs">{r.sequence_key}</TableCell>
                    <TableCell className="text-right tabular-nums">{r.total}</TableCell>
                    <TableCell className="text-right tabular-nums">{r.active}</TableCell>
                    <TableCell className="text-right tabular-nums">{r.completed}</TableCell>
                    <TableCell className="text-right tabular-nums">{r.exited}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant={r.exit_rate > 30 ? "destructive" : "secondary"}>{r.exit_rate} %</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-lg">Templates email (fenêtre {windowDays} j)</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          {loading ? <p className="text-sm text-muted-foreground">Chargement…</p> : tpls.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun envoi sur la période.</p>
          ) : (
            <Table>
              <TableHeader><TableRow>
                <TableHead>Template</TableHead>
                <TableHead className="text-right">Envoyés</TableHead>
                <TableHead className="text-right">Délivrés</TableHead>
                <TableHead className="text-right">Ouverts</TableHead>
                <TableHead className="text-right">Cliqués</TableHead>
                <TableHead className="text-right">Bounce</TableHead>
                <TableHead className="text-right">Ouv.</TableHead>
                <TableHead className="text-right">Clic</TableHead>
                <TableHead className="text-right">Bnc.</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {tpls.map((t) => (
                  <TableRow key={t.template_name}>
                    <TableCell className="font-mono text-xs">{t.template_name}</TableCell>
                    <TableCell className="text-right tabular-nums">{t.sent}</TableCell>
                    <TableCell className="text-right tabular-nums">{t.delivered}</TableCell>
                    <TableCell className="text-right tabular-nums">{t.opened}</TableCell>
                    <TableCell className="text-right tabular-nums">{t.clicked}</TableCell>
                    <TableCell className="text-right tabular-nums">{t.bounced}</TableCell>
                    <TableCell className="text-right tabular-nums">{t.open_rate} %</TableCell>
                    <TableCell className="text-right tabular-nums">{t.click_rate} %</TableCell>
                    <TableCell className="text-right">
                      <Badge variant={t.bounce_rate > 5 ? "destructive" : "secondary"}>{t.bounce_rate} %</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

const Kpi = ({ label, value }: { label: string; value: number | string }) => (
  <Card>
    <CardContent className="py-4">
      <div className="text-xs text-muted-foreground uppercase tracking-wide">{label}</div>
      <div className="font-heading text-2xl font-semibold mt-1 tabular-nums">{value}</div>
    </CardContent>
  </Card>
);

export default AdminLifecycle;
