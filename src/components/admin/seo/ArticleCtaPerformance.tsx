import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw } from "lucide-react";

interface Row {
  article_slug: string;
  views: number;
  clicks_mid: number;
  clicks_end: number;
  signups_7d: number;
}

/**
 * Performance CTAs articles, agrège analytics_events sur 30j glissants.
 * - views = page_view source = `article:{slug}` (ou metadata.article_slug)
 * - clicks_mid / clicks_end = cta_click avec metadata.cta_position
 * - signups_7d = signup_completed dont metadata.from_article_slug = slug (J+7)
 */
export default function ArticleCtaPerformance() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const since = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();

    const { data: events } = await supabase
      .from("analytics_events")
      .select("event_type, source, metadata, created_at")
      .gte("created_at", since)
      .in("event_type", ["page_view", "cta_click", "signup_completed"])
      .limit(50000);

    const map = new Map<string, Row>();
    const ensure = (slug: string) => {
      if (!map.has(slug)) {
        map.set(slug, { article_slug: slug, views: 0, clicks_mid: 0, clicks_end: 0, signups_7d: 0 });
      }
      return map.get(slug)!;
    };

    for (const e of events || []) {
      const md = (e.metadata as any) || {};
      let slug: string | null = md.article_slug || null;
      if (!slug && typeof e.source === "string" && e.source.startsWith("article:")) {
        slug = e.source.slice("article:".length);
      }
      if (!slug && e.event_type === "page_view" && md.path) {
        const m = String(md.path).match(/^\/actualites\/([^/?#]+)/);
        if (m) slug = m[1];
      }
      if (!slug) continue;

      const r = ensure(slug);
      if (e.event_type === "page_view") r.views++;
      else if (e.event_type === "cta_click") {
        if (md.cta_position === "mid") r.clicks_mid++;
        else if (md.cta_position === "end") r.clicks_end++;
      } else if (e.event_type === "signup_completed") {
        r.signups_7d++;
      }
    }

    const sorted = Array.from(map.values())
      .filter((r) => r.views + r.clicks_mid + r.clicks_end > 0)
      .sort((a, b) => b.views - a.views)
      .slice(0, 100);

    setRows(sorted);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Performance CTAs articles (30j)</CardTitle>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground">Chargement…</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Aucun événement CTA enregistré sur les 30 derniers jours.
            (Le tracking nécessite que les CTAs portent <code>data-article-cta</code>.)
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground text-xs">
                  <th className="py-2 pr-3 font-medium">Article</th>
                  <th className="py-2 px-2 font-medium text-right">Vues</th>
                  <th className="py-2 px-2 font-medium text-right">Clics mid</th>
                  <th className="py-2 px-2 font-medium text-right">Clics end</th>
                  <th className="py-2 px-2 font-medium text-right">CTR</th>
                  <th className="py-2 pl-2 font-medium text-right">Signups 7j</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const totalClicks = r.clicks_mid + r.clicks_end;
                  const ctr = r.views > 0 ? ((totalClicks / r.views) * 100).toFixed(1) : ",";
                  return (
                    <tr key={r.article_slug} className="border-b last:border-0">
                      <td className="py-2 pr-3">
                        <a
                          href={`/actualites/${r.article_slug}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-primary hover:underline truncate max-w-[420px] inline-block"
                        >
                          {r.article_slug}
                        </a>
                      </td>
                      <td className="py-2 px-2 text-right tabular-nums">{r.views}</td>
                      <td className="py-2 px-2 text-right tabular-nums">{r.clicks_mid}</td>
                      <td className="py-2 px-2 text-right tabular-nums">{r.clicks_end}</td>
                      <td className="py-2 px-2 text-right tabular-nums">{ctr}{ctr !== "," ? " %" : ""}</td>
                      <td className="py-2 pl-2 text-right tabular-nums">{r.signups_7d}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
