import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
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
import { Download, AlertTriangle, Sparkles, MessageCircle, BookOpen } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AffinityOnboardingFunnelCard } from "@/components/admin/AffinityOnboardingFunnelCard";
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

const ROW_LIMIT = 20000;

/** Bandeau discret affiché quand une agrégation atteint le plafond de lignes. */
function TruncationBanner() {
  return (
    <div className="flex items-start gap-2 rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-warning-foreground">
      <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" aria-hidden="true" />
      <span>
        Données tronquées au-delà de {ROW_LIMIT.toLocaleString("fr-FR")} lignes, les chiffres peuvent sous-compter.
      </span>
    </div>
  );
}

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
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get("tab") === "cultural-facts"
    ? "cultural-facts"
    : searchParams.get("tab") === "whispers"
      ? "whispers"
      : "bubbles";

  useEffect(() => {
    if (seenRef.current) return;
    seenRef.current = true;
    void trackEvent("admin_alma_dashboard_seen");
  }, []);

  const since = useMemo(() => rangeSinceISO(range), [range]);

  const handleTabChange = (next: string) => {
    const params = new URLSearchParams(searchParams);
    if (next === "bubbles") params.delete("tab");
    else params.set("tab", next);
    setSearchParams(params, { replace: true });
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Alma"
        description="Adoption des bulles Alma, engagement sur les whispers Pass 4, et pilotage du compagnon culturel Pass 5."
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

      <AffinityOnboardingFunnelCard since={since} />

      <Tabs value={tab} onValueChange={handleTabChange}>
        <TabsList>
          <TabsTrigger value="bubbles">
            <Sparkles className="h-4 w-4 mr-2" aria-hidden="true" /> Bulles
          </TabsTrigger>
          <TabsTrigger value="whispers">
            <MessageCircle className="h-4 w-4 mr-2" aria-hidden="true" /> Whispers
          </TabsTrigger>
          <TabsTrigger value="cultural-facts">
            <BookOpen className="h-4 w-4 mr-2" aria-hidden="true" /> Faits culturels
          </TabsTrigger>
        </TabsList>

        <TabsContent value="bubbles" className="mt-4">
          <BubblesTab since={since} range={range} />
        </TabsContent>

        <TabsContent value="whispers" className="mt-4">
          <WhispersTab since={since} range={range} />
        </TabsContent>

        <TabsContent value="cultural-facts" className="mt-4">
          <CulturalFactsTab since={since} />
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
        .limit(ROW_LIMIT);
      if (error) throw error;
      return (data ?? []) as RawEvent[];
    },
  });

  const truncated = events.length >= ROW_LIMIT;
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
      {truncated && <TruncationBanner />}
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
        .limit(ROW_LIMIT);
      if (error) throw error;
      return (data ?? []) as RawWhisperHistory[];
    },
  });

  const historyTruncated = history.length >= ROW_LIMIT;

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
    const acc = { silent: 0, low: 0, balanced: 0, talkative: 0 } as Record<string, number>;
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
      {historyTruncated && <TruncationBanner />}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="Whispers émis" value={totals.emitted} />
        <KpiCard label="Taux d'action" value={fmtPct(totals.actionRate)} />
        <KpiCard label="Taux de dismiss" value={fmtPct(totals.dismissRate)} />
        <KpiCard label="Users blacklistés" value={totals.blacklisted} />
      </div>

      <Card>
        <CardContent className="p-6 space-y-3">
          <h3 className="text-sm font-semibold">Répartition frequency setting</h3>
          {(["silent", "low", "balanced", "talkative"] as const).map((k) => {
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

/* ══════════════════════════ Onglet Faits culturels ══════════════════════════ */

const FACT_TYPES = [
  { value: "all", label: "Tous" },
  { value: "breed_did_you_know", label: "Race" },
  { value: "city_did_you_know", label: "Ville" },
  { value: "social_stat", label: "Stat sociale" },
  { value: "seasonal_advice", label: "Conseil saisonnier" },
  { value: "founder_anecdote", label: "Anecdote fondatrice" },
] as const;

interface CulturalFactRow {
  id: string;
  fact_type: string;
  content: string;
  context_filter: Record<string, unknown>;
  active: boolean;
  source_url: string | null;
  seasonal_start_month: number | null;
  seasonal_end_month: number | null;
  created_at: string;
}

function CulturalFactsTab({ since }: { since: string }) {
  const qc = useQueryClient();
  const seenRef = useRef(false);
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [surfaceFilter, setSurfaceFilter] = useState<string>("");

  useEffect(() => {
    if (seenRef.current) return;
    seenRef.current = true;
    void trackEvent("admin_alma_cultural_facts_tab_seen");
  }, []);

  const { data: facts = [], isLoading } = useQuery({
    queryKey: ["admin-alma-cultural-facts"],
    queryFn: async (): Promise<CulturalFactRow[]> => {
      const { data, error } = await supabase
        .from("alma_cultural_facts" as any)
        .select("*")
        .order("fact_type", { ascending: true })
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data ?? []) as unknown as CulturalFactRow[];
    },
  });

  const { data: stats = [] } = useQuery({
    queryKey: ["admin-alma-cultural-stats", since],
    queryFn: async () => {
      const [seenRes, clickRes] = await Promise.all([
        supabase
          .from("analytics_events")
          .select("metadata, created_at")
          .eq("event_type", "alma_cultural_fact_seen")
          .gte("created_at", since)
          .limit(20000),
        supabase
          .from("analytics_events")
          .select("metadata, created_at")
          .eq("event_type", "alma_cultural_fact_action_clicked")
          .gte("created_at", since)
          .limit(20000),
      ]);
      const seen = new Map<string, number>();
      const clicks = new Map<string, number>();
      for (const r of seenRes.data ?? []) {
        const id = (r as any).metadata?.fact_id;
        if (id) seen.set(id, (seen.get(id) ?? 0) + 1);
      }
      for (const r of clickRes.data ?? []) {
        const id = (r as any).metadata?.fact_id;
        if (id) clicks.set(id, (clicks.get(id) ?? 0) + 1);
      }
      return Array.from(seen.entries()).map(([id, views]) => ({
        id,
        views,
        clicks: clicks.get(id) ?? 0,
      }));
    },
  });

  const statsById = useMemo(() => {
    const m = new Map<string, { views: number; clicks: number }>();
    for (const s of stats) m.set(s.id, { views: s.views, clicks: s.clicks });
    return m;
  }, [stats]);

  const filtered = useMemo(() => {
    return facts.filter((f) => {
      if (typeFilter !== "all" && f.fact_type !== typeFilter) return false;
      if (surfaceFilter.trim()) {
        const surf = (f.context_filter as any)?.surface;
        const target = surfaceFilter.trim();
        if (Array.isArray(surf)) {
          if (!surf.includes(target)) return false;
        } else if (typeof surf === "string") {
          if (surf !== target) return false;
        } else {
          return false;
        }
      }
      return true;
    });
  }, [facts, typeFilter, surfaceFilter]);

  const toggleActive = async (fact: CulturalFactRow) => {
    const next = !fact.active;
    const { error } = await supabase
      .from("alma_cultural_facts" as any)
      .update({ active: next } as any)
      .eq("id", fact.id);
    if (error) return;
    void trackEvent("admin_alma_cultural_fact_toggled", {
      metadata: { fact_id: fact.id, active: next },
    });
    void qc.invalidateQueries({ queryKey: ["admin-alma-cultural-facts"] });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FACT_TYPES.map((t) => (
              <SelectItem key={t.value} value={t.value}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <input
          type="text"
          placeholder="Filtrer par surface (ex : dashboard)"
          value={surfaceFilter}
          onChange={(e) => setSurfaceFilter(e.target.value)}
          className="h-9 px-3 rounded-md border border-input bg-background text-sm w-64"
        />
        <span className="text-xs text-muted-foreground">
          {filtered.length} fait{filtered.length > 1 ? "s" : ""}
        </span>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Contenu</TableHead>
                <TableHead>Contexte</TableHead>
                <TableHead className="text-right">Vues (30j)</TableHead>
                <TableHead className="text-right">Clics action</TableHead>
                <TableHead className="text-right">Taux clic</TableHead>
                <TableHead>Actif</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-6">
                    Chargement…
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-6">
                    Aucun fait pour ces filtres.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((f) => {
                  const s = statsById.get(f.id) ?? { views: 0, clicks: 0 };
                  const clickRate = s.views > 0 ? s.clicks / s.views : 0;
                  return (
                    <TableRow key={f.id} className={!f.active ? "opacity-60" : undefined}>
                      <TableCell>
                        <Badge variant="secondary" className="font-mono text-[10px]">
                          {f.fact_type}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-md">
                        <div className="text-sm">{f.content}</div>
                        {f.source_url && (
                          <div className="text-xs text-muted-foreground truncate">
                            {f.source_url}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-[10px] max-w-xs truncate">
                        {JSON.stringify(f.context_filter)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{s.views}</TableCell>
                      <TableCell className="text-right tabular-nums">{s.clicks}</TableCell>
                      <TableCell className="text-right tabular-nums">{fmtPct(clickRate)}</TableCell>
                      <TableCell>
                        <Badge variant={f.active ? "default" : "outline"}>
                          {f.active ? "Actif" : "Désactivé"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="ghost" onClick={() => toggleActive(f)}>
                          {f.active ? "Désactiver" : "Réactiver"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
