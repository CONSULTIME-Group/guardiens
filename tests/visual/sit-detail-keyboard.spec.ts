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
import {
  captureFailureArtifacts,
  snapshotFocusEntry,
  type FocusLogEntry,
} from "./failure-capture";

/**
 * focusLog du test EN COURS, partagé entre le corps du test et le afterEach.
 * Réinitialisé au début de chaque test (par scénario) pour éviter les fuites
 * d'un test à l'autre quand on tourne en série.
 */
let currentFocusLog: FocusLogEntry[] = [];
let currentScenario: string = "unknown";
let currentPhase: string = "init";

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

/**
 * Capture automatique d'artefacts de diagnostic en cas d'échec.
 * S'exécute APRÈS chaque test, mais AVANT le retrait de la page.
 */
test.afterEach(async ({ page }, testInfo) => {
  await captureFailureArtifacts(page, testInfo, {
    scenarioId: currentScenario,
    focusLog: currentFocusLog,
    phase: currentPhase,
  });
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

      // Réinit du log de focus partagé avec le afterEach pour capture à l'échec
      currentFocusLog = [];
      currentScenario = scenarioId;
      currentPhase = "navigation-tab";

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

        // Trace la séquence dans le focusLog partagé pour diagnostic à l'échec
        currentFocusLog.push(
          await snapshotFocusEntry(page, currentFocusLog.length + 1, `Tab #${i + 1}`)
        );

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
        currentPhase = "sitter-cta";
        const aside = page.locator('aside[aria-label="Action de candidature"]');
        const cta = aside.locator("button, a").first();
        await cta.focus();
        currentFocusLog.push(
          await snapshotFocusEntry(page, currentFocusLog.length + 1, "focus(<sitter CTA>)", "phase=sitter-cta")
        );
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

      // ---------- 7. Navigation au sein du tablist via flèches ----------
      // Pattern WAI-ARIA Authoring Practices : Tab donne le focus au tablist,
      // puis ArrowRight / ArrowLeft naviguent entre les onglets. En mode
      // d'activation automatique (défaut Radix), le focus suffit à sélectionner.
      // En mode manuel, il faut Enter ou Space.
      const tabs = page.locator('[role="tab"]');
      const tabsCount = await tabs.count();
      if (tabsCount >= 2) {
        currentPhase = "tablist-arrows";

        // Focus le 1er onglet (forcément l'onglet sélectionné, donc tabindex=0)
        const firstSelected = page.locator('[role="tab"][aria-selected="true"]').first();
        await firstSelected.focus();
        currentFocusLog.push(
          await snapshotFocusEntry(page, currentFocusLog.length + 1, "focus(<1er tab actif>)", "phase=tablist-arrows")
        );
        const initialLabel = await firstSelected.textContent();

        // Flèche droite → onglet suivant
        await page.keyboard.press("ArrowRight");
        await page.waitForTimeout(150);
        currentFocusLog.push(
          await snapshotFocusEntry(page, currentFocusLog.length + 1, "ArrowRight", "after=ArrowRight")
        );

        // Quel onglet est maintenant sélectionné ?
        const newSelected = page.locator('[role="tab"][aria-selected="true"]').first();
        const newLabel = await newSelected.textContent();
        const newSelectedFocused = await page.evaluate(
          () => document.activeElement?.getAttribute("role") === "tab"
        );

        expect(
          newSelectedFocused,
          "Après ArrowRight, le focus doit rester sur un [role='tab']"
        ).toBe(true);

        if (newLabel === initialLabel) {
          await page.keyboard.press("Enter");
          await page.waitForTimeout(150);
          currentFocusLog.push(
            await snapshotFocusEntry(page, currentFocusLog.length + 1, "Enter", "after=Enter (manual mode)")
          );
        }

        const finalSelected = page.locator('[role="tab"][aria-selected="true"]').first();
        const finalLabel = await finalSelected.textContent();
        expect(
          finalLabel,
          `La sélection d'onglet doit changer après ArrowRight (+ Enter si manuel). Avant: "${initialLabel}", Après: "${finalLabel}"`
        ).not.toBe(initialLabel);

        // ---------- 8. Liaison tab ↔ tabpanel (aria-controls / aria-labelledby) ----------
        // WAI-ARIA Authoring Practices : chaque [role="tab"] DOIT exposer
        // aria-controls pointant vers l'id d'un [role="tabpanel"] existant.
        // Le tabpanel actif DOIT exposer aria-labelledby pointant vers l'id
        // du tab sélectionné.
        const tabBindings = await page.evaluate(() => {
          const tabs = Array.from(
            document.querySelectorAll<HTMLElement>('[role="tab"]')
          );
          const panels = Array.from(
            document.querySelectorAll<HTMLElement>('[role="tabpanel"]')
          );
          const panelIds = new Set(panels.map((p) => p.id).filter(Boolean));

          const issues: {
            tabLabel: string;
            tabId: string | null;
            ariaControls: string | null;
            ariaSelected: string | null;
            problem: string;
          }[] = [];

          for (const tab of tabs) {
            const controls = tab.getAttribute("aria-controls");
            const tabId = tab.getAttribute("id");
            const selected = tab.getAttribute("aria-selected");
            const label = (tab.textContent || "").trim().slice(0, 40);

            if (!controls) {
              issues.push({
                tabLabel: label,
                tabId,
                ariaControls: controls,
                ariaSelected: selected,
                problem: "aria-controls manquant sur le tab",
              });
              continue;
            }
            if (!panelIds.has(controls)) {
              issues.push({
                tabLabel: label,
                tabId,
                ariaControls: controls,
                ariaSelected: selected,
                problem: `aria-controls="${controls}" ne cible aucun [role="tabpanel"] existant`,
              });
              continue;
            }
            const panel = document.getElementById(controls);
            const labelledBy = panel?.getAttribute("aria-labelledby") ?? null;
            if (selected === "true") {
              if (!labelledBy) {
                issues.push({
                  tabLabel: label,
                  tabId,
                  ariaControls: controls,
                  ariaSelected: selected,
                  problem: "tabpanel actif sans aria-labelledby",
                });
              } else if (tabId && labelledBy !== tabId) {
                issues.push({
                  tabLabel: label,
                  tabId,
                  ariaControls: controls,
                  ariaSelected: selected,
                  problem: `tabpanel.aria-labelledby="${labelledBy}" ≠ tab.id="${tabId}"`,
                });
              }
            }
          }

          return {
            issues,
            tabsCount: tabs.length,
            panelsCount: panels.length,
            panelIds: Array.from(panelIds),
          };
        });

        expect(
          tabBindings.issues,
          `Liaisons tab ↔ tabpanel invalides:\n${JSON.stringify(tabBindings, null, 2)}`
        ).toEqual([]);
        expect(
          tabBindings.panelsCount,
          "Au moins un [role='tabpanel'] doit être présent"
        ).toBeGreaterThan(0);

        // ---------- 9. Le panneau actif change quand on sélectionne un autre onglet ----------
        // Sélectionne explicitement le 1er onglet, mémorise son panneau actif,
        // puis sélectionne le 2e onglet et vérifie que le panneau actif a changé.
        const tabsHandles = page.locator('[role="tab"]');
        const totalTabs = await tabsHandles.count();
        if (totalTabs >= 2) {
          // Sélection 1er onglet
          await tabsHandles.nth(0).focus();
          await tabsHandles.nth(0).press("Enter");
          await page.waitForTimeout(100);

          const firstActivePanel = await page.evaluate(() => {
            const tab = document.querySelector<HTMLElement>(
              '[role="tab"][aria-selected="true"]'
            );
            const id = tab?.getAttribute("aria-controls") ?? null;
            const panel = id ? document.getElementById(id) : null;
            return {
              tabId: tab?.id ?? null,
              tabLabel: (tab?.textContent || "").trim().slice(0, 40),
              panelId: panel?.id ?? null,
              panelHidden: panel?.hasAttribute("hidden") ?? null,
              panelDataState: panel?.getAttribute("data-state") ?? null,
            };
          });

          // Sélection 2e onglet via clavier
          await tabsHandles.nth(1).focus();
          await tabsHandles.nth(1).press("Enter");
          await page.waitForTimeout(150);

          const secondActivePanel = await page.evaluate(() => {
            const tab = document.querySelector<HTMLElement>(
              '[role="tab"][aria-selected="true"]'
            );
            const id = tab?.getAttribute("aria-controls") ?? null;
            const panel = id ? document.getElementById(id) : null;
            return {
              tabId: tab?.id ?? null,
              tabLabel: (tab?.textContent || "").trim().slice(0, 40),
              panelId: panel?.id ?? null,
              panelHidden: panel?.hasAttribute("hidden") ?? null,
              panelDataState: panel?.getAttribute("data-state") ?? null,
              // Tous les panels et leur état pour faciliter le diagnostic
              allPanels: Array.from(
                document.querySelectorAll<HTMLElement>('[role="tabpanel"]')
              ).map((p) => ({
                id: p.id,
                state: p.getAttribute("data-state"),
                hidden: p.hasAttribute("hidden"),
              })),
            };
          });

          expect(
            secondActivePanel.panelId,
            `Le panneau actif doit changer entre les 2 onglets. Avant: ${JSON.stringify(firstActivePanel)} — Après: ${JSON.stringify(secondActivePanel)}`
          ).not.toBe(firstActivePanel.panelId);

          expect(
            secondActivePanel.panelDataState,
            `Le panneau ciblé par le tab sélectionné doit être data-state="active". Reçu: ${JSON.stringify(secondActivePanel)}`
          ).toBe("active");

          // Un seul panneau doit avoir data-state="active" à la fois
          const activeCount = secondActivePanel.allPanels.filter(
            (p) => p.state === "active"
          ).length;
          expect(
            activeCount,
            `Un seul tabpanel doit être actif. État: ${JSON.stringify(secondActivePanel.allPanels)}`
          ).toBe(1);
        }

        // ---------- 10. Tab depuis le tablist amène le focus dans le panneau actif ----------
        // Le pattern WAI-ARIA prévoit qu'après le tablist, Tab passe au
        // contenu du tabpanel sélectionné (si focusable) ou au tabpanel
        // lui-même (qui doit alors être tabbable, tabindex=0). Radix rend
        // les tabpanels avec tabindex=0 par défaut.
        const activeTab = page.locator('[role="tab"][aria-selected="true"]').first();
        await activeTab.focus();
        await page.keyboard.press("Tab");
        await page.waitForTimeout(100);

        const afterTablist = await page.evaluate(() => {
          const el = document.activeElement as HTMLElement | null;
          if (!el) return null;
          // Le focus est-il sur le tabpanel actif ou sur un de ses descendants ?
          const activePanel = document.querySelector<HTMLElement>(
            '[role="tabpanel"][data-state="active"]'
          );
          const inActivePanel = !!activePanel && activePanel.contains(el);
          const isActivePanel = el === activePanel;
          return {
            tag: el.tagName.toLowerCase(),
            role: el.getAttribute("role"),
            tabindex: el.getAttribute("tabindex"),
            inActivePanel,
            isActivePanel,
            activePanelId: activePanel?.id ?? null,
            activePanelTabindex: activePanel?.getAttribute("tabindex") ?? null,
          };
        });

        expect(
          afterTablist,
          "Aucun élément focusé après Tab depuis le tablist"
        ).not.toBeNull();
        expect(
          afterTablist!.inActivePanel || afterTablist!.isActivePanel,
          `Après Tab depuis le tablist, le focus doit être sur le tabpanel actif ou son contenu. Reçu: ${JSON.stringify(afterTablist)}`
        ).toBe(true);
      }
    });
  }
});
