/**
 * Test dédié — Contraste WCAG AA des tokens Tailwind critiques.
 *
 * Indépendant de toute page applicative : on monte un mini-document HTML
 * qui charge `src/index.css` (via le serveur Vite "visual-test") puis on
 * lit les couleurs *résolues* (hsl → rgb) par le navigateur. On vérifie
 * ensuite le ratio de contraste WCAG 2.1 AA sur des paires Token/Fond
 * explicites :
 *
 *   - muted-foreground         sur background, card, muted, accent
 *   - destructive-text         sur background, card
 *   - destructive-foreground   sur destructive (badge danger)
 *   - badge-success-foreground sur badge-success (badge succès)
 *   - primary-foreground       sur primary (boutons CTA)
 *   - secondary-foreground     sur secondary
 *   - foreground               sur background, card, muted, accent
 *   - sidebar-foreground       sur sidebar-background, sidebar-accent
 *
 * Chaque paire est validée pour le mode clair (`:root`) et le mode sombre
 * (`.dark`). Le seuil est :
 *   - 4.5:1 pour le texte normal
 *   - 3.0:1 pour le texte « large » (≥ 18.66px gras ou ≥ 24px regular)
 *
 * Tous les tokens sont testés en taille normale (cas le plus strict),
 * sauf `secondary-foreground/secondary` qui n'est utilisé qu'en CTA gras
 * → seuil "large".
 */

import { test, expect } from "../../playwright-fixture";
import { spawn, type ChildProcess } from "node:child_process";

const PORT = 8767; // distinct des autres specs visuelles
const BASE_URL = `http://localhost:${PORT}`;

let viteProcess: ChildProcess | null = null;

async function waitForServer(url: string, timeoutMs = 60_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok || res.status === 404) return;
    } catch {
      /* not ready yet */
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`Vite n'a pas démarré sur ${url} en ${timeoutMs}ms`);
}

test.beforeAll(async () => {
  viteProcess = spawn(
    "npx",
    ["vite", "--mode", "visual-test", "--port", String(PORT), "--strictPort"],
    {
      cwd: process.cwd(),
      stdio: "pipe",
      env: { ...process.env, NODE_ENV: "development" },
    }
  );
  viteProcess.stderr?.on("data", (d) =>
    console.error("[vite:err]", d.toString())
  );
  await waitForServer(BASE_URL);
});

test.afterAll(async () => {
  if (viteProcess) {
    viteProcess.kill("SIGTERM");
    await new Promise((r) => setTimeout(r, 500));
  }
});

// --- Définition des paires à tester -----------------------------------------

type Pair = {
  /** Nom court pour les logs */
  label: string;
  /** Token CSS du texte (sans `--`) */
  fg: string;
  /** Token CSS du fond (sans `--`) */
  bg: string;
  /** "normal" (4.5:1) ou "large" (3:1) */
  size?: "normal" | "large";
};

const PAIRS: Pair[] = [
  // muted-foreground sur tous les fonds neutres possibles
  { label: "muted-foreground / background", fg: "muted-foreground", bg: "background" },
  { label: "muted-foreground / card", fg: "muted-foreground", bg: "card" },
  { label: "muted-foreground / muted", fg: "muted-foreground", bg: "muted" },
  { label: "muted-foreground / accent", fg: "muted-foreground", bg: "accent" },

  // destructive-text (token AA-compliant pour texte rouge sur fond clair)
  { label: "destructive-text / background", fg: "destructive-text", bg: "background" },
  { label: "destructive-text / card", fg: "destructive-text", bg: "card" },

  // Badges
  { label: "destructive-foreground / destructive", fg: "destructive-foreground", bg: "destructive" },
  { label: "badge-success-foreground / badge-success", fg: "badge-success-foreground", bg: "badge-success" },

  // CTA principaux
  { label: "primary-foreground / primary", fg: "primary-foreground", bg: "primary" },
  // Le secondary est utilisé essentiellement en bouton large (text-base/font-medium)
  { label: "secondary-foreground / secondary", fg: "secondary-foreground", bg: "secondary", size: "large" },

  // Texte standard
  { label: "foreground / background", fg: "foreground", bg: "background" },
  { label: "foreground / card", fg: "foreground", bg: "card" },
  { label: "foreground / muted", fg: "foreground", bg: "muted" },
  { label: "foreground / accent", fg: "foreground", bg: "accent" },

  // Sidebar
  { label: "sidebar-foreground / sidebar-background", fg: "sidebar-foreground", bg: "sidebar-background" },
  { label: "sidebar-foreground / sidebar-accent", fg: "sidebar-foreground", bg: "sidebar-accent" },
];

