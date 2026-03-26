import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Plus, Trash2, Loader2, Building2, ExternalLink } from "lucide-react";

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
  const [region, setRegion] = useState("Auvergne-Rhône-Alpes");
  const [generating, setGenerating] = useState(false);

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
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/generate-department-page`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ department, region }),
        }
      );
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      toast.success(`Page département générée pour ${data.department}`);
      setDepartment("");
      queryClient.invalidateQueries({ queryKey: ["admin-departments"] });
    } catch (err: any) {
      toast.error("Erreur: " + err.message);
    } finally {
      setGenerating(false);
    }
  };

  const toggleMutation = useMutation({
    mutationFn: async ({ id, published }: { id: string; published: boolean }) => {
      const { error } = await (supabase.from("seo_department_pages" as any) as any).update({ published }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-departments"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase.from("seo_department_pages" as any) as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-departments"] });
      toast.success("Page département supprimée");
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Pages départements</h1>
        <p className="text-muted-foreground text-sm">{pages.length} départements</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Générer une page département</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3 flex-wrap">
            <Input
              placeholder="Département (ex: Rhône)"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="w-56"
            />
            <Input
              placeholder="Région"
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              className="w-56"
            />
            <Button onClick={generatePage} disabled={!department || generating} className="gap-2">
              {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              {generating ? "Génération..." : "Générer"}
            </Button>
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
                <p className="text-xs text-muted-foreground">{p.region}</p>
              </div>
              <Switch
                checked={p.published}
                onCheckedChange={(checked) => toggleMutation.mutate({ id: p.id, published: checked })}
              />
              <a href={`/departement/${p.slug}`} target="_blank" rel="noopener" className="text-muted-foreground hover:text-foreground">
                <ExternalLink className="h-4 w-4" />
              </a>
              <Button size="icon" variant="ghost" onClick={() => deleteMutation.mutate(p.id)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminDepartments;
