import { Suspense, useMemo } from "react";
import { lazyWithRetry as lazy } from "@/lib/lazyWithRetry";
import { useSearchParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Users, MousePointerClick, Timer, Eye } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import MetricCard from "@/components/admin/seo/MetricCard";
import TrafficSources from "@/components/admin/seo/TrafficSources";
import { useSeoData } from "@/hooks/useSeoData";
import { formatDurationFr, periodLabel, fmtInt } from "@/lib/admin/seoMetrics";

const AdminAnalytics = lazy(() => import("./AdminAnalytics"), "AdminAnalytics");
const AdminSEO = lazy(() => import("./AdminSEO"), "AdminSEO");
const AcquisitionPilotCard = lazy(() => import("@/pages/admin/_components/dashboard/AcquisitionPilotCard").then((m) => ({ default: m.AcquisitionPilotCard })), "AcquisitionPilotCard");
const AdminSignupFunnelTab = lazy(() => import("@/components/admin/AdminSignupFunnelTab"), "AdminSignupFunnelTab");
const SignupSourcesCard = lazy(() => import("@/components/admin/SignupSourcesCard"), "SignupSourcesCard");
const ChannelLeadsCard = lazy(() => import("@/components/admin/ChannelLeadsCard"), "ChannelLeadsCard");
const Step0AbandonsCard = lazy(() => import("@/components/admin/Step0AbandonsCard"), "Step0AbandonsCard");
const SignupFormSubStepsFunnel = lazy(() => import("@/components/admin/SignupFormSubStepsFunnel"), "SignupFormSubStepsFunnel");

export type TrafficTab = "leads" | "entonnoir" | "seo";

export function trafficTabFromParam(param: string | null): TrafficTab {
  if (param === "entonnoir" || param === "interne" || param === "signup-funnel") return "entonnoir";
  if (param === "seo" || param === "acquisition") return "seo";
  return "leads";
}

function pctChange(current: number, previous: number): number | undefined {
  if (previous === 0 && current === 0) return 0;
  if (previous === 0) return undefined;
  return ((current - previous) / previous) * 100;
}

const formatDuration = formatDurationFr;

/**
 * Synthèse GA4 et Search Console, onglet « SEO et IA » (lot TRF2) : lue
 * seulement quand l'onglet est ouvert. GA4 ne voit que les visiteurs qui
 * acceptent la mesure d'audience ; les onglets Leads et Entonnoir lisent la
 * mesure du site.
 */
