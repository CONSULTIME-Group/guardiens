/**
 * Régression visuelle ciblée — halo / bord crème autour des illustrations
 * EmptyState. Deux stratégies combinées :
 *
 *   1. Diff pixel global : `toHaveScreenshot()` sur la page de test
 *      `/test/empty-states` en viewport mobile, light + dark. Toute
 *      régression visuelle (halo, taille, blend mode) fait échouer.
 *
 *   2. Échantillonnage de pixels ciblé : pour CHAQUE illustration on lit
 *      les pixels d'une fine couronne autour du `<img>` et on vérifie
 *      qu'ils correspondent à la couleur du conteneur parent direct
 *      (à epsilon près). Si la classe `.illustration-blend` se casse,
 *      le halo crème (#FAF9F6) se met à différer du fond → message
 *      d'erreur explicite "halo détecté côté X, illustration Y, ΔE≈Z".
 *
 * Pré-requis : un serveur de preview doit servir l'app sur PLAYWRIGHT_BASE_URL
 * (ou http://localhost:8080 par défaut). Le test se contente de visiter une
 * route — pas besoin de mock auth (la page /test/empty-states est publique).
 */
import { test, expect, type Page } from "@playwright/test";

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:8080";
const ROUTE = "/test/empty-states";

/** Tolérance ΔE (distance euclidienne RGB) entre couronne et fond parent. */
const HALO_DELTA_THRESHOLD = 18;
/** Largeur (px) de la couronne échantillonnée autour de l'illustration. */
const RING_WIDTH = 4;
/** Nombre de points échantillonnés par côté. */
const SAMPLES_PER_SIDE = 6;

interface RGB {
  r: number;
  g: number;
  b: number;
}

function rgbDistance(a: RGB, b: RGB): number {
  return Math.sqrt(
    (a.r - b.r) ** 2 + (a.g - b.g) ** 2 + (a.b - b.b) ** 2,
  );
}

/**
 * Échantillonne la couleur de fond du conteneur parent direct du bloc
 * EmptyState (le bandeau aplati derrière, sans transparence). On s'appuie
 * sur la propriété calculée `background-color` du `[data-context-section]`
 * englobant — c'est la VRAIE couleur que doit prendre la couronne.
 */
async function getExpectedBackground(page: Page, illustration: string, context: string): Promise<RGB> {
  const rgbStr = await page.evaluate(
    ({ illustration, context }) => {
      const block = document.querySelector(
        `[data-test-empty-state][data-illustration="${illustration}"][data-context="${context}"]`,
      );
      if (!block) throw new Error(`block not found: ${illustration}/${context}`);
      // On remonte jusqu'au premier ancêtre avec un background non transparent.
      let el: Element | null = block;
      while (el) {
        const cs = getComputedStyle(el as HTMLElement);
        const bg = cs.backgroundColor;
        if (bg && bg !== "rgba(0, 0, 0, 0)" && bg !== "transparent") return bg;
        el = el.parentElement;
      }
      return "rgb(255, 255, 255)";
    },
    { illustration, context },
  );
  const m = rgbStr.match(/(\d+),\s*(\d+),\s*(\d+)/);
  if (!m) throw new Error(`Cannot parse background color: ${rgbStr}`);
  return { r: +m[1], g: +m[2], b: +m[3] };
}

/**
 * Récupère la bbox du <img> (ou du fallback SVG) dans la viewport.
 */
async function getImageBox(page: Page, illustration: string, context: string) {
  const handle = page.locator(
    `[data-test-empty-state][data-illustration="${illustration}"][data-context="${context}"] img, ` +
      `[data-test-empty-state][data-illustration="${illustration}"][data-context="${context}"] svg`,
  ).first();
  await handle.waitFor({ state: "visible" });
  const box = await handle.boundingBox();
  if (!box) throw new Error(`No bbox for ${illustration}/${context}`);
  return box;
}

/**
 * Lit la couleur d'un pixel via canvas (sur un screenshot ciblé pour éviter
 * de re-screenshoter toute la page). Coordonnées relatives au screenshot.
 */
async function readPixel(buffer: Buffer, x: number, y: number, width: number): Promise<RGB> {
  // Petit décodeur PNG via sharp serait plus rapide, mais pour rester
  // dépendance-zéro on passe le buffer dans le navigateur via OffscreenCanvas.
  // Comme on appelle cette fonction au sein d'un `evaluate`, on délègue.
  void buffer; void x; void y; void width;
  throw new Error("readPixel must be called via page.evaluate");
}

