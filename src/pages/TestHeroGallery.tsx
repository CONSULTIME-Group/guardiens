/**
 * /test/hero-gallery
 * ----------------------------------------------------------------------------
 * Page de QA visuelle des 100 illustrations hero. Sert à :
 *   - Vérifier rapidement la cohérence du recadrage par ancrage
 *     (left/center/right) sur tous les profils
 *   - Repérer les artefacts résiduels (spirales, texte parasite, faces tronquées)
 *   - Comparer le rendu "réel" (mêmes dimensions / scale / object-position que
 *     PublicSitterProfile) à l'image brute en mode fit-contain
 *   - Filtrer par catégorie thématique et par ancrage
 *
 * NB : page hors-app, non liée dans la navigation. Accès direct par URL.
 */

import { useMemo, useState } from "react";
import {
  HERO_BANK,
  HERO_ANCHORS,
  type HeroAnchor,
  getCategoryByBankIndex,
  type HeroCategoryName,
} from "@/lib/heroBank";
import { getMobileByIndex } from "@/lib/heroBankMobile";
import { Helmet } from "react-helmet-async";

type ViewMode = "rendered" | "raw";
type AnchorFilter = "all" | HeroAnchor;
type CategoryFilter = "all" | HeroCategoryName;

const CATEGORY_LABELS: Record<HeroCategoryName, string> = {
  animals: "Animaux & plantes",
  home: "Maison",
  mutual_aid: "Entraide",
  village: "Village & partage",
};

const CATEGORY_COLORS: Record<HeroCategoryName, string> = {
  animals: "bg-emerald-100 text-emerald-900 border-emerald-200",
  home: "bg-amber-100 text-amber-900 border-amber-200",
  mutual_aid: "bg-rose-100 text-rose-900 border-rose-200",
  village: "bg-sky-100 text-sky-900 border-sky-200",
};

const ANCHOR_LABELS: Record<HeroAnchor, string> = {
  left: "← Left",
  center: "· Center",
  right: "Right →",
};