const MODES: Array<{ id: "light" | "dark"; htmlClass: string }> = [
  { id: "light", htmlClass: "" },
  { id: "dark", htmlClass: "dark" },
];

// HTML minimal qui ne charge QUE le design system, pas l'app React.
function buildHarness(htmlClass: string, pairs: Pair[]): string {
  const swatches = pairs
    .map(
      (p, i) => `
        <div data-pair-idx="${i}"
             data-fg="${p.fg}"
             data-bg="${p.bg}"
             style="background: hsl(var(--${p.bg})); color: hsl(var(--${p.fg})); padding: 8px 12px; margin: 4px; font-size: 16px;">
          ${p.label} — Sample texte 0123 ÉéÀàÇç
        </div>`
    )
    .join("");

  return `<!doctype html>
<html lang="fr" class="${htmlClass}">
  <head>
    <meta charset="utf-8" />
    <title>Design tokens harness</title>
    <link rel="stylesheet" href="/src/index.css" />
  </head>
  <body>
    <main id="harness">${swatches}</main>
  </body>
</html>`;
}

// --- Test --------------------------------------------------------------------

test.describe("Design tokens — contraste WCAG AA (indépendant des pages)", () => {
  test.setTimeout(60_000);

  for (const mode of MODES) {
    test(`tokens contrast — ${mode.id}`, async ({ page }) => {
      // On sert la harness via data: URL n'est pas viable (CSS relatif à charger
      // depuis Vite), donc on route une URL inexistante et on injecte le HTML.
      const harness = buildHarness(mode.htmlClass, PAIRS);

      await page.route("**/__harness", (route) =>
        route.fulfill({
          status: 200,
          contentType: "text/html; charset=utf-8",
          body: harness,
        })
      );

      await page.goto(`${BASE_URL}/__harness`, { waitUntil: "networkidle" });

      // Attendre que la stylesheet soit appliquée (background non transparent)
      await page.waitForFunction(() => {
        const el = document.querySelector('[data-pair-idx="0"]') as HTMLElement | null;
        if (!el) return false;
        const bg = getComputedStyle(el).backgroundColor;
        return !!bg && bg !== "rgba(0, 0, 0, 0)" && bg !== "transparent";
      });

      const violations = await page.evaluate(() => {
        // Helpers WCAG -----------------------------------------------------
        function parseRgb(input: string): [number, number, number] | null {
          const m = input.match(/rgba?\(([^)]+)\)/i);
          if (!m) return null;
          const parts = m[1].split(",").map((s) => parseFloat(s.trim()));
          if (parts.length < 3 || parts.some((n) => Number.isNaN(n))) return null;
          return [parts[0], parts[1], parts[2]];
        }
        function relLum([r, g, b]: [number, number, number]): number {
          const conv = (c: number) => {
            const s = c / 255;
            return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
          };
          return 0.2126 * conv(r) + 0.7152 * conv(g) + 0.0722 * conv(b);
        }
        function ratio(a: [number, number, number], b: [number, number, number]): number {
          const la = relLum(a);
          const lb = relLum(b);
          const [hi, lo] = la > lb ? [la, lb] : [lb, la];
          return (hi + 0.05) / (lo + 0.05);
        }
        // ------------------------------------------------------------------
        const out: Array<{
          label: string;
          fg: string;
          bg: string;
          fgRgb: string;
          bgRgb: string;
          ratio: number;
          threshold: number;
          deficit: number;
        }> = [];

        const els = Array.from(document.querySelectorAll("[data-pair-idx]")) as HTMLElement[];
        for (const el of els) {
          const fg = el.dataset.fg!;
          const bg = el.dataset.bg!;
          const cs = getComputedStyle(el);
          const fgRgb = parseRgb(cs.color);
          const bgRgb = parseRgb(cs.backgroundColor);
          if (!fgRgb || !bgRgb) {
            out.push({
              label: `${fg} / ${bg}`,
              fg,
              bg,
              fgRgb: cs.color,
              bgRgb: cs.backgroundColor,
              ratio: 0,
              threshold: 4.5,
              deficit: 4.5,
            });
            continue;
          }
          // Le seuil est embarqué via data-threshold sinon défaut 4.5
          const threshold = parseFloat(el.dataset.threshold || "4.5");
          const r = ratio(fgRgb, bgRgb);
          if (r + 0.001 < threshold) {
            out.push({
              label: `${fg} / ${bg}`,
              fg,
              bg,
              fgRgb: cs.color,
              bgRgb: cs.backgroundColor,
              ratio: Math.round(r * 100) / 100,
              threshold,
              deficit: Math.round((threshold - r) * 100) / 100,
            });
          }
        }
        return out;
      });

      // Injecter les seuils "large" côté DOM via data-threshold avant éval :
      // on refait un eval ciblé pour les paires "large" (3:1) qui auraient
      // été flaggées à tort avec 4.5.
      const largeIdx = PAIRS.map((p, i) => (p.size === "large" ? i : -1)).filter((i) => i >= 0);
      if (largeIdx.length > 0) {
        await page.evaluate((idxs) => {
          for (const i of idxs) {
            const el = document.querySelector(`[data-pair-idx="${i}"]`) as HTMLElement | null;
            if (el) el.dataset.threshold = "3";
          }
        }, largeIdx);

        const reEval = await page.evaluate(() => {
          function parseRgb(input: string): [number, number, number] | null {
            const m = input.match(/rgba?\(([^)]+)\)/i);
            if (!m) return null;
            const parts = m[1].split(",").map((s) => parseFloat(s.trim()));
            if (parts.length < 3 || parts.some((n) => Number.isNaN(n))) return null;
            return [parts[0], parts[1], parts[2]];
          }
          function relLum([r, g, b]: [number, number, number]): number {
            const conv = (c: number) => {
              const s = c / 255;
              return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
            };
            return 0.2126 * conv(r) + 0.7152 * conv(g) + 0.0722 * conv(b);
          }
          function ratio(a: [number, number, number], b: [number, number, number]): number {
            const la = relLum(a);
            const lb = relLum(b);
            const [hi, lo] = la > lb ? [la, lb] : [lb, la];
            return (hi + 0.05) / (lo + 0.05);
          }
          const out: Record<string, { ratio: number; ok: boolean }> = {};
          const els = Array.from(
            document.querySelectorAll('[data-pair-idx][data-threshold="3"]')
          ) as HTMLElement[];
          for (const el of els) {
            const cs = getComputedStyle(el);
            const fgRgb = parseRgb(cs.color);
            const bgRgb = parseRgb(cs.backgroundColor);
            const key = `${el.dataset.fg}/${el.dataset.bg}`;
            if (!fgRgb || !bgRgb) {
              out[key] = { ratio: 0, ok: false };
              continue;
            }
            const r = ratio(fgRgb, bgRgb);
            out[key] = { ratio: Math.round(r * 100) / 100, ok: r + 0.001 >= 3 };
          }
          return out;
        });

        // Retirer des violations toutes les paires "large" qui passent à 3:1
        for (let i = violations.length - 1; i >= 0; i--) {
          const v = violations[i];
          const key = `${v.fg}/${v.bg}`;
          if (reEval[key]?.ok) {
            violations.splice(i, 1);
          } else if (reEval[key]) {
            // Mettre à jour le seuil affiché dans le rapport
            v.threshold = 3;
            v.ratio = reEval[key].ratio;
            v.deficit = Math.round((3 - reEval[key].ratio) * 100) / 100;
          }
        }
      }

      if (violations.length > 0) {
        const report =
          `\n\n=== Tokens en échec WCAG AA — mode ${mode.id} (${violations.length}) ===\n` +
          violations
            .map(
              (v, i) =>
                `\n[#${i + 1}] ${v.label}\n` +
                `      ratio   = ${v.ratio} (seuil ${v.threshold}, manque ${v.deficit})\n` +
                `      fg(rgb) = ${v.fgRgb}\n` +
                `      bg(rgb) = ${v.bgRgb}`
            )
            .join("\n");
        console.error(report);
      }

      expect(
        violations,
        `Tokens en échec WCAG AA en mode ${mode.id}: ${violations
          .map((v) => `${v.label}=${v.ratio}/${v.threshold}`)
          .join(", ")}`
      ).toEqual([]);
    });
  }
});
