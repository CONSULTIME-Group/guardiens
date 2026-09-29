import { Pager, PAGE_SIZE, normalizeSearch } from "@/components/admin/ui";
import { fetchAllRows } from "@/lib/admin/fetchAllRows";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Plus, Pencil, Trash2, Eye, CheckCircle2, AlertTriangle, XCircle, Link2, Loader2 } from "lucide-react";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { toast } from "sonner";
import { ARTICLE_CATEGORIES, META_DESCRIPTION_MAX } from "@/lib/admin/articleCategories";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const categoryLabels: Record<string, string> = ARTICLE_CATEGORIES;

const categoryColors: Record<string, string> = {};

interface SeoCheck {
  hasMetaTitle: boolean;
  hasMetaTitleLength: boolean;
  hasMetaDescription: boolean;
  hasMetaDescriptionLength: boolean;
  hasHeroImageAlt: boolean;
  hasInternalLinks: boolean;
  hasMinContentLength: boolean;
  noForbiddenVocab: boolean;
}

// Forbidden vocabulary per project Core memory: « AURA » (uppercase acronym only,
// pas le verbe « aura »), « Auvergne-Rhône-Alpes », « voisin/voisine/voisins/voisinage »
// (avec word boundary pour éviter « avoisinant »), tiret cadratin (U+2014).
const FORBIDDEN_REGEX = /\bAURA\b|Auvergne-Rhône-Alpes|\bvoisin(e|s|age)?\b|\u2014/;

function getSeoScore(article: any): { score: "green" | "orange" | "red"; checks: SeoCheck } {
  const mt = (article.meta_title || "").trim();
  const md = (article.meta_description || "").trim();
  const content = article.content || "";
  const title = article.title || "";
  const excerpt = article.excerpt || "";
  const haystack = `${title}\n${content}\n${excerpt}\n${mt}\n${md}`;

  const checks: SeoCheck = {
    hasMetaTitle: !!mt,
    hasMetaTitleLength: mt.length > 0 && mt.length <= 60,
    hasMetaDescription: !!md,
    hasMetaDescriptionLength: md.length >= 120 && md.length <= META_DESCRIPTION_MAX,
    hasHeroImageAlt: !!(article.hero_image_alt && article.hero_image_alt.trim()),
    hasInternalLinks: Array.isArray(article.internal_links) && article.internal_links.length >= 2,
    hasMinContentLength: content.length >= 3000,
    noForbiddenVocab: !FORBIDDEN_REGEX.test(haystack),
  };

  // Bloquants rouges : meta absentes ou vocabulaire proscrit ou contenu < 2000.
  if (!checks.hasMetaTitle || !checks.hasMetaDescription) return { score: "red", checks };
  if (!checks.noForbiddenVocab) return { score: "red", checks };
  if (content.length < 2000) return { score: "red", checks };

  const total = Object.values(checks).filter(Boolean).length;
  if (total === 8) return { score: "green", checks };
  return { score: "orange", checks };
}

const seoLabels: Record<keyof SeoCheck, string> = {
  hasMetaTitle: "Meta title présent",
  hasMetaTitleLength: "Meta title ≤ 60 caractères",
  hasMetaDescription: "Meta description présente",
  hasMetaDescriptionLength: `Méta description de 120 à ${META_DESCRIPTION_MAX} caractères`,
  hasHeroImageAlt: "Alt text image hero",
  hasInternalLinks: "Liens internes (≥ 2)",
  hasMinContentLength: "Contenu ≥ 3000 caractères",
  noForbiddenVocab: "Vocabulaire conforme (pas d'AURA, voisin, tiret cadratin)",
};


