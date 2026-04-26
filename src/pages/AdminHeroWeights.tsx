/**
 * /admin/hero-weights
 * ----------------------------------------------------------------------------
 * Interface admin pour ajuster en direct les poids cibles de répartition des
 * hero (animaux/plantes, maison, entraide, village & partage).
 *
 * - Lecture/écriture sur la table `hero_weights` (singleton, RLS admin).
 * - Aperçu en temps réel : la simulation tourne avec les poids EN COURS DE
 *   MODIFICATION (avant sauvegarde) pour valider l'effet visuellement.
 * - Sauvegarde déclenche un broadcast realtime → tous les visiteurs voient
 *   les nouveaux hero immédiatement.
 *
 * Garde-fou : page entièrement bloquée si l'utilisateur n'est pas admin.
 */

import { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAdmin } from "@/hooks/useAdmin";
import { useAuth } from "@/contexts/AuthContext";
import { useHeroWeights } from "@/hooks/useHeroWeights";
import {
  HERO_BANK,
  getSitterHeroImage,
  getCategoryByBankIndex,
  validateHeroBank,
  type HeroCategoryName,
  type HeroWeights,
  DEFAULT_HERO_WEIGHTS,
} from "@/lib/heroBank";
import { toast } from "sonner";

const CATEGORY_LABELS: Record<HeroCategoryName, string> = {
  animals: "Animaux & plantes",
  home: "Maison",
  mutual_aid: "Entraide",
  village: "Village & partage",
};

const CATEGORY_HINTS: Record<HeroCategoryName, string> = {
  animals: "70 images : chiens, chats, NAC, jardins, plantes",
  home: "10 images : intérieurs, cuisine, véranda, fauteuil",
  mutual_aid: "10 images : panier déposé, plante passée, clés transmises",
  village: "10 images : place, marché, tablée, jardin partagé",
};

const CATEGORY_COLORS: Record<HeroCategoryName, string> = {
  animals: "bg-emerald-500",
  home: "bg-amber-500",
  mutual_aid: "bg-rose-500",
  village: "bg-sky-500",
};

const PRESETS: Array<{ name: string; w: HeroWeights }> = [
  { name: "Équilibré (défaut)", w: { animals: 40, home: 20, mutual_aid: 20, village: 20 } },
  { name: "100% équilibré", w: { animals: 25, home: 25, mutual_aid: 25, village: 25 } },
  { name: "Centré animaux", w: { animals: 70, home: 10, mutual_aid: 10, village: 10 } },
  { name: "Centré entraide", w: { animals: 30, home: 20, mutual_aid: 35, village: 15 } },
  { name: "Centré village", w: { animals: 25, home: 20, mutual_aid: 20, village: 35 } },
];

const SIM_SAMPLE = 5_000;

/* ───────────────────────── Helpers ───────────────────────── */

