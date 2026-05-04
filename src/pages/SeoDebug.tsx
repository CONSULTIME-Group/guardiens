import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import PageMeta from "@/components/PageMeta";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  readSeoDebugLog,
  clearSeoDebugLog,
  type SeoDebugEntry,
} from "@/lib/seoDebugLog";

/**
 * Internal QA tool: shows the last N SEO snapshots captured by PageMeta
 * (and the article-aware logger in ArticleDetail). Useful before running
 * a Google Search Console "Test live URL" to confirm the page emits the
 * canonical / robots tags we expect.
 */
const SeoDebug = () => {
  const [entries, setEntries] = useState<SeoDebugEntry[]>([]);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    setEntries(readSeoDebugLog());
    const id = window.setInterval(() => setTick((t) => t + 1), 1500);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    setEntries(readSeoDebugLog());
  }, [tick]);

  const withWarnings = entries.filter((e) => e.warnings.length > 0);

  return (
    <div className="min-h-screen bg-background py-10">
      <PageMeta
        title="SEO Debug"
        description="Diagnostic interne des balises SEO émises par Helmet."
        path="/admin/seo-debug"
        noindex
      />
      <div className="container mx-auto max-w-5xl px-4">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">SEO Debug</h1>
            <p className="text-sm text-muted-foreground">
              {entries.length} snapshot{entries.length > 1 ? "s" : ""} en mémoire
              {withWarnings.length > 0 && (
                <span className="ml-2 text-destructive">
                  · {withWarnings.length} avec avertissement{withWarnings.length > 1 ? "s" : ""}
                </span>
              )}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                clearSeoDebugLog();
                setEntries([]);
              }}
            >
              Vider
            </Button>
            <Button asChild variant="ghost" size="sm">
              <Link to="/">Accueil</Link>
            </Button>
          </div>
        </div>

        <Tabs defaultValue="all">
          <TabsList>
            <TabsTrigger value="all">Tous ({entries.length})</TabsTrigger>
            <TabsTrigger value="warnings">
              Avertissements ({withWarnings.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-3 pt-4">
            {entries.length === 0 ? (
              <EmptyState />
            ) : (
              entries.map((e, i) => <EntryCard key={`${e.ts}-${i}`} entry={e} />)
            )}
          </TabsContent>

          <TabsContent value="warnings" className="space-y-3 pt-4">
            {withWarnings.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Aucun écart détecté entre les données BDD/props et le HTML rendu.
              </p>
            ) : (
              withWarnings.map((e, i) => (
                <EntryCard key={`${e.ts}-${i}`} entry={e} />
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

const EmptyState = () => (
  <Card>
    <CardContent className="py-10 text-center text-sm text-muted-foreground">
      Aucun snapshot. Naviguez sur une page publique (par exemple{" "}
      <Link className="underline" to="/actualites">
        /actualites
      </Link>
      ) puis revenez ici.
    </CardContent>
  </Card>
);

const Field = ({ label, value }: { label: string; value: unknown }) => (
  <div className="grid grid-cols-[140px_1fr] gap-2 text-xs">
    <span className="font-medium text-muted-foreground">{label}</span>
    <span className="break-all font-mono">
      {value === null || value === undefined || value === ""
        ? <span className="text-muted-foreground">∅</span>
        : String(value)}
    </span>
  </div>
);

const EntryCard = ({ entry }: { entry: SeoDebugEntry }) => {
  const hasWarnings = entry.warnings.length > 0;
  return (
    <Card className={hasWarnings ? "border-destructive" : undefined}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="font-mono text-sm">{entry.path}</CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-[10px]">
              {entry.source}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {new Date(entry.ts).toLocaleTimeString()}
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        {hasWarnings && (
          <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3">
            <p className="mb-1 text-xs font-semibold text-destructive">
              Avertissements
            </p>
            <ul className="ml-4 list-disc space-y-1 text-xs text-destructive">
              {entry.warnings.map((w, i) => (
                <li key={i}>{w}</li>
              ))}
            </ul>
          </div>
        )}

        <div>
          <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
            Inputs (props)
          </p>
          <div className="space-y-1">
            <Field label="title" value={entry.input.title} />
            <Field label="description" value={entry.input.description} />
            <Field label="canonical" value={entry.input.canonical} />
            <Field label="noindex" value={entry.input.noindex} />
            <Field label="type" value={entry.input.type} />
          </div>
        </div>

        {entry.article && (
          <div>
            <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
              Article (BDD)
            </p>
            <div className="space-y-1">
              <Field label="id" value={entry.article.id} />
              <Field label="slug" value={entry.article.slug} />
              <Field label="canonical_url" value={entry.article.canonical_url} />
              <Field label="noindex" value={entry.article.noindex} />
              <Field label="meta_title" value={entry.article.meta_title} />
              <Field label="meta_description" value={entry.article.meta_description} />
            </div>
          </div>
        )}

        <div>
          <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
            Rendered (&lt;head&gt;)
          </p>
          <div className="space-y-1">
            <Field label="title" value={entry.rendered.title} />
            <Field label="robots" value={entry.rendered.robots} />
            <Field label="canonical" value={entry.rendered.canonical} />
            <Field label="description" value={entry.rendered.description} />
            <Field label="og:title" value={entry.rendered.ogTitle} />
            <Field label="og:url" value={entry.rendered.ogUrl} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default SeoDebug;
