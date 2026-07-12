import { lazy, Suspense, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Users, MousePointerClick, Timer, Eye } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import MetricCard from "@/components/admin/seo/MetricCard";
import TrafficSources from "@/components/admin/seo/TrafficSources";
import { useSeoData } from "@/hooks/useSeoData";

const AdminAnalytics = lazy(() => import("./AdminAnalytics"));
const AdminSEO = lazy(() => import("./AdminSEO"));
const AdminSignupFunnelTab = lazy(() => import("@/components/admin/AdminSignupFunnelTab"));
const SignupFormSubStepsFunnel = lazy(() => import("@/components/admin/SignupFormSubStepsFunnel"));

function pctChange(current: number, previous: number): number | undefined {
  if (previous === 0 && current === 0) return 0;
  if (previous === 0) return undefined;
  return ((current - previous) / previous) * 100;
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}m ${s < 10 ? "0" : ""}${s}s`;
}

const AdminTraffic = () => {
  const [params, setParams] = useSearchParams();
  const tabParam = params.get("tab");
  const tab =
    tabParam === "acquisition" || tabParam === "signup-funnel"
      ? tabParam
      : "interne";
  const { data, loading } = useSeoData();
  const ga4 = data?.ga4;
  const gsc = data?.gsc;

  const kpis = useMemo(() => ([
    {
      title: "Sessions (30j)",
      icon: <Users className="h-4 w-4 text-primary" />,
      value: ga4 ? ga4.current.sessions.toLocaleString() : "–",
      subtitle: "GA4",
      change: ga4?.previous ? pctChange(ga4.current.sessions, ga4.previous.sessions) : undefined,
    },
    {
      title: "Visiteurs uniques",
      icon: <Users className="h-4 w-4 text-primary" />,
      value: ga4 ? ga4.current.activeUsers.toLocaleString() : "–",
      subtitle: "30 derniers jours",
      change: ga4?.previous ? pctChange(ga4.current.activeUsers, ga4.previous.activeUsers) : undefined,
    },
    {
      title: "Clics SEO",
      icon: <MousePointerClick className="h-4 w-4 text-primary" />,
      value: gsc ? gsc.current.clicks.toLocaleString() : "–",
      subtitle: "Google Search Console",
      change: gsc?.previous ? pctChange(gsc.current.clicks, gsc.previous.clicks) : undefined,
    },
    {
      title: "Temps moyen",
      icon: <Timer className="h-4 w-4 text-primary" />,
      value: ga4 ? formatDuration(ga4.current.averageSessionDuration) : "–",
      subtitle: "Par session",
      change: ga4?.previous ? pctChange(ga4.current.averageSessionDuration, ga4.previous.averageSessionDuration) : undefined,
    },
  ]), [ga4, gsc]);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Trafic"
        description="Synthèse du trafic entrant, funnel d'activation interne et acquisition SEO."
      />

      {/* Bloc synthèse trafic */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Synthèse (30 jours)
        </h2>
        {loading && !data ? (
          <Card>
            <CardContent className="py-8 flex items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {kpis.map((k) => (
              <MetricCard
                key={k.title}
                title={k.title}
                icon={k.icon}
                value={k.value}
                subtitle={k.subtitle}
                change={k.change}
              />
            ))}
          </div>
        )}

        <TrafficSources channels={ga4?.channels} loading={loading && !data} />
      </section>

      {/* Onglets détails */}
      <Tabs
        value={tab}
        onValueChange={(v) => {
          const next = new URLSearchParams(params);
          if (v === "interne") next.delete("tab");
          else next.set("tab", v);
          setParams(next, { replace: true });
        }}
      >
        <TabsList>
          <TabsTrigger value="interne">
            <Eye className="h-4 w-4 mr-2" /> Trafic interne & funnel
          </TabsTrigger>
          <TabsTrigger value="acquisition">
            <MousePointerClick className="h-4 w-4 mr-2" /> Acquisition SEO
          </TabsTrigger>
          <TabsTrigger value="signup-funnel">
            <Users className="h-4 w-4 mr-2" /> Funnel signup
          </TabsTrigger>
        </TabsList>

        <TabsContent value="interne" className="mt-6">
          <Suspense fallback={<div className="p-8 text-center text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin inline" /></div>}>
            <AdminAnalytics />
          </Suspense>
        </TabsContent>

        <TabsContent value="acquisition" className="mt-6">
          <Suspense fallback={<div className="p-8 text-center text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin inline" /></div>}>
            <AdminSEO />
          </Suspense>
        </TabsContent>

        <TabsContent value="signup-funnel" className="mt-6">
          <Suspense fallback={<div className="p-8 text-center text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin inline" /></div>}>
            <AdminSignupFunnelTab />
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminTraffic;
