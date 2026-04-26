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
  { key: "signup_started", label: "1. Visite /inscription", color: "hsl(var(--muted-foreground))" },
  { key: "signup_role_selected", label: "2. Rôle choisi", color: "hsl(var(--primary) / 0.6)" },
  { key: "signup_form_submitted", label: "3. Formulaire envoyé", color: "hsl(var(--primary) / 0.7)" },
  { key: "signup_email_confirmed", label: "4. Email confirmé", color: "hsl(var(--primary) / 0.8)" },
  { key: "onboarding_started", label: "5. Onboarding ouvert", color: "hsl(var(--primary) / 0.85)" },
  { key: "onboarding_completed", label: "6. Onboarding terminé", color: "hsl(var(--primary) / 0.9)" },
  { key: "first_action", label: "7. 1ère action", color: "hsl(var(--primary))" },
] as const;

interface FunnelCounts {
  [key: string]: number;
}

interface TopPage {
  path: string;
  views: number;
}

// Libellé utilisé quand la source est vide, invalide ou non reconnue.
const UNKNOWN_SOURCE_LABEL = "(autres / inconnu)";

// Normalise une URL pathname pour regrouper les chemins dynamiques.
// Ex: /gardiens/<uuid> → /gardiens/:id, /guides/lyon → /guides/:slug
// Retourne TOUJOURS une chaîne — les sources vides/invalides tombent dans
// UNKNOWN_SOURCE_LABEL pour ne pas perdre de lignes dans l'histogramme.
function normalizeSource(raw: string | null | undefined): string {
  if (raw == null) return UNKNOWN_SOURCE_LABEL;
  let p = String(raw).trim();
  if (!p) return UNKNOWN_SOURCE_LABEL;

  // Retire querystring/fragment au cas où
  p = p.split("?")[0].split("#")[0].trim();
  if (!p) return UNKNOWN_SOURCE_LABEL;

  // Si on reçoit une URL absolue (ex: "https://guardiens.fr/foo"), on en extrait le pathname
  if (/^https?:\/\//i.test(p)) {
    try {
      p = new URL(p).pathname || "/";
    } catch {
      return UNKNOWN_SOURCE_LABEL;
    }
  }

  // À ce stade on attend un chemin commençant par "/"
  if (!p.startsWith("/")) {
    // Source non-URL (ex: "header_cta", "email_link") — on la garde telle quelle
    return p;
  }

  // Retire trailing slash sauf racine
  if (p.length > 1 && p.endsWith("/")) p = p.slice(0, -1);

  const uuidRe = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

  // Patterns avec ID dynamique
  const dynamicPatterns: Array<[RegExp, string]> = [
    [/^\/gardiens\/.+$/, "/gardiens/:id"],
    [/^\/proprietaires?\/.+$/, "/proprietaires/:id"],
    [/^\/profil\/.+$/, "/profil/:id"],
    [/^\/annonces\/.+$/, "/annonces/:id"],
    [/^\/sits\/.+$/, "/sits/:id"],
    [/^\/missions\/.+$/, "/missions/:id"],
    [/^\/petites-missions\/.+$/, "/petites-missions/:id"],
    [/^\/messages\/.+$/, "/messages/:id"],
    [/^\/conversation\/.+$/, "/conversation/:id"],
    [/^\/guides\/.+$/, "/guides/:slug"],
    [/^\/actualites\/.+$/, "/actualites/:slug"],
    [/^\/articles\/.+$/, "/articles/:slug"],
    [/^\/villes?\/.+$/, "/villes/:slug"],
    [/^\/departements?\/.+$/, "/departements/:slug"],
    [/^\/avis\/.+$/, "/avis/:id"],
  ];
  for (const [re, repl] of dynamicPatterns) {
    if (re.test(p)) return repl;
  }
  // UUID résiduel quelque part dans le path
  if (uuidRe.test(p)) {
    return p.replace(uuidRe, ":id");
  }
  return p;
}

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

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const since = startOfDay(subDays(new Date(), range - 1));
      const sincePrev = startOfDay(subDays(new Date(), range * 2 - 1));

      // 1. Profils créés (vrai nombre d'inscrits — source de vérité)
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("created_at, role")
        .gte("created_at", since.toISOString());

      // 2. Tous les events de la période (avec role en metadata)
      const { data: eventsData } = await supabase
        .from("analytics_events")
        .select("event_type, created_at, source, metadata")
        .gte("created_at", since.toISOString())
        .order("created_at", { ascending: false })
        .limit(10000);

      // 3. Période précédente (pour deltas)
      const { data: prevEventsData } = await supabase
        .from("analytics_events")
        .select("event_type, metadata")
        .gte("created_at", sincePrev.toISOString())
        .lt("created_at", since.toISOString())
        .limit(10000);

      // 4. Santé du tracking
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

      // ── Filtre par rôle (lit metadata.role) ──
      const matchRole = (e: any) => {
        if (roleFilter === "all") return true;
        const r = e?.metadata?.role;
        return r === roleFilter;
      };

      const filteredEvents = (eventsData || []).filter(matchRole);
      const filteredPrev = (prevEventsData || []).filter(matchRole);

      // ── Daily aggregates (inscrits filtrés par rôle si demandé) ──
      const dayMap = new Map<string, DailyStat>();
      for (let i = 0; i < range; i++) {
        const d = format(subDays(new Date(), i), "yyyy-MM-dd");
        dayMap.set(d, { jour: d, inscrits: 0, page_views: 0, signup_started: 0, signup_completed: 0 });
      }

      const filteredProfiles = (profilesData || []).filter(p =>
        roleFilter === "all" ? true : p.role === roleFilter
      );

      filteredProfiles.forEach((p) => {
        const k = format(new Date(p.created_at!), "yyyy-MM-dd");
        const row = dayMap.get(k);
        if (row) row.inscrits++;
      });

      filteredEvents.forEach((e) => {
        const k = format(new Date(e.created_at!), "yyyy-MM-dd");
        const row = dayMap.get(k);
        if (!row) return;
        if (e.event_type === "page_view") row.page_views++;
        if (e.event_type === "signup_started") row.signup_started++;
        if (e.event_type === "signup_completed" || e.event_type === "onboarding_completed") {
          row.signup_completed++;
        }
      });

      setDaily(Array.from(dayMap.values()).sort((a, b) => a.jour.localeCompare(b.jour)));
      setTotalInscrits(filteredProfiles.length);

      // ── Compteurs funnel (current period) ──
      const counts: FunnelCounts = {};
      const prevCounts: FunnelCounts = {};
      let pv = 0;
      let prevPv = 0;
      FUNNEL_STEPS.forEach(s => { counts[s.key] = 0; prevCounts[s.key] = 0; });

      filteredEvents.forEach((e) => {
        if (e.event_type === "page_view") pv++;
        if (counts[e.event_type] !== undefined) counts[e.event_type]++;
      });
      filteredPrev.forEach((e) => {
        if (e.event_type === "page_view") prevPv++;
        if (prevCounts[e.event_type] !== undefined) prevCounts[e.event_type]++;
      });

      setFunnelCounts(counts);
      setPreviousFunnel(prevCounts);
      setPageViews(pv);
      setPreviousPageViews(prevPv);

      // ── Drop-off par rôle (pour comparaison Propriétaire vs Gardien) ──
      const byRole: Record<string, FunnelCounts> = {
        owner: {},
        sitter: {},
        both: {},
      };
      ["owner", "sitter", "both"].forEach(r =>
        FUNNEL_STEPS.forEach(s => { byRole[r][s.key] = 0; })
      );
      (eventsData || []).forEach((e: any) => {
        const r = e?.metadata?.role;
        if (!r || !byRole[r]) return;
        if (byRole[r][e.event_type] !== undefined) byRole[r][e.event_type]++;
      });
      setStepDropoffByRole(byRole);

      // ── Top pages (sources normalisées) ──
      // normalizeSource() retourne TOUJOURS une chaîne : les sources vides
      // ou non reconnues sont regroupées sous UNKNOWN_SOURCE_LABEL afin de
      // ne pas perdre de page_view dans le total.
      const pageCount = new Map<string, number>();
      filteredEvents.forEach((e) => {
        if (e.event_type !== "page_view") return;
        const normalized = normalizeSource(e.source);
        pageCount.set(normalized, (pageCount.get(normalized) || 0) + 1);
      });
      setTopPages(
        Array.from(pageCount.entries())
          .map(([path, views]) => ({ path, views }))
          .sort((a, b) => b.views - a.views)
          .slice(0, 15)
      );

      setLoading(false);
    };
    load();
  }, [range, roleFilter]);

  const trackingOK = trackingHealth.lastEvent && (Date.now() - trackingHealth.lastEvent.getTime()) < 60 * 60 * 1000;

  // ── KPIs de conversion ──
  // IMPORTANT : `signup_form_submitted` et `signup_email_confirmed` sont sous-comptés
  // (form_submitted = uniquement signup email/mdp réussis ; email_confirmed = uniquement
  // depuis lien email, pas Google OAuth historique). On utilise `totalInscrits` (table
  // profiles = source de vérité absolue) comme dénominateur des étapes en aval.
  const kpis = useMemo(() => {
    const started = funnelCounts.signup_started || 0;
    const formSubmitted = funnelCounts.signup_form_submitted || 0;
    // Pivot fiable : nombre réel d'inscrits (table profiles)
    const realSignups = totalInscrits;
    const onboardingCompleted = funnelCounts.onboarding_completed || 0;
    const firstAction = funnelCounts.first_action || 0;
    const clamp = (v: number) => Math.min(100, Math.max(0, v));

    return {
      // % de visites /inscription qui ont réellement créé un compte (vrai pivot)
      signupConversionRate: started > 0 ? clamp(Math.round((realSignups / started) * 100)) : 0,
      // Form submission rate : reste indicatif (event optionnel)
      formSubmissionRate: started > 0 ? clamp(Math.round((formSubmitted / started) * 100)) : 0,
      // Activation : onboarding terminé / inscrits réels
      activationRate: realSignups > 0 ? clamp(Math.round((onboardingCompleted / realSignups) * 100)) : 0,
      // Action profonde : 1ère action / onboarding terminé
      deepActivationRate: onboardingCompleted > 0 ? clamp(Math.round((firstAction / onboardingCompleted) * 100)) : 0,
      // Conversion globale : 1ère action / visites
      globalConversion: started > 0 ? clamp(Math.round((firstAction / started) * 100)) : 0,
    };
  }, [funnelCounts, totalInscrits]);

  // ── Funnel data pour BarChart horizontal ──
  // On remplace `signup_form_submitted` et `signup_email_confirmed` (sous-comptés)
  // par une étape pivot synthétique "Inscrits (profil créé)" basée sur la table
  // profiles, qui est la seule source fiable. Les events restent disponibles dans
  // les KPIs détaillés ci-dessus pour qui veut les inspecter.
  const funnelChartData = useMemo(() => {
    return [
      { etape: "1. Visite /inscription", count: funnelCounts.signup_started || 0, color: "hsl(var(--muted-foreground))" },
      { etape: "2. Rôle choisi", count: funnelCounts.signup_role_selected || 0, color: "hsl(var(--primary) / 0.5)" },
      { etape: "3. Formulaire envoyé", count: funnelCounts.signup_form_submitted || 0, color: "hsl(var(--primary) / 0.65)" },
      { etape: "4. Compte créé (réel)", count: totalInscrits, color: "hsl(var(--primary) / 0.8)" },
      { etape: "5. Onboarding ouvert", count: funnelCounts.onboarding_started || 0, color: "hsl(var(--primary) / 0.85)" },
      { etape: "6. Onboarding terminé", count: funnelCounts.onboarding_completed || 0, color: "hsl(var(--primary) / 0.9)" },
      { etape: "7. 1ère action", count: funnelCounts.first_action || 0, color: "hsl(var(--primary))" },
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

          {/* Funnel visuel — entonnoir horizontal */}
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
                Les étapes 4 à 7 sont nouvelles — il faudra ~3-7 jours pour accumuler des données fiables.
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
        <div className={`flex items-center gap-1 text-xs mt-1 ${delta > 0 ? "text-green-600" : delta < 0 ? "text-destructive" : "text-muted-foreground"}`}>
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
    value >= 50 ? "text-green-600" :
    value >= 25 ? "text-amber-600" :
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
