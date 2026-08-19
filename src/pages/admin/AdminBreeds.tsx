import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Loader2, Zap, ExternalLink, RefreshCw, Wand2, ListChecks, ImageDown } from "lucide-react";
import { TOP_DOG_BREEDS, TOP_CAT_BREEDS } from "@/data/topBreeds";
import { slugify } from "@/lib/normalize";
import { PET_SPECIES_LABELS } from "@/lib/petLabels";
import { withTimeout, TimeoutError } from "@/lib/withTimeout";
import {
  validateGenerationInput,
  findDuplicateFiche,
  computeMissingBreeds,
  type DeclaredPetRow,
} from "@/lib/adminBreedGeneration";

interface BreedRow { species: string; breed: string; generated_at: string; image_url: string | null }

/** Toutes les valeurs de l'enum pet_species, pas seulement chien/chat. */
const SPECIES_OPTIONS = Object.entries(PET_SPECIES_LABELS);

/**
 * Garde anti-blocage : l'appel de génération est long (deux passes IA,
 * recherche et rapatriement d'image) et sa promesse peut ne jamais se
 * résoudre si la connexion se fige. Sans délai maximal, l'état « en cours »
 * restait allumé pour toujours et la page était bloquée jusqu'au
 * rechargement (constaté en production le 19/08/2026). Avec withTimeout,
 * l'état retombe toujours ; la génération continue côté serveur.
 */
const GENERATION_TIMEOUT_MS = 150_000;
const REPATRIATE_TIMEOUT_MS = 60_000;

interface LastResult {
  breed: string;
  hasImage: boolean;
  imageDetail: string | null;
}

