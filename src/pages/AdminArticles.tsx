import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Trash2, Eye, ArrowLeft } from "lucide-react";
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
};

const categoryColors: Record<string, string> = {
  guide_race: "bg-[hsl(141,50%,90%)] text-[hsl(153,50%,25%)]",
  guide_lieu: "bg-[hsl(214,80%,92%)] text-[hsl(214,50%,30%)]",
  conseil_gardien: "bg-[hsl(45,90%,90%)] text-[hsl(37,60%,30%)]",
  conseil_proprio: "bg-[hsl(45,90%,90%)] text-[hsl(37,60%,30%)]",
  temoignage: "bg-[hsl(330,80%,94%)] text-[hsl(330,50%,30%)]",
  actualite: "bg-muted text-muted-foreground",
  conseil: "bg-[hsl(45,90%,90%)] text-[hsl(37,60%,30%)]",
};

const AdminArticles = () => {
  const navigate = useNavigate();
  const [articles, setArticles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [search, setSearch] = useState("");

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

  const filtered = articles.filter(a =>
    !search || a.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="font-heading text-2xl font-bold">Articles</h1>
        </div>
        <Button onClick={() => navigate("/admin/articles/new")}>
          <Plus className="h-4 w-4 mr-2" /> Nouvel article
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <Input placeholder="Rechercher…" value={search} onChange={e => setSearch(e.target.value)} className="max-w-xs" />
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes catégories</SelectItem>
            <SelectItem value="guide_race">Guide race</SelectItem>
            <SelectItem value="guide_lieu">Guide lieu</SelectItem>
            <SelectItem value="conseil_gardien">Conseil gardien</SelectItem>
            <SelectItem value="conseil_proprio">Conseil proprio</SelectItem>
            <SelectItem value="temoignage">Témoignage</SelectItem>
            <SelectItem value="actualite">Actualité</SelectItem>
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
              <TableHead>Statut</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Auteur</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Chargement…</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Aucun article</TableCell></TableRow>
            ) : filtered.map(article => (
              <TableRow key={article.id}>
                <TableCell className="font-medium max-w-[250px] truncate">{article.title}</TableCell>
                <TableCell>
                  <Badge variant="secondary" className={categoryColors[article.category] || ""}>
                    {categoryLabels[article.category] || article.category}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={article.published ? "default" : "outline"}>
                    {article.published ? "Publié" : "Brouillon"}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {article.published_at ? format(new Date(article.published_at), "d MMM yyyy", { locale: fr }) : "—"}
                </TableCell>
                <TableCell className="text-sm">{article.author_name}</TableCell>
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
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default AdminArticles;
