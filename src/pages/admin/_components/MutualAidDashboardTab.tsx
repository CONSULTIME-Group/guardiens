import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, RefreshCw, XCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { trackEvent } from "@/lib/analytics";

/**
 * Chantier 8 Pass 3 — Dashboard admin dédié à l'entraide.
 * URL : /admin/emails?tab=mutual-aid
 * Analytics : admin_mutual_aid_dashboard_seen émis une fois par montage.
 */

type Range = "7d" | "30d" | "90d";

const RANGE_LABEL: Record<Range, string> = {
  "7d": "7 derniers jours",
  "30d": "30 derniers jours",
  "90d": "90 derniers jours",
};

const pct = (num: number, den: number) => (den > 0 ? `${((num / den) * 100).toFixed(1)}%` : "–");

interface EmailStats {
  key: string;
  label: string;
  sent: number;
  opened: number;
  clicked: number;
}

interface DormantMission {
  id: string;
  title: string;
  city: string | null;
  created_at: string;
  user_id: string;
  category: string;
}

interface AutoClosedMission {
  id: string;
  title: string;
  city: string | null;
  closed_at: string;
  close_reason: string | null;
  category: string;
}

const EMAIL_TEMPLATES: { key: string; label: string }[] = [
  { key: "mission-daily-digest", label: "Digest quotidien mission" },
  { key: "mutual-aid-weekly-digest", label: "Digest hebdomadaire entraide" },
  { key: "mission-nudge-feedback", label: "Nudge feedback (J+2)" },
  { key: "mission-nudge-no-response", label: "Nudge sans réponse (J+7)" },
];

const rangeToStart = (r: Range): Date => {
  const d = new Date();
  const days = r === "7d" ? 7 : r === "30d" ? 30 : 90;
  d.setDate(d.getDate() - days);
  return d;
};

