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

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  HERO_BANK,
  HERO_ANCHORS,
  type HeroAnchor,
  getCategoryByBankIndex,
  type HeroCategoryName,
} from "@/lib/heroBank";
import { getMobileByIndex } from "@/lib/heroBankMobile";
import { Helmet } from "react-helmet-async";
import { X, ZoomIn, ZoomOut, RotateCcw, ChevronLeft, ChevronRight } from "lucide-react";

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
  const [zoomIdx, setZoomIdx] = useState<number | null>(null);

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
          {filtered.map((it, i) => (
            <HeroCard
              key={it.idx}
              item={it}
              viewMode={viewMode}
              onZoom={() => setZoomIdx(i)}
            />
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="text-center text-muted-foreground py-20">
            Aucune image ne correspond à ces filtres.
          </div>
        )}
      </div>

      {/* ── Modal de zoom plein écran ── */}
      {zoomIdx !== null && filtered[zoomIdx] && (
        <HeroZoomModal
          item={filtered[zoomIdx]}
          hasPrev={zoomIdx > 0}
          hasNext={zoomIdx < filtered.length - 1}
          onPrev={() => setZoomIdx((i) => (i !== null && i > 0 ? i - 1 : i))}
          onNext={() =>
            setZoomIdx((i) =>
              i !== null && i < filtered.length - 1 ? i + 1 : i
            )
          }
          onClose={() => setZoomIdx(null)}
        />
      )}
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

function HeroCard({
  item,
  viewMode,
  onZoom,
}: {
  item: Item;
  viewMode: ViewMode;
  onZoom: () => void;
}) {
  // Reproduit la logique de PublicSitterProfile (desktop, simplifié) pour le mode
  // "rendered". Sinon on affiche l'image en object-contain pour voir tout le cadre.
  const objectPosition =
    item.anchor === "left"
      ? "20% 42%"
      : item.anchor === "right"
        ? "80% 42%"
        : "50% 42%";

  return (
    <article className="notebook-card notebook-card-paper relative">
      {/* Vignette image cliquable → ouvre le zoom plein écran */}
      <button
        type="button"
        onClick={onZoom}
        title="Cliquer pour zoomer en plein écran"
        className="relative block w-full bg-[#FBF6EC] overflow-hidden cursor-zoom-in group focus:outline-none focus:ring-2 focus:ring-primary"
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

        {/* Indicateur de zoom au survol */}
        <span className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
          <ZoomIn className="w-6 h-6 text-white drop-shadow-lg" />
        </span>

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
      </button>

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

      {/* Liseré ambré de tranche le long du bord déchiré (effet épaisseur de papier) */}
      <span className="notebook-card-edge" aria-hidden="true" />
    </article>
  );
}

/* ───────────────────────── Modal de zoom plein écran ───────────────────────── */

/**
 * HeroZoomModal
 * --------------------------------------------------------------------------
 * Affiche l'image en plein écran avec contrôles de zoom :
 *   - Boutons +/- et Reset
 *   - Molette de souris (zoom centré sur le curseur)
 *   - Pinch-to-zoom tactile (deux doigts) + drag à un doigt
 *   - Drag à la souris quand zoomé
 *   - Double-clic / double-tap pour toggle 1×/2.5×
 *   - Flèches ←/→ pour naviguer entre images, Échap pour fermer
 *
 * En complément, on superpose les guides d'ancrage (lignes verticales à
 * 20 % / 50 % / 80 % et ligne horizontale à 42 %) afin de vérifier
 * précisément le cadrage produit par object-position.
 */
function HeroZoomModal({
  item,
  hasPrev,
  hasNext,
  onPrev,
  onNext,
  onClose,
}: {
  item: Item;
  hasPrev: boolean;
  hasNext: boolean;
  onPrev: () => void;
  onNext: () => void;
  onClose: () => void;
}) {
  const MIN_SCALE = 1;
  const MAX_SCALE = 8;

  const [scale, setScale] = useState(1);
  const [tx, setTx] = useState(0);
  const [ty, setTy] = useState(0);
  const [showGuides, setShowGuides] = useState(true);

  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const dragRef = useRef<{ startX: number; startY: number; tx0: number; ty0: number } | null>(null);
  const pinchRef = useRef<{
    startDist: number;
    startScale: number;
    centerX: number;
    centerY: number;
    tx0: number;
    ty0: number;
  } | null>(null);
  const lastTapRef = useRef<number>(0);

  // Reset à chaque changement d'image
  useEffect(() => {
    setScale(1);
    setTx(0);
    setTy(0);
  }, [item.idx]);

  const reset = useCallback(() => {
    setScale(1);
    setTx(0);
    setTy(0);
  }, []);

  // Clamp translation pour ne pas faire sortir l'image hors viewport
  const clamp = useCallback(
    (nextScale: number, nextTx: number, nextTy: number) => {
      const el = containerRef.current;
      if (!el) return { tx: nextTx, ty: nextTy };
      const w = el.clientWidth;
      const h = el.clientHeight;
      const overflowX = (w * (nextScale - 1)) / 2;
      const overflowY = (h * (nextScale - 1)) / 2;
      return {
        tx: Math.max(-overflowX, Math.min(overflowX, nextTx)),
        ty: Math.max(-overflowY, Math.min(overflowY, nextTy)),
      };
    },
    []
  );

  // Zoom centré sur un point (clientX/Y) — pour wheel + double-tap
  const zoomAt = useCallback(
    (clientX: number, clientY: number, nextScale: number) => {
      const el = containerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const cx = clientX - rect.left - rect.width / 2;
      const cy = clientY - rect.top - rect.height / 2;
      const ratio = nextScale / scale;
      const newTx = cx - (cx - tx) * ratio;
      const newTy = cy - (cy - ty) * ratio;
      const clamped = clamp(nextScale, newTx, newTy);
      setScale(nextScale);
      setTx(clamped.tx);
      setTy(clamped.ty);
    },
    [scale, tx, ty, clamp]
  );

  // Raccourcis clavier
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft" && hasPrev) onPrev();
      else if (e.key === "ArrowRight" && hasNext) onNext();
      else if (e.key === "+" || e.key === "=") {
        const next = Math.min(MAX_SCALE, scale * 1.4);
        const el = containerRef.current;
        if (el) {
          const r = el.getBoundingClientRect();
          zoomAt(r.left + r.width / 2, r.top + r.height / 2, next);
        }
      } else if (e.key === "-") {
        const next = Math.max(MIN_SCALE, scale / 1.4);
        const el = containerRef.current;
        if (el) {
          const r = el.getBoundingClientRect();
          zoomAt(r.left + r.width / 2, r.top + r.height / 2, next);
        }
      } else if (e.key === "0") {
        reset();
      } else if (e.key === "g" || e.key === "G") {
        setShowGuides((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [scale, hasPrev, hasNext, onPrev, onNext, onClose, zoomAt, reset]);

  // Bloquer le scroll du body pendant l'ouverture
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  // Wheel = zoom centré sur le curseur
  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
    const next = Math.max(MIN_SCALE, Math.min(MAX_SCALE, scale * factor));
    zoomAt(e.clientX, e.clientY, next);
  };

  // ─── Pointer events (souris + tactile unifiés) ───
  const activePointers = useRef<Map<number, { x: number; y: number }>>(new Map());

  const onPointerDown = (e: React.PointerEvent) => {
    (e.target as Element).setPointerCapture(e.pointerId);
    activePointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (activePointers.current.size === 2) {
      // Pinch start
      const pts = Array.from(activePointers.current.values());
      const dx = pts[1].x - pts[0].x;
      const dy = pts[1].y - pts[0].y;
      pinchRef.current = {
        startDist: Math.hypot(dx, dy),
        startScale: scale,
        centerX: (pts[0].x + pts[1].x) / 2,
        centerY: (pts[0].y + pts[1].y) / 2,
        tx0: tx,
        ty0: ty,
      };
      dragRef.current = null;
    } else if (activePointers.current.size === 1) {
      // Drag (un doigt / souris) — uniquement utile si zoomé
      dragRef.current = { startX: e.clientX, startY: e.clientY, tx0: tx, ty0: ty };

      // Détection double-tap (tactile)
      if (e.pointerType === "touch") {
        const now = Date.now();
        if (now - lastTapRef.current < 300) {
          const next = scale > 1.5 ? 1 : 2.5;
          if (next === 1) reset();
          else zoomAt(e.clientX, e.clientY, next);
          lastTapRef.current = 0;
        } else {
          lastTapRef.current = now;
        }
      }
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!activePointers.current.has(e.pointerId)) return;
    activePointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pinchRef.current && activePointers.current.size === 2) {
      const pts = Array.from(activePointers.current.values());
      const dx = pts[1].x - pts[0].x;
      const dy = pts[1].y - pts[0].y;
      const dist = Math.hypot(dx, dy);
      const ratio = dist / pinchRef.current.startDist;
      const next = Math.max(
        MIN_SCALE,
        Math.min(MAX_SCALE, pinchRef.current.startScale * ratio)
      );
      zoomAt(pinchRef.current.centerX, pinchRef.current.centerY, next);
      return;
    }

    if (dragRef.current && activePointers.current.size === 1 && scale > 1) {
      const ndx = e.clientX - dragRef.current.startX;
      const ndy = e.clientY - dragRef.current.startY;
      const clamped = clamp(scale, dragRef.current.tx0 + ndx, dragRef.current.ty0 + ndy);
      setTx(clamped.tx);
      setTy(clamped.ty);
    }
  };

  const onPointerUp = (e: React.PointerEvent) => {
    activePointers.current.delete(e.pointerId);
    if (activePointers.current.size < 2) pinchRef.current = null;
    if (activePointers.current.size === 0) dragRef.current = null;
  };

  const onDoubleClick = (e: React.MouseEvent) => {
    const next = scale > 1.5 ? 1 : 2.5;
    if (next === 1) reset();
    else zoomAt(e.clientX, e.clientY, next);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Zoom hero #${item.fileNum}`}
      className="fixed inset-0 z-50 bg-black/95 flex flex-col"
    >
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-2 px-4 py-2 text-white text-sm border-b border-white/10 bg-black/60">
        <div className="flex items-center gap-3 min-w-0">
          <span className="font-mono font-bold">
            #{String(item.fileNum).padStart(3, "0")}
          </span>
          <span className="text-xs text-white/60 truncate">
            {CATEGORY_LABELS[item.category]} · {ANCHOR_LABELS[item.anchor]}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => {
              const el = containerRef.current;
              if (!el) return;
              const r = el.getBoundingClientRect();
              const next = Math.max(MIN_SCALE, scale / 1.4);
              zoomAt(r.left + r.width / 2, r.top + r.height / 2, next);
            }}
            className="p-2 hover:bg-white/10 rounded transition-colors"
            title="Zoom arrière (-)"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-xs font-mono w-12 text-center tabular-nums">
            {scale.toFixed(2)}×
          </span>
          <button
            type="button"
            onClick={() => {
              const el = containerRef.current;
              if (!el) return;
              const r = el.getBoundingClientRect();
              const next = Math.min(MAX_SCALE, scale * 1.4);
              zoomAt(r.left + r.width / 2, r.top + r.height / 2, next);
            }}
            className="p-2 hover:bg-white/10 rounded transition-colors"
            title="Zoom avant (+)"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={reset}
            className="p-2 hover:bg-white/10 rounded transition-colors"
            title="Réinitialiser (0)"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setShowGuides((v) => !v)}
            className={`px-2 py-1 ml-1 text-[11px] rounded border transition-colors ${
              showGuides
                ? "bg-white/15 border-white/30"
                : "border-white/20 hover:bg-white/10"
            }`}
            title="Afficher / masquer les guides d'ancrage (G)"
          >
            Guides
          </button>
          <button
            type="button"
            onClick={onClose}
            className="p-2 ml-2 hover:bg-white/10 rounded transition-colors"
            title="Fermer (Échap)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Zone de zoom */}
      <div
        ref={containerRef}
        onWheel={onWheel}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onDoubleClick={onDoubleClick}
        className="relative flex-1 overflow-hidden touch-none select-none"
        style={{
          cursor: scale > 1 ? (dragRef.current ? "grabbing" : "grab") : "zoom-in",
        }}
      >
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{
            transform: `translate(${tx}px, ${ty}px) scale(${scale})`,
            transformOrigin: "center center",
            transition: dragRef.current || pinchRef.current ? "none" : "transform 120ms ease-out",
          }}
        >
          <img
            ref={imgRef}
            src={item.src}
            alt={`Hero #${item.fileNum} (zoom)`}
            draggable={false}
            className="max-w-full max-h-full object-contain pointer-events-none"
            style={{ imageRendering: scale > 3 ? "pixelated" : "auto" }}
          />
        </div>

        {/* Guides d'ancrage (en dehors de la transform pour rester fixes) */}
        {showGuides && (
          <div className="pointer-events-none absolute inset-0">
            {/* Verticales 20% / 50% / 80% */}
            <div className="absolute top-0 bottom-0 border-l border-dashed border-blue-400/70" style={{ left: "20%" }} />
            <div className="absolute top-0 bottom-0 border-l border-dashed border-white/40" style={{ left: "50%" }} />
            <div className="absolute top-0 bottom-0 border-l border-dashed border-purple-400/70" style={{ left: "80%" }} />
            {/* Horizontale 42% (object-position Y) */}
            <div className="absolute left-0 right-0 border-t border-dashed border-emerald-400/70" style={{ top: "42%" }} />
            {/* Légende */}
            <div className="absolute bottom-2 left-2 text-[10px] text-white/70 font-mono space-x-3 bg-black/40 px-2 py-1 rounded">
              <span className="text-blue-300">— 20% (left)</span>
              <span className="text-white/70">— 50% (center)</span>
              <span className="text-purple-300">— 80% (right)</span>
              <span className="text-emerald-300">— 42% Y</span>
            </div>
          </div>
        )}

        {/* Navigation prev/next */}
        {hasPrev && (
          <button
            type="button"
            onClick={onPrev}
            className="absolute left-2 top-1/2 -translate-y-1/2 p-3 bg-black/50 hover:bg-black/70 text-white rounded-full transition-colors"
            title="Image précédente (←)"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}
        {hasNext && (
          <button
            type="button"
            onClick={onNext}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-3 bg-black/50 hover:bg-black/70 text-white rounded-full transition-colors"
            title="Image suivante (→)"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        )}

        {/* Aide raccourcis */}
        <div className="absolute bottom-2 right-2 text-[10px] text-white/50 font-mono bg-black/40 px-2 py-1 rounded">
          molette / pinch · drag · double-clic · ← → · Échap
        </div>
      </div>
    </div>
  );
}
