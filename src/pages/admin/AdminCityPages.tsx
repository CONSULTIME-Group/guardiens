import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Plus, ExternalLink, Loader2, Trash2, Zap } from "lucide-react";
import { TOP_CITIES_FRANCE } from "@/data/topCitiesFrance";

const AdminCityPages = () => {
  const [city, setCity] = useState("");
  const [department, setDepartment] = useState("");
  const [generating, setGenerating] = useState(false);
  const [batchRunning, setBatchRunning] = useState(false);
  const [batchProgress, setBatchProgress] = useState<{ done: number; total: number; ok: number; skipped: number; failed: number } | null>(null);
  const [pendingDelete, setPendingDelete] = useState<{ id: string; city: string } | null>(null);

  const { data: pages, refetch } = useQuery({
    queryKey: ["admin-city-pages"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("seo_city_pages" as any)
        .select("*")
        .order("city");
      if (error) throw error;
      return data as any[];
    },
  });

  const handleGenerate = async () => {
    if (!city.trim()) {
      toast.error("Entrez un nom de ville");
      return;
    }
    setGenerating(true);
    try {
      const { error } = await supabase.functions.invoke("generate-city-page", {
        body: { city: city.trim(), department: department.trim() || undefined },
      });
      if (error) throw error;
      toast.success(`Page créée pour ${city}`);
      setCity("");
      setDepartment("");
      refetch();
    } catch (err: any) {
      toast.error(`Erreur : ${err.message}`);
    } finally {
      setGenerating(false);
    }
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    const { error } = await supabase
      .from("seo_city_pages" as any)
      .delete()
      .eq("id", pendingDelete.id);
    if (error) {
      toast.error("Erreur lors de la suppression");
    } else {
      toast.success("Page supprimée");
      refetch();
    }
    setPendingDelete(null);
  };

  const handleTogglePublish = async (id: string, published: boolean) => {
    const { error } = await supabase
      .from("seo_city_pages" as any)
      .update({ published: !published })
      .eq("id", id);
    if (error) {
      toast.error("Erreur");
    } else {
      toast.success(published ? "Page dépubliée" : "Page publiée");
      refetch();
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-foreground">Pages SEO Villes</h1>
        <p className="text-muted-foreground">Générez des landing pages par ville pour le référencement.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Générer une nouvelle page ville</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-3">
            <Input
              placeholder="Nom de la ville (ex: Lyon, Annecy...)"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="flex-1"
            />
            <Input
              placeholder="Département (optionnel)"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="sm:w-56"
            />
            <Button onClick={handleGenerate} disabled={generating} className="gap-2">
              {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Générer
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {pages?.map((page: any) => (
          <Card key={page.id}>
            <CardContent className="p-4 flex items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-foreground">{page.city}</h3>
                  <Badge variant={page.published ? "default" : "secondary"}>
                    {page.published ? "Publiée" : "Brouillon"}
                  </Badge>
                  {page.department && (
                    <span className="text-xs text-muted-foreground">{page.department}</span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground truncate">{page.meta_description}</p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleTogglePublish(page.id, page.published)}
                >
                  {page.published ? "Dépublier" : "Publier"}
                </Button>
                <a
                  href={`/house-sitting/${page.slug}`}
                  target="_blank"
                  rel="noopener"
                >
                  <Button variant="ghost" size="icon">
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </a>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setPendingDelete({ id: page.id, city: page.city })}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {pages?.length === 0 && (
          <p className="text-center text-muted-foreground py-8">
            Aucune page ville créée. Utilisez le formulaire ci-dessus pour en générer.
          </p>
        )}
      </div>

      <AlertDialog open={!!pendingDelete} onOpenChange={(o) => !o && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer la page ?</AlertDialogTitle>
            <AlertDialogDescription>
              La page de {pendingDelete?.city} sera définitivement supprimée.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminCityPages;
