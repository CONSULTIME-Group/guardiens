import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { GSCRow } from "@/hooks/useSeoData";

interface Props {
  publishedArticles: { slug: string; published_at: string | null }[];
  topPages: GSCRow[] | undefined;
}

/**
 * Liste les articles publiés depuis >7j sans impression GSC, avec
 * bouton "Pousser via IndexNow" 1-clic (par ligne et en bulk).
 */
export default function NoImpressionActionable({ publishedArticles, topPages }: Props) {
  const [busy, setBusy] = useState<string | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);

  const orphans = useMemo(() => {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const pagesWithImpressions = new Set(
      (topPages ?? []).filter((p) => p.impressions > 0).map((p) => {
        const url = p.keys?.[0] || "";
        try { return new URL(url).pathname.replace(/^\/(articles|actualites)\//, "").replace(/\/$/, ""); } catch { return url; }
      }),
    );
    return publishedArticles
      .filter((a) => a.published_at && new Date(a.published_at) < sevenDaysAgo && !pagesWithImpressions.has(a.slug))
      .sort((a, b) => (b.published_at ?? "").localeCompare(a.published_at ?? ""))
      .slice(0, 50);
  }, [publishedArticles, topPages]);

  const pushOne = async (slug: string) => {
    setBusy(slug);
    try {
      const { data, error } = await supabase.functions.invoke("notify-indexnow", {
        body: { slugs: [slug], source: "no-impression-single" },
      });
      if (error) throw error;
      const ok = (data as { ok?: boolean })?.ok;
      ok ? toast.success(`Pousé : ${slug}`) : toast.error("Échec IndexNow");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur IndexNow");
    } finally {
      setBusy(null);
    }
  };

  const pushAll = async () => {
    if (orphans.length === 0) return;
    setBulkBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("notify-indexnow", {
        body: { slugs: orphans.map((o) => o.slug), source: "no-impression-bulk" },
      });
      if (error) throw error;
      const submitted = (data as { submitted?: number })?.submitted ?? 0;
      toast.success(`${submitted} URLs poussées vers Bing/Yandex.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur IndexNow");
    } finally {
      setBulkBusy(false);
    }
  };

  if (orphans.length === 0) return null;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="text-lg">Articles sans impression GSC après 7j</CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            {orphans.length} article{orphans.length > 1 ? "s" : ""} publié{orphans.length > 1 ? "s" : ""} depuis &gt;7 jours, jamais affiché{orphans.length > 1 ? "s" : ""} dans Google.
          </p>
        </div>
        <Button onClick={pushAll} disabled={bulkBusy} size="sm">
          <Send className="h-3.5 w-3.5 mr-1.5" />
          {bulkBusy ? "Envoi…" : "Tout pousser via IndexNow"}
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-1 text-sm max-h-80 overflow-y-auto">
          {orphans.map((a) => (
            <div key={a.slug} className="flex items-center justify-between gap-2 border-b border-border/40 py-1.5">
              <a
                href={`https://guardiens.fr/actualites/${a.slug}`}
                target="_blank"
                rel="noreferrer"
                className="font-mono text-xs truncate hover:underline flex-1 min-w-0"
              >
                /actualites/{a.slug}
              </a>
              <span className="text-xs text-muted-foreground shrink-0">
                {a.published_at ? new Date(a.published_at).toLocaleDateString("fr-FR") : "–"}
              </span>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => pushOne(a.slug)}
                disabled={busy === a.slug || bulkBusy}
                className="h-7"
              >
                {busy === a.slug ? "…" : "Pousser"}
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
