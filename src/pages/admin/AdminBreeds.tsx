import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, Zap, ExternalLink } from "lucide-react";
import { TOP_DOG_BREEDS, TOP_CAT_BREEDS } from "@/data/topBreeds";
import { slugify } from "@/lib/normalize";

interface BreedRow { species: string; breed: string; generated_at: string }

const AdminBreeds = () => {
  const [rows, setRows] = useState<BreedRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState<null | "dog" | "cat">(null);
  const [progress, setProgress] = useState<{ done: number; total: number; ok: number; failed: number } | null>(null);

  const refresh = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("breed_profiles")
      .select("species, breed, generated_at")
      .order("species").order("breed");
    setRows((data || []) as BreedRow[]);
    setLoading(false);
  };

  useEffect(() => { refresh(); }, []);

  const runBatch = async (species: "dog" | "cat") => {
    if (running) return;
    const list = species === "dog" ? TOP_DOG_BREEDS : TOP_CAT_BREEDS;
    const existing = new Set(rows.filter((r) => r.species === species).map((r) => r.breed.toLowerCase()));
    const todo = list.filter((b) => !existing.has(b.toLowerCase()));
    if (todo.length === 0) {
      toast.success(`Toutes les races ${species === "dog" ? "chien" : "chat"} sont déjà générées.`);
      return;
    }
    setRunning(species);
    setProgress({ done: 0, total: todo.length, ok: 0, failed: 0 });
    let ok = 0, failed = 0;
    for (let i = 0; i < todo.length; i++) {
      try {
        const { error } = await supabase.functions.invoke("generate-breed-profile", {
          body: { species, breed: todo[i] },
        });
        if (error) failed++; else ok++;
      } catch { failed++; }
      setProgress({ done: i + 1, total: todo.length, ok, failed });
      await new Promise((r) => setTimeout(r, 1500));
    }
    setRunning(null);
    toast.success(`Batch ${species} terminé : ${ok} créées, ${failed} échecs`);
    await refresh();
  };

  const byKind = (s: string) => rows.filter((r) => r.species === s);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-foreground">Fiches de race</h1>
        <p className="text-muted-foreground text-sm">{rows.length} fiches générées</p>
      </div>

      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><Zap className="w-4 h-4" /> Génération par lot</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-3">
            <Button onClick={() => runBatch("dog")} disabled={!!running}>
              {running === "dog" ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Zap className="w-4 h-4 mr-2" />}
              Top 40 races de chien
            </Button>
            <Button onClick={() => runBatch("cat")} disabled={!!running} variant="secondary">
              {running === "cat" ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Zap className="w-4 h-4 mr-2" />}
              Top 20 races de chat
            </Button>
          </div>
          {progress && (
            <p className="text-sm text-muted-foreground">
              {progress.done}/{progress.total} – réussites : {progress.ok} · échecs : {progress.failed}
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            Les races déjà présentes sont ignorées. Throttling 1,5 s entre chaque appel.
          </p>
        </CardContent>
      </Card>

      {loading ? (
        <p className="text-sm text-muted-foreground">Chargement…</p>
      ) : (
        ["dog", "cat", "horse", "bird", "rodent", "farm_animal"].map((sp) => {
          const list = byKind(sp);
          if (list.length === 0) return null;
          return (
            <Card key={sp}>
              <CardHeader><CardTitle className="text-base capitalize">{sp} ({list.length})</CardTitle></CardHeader>
              <CardContent>
                <ul className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                  {list.map((r) => (
                    <li key={`${r.species}-${r.breed}`} className="flex items-center justify-between">
                      <span>{r.breed}</span>
                      <Link to={`/races/${slugify(r.breed)}`} className="text-primary inline-flex items-center gap-1 text-xs">
                        Voir <ExternalLink className="w-3 h-3" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );
};

export default AdminBreeds;
