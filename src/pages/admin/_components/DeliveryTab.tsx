import { useCallback, useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { RefreshCw, AlertTriangle, Settings2, Play } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface Threshold {
  bounce_pct_max: number;
  open_pct_min: number;
  complaint_pct_max: number;
  min_sends: number;
  window_days: number;
  alert_enabled: boolean;
  alert_recipient: string | null;
}

interface Snapshot {
  snapshot_date: string;
  window_days: number;
  total_sent: number;
  total_delivered: number;
  total_opened: number;
  total_clicked: number;
  total_bounced: number;
  total_complained: number;
  bounce_rate: number;
  open_rate: number;
  click_rate: number;
  complaint_rate: number;
  breaches: Array<{ metric: string; value: number; threshold: number; detail?: string }>;
  per_template: Array<{ template: string; sent: number; delivered: number; opened: number; clicked: number; bounced: number; complained: number }>;
}

const pct = (n: number) => `${n.toFixed(2)} %`;

const DeliveryTab = () => {
  const [threshold, setThreshold] = useState<Threshold | null>(null);
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [draft, setDraft] = useState<Threshold | null>(null);
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: th }, { data: snaps }] = await Promise.all([
      supabase.from("email_delivery_thresholds").select("*").eq("id", 1).maybeSingle(),
      supabase.from("email_delivery_snapshots").select("*").order("snapshot_date", { ascending: false }).limit(30),
    ]);
    if (th) setThreshold(th as Threshold);
    if (snaps) setSnapshots(snaps as unknown as Snapshot[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const openEdit = () => { if (threshold) { setDraft({ ...threshold }); setEditOpen(true); } };

  const save = async () => {
    if (!draft) return;
    setSaving(true);
    const { error } = await supabase
      .from("email_delivery_thresholds")
      .update({
        bounce_pct_max: draft.bounce_pct_max,
        open_pct_min: draft.open_pct_min,
        complaint_pct_max: draft.complaint_pct_max,
        min_sends: draft.min_sends,
        window_days: draft.window_days,
        alert_enabled: draft.alert_enabled,
        alert_recipient: draft.alert_recipient?.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", 1);
    setSaving(false);
    if (error) { toast.error("Erreur : " + error.message); return; }
    toast.success("Seuils mis à jour");
    setEditOpen(false);
    load();
  };

  const runNow = async (dryRun = false) => {
    setRunning(true);
    const { data, error } = await supabase.functions.invoke("email-delivery-daily", {
      body: { dry_run: dryRun },
    });
    setRunning(false);
    if (error) { toast.error("Erreur : " + error.message); return; }
    toast.success(dryRun ? "Dry-run OK" : `Snapshot calculé (${data?.breaches?.length || 0} alertes)`);
    load();
  };

  const latest = snapshots[0];

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Délivrabilité pure : la mécanique d'envoi fonctionne-t-elle ? Bounces, plaintes, pixels de tracking.
        Snapshot quotidien calculé à 9h Paris. Alerte email admin si seuils dépassés.
      </p>

      {threshold && (
        <Card>
          <CardContent className="pt-4 pb-4 flex flex-wrap items-center gap-3">
            <div className="text-sm flex-1 min-w-0">
              <div className="font-medium">Seuils actifs (fenêtre {threshold.window_days} j)</div>
              <div className="text-xs text-muted-foreground mt-1">
                Bounce &gt; {threshold.bounce_pct_max}% · Ouverture &lt; {threshold.open_pct_min}% (min {threshold.min_sends} envois) · Plainte &gt; {threshold.complaint_pct_max}%
                {' · '}Alerte : {threshold.alert_enabled ? "activée" : "désactivée"}
                {threshold.alert_recipient ? ` (${threshold.alert_recipient})` : " (1er admin)"}
              </div>
            </div>
            <Button size="sm" variant="outline" onClick={openEdit}>
              <Settings2 className="h-3.5 w-3.5 mr-1" /> Modifier les seuils
            </Button>
            <Button size="sm" variant="outline" onClick={() => runNow(true)} disabled={running}>
              Dry-run
            </Button>
            <Button size="sm" onClick={() => runNow(false)} disabled={running}>
              <Play className="h-3.5 w-3.5 mr-1" /> Recalculer maintenant
            </Button>
            <Button size="sm" variant="ghost" onClick={load}><RefreshCw className="h-3.5 w-3.5" /></Button>
          </CardContent>
        </Card>
      )}

      {latest && (
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          <Kpi label="Envoyés" value={latest.total_sent} />
          <Kpi label="Livrés" value={latest.total_delivered} />
          <Kpi label="Bounce" value={pct(latest.bounce_rate)} tone={latest.bounce_rate > (threshold?.bounce_pct_max ?? 5) ? "destructive" : "muted"} />
          <Kpi label="Plainte" value={pct(latest.complaint_rate)} tone={latest.complaint_rate > (threshold?.complaint_pct_max ?? 0.1) ? "destructive" : "muted"} />
          <Kpi label="Ouverture" value={pct(latest.open_rate)} tone={latest.total_sent > (threshold?.min_sends ?? 10) && latest.open_rate < (threshold?.open_pct_min ?? 15) ? "warning" : "success"} />
          <Kpi label="Clic" value={pct(latest.click_rate)} tone="muted" />
        </div>
      )}

      {latest && latest.breaches.length > 0 && (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="pt-4 pb-4 space-y-2">
            <div className="flex items-center gap-2 text-destructive font-medium">
              <AlertTriangle className="h-4 w-4" /> {latest.breaches.length} seuil(s) dépassé(s)
            </div>
            <ul className="text-sm space-y-1">
              {latest.breaches.map((b, i) => (
                <li key={i}>
                  <Badge variant="destructive" className="mr-2">{b.metric}</Badge>
                  {b.value.toFixed(2)} % (seuil {b.threshold} %){b.detail ? ` · ${b.detail}` : ""}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <div className="rounded-md border overflow-auto">
        <div className="px-4 py-2 text-xs font-medium text-muted-foreground border-b bg-muted/30">
          Historique des snapshots (30 derniers jours)
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs">Date</TableHead>
              <TableHead className="text-xs text-right">Envoyés</TableHead>
              <TableHead className="text-xs text-right">Livrés</TableHead>
              <TableHead className="text-xs text-right">Bounce</TableHead>
              <TableHead className="text-xs text-right">Plainte</TableHead>
              <TableHead className="text-xs text-right">Ouverture</TableHead>
              <TableHead className="text-xs text-right">Clic</TableHead>
              <TableHead className="text-xs text-right">Alertes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">Chargement…</TableCell></TableRow>
            ) : snapshots.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">Aucun snapshot. Lancez « Recalculer maintenant ».</TableCell></TableRow>
            ) : snapshots.map((s) => (
              <TableRow key={`${s.snapshot_date}-${s.window_days}`}>
                <TableCell className="text-xs">{format(new Date(s.snapshot_date), "d MMM yyyy", { locale: fr })}</TableCell>
                <TableCell className="text-xs text-right">{s.total_sent}</TableCell>
                <TableCell className="text-xs text-right">{s.total_delivered}</TableCell>
                <TableCell className={`text-xs text-right ${s.bounce_rate > (threshold?.bounce_pct_max ?? 5) ? "text-destructive font-medium" : ""}`}>{pct(s.bounce_rate)}</TableCell>
                <TableCell className={`text-xs text-right ${s.complaint_rate > (threshold?.complaint_pct_max ?? 0.1) ? "text-destructive font-medium" : ""}`}>{pct(s.complaint_rate)}</TableCell>
                <TableCell className="text-xs text-right">{pct(s.open_rate)}</TableCell>
                <TableCell className="text-xs text-right">{pct(s.click_rate)}</TableCell>
                <TableCell className="text-xs text-right">
                  {s.breaches.length > 0 ? <Badge variant="destructive">{s.breaches.length}</Badge> : <span className="text-muted-foreground">–</span>}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Modifier les seuils de délivrabilité</DialogTitle></DialogHeader>
          {draft && (
            <div className="space-y-3">
              <NumField label="Bounce max (%)" value={draft.bounce_pct_max} onChange={(v) => setDraft({ ...draft, bounce_pct_max: v })} step={0.1} />
              <NumField label="Ouverture min (%)" value={draft.open_pct_min} onChange={(v) => setDraft({ ...draft, open_pct_min: v })} step={0.5} />
              <NumField label="Plainte max (%)" value={draft.complaint_pct_max} onChange={(v) => setDraft({ ...draft, complaint_pct_max: v })} step={0.01} />
              <NumField label="Min envois pour évaluer l'ouverture" value={draft.min_sends} onChange={(v) => setDraft({ ...draft, min_sends: Math.round(v) })} step={1} />
              <NumField label="Fenêtre (jours)" value={draft.window_days} onChange={(v) => setDraft({ ...draft, window_days: Math.round(v) })} step={1} />
              <div className="flex items-center justify-between">
                <Label>Alerte email activée</Label>
                <Switch checked={draft.alert_enabled} onCheckedChange={(v) => setDraft({ ...draft, alert_enabled: v })} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Destinataire de l'alerte (optionnel)</Label>
                <Input
                  type="email"
                  placeholder="1er admin par défaut"
                  value={draft.alert_recipient ?? ""}
                  onChange={(e) => setDraft({ ...draft, alert_recipient: e.target.value })}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Annuler</Button>
            <Button onClick={save} disabled={saving}>{saving ? "…" : "Enregistrer"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const Kpi = ({ label, value, tone = "muted" }: { label: string; value: number | string; tone?: "muted" | "success" | "warning" | "destructive" }) => {
  const cls = tone === "destructive" ? "text-destructive" : tone === "warning" ? "text-warning" : tone === "success" ? "text-success" : "";
  return (
    <Card><CardContent className="pt-4 pb-3 text-center">
      <div className={`text-2xl font-bold ${cls}`}>{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </CardContent></Card>
  );
};

const NumField = ({ label, value, onChange, step }: { label: string; value: number; onChange: (v: number) => void; step: number }) => (
  <div className="space-y-1">
    <Label className="text-xs">{label}</Label>
    <Input type="number" value={value} step={step} onChange={(e) => onChange(Number(e.target.value))} />
  </div>
);

export default DeliveryTab;
