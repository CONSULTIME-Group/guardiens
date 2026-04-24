/**
 * /test/hero-distribution
 * ----------------------------------------------------------------------------
 * Debug interne : simule N sitterId aléatoires (UUID v4) et mesure la
 * distribution réelle des héros assignés par `getSitterHeroImage`.
 *
 * Affiche :
 *   - répartition par CATÉGORIE thématique (animaux/maison/entraide/village)
 *     vs. cibles théoriques (40/20/20/20)
 *   - histogramme des 100 images de la banque pour repérer les images
 *     sur/sous-représentées
 *   - bouton de re-tirage avec taille d'échantillon configurable
 */

import { useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import {
  HERO_BANK,
  getSitterHeroImage,
  getCategoryByBankIndex,
  type HeroCategoryName,
  type HeroWeights,
} from "@/lib/heroBank";
import { useHeroWeights } from "@/hooks/useHeroWeights";

const CATEGORY_LABELS: Record<HeroCategoryName, string> = {
  animals: "Animaux & plantes",
  home: "Maison",
  mutual_aid: "Entraide",
  village: "Village & partage",
};

const CATEGORY_COLORS: Record<
  HeroCategoryName,
  { bg: string; text: string; bar: string }
> = {
  animals: { bg: "bg-emerald-100", text: "text-emerald-900", bar: "bg-emerald-500" },
  home: { bg: "bg-amber-100", text: "text-amber-900", bar: "bg-amber-500" },
  mutual_aid: { bg: "bg-rose-100", text: "text-rose-900", bar: "bg-rose-500" },
  village: { bg: "bg-sky-100", text: "text-sky-900", bar: "bg-sky-500" },
};

/**
 * Calcule les cibles théoriques (en %) à partir des poids actifs (lus depuis
 * la table `hero_weights`). Les poids ne somment pas forcément à 100, donc on
 * normalise.
 */
function computeTargets(w: HeroWeights): Record<HeroCategoryName, number> {
  const total = w.animals + w.home + w.mutual_aid + w.village || 1;
  return {
    animals: (w.animals / total) * 100,
    home: (w.home / total) * 100,
    mutual_aid: (w.mutual_aid / total) * 100,
    village: (w.village / total) * 100,
  };
}

const SAMPLE_SIZES = [1_000, 10_000, 50_000, 100_000];

/* ───────────────────────────── Helpers ───────────────────────────── */

function genUUID(): string {
  // Préfère crypto.randomUUID quand disponible (déterministe côté distribution).
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  // Fallback simple — uniforme suffisant pour cette mesure de répartition.
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

type SimResult = {
  sampleSize: number;
  byCategory: Record<HeroCategoryName, number>;
  byImage: number[]; // index 0..99 → nombre de tirages
  durationMs: number;
};

function runSimulation(sampleSize: number, weights: HeroWeights): SimResult {
  const t0 = performance.now();
  const byCategory: Record<HeroCategoryName, number> = {
    animals: 0,
    home: 0,
    mutual_aid: 0,
    village: 0,
  };
  const byImage = new Array<number>(HERO_BANK.length).fill(0);

  const urlToIdx = new Map<string, number>();
  HERO_BANK.forEach((url, idx) => urlToIdx.set(url, idx));

  for (let i = 0; i < sampleSize; i++) {
    const url = getSitterHeroImage(genUUID(), weights);
    const idx = urlToIdx.get(url);
    if (idx === undefined) continue;
    byImage[idx]++;
    byCategory[getCategoryByBankIndex(idx)]++;
  }

  return {
    sampleSize,
    byCategory,
    byImage,
    durationMs: performance.now() - t0,
  };
}

/* ───────────────────────────── Page ───────────────────────────── */

export default function TestHeroDistribution() {
  const [sampleSize, setSampleSize] = useState<number>(10_000);
  const [seed, setSeed] = useState<number>(0); // bump pour relancer la simu
  const heroWeights = useHeroWeights();
  const targets = useMemo(() => computeTargets(heroWeights), [heroWeights]);

  const result = useMemo<SimResult>(
    () => runSimulation(sampleSize, heroWeights),
    // seed force un re-run même à taille/poids constants
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sampleSize, seed, heroWeights]
  );

  const total = result.sampleSize;

  // Statistiques par image (pour repérer les valeurs aberrantes).
  const imgStats = useMemo(() => {
    const counts = result.byImage;
    const expected = total / counts.length; // tirage uniforme attendu si poids étaient égaux
    let min = Infinity,
      max = -Infinity,
      minIdx = 0,
      maxIdx = 0,
      neverPicked = 0;
    counts.forEach((n, i) => {
      if (n < min) {
        min = n;
        minIdx = i;
      }
      if (n > max) {
        max = n;
        maxIdx = i;
      }
      if (n === 0) neverPicked++;
    });
    return { min, max, minIdx, maxIdx, expected, neverPicked };
  }, [result, total]);

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Debug — Distribution des hero</title>
        <meta name="robots" content="noindex,nofollow" />
      </Helmet>

      <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        {/* ── En-tête ── */}
        <header className="space-y-2">
          <h1 className="text-2xl font-heading font-bold">
            Distribution des hero — debug
          </h1>
          <p className="text-sm text-muted-foreground">
            Simule {total.toLocaleString("fr-FR")} sitterId aléatoires et mesure la
            répartition réelle vs. les cibles théoriques (40 / 20 / 20 / 20).
            Calcul effectué en {result.durationMs.toFixed(0)} ms.
          </p>

          {/* Contrôles */}
          <div className="flex items-center gap-2 flex-wrap pt-2">
            <span className="text-xs text-muted-foreground">Échantillon :</span>
            {SAMPLE_SIZES.map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setSampleSize(n)}
                className={`text-xs px-3 py-1 rounded border transition-colors ${
                  sampleSize === n
                    ? "bg-foreground text-background border-foreground"
                    : "bg-card border-border hover:border-foreground/40"
                }`}
              >
                {n.toLocaleString("fr-FR")}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setSeed((s) => s + 1)}
              className="text-xs px-3 py-1 rounded border border-border bg-card hover:border-foreground/40 ml-2"
            >
              ↻ Relancer
            </button>
          </div>
        </header>

        {/* ── Distribution par catégorie ── */}
        <section className="space-y-3">
          <h2 className="text-lg font-heading font-semibold">
            Répartition par catégorie
          </h2>
          <div className="space-y-2">
            {(Object.keys(result.byCategory) as HeroCategoryName[]).map((cat) => {
              const count = result.byCategory[cat];
              const pct = (count / total) * 100;
              const target = TARGETS[cat];
              const delta = pct - target;
              const colors = CATEGORY_COLORS[cat];

              return (
                <div
                  key={cat}
                  className="border border-border rounded-lg p-3 bg-card"
                >
                  <div className="flex items-baseline justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors.bg} ${colors.text}`}
                      >
                        {CATEGORY_LABELS[cat]}
                      </span>
                      <span className="text-xs text-muted-foreground font-mono">
                        {count.toLocaleString("fr-FR")} tirages
                      </span>
                    </div>
                    <div className="text-right whitespace-nowrap">
                      <div className="text-lg font-bold tabular-nums">
                        {pct.toFixed(2)}%
                      </div>
                      <div
                        className={`text-[11px] font-mono ${
                          Math.abs(delta) < 1
                            ? "text-emerald-600"
                            : Math.abs(delta) < 2
                              ? "text-amber-600"
                              : "text-rose-600"
                        }`}
                      >
                        cible {target}% · écart {delta >= 0 ? "+" : ""}
                        {delta.toFixed(2)} pt
                      </div>
                    </div>
                  </div>

                  {/* Barre cumulée : réel + repère cible */}
                  <div className="relative h-3 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`absolute inset-y-0 left-0 ${colors.bar} transition-all`}
                      style={{ width: `${pct}%` }}
                    />
                    {/* Marqueur cible */}
                    <div
                      className="absolute inset-y-0 w-0.5 bg-foreground/60"
                      style={{ left: `${target}%` }}
                      title={`Cible : ${target}%`}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── Stats par image (aberrations) ── */}
        <section className="space-y-3">
          <h2 className="text-lg font-heading font-semibold">
            Distribution par image (1 → 100)
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <Stat
              label="Attendu / image"
              value={imgStats.expected.toFixed(0)}
              hint="(si tirage uniforme)"
            />
            <Stat
              label="Image la + tirée"
              value={imgStats.max.toString()}
              hint={`#${String(imgStats.maxIdx + 1).padStart(3, "0")}`}
            />
            <Stat
              label="Image la − tirée"
              value={imgStats.min.toString()}
              hint={`#${String(imgStats.minIdx + 1).padStart(3, "0")}`}
            />
            <Stat
              label="Jamais tirées"
              value={imgStats.neverPicked.toString()}
              hint={imgStats.neverPicked === 0 ? "✓ couverture totale" : "⚠"}
            />
          </div>

          {/* Histogramme compact */}
          <Histogram counts={result.byImage} />
        </section>

        {/* ── Notes ── */}
        <section className="text-xs text-muted-foreground border-t border-border pt-4 space-y-1">
          <p>
            <strong>Note :</strong> chaque relance utilise de nouveaux UUID — la
            distribution converge vers les cibles à mesure que l'échantillon
            grandit. Sur 10 000 tirages, un écart de ±0,5 pt est normal ; sur
            100 000, on doit descendre sous ±0,2 pt.
          </p>
          <p>
            La sélection est <strong>déterministe par sitterId</strong> : un même
            UUID donne toujours la même image. La variabilité observée provient
            uniquement du tirage aléatoire des UUID de test.
          </p>
        </section>
      </div>
    </div>
  );
}

/* ───────────────────────────── Sous-composants ───────────────────────────── */

function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="border border-border rounded-md p-2 bg-card">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="text-lg font-bold tabular-nums leading-tight">{value}</div>
      {hint && <div className="text-[10px] text-muted-foreground">{hint}</div>}
    </div>
  );
}

/**
 * Histogramme léger (CSS pur, pas de lib chart) : 100 barres verticales,
 * hauteur normalisée sur le max. Couleur = catégorie de l'image.
 */
function Histogram({ counts }: { counts: number[] }) {
  const max = Math.max(...counts, 1);
  return (
    <div
      className="flex items-end gap-px h-32 bg-muted/40 rounded-md p-2 border border-border overflow-hidden"
      role="img"
      aria-label="Histogramme de tirage par image"
    >
      {counts.map((c, idx) => {
        const cat = getCategoryByBankIndex(idx);
        const h = (c / max) * 100;
        return (
          <div
            key={idx}
            className={`flex-1 min-w-0 ${CATEGORY_COLORS[cat].bar} rounded-t-sm transition-all`}
            style={{ height: `${Math.max(h, 2)}%` }}
            title={`#${String(idx + 1).padStart(3, "0")} (${CATEGORY_LABELS[cat]}) — ${c} tirages`}
          />
        );
      })}
    </div>
  );
}