/**
 * Stratégie : on prend UN screenshot de la zone bbox élargie de RING_WIDTH,
 * on charge le PNG dans un canvas côté navigateur, on échantillonne les
 * pixels de la couronne et on les retourne.
 */
async function sampleRing(
  page: Page,
  box: { x: number; y: number; width: number; height: number },
): Promise<RGB[]> {
  const ring = RING_WIDTH;
  const clip = {
    x: Math.max(0, Math.floor(box.x - ring)),
    y: Math.max(0, Math.floor(box.y - ring)),
    width: Math.ceil(box.width + 2 * ring),
    height: Math.ceil(box.height + 2 * ring),
  };
  const png = await page.screenshot({ clip, type: "png" });
  const base64 = png.toString("base64");

  return await page.evaluate(
    async ({ base64, ring, samplesPerSide }) => {
      const img = new Image();
      img.src = `data:image/png;base64,${base64}`;
      await img.decode();
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0);

      const pts: { x: number; y: number }[] = [];
      const W = img.naturalWidth;
      const H = img.naturalHeight;
      // top + bottom rows (au milieu de la couronne)
      for (let i = 0; i < samplesPerSide; i++) {
        const x = Math.floor((W * (i + 1)) / (samplesPerSide + 1));
        pts.push({ x, y: Math.floor(ring / 2) });
        pts.push({ x, y: H - 1 - Math.floor(ring / 2) });
      }
      // left + right cols
      for (let i = 0; i < samplesPerSide; i++) {
        const y = Math.floor((H * (i + 1)) / (samplesPerSide + 1));
        pts.push({ x: Math.floor(ring / 2), y });
        pts.push({ x: W - 1 - Math.floor(ring / 2), y });
      }

      return pts.map(({ x, y }) => {
        const d = ctx.getImageData(x, y, 1, 1).data;
        return { r: d[0], g: d[1], b: d[2] };
      });
    },
    { base64, ring, samplesPerSide: SAMPLES_PER_SIDE },
  );
}

/** Force le thème via le ThemeContext (localStorage clé "theme"). */
async function forceTheme(page: Page, theme: "light" | "dark") {
  await page.addInitScript((t) => {
    try {
      localStorage.setItem("theme", t);
    } catch {}
  }, theme);
}

const ILLUSTRATIONS = [
  "sleepingCat",
  "emptyMailbox",
  "walkingDog",
  "emptyCalendar",
  "heartBookmark",
  "sitterReady",
  "quietLeaf",
] as const;

const CONTEXTS = ["page", "card", "modal", "muted"] as const;

for (const theme of ["light", "dark"] as const) {
  test.describe(`EmptyState halo regression (${theme})`, () => {
    test.use({ viewport: { width: 375, height: 812 } });

    test.beforeEach(async ({ page }) => {
      await forceTheme(page, theme);
      await page.goto(`${BASE_URL}${ROUTE}`, { waitUntil: "networkidle" });
      // Laisse les illustrations se peindre (animations + chargement webp).
      await page.waitForTimeout(800);
    });

    test(`pixel diff (${theme})`, async ({ page }) => {
      await expect(page).toHaveScreenshot(`empty-states-${theme}.png`, {
        fullPage: true,
        maxDiffPixelRatio: 0.005,
        animations: "disabled",
      });
    });

    test(`no halo around any illustration (${theme})`, async ({ page }) => {
      const failures: string[] = [];

      for (const illustration of ILLUSTRATIONS) {
        for (const context of CONTEXTS) {
          const expected = await getExpectedBackground(page, illustration, context);
          const box = await getImageBox(page, illustration, context);
          const samples = await sampleRing(page, box);
          const deltas = samples.map((s) => rgbDistance(s, expected));
          const maxDelta = Math.max(...deltas);

          if (maxDelta > HALO_DELTA_THRESHOLD) {
            const worst = samples[deltas.indexOf(maxDelta)];
            failures.push(
              `[${illustration} / ${context}] ΔE=${maxDelta.toFixed(1)} ` +
                `expected rgb(${expected.r},${expected.g},${expected.b}) ` +
                `got rgb(${worst.r},${worst.g},${worst.b})`,
            );
          }
        }
      }

      expect(failures, `Halos détectés :\n${failures.join("\n")}`).toEqual([]);
    });
  });
}
