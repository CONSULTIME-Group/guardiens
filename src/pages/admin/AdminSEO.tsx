import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Globe, Users, MousePointerClick, Eye, ArrowUpDown, Timer,
  BarChart3, RefreshCw, ExternalLink, AlertCircle, Clock,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import MetricCard from "@/components/admin/seo/MetricCard";
import GSCTable from "@/components/admin/seo/GSCTable";
import ArticlesIssues from "@/components/admin/seo/ArticlesIssues";
import ContentToCreate from "@/components/admin/seo/ContentToCreate";
import { useSeoData } from "@/hooks/useSeoData";

function pctChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}m ${s}s`;
}

const AdminSEO = () => {
  const { data: seoData, loading, error, refresh } = useSeoData();
  const [refreshing, setRefreshing] = useState(false);
  const [recentSignups, setRecentSignups] = useState(0);

  useEffect(() => {
    const loadSignups = async () => {
      const { count } = await supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .gte("created_at", new Date(Date.now() - 30 * 86400000).toISOString());
      setRecentSignups(count || 0);
    };
    loadSignups();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  const updatedAt = seoData?.updated_at
    ? formatDistanceToNow(new Date(seoData.updated_at), { addSuffix: true, locale: fr })
    : null;

  // No secret configured
  if (!loading && error === "GOOGLE_SERVICE_ACCOUNT_JSON not configured") {
    return (
      <div className="space-y-8">
        <h1 className="text-2xl font-bold text-foreground">Dashboard SEO</h1>
        <Card className="border-[#F59E0B]">
          <CardContent className="py-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-6 w-6 text-[#F59E0B] shrink-0 mt-0.5" />
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

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard SEO</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Données Google Search Console & Analytics
            {updatedAt && (
              <span className="ml-2 text-xs">
                · Dernière mise à jour {updatedAt}
                {seoData?.cached && <span className="text-[#F59E0B]"> (cache)</span>}
                {seoData?.stale && <span className="text-[#EF4444]"> (données périmées)</span>}
              </span>
            )}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={refreshing || loading}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
          Actualiser
        </Button>
      </div>

      {loading && !seoData && (
        <div className="p-8 text-muted-foreground">Chargement des données SEO…</div>
      )}

      {error && !seoData && (
        <Card className="border-[#EF4444]">
          <CardContent className="py-6 text-sm text-[#EF4444]">
            {error}
          </CardContent>
        </Card>
      )}

      {/* BLOC 1 — GA4 Traffic */}
      {seoData?.ga4 && (
        <>
          <h2 className="text-lg font-semibold text-foreground">Trafic global (GA4 — 30 jours)</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              title="Sessions"
              icon={<Globe className="h-4 w-4 text-primary" />}
              value={seoData.ga4.current.sessions.toLocaleString()}
              subtitle="30 derniers jours"
              change={seoData.ga4.previous ? pctChange(seoData.ga4.current.sessions, seoData.ga4.previous.sessions) : undefined}
            />
            <MetricCard
              title="Utilisateurs actifs"
              icon={<Users className="h-4 w-4 text-primary" />}
              value={seoData.ga4.current.activeUsers.toLocaleString()}
              subtitle="30 derniers jours"
              change={seoData.ga4.previous ? pctChange(seoData.ga4.current.activeUsers, seoData.ga4.previous.activeUsers) : undefined}
            />
            <MetricCard
              title="Pages vues"
              icon={<Eye className="h-4 w-4 text-primary" />}
              value={seoData.ga4.current.screenPageViews.toLocaleString()}
              subtitle="30 derniers jours"
              change={seoData.ga4.previous ? pctChange(seoData.ga4.current.screenPageViews, seoData.ga4.previous.screenPageViews) : undefined}
            />
            <MetricCard
              title="Durée moyenne"
              icon={<Timer className="h-4 w-4 text-primary" />}
              value={formatDuration(seoData.ga4.current.averageSessionDuration)}
              subtitle="Par session"
              change={seoData.ga4.previous ? pctChange(seoData.ga4.current.averageSessionDuration, seoData.ga4.previous.averageSessionDuration) : undefined}
            />
          </div>

          {/* Sessions chart */}
          {seoData.ga4.current.sessionsByDay.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Sessions par jour</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-40 flex items-end gap-[2px]">
                  {seoData.ga4.current.sessionsByDay.map((d, i) => {
                    const max = Math.max(...seoData.ga4!.current.sessionsByDay.map((x) => x.sessions), 1);
                    const height = (d.sessions / max) * 100;
                    return (
                      <div
                        key={i}
                        className="flex-1 bg-primary/70 hover:bg-primary rounded-t transition-colors relative group"
                        style={{ height: `${Math.max(2, height)}%` }}
                      >
                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-foreground text-background text-[10px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                          {d.sessions}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {!seoData?.ga4 && seoData && (
        <Card className="border-[#F59E0B]">
          <CardContent className="py-4 text-sm text-[#F59E0B] flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            GA4 non disponible — vérifiez que le compte de service a accès à la propriété Analytics
          </CardContent>
        </Card>
      )}

      {/* BLOC 2 — GSC Performance */}
      {seoData?.gsc && (
        <>
          <h2 className="text-lg font-semibold text-foreground">Performance Search Console (28 jours)</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              title="Clics"
              icon={<MousePointerClick className="h-4 w-4 text-primary" />}
              value={seoData.gsc.current.clicks.toLocaleString()}
              subtitle="28 derniers jours"
              change={pctChange(seoData.gsc.current.clicks, seoData.gsc.previous.clicks)}
            />
            <MetricCard
              title="Impressions"
              icon={<Eye className="h-4 w-4 text-primary" />}
              value={seoData.gsc.current.impressions.toLocaleString()}
              subtitle="28 derniers jours"
              change={pctChange(seoData.gsc.current.impressions, seoData.gsc.previous.impressions)}
            />
            <MetricCard
              title="CTR moyen"
              icon={<BarChart3 className="h-4 w-4 text-primary" />}
              value={`${(seoData.gsc.current.ctr * 100).toFixed(1)}%`}
              subtitle="Taux de clics"
              change={pctChange(seoData.gsc.current.ctr, seoData.gsc.previous.ctr)}
            />
            <MetricCard
              title="Position moyenne"
              icon={<ArrowUpDown className="h-4 w-4 text-primary" />}
              value={seoData.gsc.current.position.toFixed(1)}
              subtitle="Plus bas = mieux"
              change={pctChange(seoData.gsc.current.position, seoData.gsc.previous.position)}
              invertChange
            />
          </div>
        </>
      )}

      {/* BLOC 3 — Top Pages */}
      {seoData?.gsc?.topPages && seoData.gsc.topPages.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Top 10 pages</CardTitle>
          </CardHeader>
          <CardContent>
            <GSCTable title="Top pages" rows={seoData.gsc.topPages} type="page" />
          </CardContent>
        </Card>
      )}

      {/* BLOC 4 — Top Queries */}
      {seoData?.gsc?.topQueries && seoData.gsc.topQueries.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Top 10 requêtes</CardTitle>
          </CardHeader>
          <CardContent>
            <GSCTable title="Top requêtes" rows={seoData.gsc.topQueries} type="query" />
          </CardContent>
        </Card>
      )}

      {/* BLOC 5 — Articles en difficulté */}
      {seoData?.gsc?.topPages && (
        <ArticlesIssues topPages={seoData.gsc.topPages} />
      )}

      {/* BLOC 6 — Contenu à créer */}
      <ContentToCreate />

      {/* BLOC 7 — Inscrits via SEO */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Inscrits récents</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-6">
            <div>
              <p className="text-3xl font-bold text-foreground">{recentSignups}</p>
              <p className="text-xs text-muted-foreground mt-1">Nouveaux profils (30 jours)</p>
            </div>
            {seoData?.ga4 && seoData.ga4.current.sessions > 0 && (
              <div>
                <p className="text-3xl font-bold text-foreground">
                  {((recentSignups / seoData.ga4.current.sessions) * 100).toFixed(1)}%
                </p>
                <p className="text-xs text-muted-foreground mt-1">Taux de conversion</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Liens rapides */}
      <div className="flex flex-wrap gap-3">
        <Button variant="outline" asChild>
          <a href="https://search.google.com/search-console" target="_blank" rel="noopener noreferrer">
            Google Search Console <ExternalLink className="h-4 w-4 ml-2" />
          </a>
        </Button>
        <Button variant="outline" asChild>
          <a href="https://analytics.google.com" target="_blank" rel="noopener noreferrer">
            Google Analytics <ExternalLink className="h-4 w-4 ml-2" />
          </a>
        </Button>
        <Button variant="outline" asChild>
          <a href="https://guardiens.fr/sitemap.xml" target="_blank" rel="noopener noreferrer">
            Sitemap <ExternalLink className="h-4 w-4 ml-2" />
          </a>
        </Button>
      </div>
    </div>
  );
};

export default AdminSEO;
