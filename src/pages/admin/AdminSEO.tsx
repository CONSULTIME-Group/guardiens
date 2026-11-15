import { Link } from "react-router-dom";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, ExternalLink, AlertCircle } from "lucide-react";
import MetricCard from "@/components/admin/seo/MetricCard";
import StatusBar from "@/components/admin/seo/StatusBar";
import TopArticlesTable from "@/components/admin/seo/TopArticlesTable";
import PriorityActions from "@/components/admin/seo/PriorityActions";
import GSCQueriesTable from "@/components/admin/seo/GSCQueriesTable";
import IndexNowPanel from "@/components/admin/seo/IndexNowPanel";
import IndexNowHistory from "@/components/admin/seo/IndexNowHistory";
import BingVisibilityCard from "@/components/admin/seo/BingVisibilityCard";
import BingKpiRow from "@/components/admin/seo/BingKpiRow";
import BingBacklinksCard from "@/components/admin/seo/BingBacklinksCard";
import NoImpressionActionable from "@/components/admin/seo/NoImpressionActionable";
import UrlInspectionCard from "@/components/admin/seo/UrlInspectionCard";
import { LandingOutcomesCard, SeoGoogleKpis, SeoTemplatesCard, StrikingQueriesCard } from "@/components/admin/seo/SeoPilotBlocks";
import AiAcquisitionCard from "@/pages/admin/_components/dashboard/AiAcquisitionCard";
import { useSeoData, type GSCRow } from "@/hooks/useSeoData";
import type { BingPeriodDays } from "@/hooks/useBingData";
import {
  pagesFromSeo, periodLabel, organicSessions, fmtInt,
  aggregatePages, positionsFromTopPages, priorityActions, topArticles,
} from "@/lib/admin/seoMetrics";
import { useSeoArticles } from "@/hooks/useSeoArticles";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

