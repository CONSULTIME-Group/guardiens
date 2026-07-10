import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Loader2, Zap, ExternalLink, RefreshCw } from "lucide-react";
import { TOP_DOG_BREEDS, TOP_CAT_BREEDS } from "@/data/topBreeds";
import { slugify } from "@/lib/normalize";

interface BreedRow { species: string; breed: string; generated_at: string }

const AdminBreeds = () => {
  const [rows, setRows] = useState<BreedRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState<null | "dog" | "cat">(null);
  const [progress, setProgress] = useState<{ done: number; total: number; ok: number; failed: number } | null>(null);
  const [regenerating, setRegenerating] = useState<string | null>(null);
  const [pendingRegenerate, setPendingRegenerate] = useState<BreedRow | null>(null);

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

  const handleRegenerate = async (species: string, breed: string) => {
    const key = `${species}-${breed}`;
    if (regenerating) return;
    setRegenerating(key);
    try {
      const { error } = await supabase.functions.invoke("generate-breed-profile", {
        body: { species, breed, force: true },
      });
      if (error) throw error;
      toast.success(`Fiche régénérée : ${breed}`);
      await refresh();
    } catch (err: any) {
      toast.error(`Erreur : ${err.message}`);
    } finally {
      setRegenerating(null);
    }
  };

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
                  {list.map((r) => {
                    const key = `${r.species}-${r.breed}`;
                    return (
                      <li key={key} className="flex items-center justify-between gap-2">
                        <span className="truncate">{r.breed}</span>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => setPendingRegenerate(r)}
                            disabled={!!regenerating}
                            className="text-muted-foreground hover:text-primary disabled:opacity-50 p-1"
                            title="Régénérer la fiche IA"
                          >
                            {regenerating === key ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <RefreshCw className="w-3.5 h-3.5" />
                            )}
                          </button>
                          <Link to={`/races/${slugify(r.breed)}`} className="text-primary inline-flex items-center gap-1 text-xs">
                            Voir <ExternalLink className="w-3 h-3" />
                          </Link>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </CardContent>
            </Card>
          );
        })
      )}

      <AlertDialog open={!!pendingRegenerate} onOpenChange={(o) => !o && setPendingRegenerate(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Régénérer cette fiche de race ?</AlertDialogTitle>
            <AlertDialogDescription>
              La fiche existante de {pendingRegenerate?.breed} sera écrasée par une nouvelle génération IA. Action non annulable.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                const r = pendingRegenerate;
                if (!r) return;
                setPendingRegenerate(null);
                await handleRegenerate(r.species, r.breed);
                await logAdminAction({
                  action: "content_ai_regenerate",
                  target_type: "breed",
                  target_id: null,
                  metadata: { title: r.breed, species: r.species },
                });
              }}
            >
              Régénérer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminBreeds;
