import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { STRATEGIC_PILLARS, isStrategicPillar } from "@/config/articles-post-pivot";
import { trackEvent } from "@/lib/analytics";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

type Article = {
  id: string;
  slug: string;
  title: string;
  noindex: boolean;
  published_at: string | null;
  admin_notes: string | null;
};

type RefreshLog = {
  id: string;
  article_id: string;
  triggered_at: string;
  dry_run: boolean;
  applied: boolean;
  noindex_after: boolean | null;
  changes_count: number | null;
  warnings: unknown;
};

type RefreshResponse = {
  article_id: string;
  slug: string;
  changes_applied: boolean;
  diff: {
    before_excerpt: string;
    after_excerpt: string;
    removed_patterns: string[];
    changes_count: number;
  };
  warnings: string[];
  noindex_after: boolean;
  preview_content?: string;
};

export default function AdminArticlesRefreshPostPivot() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [logs, setLogs] = useState<RefreshLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [previewResult, setPreviewResult] = useState<RefreshResponse | null>(null);
  const [batchOpen, setBatchOpen] = useState(false);
  const [batchAck, setBatchAck] = useState(false);
  const [batchProgress, setBatchProgress] = useState<{ done: number; total: number } | null>(null);
  const [validateOpen, setValidateOpen] = useState<Article | null>(null);
  const [validateAck, setValidateAck] = useState(false);

  const loadAll = async () => {
    setLoading(true);
    const { data: arts } = await supabase
      .from("articles")
      .select("id, slug, title, noindex, published_at, admin_notes")
      .ilike("admin_notes", "%pivot pricing%")
      .order("slug");
    setArticles((arts ?? []) as Article[]);

    const { data: refreshLogs } = await supabase
      .from("article_refresh_logs")
      .select("id, article_id, triggered_at, dry_run, applied, noindex_after, changes_count, warnings")
      .order("triggered_at", { ascending: false })
      .limit(20);
    setLogs((refreshLogs ?? []) as RefreshLog[]);
    setLoading(false);
  };

  useEffect(() => {
    void loadAll();
  }, []);

  const stats = useMemo(() => {
    const total = articles.length;
    const stillNoindex = articles.filter((a) => a.noindex).length;
    const refreshedIA = logs.filter((l) => l.applied).length;
    const pillarsValidated = articles.filter((a) => isStrategicPillar(a.slug) && !a.noindex).length;
    return { total, stillNoindex, refreshedIA, pillarsValidated };
  }, [articles, logs]);

  const nonPillars = useMemo(
    () => articles.filter((a) => !isStrategicPillar(a.slug) && a.noindex),
    [articles],
  );

  const callRefresh = async (articleId: string, dryRun: boolean): Promise<RefreshResponse | null> => {
    const { data, error } = await supabase.functions.invoke("refresh-articles-post-pivot", {
      body: { article_id: articleId, dry_run: dryRun },
    });
    if (error) {
      toast.error(`Erreur refresh : ${error.message}`);
      return null;
    }
    return data as RefreshResponse;
  };

  const handlePreview = async (article: Article) => {
    setBusyId(article.id);
    const res = await callRefresh(article.id, true);
    setBusyId(null);
    if (!res) return;
    void trackEvent("admin_article_refresh_previewed", {
      metadata: { article_id: article.id, slug: article.slug },
    });
    setPreviewResult(res);
  };

  const handleApply = async (article: Article) => {
    setBusyId(article.id);
    const res = await callRefresh(article.id, false);
    setBusyId(null);
    if (!res) return;
    if (!res.changes_applied) {
      toast.error(`Refresh non appliqué : ${res.warnings.join(" · ")}`);
      return;
    }
    void trackEvent("admin_article_refresh_applied", {
      metadata: {
        article_id: article.id,
        slug: article.slug,
        changes_count: res.diff.changes_count,
      },
    });
    toast.success(
      isStrategicPillar(article.slug)
        ? "Refresh appliqué. Pilier stratégique, validation manuelle requise."
        : "Refresh appliqué et article sorti du noindex.",
    );
    await loadAll();
  };

  const handleValidatePillar = async () => {
    if (!validateOpen) return;
    const article = validateOpen;
    const { error } = await supabase
      .from("articles")
      .update({
        noindex: false,
        admin_notes: `${article.admin_notes ?? ""}\n[${new Date().toISOString()}] Pilier validé manuellement`,
        updated_at: new Date().toISOString(),
      })
      .eq("id", article.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    void trackEvent("admin_article_pillar_validated_manually", {
      metadata: { article_id: article.id, slug: article.slug },
    });
    toast.success("Pilier sorti du noindex.");
    setValidateOpen(null);
    setValidateAck(false);
    await loadAll();
  };

  const handleBatch = async () => {
    setBatchOpen(false);
    void trackEvent("admin_article_batch_refresh_started", {
      metadata: { count: nonPillars.length },
    });
    setBatchProgress({ done: 0, total: nonPillars.length });
    let success = 0;
    let errors = 0;
    for (let i = 0; i < nonPillars.length; i++) {
      const art = nonPillars[i];
      const res = await callRefresh(art.id, false);
      if (res?.changes_applied) success++;
      else errors++;
      setBatchProgress({ done: i + 1, total: nonPillars.length });
    }
    void trackEvent("admin_article_batch_refresh_completed", {
      metadata: { success_count: success, error_count: errors },
    });
    toast.success(`Batch terminé : ${success} réussis, ${errors} en échec.`);
    setBatchProgress(null);
    setBatchAck(false);
    await loadAll();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl">
      <header>
        <h1 className="text-2xl font-bold text-foreground">
          Refresh IA des 15 articles post-pivot pricing
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Passage des articles à noindex = false après réédition IA validée. Les piliers stratégiques
          restent à valider manuellement après relecture intégrale.
        </p>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
        <div className="rounded-lg border border-border p-3">
          <div className="text-muted-foreground text-xs">En attente (noindex)</div>
          <div className="text-2xl font-semibold text-foreground">{stats.stillNoindex}</div>
        </div>
        <div className="rounded-lg border border-border p-3">
          <div className="text-muted-foreground text-xs">Refresh IA appliqués</div>
          <div className="text-2xl font-semibold text-foreground">{stats.refreshedIA}</div>
        </div>
        <div className="rounded-lg border border-border p-3">
          <div className="text-muted-foreground text-xs">Piliers validés</div>
          <div className="text-2xl font-semibold text-foreground">{stats.pillarsValidated}</div>
        </div>
        <div className="rounded-lg border border-border p-3">
          <div className="text-muted-foreground text-xs">Total suivi</div>
          <div className="text-2xl font-semibold text-foreground">{stats.total}</div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button
          onClick={() => {
            setBatchAck(false);
            setBatchOpen(true);
          }}
          disabled={!!batchProgress || nonPillars.length === 0}
        >
          Refresh IA des {nonPillars.length} articles standards
        </Button>
        {batchProgress && (
          <span className="text-sm text-muted-foreground">
            Batch en cours : {batchProgress.done} / {batchProgress.total}
          </span>
        )}
      </div>

      <div className="rounded-lg border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Slug</TableHead>
              <TableHead>Titre</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {articles.map((art) => {
              const pillar = isStrategicPillar(art.slug);
              const isBusy = busyId === art.id;
              return (
                <TableRow key={art.id}>
                  <TableCell className="font-mono text-xs">{art.slug}</TableCell>
                  <TableCell className="max-w-xs truncate" title={art.title}>
                    {art.title}
                  </TableCell>
                  <TableCell>
                    {pillar ? (
                      <Badge variant="secondary">Pilier stratégique</Badge>
                    ) : (
                      <Badge variant="outline">Standard</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {art.noindex ? (
                      <Badge variant="destructive">noindex</Badge>
                    ) : (
                      <Badge>Indexé</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="inline-flex flex-wrap gap-2 justify-end">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handlePreview(art)}
                        disabled={isBusy}
                      >
                        {isBusy ? <Loader2 className="h-3 w-3 animate-spin" /> : "Aperçu IA"}
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleApply(art)}
                        disabled={isBusy}
                      >
                        Appliquer
                      </Button>
                      {pillar && (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => {
                            setValidateOpen(art);
                            setValidateAck(false);
                          }}
                          disabled={!art.noindex}
                        >
                          Valider et indexer
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" asChild>
                        <Link to={`/admin/articles/${art.id}`}>Éditer</Link>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-foreground">Historique des 20 derniers refresh</h2>
        <div className="rounded-lg border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Article</TableHead>
                <TableHead>Mode</TableHead>
                <TableHead>Appliqué</TableHead>
                <TableHead>Noindex après</TableHead>
                <TableHead>Corrections</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log) => {
                const art = articles.find((a) => a.id === log.article_id);
                return (
                  <TableRow key={log.id}>
                    <TableCell className="text-xs">
                      {new Date(log.triggered_at).toLocaleString("fr-FR")}
                    </TableCell>
                    <TableCell className="text-xs">{art?.slug ?? log.article_id}</TableCell>
                    <TableCell>
                      <Badge variant={log.dry_run ? "outline" : "default"}>
                        {log.dry_run ? "Aperçu" : "Apply"}
                      </Badge>
                    </TableCell>
                    <TableCell>{log.applied ? "Oui" : "Non"}</TableCell>
                    <TableCell>{log.noindex_after == null ? "–" : log.noindex_after ? "Oui" : "Non"}</TableCell>
                    <TableCell>{log.changes_count ?? "–"}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </section>

      {/* Modale diff */}
      <Dialog open={!!previewResult} onOpenChange={(o) => !o && setPreviewResult(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Aperçu du refresh IA</DialogTitle>
            <DialogDescription>
              {previewResult?.slug} · {previewResult?.diff.changes_count ?? 0} corrections détectées
            </DialogDescription>
          </DialogHeader>
          {previewResult && (
            <div className="space-y-4 max-h-[60vh] overflow-y-auto text-sm">
              <div>
                <div className="text-xs font-semibold text-muted-foreground mb-1">Patterns retirés</div>
                <div className="flex flex-wrap gap-1">
                  {previewResult.diff.removed_patterns.length === 0 ? (
                    <span className="text-muted-foreground">Aucun</span>
                  ) : (
                    previewResult.diff.removed_patterns.map((p) => (
                      <Badge key={p} variant="outline">
                        {p}
                      </Badge>
                    ))
                  )}
                </div>
              </div>
              {previewResult.warnings.length > 0 && (
                <div className="rounded border border-destructive/40 bg-destructive/5 p-3 text-xs">
                  <div className="font-semibold text-destructive mb-1">Avertissements</div>
                  {previewResult.warnings.map((w) => (
                    <div key={w}>{w}</div>
                  ))}
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-xs font-semibold text-muted-foreground mb-1">Avant</div>
                  <pre className="whitespace-pre-wrap rounded border border-border p-2 text-xs bg-muted/30">
                    {previewResult.diff.before_excerpt}…
                  </pre>
                </div>
                <div>
                  <div className="text-xs font-semibold text-muted-foreground mb-1">Après</div>
                  <pre className="whitespace-pre-wrap rounded border border-border p-2 text-xs bg-muted/30">
                    {previewResult.diff.after_excerpt}…
                  </pre>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewResult(null)}>
              Fermer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modale batch */}
      <Dialog open={batchOpen} onOpenChange={setBatchOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmer le batch refresh</DialogTitle>
            <DialogDescription>
              {nonPillars.length} articles standards vont être régénérés par l'IA. Les {STRATEGIC_PILLARS.length}{" "}
              piliers stratégiques sont exclus.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <div>
              <div className="font-semibold mb-1">Articles inclus</div>
              <ul className="text-xs text-muted-foreground list-disc pl-4 max-h-40 overflow-y-auto">
                {nonPillars.map((a) => (
                  <li key={a.id}>{a.slug}</li>
                ))}
              </ul>
            </div>
            <div>
              <div className="font-semibold mb-1">Piliers exclus (validation manuelle)</div>
              <ul className="text-xs text-muted-foreground list-disc pl-4">
                {STRATEGIC_PILLARS.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={batchAck} onCheckedChange={(v) => setBatchAck(v === true)} />
              J'ai vérifié la liste
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBatchOpen(false)}>
              Annuler
            </Button>
            <Button disabled={!batchAck} onClick={handleBatch}>
              Lancer le batch
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modale validation pilier */}
      <Dialog open={!!validateOpen} onOpenChange={(o) => !o && setValidateOpen(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Valider le pilier stratégique</DialogTitle>
            <DialogDescription>
              {validateOpen?.title}
            </DialogDescription>
          </DialogHeader>
          <label className="flex items-start gap-2 text-sm">
            <Checkbox checked={validateAck} onCheckedChange={(v) => setValidateAck(v === true)} />
            <span>
              Vous confirmez avoir relu intégralement cet article et validé chaque section.
            </span>
          </label>
          <DialogFooter>
            <Button variant="outline" onClick={() => setValidateOpen(null)}>
              Annuler
            </Button>
            <Button disabled={!validateAck} onClick={handleValidatePillar}>
              Sortir du noindex
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