const SeoSynthesis = () => {
  const { data, loading } = useSeoData();
  const ga4 = data?.ga4;

  const ga4Period = periodLabel(data?.period?.ga4Start, data?.period?.ga4End, "30 jours");
  const kpis = useMemo(() => ([
    {
      title: "Sessions",
      icon: <Users className="h-4 w-4 text-primary" />,
      value: ga4 ? fmtInt(ga4.current.sessions) : "·",
      subtitle: `${ga4Period} · GA4, tous canaux`,
      change: ga4?.previous ? pctChange(ga4.current.sessions, ga4.previous.sessions) : undefined,
    },
    {
      title: "Visiteurs uniques",
      icon: <Users className="h-4 w-4 text-primary" />,
      value: ga4 ? fmtInt(ga4.current.activeUsers) : "·",
      subtitle: `${ga4Period} · GA4`,
      change: ga4?.previous ? pctChange(ga4.current.activeUsers, ga4.previous.activeUsers) : undefined,
    },
    // Lot SEO-A : les clics Google se lisent une seule fois, dans « Visibilité SEO » plus bas.
    {
      title: "Temps moyen",
      icon: <Timer className="h-4 w-4 text-primary" />,
      value: ga4 ? formatDuration(ga4.current.averageSessionDuration) : "·",
      subtitle: `Par session · ${ga4Period}`,
      change: ga4?.previous ? pctChange(ga4.current.averageSessionDuration, ga4.previous.averageSessionDuration) : undefined,
    },
  ]), [ga4, ga4Period]);

  return (
    <div className="space-y-6">
      <p className="text-xs text-muted-foreground rounded-lg border border-border bg-muted/40 px-3 py-2">
        Depuis le bandeau de consentement, les chiffres GA4 couvrent seulement les visiteurs qui ont accepté la mesure d'audience. Les onglets Leads et Entonnoir et Search Console restent complets.
      </p>
      {/* Bloc synthèse trafic */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Synthèse
        </h2>
        {loading && !data ? (
          <Card>
            <CardContent className="py-8 flex items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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

    </div>
  );
};

const AdminTraffic = () => {
  const [params, setParams] = useSearchParams();
  const tabParam = params.get("tab");
  // Lot TRF2 (15/11/2026) : trois onglets, Leads par défaut. Les anciens
  // liens ?tab= restent valides (interne et signup-funnel : Entonnoir ;
  // acquisition : SEO et IA).
  const tab = trafficTabFromParam(tabParam);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Trafic"
        description="D'où viennent les membres qui agissent, ce qui bloque l'inscription, et la visibilité dans les moteurs."
      />

      <Tabs
        value={tab}
        onValueChange={(v) => {
          const next = new URLSearchParams(params);
          if (v === "leads") next.delete("tab");
          else next.set("tab", v);
          setParams(next, { replace: true });
        }}
      >
        <div className="overflow-x-auto -mx-1 px-1">
        <TabsList className="w-max">
          <TabsTrigger value="leads" className="min-h-11 md:min-h-9">
            <Users className="h-4 w-4 mr-2" /> Leads
          </TabsTrigger>
          <TabsTrigger value="entonnoir" className="min-h-11 md:min-h-9">
            <Eye className="h-4 w-4 mr-2" /> Entonnoir
          </TabsTrigger>
          <TabsTrigger value="seo" className="min-h-11 md:min-h-9">
            <MousePointerClick className="h-4 w-4 mr-2" /> SEO et IA
          </TabsTrigger>
        </TabsList>
        </div>

        <TabsContent value="leads" className="mt-6 space-y-6">
          <Suspense fallback={<div className="p-8 text-center text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin inline" /></div>}>
            <ChannelLeadsCard />
          </Suspense>
          {/* Lot SEO-B : pages villes, IndexNow, cycles de vie et sorties quittent l'onglet SEO. */}
          <Suspense fallback={<div className="p-8 text-center text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin inline" /></div>}>
            <AcquisitionPilotCard />
          </Suspense>
        </TabsContent>

        <TabsContent value="entonnoir" className="mt-6 space-y-6">
          <Suspense fallback={<div className="p-8 text-center text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin inline" /></div>}>
            <AdminAnalytics />
          </Suspense>
          {/* Lot P2 : activation propriétaire, fuite à l'étape 0 de la création d'annonce. */}
          <Suspense fallback={<div className="p-8 text-center text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin inline" /></div>}>
            <Step0AbandonsCard />
          </Suspense>
          <h2 className="text-lg font-semibold text-foreground border-b pb-2">Formulaire d'inscription</h2>
          {/* Lot SRC1 : inscriptions par canal d'arrivée, comptées depuis profiles (rôles, comptes Google ou email). */}
          <Suspense fallback={<div className="p-8 text-center text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin inline" /></div>}>
            <SignupSourcesCard />
          </Suspense>
          <Suspense fallback={<div className="p-8 text-center text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin inline" /></div>}>
            <AdminSignupFunnelTab />
          </Suspense>
          <Suspense fallback={<div className="p-8 text-center text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin inline" /></div>}>
            <SignupFormSubStepsFunnel />
          </Suspense>
        </TabsContent>

        <TabsContent value="seo" className="mt-6 space-y-6">
          {/* Lot SEO-B : la synthèse GA4 rejoint les outils repliés en fin d'onglet. */}
          <Suspense fallback={<div className="p-8 text-center text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin inline" /></div>}>
            <AdminSEO extraTools={<SeoSynthesis />} />
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminTraffic;