const csvEscape = (v: unknown): string => {
  const s = v == null ? "" : String(v);
  if (/[",\n;]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
};

const downloadCsv = (filename: string, rows: string[][]) => {
  const csv = rows.map((r) => r.map(csvEscape).join(",")).join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

const MutualAidDashboardTab = () => {
  const [range, setRange] = useState<Range>("30d");
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState({
    newMissions: 0,
    responses: 0,
    feedbacks: 0,
    thanks: 0,
  });
  const [emailStats, setEmailStats] = useState<EmailStats[]>([]);
  const [dormant, setDormant] = useState<DormantMission[]>([]);
  const [autoClosed, setAutoClosed] = useState<AutoClosedMission[]>([]);
  const [closingId, setClosingId] = useState<string | null>(null);
  const seenRef = useRef(false);

  useEffect(() => {
    if (seenRef.current) return;
    seenRef.current = true;
    try { void trackEvent("admin_mutual_aid_dashboard_seen", {}); } catch { /* ignore */ }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    const start = rangeToStart(range).toISOString();
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    const dormantThreshold = new Date();
    dormantThreshold.setDate(dormantThreshold.getDate() - 30);

    const [
      { count: newMissions },
      { count: responses },
      { count: feedbacks },
      { count: thanks },
      logsRes,
      dormantRes,
      autoRes,
    ] = await Promise.all([
      supabase.from("small_missions").select("id", { count: "exact", head: true }).gte("created_at", start),
      supabase.from("small_mission_responses").select("id", { count: "exact", head: true }).gte("created_at", start),
      supabase.from("mission_feedbacks").select("id", { count: "exact", head: true }).gte("created_at", start),
      supabase.from("small_mission_response_thanks").select("id", { count: "exact", head: true }).gte("created_at", start),
      supabase
        .from("email_send_log")
        .select("template_name,status,message_id,delivered_at,open_count,click_count,created_at")
        .in("template_name", EMAIL_TEMPLATES.map((t) => t.key))
        .gte("created_at", start)
        .limit(10000),
      supabase
        .from("small_missions")
        .select("id,title,city,created_at,user_id,category")
        .eq("status", "open")
        .lte("created_at", dormantThreshold.toISOString())
        .order("created_at", { ascending: true })
        .limit(200),
      supabase
        .from("small_missions")
        .select("id,title,city,closed_at,close_reason,category")
        .not("closed_at", "is", null)
        .not("close_reason", "is", null)
        .gte("closed_at", startOfMonth.toISOString())
        .order("closed_at", { ascending: false })
        .limit(200),
    ]);

    setKpis({
      newMissions: newMissions ?? 0,
      responses: responses ?? 0,
      feedbacks: feedbacks ?? 0,
      thanks: thanks ?? 0,
    });

    // Agrège par template (dédup message_id)
    const byTemplate = new Map<string, Map<string, any>>();
    for (const t of EMAIL_TEMPLATES) byTemplate.set(t.key, new Map());
    (logsRes.data || []).forEach((r: any) => {
      const bucket = byTemplate.get(r.template_name);
      if (!bucket) return;
      const k = r.message_id || `no-${r.created_at}`;
      const prev = bucket.get(k);
      if (!prev || new Date(r.created_at) > new Date(prev.created_at)) bucket.set(k, r);
    });
    const stats: EmailStats[] = EMAIL_TEMPLATES.map((t) => {
      const bucket = byTemplate.get(t.key)!;
      const dedup = Array.from(bucket.values()).filter((r: any) => r.status === "sent" || r.delivered_at);
      const sent = dedup.length;
      const opened = dedup.reduce((n: number, r: any) => n + ((r.open_count ?? 0) > 0 ? 1 : 0), 0);
      const clicked = dedup.reduce((n: number, r: any) => n + ((r.click_count ?? 0) > 0 ? 1 : 0), 0);
      return { key: t.key, label: t.label, sent, opened, clicked };
    });
    setEmailStats(stats);

    setDormant((dormantRes.data || []) as DormantMission[]);
    setAutoClosed((autoRes.data || []) as AutoClosedMission[]);
    setLoading(false);
  }, [range]);

  useEffect(() => { void load(); }, [load]);

  const closeManually = async (id: string) => {
    if (!window.confirm("Fermer cette mission manuellement ? Cette action est définitive.")) return;
    setClosingId(id);
    const { error } = await supabase
      .from("small_missions")
      .update({
        status: "completed",
        closed_at: new Date().toISOString(),
        close_reason: "manual_admin",
      } as any)
      .eq("id", id);
    setClosingId(null);
    if (error) {
      toast.error("Impossible de fermer cette mission.");
      return;
    }
    toast.success("Mission fermée manuellement.");
    setDormant((prev) => prev.filter((m) => m.id !== id));
  };

  const exportDormantCsv = () => {
    const rows: string[][] = [
      ["id", "title", "city", "category", "created_at", "user_id"],
      ...dormant.map((m) => [m.id, m.title, m.city || "", m.category, m.created_at, m.user_id]),
    ];
    downloadCsv(`entraide-missions-dormantes-${new Date().toISOString().slice(0, 10)}.csv`, rows);
  };

  const exportAutoClosedCsv = () => {
    const rows: string[][] = [
      ["id", "title", "city", "category", "closed_at", "close_reason"],
      ...autoClosed.map((m) => [m.id, m.title, m.city || "", m.category, m.closed_at, m.close_reason || ""]),
    ];
    downloadCsv(`entraide-cloturees-auto-${new Date().toISOString().slice(0, 10)}.csv`, rows);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <h2 className="font-heading text-lg font-semibold">Vue d'ensemble Entraide</h2>
              <p className="text-sm text-muted-foreground">Cycle de vie des missions, engagement des emails et missions dormantes.</p>
            </div>
            <div className="flex items-center gap-2">
              <Select value={range} onValueChange={(v) => setRange(v as Range)}>
                <SelectTrigger className="h-9 w-[180px] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(["7d", "30d", "90d"] as Range[]).map((r) => (
                    <SelectItem key={r} value={r} className="text-xs">
                      {RANGE_LABEL[r]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button size="sm" variant="outline" onClick={() => void load()} disabled={loading}>
                <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <KpiCard label="Nouvelles missions" value={kpis.newMissions} />
            <KpiCard label="Réponses" value={kpis.responses} />
            <KpiCard label="Feedbacks" value={kpis.feedbacks} />
            <KpiCard label="Remerciements" value={kpis.thanks} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6 space-y-3">
          <h3 className="font-heading text-base font-semibold">Engagement par email</h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Template</TableHead>
                <TableHead className="text-right">Envoyés</TableHead>
                <TableHead className="text-right">Ouverts</TableHead>
                <TableHead className="text-right">Taux ouverture</TableHead>
                <TableHead className="text-right">Cliqués</TableHead>
                <TableHead className="text-right">Taux clic</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {emailStats.map((s) => (
                <TableRow key={s.key}>
                  <TableCell className="font-medium">{s.label}</TableCell>
                  <TableCell className="text-right tabular-nums">{s.sent}</TableCell>
                  <TableCell className="text-right tabular-nums">{s.opened}</TableCell>
                  <TableCell className="text-right tabular-nums">{pct(s.opened, s.sent)}</TableCell>
                  <TableCell className="text-right tabular-nums">{s.clicked}</TableCell>
                  <TableCell className="text-right tabular-nums">{pct(s.clicked, s.sent)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6 space-y-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div>
              <h3 className="font-heading text-base font-semibold">Missions dormantes</h3>
              <p className="text-xs text-muted-foreground">Missions ouvertes depuis 30 jours ou plus.</p>
            </div>
            <Button size="sm" variant="outline" onClick={exportDormantCsv} disabled={dormant.length === 0}>
              <Download className="h-3.5 w-3.5 mr-1" /> Exporter CSV
            </Button>
          </div>
          {dormant.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">Aucune mission dormante. Bien joué.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Titre</TableHead>
                  <TableHead>Ville</TableHead>
                  <TableHead>Catégorie</TableHead>
                  <TableHead>Créée le</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dormant.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="font-medium max-w-[24rem]"><span className="line-clamp-1">{m.title}</span></TableCell>
                    <TableCell>{m.city || "–"}</TableCell>
                    <TableCell>{m.category}</TableCell>
                    <TableCell>{format(new Date(m.created_at), "d MMM yyyy", { locale: fr })}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => void closeManually(m.id)}
                        disabled={closingId === m.id}
                      >
                        {closingId === m.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <><XCircle className="h-3.5 w-3.5 mr-1" /> Fermer</>
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6 space-y-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div>
              <h3 className="font-heading text-base font-semibold">Clôtures automatiques du mois</h3>
              <p className="text-xs text-muted-foreground">Missions fermées automatiquement depuis le 1er du mois.</p>
            </div>
            <Button size="sm" variant="outline" onClick={exportAutoClosedCsv} disabled={autoClosed.length === 0}>
              <Download className="h-3.5 w-3.5 mr-1" /> Exporter CSV
            </Button>
          </div>
          {autoClosed.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">Aucune clôture automatique enregistrée ce mois.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Titre</TableHead>
                  <TableHead>Ville</TableHead>
                  <TableHead>Catégorie</TableHead>
                  <TableHead>Fermée le</TableHead>
                  <TableHead>Raison</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {autoClosed.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="font-medium max-w-[24rem]"><span className="line-clamp-1">{m.title}</span></TableCell>
                    <TableCell>{m.city || "–"}</TableCell>
                    <TableCell>{m.category}</TableCell>
                    <TableCell>{format(new Date(m.closed_at), "d MMM yyyy", { locale: fr })}</TableCell>
                    <TableCell><code className="text-[11px] px-1.5 py-0.5 rounded bg-muted">{m.close_reason}</code></TableCell>
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

const KpiCard = ({ label, value }: { label: string; value: number }) => (
  <div className="rounded-xl border border-border bg-card px-4 py-3">
    <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">{label}</p>
    <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">{value}</p>
  </div>
);

export default MutualAidDashboardTab;
