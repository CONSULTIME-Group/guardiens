import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Globe, Users, MousePointerClick, Eye, ArrowUpDown, Timer,
  BarChart3, ExternalLink, AlertCircle, FileText, Search,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import MetricCard from "@/components/admin/seo/MetricCard";
import StatusBar from "@/components/admin/seo/StatusBar";
import TopArticlesTable from "@/components/admin/seo/TopArticlesTable";
import PriorityActions from "@/components/admin/seo/PriorityActions";
import ContentToCreate from "@/components/admin/seo/ContentToCreate";
import GSCQueriesTable from "@/components/admin/seo/GSCQueriesTable";
import { useSeoData } from "@/hooks/useSeoData";

function pctChange(current: number, previous: number): number | undefined {
  if (previous === 0 && current === 0) return 0;
  if (previous === 0) return undefined; // will show "Nouveau"
  return ((current - previous) / previous) * 100;
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}m ${s < 10 ? "0" : ""}${s}s`;
}

const AdminSEO = () => {
  const { data: seoData, loading, error, refresh } = useSeoData();
  const [refreshing, setRefreshing] = useState(false);
  const [articleStats, setArticleStats] = useState<{ published: number; total: number } | null>(null);

  useEffect(() => {
    const fetchArticleStats = async () => {
      const { count: published } = await supabase
        .from("articles")
        .select("id", { count: "exact", head: true })
        .eq("published", true);
      const { count: total } = await supabase
        .from("articles")
        .select("id", { count: "exact", head: true });
      setArticleStats({ published: published ?? 0, total: total ?? 0 });
    };
    fetchArticleStats();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  // No secret configured
  if (!loading && error === "GOOGLE_SERVICE_ACCOUNT_JSON not configured") {
    return (
      <div className="space-y-8">
        <h1 className="text-2xl font-bold text-foreground">Dashboard SEO</h1>
        <Card className="border-orange-300">
          <CardContent className="py-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-6 w-6 text-orange-500 shrink-0 mt-0.5" />
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

  const isPrevZero = (current: number, prev: number | undefined) =>
    prev !== undefined && prev === 0 && current > 0;

  return (
    <div className="space-y-6">
      {/* BLOC 1 — Barre de statut */}
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
        <Card className="border-red-300">
          <CardContent className="py-6 text-sm text-red-500">{error}</CardContent>
        </Card>
      )}

      {/* BLOC 2 — KPIs SEO essentiels */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground">Vue d'ensemble SEO</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title="Clics GSC"
            icon={<MousePointerClick className="h-4 w-4 text-primary" />}
            value={gsc ? gsc.current.clicks.toLocaleString() : "—"}
            subtitle="28 derniers jours"
            change={gsc ? pctChange(gsc.current.clicks, gsc.previous.clicks) : undefined}
            isNew={gsc ? isPrevZero(gsc.current.clicks, gsc.previous.clicks) : false}
          />
          <MetricCard
            title="Impressions GSC"
            icon={<Eye className="h-4 w-4 text-primary" />}
            value={gsc ? gsc.current.impressions.toLocaleString() : "—"}
            subtitle="28 derniers jours"
            change={gsc ? pctChange(gsc.current.impressions, gsc.previous.impressions) : undefined}
            isNew={gsc ? isPrevZero(gsc.current.impressions, gsc.previous.impressions) : false}
          />
          <MetricCard
            title="Position moyenne"
            icon={<ArrowUpDown className="h-4 w-4 text-primary" />}
            value={gsc ? gsc.current.position.toFixed(1) : "—"}
            subtitle="Plus bas = mieux"
            change={gsc ? pctChange(gsc.current.position, gsc.previous.position) : undefined}
            invertChange
          />
          <MetricCard
            title="Articles publiés"
            icon={<FileText className="h-4 w-4 text-primary" />}
            value={articleStats ? `${articleStats.published}` : "—"}
            subtitle={articleStats ? `${articleStats.total} au total` : ""}
          />
        </div>
      </section>

      {/* Graphique sessions GA4 (conservé pour contexte) */}
      {ga4 && ga4.current.sessionsByDay.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Sessions GA4 par jour (30j)</CardTitle>
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
                      {d.date.replace(/(\d{4})(\d{2})(\d{2})/, "$3/$2")} — {d.sessions}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* BLOC 3 — Top 10 Articles */}
      <section>
        <TopArticlesTable topPages={gsc?.topPages || []} />
      </section>

      {/* BLOC 4 — Top requêtes GSC */}
      {gsc && gsc.topQueries && gsc.topQueries.length > 0 && (
        <section>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Top 10 requêtes GSC</CardTitle>
            </CardHeader>
            <CardContent>
              <GSCQueriesTable rows={gsc.topQueries} />
            </CardContent>
          </Card>
        </section>
      )}

      {/* BLOC 5 — Actions prioritaires */}
      {gsc?.topPages && (
        <section>
          <PriorityActions topPages={gsc.topPages} />
        </section>
      )}

      {/* BLOC 6 — Contenu à créer */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground">Contenu à créer</h2>
        <ContentToCreate />
      </section>

      {/* Liens rapides */}
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
      </div>
    </div>
  );
};

export default AdminSEO;
