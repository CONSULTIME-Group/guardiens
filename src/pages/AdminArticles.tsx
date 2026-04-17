import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Plus, Pencil, Trash2, Eye, ArrowLeft, CheckCircle2, AlertTriangle, XCircle, Link2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const categoryLabels: Record<string, string> = {
  guide_race: "Guide race",
  guide_lieu: "Guide lieu",
  conseil_gardien: "Conseil gardien",
  conseil_proprio: "Conseil proprio",
  temoignage: "Témoignage",
  actualite: "Actualité",
  conseil: "Conseil",
  ville: "Ville",
  vie_locale: "Vie locale",
  guide_local: "Guide local",
  guide_pratique: "Guide pratique",
  saisonnier: "Saisonnier",
};

const categoryColors: Record<string, string> = {
  guide_race: "bg-[hsl(141,50%,90%)] text-[hsl(153,50%,25%)]",
  guide_lieu: "bg-[hsl(214,80%,92%)] text-[hsl(214,50%,30%)]",
  conseil_gardien: "bg-[hsl(45,90%,90%)] text-[hsl(37,60%,30%)]",
  conseil_proprio: "bg-[hsl(45,90%,90%)] text-[hsl(37,60%,30%)]",
  temoignage: "bg-[hsl(330,80%,94%)] text-[hsl(330,50%,30%)]",
  actualite: "bg-muted text-muted-foreground",
  conseil: "bg-[hsl(45,90%,90%)] text-[hsl(37,60%,30%)]",
  ville: "bg-[hsl(214,80%,92%)] text-[hsl(214,50%,30%)]",
  vie_locale: "bg-[hsl(30,80%,92%)] text-[hsl(30,60%,30%)]",
  guide_local: "bg-[hsl(270,60%,92%)] text-[hsl(270,50%,30%)]",
  guide_pratique: "bg-[hsl(45,50%,92%)] text-[hsl(45,40%,30%)]",
  saisonnier: "bg-[hsl(160,50%,92%)] text-[hsl(160,40%,30%)]",
};

interface SeoCheck {
  hasMetaTitle: boolean;
  hasMetaDescription: boolean;
  hasHeroImageAlt: boolean;
  hasInternalLinks: boolean;
}

function getSeoScore(article: any): { score: "green" | "orange" | "red"; checks: SeoCheck } {
  const checks: SeoCheck = {
    hasMetaTitle: !!(article.meta_title && article.meta_title.trim()),
    hasMetaDescription: !!(article.meta_description && article.meta_description.trim()),
    hasHeroImageAlt: !!(article.hero_image_alt && article.hero_image_alt.trim()),
    hasInternalLinks: Array.isArray(article.internal_links) && article.internal_links.length >= 2,
  };
  
  const total = Object.values(checks).filter(Boolean).length;
  
  if (!checks.hasMetaTitle || !checks.hasMetaDescription) return { score: "red", checks };
  if (total >= 4) return { score: "green", checks };
  return { score: "orange", checks };
}

const seoLabels: Record<keyof SeoCheck, string> = {
  hasMetaTitle: "Meta title",
  hasMetaDescription: "Meta description",
  hasHeroImageAlt: "Alt text image",
  hasInternalLinks: "Liens internes (≥2)",
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
        toast.success(`✅ ${data.updated} articles enrichis avec liens internes`);
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
    let query = supabase.from("articles").select("*").order("created_at", { ascending: false });
    if (filterCategory !== "all") query = query.eq("category", filterCategory);
    if (filterStatus === "published") query = query.eq("published", true);
    if (filterStatus === "draft") query = query.eq("published", false);
    const { data, error } = await query;
    if (error) toast.error("Erreur de chargement");
    else setArticles(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchArticles(); }, [filterCategory, filterStatus]);

  const deleteArticle = async (id: string) => {
    if (!confirm("Supprimer cet article ?")) return;
    const { error } = await supabase.from("articles").delete().eq("id", id);
    if (error) toast.error("Erreur de suppression");
    else { toast.success("Article supprimé"); fetchArticles(); }
  };

  const filtered = articles.filter(a => {
    if (search && !a.title.toLowerCase().includes(search.toLowerCase())) return false;
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="font-heading text-2xl font-bold">Articles</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => runAutoLinks(false)}
            disabled={autoLinking || seoStats.orange === 0}
            title="Insère 3-4 liens internes contextuels sur les articles qui n'en ont pas"
          >
            {autoLinking ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Link2 className="h-4 w-4 mr-2" />}
            Maillage auto ({seoStats.orange})
          </Button>
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
        <Badge variant="outline" className="gap-1 cursor-pointer text-[hsl(141,50%,30%)] border-[hsl(141,50%,70%)]" onClick={() => setFilterSeo("complete")}>
          <CheckCircle2 className="h-3 w-3" /> Complets ({seoStats.green})
        </Badge>
        <Badge variant="outline" className="gap-1 cursor-pointer text-[hsl(37,60%,30%)] border-[hsl(37,60%,70%)]" onClick={() => setFilterSeo("incomplete")}>
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
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Aucun article</TableCell></TableRow>
            ) : filtered.map(article => {
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
                      {score === "green" && <CheckCircle2 className="h-4 w-4 text-[hsl(141,50%,40%)]" />}
                      {score === "orange" && <AlertTriangle className="h-4 w-4 text-[hsl(37,80%,50%)]" />}
                      {score === "red" && <XCircle className="h-4 w-4 text-destructive" />}
                    </button>
                  </TableCell>
                  <TableCell>
                    <Badge variant={article.published ? "default" : "outline"}>
                      {article.published ? "Publié" : "Brouillon"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {article.published_at ? format(new Date(article.published_at), "d MMM yyyy", { locale: fr }) : "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => navigate(`/actualites/${article.slug}`)} title="Voir">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => navigate(`/admin/articles/${article.id}`)} title="Modifier">
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => deleteArticle(article.id)} title="Supprimer">
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* CORRECTION 8 — SEO checklist panel */}
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
                        <CheckCircle2 className="h-4 w-4 text-[hsl(141,50%,40%)]" />
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
