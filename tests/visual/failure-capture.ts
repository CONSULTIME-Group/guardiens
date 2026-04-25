/**
 * Helpers partagés pour capturer automatiquement, en cas d'échec d'un test
 * Playwright sur SitDetail, un ensemble d'artefacts de diagnostic :
 *
 *  - Screenshot pleine page (fullPage) du scénario en cours.
 *  - Screenshot zoomé sur le dernier élément ayant reçu le focus
 *    (s'il existe encore et a un rect non vide).
 *  - JSON de la séquence de focus collectée pendant le test.
 *  - HTML compact des éléments focusables principaux du <main>.
 *  - Méta : URL, scénario, viewport, user agent.
 *
 * Tous les artefacts sont attachés à `testInfo` via `attach()` ce qui permet :
 *   - de les retrouver dans le rapport HTML Playwright,
 *   - de les voir dans `test-results/<test>/...`,
 *   - de les inspecter en CI sans relancer le test.
 *
 * Utilisation type dans un spec :
 *
 *   const focusLog: FocusLogEntry[] = [];
 *   test.afterEach(async ({ page }, testInfo) => {
 *     await captureFailureArtifacts(page, testInfo, {
 *       scenarioId,
 *       focusLog,
 *     });
 *   });
 */

import type { Page, TestInfo } from "@playwright/test";

export type FocusLogEntry = {
  step: number;
  /** Ex: "Tab #3", "ArrowRight", "focus(<CTA>)". */
  action: string;
  tag: string;
  role: string | null;
  ariaLabel: string | null;
  text: string;
  inMain: boolean;
  isBody: boolean;
  rect: { top: number; left: number; width: number; height: number } | null;
  selector: string;
  /** Marque la dernière entrée juste avant l'assertion qui a échoué. */
  marker?: string;
};

export type CaptureOptions = {
  scenarioId: string;
  /** Séquence de focus collectée par le test (ordre chronologique). */
  focusLog: FocusLogEntry[];
  /** Étiquette additionnelle (ex: "phase=tablist", "after=ArrowRight"). */
  phase?: string;
};

/**
 * Snapshot du focus courant, format aligné avec FocusLogEntry. À utiliser
 * dans le test pour pousser des entrées au focusLog au fil de la navigation.
 */
export async function snapshotFocusEntry(
  page: Page,
  step: number,
  action: string,
  marker?: string
): Promise<FocusLogEntry> {
  const data = await page.evaluate(() => {
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
    const r = el.getBoundingClientRect();
    const id = el.id ? `#${el.id}` : "";
    const cls =
      el.className && typeof el.className === "string"
        ? "." +
          el.className
            .split(/\s+/)
            .filter(Boolean)
            .slice(0, 2)
            .join(".")
        : "";
    return {
      tag: el.tagName.toLowerCase(),
      role: el.getAttribute("role"),
      ariaLabel: el.getAttribute("aria-label"),
      text: (el.textContent || "").trim().slice(0, 60),
      inMain: !!main && main.contains(el),
      isBody: el.tagName === "BODY",
      rect: r.width > 0 || r.height > 0
        ? {
            top: Math.round(r.top),
            left: Math.round(r.left),
            width: Math.round(r.width),
            height: Math.round(r.height),
          }
        : null,
      selector: `${el.tagName.toLowerCase()}${id}${cls}`,
    };
  });
  return { step, action, marker, ...data };
}

/**
 * À appeler dans un afterEach. Si le test a échoué, attache au `testInfo` :
 *   - focus-sequence.json
 *   - focusable-elements.html
 *   - meta.json
 *   - screenshot-fullpage.png
 *   - screenshot-last-focus.png (si dernier rect dispo)
 *
 * Aucune erreur n'est propagée si une capture échoue : on ne veut pas masquer
 * l'erreur originale du test.
 */