export default function TestHeroGallery() {
  const [viewMode, setViewMode] = useState<ViewMode>("rendered");
  const [anchorFilter, setAnchorFilter] = useState<AnchorFilter>("all");
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all");

  // On construit une fois la liste indexée (idx 0-based + numéro fichier 1-based).
  const items = useMemo(
    () =>
      HERO_BANK.map((src, idx) => ({
        idx,
        fileNum: idx + 1,
        src,
        mobileSrc: getMobileByIndex(idx),
        anchor: HERO_ANCHORS[idx] ?? "center",
        category: getCategoryByBankIndex(idx),
      })),
    []
  );

  const filtered = useMemo(
    () =>
      items.filter((it) => {
        if (anchorFilter !== "all" && it.anchor !== anchorFilter) return false;
        if (categoryFilter !== "all" && it.category !== categoryFilter) return false;
        return true;
      }),
    [items, anchorFilter, categoryFilter]
  );

  // Stats globales pour le bandeau d'en-tête.
  const stats = useMemo(() => {
    const byCat: Record<HeroCategoryName, number> = {
      animals: 0,
      home: 0,
      mutual_aid: 0,
      village: 0,
    };
    const byAnchor: Record<HeroAnchor, number> = { left: 0, center: 0, right: 0 };
    for (const it of items) {
      byCat[it.category]++;
      byAnchor[it.anchor]++;
    }
    return { byCat, byAnchor };
  }, [items]);

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>QA — Galerie hero (100 images)</title>
        <meta name="robots" content="noindex,nofollow" />
      </Helmet>

      {/* ── Header sticky : titre + filtres ── */}
      <header className="sticky top-0 z-20 bg-background/95 backdrop-blur border-b border-border">
        <div className="max-w-7xl mx-auto px-4 py-4 space-y-3">
          <div className="flex items-baseline justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-xl font-heading font-bold">
                Galerie hero — {filtered.length} / {items.length}
              </h1>
              <p className="text-xs text-muted-foreground">
                Banque utilisée par les profils gardiens. Filtrez et comparez le rendu réel au brut.
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs">
              {(Object.keys(stats.byCat) as HeroCategoryName[]).map((c) => (
                <span
                  key={c}
                  className={`px-2 py-0.5 rounded-full border ${CATEGORY_COLORS[c]}`}
                >
                  {CATEGORY_LABELS[c]} : {stats.byCat[c]}
                </span>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-4 flex-wrap text-sm">
            {/* Mode d'affichage */}
            <div className="flex items-center gap-1.5 bg-muted rounded-md p-1">
              {(["rendered", "raw"] as ViewMode[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setViewMode(m)}
                  className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                    viewMode === m
                      ? "bg-background shadow-sm text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {m === "rendered" ? "Rendu réel" : "Image brute"}
                </button>
              ))}
            </div>

            {/* Filtre catégorie */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground">Catégorie :</span>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value as CategoryFilter)}
                className="text-xs bg-card border border-border rounded px-2 py-1"
              >
                <option value="all">Toutes</option>
                <option value="animals">Animaux & plantes</option>
                <option value="home">Maison</option>
                <option value="mutual_aid">Entraide</option>
                <option value="village">Village & partage</option>
              </select>
            </div>

            {/* Filtre ancrage */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground">Ancrage :</span>
              <select
                value={anchorFilter}
                onChange={(e) => setAnchorFilter(e.target.value as AnchorFilter)}
                className="text-xs bg-card border border-border rounded px-2 py-1"
              >
                <option value="all">Tous</option>
                <option value="left">Left ({stats.byAnchor.left})</option>
                <option value="center">Center ({stats.byAnchor.center})</option>
                <option value="right">Right ({stats.byAnchor.right})</option>
              </select>
            </div>
          </div>
        </div>
      </header>

      {/* ── Grille ── */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((it) => (
            <HeroCard key={it.idx} item={it} viewMode={viewMode} />
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="text-center text-muted-foreground py-20">
            Aucune image ne correspond à ces filtres.
          </div>
        )}
      </div>
    </div>
  );
}

/* ───────────────────────────── Carte individuelle ───────────────────────────── */

type Item = {
  idx: number;
  fileNum: number;
  src: string;
  mobileSrc: string | undefined;
  anchor: HeroAnchor;
  category: HeroCategoryName;
};

function HeroCard({ item, viewMode }: { item: Item; viewMode: ViewMode }) {
  // Reproduit la logique de PublicSitterProfile (desktop, simplifié) pour le mode
  // "rendered". Sinon on affiche l'image en object-contain pour voir tout le cadre.
  const objectPosition =
    item.anchor === "left"
      ? "20% 42%"
      : item.anchor === "right"
        ? "80% 42%"
        : "50% 42%";

  return (
    <article className="rounded-lg overflow-hidden border border-border bg-card shadow-sm">
      {/* Vignette image */}
      <div
        className="relative w-full bg-[#FBF6EC] overflow-hidden"
        style={{ aspectRatio: "1536 / 340" }}
      >
        <img
          src={item.src}
          srcSet={item.mobileSrc ? `${item.mobileSrc} 768w, ${item.src} 1536w` : undefined}
          sizes="(max-width: 639px) 100vw, (max-width: 1023px) 50vw, 33vw"
          alt={`Hero #${item.fileNum}`}
          loading="lazy"
          decoding="async"
          width={1536}
          height={544}
          className={
            viewMode === "rendered"
              ? "w-full h-full object-cover scale-[1.08]"
              : "w-full h-full object-contain"
          }
          style={viewMode === "rendered" ? { objectPosition } : undefined}
        />

        {/* Numéro en overlay */}
        <span className="absolute top-2 left-2 text-[11px] font-mono font-bold bg-background/90 backdrop-blur px-2 py-0.5 rounded shadow">
          #{String(item.fileNum).padStart(3, "0")}
        </span>

        {/* Ancrage en overlay (haut droit) */}
        <span
          className={`absolute top-2 right-2 text-[10px] font-mono px-1.5 py-0.5 rounded shadow border ${
            item.anchor === "left"
              ? "bg-blue-100 text-blue-900 border-blue-200"
              : item.anchor === "right"
                ? "bg-purple-100 text-purple-900 border-purple-200"
                : "bg-slate-100 text-slate-700 border-slate-200"
          }`}
        >
          {ANCHOR_LABELS[item.anchor]}
        </span>
      </div>

      {/* Méta */}
      <div className="px-3 py-2 flex items-center justify-between gap-2 text-xs">
        <span
          className={`px-2 py-0.5 rounded-full border font-medium ${CATEGORY_COLORS[item.category]}`}
        >
          {CATEGORY_LABELS[item.category]}
        </span>
        <span className="text-muted-foreground font-mono text-[10px] truncate">
          hero-{String(item.fileNum).padStart(2, "0")}
        </span>
      </div>
    </article>
  );
}
