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
import { Plus, ExternalLink, Loader2, Trash2, Zap, RefreshCw } from "lucide-react";
import { TOP_CITIES_FRANCE } from "@/data/topCitiesFrance";

const AdminCityPages = () => {
  const [city, setCity] = useState("");
  const [department, setDepartment] = useState("");
  const [generating, setGenerating] = useState(false);
  const [batchRunning, setBatchRunning] = useState(false);
  const [batchProgress, setBatchProgress] = useState<{ done: number; total: number; ok: number; skipped: number; failed: number } | null>(null);
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<{ id: string; city: string } | null>(null);
  const [pendingUnpublish, setPendingUnpublish] = useState<{ id: string; city: string } | null>(null);
  const [pendingRegenerate, setPendingRegenerate] = useState<any | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);

  const logAdminAction = async (payload: {
    action: string;
    target_type: string;
    target_id: string | null;
    metadata?: Record<string, unknown>;
  }) => {
    const { data: userData } = await supabase.auth.getUser();
    const admin_id = userData?.user?.id;
    if (!admin_id) return;
    await (supabase.from("admin_action_logs" as any) as any).insert({ admin_id, ...payload });
  };

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

  const handleBatchTop150 = async () => {
    if (batchRunning) return;
    const existingSlugs = new Set((pages ?? []).map((p: any) => (p.city as string).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")));
    const todo = TOP_CITIES_FRANCE.filter((c) => !existingSlugs.has(c.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")));
    if (todo.length === 0) {
      toast.success("Les 150 villes sont déjà générées.");
      return;
    }
    setBatchRunning(true);
    setBatchProgress({ done: 0, total: todo.length, ok: 0, skipped: 0, failed: 0 });
    let ok = 0, skipped = 0, failed = 0;
    for (let i = 0; i < todo.length; i++) {
      const c = todo[i];
      try {
        const { error } = await supabase.functions.invoke("generate-city-page", {
          body: { city: c.name, department: c.department },
        });
        if (error) { failed++; } else { ok++; }
      } catch {
        failed++;
      }
      setBatchProgress({ done: i + 1, total: todo.length, ok, skipped, failed });
      // throttle pour respecter rate-limit IA (gateway 429)
      await new Promise((r) => setTimeout(r, 1500));
    }
    setBatchRunning(false);
    toast.success(`Batch terminé : ${ok} créées, ${failed} échecs`);
    refetch();
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

  const handleRegenerate = async (page: any) => {
    if (regeneratingId) return;
    setRegeneratingId(page.id);
    try {
      const { error } = await supabase.functions.invoke("generate-city-page", {
        body: { city: page.city, department: page.department, force: true },
      });
      if (error) throw error;
      toast.success(`Contenu régénéré pour ${page.city}`);
      refetch();
    } catch (err: any) {
      toast.error(`Erreur : ${err.message}`);
    } finally {
      setRegeneratingId(null);
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
        <CardContent className="space-y-4">
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
            <Button onClick={handleGenerate} disabled={generating || batchRunning} className="gap-2">
              {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Générer
            </Button>
          </div>

          <div className="rounded-md border border-dashed p-4 space-y-2">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <p className="font-medium text-sm">Batch SEO programmatique</p>
                <p className="text-xs text-muted-foreground">
                  Génère les pages des 150 plus grandes villes de France. Les villes déjà créées sont ignorées. ~4 min pour 150 villes.
                </p>
              </div>
              <Button onClick={handleBatchTop150} disabled={batchRunning || generating} variant="secondary" className="gap-2">
                {batchRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
                Générer le top 150
              </Button>
            </div>
            {batchProgress && (
              <div className="text-xs text-muted-foreground">
                Progression : {batchProgress.done} / {batchProgress.total} · {batchProgress.ok} OK · {batchProgress.failed} échecs
              </div>
            )}
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
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRegenerate(page)}
                  disabled={!!regeneratingId}
                  title="Régénérer le contenu IA"
                >
                  {regeneratingId === page.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
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