export async function captureFailureArtifacts(
  page: Page,
  testInfo: TestInfo,
  opts: CaptureOptions
): Promise<void> {
  // Le test n'a pas échoué : rien à faire.
  if (testInfo.status === testInfo.expectedStatus) return;

  const { scenarioId, focusLog, phase } = opts;
  const safeId = scenarioId.replace(/[^a-z0-9_-]/gi, "_");

  // --- Méta + séquence de focus ---
  try {
    const meta = {
      scenario: scenarioId,
      phase: phase ?? null,
      url: page.url(),
      viewport: page.viewportSize(),
      timestamp: new Date().toISOString(),
      title: testInfo.title,
      file: testInfo.file,
      retry: testInfo.retry,
      status: testInfo.status,
      expectedStatus: testInfo.expectedStatus,
      error: testInfo.error
        ? {
            message: testInfo.error.message,
            // On tronque la stack pour rester lisible
            stack: testInfo.error.stack?.split("\n").slice(0, 8).join("\n"),
          }
        : null,
    };
    await testInfo.attach(`meta-${safeId}.json`, {
      body: Buffer.from(JSON.stringify(meta, null, 2), "utf-8"),
      contentType: "application/json",
    });
  } catch {
    /* swallow */
  }

  try {
    const summary = {
      total: focusLog.length,
      lastEntry: focusLog[focusLog.length - 1] ?? null,
      sequence: focusLog,
    };
    await testInfo.attach(`focus-sequence-${safeId}.json`, {
      body: Buffer.from(JSON.stringify(summary, null, 2), "utf-8"),
      contentType: "application/json",
    });

    // Version texte lisible humainement (chronologie courte)
    const human = focusLog
      .map((e) => {
        const r = e.rect
          ? ` @(${e.rect.left},${e.rect.top} ${e.rect.width}x${e.rect.height})`
          : "";
        const role = e.role ? `[${e.role}]` : "";
        const label = e.ariaLabel ? ` aria-label="${e.ariaLabel}"` : "";
        const txt = e.text ? ` "${e.text}"` : "";
        const flag = e.marker ? ` ⚑ ${e.marker}` : "";
        return `#${String(e.step).padStart(3, "0")} ${e.action.padEnd(20)} ${e.tag}${role}${label}${txt}${r}${flag}`;
      })
      .join("\n");
    await testInfo.attach(`focus-sequence-${safeId}.txt`, {
      body: Buffer.from(human || "(séquence de focus vide)", "utf-8"),
      contentType: "text/plain",
    });
  } catch {
    /* swallow */
  }

  // --- HTML compact des focusables visibles ---
  try {
    const focusables = await page.evaluate(() => {
      const main = document.querySelector("main") ?? document.body;
      const sel =
        'a[href], button:not([disabled]), [role="tab"], [role="tabpanel"], input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])';
      const out: {
        idx: number;
        tag: string;
        role: string | null;
        ariaLabel: string | null;
        ariaSelected: string | null;
        ariaControls: string | null;
        tabindex: string | null;
        text: string;
        rect: { top: number; left: number; w: number; h: number } | null;
        outline: string;
        boxShadow: string;
      }[] = [];
      const els = Array.from(
        main.querySelectorAll<HTMLElement>(sel)
      ).slice(0, 80);
      els.forEach((el, i) => {
        const r = el.getBoundingClientRect();
        const cs = window.getComputedStyle(el);
        out.push({
          idx: i,
          tag: el.tagName.toLowerCase(),
          role: el.getAttribute("role"),
          ariaLabel: el.getAttribute("aria-label"),
          ariaSelected: el.getAttribute("aria-selected"),
          ariaControls: el.getAttribute("aria-controls"),
          tabindex: el.getAttribute("tabindex"),
          text: (el.textContent || "").trim().slice(0, 60),
          rect:
            r.width > 0 || r.height > 0
              ? {
                  top: Math.round(r.top),
                  left: Math.round(r.left),
                  w: Math.round(r.width),
                  h: Math.round(r.height),
                }
              : null,
          outline: `${cs.outlineStyle} ${cs.outlineWidth} ${cs.outlineColor}`,
          boxShadow: cs.boxShadow,
        });
      });
      return out;
    });
    await testInfo.attach(`focusable-elements-${safeId}.json`, {
      body: Buffer.from(JSON.stringify(focusables, null, 2), "utf-8"),
      contentType: "application/json",
    });
  } catch {
    /* swallow */
  }

  // --- Screenshot full page ---
  try {
    const buf = await page.screenshot({ fullPage: true, animations: "disabled" });
    await testInfo.attach(`screenshot-fullpage-${safeId}.png`, {
      body: buf,
      contentType: "image/png",
    });
  } catch {
    /* swallow */
  }

  // --- Screenshot zoomé sur le dernier élément focusé (si rect dispo) ---
  try {
    const last = focusLog[focusLog.length - 1];
    if (last?.rect && last.rect.width > 0 && last.rect.height > 0) {
      // Marge autour de l'élément pour voir le contexte visuel
      const PAD = 24;
      const vp = page.viewportSize();
      if (vp) {
        const x = Math.max(0, last.rect.left - PAD);
        const y = Math.max(0, last.rect.top - PAD);
        const width = Math.min(vp.width - x, last.rect.width + PAD * 2);
        const height = Math.min(vp.height - y, last.rect.height + PAD * 2);
        if (width > 0 && height > 0) {
          const buf = await page.screenshot({
            clip: { x, y, width, height },
            animations: "disabled",
          });
          await testInfo.attach(`screenshot-last-focus-${safeId}.png`, {
            body: buf,
            contentType: "image/png",
          });
        }
      }
    }
  } catch {
    /* swallow */
  }
}