function genUUID(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function simulateDistribution(
  w: HeroWeights
): Record<HeroCategoryName, number> {
  const counts: Record<HeroCategoryName, number> = {
    animals: 0,
    home: 0,
    mutual_aid: 0,
    village: 0,
  };
  const urlToIdx = new Map<string, number>();
  HERO_BANK.forEach((url, idx) => urlToIdx.set(url, idx));

  for (let i = 0; i < SIM_SAMPLE; i++) {
    const url = getSitterHeroImage(genUUID(), w);
    const idx = urlToIdx.get(url);
    if (idx === undefined) continue;
    counts[getCategoryByBankIndex(idx)]++;
  }
  return counts;
}

/* ───────────────────────── Page ───────────────────────── */

export default function AdminHeroWeights() {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdmin();
  const navigate = useNavigate();
  const liveWeights = useHeroWeights(); // poids actuellement actifs en BDD

  const [draft, setDraft] = useState<HeroWeights>(liveWeights);
  const [saving, setSaving] = useState(false);

  // Synchronise le brouillon quand les poids serveur changent (autre admin
  // ou première hydratation).
  useEffect(() => {
    setDraft(liveWeights);
  }, [liveWeights]);

  const total = draft.animals + draft.home + draft.mutual_aid + draft.village;
  const isDirty =
    draft.animals !== liveWeights.animals ||
    draft.home !== liveWeights.home ||
    draft.mutual_aid !== liveWeights.mutual_aid ||
    draft.village !== liveWeights.village;
  // Validation : on bloque la sauvegarde tant qu'il reste une erreur bloquante.
  const validation = useMemo(() => validateHeroBank(draft), [draft]);
  const hasErrors = validation.issues.some((i) => i.severity === "error");
  const warnings = validation.issues.filter((i) => i.severity === "warning");
  const errors = validation.issues.filter((i) => i.severity === "error");

  const canSave = isDirty && total > 0 && !saving && !hasErrors;

  // Aperçu : simulation sur 5k UUIDs avec les poids en cours d'édition.
  // Calculée à la demande pour ne pas figer l'UI pendant le drag des sliders.
  const simulation = useMemo(() => simulateDistribution(draft), [draft]);

  /* ── Garde-fou auth ── */
  if (authLoading || adminLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">
        Vérification des accès…
      </div>
    );
  }
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <div className="text-center space-y-3">
          <p className="text-sm">Cette page est réservée aux administrateurs.</p>
          <button
            onClick={() => navigate("/login?redirect=/admin/hero-weights")}
            className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm"
          >
            Se connecter
          </button>
        </div>
      </div>
    );
  }
  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <div className="text-center space-y-3">
          <p className="text-sm text-muted-foreground">
            Accès refusé : rôle administrateur requis.
          </p>
          <Link to="/" className="text-sm underline">
            Retour à l'accueil
          </Link>
        </div>
      </div>
    );
  }

  /* ── Save ── */
  async function handleSave() {
    if (hasErrors) {
      toast.error("Configuration invalide : corrigez les erreurs avant d'enregistrer.");
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("hero_weights")
      .update({
        weight_animals: draft.animals,
        weight_home: draft.home,
        weight_mutual_aid: draft.mutual_aid,
        weight_village: draft.village,
        updated_by: user!.id,
      })
      .eq("id", 1);
    setSaving(false);
    if (error) {
      toast.error(`Échec : ${error.message}`);
    } else {
      toast.success("Poids enregistrés. Effet immédiat sur tous les profils.");
    }
  }

  function applyPreset(w: HeroWeights) {
    setDraft(w);
  }

  function setOne(cat: HeroCategoryName, value: number) {
    setDraft((d) => ({ ...d, [cat]: Math.max(0, Math.min(100, value)) }));
  }

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Admin — Poids des hero</title>
        <meta name="robots" content="noindex,nofollow" />
      </Helmet>

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        {/* En-tête */}
        <header className="space-y-2">
          <div className="flex items-baseline justify-between gap-4 flex-wrap">
            <h1 className="text-2xl font-heading font-bold">
              Poids des hero — administration
            </h1>
            <Link
              to="/test/hero-distribution"
              className="text-xs underline text-muted-foreground hover:text-foreground"
            >
              Voir la page de debug détaillée →
            </Link>
          </div>
          <p className="text-sm text-muted-foreground">
            Ajustez la répartition cible entre les quatre catégories thématiques.
            Les modifications prennent effet <strong>immédiatement</strong> pour
            tous les visiteurs (les profils existants verront leur hero
            redistribué).
          </p>
        </header>

        {/* Bannière de validation : erreurs bloquantes + warnings */}
        {(errors.length > 0 || warnings.length > 0) && (
          <section
            className={`rounded-lg border p-4 space-y-2 ${
              errors.length > 0
                ? "border-destructive/40 bg-destructive/5"
                : "border-amber-500/40 bg-amber-500/5"
            }`}
            role={errors.length > 0 ? "alert" : "status"}
          >
            <div className="flex items-center gap-2">
              <span
                className={`text-sm font-semibold ${
                  errors.length > 0 ? "text-destructive" : "text-amber-700 dark:text-amber-400"
                }`}
              >
                {errors.length > 0
                  ? `❌ ${errors.length} erreur${errors.length > 1 ? "s" : ""} bloquante${errors.length > 1 ? "s" : ""}`
                  : `⚠️ ${warnings.length} avertissement${warnings.length > 1 ? "s" : ""}`}
              </span>
              {errors.length > 0 && (
                <span className="text-xs text-muted-foreground">
                  · sauvegarde désactivée tant que ces erreurs ne sont pas corrigées
                </span>
              )}
            </div>
            <ul className="text-xs space-y-1 list-disc pl-5">
              {errors.map((issue, i) => (
                <li key={`err-${i}`} className="text-destructive">
                  {issue.message}
                </li>
              ))}
              {warnings.map((issue, i) => (
                <li key={`warn-${i}`} className="text-amber-700 dark:text-amber-400">
                  {issue.message}
                </li>
              ))}
            </ul>
            <p className="text-[11px] text-muted-foreground pt-1 border-t border-border/40">
              Banque physique : {validation.totalImages} images ·{" "}
              {(Object.keys(validation.perCategory) as HeroCategoryName[])
                .map((c) => `${CATEGORY_LABELS[c]} ${validation.perCategory[c]}`)
                .join(" · ")}
            </p>
          </section>
        )}

        {/* Sliders */}
        <section className="space-y-4">
          <div className="flex items-baseline justify-between">
            <h2 className="text-lg font-heading font-semibold">Poids cibles</h2>
            <span className="text-xs text-muted-foreground tabular-nums">
              Somme : {total} {total === 100 ? "" : "(normalisée automatiquement)"}
            </span>
          </div>

          <div className="space-y-3">
            {(Object.keys(draft) as HeroCategoryName[]).map((cat) => {
              const value = draft[cat];
              const pctNormalized = total > 0 ? (value / total) * 100 : 0;
              return (
                <div
                  key={cat}
                  className="border border-border rounded-lg p-4 bg-card space-y-2"
                >
                  <div className="flex items-baseline justify-between gap-3">
                    <div>
                      <div className="font-medium text-sm">
                        {CATEGORY_LABELS[cat]}
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        {CATEGORY_HINTS[cat]}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={value}
                        onChange={(e) => setOne(cat, Number(e.target.value) || 0)}
                        className="w-16 text-right text-sm tabular-nums border border-border rounded px-2 py-1 bg-background"
                      />
                      <span className="text-xs text-muted-foreground tabular-nums w-14 text-right">
                        ≈ {pctNormalized.toFixed(1)}%
                      </span>
                    </div>
                  </div>

                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={1}
                    value={value}
                    onChange={(e) => setOne(cat, Number(e.target.value))}
                    className="w-full accent-primary"
                  />

                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full ${CATEGORY_COLORS[cat]} transition-all`}
                      style={{ width: `${pctNormalized}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Presets */}
        <section className="space-y-2">
          <h2 className="text-lg font-heading font-semibold">Presets rapides</h2>
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((p) => (
              <button
                key={p.name}
                onClick={() => applyPreset(p.w)}
                className="text-xs px-3 py-1.5 rounded border border-border bg-card hover:border-foreground/40"
              >
                {p.name}
              </button>
            ))}
          </div>
        </section>

        {/* Aperçu de simulation */}
        <section className="space-y-3">
          <h2 className="text-lg font-heading font-semibold">
            Aperçu — distribution simulée sur {SIM_SAMPLE.toLocaleString("fr-FR")}{" "}
            profils
          </h2>
          <div className="space-y-1.5">
            {(Object.keys(simulation) as HeroCategoryName[]).map((cat) => {
              const count = simulation[cat];
              const realPct = (count / SIM_SAMPLE) * 100;
              const targetPct = total > 0 ? (draft[cat] / total) * 100 : 0;
              return (
                <div key={cat} className="flex items-center gap-3 text-xs">
                  <span className="w-32 shrink-0">{CATEGORY_LABELS[cat]}</span>
                  <div className="relative flex-1 h-3 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`absolute inset-y-0 left-0 ${CATEGORY_COLORS[cat]}`}
                      style={{ width: `${realPct}%` }}
                    />
                    <div
                      className="absolute inset-y-0 w-0.5 bg-foreground/60"
                      style={{ left: `${targetPct}%` }}
                      title="Cible"
                    />
                  </div>
                  <span className="w-24 text-right font-mono tabular-nums">
                    {realPct.toFixed(1)}% / {targetPct.toFixed(1)}%
                  </span>
                </div>
              );
            })}
          </div>
          <p className="text-[11px] text-muted-foreground">
            Trait vertical = cible normalisée. Échantillon de {SIM_SAMPLE} UUIDs
            aléatoires ; écart attendu ±0,7 pt à cette taille.
          </p>
        </section>

        {/* Actions */}
        <section className="flex items-center gap-3 pt-4 border-t border-border">
          <button
            onClick={handleSave}
            disabled={!canSave}
            className="px-5 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50"
          >
            {saving ? "Enregistrement…" : "Enregistrer"}
          </button>
          <button
            onClick={() => setDraft(liveWeights)}
            disabled={!isDirty}
            className="px-4 py-2 rounded-md border border-border text-sm disabled:opacity-50"
          >
            Annuler les changements
          </button>
          <button
            onClick={() => setDraft(DEFAULT_HERO_WEIGHTS)}
            className="px-4 py-2 rounded-md border border-border text-sm ml-auto"
          >
            Réinitialiser aux défauts (40/20/20/20)
          </button>
        </section>
      </div>
    </div>
  );
}
