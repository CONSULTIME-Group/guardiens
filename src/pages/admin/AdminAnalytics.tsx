import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, TrendingUp, TrendingDown, Users, MousePointerClick, AlertCircle, Filter } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { format, subDays, startOfDay } from "date-fns";
import { fr } from "date-fns/locale";
import FacebookReferralCard from "@/components/admin/analytics/FacebookReferralCard";

type Range = 1 | 7 | 30;
type RoleFilter = "all" | "owner" | "sitter" | "both";

interface DailyStat {
  jour: string;
  inscrits: number;
  page_views: number;
  signup_started: number;
  signup_completed: number;
}

// Étapes du funnel d'activation (ordre = entonnoir)
const FUNNEL_STEPS = [
  { key: "signup_started", label: "1. Visite /inscription" },
  { key: "signup_role_selected", label: "2. Rôle choisi" },
  { key: "signup_form_submitted", label: "3. Formulaire envoyé" },
  { key: "signup_email_confirmed", label: "4. Email confirmé" },
  { key: "onboarding_started", label: "5. Onboarding ouvert" },
  { key: "onboarding_completed", label: "6. Onboarding terminé" },
  { key: "first_action", label: "7. 1ère action" },
] as const;

// Events qui n'ont pas (ou rarement) de metadata.role rattaché.
// Ils sont émis avant choix de rôle ou par tracker générique : on évite de les
// filtrer par rôle pour ne pas afficher 0 systématiquement.
const ROLE_AGNOSTIC_EVENTS = new Set([
  "page_view",
  "signup_started",
  "signup_email_confirmed",
  "fb_referral_landing",
  "fb_referral_feedback",
  "fb_referral_dismissed",
]);

interface FunnelCounts { [key: string]: number; }
interface TopPage { path: string; views: number; }

