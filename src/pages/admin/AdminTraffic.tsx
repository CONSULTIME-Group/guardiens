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
import { Button } from "@/components/ui/button";
import { leadsRange } from "@/lib/admin/channelLeads";
import {
  DEFAULT_TRAFFIC_PERIOD, TRAFFIC_PERIODS, TRAFFIC_PERIOD_PARAM, trafficPeriodDays, trafficPeriodFromParam, trafficPeriodSpanDays,
  trafficPeriodPhrase, trafficPeriodShortLabel, type TrafficPeriod,
} from "@/lib/admin/trafficPeriod";

const AdminAnalytics = lazy(() => import("./AdminAnalytics"), "AdminAnalytics");
const AdminSEO = lazy(() => import("./AdminSEO"), "AdminSEO");
const AcquisitionPilotCard = lazy(() => import("@/pages/admin/_components/dashboard/AcquisitionPilotCard").then((m) => ({ default: m.AcquisitionPilotCard })), "AcquisitionPilotCard");
const AdminSignupFunnelTab = lazy(() => import("@/components/admin/AdminSignupFunnelTab"), "AdminSignupFunnelTab");
const SignupSourcesCard = lazy(() => import("@/components/admin/SignupSourcesCard"), "SignupSourcesCard");
const ChannelLeadsCard = lazy(() => import("@/components/admin/ChannelLeadsCard"), "ChannelLeadsCard");
const SignupBrakesCard = lazy(() => import("@/components/admin/traffic/SignupBrakesCard"), "SignupBrakesCard");
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
  // Lot TRF-6 : période commune, portée par l'adresse (?periode=).
  const period = trafficPeriodFromParam(params.get(TRAFFIC_PERIOD_PARAM));
  const days = trafficPeriodDays(period);
  // Durée exacte, figée par période : une valeur recalculée à chaque rendu relancerait la lecture.
  const spanDays = useMemo(() => trafficPeriodSpanDays(period), [period]);
  const setPeriod = (p: TrafficPeriod) => {
    const next = new URLSearchParams(params);
    if (p === DEFAULT_TRAFFIC_PERIOD) next.delete(TRAFFIC_PERIOD_PARAM);
    else next.set(TRAFFIC_PERIOD_PARAM, String(p));
    setParams(next, { replace: true });
  };
  const fallback = <div className="p-8 text-center text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin inline" /></div>;

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

        {/* Lot TRF-6 (15/11/2026, maquette validée) : une seule période pour les trois onglets. */}
        <div className="mt-4 flex flex-wrap items-center gap-2" role="group" aria-label="Période" data-testid="traffic-period">
          {tab === "seo" ? (
            <span className="text-xs text-muted-foreground" data-testid="traffic-period-seo">Période de cet onglet : Search Console sur sa fenêtre de 28 jours, arrivées sur 30 jours.</span>
          ) : (
            <>
              <span className="text-xs text-muted-foreground">Période</span>
              {TRAFFIC_PERIODS.map((p) => (
                <Button key={p} type="button" size="sm" className="min-h-11 md:min-h-9"
                  variant={p === period ? "default" : "outline"} aria-pressed={p === period} onClick={() => setPeriod(p)}>
                  {trafficPeriodShortLabel(p)}
                </Button>
              ))}
            </>
          )}
        </div>

        <TabsContent value="leads" className="mt-6 space-y-6">
          <Suspense fallback={fallback}>
            <ChannelLeadsCard period={period} />
          </Suspense>
          {/* Lot TRF-6 : la production de pages et d'emails se déplie. */}
          <details className="rounded-2xl border bg-card px-4" data-testid="leads-production">
            <summary className="min-h-11 flex items-center text-base font-semibold cursor-pointer">Production : pages en ligne, IndexNow, emails automatiques</summary>
            <div className="pb-4 pt-2">
              <Suspense fallback={fallback}>
                <AcquisitionPilotCard />
              </Suspense>
            </div>
          </details>
        </TabsContent>

        <TabsContent value="entonnoir" className="mt-6 space-y-6">
          {/* Lot TRF-6 : synthèse et parcours, puis les freins, puis le détail replié. Profils remplis et
              installation de l'application se lisent dans « Vue d'ensemble », rubrique Activation. */}
          <Suspense fallback={fallback}>
            <AdminAnalytics days={spanDays} periodPhrase={trafficPeriodPhrase(period)} hideActivation />
          </Suspense>
          <Suspense fallback={fallback}>
            <SignupBrakesCard days={days} />
          </Suspense>
          <details className="rounded-2xl border bg-card px-4" data-testid="funnel-detail-form">
            <summary className="min-h-11 flex items-center text-base font-semibold cursor-pointer">Détail du formulaire d'inscription : blocages, échecs, sous-étapes</summary>
            <div className="space-y-6 pb-4 pt-2">
              <h2 className="sr-only">Formulaire d'inscription</h2>
              <Suspense fallback={fallback}>
                <AdminSignupFunnelTab days={days} />
              </Suspense>
              <Suspense fallback={fallback}>
                <SignupFormSubStepsFunnel days={days} />
              </Suspense>
            </div>
          </details>
          <details className="rounded-2xl border bg-card px-4" data-testid="funnel-detail-sources">
            <summary className="min-h-11 flex items-center text-base font-semibold cursor-pointer">Inscriptions par canal et par rôle</summary>
            <div className="pb-4 pt-2">
              {/* Lot SRC1 : inscriptions par canal d'arrivée, comptées depuis profiles (rôles, comptes Google ou email). */}
              <Suspense fallback={fallback}>
                <SignupSourcesCard range={leadsRange(period)} />
              </Suspense>
            </div>
          </details>
          <details className="rounded-2xl border bg-card px-4" data-testid="funnel-detail-sits">
            <summary className="min-h-11 flex items-center text-base font-semibold cursor-pointer">Création d'annonce : abandons à la première étape</summary>
            <div className="pb-4 pt-2">
              {/* Lot P2 : activation propriétaire, fuite à l'étape 0 de la création d'annonce. */}
              <Suspense fallback={fallback}>
                <Step0AbandonsCard />
              </Suspense>
            </div>
          </details>
          <p className="text-xs text-muted-foreground">
            Profils remplis par semaine et installation de l'application : <a href="/admin#activation" className="text-primary underline underline-offset-2">Vue d'ensemble, rubrique Activation</a>.
          </p>
        </TabsContent>

        <TabsContent value="seo" className="mt-6 space-y-6">
          {/* Lot SEO-B : la synthèse GA4 rejoint les outils repliés en fin d'onglet. */}
          <Suspense fallback={fallback}>
            <AdminSEO extraTools={<SeoSynthesis />} />
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminTraffic;
