import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Download, AlertTriangle, Sparkles, MessageCircle } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { trackEvent } from "@/lib/analytics";
import { WHISPER_PRIORITY } from "@/lib/alma/whisper-types";
import {
  aggregateMoments,
  aggregateWhispers,
  computeBubbleKpis,
  rangeSinceISO,
  toCsv,
  type RawEvent,
  type RawWhisperHistory,
} from "@/lib/admin/alma-analytics";

type Range = "7d" | "30d" | "90d";

const RANGE_LABEL: Record<Range, string> = {
  "7d": "7 derniers jours",
  "30d": "30 derniers jours",
  "90d": "90 derniers jours",
};

const fmtPct = (v: number) => `${(v * 100).toFixed(1)} %`;
const fmtDate = (iso: string | null) =>
  iso ? format(new Date(iso), "d MMM yyyy HH:mm", { locale: fr }) : "–";

/** Pilote l'adoption et l'impact d'Alma (bulles + whispers). */
export default function AdminAlma() {
  const seenRef = useRef(false);
  const [range, setRange] = useState<Range>("30d");

  useEffect(() => {
    if (seenRef.current) return;
    seenRef.current = true;
    void trackEvent("admin_alma_dashboard_seen");
  }, []);

  const since = useMemo(() => rangeSinceISO(range), [range]);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Alma"
        description="Adoption des bulles Alma, engagement sur les whispers Pass 4, et impact fonctionnel par moment."
      />

      <div className="flex items-center gap-3">
        <span className="text-sm text-muted-foreground">Période</span>
        <Select value={range} onValueChange={(v) => setRange(v as Range)}>
          <SelectTrigger className="w-52">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(["7d", "30d", "90d"] as Range[]).map((r) => (
              <SelectItem key={r} value={r}>
                {RANGE_LABEL[r]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="bubbles">
        <TabsList>
          <TabsTrigger value="bubbles">
            <Sparkles className="h-4 w-4 mr-2" aria-hidden="true" /> Bulles
          </TabsTrigger>
          <TabsTrigger value="whispers">
            <MessageCircle className="h-4 w-4 mr-2" aria-hidden="true" /> Whispers
          </TabsTrigger>
        </TabsList>

        <TabsContent value="bubbles" className="mt-4">
          <BubblesTab since={since} range={range} />
        </TabsContent>

        <TabsContent value="whispers" className="mt-4">
          <WhispersTab since={since} range={range} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ══════════════════════════ Onglet Bulles ══════════════════════════ */

function BubblesTab({ since, range }: { since: string; range: Range }) {
  const { data: events = [], isLoading } = useQuery({
    queryKey: ["admin-alma-events", since],
    queryFn: async (): Promise<RawEvent[]> => {
      const { data, error } = await supabase
        .from("analytics_events")
        .select("event_type, created_at, user_id, metadata")
        .like("event_type", "alma_%")
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(20000);
      if (error) throw error;
      return (data ?? []) as RawEvent[];
    },
  });

  const kpis = useMemo(() => computeBubbleKpis(events), [events]);
  const moments = useMemo(() => aggregateMoments(events), [events]);

  const onExport = () => {
    void trackEvent("admin_alma_export_csv_clicked", {
      metadata: { tab: "bubbles", range },
    });
    const csv = toCsv(
      moments.map((m) => ({
        moment: m.moment,
        label: m.label,
        role: m.role,
        views: m.views,
        actions: m.actions,
        adoption_rate: `${(m.adoptionRate * 100).toFixed(2)}%`,
        last_used_at: m.lastUsedAt ?? "",
      })),
      ["moment", "label", "role", "views", "actions", "adoption_rate", "last_used_at"],
    );
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `alma-bubbles-${range}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="Users uniques (7j)" value={kpis.uniqueUsers7d} />
        <KpiCard label="Users uniques (30j)" value={kpis.uniqueUsers30d} />
        <KpiCard label="Vues totales" value={kpis.totalViews} />
        <KpiCard label="Taux d'engagement" value={fmtPct(kpis.engagementRate)} />
      </div>

      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={onExport} disabled={moments.length === 0}>
          <Download className="h-4 w-4 mr-2" aria-hidden="true" /> Exporter CSV
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Moment</TableHead>
                <TableHead>Rôle</TableHead>
                <TableHead className="text-right">Vues</TableHead>
                <TableHead className="text-right">Actions</TableHead>
                <TableHead className="text-right">Taux d'adoption</TableHead>
                <TableHead>Dernière utilisation</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-6">
                    Chargement…
                  </TableCell>
                </TableRow>
              ) : (
                moments.map((m) => (
                  <TableRow key={m.moment}>
                    <TableCell>
                      <div className="font-medium">{m.label}</div>
                      <div className="text-xs text-muted-foreground">{m.moment}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="capitalize">
                        {m.role}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{m.views}</TableCell>
                    <TableCell className="text-right tabular-nums">{m.actions}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {fmtPct(m.adoptionRate)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {fmtDate(m.lastUsedAt)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

/* ══════════════════════════ Onglet Whispers ══════════════════════════ */

function WhispersTab({ since, range }: { since: string; range: Range }) {
  const { data: history = [], isLoading } = useQuery({
    queryKey: ["admin-alma-whispers", since],
    queryFn: async (): Promise<RawWhisperHistory[]> => {
      const { data, error } = await supabase
        .from("alma_whisper_history")
        .select("whisper_type, emitted_at, action_taken, dismissed_reason, user_id")
        .gte("emitted_at", since)
        .order("emitted_at", { ascending: false })
        .limit(20000);
      if (error) throw error;
      return (data ?? []) as RawWhisperHistory[];
    },
  });

  const { data: freq = [] } = useQuery({
    queryKey: ["admin-alma-frequency"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("alma_frequency");
      if (error) throw error;
      return (data ?? []) as Array<{ alma_frequency: string | null }>;
    },
  });

  const stats = useMemo(
    () => aggregateWhispers(history, WHISPER_PRIORITY as Record<string, "P0" | "P1" | "P2">),
    [history],
  );

  const totals = useMemo(() => {
    const emitted = stats.reduce((s, r) => s + r.emitted, 0);
    const actions = stats.reduce((s, r) => s + r.actions, 0);
    const dismissed = stats.reduce((s, r) => s + r.dismissed, 0);
    const blacklisted = stats.reduce((s, r) => s + r.blacklistedUsers, 0);
    return {
      emitted,
      actionRate: emitted > 0 ? actions / emitted : 0,
      dismissRate: emitted > 0 ? dismissed / emitted : 0,
      blacklisted,
    };
  }, [stats]);

  const freqBreakdown = useMemo(() => {
    const acc = { silent: 0, balanced: 0, talkative: 0 } as Record<string, number>;
    for (const row of freq) {
      const k = row.alma_frequency ?? "balanced";
      acc[k] = (acc[k] ?? 0) + 1;
    }
    const total = freq.length || 1;
    return { counts: acc, total };
  }, [freq]);

  const blacklistedRows = useMemo(
    () => stats.filter((s) => s.blacklistedUsers > 0),
    [stats],
  );

  const onExport = () => {
    void trackEvent("admin_alma_export_csv_clicked", {
      metadata: { tab: "whispers", range },
    });
    const csv = toCsv(
      stats.map((s) => ({
        whisper_type: s.whisperType,
        priority: s.priority,
        emitted: s.emitted,
        actions: s.actions,
        dismissed: s.dismissed,
        action_rate: `${(s.actionRate * 100).toFixed(2)}%`,
        dismiss_rate: `${(s.dismissRate * 100).toFixed(2)}%`,
        blacklisted_users: s.blacklistedUsers,
      })),
      [
        "whisper_type",
        "priority",
        "emitted",
        "actions",
        "dismissed",
        "action_rate",
        "dismiss_rate",
        "blacklisted_users",
      ],
    );
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `alma-whispers-${range}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="Whispers émis" value={totals.emitted} />
        <KpiCard label="Taux d'action" value={fmtPct(totals.actionRate)} />
        <KpiCard label="Taux de dismiss" value={fmtPct(totals.dismissRate)} />
        <KpiCard label="Users blacklistés" value={totals.blacklisted} />
      </div>

      <Card>
        <CardContent className="p-6 space-y-3">
          <h3 className="text-sm font-semibold">Répartition frequency setting</h3>
          {(["silent", "balanced", "talkative"] as const).map((k) => {
            const c = freqBreakdown.counts[k] ?? 0;
            const pct = (c / freqBreakdown.total) * 100;
            return (
              <div key={k}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="capitalize">{k}</span>
                  <span className="tabular-nums text-muted-foreground">
                    {c} ({pct.toFixed(1)} %)
                  </span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary"
                    style={{ width: `${pct}%` }}
                    aria-hidden="true"
                  />
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={onExport} disabled={stats.length === 0}>
          <Download className="h-4 w-4 mr-2" aria-hidden="true" /> Exporter CSV
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Whisper type</TableHead>
                <TableHead>Priorité</TableHead>
                <TableHead className="text-right">Émis</TableHead>
                <TableHead className="text-right">Actions</TableHead>
                <TableHead className="text-right">Dismiss</TableHead>
                <TableHead className="text-right">Taux action</TableHead>
                <TableHead className="text-right">Taux dismiss</TableHead>
                <TableHead className="text-right">Blacklistés</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-6">
                    Chargement…
                  </TableCell>
                </TableRow>
              ) : stats.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-6">
                    Aucun whisper émis sur cette période.
                  </TableCell>
                </TableRow>
              ) : (
                stats.map((s) => {
                  const noisy = s.dismissRate > 0.5;
                  return (
                    <TableRow key={s.whisperType}>
                      <TableCell className="font-mono text-xs">{s.whisperType}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            s.priority === "P0"
                              ? "destructive"
                              : s.priority === "P1"
                                ? "default"
                                : "secondary"
                          }
                        >
                          {s.priority}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{s.emitted}</TableCell>
                      <TableCell className="text-right tabular-nums">{s.actions}</TableCell>
                      <TableCell className="text-right tabular-nums">{s.dismissed}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {fmtPct(s.actionRate)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        <span className={noisy ? "inline-flex items-center gap-1 text-destructive font-semibold" : ""}>
                          {noisy && <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />}
                          {fmtPct(s.dismissRate)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {s.blacklistedUsers}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {blacklistedRows.length > 0 && (
        <Card>
          <CardContent className="p-6 space-y-3">
            <h3 className="text-sm font-semibold">
              Types blacklistés par au moins un utilisateur
            </h3>
            <p className="text-xs text-muted-foreground">
              Utile pour repérer les whispers qui bruitent trop.
            </p>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Whisper type</TableHead>
                  <TableHead className="text-right">Users concernés</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {blacklistedRows.map((r) => (
                  <TableRow key={r.whisperType}>
                    <TableCell className="font-mono text-xs">{r.whisperType}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {r.blacklistedUsers}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/* ══════════════════════════ KPI card ══════════════════════════ */

function KpiCard({ label, value }: { label: string; value: string | number }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-2xl font-semibold mt-1 tabular-nums">{value}</p>
      </CardContent>
    </Card>
  );
}