const AdminArticles = () => {
  const navigate = useNavigate();
  const [articles, setArticles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterSeo, setFilterSeo] = useState("all");
  const [search, setSearch] = useState("");
  const [selectedArticle, setSelectedArticle] = useState<any | null>(null);
  const [autoLinking, setAutoLinking] = useState(false);

  const runAutoLinks = async (dryRun: boolean) => {
    setAutoLinking(true);
    try {
      const { data, error } = await supabase.functions.invoke("auto-internal-links", {
        body: { dryRun, onlyMissing: true },
      });
      if (error) throw error;
      if (dryRun) {
        toast.success(`Aperçu : ${data.targets} articles à enrichir`);
      } else {
        toast.success(`${data.updated} articles enrichis avec liens internes`);
        fetchArticles();
      }
    } catch (e: any) {
      toast.error(`Erreur : ${e.message}`);
    } finally {
      setAutoLinking(false);
    }
  };

  const fetchArticles = async () => {
    setLoading(true);
    try {
      const { rows } = await fetchAllRows<any>((from, to) => {
        let query = supabase.from("articles").select("*")
          .order("created_at", { ascending: false }).order("id", { ascending: true });
        if (filterCategory !== "all") query = query.eq("category", filterCategory);
        if (filterStatus === "published") query = query.eq("published", true);
        if (filterStatus === "draft") query = query.eq("published", false);
        return query.range(from, to);
      });
      setArticles(rows);
    } catch {
      toast.error("Chargement impossible, relancez la lecture.");
    }
    setLoading(false);
  };

  useEffect(() => { fetchArticles(); }, [filterCategory, filterStatus]);

  const deleteArticle = async (id: string) => {
    const { error } = await supabase.from("articles").delete().eq("id", id);
    if (error) toast.error("Erreur de suppression");
    else { toast.success("Article supprimé"); fetchArticles(); }
  };

  const [articlePage, setArticlePage] = useState(0);
  useEffect(() => { setArticlePage(0); }, [search, filterSeo, filterCategory, filterStatus]);
  const filtered = articles.filter(a => {
    if (search.trim() && !normalizeSearch(a.title ?? "").includes(normalizeSearch(search.trim()))) return false;
    if (filterSeo !== "all") {
      const { score } = getSeoScore(a);
      if (filterSeo === "complete" && score !== "green") return false;
      if (filterSeo === "incomplete" && score !== "orange") return false;
      if (filterSeo === "urgent" && score !== "red") return false;
    }
    return true;
  });

  const seoStats = {
    green: articles.filter(a => getSeoScore(a).score === "green").length,
    orange: articles.filter(a => getSeoScore(a).score === "orange").length,
    red: articles.filter(a => getSeoScore(a).score === "red").length,
  };

  const selectedSeo = selectedArticle ? getSeoScore(selectedArticle) : null;

  const maxArticlePage = Math.max(0, Math.ceil(filtered.length / PAGE_SIZE) - 1);
  const currentArticlePage = Math.min(articlePage, maxArticlePage);
  const pagedArticles = filtered.slice(currentArticlePage * PAGE_SIZE, (currentArticlePage + 1) * PAGE_SIZE);

  return (
    <div className="space-y-6">
      <AdminPageHeader title="Articles" description="Articles du journal : rédaction, publication et score SEO." />
      <div className="flex flex-wrap items-center justify-end">
        <div className="flex flex-wrap items-center gap-2">
          <ConfirmDialog
            trigger={
              <Button
                variant="outline"
                disabled={autoLinking || seoStats.orange === 0}
                title="Insère 3 ou 4 liens internes contextuels sur les articles qui n'en ont pas"
              >
                {autoLinking ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Link2 className="h-4 w-4 mr-2" />}
                Maillage auto ({seoStats.orange})
              </Button>
            }
            title="Lancer le maillage automatique ?"
            description={`${seoStats.orange} articles recevront 3 ou 4 liens internes chacun, soit ${seoStats.orange * 3} à ${seoStats.orange * 4} liens ajoutés au contenu.`}
            confirmLabel="Lancer le maillage"
            onConfirm={() => runAutoLinks(false)}
          />
          <Button onClick={() => navigate("/admin/articles/new")}>
            <Plus className="h-4 w-4 mr-2" /> Nouvel article
          </Button>
        </div>
      </div>

      {/* SEO summary badges */}
      <div className="flex flex-wrap gap-2">
        <Badge variant="outline" className="gap-1 cursor-pointer" onClick={() => setFilterSeo("all")}>
          Tous ({articles.length})
        </Badge>
        <Badge variant="outline" className="gap-1 cursor-pointer text-success border-success/50" onClick={() => setFilterSeo("complete")}>
          <CheckCircle2 className="h-3 w-3" /> Complets ({seoStats.green})
        </Badge>
        <Badge variant="outline" className="gap-1 cursor-pointer text-warning border-warning/50" onClick={() => setFilterSeo("incomplete")}>
          <AlertTriangle className="h-3 w-3" /> Incomplets ({seoStats.orange})
        </Badge>
        <Badge variant="outline" className="gap-1 cursor-pointer text-destructive border-destructive/50" onClick={() => setFilterSeo("urgent")}>
          <XCircle className="h-3 w-3" /> Urgents ({seoStats.red})
        </Badge>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <Input placeholder="Rechercher…" value={search} onChange={e => setSearch(e.target.value)} className="max-w-xs" />
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes catégories</SelectItem>
            {Object.entries(categoryLabels).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous statuts</SelectItem>
            <SelectItem value="published">Publié</SelectItem>
            <SelectItem value="draft">Brouillon</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Titre</TableHead>
              <TableHead>Catégorie</TableHead>
              <TableHead>SEO</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Chargement…</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">La liste se remplira dès le premier article correspondant.</TableCell></TableRow>
            ) : pagedArticles.map(article => {
              const { score } = getSeoScore(article);
              return (
                <TableRow key={article.id}>
                  <TableCell className="font-medium max-w-[250px] truncate">{article.title}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={categoryColors[article.category] || ""}>
                      {categoryLabels[article.category] || article.category}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <button
                      onClick={() => setSelectedArticle(article)}
                      className="inline-flex items-center gap-1 text-sm cursor-pointer hover:opacity-80"
                    >
                      {score === "green" && <CheckCircle2 className="h-4 w-4 text-success" />}
                      {score === "orange" && <AlertTriangle className="h-4 w-4 text-warning" />}
                      {score === "red" && <XCircle className="h-4 w-4 text-destructive" />}
                    </button>
                  </TableCell>
                  <TableCell>
                    <Badge variant={article.published ? "default" : "outline"}>
                      {article.published ? "Publié" : "Brouillon"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {article.published_at ? format(new Date(article.published_at), "d MMM yyyy", { locale: fr }) : "·"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => navigate(`/actualites/${article.slug}`)} title="Voir">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => navigate(`/admin/articles/${article.id}`)} title="Modifier">
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <ConfirmDialog
                        trigger={
                          <Button variant="ghost" size="icon" title="Supprimer">
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        }
                        title="Supprimer cet article ?"
                        description={<>L'article <strong>« {article.title} »</strong> sera supprimé définitivement. Cette action est irréversible.</>}
                        confirmLabel="Supprimer définitivement"
                        destructive
                        onConfirm={() => deleteArticle(article.id)}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
      <Pager page={currentArticlePage} total={filtered.length} onPage={setArticlePage} />

      {/* CORRECTION 8, SEO checklist panel */}
      <Sheet open={!!selectedArticle} onOpenChange={() => setSelectedArticle(null)}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Checklist SEO</SheetTitle>
          </SheetHeader>
          {selectedArticle && selectedSeo && (
            <div className="mt-6 space-y-4">
              <p className="text-sm font-medium text-foreground truncate">{selectedArticle.title}</p>
              <div className="space-y-3">
                {(Object.entries(selectedSeo.checks) as [keyof SeoCheck, boolean][]).map(([key, ok]) => (
                  <div key={key} className="flex items-center justify-between gap-3 py-2 border-b border-border">
                    <span className="text-sm">{seoLabels[key]}</span>
                    <div className="flex items-center gap-2">
                      {ok ? (
                        <CheckCircle2 className="h-4 w-4 text-success" />
                      ) : (
                        <>
                          <XCircle className="h-4 w-4 text-destructive" />
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedArticle(null);
                              navigate(`/admin/articles/${selectedArticle.id}`);
                            }}
                          >
                            Corriger
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default AdminArticles;
