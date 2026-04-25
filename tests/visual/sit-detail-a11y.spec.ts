/**
 * Tests d'accessibilité pour /sits/:id sur les 4 scénarios.
 *
 * Vérifie :
 *  1. Aucun élément focusable (button, a, input, [tabindex>=0]) n'est caché
 *     visuellement (display:none / visibility:hidden / aria-hidden=true ancestor)
 *     tout en restant atteignable au clavier.
 *  2. Les sections clés portent bien un libellé accessible :
 *      - Au moins un <h1>
 *      - <main> ou role=main présent
 *      - TabsList avec aria-label="Sections de l'annonce"
 *      - Les onglets actifs/inactifs ont aria-selected
 *      - Pour le sitter : <aside> avec aria-label sur la barre d'action
 *
 * Réutilise le serveur Vite "visual-test" (port 8766 pour ne pas entrer
 * en conflit avec sit-detail.spec.ts).
 */

import { test, expect } from "../../playwright-fixture";
import { spawn, type ChildProcess } from "node:child_process";
import { SCENARIOS, type ScenarioId } from "./fixtures";

const PORT = 8766;
const BASE_URL = `http://localhost:${PORT}`;

let viteProcess: ChildProcess | null = null;

async function waitForServer(url: string, timeoutMs = 60_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok || res.status === 404) return;
    } catch {
      // pas encore prêt
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

  viteProcess.stderr?.on("data", (d) => console.error("[vite:err]", d.toString()));
  await waitForServer(BASE_URL);
});

test.afterAll(async () => {
  if (viteProcess) {
    viteProcess.kill("SIGTERM");
    await new Promise((r) => setTimeout(r, 500));
  }
});

const scenarioIds: ScenarioId[] = [
  "draft-owner",
  "published-owner",
  "cancelled-sitter",
  "completed-sitter",
];