function downloadCsv(filename: string, rows: GSCRow[]) {
  const head = "key,clicks,impressions,ctr,position\n";
  const body = rows.map((r) => {
    const key = (r.keys?.[0] ?? "").replace(/"/g, '""');
    return `"${key}",${r.clicks},${r.impressions},${(r.ctr * 100).toFixed(2)},${r.position.toFixed(1)}`;
  }).join("\n");
  const blob = new Blob([head + body], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

const AdminSEO = ({ extraTools }: { extraTools?: React.ReactNode } = {}) => {
  const { data: seoData, loading, error, refresh } = useSeoData();
  const [refreshing, setRefreshing] = useState(false);
  // Lot SEO-A : articles publiés avec leur statut Google, lus une fois pour tout l'onglet.
  const { articles: seoArticles } = useSeoArticles();
  const publishedArticles = seoArticles ?? [];
  const [bingPeriod, setBingPeriod] = useState<BingPeriodDays>(28);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  // No secret configured
  if (!loading && error === "GOOGLE_SERVICE_ACCOUNT_JSON not configured") {
    return (
      <div className="space-y-8">
        <h2 className="font-heading text-2xl font-bold tracking-tight text-foreground">Dashboard SEO</h2>
        <Card className="border-warning">
          <CardContent className="py-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-6 w-6 text-warning shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold mb-2">Configuration requise</h3>
                <ol className="text-sm text-muted-foreground space-y-1 list-decimal pl-4">
                  <li>Créer un compte de service Google Cloud</li>
                  <li>Activer les API Search Console et Analytics Data</li>
                  <li>Ajouter le compte de service en lecteur dans GSC et GA4</li>
                  <li>Stocker la clé JSON dans le secret <code className="bg-muted px-1 rounded">GOOGLE_SERVICE_ACCOUNT_JSON</code></li>
                </ol>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const ga4 = seoData?.ga4;
  const gsc = seoData?.gsc;

  const gscAvailable = gsc && (gsc.current.clicks > 0 || gsc.current.impressions > 0);

  // Lot A10 : liste complète des pages Google (plus de top 25) et chemin /actualites/.
  const allGscPages = pagesFromSeo(gsc);
  // Lot SEO-A : pages comptées une fois (ancres et anciens ?lang= regroupés).
  const pageTotals = aggregatePages(allGscPages);
  // Lot SEO-B : la liste complète porte désormais la position de chaque page ; les 25 premières servent de repli.
  const pagePositions = positionsFromTopPages([
    ...(gsc?.allPages ?? []).filter((p) => typeof p.position === "number").map((p) => ({ keys: [p.page], position: p.position as number, ctr: p.impressions > 0 ? p.clicks / p.impressions : 0 })),
    ...(gsc?.topPages ?? []),
  ]);
  const seoActions = seoArticles ? priorityActions(seoArticles, pageTotals, pagePositions) : [];
  const topArticleRows = seoArticles ? topArticles(seoArticles, pageTotals, pagePositions) : [];
  const organic = organicSessions(ga4?.channels);
  const gscPeriod = periodLabel(seoData?.period?.gscStart, seoData?.period?.gscEnd, "Période GSC");
  const ga4Period = periodLabel(seoData?.period?.ga4Start, seoData?.period?.ga4End, "Période GA4");


  return (
    <div className="space-y-6">
      {/* BLOC 1, Status banner */}
      <StatusBar
        data={seoData}
        loading={loading}
        refreshing={refreshing}
        onRefresh={handleRefresh}
      />

      {loading && !seoData && (
        <div className="p-8 text-muted-foreground text-center">Chargement des données SEO…</div>
      )}

      {error && !seoData && (
        <Card className="border-destructive">
          <CardContent className="py-6 text-sm text-destructive">{error}</CardContent>
        </Card>
      )}

      {/* Lot SEO-B : Google d'abord, ce qui fait venir des membres ensuite, les outils repliés en fin d'onglet. */}
      {gscAvailable && gsc && (
        <SeoGoogleKpis
          current={gsc.current}
          previous={gsc.previous}
          period={gscPeriod}
          queries={gsc.allQueries}
        />
      )}

      {gscAvailable && <SeoTemplatesCard totals={pageTotals} period={gscPeriod} />}

      <LandingOutcomesCard
        channel="recherche_naturelle"
        title="Ce que Google fait venir"
        intro="Visites arrivées depuis Google sur 30 jours et ce qu'elles deviennent, par page d'arrivée (même règle que l'onglet Leads ; visites suivies depuis le 13/11/2026, inscrits depuis le 12/11/2026)."
        testid="seo-landings-google"
      />

      {gscAvailable && gsc && <StrikingQueriesCard queries={gsc.allQueries} topPages={gsc.queryTopPages} />}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {gscAvailable && seoArticles && <PriorityActions actions={seoActions} />}
        <NoImpressionActionable
          publishedArticles={publishedArticles}
          pages={gscAvailable ? allGscPages : undefined}
        />
      </div>

      <section className="space-y-4" data-testid="seo-ai">
        <h2 className="text-lg font-semibold text-foreground border-b pb-2">Assistants IA</h2>
        <AiAcquisitionCard />
        <LandingOutcomesCard
          channel="ia"
          title="Pages d'arrivée des assistants IA"
          intro="Visites arrivées depuis ChatGPT, Perplexity, Gemini ou Claude sur 30 jours, par page d'arrivée, et les inscrits qu'elles donnent."
          testid="seo-landings-ia"
        />
      </section>

      <details className="rounded-2xl border bg-card px-4" data-testid="seo-tools">
        <summary className="min-h-11 flex items-center text-base font-semibold cursor-pointer">
          Outils et autres sources : GA4, Bing, IndexNow, inspection d'URL, requêtes et articles détaillés
        </summary>
        <div className="space-y-6 pb-4 pt-2">
          {extraTools}

          <MetricCard
            title="Sessions organiques"
            icon={<Users className="h-4 w-4 text-primary" />}
            value={organic !== null ? fmtInt(organic) : "·"}
            subtitle={`${ga4Period} · canal Organic Search · GA4, visiteurs qui acceptent la mesure`}
          />

          {ga4 && ga4.current.sessionsByDay.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Sessions GA4 par jour ({ga4Period})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-32 flex items-end gap-[2px]">
                  {ga4.current.sessionsByDay.map((d, i) => {
                    const max = Math.max(...ga4.current.sessionsByDay.map((x) => x.sessions), 1);
                    const height = (d.sessions / max) * 100;
                    return (
                      <div
                        key={i}
                        className="flex-1 bg-primary/60 hover:bg-primary rounded-t transition-colors relative group cursor-default"
                        style={{ height: `${Math.max(2, height)}%` }}
                      >
                        <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-foreground text-background text-[10px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                          {d.date.replace(/(\d{4})(\d{2})(\d{2})/, "$3/$2")}, {d.sessions}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {gscAvailable && <TopArticlesTable rows={topArticleRows} />}

          {gsc && gsc.topQueries && gsc.topQueries.length > 0 && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg">Top 10 requêtes Google</CardTitle>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => downloadCsv("gsc-queries.csv", gsc.topQueries)}>
                    Export CSV
                  </Button>
                  {gsc.topPages && (
                    <Button variant="outline" size="sm" onClick={() => downloadCsv("gsc-pages.csv", gsc.topPages)}>
                      Export pages
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <GSCQueriesTable rows={gsc.topQueries} />
              </CardContent>
            </Card>
          )}

          <div className="flex items-center justify-between gap-3 flex-wrap">
            <p className="text-xs text-muted-foreground">Période Bing</p>
            <ToggleGroup
              type="single"
              size="sm"
              value={String(bingPeriod)}
              onValueChange={(v) => v && setBingPeriod(Number(v) as BingPeriodDays)}
              className="border rounded-md"
            >
              <ToggleGroupItem value="7" className="text-xs px-3">7j</ToggleGroupItem>
              <ToggleGroupItem value="28" className="text-xs px-3">28j</ToggleGroupItem>
              <ToggleGroupItem value="90" className="text-xs px-3">90j</ToggleGroupItem>
            </ToggleGroup>
          </div>
          <BingKpiRow period={bingPeriod} />
          <BingVisibilityCard period={bingPeriod} />
          <BingBacklinksCard />

          <UrlInspectionCard />
          <IndexNowPanel />
          <IndexNowHistory />
        </div>
      </details>

      {/* Quick links */}
      <div className="flex flex-wrap gap-3 pb-6">
        <Button variant="outline" asChild>
          <a href="https://search.google.com/search-console" target="_blank" rel="noopener noreferrer">
            Search Console <ExternalLink className="h-4 w-4 ml-2" />
          </a>
        </Button>
        <Button variant="outline" asChild>
          <a href="https://analytics.google.com" target="_blank" rel="noopener noreferrer">
            Analytics <ExternalLink className="h-4 w-4 ml-2" />
          </a>
        </Button>
        <Button variant="outline" asChild>
          <a href="https://guardiens.fr/sitemap.xml" target="_blank" rel="noopener noreferrer">
            Sitemap <ExternalLink className="h-4 w-4 ml-2" />
          </a>
        </Button>
        <Button variant="outline" asChild>
          <a href="https://www.bing.com/webmasters" target="_blank" rel="noopener noreferrer">
            Bing Webmaster <ExternalLink className="h-4 w-4 ml-2" />
          </a>
        </Button>
        <Button variant="default" asChild>
          <Link to="/admin/prerender">
            Instantanés des pages
          </Link>
        </Button>
        <Button variant="outline" asChild>
          <Link to="/admin/build-info">
            Version en ligne
          </Link>
        </Button>
      </div>
    </div>
  );
};

export default AdminSEO;
