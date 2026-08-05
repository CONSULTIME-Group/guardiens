/**
 * Garde-fou générique contre les pièges d'interaction.
 *
 * Défaut récurrent d'août 2026 : une couche en `position: fixed` (barre de
 * navigation basse, bouton flottant, barre d'action collante) recouvre des
 * contrôles réels. Trois occurrences constatées, aucun test ne les détectait.
 *
 * Principe : pour chaque élément interactif visible dans le viewport,
 * `document.elementFromPoint` au centre doit renvoyer cet élément ou l'un de
 * ses descendants. Toute exception fait échouer le test en nommant l'élément
 * recouvert et la couche qui le recouvre.
 *
 * Faux positifs exclus explicitement :
 *   1. élément partiellement hors viewport à l'intérieur d'un ancêtre en
 *      défilement horizontal (onglets de /settings, filtres de
 *      /recherche-gardiens), atteignable par défilement ;
 *   2. élément recouvert par un de ses propres ancêtres ou par un conteneur
 *      qui le contient (le clic atteint quand même la cible logique).
 */
import { test, expect, hasAuthCreds } from "./auth-fixture";
import type { Page } from "@playwright/test";

const VIEWPORT = { width: 387, height: 829 };

const PUBLIC_ROUTES = ["/", "/annonces", "/petites-missions", "/recherche-gardiens"];
const AUTHED_ROUTES = [
  "/dashboard",
  "/sits",
  "/messages",
  "/sits/create",
  "/petites-missions/creer",
  "/settings",
];

type Trap = { target: string; blocker: string; rect: string };

/** Audit d'une page au point de défilement courant. */
async function findTraps(page: Page): Promise<Trap[]> {
  return page.evaluate(() => {
    const describe = (el: Element | null): string => {
      if (!el) return "aucun élément";
      const tag = el.tagName.toLowerCase();
      const cls = (el.getAttribute("class") || "").split(/\s+/).filter(Boolean).slice(0, 4).join(".");
      const label = (el.getAttribute("aria-label") || el.textContent || "").trim().replace(/\s+/g, " ").slice(0, 48);
      return `${tag}${cls ? "." + cls : ""}${label ? ` "${label}"` : ""}`;
    };

    const inHorizontalScroller = (el: Element): boolean => {
      let node: Element | null = el.parentElement;
      while (node && node !== document.body) {
        const s = getComputedStyle(node);
        if ((s.overflowX === "auto" || s.overflowX === "scroll") && node.scrollWidth > node.clientWidth + 1) {
          return true;
        }
        node = node.parentElement;
      }
      return false;
    };

    const selector = [
      "button",
      "a[href]",
      "input:not([type='hidden'])",
      "select",
      "textarea",
      "[role='button']",
      "[role='tab']",
      "[role='link']",
      "[role='switch']",
      "[role='checkbox']",
      "[tabindex]:not([tabindex='-1'])",
    ].join(",");

    const traps: { target: string; blocker: string; rect: string }[] = [];
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    document.querySelectorAll(selector).forEach((el) => {
      const style = getComputedStyle(el);
      if (style.visibility === "hidden" || style.display === "none" || style.pointerEvents === "none") return;
      if (Number(style.opacity) < 0.1) return;
      if (el.hasAttribute("disabled") || el.getAttribute("aria-hidden") === "true") return;

      const r = el.getBoundingClientRect();
      if (r.width < 4 || r.height < 4) return;
      // Entièrement hors viewport : hors périmètre.
      if (r.bottom <= 0 || r.top >= vh || r.right <= 0 || r.left >= vw) return;
      // Partiellement sorti du viewport en vertical : simple position de
      // défilement intermédiaire, pas un piège.
      if (r.top < 0 || r.bottom > vh) return;
      // Exclusion 1 : débordement horizontal rattrapable par défilement.
      if ((r.left < 0 || r.right > vw) && inHorizontalScroller(el)) return;

      const cx = Math.min(Math.max(r.left + r.width / 2, 1), vw - 1);
      const cy = Math.min(Math.max(r.top + r.height / 2, 1), vh - 1);
      const top = document.elementFromPoint(cx, cy);
      if (!top) return;
      if (top === el || el.contains(top)) return;
      // Exclusion 2 : la couche au dessus est un ancêtre de la cible.
      if (top.contains(el)) return;

      // Confirmation : si un simple recentrage libère l'élément, il est
      // atteignable par défilement, ce n'est pas un piège.
      const y0 = window.scrollY;
      el.scrollIntoView({ block: "center" });
      const r2 = el.getBoundingClientRect();
      const cx2 = Math.min(Math.max(r2.left + r2.width / 2, 1), vw - 1);
      const cy2 = Math.min(Math.max(r2.top + r2.height / 2, 1), vh - 1);
      const top2 = document.elementFromPoint(cx2, cy2);
      window.scrollTo(0, y0);
      if (!top2 || top2 === el || el.contains(top2) || top2.contains(el)) return;

      traps.push({
        target: describe(el),
        blocker: describe(top2),
        rect: `top ${Math.round(r.top)}, bottom ${Math.round(r.bottom)}`,
      });
    });


    return traps;
  });
}

/** Audite le haut, le milieu et le bas de la page. */
async function auditRoute(page: Page, path: string): Promise<Trap[]> {
  await page.goto(path, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1200);
  const all: Trap[] = [];
  const positions = [0, 0.5, 1];
  for (const p of positions) {
    await page.evaluate((ratio) => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      window.scrollTo(0, Math.max(0, max * ratio));
    }, p);
    await page.waitForTimeout(500);
    all.push(...(await findTraps(page)));
  }
  const seen = new Set<string>();
  return all.filter((t) => {
    const k = `${t.target}|${t.blocker}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

function report(path: string, traps: Trap[]): string {
  return [
    `${traps.length} contrôle(s) recouvert(s) sur ${path} :`,
    ...traps.map((t) => `  ${t.target} (${t.rect}) recouvert par ${t.blocker}`),
  ].join("\n");
}

test.describe("Aucune couche fixe ne vole de zone d'interaction, visiteur", () => {
  test.use({ viewport: VIEWPORT });

  for (const path of PUBLIC_ROUTES) {
    test(`route publique ${path}`, async ({ page }) => {
      const traps = await auditRoute(page, path);
      expect(traps, report(path, traps)).toHaveLength(0);
    });
  }
});

test.describe("Aucune couche fixe ne vole de zone d'interaction, connecté", () => {
  test.use({ viewport: VIEWPORT });
  test.skip(!hasAuthCreds, "E2E_TEST_EMAIL / E2E_TEST_PASSWORD manquants");

  for (const path of AUTHED_ROUTES) {
    test(`route connectée ${path}`, async ({ authedPage }) => {
      const traps = await auditRoute(authedPage, path);
      expect(traps, report(path, traps)).toHaveLength(0);
    });
  }

  test("route connectée /messages, conversation ouverte", async ({ authedPage: page }) => {
    await page.goto("/messages", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1500);
    const composer = page.getByLabel("Écrire un message");
    if (!(await composer.isVisible().catch(() => false))) {
      const items = page.locator("button, [role='button']");
      const count = await items.count();
      for (let i = 0; i < Math.min(count, 12); i++) {
        await items.nth(i).click().catch(() => {});
        if (await composer.isVisible().catch(() => false)) break;
      }
    }
    test.skip(!(await composer.isVisible().catch(() => false)), "Aucune conversation sur le compte de test");
    const traps = await findTraps(page);
    expect(traps, report("/messages (fil ouvert)", traps)).toHaveLength(0);
  });
});
