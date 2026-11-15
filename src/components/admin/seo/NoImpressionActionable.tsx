import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  articlesWithoutImpressions,
  countByStatus,
  type PageImpressions,
  type PageTotals,
  type SeoArticle,
} from "@/lib/admin/seoMetrics";
import { SEO_KEEP_DAYS, articleAgeDays, recentActionsByPath, type SeoLogEntry } from "@/lib/admin/seoActionLog";
import { useLogSeoAction } from "@/hooks/useSeoActionLog";

interface Props {
  /** Lot SEO-A : articles publiés avec leur statut Google (useSeoArticles). */
  publishedArticles: SeoArticle[];
  /** Liste complète des pages Google (lot A10), undefined si GSC indisponible. */
  pages: PageImpressions[] | undefined;
  /** Lot TRF-5 : impressions par page, pour proposer une cible de redirection vue par Google. */
  totals?: Map<string, PageTotals>;
  /** Lot TRF-5 : journal des actions SEO. */
  log?: SeoLogEntry[];
  /** Appelé après une redirection ou une sortie de l'index, pour relire les articles. */
  onChanged?: () => void;
}

/** Lot TRF-5 : sous 30 jours, pousser l'adresse a du sens ; au-delà, le geste utile est éditorial. */
export const PUSH_MAX_AGE_DAYS = 30;

/**
 * Articles indexables publiés depuis plus de 7 jours, jamais affichés par
 * Google. Lot TRF-5 (15/11/2026, maquette validée) : le geste dépend de l'âge.
 * Moins de 30 jours : pousser l'adresse. Au-delà : rediriger vers un article
 * vu par Google, sortir de l'index, ou garder (hors liste 90 jours).
 */