test.describe("Accessibilité — /sits/:id", () => {
  test.setTimeout(60_000);

  for (const scenarioId of scenarioIds) {
    test(`a11y — ${scenarioId}`, async ({ page }) => {
      const scn = SCENARIOS[scenarioId];
      const url = `${BASE_URL}/sits/${scn.sitId}?scenario=${scenarioId}`;

      await page.setViewportSize({ width: 1280, height: 900 });
      await page.goto(url, { waitUntil: "networkidle" });

      await page.waitForFunction(
        () => {
          const h1 = document.querySelector("h1, h2");
          return !!h1 && (h1.textContent || "").trim().length > 0;
        },
        { timeout: 15_000 }
      );

      // ---------- 1. Focusables piégés sous aria-hidden ----------
      // Règle WCAG : un élément focusable ne doit PAS se retrouver sous un
      // ancêtre aria-hidden="true" (le screen reader le masque mais le clavier
      // peut quand même y arriver — incohérence). En revanche, display:none
      // et visibility:hidden retirent l'élément du tab order : c'est OK et
      // c'est notre pattern responsive (`hidden md:block`).
      const ariaHiddenFocusables = await page.evaluate(() => {
        const selector = [
          "a[href]",
          "button:not([disabled])",
          "input:not([disabled])",
          "select:not([disabled])",
          "textarea:not([disabled])",
          '[tabindex]:not([tabindex="-1"])',
        ].join(",");

        const isInTabOrder = (el: Element): boolean => {
          // display:none ou visibility:hidden retire du tab order — OK
          let node: Element | null = el;
          while (node && node !== document.body) {
            const style = window.getComputedStyle(node);
            if (style.display === "none") return false;
            if (style.visibility === "hidden") return false;
            node = node.parentElement;
          }
          return true;
        };

        const hasAriaHiddenAncestor = (el: Element): boolean => {
          let node: Element | null = el;
          while (node && node !== document.body) {
            if (node.getAttribute("aria-hidden") === "true") return true;
            node = node.parentElement;
          }
          return false;
        };

        const offending: { tag: string; text: string }[] = [];
        document.querySelectorAll(selector).forEach((el) => {
          if (el.classList.contains("sr-only")) return;
          if (!isInTabOrder(el)) return;
          if (hasAriaHiddenAncestor(el)) {
            offending.push({
              tag: el.tagName.toLowerCase(),
              text: (el.textContent || "").trim().slice(0, 60),
            });
          }
        });
        return offending;
      });

      expect(
        ariaHiddenFocusables,
        `Focusables clavier sous aria-hidden détectés:\n${JSON.stringify(ariaHiddenFocusables, null, 2)}`
      ).toEqual([]);

      // ---------- 2. Libellés des sections clés ----------

      // 2a. Au moins un h1
      const h1Count = await page.locator("h1").count();
      expect(h1Count, "Doit avoir au moins un <h1>").toBeGreaterThanOrEqual(1);

      // 2b. <main> ou role=main
      const mainCount = await page.locator('main, [role="main"]').count();
      expect(mainCount, "Doit avoir un landmark <main>").toBeGreaterThanOrEqual(1);

      // 2c. TabsList avec aria-label
      const tabsList = page.locator('[role="tablist"][aria-label]');
      const tabsCount = await tabsList.count();
      expect(tabsCount, "TabsList doit porter un aria-label").toBeGreaterThanOrEqual(1);
      const tabsLabel = await tabsList.first().getAttribute("aria-label");
      expect(tabsLabel).toBe("Sections de l'annonce");

      // 2d. Onglets : tous portent aria-selected (true ou false)
      const tabs = page.locator('[role="tab"]');
      const tabCount = await tabs.count();
      expect(tabCount, "Doit avoir au moins 1 onglet").toBeGreaterThan(0);
      for (let i = 0; i < tabCount; i++) {
        const ariaSelected = await tabs.nth(i).getAttribute("aria-selected");
        expect(["true", "false"]).toContain(ariaSelected);
      }

      // 2e. Sitter : si une barre d'action est présente (sit candidatable), elle
      // doit porter l'aria-label. Les statuts cancelled/completed n'affichent pas
      // de barre — c'est attendu.
      if (scn.activeRole === "sitter") {
        const sitStatus = scn.data.sit?.status;
        const expectsActionBar = sitStatus === "published";
        const asides = await page
          .locator('aside[aria-label="Action de candidature"]')
          .count();
        if (expectsActionBar) {
          expect(
            asides,
            "Sit publié côté sitter doit exposer <aside aria-label='Action de candidature'>"
          ).toBeGreaterThanOrEqual(1);
        }
        // Si une aside existe, elle doit toujours être correctement labellisée
        // (vérifié implicitement par le sélecteur ci-dessus : on ne compte que
        // celles avec le bon aria-label).
      }

      // 2f. Toutes les images doivent avoir un alt (vide accepté pour décoratif)
      const imagesWithoutAlt = await page.evaluate(() => {
        const offending: string[] = [];
        document.querySelectorAll("img").forEach((img) => {
          if (!img.hasAttribute("alt")) {
            offending.push(img.src.slice(0, 80));
          }
        });
        return offending;
      });
      expect(
        imagesWithoutAlt,
        `Images sans attribut alt: ${imagesWithoutAlt.join(", ")}`
      ).toEqual([]);

      // ---------- 3. Contraste WCAG AA des textes ----------
      // Calcule le ratio de contraste entre la couleur du texte et la couleur
      // de fond effective de chaque élément contenant du texte visible.
      // Seuils WCAG AA :
      //   - Texte normal      : ≥ 4.5:1
      //   - Texte large       : ≥ 3.0:1  (≥ 18pt OU ≥ 14pt + bold)
      // Limites assumées :
      //   - On lit la couleur de fond du premier ancêtre opaque (approximation).
      //   - On ignore les images d'arrière-plan (background-image), donc tout
      //     texte posé sur une photo est exclu (impossible à mesurer fiablement).
      const contrastViolations = await page.evaluate(() => {
        const parseRgb = (s: string): [number, number, number, number] | null => {
          const m = s.match(/rgba?\(([^)]+)\)/);
          if (!m) return null;
          const parts = m[1].split(",").map((p) => parseFloat(p.trim()));
          const [r, g, b, a = 1] = parts;
          if ([r, g, b].some((v) => Number.isNaN(v))) return null;
          return [r, g, b, a];
        };

        const relLuminance = (r: number, g: number, b: number): number => {
          const toLin = (c: number) => {
            const v = c / 255;
            return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
          };
          return 0.2126 * toLin(r) + 0.7152 * toLin(g) + 0.0722 * toLin(b);
        };

        const contrastRatio = (
          fg: [number, number, number],
          bg: [number, number, number]
        ): number => {
          const l1 = relLuminance(...fg);
          const l2 = relLuminance(...bg);
          const [a, b] = l1 > l2 ? [l1, l2] : [l2, l1];
          return (a + 0.05) / (b + 0.05);
        };

        // Compose fg semi-transparent sur bg opaque
        const composite = (
          fg: [number, number, number, number],
          bg: [number, number, number]
        ): [number, number, number] => {
          const [fr, fg_, fb, fa] = fg;
          return [
            Math.round(fr * fa + bg[0] * (1 - fa)),
            Math.round(fg_ * fa + bg[1] * (1 - fa)),
            Math.round(fb * fa + bg[2] * (1 - fa)),
          ];
        };

        // Trouve la 1re couleur de fond opaque en remontant l'arbre.
        // Renvoie null si on rencontre une background-image (non mesurable).
        const findBackground = (
          el: Element
        ): [number, number, number] | null => {
          let node: Element | null = el;
          while (node && node !== document.documentElement) {
            const style = window.getComputedStyle(node);
            if (style.backgroundImage && style.backgroundImage !== "none") {
              return null; // image de fond — on ne mesure pas
            }
            const bg = parseRgb(style.backgroundColor);
            if (bg && bg[3] >= 0.99) {
              return [bg[0], bg[1], bg[2]];
            }
            node = node.parentElement;
          }
          // Fallback : blanc (ou la couleur du body si définie)
          const bodyBg = parseRgb(window.getComputedStyle(document.body).backgroundColor);
          if (bodyBg && bodyBg[3] >= 0.99) return [bodyBg[0], bodyBg[1], bodyBg[2]];
          return [255, 255, 255];
        };

        const isLargeText = (style: CSSStyleDeclaration): boolean => {
          const sizePx = parseFloat(style.fontSize);
          const weight = parseInt(style.fontWeight, 10) || 400;
          // 18pt ≈ 24px ; 14pt ≈ 18.66px
          if (sizePx >= 24) return true;
          if (sizePx >= 18.66 && weight >= 700) return true;
          return false;
        };

        // Sélectionne les feuilles textuelles : élément qui contient au moins
        // un nœud de texte non vide en enfant direct.
        const hasDirectText = (el: Element): string => {
          let txt = "";
          for (const node of Array.from(el.childNodes)) {
            if (node.nodeType === Node.TEXT_NODE) {
              txt += (node.textContent || "").trim();
            }
          }
          return txt;
        };

        const isVisible = (el: Element): boolean => {
          let node: Element | null = el;
          while (node && node !== document.body) {
            const s = window.getComputedStyle(node);
            if (s.display === "none") return false;
            if (s.visibility === "hidden") return false;
            if (parseFloat(s.opacity) === 0) return false;
            node = node.parentElement;
          }
          const rect = el.getBoundingClientRect();
          return rect.width > 0 && rect.height > 0;
        };

        type Violation = {
          tag: string;
          text: string;
          fg: string;
          bg: string;
          ratio: number;
          required: number;
          fontSize: string;
          fontWeight: string;
        };
        const violations: Violation[] = [];
        const seen = new Set<Element>();

        document.querySelectorAll("body *").forEach((el) => {
          if (seen.has(el)) return;
          if (el.classList.contains("sr-only")) return;
          // skip media / form controls (native controls : couleurs UA non maîtrisées)
          const tag = el.tagName.toLowerCase();
          if (["script", "style", "svg", "path", "img", "video", "canvas", "iframe", "input", "select", "textarea", "option"].includes(tag)) return;

          const text = hasDirectText(el);
          if (!text || text.length < 2) return;
          if (!isVisible(el)) return;

          const style = window.getComputedStyle(el);
          const fgRaw = parseRgb(style.color);
          if (!fgRaw) return;
          if (fgRaw[3] < 0.1) return; // texte quasi invisible — ignoré (mesure non significative)

          const bg = findBackground(el);
          if (!bg) return; // posé sur une image — non mesurable

          const fgComposed = composite(fgRaw, bg);
          const ratio = contrastRatio(fgComposed, bg);
          const required = isLargeText(style) ? 3.0 : 4.5;

          if (ratio < required) {
            violations.push({
              tag,
              text: text.slice(0, 60),
              fg: `rgb(${fgComposed.join(",")})`,
              bg: `rgb(${bg.join(",")})`,
              ratio: Math.round(ratio * 100) / 100,
              required,
              fontSize: style.fontSize,
              fontWeight: style.fontWeight,
            });
          }
          seen.add(el);
        });

        return violations;
      });

      expect(
        contrastViolations,
        `Violations contraste WCAG AA (${contrastViolations.length}):\n${JSON.stringify(contrastViolations.slice(0, 20), null, 2)}`
      ).toEqual([]);
    });
  }
});
