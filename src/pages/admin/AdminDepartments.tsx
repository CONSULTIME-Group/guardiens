import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
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
import { Plus, Trash2, Loader2, Building2, ExternalLink, Zap } from "lucide-react";
import { DEPT_NAMES } from "@/lib/departments";

interface DepartmentPage {
  id: string;
  department: string;
  slug: string;
  region: string;
  published: boolean;
  created_at: string;
}

const AdminDepartments = () => {
  const queryClient = useQueryClient();
  const [department, setDepartment] = useState("");
  const [region, setRegion] = useState("");
  const [generating, setGenerating] = useState(false);
  const [batchRunning, setBatchRunning] = useState(false);
  const [batchProgress, setBatchProgress] = useState<{ done: number; total: number; ok: number; failed: number } | null>(null);
  const [pendingDelete, setPendingDelete] = useState<DepartmentPage | null>(null);
  const [pendingUnpublish, setPendingUnpublish] = useState<DepartmentPage | null>(null);

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

  const { data: pages = [], isLoading } = useQuery({
    queryKey: ["admin-departments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("seo_department_pages" as any)
        .select("*")
        .order("department");
      if (error) throw error;
      return (data || []) as unknown as DepartmentPage[];
    },
  });

  const generatePage = async () => {
    if (!department) return;
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-department-page", {
        body: { department, region: region.trim() || undefined },
      });
      if (error) throw error;
      toast.success(`Page département générée pour ${data.department}`);
      setDepartment("");
      setRegion("");
      queryClient.invalidateQueries({ queryKey: ["admin-departments"] });
    } catch (err: any) {
      toast.error("Erreur: " + err.message);
    } finally {
      setGenerating(false);
    }
  };

  const handleBatchAll = async () => {
    if (batchRunning) return;
    const slugify = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    const existing = new Set(pages.map((p) => slugify(p.department)));
    const todo = Object.values(DEPT_NAMES).filter((name) => !existing.has(slugify(name)));
    if (todo.length === 0) {
      toast.success("Tous les départements sont déjà générés.");
      return;
    }
    setBatchRunning(true);
    setBatchProgress({ done: 0, total: todo.length, ok: 0, failed: 0 });
    let ok = 0, failed = 0;
    for (let i = 0; i < todo.length; i++) {
      try {
        const { error } = await supabase.functions.invoke("generate-department-page", {
          body: { department: todo[i] },
        });
        if (error) failed++; else ok++;
      } catch { failed++; }
      setBatchProgress({ done: i + 1, total: todo.length, ok, failed });
      await new Promise((r) => setTimeout(r, 1500));
    }
    setBatchRunning(false);
    toast.success(`Batch terminé : ${ok} créés, ${failed} échecs`);
    queryClient.invalidateQueries({ queryKey: ["admin-departments"] });
  };

  const toggleMutation = useMutation({
    mutationFn: async ({ id, published }: { id: string; published: boolean }) => {
      const { error } = await (supabase.from("seo_department_pages" as any) as any).update({ published }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["admin-departments"] });
      toast.success(vars.published ? "Page publiée" : "Page dépubliée");
    },
    onError: (err: any) => toast.error("Erreur: " + err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase.from("seo_department_pages" as any) as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-departments"] });
      toast.success("Page département supprimée");
      setPendingDelete(null);
    },
    onError: (err: any) => toast.error("Erreur: " + err.message),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-foreground">Pages départements</h1>
        <p className="text-muted-foreground text-sm">{pages.length} départements</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Générer une page département</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3 flex-wrap">
            <Input
              placeholder="Département (ex: Rhône)"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="w-56"
            />
            <Input
              placeholder="Région (optionnel)"
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              className="w-56"
            />
            <Button onClick={generatePage} disabled={!department || generating || batchRunning} className="gap-2">
              {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              {generating ? "Génération..." : "Générer"}
            </Button>
          </div>

          <div className="rounded-md border border-dashed p-4 space-y-2">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <p className="font-medium text-sm">Batch SEO programmatique</p>
                <p className="text-xs text-muted-foreground">
                  Génère les pages des 101 départements français (DOM-TOM inclus). Départements déjà créés ignorés. ~3 min.
                </p>
              </div>
              <Button onClick={handleBatchAll} disabled={batchRunning || generating} variant="secondary" className="gap-2">
                {batchRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
                Générer tous les départements
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

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />)}
        </div>
      ) : (
        <div className="space-y-2">
          {pages.map((p) => (
            <div key={p.id} className="flex items-center gap-3 p-4 bg-card border border-border rounded-lg">
              <Building2 className="h-4 w-4 text-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm text-foreground">{p.department}</p>
                {p.region && <p className="text-xs text-muted-foreground">{p.region}</p>}
              </div>
              <Switch
                checked={p.published}
                disabled={toggleMutation.isPending}
                onCheckedChange={(checked) => {
                  if (!checked) {
                    setPendingUnpublish(p);
                  } else {
                    toggleMutation.mutate({ id: p.id, published: true });
                  }
                }}
              />
              <a href={`/departement/${p.slug}`} target="_blank" rel="noopener" className="text-muted-foreground hover:text-foreground">
                <ExternalLink className="h-4 w-4" />
              </a>
              <Button size="icon" variant="ghost" onClick={() => setPendingDelete(p)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}
          {pages.length === 0 && (
            <p className="text-center text-muted-foreground py-8">
              Aucune page département créée.
            </p>
          )}
        </div>
      )}

      <AlertDialog open={!!pendingDelete} onOpenChange={(o) => !o && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette page département ?</AlertDialogTitle>
            <AlertDialogDescription>
              La page de {pendingDelete?.department} sera définitivement supprimée.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => pendingDelete && deleteMutation.mutate(pendingDelete.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!pendingUnpublish} onOpenChange={(o) => !o && setPendingUnpublish(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Dépublier cette page département ?</AlertDialogTitle>
            <AlertDialogDescription>
              La page de {pendingUnpublish?.department}, potentiellement indexée par Google, sera retirée du site public.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                const p = pendingUnpublish;
                if (!p) return;
                setPendingUnpublish(null);
                await toggleMutation.mutateAsync({ id: p.id, published: false });
                await logAdminAction({
                  action: "content_unpublish",
                  target_type: "department",
                  target_id: p.id,
                  metadata: { title: p.department },
                });
              }}
            >
              Dépublier
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminDepartments;