const AdminBreeds = () => {
  const [rows, setRows] = useState<BreedRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState<null | "dog" | "cat">(null);
  const [progress, setProgress] = useState<{ done: number; total: number; ok: number; failed: number } | null>(null);
  const [regenerating, setRegenerating] = useState<string | null>(null);
  const [pendingRegenerate, setPendingRegenerate] = useState<BreedRow | null>(null);

  // Génération à la demande
  const [formSpecies, setFormSpecies] = useState<string>("dog");
  const [formBreed, setFormBreed] = useState("");
  const [generating, setGenerating] = useState(false);
  const [lastResult, setLastResult] = useState<LastResult | null>(null);
  const formRef = useRef<HTMLDivElement>(null);

  // Rapatriement d'image seul (fiches existantes sans image)
  const [repatriating, setRepatriating] = useState<string | null>(null);

  // Ciblage : races déclarées sans fiche
  const [petsRows, setPetsRows] = useState<DeclaredPetRow[]>([]);
  const [livePropertyIds, setLivePropertyIds] = useState<ReadonlySet<string>>(new Set());

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
      const { data, error } = await withTimeout(
        supabase.functions.invoke("generate-breed-profile", {
          body: { species, breed, force: true },
        }),
        GENERATION_TIMEOUT_MS,
        "régénération de la fiche",
      );
      if (error) throw error;
      if (data?.image_status === "stored") {
        toast.success(`Fiche régénérée, image rapatriée : ${breed}`);
      } else {
        toast.warning(`Fiche régénérée SANS image : ${breed}${data?.image_detail ? ` (${data.image_detail})` : ""}`);
      }
      await refresh();
    } catch (err: any) {
      if (err instanceof TimeoutError) {
        toast.warning("La régénération dépasse le délai d'attente mais continue côté serveur. Rechargez la liste dans un instant.");
        await refresh();
      } else {
        toast.error(`Erreur : ${err.message}`);
      }
    } finally {
      setRegenerating(null);
    }
  };

  const handleRepatriate = async (species: string, breed: string) => {
    const key = `${species}-${breed}`;
    if (repatriating) return;
    setRepatriating(key);
    try {
      const { data, error } = await withTimeout(
        supabase.functions.invoke("generate-breed-profile", {
          body: { species, breed, image_only: true },
        }),
        REPATRIATE_TIMEOUT_MS,
        "rapatriement de l'image",
      );
      if (error) throw error;
      if (data?.image_status === "stored") {
        toast.success(`Image rapatriée dans notre stockage : ${breed}`);
      } else {
        toast.warning(`Toujours pas d'image pour ${breed} : ${data?.image_detail ?? "raison inconnue"}`);
      }
      await logAdminAction({
        action: "content_ai_image_repatriate",
        target_type: "breed",
        target_id: null,
        metadata: { title: breed, species, image_status: data?.image_status ?? "none" },
      });
      await refresh();
    } catch (err: any) {
      if (err instanceof TimeoutError) {
        toast.warning("Le rapatriement dépasse le délai d'attente mais continue côté serveur.");
      } else {
        toast.error(`Erreur : ${err.message}`);
      }
    } finally {
      setRepatriating(null);
    }
  };

  const refresh = async () => {
    setLoading(true);
    const [{ data: breeds }, { data: pets }, { data: liveSits }] = await Promise.all([
      supabase.from("breed_profiles").select("species, breed, generated_at, image_url").order("species").order("breed"),
      supabase.from("pets").select("species, breed, property_id"),
      supabase.from("sits").select("property_id").eq("status", "published"),
    ]);
    setRows((breeds || []) as BreedRow[]);
    setPetsRows((pets || []) as DeclaredPetRow[]);
    setLivePropertyIds(
      new Set((liveSits || []).map((s: any) => s.property_id).filter(Boolean)),
    );
    setLoading(false);
  };

  useEffect(() => { refresh(); }, []);

  // --- Génération à la demande -------------------------------------------

  const validation = validateGenerationInput(formSpecies, formBreed);
  const duplicate = validation.ok
    ? findDuplicateFiche(validation.species, validation.breed, rows)
    : null;

  const handleGenerate = async () => {
    const v = validation;
    if (!v.ok) {
      toast.error(v.reason ?? "Saisie incomplète.");
      return;
    }
    if (generating) return;
    setGenerating(true);
    setLastResult(null);
    // Doublon détecté : on régénère la fiche EXISTANTE (nom canonique),
    // jamais de création silencieuse d'une variante.
    const targetBreed = duplicate ? duplicate.breed : v.breed;
    const force = !!duplicate;
    try {
      const { data, error } = await withTimeout(
        supabase.functions.invoke("generate-breed-profile", {
          body: { species: v.species, breed: targetBreed, force },
        }),
        GENERATION_TIMEOUT_MS,
        "génération de la fiche",
      );
      if (error) throw error;
      // Bilan visible à l'écran, y compris (surtout) quand l'image manque.
      const hasImage = data?.image_status === "stored";
      const imageDetail = data?.image_detail ?? null;
      setLastResult({ breed: targetBreed, hasImage, imageDetail });
      if (hasImage) {
        toast.success(`${force ? "Fiche régénérée" : "Fiche générée"}, image rapatriée : ${targetBreed}`);
      } else {
        toast.warning(
          `Fiche ${force ? "régénérée" : "générée"} SANS image : ${targetBreed}${imageDetail ? ` (${imageDetail})` : ""}`,
        );
      }
      await logAdminAction({
        action: force ? "content_ai_regenerate" : "content_ai_generate",
        target_type: "breed",
        target_id: null,
        metadata: { title: targetBreed, species: v.species, image_status: data?.image_status ?? "none" },
      });
      setFormBreed("");
      await refresh();
    } catch (err: any) {
      if (err instanceof TimeoutError) {
        // La fonction continue côté serveur : l'état retombe, la liste se
        // rafraîchit, la fiche apparaîtra dès qu'elle est écrite.
        toast.warning("La génération dépasse le délai d'attente mais continue côté serveur. Rechargez la liste dans un instant.");
        await refresh();
      } else {
        toast.error(`Erreur : ${err.message}`);
      }
    } finally {
      setGenerating(false);
    }
  };

  /**
   * Pré-remplissage depuis la liste de ciblage : ne touche JAMAIS à l'état
   * « en cours » (generating/repatriating). Seule une génération réellement
   * lancée allume cet état, et il retombe toujours (try/finally + délai
   * maximal withTimeout).
   */
  const prefillForm = (species: string, breed: string) => {
    setFormSpecies(species);
    setFormBreed(breed);
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  // --- Ciblage ------------------------------------------------------------

  const missingBreeds = useMemo(
    () => computeMissingBreeds(petsRows, rows, livePropertyIds),
    [petsRows, rows, livePropertyIds],
  );

  // --- Lot ----------------------------------------------------------------

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
        const { error } = await withTimeout(
          supabase.functions.invoke("generate-breed-profile", {
            body: { species, breed: todo[i] },
          }),
          GENERATION_TIMEOUT_MS,
          "génération par lot",
        );
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
  const withoutImage = rows.filter((r) => !r.image_url).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-foreground">Fiches de race</h1>
        <p className="text-muted-foreground text-sm">
          {rows.length} fiches générées
          {withoutImage > 0 ? ` · ${withoutImage} sans image` : ""}
        </p>
      </div>

      <Card ref={formRef}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Wand2 className="w-4 h-4" /> Générer une fiche à la demande
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-[220px_1fr]">
            <div className="space-y-2">
              <Label htmlFor="breed-species">Espèce</Label>
              <Select value={formSpecies} onValueChange={setFormSpecies}>
                <SelectTrigger id="breed-species">
                  <SelectValue placeholder="Espèce" />
                </SelectTrigger>
                <SelectContent>
                  {SPECIES_OPTIONS.map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="breed-name">Race</Label>
              <Input
                id="breed-name"
                value={formBreed}
                onChange={(e) => setFormBreed(e.target.value)}
                placeholder="Ex. Cane corso"
                onKeyDown={(e) => { if (e.key === "Enter") handleGenerate(); }}
              />
            </div>
          </div>

          {duplicate && (
            <p className="text-sm rounded-lg border border-warning bg-warning-soft text-warning-foreground px-3 py-2">
              Une fiche existe déjà pour ce couple espèce + race : « {duplicate.breed} »
              (après normalisation de votre saisie). Le bouton ci-dessous régénère cette
              fiche existante : aucun doublon ne sera créé.
            </p>
          )}

          <div className="flex items-center gap-3">
            <Button onClick={handleGenerate} disabled={generating}>
              {generating ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Wand2 className="w-4 h-4 mr-2" />
              )}
              {duplicate ? "Régénérer la fiche existante" : "Générer la fiche"}
            </Button>
            <p className="text-xs text-muted-foreground">
              L'image est rapatriée dans notre stockage pendant la génération.
            </p>
          </div>

          {lastResult && (
            <p
              className={`text-sm rounded-lg border px-3 py-2 ${
                lastResult.hasImage
                  ? "border-success bg-success-soft text-success"
                  : "border-warning bg-warning-soft text-warning-foreground"
              }`}
            >
              {lastResult.hasImage
                ? `« ${lastResult.breed} » : fiche en ligne, image rapatriée dans notre stockage.`
                : `« ${lastResult.breed} » : fiche en ligne SANS image (${lastResult.imageDetail ?? "raison inconnue"}). La carte de repli aquarelle s'affiche en attendant ; relancez le rapatriement depuis la liste des fiches ci-dessous.`}
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ListChecks className="w-4 h-4" /> Races déclarées sans fiche ({missingBreeds.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {missingBreeds.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Toutes les races déclarées par les propriétaires ont une fiche.
            </p>
          ) : (
            <ul className="divide-y divide-border text-sm">
              {missingBreeds.map((m) => (
                <li key={`${m.species}-${m.key}`} className="flex items-center justify-between gap-3 py-2">
                  <div className="min-w-0">
                    <p className="font-medium truncate">{m.displayBreed}</p>
                    <p className="text-xs text-muted-foreground">
                      {PET_SPECIES_LABELS[m.species] ?? m.species}
                      {" · "}{m.animals} {m.animals > 1 ? "animaux" : "animal"}
                      {" · "}{m.liveSits} {m.liveSits > 1 ? "annonces en ligne" : "annonce en ligne"}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="shrink-0"
                    onClick={() => prefillForm(m.species, m.displayBreed)}
                  >
                    Générer
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

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
        SPECIES_OPTIONS.map(([sp]) => {
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
                          {!r.image_url && (
                            <button
                              type="button"
                              onClick={() => handleRepatriate(r.species, r.breed)}
                              disabled={!!repatriating}
                              className="text-warning hover:text-primary disabled:opacity-50 p-1"
                              title="Sans image : rapatrier depuis Wikimedia (sans toucher au texte)"
                            >
                              {repatriating === key ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <ImageDown className="w-3.5 h-3.5" />
                              )}
                            </button>
                          )}
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
