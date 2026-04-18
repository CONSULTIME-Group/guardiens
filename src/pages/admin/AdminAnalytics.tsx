import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, TrendingUp, TrendingDown, Users, MousePointerClick, AlertCircle } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid, Legend,
} from "recharts";
import { format, subDays, startOfDay } from "date-fns";
import { fr } from "date-fns/locale";

type Range = 1 | 7 | 30;

interface DailyStat {
  jour: string;
  inscrits: number;
  page_views: number;
  signup_started: number;
  signup_completed: number;
}

interface EventTotals {
  page_view: number;
  signup_started: number;
  signup_completed: number;
  signup_failed: number;
  cta_click: number;
  login_completed: number;
}

interface TopPage {
  path: string;
  views: number;
}

const AdminAnalytics = () => {
  const [range, setRange] = useState<Range>(7);
  const [loading, setLoading] = useState(true);
  const [daily, setDaily] = useState<DailyStat[]>([]);
  const [totals, setTotals] = useState<EventTotals | null>(null);
  const [previousTotals, setPreviousTotals] = useState<EventTotals | null>(null);
  const [topPages, setTopPages] = useState<TopPage[]>([]);
  const [trackingHealth, setTrackingHealth] = useState<{ lastEvent: Date | null; eventsCount24h: number }>({
    lastEvent: null,
    eventsCount24h: 0,
  });

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const since = startOfDay(subDays(new Date(), range - 1));
      const sincePrev = startOfDay(subDays(new Date(), range * 2 - 1));

      // 1. Profils créés par jour
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("created_at")
        .gte("created_at", since.toISOString());

      // 2. Tous les événements pour la période
      const { data: eventsData } = await supabase
        .from("analytics_events")
        .select("event_type, created_at, source, metadata")
        .gte("created_at", since.toISOString())
        .order("created_at", { ascending: false })
        .limit(5000);

      // 3. Période précédente (pour deltas)
      const { data: prevEventsData } = await supabase
        .from("analytics_events")
        .select("event_type")
        .gte("created_at", sincePrev.toISOString())
        .lt("created_at", since.toISOString())
        .limit(5000);

      // 4. Dernier événement (santé du tracking)
      const { data: lastEv } = await supabase
        .from("analytics_events")
        .select("created_at")
        .order("created_at", { ascending: false })
        .limit(1);

      const last24h = subDays(new Date(), 1);
      const { count: count24h } = await supabase
        .from("analytics_events")
        .select("*", { count: "exact", head: true })
        .gte("created_at", last24h.toISOString());

      setTrackingHealth({
        lastEvent: lastEv?.[0]?.created_at ? new Date(lastEv[0].created_at) : null,
        eventsCount24h: count24h ?? 0,
      });

      // ── Build daily aggregates ──
      const dayMap = new Map<string, DailyStat>();
      for (let i = 0; i < range; i++) {
        const d = format(subDays(new Date(), i), "yyyy-MM-dd");
        dayMap.set(d, { jour: d, inscrits: 0, page_views: 0, signup_started: 0, signup_completed: 0 });
      }

      (profilesData || []).forEach((p) => {
        const k = format(new Date(p.created_at!), "yyyy-MM-dd");
        const row = dayMap.get(k);
        if (row) row.inscrits++;
      });

      (eventsData || []).forEach((e) => {
        const k = format(new Date(e.created_at!), "yyyy-MM-dd");
        const row = dayMap.get(k);
        if (!row) return;
        if (e.event_type === "page_view") row.page_views++;
        if (e.event_type === "signup_started") row.signup_started++;
        if (e.event_type === "signup_completed") row.signup_completed++;
      });

      const sorted = Array.from(dayMap.values()).sort((a, b) => a.jour.localeCompare(b.jour));
      setDaily(sorted);

      // ── Totaux période ──
      const t: EventTotals = {
        page_view: 0, signup_started: 0, signup_completed: 0,
        signup_failed: 0, cta_click: 0, login_completed: 0,
      };
      (eventsData || []).forEach((e) => {
        if (e.event_type in t) (t as any)[e.event_type]++;
      });
      setTotals(t);

      const tp: EventTotals = { ...t, page_view: 0, signup_started: 0, signup_completed: 0, signup_failed: 0, cta_click: 0, login_completed: 0 };
      (prevEventsData || []).forEach((e) => {
        if (e.event_type in tp) (tp as any)[e.event_type]++;
      });
      setPreviousTotals(tp);

      // ── Top pages ──
      const pageCount = new Map<string, number>();
      (eventsData || []).forEach((e) => {
        if (e.event_type === "page_view" && e.source) {
          pageCount.set(e.source, (pageCount.get(e.source) || 0) + 1);
        }
      });
      const top = Array.from(pageCount.entries())
        .map(([path, views]) => ({ path, views }))
        .sort((a, b) => b.views - a.views)
        .slice(0, 10);
      setTopPages(top);

      setLoading(false);
    };
    load();
  }, [range]);

  const trackingOK = trackingHealth.lastEvent && (Date.now() - trackingHealth.lastEvent.getTime()) < 60 * 60 * 1000;

  // ── Conversion rates ──
  const conversionRate = totals && totals.signup_started > 0
    ? Math.round((totals.signup_completed / totals.signup_started) * 100)
    : 0;
  const totalInscrits = daily.reduce((s, d) => s + d.inscrits, 0);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Analytics</h1>
          <p className="text-sm text-muted-foreground">Trafic, conversions et inscriptions en temps réel</p>
        </div>
        <Tabs value={String(range)} onValueChange={(v) => setRange(Number(v) as Range)}>
          <TabsList>
            <TabsTrigger value="1">24h</TabsTrigger>
            <TabsTrigger value="7">7 jours</TabsTrigger>
            <TabsTrigger value="30">30 jours</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Santé du tracking */}
      {!trackingOK && (
        <Card className="border-destructive bg-destructive/5">
          <CardContent className="flex items-start gap-3 p-4">
            <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-destructive">Tracking inactif</p>
              <p className="text-muted-foreground mt-0.5">
                {trackingHealth.lastEvent
                  ? `Dernier événement reçu il y a ${formatRelative(trackingHealth.lastEvent)}.`
                  : "Aucun événement enregistré."}
                {" "}Vérifiez que les utilisateurs naviguent bien sur le site.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {/* Stat cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              label="Inscrits"
              value={totalInscrits}
              delta={null}
              icon={Users}
            />
            <StatCard
              label="Pages vues"
              value={totals?.page_view ?? 0}
              delta={delta(totals?.page_view, previousTotals?.page_view)}
              icon={MousePointerClick}
            />
            <StatCard
              label="Signups démarrés"
              value={totals?.signup_started ?? 0}
              delta={delta(totals?.signup_started, previousTotals?.signup_started)}
              icon={TrendingUp}
            />
            <StatCard
              label="Conversion signup"
              value={`${conversionRate}%`}
              delta={null}
              icon={TrendingUp}
              hint={`${totals?.signup_completed ?? 0} sur ${totals?.signup_started ?? 0} démarrés`}
            />
          </div>

          {/* Chart inscrits */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Inscriptions par jour</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={daily}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis
                      dataKey="jour"
                      tickFormatter={(v) => format(new Date(v), "dd/MM")}
                      className="text-xs"
                    />
                    <YAxis className="text-xs" />
                    <Tooltip
                      labelFormatter={(v) => format(new Date(v), "dd MMMM yyyy", { locale: fr })}
                      contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
                    />
                    <Bar dataKey="inscrits" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Chart funnel */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Funnel d'inscription</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={daily}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis
                      dataKey="jour"
                      tickFormatter={(v) => format(new Date(v), "dd/MM")}
                      className="text-xs"
                    />
                    <YAxis className="text-xs" />
                    <Tooltip
                      labelFormatter={(v) => format(new Date(v), "dd MMMM", { locale: fr })}
                      contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
                    />
                    <Legend />
                    <Line type="monotone" dataKey="page_views" name="Pages vues" stroke="hsl(var(--muted-foreground))" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="signup_started" name="Démarrés" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="signup_completed" name="Complétés" stroke="hsl(var(--toggle-active, var(--primary)))" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Top pages */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Pages les plus vues</CardTitle>
              </CardHeader>
              <CardContent>
                {topPages.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    Aucune vue enregistrée sur la période.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {topPages.map((p) => (
                      <div key={p.path} className="flex items-center justify-between text-sm py-1.5 border-b border-border last:border-0">
                        <span className="truncate text-foreground/80 mr-2">{p.path || "/"}</span>
                        <span className="font-medium tabular-nums">{p.views}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Détail des événements</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <Row label="Pages vues" value={totals?.page_view ?? 0} />
                  <Row label="Signups démarrés" value={totals?.signup_started ?? 0} />
                  <Row label="Signups complétés" value={totals?.signup_completed ?? 0} />
                  <Row label="Signups échoués" value={totals?.signup_failed ?? 0} />
                  <Row label="Logins complétés" value={totals?.login_completed ?? 0} />
                  <Row label="Clics CTA" value={totals?.cta_click ?? 0} />
                  <div className="pt-2 mt-2 border-t border-border">
                    <Row label="Total événements 24h" value={trackingHealth.eventsCount24h} muted />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
};

// ── Sub-components ──
const StatCard = ({ label, value, delta, icon: Icon, hint }: {
  label: string;
  value: number | string;
  delta: number | null;
  icon: any;
  hint?: string;
}) => (
  <Card>
    <CardContent className="p-4">
      <div className="flex items-start justify-between mb-2">
        <span className="text-xs text-muted-foreground uppercase tracking-wide">{label}</span>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="text-2xl font-bold text-foreground tabular-nums">{value}</div>
      {delta !== null && (
        <div className={`flex items-center gap-1 text-xs mt-1 ${delta > 0 ? "text-green-600" : delta < 0 ? "text-destructive" : "text-muted-foreground"}`}>
          {delta > 0 ? <TrendingUp className="h-3 w-3" /> : delta < 0 ? <TrendingDown className="h-3 w-3" /> : null}
          <span>{delta > 0 ? "+" : ""}{delta}% vs période préc.</span>
        </div>
      )}
      {hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
    </CardContent>
  </Card>
);

const Row = ({ label, value, muted }: { label: string; value: number; muted?: boolean }) => (
  <div className={`flex items-center justify-between py-1 ${muted ? "text-muted-foreground" : ""}`}>
    <span>{label}</span>
    <span className="font-medium tabular-nums">{value}</span>
  </div>
);

const delta = (current?: number, previous?: number): number | null => {
  if (current === undefined || previous === undefined || previous === 0) return null;
  return Math.round(((current - previous) / previous) * 100);
};

const formatRelative = (date: Date): string => {
  const ms = Date.now() - date.getTime();
  const min = Math.floor(ms / 60000);
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} h`;
  const d = Math.floor(h / 24);
  return `${d} j`;
};

export default AdminAnalytics;
