import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Trash2, Eye, Loader2, MapPin, ExternalLink, Sparkles, X } from "lucide-react";

interface CityGuide {
  id: string;
  city: string;
  slug: string;
  department: string;
  published: boolean;
  created_at: string;
}

const AdminGuides = () => {
  const queryClient = useQueryClient();
  const [city, setCity] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [department, setDepartment] = useState("");
  const [generating, setGenerating] = useState(false);

  const { data: guides = [], isLoading } = useQuery({
    queryKey: ["admin-guides"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("city_guides" as any)
        .select("*")
        .order("department")
        .order("city");
      if (error) throw error;
      return (data || []) as unknown as CityGuide[];
    },
  });

  const { data: placeCounts = {} } = useQuery({
    queryKey: ["admin-guide-place-counts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("city_guide_places" as any)
        .select("city_guide_id");
      if (error) throw error;
      const counts: Record<string, number> = {};
      ((data || []) as any[]).forEach((p: any) => {
        counts[p.city_guide_id] = (counts[p.city_guide_id] || 0) + 1;
      });
      return counts;
    },
  });

  // Demandes de guides (villes avec annonces actives mais sans guide)
  const { data: requests = [] } = useQuery({
    queryKey: ["admin-guide-requests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("guide_requests" as any)
        .select("*")
        .eq("status", "pending")
        .order("active_sits_count", { ascending: false });
      if (error) throw error;
      return (data || []) as any[];
    },
  });

  const dismissRequest = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase.from("guide_requests" as any) as any)
        .update({ status: "dismissed" })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-guide-requests"] });
      window.dispatchEvent(new Event("admin-badges-refresh"));
      toast.success("Demande écartée");
    },
  });

  const prefillFromRequest = (req: any) => {
    setCity(req.city || "");
    setPostalCode(req.postal_code || "");
    setDepartment(req.department || "");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const generateGuide = async () => {
    if (!city) return;
    setGenerating(true);
    try {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/generate-city-guide`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ city, postal_code: postalCode, department }),
        }
      );
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      toast.success(`Guide généré pour ${data.city} (${data.places_count || 0} lieux)`);
      setCity("");
      setPostalCode("");
      setDepartment("");
      queryClient.invalidateQueries({ queryKey: ["admin-guides"] });
      queryClient.invalidateQueries({ queryKey: ["admin-guide-place-counts"] });
    } catch (err: any) {
      toast.error("Erreur: " + err.message);
    } finally {
      setGenerating(false);
    }
  };

  const toggleMutation = useMutation({
    mutationFn: async ({ id, published }: { id: string; published: boolean }) => {
      const { error } = await (supabase.from("city_guides" as any) as any).update({ published }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-guides"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase.from("city_guides" as any) as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-guides"] });
      toast.success("Guide supprimé");
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Guides locaux</h1>
        <p className="text-muted-foreground text-sm">
          {guides.length} guides • Générés par IA avec lieux réels
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Générer un guide</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3 flex-wrap">
            <Input
              placeholder="Ville (ex: Lyon)"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="w-48"
            />
            <Input
              placeholder="Code postal"
              value={postalCode}
              onChange={(e) => setPostalCode(e.target.value)}
              className="w-32"
            />
            <Input
              placeholder="Département (ex: Rhône)"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="w-48"
            />
            <Button onClick={generateGuide} disabled={!city || generating} className="gap-2">
              {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              {generating ? "Génération..." : "Générer"}
            </Button>
          </div>
          {generating && (
            <p className="text-xs text-muted-foreground mt-2">
              ⏳ La génération prend ~30s (intro + 5 catégories de lieux)
            </p>
          )}
        </CardContent>
      </Card>

      {requests.length > 0 && (
        <Card className="border-amber-500/40 bg-amber-50/40 dark:bg-amber-500/5">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-amber-600" />
              Villes en demande ({requests.length})
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Annonces actives sans guide local rattaché. Le guide se liera automatiquement à toutes les annonces dès sa publication.
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {requests.map((req) => (
                <div
                  key={req.id}
                  className="flex items-center gap-3 p-3 bg-background border border-border rounded-lg"
                >
                  <MapPin className="h-4 w-4 text-amber-600 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{req.city}</p>
                    <p className="text-xs text-muted-foreground">
                      {req.department && `Dépt ${req.department} • `}
                      {req.active_sits_count} annonce{req.active_sits_count > 1 ? "s" : ""} active{req.active_sits_count > 1 ? "s" : ""}
                    </p>
                  </div>
                  <Button size="sm" variant="default" onClick={() => prefillFromRequest(req)} className="gap-1.5">
                    <Plus className="h-3.5 w-3.5" /> Créer le guide
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => dismissRequest.mutate(req.id)} title="Écarter">
                    <X className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />)}
        </div>
      ) : (
        <div className="space-y-2">
          {guides.map((guide) => (
            <div
              key={guide.id}
              className="flex items-center gap-3 p-4 bg-card border border-border rounded-lg"
            >
              <MapPin className="h-4 w-4 text-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm text-foreground">{guide.city}</p>
                <p className="text-xs text-muted-foreground">
                  {guide.department} • {(placeCounts as any)[guide.id] || 0} lieux
                </p>
              </div>
              <Switch
                checked={guide.published}
                onCheckedChange={(checked) => toggleMutation.mutate({ id: guide.id, published: checked })}
              />
              <a
                href={`/guide/${guide.slug}`}
                target="_blank"
                rel="noopener"
                className="text-muted-foreground hover:text-foreground"
              >
                <ExternalLink className="h-4 w-4" />
              </a>
              <Button size="icon" variant="ghost" onClick={() => deleteMutation.mutate(guide.id)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminGuides;
