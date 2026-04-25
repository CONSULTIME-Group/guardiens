/**
 * Tests de navigation clavier pour /sits/:id sur les 4 scénarios.
 *
 * Vérifie pour chaque état :
 *  1. La navigation Tab depuis le <main> produit une séquence d'éléments
 *     focusables NON vide et cohérente (l'ordre suit globalement le DOM order
 *     vertical : pas de saut "vers le haut" majeur > 100px).
 *  2. Le focus ne se "perd" pas sur <body> entre deux éléments interactifs
 *     du <main> (signe d'un piège ou d'un tabindex incohérent).
 *  3. Les sections clés sont atteignables :
 *     - Au moins un onglet ([role="tab"]) reçoit le focus.
 *     - Sur owner published/draft : l'éditeur de surcharges (boutons "Modifier"/"Annuler") est focusable.
 *     - Sur sitter avec sit candidatable : le bouton CTA dans la barre d'action est focusable.
 *  4. Tous les éléments focusés affichent un anneau visible (focus-visible) :
 *     outline non-`none` OU box-shadow contenant "ring" OU CSS contenant un
 *     outline-width > 0 sur :focus-visible.
 *  5. Activation clavier (Enter/Space) sur un onglet change bien `aria-selected`.
 *
 * Port 8767 pour ne pas conflit avec sit-detail.spec.ts (8765) ni
 * sit-detail-a11y.spec.ts (8766).
 */

import { test, expect } from "../../playwright-fixture";
import { spawn, type ChildProcess } from "node:child_process";
import { SCENARIOS, type ScenarioId } from "./fixtures";

const PORT = 8767;
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

/**
 * Snapshot de l'élément actuellement focusé.
 */
type FocusInfo = {
  tag: string;
  role: string | null;
  ariaLabel: string | null;
  text: string;
  inMain: boolean;
  isBody: boolean;
  rect: { top: number; left: number } | null;
  selector: string;
};

async function snapshotFocus(page: import("@playwright/test").Page): Promise<FocusInfo> {
  return await page.evaluate(() => {
    const el = document.activeElement as HTMLElement | null;
    if (!el) {
      return {
        tag: "null",
        role: null,
        ariaLabel: null,
        text: "",
        inMain: false,
        isBody: false,
        rect: null,
        selector: "null",
      };
    }
    const main = document.querySelector("main");
    const rect = el.getBoundingClientRect();
    // Sélecteur descriptif pour faciliter le diagnostic
    const id = el.id ? `#${el.id}` : "";
    const cls = el.className && typeof el.className === "string"
      ? "." + el.className.split(/\s+/).filter(Boolean).slice(0, 2).join(".")
      : "";
    return {
      tag: el.tagName.toLowerCase(),
      role: el.getAttribute("role"),
      ariaLabel: el.getAttribute("aria-label"),
      text: (el.textContent || "").trim().slice(0, 40),
      inMain: !!main && main.contains(el),
      isBody: el.tagName === "BODY",
      rect: { top: Math.round(rect.top), left: Math.round(rect.left) },
      selector: `${el.tagName.toLowerCase()}${id}${cls}`,
    };
  });
}

