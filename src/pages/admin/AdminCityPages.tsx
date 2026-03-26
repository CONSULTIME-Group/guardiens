import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, ExternalLink, Loader2, Trash2 } from "lucide-react";

const DEPARTMENTS_AURA = [
  "Ain", "Allier", "Ardèche", "Cantal", "Drôme",
  "Isère", "Loire", "Haute-Loire", "Puy-de-Dôme",
  "Rhône", "Savoie", "Haute-Savoie",
];

const AdminCityPages = () => {
  const [city, setCity] = useState("");
  const [department, setDepartment] = useState(DEPARTMENTS_AURA[0]);
  const [generating, setGenerating] = useState(false);

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
      const { data, error } = await supabase.functions.invoke("generate-city-page", {
        body: { city: city.trim(), department },
      });
      if (error) throw error;
      toast.success(`Page créée pour ${city}`);
      setCity("");
      refetch();
    } catch (err: any) {
      toast.error(`Erreur : ${err.message}`);
    } finally {
      setGenerating(false);
    }
  };

  const handleDelete = async (id: string, cityName: string) => {
    if (!confirm(`Supprimer la page de ${cityName} ?`)) return;
    const { error } = await supabase
      .from("seo_city_pages" as any)
      .delete()
      .eq("id", id);
    if (error) {
      toast.error("Erreur lors de la suppression");
    } else {
      toast.success("Page supprimée");
      refetch();
    }
  };

  const handleTogglePublish = async (id: string, published: boolean) => {
    const { error } = await supabase
      .from("seo_city_pages" as any)
      .update({ published: !published })
      .eq("id", id);
    if (error) {
      toast.error("Erreur");
    } else {
      refetch();
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Pages SEO Villes</h1>
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
            <select
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="h-10 px-3 rounded-md border border-input bg-background text-sm"
            >
              {DEPARTMENTS_AURA.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
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
                  <span className="text-xs text-muted-foreground">{page.department}</span>
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
                  onClick={() => handleDelete(page.id, page.city)}
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
    </div>
  );
};

export default AdminCityPages;