const AdminAnalytics = () => {
  const [range, setRange] = useState<Range>(7);
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [loading, setLoading] = useState(true);
  const [daily, setDaily] = useState<DailyStat[]>([]);
  const [funnelCounts, setFunnelCounts] = useState<FunnelCounts>({});
  const [previousFunnel, setPreviousFunnel] = useState<FunnelCounts>({});
  const [pageViews, setPageViews] = useState(0);
  const [previousPageViews, setPreviousPageViews] = useState(0);
  const [topPages, setTopPages] = useState<TopPage[]>([]);
  const [stepDropoffByRole, setStepDropoffByRole] = useState<Record<string, FunnelCounts>>({});
  const [trackingHealth, setTrackingHealth] = useState<{ lastEvent: Date | null; eventsCount24h: number }>({
    lastEvent: null,
    eventsCount24h: 0,
  });
  const [totalInscrits, setTotalInscrits] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);

      // Fenêtres temporelles cohérentes : [since, until[ et [sincePrev, since[
      const now = new Date();
      const until = now;
      const since = startOfDay(subDays(now, range - 1));
      const sincePrev = startOfDay(subDays(since, range));
      // Pour le filtre rôle envoyé en RPC : on n'envoie le rôle que pour les
      // events role-aware. Pour les role-agnostic, on calcule sans filtre.
      const rpcRole = roleFilter === "all" ? null : roleFilter;

      try {
        // ── 1. Profils créés (source de vérité pour les inscrits) ──
        const profilesQuery = supabase
          .from("profiles")
          .select("created_at, role", { count: "exact" })
          .gte("created_at", since.toISOString())
          .lt("created_at", until.toISOString());

        // ── 2. RPC : counts events filtrés par rôle ──
        const countsRolePromise = supabase.rpc("admin_analytics_event_counts", {
          _since: since.toISOString(),
          _until: until.toISOString(),
          _role: rpcRole,
        });
        // ── 3. RPC : counts events sans filtre (pour role-agnostic) ──
        const countsAllPromise = supabase.rpc("admin_analytics_event_counts", {
          _since: since.toISOString(),
          _until: until.toISOString(),
          _role: null,
        });
        // ── 4. RPC : période précédente (filtrée) ──
        const prevCountsPromise = supabase.rpc("admin_analytics_event_counts", {
          _since: sincePrev.toISOString(),
          _until: since.toISOString(),
          _role: rpcRole,
        });
        const prevCountsAllPromise = supabase.rpc("admin_analytics_event_counts", {
          _since: sincePrev.toISOString(),
          _until: since.toISOString(),
          _role: null,
        });
        // ── 5. RPC : daily ──
        const dailyPromise = supabase.rpc("admin_analytics_daily_events", {
          _since: since.toISOString(),
          _until: until.toISOString(),
          _role: rpcRole,
        });
        // ── 6. RPC : top sources (toujours non filtré par rôle car page_view est role-agnostic) ──
        const topPromise = supabase.rpc("admin_analytics_top_sources", {
          _since: since.toISOString(),
          _until: until.toISOString(),
          _role: null,
          _limit: 15,
        });
        // ── 7. RPC : breakdown par rôle ──
        const breakdownPromise = supabase.rpc("admin_analytics_role_breakdown", {
          _since: since.toISOString(),
          _until: until.toISOString(),
        });
        // ── 8. Santé tracking ──
        const lastEvPromise = supabase
          .from("analytics_events")
          .select("created_at")
          .order("created_at", { ascending: false })
          .limit(1);
        const last24h = subDays(now, 1);
        const count24hPromise = supabase
          .from("analytics_events")
          .select("*", { count: "exact", head: true })
          .gte("created_at", last24h.toISOString());

        const [
          { data: profilesData, error: profilesErr },
          { data: countsRole, error: countsRoleErr },
          { data: countsAll, error: countsAllErr },
          { data: prevCounts, error: prevCountsErr },
          { data: prevCountsAll, error: prevCountsAllErr },
          { data: dailyData, error: dailyErr },
          { data: topData, error: topErr },
          { data: breakdownData, error: breakdownErr },
          { data: lastEv },
          { count: count24h },
        ] = await Promise.all([
          profilesQuery,
          countsRolePromise,
          countsAllPromise,
          prevCountsPromise,
          prevCountsAllPromise,
          dailyPromise,
          topPromise,
          breakdownPromise,
          lastEvPromise,
          count24hPromise,
        ]);

        const firstErr = profilesErr || countsRoleErr || countsAllErr || prevCountsErr || prevCountsAllErr || dailyErr || topErr || breakdownErr;
        if (firstErr) {
          throw new Error(firstErr.message);
        }

        // Tracking health
        setTrackingHealth({
          lastEvent: lastEv?.[0]?.created_at ? new Date(lastEv[0].created_at) : null,
          eventsCount24h: count24h ?? 0,
        });

        // Profils filtrés par rôle
        const filteredProfiles = (profilesData || []).filter((p: any) =>
          roleFilter === "all" ? true : p.role === roleFilter
        );
        setTotalInscrits(filteredProfiles.length);

        // Map des counts (role-aware vs role-agnostic)
        const roleMap = new Map<string, number>();
        (countsRole || []).forEach((r: any) => roleMap.set(r.event_type, Number(r.cnt)));
        const allMap = new Map<string, number>();
        (countsAll || []).forEach((r: any) => allMap.set(r.event_type, Number(r.cnt)));
        const prevRoleMap = new Map<string, number>();
        (prevCounts || []).forEach((r: any) => prevRoleMap.set(r.event_type, Number(r.cnt)));
        const prevAllMap = new Map<string, number>();
        (prevCountsAll || []).forEach((r: any) => prevAllMap.set(r.event_type, Number(r.cnt)));

        // Pour chaque step : si role-agnostic, on prend allMap (sinon le filtre fausse tout).
        // Sinon on prend roleMap.
        const counts: FunnelCounts = {};
        const prevC: FunnelCounts = {};
        FUNNEL_STEPS.forEach((s) => {
          const useAll = ROLE_AGNOSTIC_EVENTS.has(s.key);
          counts[s.key] = (useAll ? allMap : roleMap).get(s.key) || 0;
          prevC[s.key] = (useAll ? prevAllMap : prevRoleMap).get(s.key) || 0;
        });
        setFunnelCounts(counts);
        setPreviousFunnel(prevC);
        // page_views : toujours allMap
        setPageViews(allMap.get("page_view") || 0);
        setPreviousPageViews(prevAllMap.get("page_view") || 0);

        // Daily : compléter les jours sans events à 0 + ajouter inscrits
        const dayMap = new Map<string, DailyStat>();
        for (let i = 0; i < range; i++) {
          const d = format(subDays(now, i), "yyyy-MM-dd");
          dayMap.set(d, { jour: d, inscrits: 0, page_views: 0, signup_started: 0, signup_completed: 0 });
        }
        (dailyData || []).forEach((r: any) => {
          const k = r.jour;
          const row = dayMap.get(k);
          if (!row) return;
          row.page_views = Number(r.page_views) || 0;
          row.signup_started = Number(r.signup_started) || 0;
          row.signup_completed = Number(r.signup_completed) || 0;
        });
        filteredProfiles.forEach((p: any) => {
          const k = format(new Date(p.created_at), "yyyy-MM-dd");
          const row = dayMap.get(k);
          if (row) row.inscrits++;
        });
        setDaily(Array.from(dayMap.values()).sort((a, b) => a.jour.localeCompare(b.jour)));

        // Top pages
        setTopPages((topData || []).map((r: any) => ({ path: r.path, views: Number(r.views) })));

        // Breakdown par rôle
        const byRole: Record<string, FunnelCounts> = { owner: {}, sitter: {}, both: {} };
        ["owner", "sitter", "both"].forEach((r) =>
          FUNNEL_STEPS.forEach((s) => { byRole[r][s.key] = 0; })
        );
        (breakdownData || []).forEach((r: any) => {
          if (!byRole[r.role]) return;
          if (byRole[r.role][r.event_type] !== undefined) {
            byRole[r.role][r.event_type] = Number(r.cnt);
          }
        });
        setStepDropoffByRole(byRole);
      } catch (e: any) {
        setError(e?.message || "Erreur de chargement");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [range, roleFilter]);

  const trackingOK = trackingHealth.lastEvent && (Date.now() - trackingHealth.lastEvent.getTime()) < 60 * 60 * 1000;

  // ── KPIs de conversion ──
  const kpis = useMemo(() => {
    const started = funnelCounts.signup_started || 0;
    const formSubmitted = funnelCounts.signup_form_submitted || 0;
    const realSignups = totalInscrits;
    const onboardingCompleted = funnelCounts.onboarding_completed || 0;
    const firstAction = funnelCounts.first_action || 0;
    const clamp = (v: number) => Math.min(100, Math.max(0, v));

    return {
      signupConversionRate: started > 0 ? clamp(Math.round((realSignups / started) * 100)) : 0,
      formSubmissionRate: started > 0 ? clamp(Math.round((formSubmitted / started) * 100)) : 0,
      activationRate: realSignups > 0 ? clamp(Math.round((onboardingCompleted / realSignups) * 100)) : 0,
      deepActivationRate: onboardingCompleted > 0 ? clamp(Math.round((firstAction / onboardingCompleted) * 100)) : 0,
      globalConversion: started > 0 ? clamp(Math.round((firstAction / started) * 100)) : 0,
    };
  }, [funnelCounts, totalInscrits]);

  const funnelChartData = useMemo(() => {
    const colors = [
      "hsl(var(--muted-foreground))",
      "hsl(var(--primary) / 0.5)",
      "hsl(var(--primary) / 0.65)",
      "hsl(var(--primary) / 0.8)",
      "hsl(var(--primary) / 0.85)",
      "hsl(var(--primary) / 0.9)",
      "hsl(var(--primary))",
    ];
    return [
      { etape: "1. Visite /inscription", count: funnelCounts.signup_started || 0, color: colors[0] },
      { etape: "2. Rôle choisi", count: funnelCounts.signup_role_selected || 0, color: colors[1] },
      { etape: "3. Formulaire envoyé", count: funnelCounts.signup_form_submitted || 0, color: colors[2] },
      { etape: "4. Compte créé (réel)", count: totalInscrits, color: colors[3] },
      { etape: "5. Onboarding ouvert", count: funnelCounts.onboarding_started || 0, color: colors[4] },
      { etape: "6. Onboarding terminé", count: funnelCounts.onboarding_completed || 0, color: colors[5] },
      { etape: "7. 1ère action", count: funnelCounts.first_action || 0, color: colors[6] },
    ];
  }, [funnelCounts, totalInscrits]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Analytics</h1>
          <p className="text-sm text-muted-foreground">Funnel d'activation, conversions et inscriptions</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Tabs value={roleFilter} onValueChange={(v) => setRoleFilter(v as RoleFilter)}>
            <TabsList>
              <TabsTrigger value="all">Tous</TabsTrigger>
              <TabsTrigger value="owner">Propriétaires</TabsTrigger>
              <TabsTrigger value="sitter">Gardiens</TabsTrigger>
              <TabsTrigger value="both">Les deux</TabsTrigger>
            </TabsList>
          </Tabs>
          <Tabs value={String(range)} onValueChange={(v) => setRange(Number(v) as Range)}>
            <TabsList>
              <TabsTrigger value="1">24h</TabsTrigger>
              <TabsTrigger value="7">7 jours</TabsTrigger>
              <TabsTrigger value="30">30 jours</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {error && (
        <Card className="border-destructive bg-destructive/5">
          <CardContent className="flex items-start gap-3 p-4">
            <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-destructive">Chargement impossible</p>
              <p className="text-muted-foreground mt-0.5">{error}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {!trackingOK && !error && (
        <Card className="border-destructive bg-destructive/5">
          <CardContent className="flex items-start gap-3 p-4">
            <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-destructive">Tracking inactif</p>
              <p className="text-muted-foreground mt-0.5">
                {trackingHealth.lastEvent
                  ? `Dernier événement reçu il y a ${formatRelative(trackingHealth.lastEvent)}.`
                  : "Aucun événement enregistré."}
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
              label="Inscrits (réels)"
              value={totalInscrits}
              delta={null}
              icon={Users}
              hint="Source : table profiles"
            />
            <StatCard
              label="Pages vues"
              value={pageViews}
              delta={delta(pageViews, previousPageViews)}
              icon={MousePointerClick}
            />
            <StatCard
              label="Signups démarrés"
              value={funnelCounts.signup_started || 0}
              delta={delta(funnelCounts.signup_started, previousFunnel.signup_started)}
              icon={TrendingUp}
            />
            <StatCard
              label="Conversion globale"
              value={`${kpis.globalConversion}%`}
              delta={null}
              icon={TrendingUp}
              hint={`${funnelCounts.first_action || 0} ont fait une 1ère action`}
            />
          </div>

          {/* KPIs de conversion par étape */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Filter className="h-4 w-4" /> Taux de conversion par étape
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <ConversionTile
                  label="Démarré → Formulaire"
                  value={kpis.formSubmissionRate}
                  hint={`${funnelCounts.signup_form_submitted || 0} / ${funnelCounts.signup_started || 0}`}
                />
                <ConversionTile
                  label="Démarré → Compte créé"
                  value={kpis.signupConversionRate}
                  hint={`${totalInscrits} / ${funnelCounts.signup_started || 0} (vrais inscrits)`}
                />
                <ConversionTile
                  label="Compte créé → Onboarding terminé"
                  value={kpis.activationRate}
                  hint={`${funnelCounts.onboarding_completed || 0} / ${totalInscrits}`}
                />
                <ConversionTile
                  label="Onboarding → 1ère action"
                  value={kpis.deepActivationRate}
                  hint={`${funnelCounts.first_action || 0} / ${funnelCounts.onboarding_completed || 0}`}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                Source de vérité pour "Compte créé" : table profiles. Les events <code>signup_form_submitted</code> et <code>signup_email_confirmed</code> sont indicatifs (sous-comptés sur les inscriptions Google OAuth et les anciens comptes).
              </p>
            </CardContent>
          </Card>

          {/* Funnel visuel, entonnoir horizontal */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Entonnoir d'activation</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {funnelChartData.map((step, idx) => {
                  const max = funnelChartData[0]?.count || 1;
                  const pct = max > 0 ? (step.count / max) * 100 : 0;
                  const previousCount = idx > 0 ? funnelChartData[idx - 1].count : step.count;
                  const dropPct = previousCount > 0 && idx > 0
                    ? Math.round(((previousCount - step.count) / previousCount) * 100)
                    : 0;
                  return (
                    <div key={step.etape} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium text-foreground">{step.etape}</span>
                        <div className="flex items-center gap-3">
                          {idx > 0 && step.count < previousCount && (
                            <span className="text-xs text-destructive">
                              −{dropPct}% drop
                            </span>
                          )}
                          <span className="font-bold tabular-nums">{step.count}</span>
                        </div>
                      </div>
                      <div className="h-8 bg-muted rounded-md overflow-hidden">
                        <div
                          className="h-full transition-all duration-500 rounded-md"
                          style={{
                            width: `${Math.max(pct, 2)}%`,
                            backgroundColor: step.color,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground mt-4">
                L'étape <strong>"Compte créé (réel)"</strong> vient de la table profiles (source fiable). Les autres viennent d'events client : un drop entre étapes peut refléter un sous-comptage (ex. inscriptions Google OAuth ne déclenchent pas <code>signup_form_submitted</code>).
              </p>
            </CardContent>
          </Card>

          {/* Comparaison par rôle */}
          {roleFilter === "all" && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Comparaison Propriétaires vs Gardiens vs Les deux</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-2 font-medium text-muted-foreground">Étape</th>
                        <th className="text-right py-2 font-medium text-muted-foreground">Propriétaires</th>
                        <th className="text-right py-2 font-medium text-muted-foreground">Gardiens</th>
                        <th className="text-right py-2 font-medium text-muted-foreground">Les deux</th>
                      </tr>
                    </thead>
                    <tbody>
                      {FUNNEL_STEPS.map((s) => (
                        <tr key={s.key} className="border-b border-border last:border-0">
                          <td className="py-2 text-foreground">{s.label}</td>
                          <td className="text-right py-2 tabular-nums">{stepDropoffByRole.owner?.[s.key] || 0}</td>
                          <td className="text-right py-2 tabular-nums">{stepDropoffByRole.sitter?.[s.key] || 0}</td>
                          <td className="text-right py-2 tabular-nums">{stepDropoffByRole.both?.[s.key] || 0}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Chart inscriptions par jour */}
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

          {/* Top pages */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Top sources de pages vues</CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                Chemins normalisés (UUID/slug regroupés sous <code className="text-foreground/70">:id</code> / <code className="text-foreground/70">:slug</code>)
              </p>
            </CardHeader>
            <CardContent>
              {topPages.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Aucune vue enregistrée sur la période.
                </p>
              ) : (
                <div style={{ height: Math.max(240, topPages.length * 32) }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={topPages}
                      layout="vertical"
                      margin={{ top: 4, right: 24, left: 8, bottom: 4 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" horizontal={false} />
                      <XAxis type="number" className="text-xs" allowDecimals={false} />
                      <YAxis
                        type="category"
                        dataKey="path"
                        width={220}
                        tick={{ fontSize: 11 }}
                        interval={0}
                      />
                      <Tooltip
                        cursor={{ fill: "hsl(var(--muted) / 0.5)" }}
                        contentStyle={{
                          background: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: 8,
                          fontSize: 12,
                        }}
                        formatter={(value: number) => [`${value} vues`, "Pages vues"]}
                      />
                      <Bar dataKey="views" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

          <FacebookReferralCard rangeDays={range} />
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
        <div className={`flex items-center gap-1 text-xs mt-1 ${delta > 0 ? "text-success" : delta < 0 ? "text-destructive" : "text-muted-foreground"}`}>
          {delta > 0 ? <TrendingUp className="h-3 w-3" /> : delta < 0 ? <TrendingDown className="h-3 w-3" /> : null}
          <span>{delta > 0 ? "+" : ""}{delta}% vs période préc.</span>
        </div>
      )}
      {hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
    </CardContent>
  </Card>
);

const ConversionTile = ({ label, value, hint }: { label: string; value: number; hint: string }) => {
  const colorClass =
    value >= 50 ? "text-success" :
    value >= 25 ? "text-warning" :
    "text-destructive";
  return (
    <div className="bg-muted/40 rounded-lg p-3 border border-border">
      <p className="text-xs text-muted-foreground leading-tight mb-2">{label}</p>
      <p className={`text-2xl font-bold tabular-nums ${colorClass}`}>{value}%</p>
      <p className="text-[10px] text-muted-foreground mt-1 tabular-nums">{hint}</p>
    </div>
  );
};

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