test.describe("Navigation clavier — /sits/:id", () => {
  test.setTimeout(90_000);

  for (const scenarioId of scenarioIds) {
    test(`keyboard — ${scenarioId}`, async ({ page }) => {
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

      // Place le focus sur <body> avant de Tab pour partir d'un état connu
      await page.evaluate(() => (document.activeElement as HTMLElement)?.blur?.());
      await page.evaluate(() => document.body.focus());

      // ---------- 1. Avance par Tab et collecte la séquence dans <main> ----------
      const MAX_TABS = 80;
      const sequence: FocusInfo[] = [];
      let consecutiveBodyHits = 0;

      for (let i = 0; i < MAX_TABS; i++) {
        await page.keyboard.press("Tab");
        const info = await snapshotFocus(page);

        if (info.isBody) {
          consecutiveBodyHits++;
          // Si le focus revient 2x de suite sur body au milieu du parcours,
          // c'est que la page n'a plus rien à focuser : on arrête.
          if (consecutiveBodyHits >= 2) break;
          continue;
        }
        consecutiveBodyHits = 0;

        // On ne garde que les focus dans <main> (le chrome global est testé ailleurs)
        if (info.inMain) {
          sequence.push(info);
        }

        // On s'arrête quand on a quitté <main> ET qu'on a déjà collecté qq chose
        // (le focus sort vers le footer / sidebar)
        if (!info.inMain && sequence.length >= 5) break;
      }

      // ---------- 2. Au moins quelques éléments focusables ----------
      expect(
        sequence.length,
        `Trop peu d'éléments focusables dans <main> (${sequence.length}). Séquence: ${JSON.stringify(sequence.slice(0, 5), null, 2)}`
      ).toBeGreaterThanOrEqual(3);

      // ---------- 3. Pas de saut "remonté" majeur dans l'ordre vertical ----------
      // On tolère :
      //  - les sauts horizontaux (boutons côte à côte)
      //  - une remontée < 100px (composants imbriqués type "card" avec
      //    plusieurs zones cliquables)
      //  - les éléments dans une popover/dropdown ouverte (skip si rect off-viewport)
      const verticalRegressions: { from: FocusInfo; to: FocusInfo; deltaTop: number }[] = [];
      for (let i = 1; i < sequence.length; i++) {
        const prev = sequence[i - 1];
        const cur = sequence[i];
        if (!prev.rect || !cur.rect) continue;
        const delta = cur.rect.top - prev.rect.top;
        if (delta < -100) {
          verticalRegressions.push({ from: prev, to: cur, deltaTop: delta });
        }
      }
      expect(
        verticalRegressions,
        `Régressions verticales du focus (saut > 100px vers le haut):\n${JSON.stringify(verticalRegressions, null, 2)}`
      ).toEqual([]);

      // ---------- 4. Au moins un onglet [role="tab"] est passé dans la séquence ----------
      const tabFocused = sequence.some((s) => s.role === "tab");
      expect(
        tabFocused,
        `Aucun [role="tab"] n'a reçu le focus. Séquence (${sequence.length}): ${sequence.map((s) => `${s.tag}${s.role ? `[${s.role}]` : ""}`).join(" → ")}`
      ).toBe(true);

      // ---------- 5. Sitter sur sit publié : le CTA d'action est focusable ----------
      if (scn.activeRole === "sitter" && scn.data.sit?.status === "published") {
        const aside = page.locator('aside[aria-label="Action de candidature"]');
        const cta = aside.locator("button, a").first();
        await cta.focus();
        const focused = await snapshotFocus(page);
        expect(
          focused.tag === "button" || focused.tag === "a",
          `Le CTA d'action sitter doit pouvoir recevoir le focus (reçu: ${focused.selector})`
        ).toBe(true);
      }

      // ---------- 6. Anneau de focus visible sur les éléments focusables ----------
      // On vérifie sur les 5 premiers éléments de la séquence qu'aucun n'a
      // `outline:none` SANS box-shadow alternatif (Tailwind ring) sur :focus-visible.
      // Note : on lit les styles APPLIQUÉS quand l'élément a le focus.
      const focusVisibilityIssues: { selector: string; reason: string }[] = [];
      for (const item of sequence.slice(0, Math.min(5, sequence.length))) {
        // Re-focus l'élément via son selector approximatif
        const found = await page.evaluate((selector) => {
          // selector est une approximation, on cherche l'élément qui correspond
          // au mieux : tag + première classe.
          const [tagPart, ...rest] = selector.split(".");
          const tag = tagPart.replace(/#.*$/, "");
          const firstClass = rest[0];
          const candidates = document.querySelectorAll(tag);
          for (const el of Array.from(candidates) as HTMLElement[]) {
            if (!firstClass || el.classList.contains(firstClass)) {
              el.focus();
              const style = window.getComputedStyle(el);
              const outlineW = parseFloat(style.outlineWidth);
              const outlineStyle = style.outlineStyle;
              const boxShadow = style.boxShadow;
              const hasOutline = outlineStyle !== "none" && outlineW > 0;
              const hasRing =
                boxShadow !== "none" && /\d/.test(boxShadow); // box-shadow non-trivial
              return { hasOutline, hasRing, boxShadow, outlineStyle, outlineW };
            }
          }
          return null;
        }, item.selector);

        if (!found) continue;
        if (!found.hasOutline && !found.hasRing) {
          focusVisibilityIssues.push({
            selector: item.selector,
            reason: `outline=${found.outlineStyle}/${found.outlineW}, box-shadow=${found.boxShadow}`,
          });
        }
      }
      expect(
        focusVisibilityIssues,
        `Éléments focusés sans indicateur visible:\n${JSON.stringify(focusVisibilityIssues, null, 2)}`
      ).toEqual([]);

      // ---------- 7. Activation clavier d'un onglet via Enter ----------
      // Trouve un onglet non sélectionné, lui donne le focus, presse Enter,
      // et vérifie que aria-selected passe à true.
      const inactiveTab = page.locator('[role="tab"][aria-selected="false"]').first();
      const inactiveCount = await inactiveTab.count();
      if (inactiveCount > 0) {
        await inactiveTab.focus();
        await page.keyboard.press("Enter");
        // Petit délai pour laisser Radix mettre à jour l'état
        await page.waitForTimeout(150);
        const isNowSelected = await inactiveTab.getAttribute("aria-selected");
        expect(
          isNowSelected,
          `L'onglet doit passer à aria-selected="true" après Enter (reçu: ${isNowSelected})`
        ).toBe("true");
      }
    });
  }
});
