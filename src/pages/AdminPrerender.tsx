import { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";

/**
 * /admin/prerender, Force le re-snapshot Prerender de pages SEO précises
 * sans attendre le cycle automatique post-publish.
 *
 * Sources :
 *  - articles      → /actualites/:slug
 *  - seo_city_pages → /house-sitting/:slug
 *  - city_guides    → /guides/:slug
 *
 * Plus un champ libre pour saisir des URLs/chemins arbitraires.
 */

type Row = { id: string; slug: string; table: string; url: string; label: string };

const SITE = "https://guardiens.fr";

export default function AdminPrerender() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [extra, setExtra] = useState("");
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<
    Array<{ url: string; ok: boolean; status?: number; error?: string }>
  >([]);

  useEffect(() => {
    (async () => {
      const [a, c, g] = await Promise.all([
        supabase.from("articles").select("id, slug, title").eq("published", true).order("published_at", { ascending: false }).limit(500),
        supabase.from("seo_city_pages").select("id, slug, city").limit(500),
        supabase.from("city_guides").select("id, slug, city").limit(500),
      ]);
      const out: Row[] = [];
      for (const r of (a.data ?? []) as Array<{ id: string; slug: string; title: string | null }>) {
        if (r.slug) out.push({ id: `a:${r.id}`, slug: r.slug, table: "articles", url: `${SITE}/actualites/${r.slug}`, label: r.title ?? r.slug });
      }
      for (const r of (c.data ?? []) as Array<{ id: string; slug: string; city: string | null }>) {
        if (r.slug) out.push({ id: `c:${r.id}`, slug: r.slug, table: "seo_city_pages", url: `${SITE}/house-sitting/${r.slug}`, label: r.city ?? r.slug });
      }
      for (const r of (g.data ?? []) as Array<{ id: string; slug: string; city: string | null }>) {
        if (r.slug) out.push({ id: `g:${r.id}`, slug: r.slug, table: "city_guides", url: `${SITE}/guides/${r.slug}`, label: r.city ?? r.slug });
      }
      setRows(out);
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => r.slug.toLowerCase().includes(q) || r.label.toLowerCase().includes(q) || r.table.includes(q));
  }, [rows, filter]);

  const toggle = (id: string) => {
    setSelected((s) => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const selectAllFiltered = () => setSelected(new Set(filtered.map((r) => r.id)));
  const clearSelection = () => setSelected(new Set());

  const launch = async () => {
    const fromList = rows.filter((r) => selected.has(r.id)).map((r) => r.url);
    const fromExtra = extra
      .split(/[\s,;\n]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    const urls = Array.from(new Set([...fromList, ...fromExtra]));
    if (urls.length === 0) {
      toast.error("Sélectionnez au moins une page ou saisissez une URL.");
      return;
    }
    setRunning(true);
    setResults([]);
    try {
      const { data, error } = await supabase.functions.invoke("prerender-recache-pending", {
        body: { urls },
      });
      if (error) throw error;
      const res = (data?.results ?? []) as typeof results;
      setResults(res);
      const ok = res.filter((r) => r.ok).length;
      toast.success(`Re-snapshot demandé : ${ok}/${res.length} succès.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Échec de l'appel");
    } finally {
      setRunning(false);
    }
  };

  return (
    <main className="container mx-auto max-w-5xl px-4 py-10">
      <Helmet>
        <title>Re-snapshot Prerender, Admin</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <h1 className="text-2xl font-semibold mb-2">Re-snapshot Prerender</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Force la mise à jour du cache Prerender pour les pages sélectionnées,
        sans attendre la prochaine publication. Utilisez après une correction
        SEO urgente (canonical, noindex, meta).
      </p>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">Pages SEO en base</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Input
              placeholder="Filtrer par slug, ville, titre, table…"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="max-w-sm"
            />
            <Button variant="outline" size="sm" onClick={selectAllFiltered} disabled={loading}>
              Tout sélectionner ({filtered.length})
            </Button>
            <Button variant="outline" size="sm" onClick={clearSelection} disabled={selected.size === 0}>
              Vider
            </Button>
            <span className="text-xs text-muted-foreground ml-auto">
              {selected.size} sélectionné(s) · {rows.length} pages au total
            </span>
          </div>

          <div className="max-h-[420px] overflow-y-auto rounded-md border divide-y">
            {loading ? (
              <div className="p-4 text-sm text-muted-foreground">Chargement…</div>
            ) : filtered.length === 0 ? (
              <div className="p-4 text-sm text-muted-foreground">Aucune page.</div>
            ) : (
              filtered.map((r) => (
                <label key={r.id} className="flex items-start gap-3 px-3 py-2 hover:bg-accent/40 cursor-pointer">
                  <Checkbox
                    checked={selected.has(r.id)}
                    onCheckedChange={() => toggle(r.id)}
                    className="mt-0.5"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate">{r.label}</div>
                    <div className="text-xs text-muted-foreground font-mono truncate">
                      [{r.table}] {r.url}
                    </div>
                  </div>
                </label>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">URLs/chemins supplémentaires</CardTitle>
        </CardHeader>
        <CardContent>
          <textarea
            value={extra}
            onChange={(e) => setExtra(e.target.value)}
            placeholder={`Une URL par ligne (ou séparées par des virgules). Ex.\n/actualites/house-sitting-lyon\nhttps://guardiens.fr/pricing`}
            className="w-full min-h-[100px] rounded-md border bg-background p-3 text-sm font-mono"
          />
          <p className="text-xs text-muted-foreground mt-2">
            Les chemins relatifs sont préfixés par <span className="font-mono">{SITE}</span>.
          </p>
        </CardContent>
      </Card>

      <div className="flex justify-end mb-6">
        <Button onClick={launch} disabled={running}>
          {running ? "Re-snapshot en cours…" : "Lancer le re-snapshot"}
        </Button>
      </div>

      {results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Résultats</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border divide-y">
              {results.map((r, i) => (
                <div key={i} className="flex items-center gap-3 px-3 py-2 text-sm">
                  <span
                    className={
                      "inline-block w-2 h-2 rounded-full " +
                      (r.ok ? "bg-emerald-500" : "bg-destructive")
                    }
                  />
                  <span className="font-mono text-xs flex-1 truncate">{r.url}</span>
                  <span className="text-xs text-muted-foreground">
                    {r.ok ? `OK ${r.status ?? ""}` : r.error ?? `KO ${r.status ?? ""}`}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </main>
  );
}
