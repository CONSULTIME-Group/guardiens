import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Loader2, Zap, ExternalLink } from "lucide-react";
import { TOP_DOG_BREEDS, TOP_CAT_BREEDS } from "@/data/topBreeds";

// Top 10 villes silos SEO (cohérent avec stratégie hub Lyon/Annecy/Grenoble + grandes villes).
const TOP_CITIES = [
  "Paris", "Lyon", "Marseille", "Toulouse", "Bordeaux",
  "Nantes", "Lille", "Annecy", "Grenoble", "Strasbourg",
];

// Sélection top races (10 chiens + 5 chats) pour un démarrage cadré.
const TOP_DOGS = TOP_DOG_BREEDS.slice(0, 10);
const TOP_CATS = TOP_CAT_BREEDS.slice(0, 5);

type Pair = { city: string; breed: string; species: "dog" | "cat" };

function buildPairs(cities: string[], species: "dog" | "cat", breeds: string[]): Pair[] {
  return cities.flatMap((c) => breeds.map((b) => ({ city: c, breed: b, species })));
}

const ALL_PAIRS: Pair[] = [
  ...buildPairs(TOP_CITIES, "dog", TOP_DOGS),
  ...buildPairs(TOP_CITIES, "cat", TOP_CATS),
];

const AdminLongTailArticles = () => {
  const [existingSlugs, setExistingSlugs] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number; ok: number; skipped: number; failed: number } | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const slugFor = (p: Pair) =>
    `garder-${p.breed.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}-a-${p.city.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}`;

  const refresh = async () => {
    setLoading(true);
    const slugs = ALL_PAIRS.map(slugFor);
    const { data } = await supabase.from("articles").select("slug").in("slug", slugs);
    const set = new Set((data || []).map((r: any) => r.slug as string));
    setExistingSlugs(set);
    // par défaut, on sélectionne ceux qui ne sont pas encore créés
    const next = new Set<string>();
    ALL_PAIRS.forEach((p) => { const s = slugFor(p); if (!set.has(s)) next.add(s); });
    setSelected(next);
    setLoading(false);
  };

  useEffect(() => { refresh(); }, []);

  const toggle = (slug: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(slug) ? next.delete(slug) : next.add(slug);
      return next;
    });
  };

  const run = async () => {
    if (running) return;
    toast.error("Module verrouillé, voir bannière ci-dessus");
    return;
    const todo = ALL_PAIRS.filter((p) => selected.has(slugFor(p)));
    if (todo.length === 0) { toast.info("Aucun article sélectionné."); return; }
    setRunning(true);
    setProgress({ done: 0, total: todo.length, ok: 0, skipped: 0, failed: 0 });
    let ok = 0, failed = 0, skipped = 0;
    for (let i = 0; i < todo.length; i++) {
      try {
        const { data, error } = await supabase.functions.invoke("generate-longtail-article", { body: todo[i] });
        if (error) failed++;
        else if ((data as any)?.skipped) skipped++;
        else ok++;
      } catch { failed++; }
      setProgress({ done: i + 1, total: todo.length, ok, skipped, failed });
      await new Promise((r) => setTimeout(r, 600));
    }
    setRunning(false);
    toast.success(`Lot terminé : ${ok} créés · ${skipped} ignorés · ${failed} échecs`);
    await refresh();
  };

  const totalGenerated = existingSlugs.size;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
          Articles longue traîne
        </h1>
        <p className="text-muted-foreground text-sm">
          {totalGenerated} / {ALL_PAIRS.length} combinaisons ville × race déjà créées (brouillon)
        </p>
      </div>

      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Zap className="w-4 h-4" /> Génération par lot
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="rounded-lg border border-destructive bg-destructive/10 p-4 space-y-2">
            <h2 className="text-sm font-semibold text-destructive">
              Module verrouillé — décision produit du 11/07/2026
            </h2>
            <p className="text-sm text-destructive/90">
              Le pattern ville × race contredit la stratégie SEO validée (fiches races = scope national, pages villes = AURA uniquement). La génération de 150 combinaisons avec 7 villes hors AURA (Paris, Marseille, Toulouse, Bordeaux, Nantes, Lille, Strasbourg) créerait des pages à faible E-E-A-T et risque de pénalité Helpful Content Update. Le module reste visible pour audit mais n'exécute plus rien tant que la logique n'est pas re-arbitrée.
            </p>
          </div>
          <p className="text-sm text-muted-foreground">
            Les articles sont créés en brouillon (non publiés). Vérifiez et publiez ensuite depuis Articles.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={run} disabled={true} className="disabled:opacity-50 disabled:cursor-not-allowed">
              {running ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Zap className="w-4 h-4 mr-2" />}
              Générer {selected.size} brouillon(s)
            </Button>
            <Button variant="ghost" onClick={refresh} disabled={running}>Rafraîchir</Button>
            <Link to="/admin/articles" className="text-sm text-primary inline-flex items-center gap-1">
              Articles <ExternalLink className="w-3 h-3" />
            </Link>
          </div>
          {progress && (
            <p className="text-sm text-muted-foreground">
              {progress.done}/{progress.total} · créés {progress.ok} · ignorés {progress.skipped} · échecs {progress.failed}
            </p>
          )}
        </CardContent>
      </Card>

      {loading ? (
        <p className="text-sm text-muted-foreground">Chargement…</p>
      ) : (
        TOP_CITIES.map((city) => (
          <Card key={city}>
            <CardHeader><CardTitle className="text-base">{city}</CardTitle></CardHeader>
            <CardContent>
              <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-sm">
                {ALL_PAIRS.filter((p) => p.city === city).map((p) => {
                  const slug = slugFor(p);
                  const exists = existingSlugs.has(slug);
                  return (
                    <li key={slug} className="flex items-center gap-2">
                      <Checkbox
                        id={slug}
                        checked={selected.has(slug)}
                        onCheckedChange={() => toggle(slug)}
                        disabled={running}
                      />
                      <label htmlFor={slug} className="flex-1 cursor-pointer">
                        <span className={exists ? "text-muted-foreground line-through" : ""}>
                          {p.species === "dog" ? "Chien" : "Chat"} · {p.breed}
                        </span>
                      </label>
                      {exists && (
                        <Link to={`/articles/${slug}`} className="text-primary inline-flex items-center gap-1 text-xs">
                          Voir <ExternalLink className="w-3 h-3" />
                        </Link>
                      )}
                    </li>
                  );
                })}
              </ul>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
};

export default AdminLongTailArticles;