export default function NoImpressionActionable({ publishedArticles, pages, totals, log = [], onChanged }: Props) {
  const [busy, setBusy] = useState<string | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [openSlug, setOpenSlug] = useState<string | null>(null);
  const [target, setTarget] = useState("");
  const [done, setDone] = useState<Set<string>>(new Set());
  const logAction = useLogSeoAction();

  const kept = useMemo(() => {
    const recent = recentActionsByPath(log.filter((e) => e.kind === "traite" || e.kind === "redirection" || e.kind === "noindex"), SEO_KEEP_DAYS);
    return new Set([...recent.keys()]);
  }, [log]);

  // Lot SEO-A : seuls les articles indexables sont attendus dans Google ;
  // redirigés, noindex et canoniques ailleurs sont comptés à part, jamais poussés.
  const { orphans, setAside, keptCount } = useMemo(() => {
    if (!pages) return { orphans: [] as SeoArticle[], setAside: countByStatus([]), keptCount: 0 };
    const without = articlesWithoutImpressions(publishedArticles, pages);
    const indexable = without.filter((a) => a.status === "indexable");
    const visible = indexable.filter((a) => !kept.has(`/actualites/${a.slug}`) && !done.has(a.slug));
    return {
      orphans: visible,
      setAside: countByStatus(without.filter((a) => a.status !== "indexable")),
      keptCount: indexable.length - visible.length,
    };
  }, [publishedArticles, pages, kept, done]);
  const asideTotal = setAside.redirige + setAside.noindex + setAside.canonique_ailleurs;

  const fresh = orphans.filter((a) => articleAgeDays(a.published_at, a.created_at) < PUSH_MAX_AGE_DAYS);
  const old = orphans.filter((a) => articleAgeDays(a.published_at, a.created_at) >= PUSH_MAX_AGE_DAYS);

  // Cibles de redirection : articles indexables vus par Google, les plus vus d'abord.
  const targets = useMemo(() => {
    if (!totals) return [] as { slug: string; title: string; impressions: number }[];
    return publishedArticles
      .filter((a) => a.status === "indexable")
      .map((a) => ({ slug: a.slug, title: a.title, impressions: totals.get(`/actualites/${a.slug}`)?.impressions ?? 0 }))
      .filter((a) => a.impressions > 0)
      .sort((a, b) => b.impressions - a.impressions);
  }, [publishedArticles, totals]);

  const pushSlugs = async (slugs: string[], source: string) => {
    const { data, error } = await supabase.functions.invoke("notify-indexnow", { body: { slugs, source } });
    if (error) throw error;
    return data as { ok?: boolean; submitted?: number };
  };

  const pushOne = async (slug: string) => {
    setBusy(slug);
    try {
      const data = await pushSlugs([slug], "no-impression-single");
      if (data?.ok) {
        toast.success(`Envoyé : ${slug}`);
        logAction.mutate({ kind: "indexnow", path: `/actualites/${slug}` });
      } else toast.error("Échec IndexNow");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur IndexNow");
    } finally {
      setBusy(null);
    }
  };

  const pushAll = async () => {
    if (fresh.length === 0) return;
    // Lot A10 : confirmation avant l'envoi groupé.
    const ok = window.confirm(`Envoyer ${fresh.length} adresse${fresh.length > 1 ? "s" : ""} à IndexNow (Bing, Yandex) ?`);
    if (!ok) return;
    setBulkBusy(true);
    try {
      const data = await pushSlugs(fresh.map((o) => o.slug), "no-impression-bulk");
      toast.success(`${(data?.submitted ?? 0).toLocaleString("fr-FR")} adresses envoyées à Bing et Yandex.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur IndexNow");
    } finally {
      setBulkBusy(false);
    }
  };

  const finish = (slug: string) => {
    setDone((prev) => new Set(prev).add(slug));
    setOpenSlug(null);
    setTarget("");
  };

  const keep = async (slug: string) => {
    setBusy(slug);
    try {
      await logAction.mutateAsync({ kind: "traite", path: `/actualites/${slug}`, note: "Article gardé tel quel" });
      toast.success("Article gardé, hors liste pendant 90 jours.");
      finish(slug);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Enregistrement impossible");
    } finally { setBusy(null); }
  };

  const noindex = async (slug: string) => {
    if (!window.confirm(`Sortir /actualites/${slug} de l'index des moteurs ? L'article reste en ligne et lisible.`)) return;
    setBusy(slug);
    try {
      const { error } = await supabase.from("articles").update({ noindex: true } as never).eq("slug", slug);
      if (error) throw error;
      await logAction.mutateAsync({ kind: "noindex", path: `/actualites/${slug}` });
      toast.success("Article sorti de l'index.");
      finish(slug);
      onChanged?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Modification impossible");
    } finally { setBusy(null); }
  };

  const redirect = async (slug: string) => {
    if (!target) return;
    if (!window.confirm(`Rediriger /actualites/${slug} vers /actualites/${target} ? Les visiteurs et les moteurs arrivent sur l'article cible.`)) return;
    setBusy(slug);
    try {
      const { error } = await (supabase.from as any)("redirects").insert({
        slug_from: slug, slug_to: target, redirect_type: 301, scope: "article",
        notes: "Admin Trafic : article jamais vu par Google",
      });
      if (error) throw error;
      await logAction.mutateAsync({ kind: "redirection", path: `/actualites/${slug}`, note: `Vers /actualites/${target}` });
      toast.success("Redirection posée.");
      finish(slug);
      onChanged?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Redirection impossible");
    } finally { setBusy(null); }
  };

  if (orphans.length === 0 && keptCount === 0) return null;

  const dateOf = (a: SeoArticle) => (a.published_at ? new Date(a.published_at).toLocaleDateString("fr-FR") : "·");

  return (
    <Card data-testid="no-impression-card">
      <CardHeader>
        <CardTitle className="text-lg">
          {orphans.length.toLocaleString("fr-FR")} article{orphans.length > 1 ? "s" : ""} jamais vu{orphans.length > 1 ? "s" : ""} par Google
        </CardTitle>
        <p className="text-xs text-muted-foreground mt-1">
          Articles indexables publiés depuis plus de 7 jours, sans aucun affichage sur la période. Le geste dépend de l'âge de l'article.
        </p>
        {(asideTotal > 0 || keptCount > 0) && (
          <p className="text-xs text-muted-foreground mt-1" data-testid="no-impression-set-aside">
            Hors liste, par choix : {setAside.redirige} redirigé{setAside.redirige > 1 ? "s" : ""}, {setAside.noindex} en noindex, {setAside.canonique_ailleurs} canonique{setAside.canonique_ailleurs > 1 ? "s" : ""} vers une autre page{keptCount > 0 ? `, ${keptCount} traité${keptCount > 1 ? "s" : ""} depuis moins de 90 jours` : ""}.
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-5">
        {fresh.length > 0 && (
          <section data-testid="no-impression-fresh">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <h3 className="text-sm font-semibold">Moins de {PUSH_MAX_AGE_DAYS} jours : {fresh.length} · pousser l'adresse aux moteurs</h3>
              <Button onClick={pushAll} disabled={bulkBusy} size="sm" className="min-h-11 sm:min-h-9">
                <Send className="h-3.5 w-3.5 mr-1.5" />
                {bulkBusy ? "Envoi…" : "Tout pousser via IndexNow"}
              </Button>
            </div>
            <ul className="text-sm">
              {fresh.map((a) => (
                <li key={a.slug} className="flex items-center justify-between gap-2 border-b border-border/40 py-1.5">
                  <a href={`https://guardiens.fr/actualites/${a.slug}`} target="_blank" rel="noreferrer" className="font-mono text-xs truncate hover:underline flex-1 min-w-0">/actualites/{a.slug}</a>
                  <span className="text-xs text-muted-foreground shrink-0">{dateOf(a)}</span>
                  <Button size="sm" variant="outline" onClick={() => pushOne(a.slug)} disabled={busy === a.slug || bulkBusy} className="min-h-11 sm:min-h-9">
                    {busy === a.slug ? "…" : "Pousser"}
                  </Button>
                </li>
              ))}
            </ul>
          </section>
        )}

        {old.length > 0 && (
          <section data-testid="no-impression-old">
            <h3 className="text-sm font-semibold mb-1">Plus de {PUSH_MAX_AGE_DAYS} jours : {old.length} · rediriger, sortir de l'index ou garder</h3>
            <p className="text-xs text-muted-foreground mb-2">Touchez un article pour choisir. Chaque geste se confirme d'un clic et s'inscrit au journal.</p>
            <ul className="text-sm max-h-[28rem] overflow-y-auto">
              {old.map((a) => {
                const open = openSlug === a.slug;
                return (
                  <li key={a.slug} className="border-b border-border/40">
                    <button type="button" aria-expanded={open} onClick={() => { setOpenSlug(open ? null : a.slug); setTarget(""); }}
                      className="w-full min-h-11 flex items-center justify-between gap-2 text-left">
                      <span className="font-mono text-xs truncate flex-1 min-w-0">/actualites/{a.slug}</span>
                      <span className="text-xs text-muted-foreground shrink-0">{dateOf(a)}</span>
                    </button>
                    {open && (
                      <div className="pb-3 space-y-2" data-testid="no-impression-choices">
                        <p className="text-sm font-medium">{a.title}</p>
                        <div className="flex flex-col sm:flex-row gap-2">
                          <label className="sr-only" htmlFor={`cible-${a.slug}`}>Article cible de la redirection</label>
                          <select id={`cible-${a.slug}`} value={target} onChange={(e) => setTarget(e.target.value)}
                            className="min-h-11 flex-1 min-w-0 rounded-md border border-input bg-background px-2 text-sm">
                            <option value="">Rediriger vers un article vu par Google…</option>
                            {targets.map((t) => (
                              <option key={t.slug} value={t.slug}>{t.title} ({t.impressions.toLocaleString("fr-FR")} impressions)</option>
                            ))}
                          </select>
                          <Button size="sm" className="min-h-11" disabled={!target || busy === a.slug} onClick={() => redirect(a.slug)}>Rediriger</Button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button size="sm" variant="outline" className="min-h-11" disabled={busy === a.slug} onClick={() => noindex(a.slug)}>Sortir de l'index</Button>
                          <Button size="sm" variant="outline" className="min-h-11" disabled={busy === a.slug} onClick={() => keep(a.slug)}>Garder</Button>
                          <Button size="sm" variant="ghost" className="min-h-11" asChild>
                            <a href={`https://guardiens.fr/actualites/${a.slug}`} target="_blank" rel="noreferrer">Lire l'article</a>
                          </Button>
                        </div>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        )}
      </CardContent>
    </Card>
  );
}
