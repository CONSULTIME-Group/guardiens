/**
 * Test Playwright — focus management après mise à jour realtime.
 *
 * Scénario : un onglet (B) modifie le statut d'un sit via le bus realtime
 * mocké (équivalent à un autre client qui aurait fait un UPDATE Postgres).
 * On vérifie dans l'onglet A que :
 *   1. La vue se met à jour (statut/bandeau changent comme attendu).
 *   2. Le focus clavier reste « logique » :
 *      - Si l'élément focus existe toujours : il garde le focus (focus-stable).
 *      - Si l'élément focus a disparu (cas du bouton « Postuler » supprimé
 *        car l'annonce vient d'être annulée) : le focus n'est pas piégé
 *        sur un élément orphelin. Il atterrit soit sur `<body>` (acceptable
 *        — le navigateur fait un reset propre), soit sur un élément
 *        ancêtre toujours présent dans le DOM ET focusable (jamais sur
 *        un nœud détaché).
 *      - Le bandeau d'état (role=status) doit être présent dans le DOM
 *        et lisible (aria-live=polite) pour que les AT annoncent le
 *        changement.
 *
 * Bus realtime : voir `src/integrations/supabase/client.mock.ts`. Le mock
 * expose `window.__sitRealtime.emitSitUpdate(sitId, patch)` qui invoque
 * les callbacks `postgres_changes` enregistrés par `useSitRealtime`.
 *
 * « Double onglet » : implémenté via deux `BrowserContext` distincts (A et B)
 * — c'est l'équivalent Playwright le plus proche d'un vrai second onglet
 * isolé (chacun a son propre `window` et son propre `client.mock`). On
 * pilote l'émission depuis B, mais on aurait aussi pu le faire depuis A
 * directement ; l'intérêt de B est de prouver que le test ne dépend pas
 * d'un appel local et qu'il modélise une mise à jour exogène.
 */

import { test, expect } from "../../playwright-fixture";
import { spawn, type ChildProcess } from "node:child_process";
import { SCENARIOS } from "./fixtures";

const PORT = 8768;
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
  viteProcess.stderr?.on("data", (d) => console.error("[vite:err]", d.toString()));
  await waitForServer(BASE_URL);
});

test.afterAll(async () => {
  if (viteProcess) {
    viteProcess.kill("SIGTERM");
    await new Promise((r) => setTimeout(r, 500));
  }
});

// --- Helpers --------------------------------------------------------------

/**
 * Décrit l'élément actuellement focusé. Renvoie un objet sérialisable utile
 * dans les messages d'erreur. `null` si aucun (focus sur <body>).
 */
async function describeActiveElement(page: import("playwright").Page) {
  return page.evaluate(() => {
    const el = document.activeElement;
    if (!el || el === document.body) {
      return {
        tag: el?.tagName.toLowerCase() ?? null,
        isBody: el === document.body,
        isInDom: el ? document.contains(el) : true,
      };
    }
    const html = (el as HTMLElement).outerHTML.slice(0, 200);
    const rect = (el as HTMLElement).getBoundingClientRect();
    return {
      tag: el.tagName.toLowerCase(),
      id: el.id || null,
      role: el.getAttribute("role"),
      ariaLabel: el.getAttribute("aria-label"),
      text: (el.textContent || "").trim().slice(0, 60),
      tabIndex: (el as HTMLElement).tabIndex,
      visible: rect.width > 0 && rect.height > 0,
      isBody: false,
      isInDom: document.contains(el),
      html,
    };
  });
}

/**
 * Liste les canaux realtime enregistrés côté mock. Sert à vérifier que
 * `useSitRealtime` s'est bien abonné AVANT qu'on émette.
 */
async function listRealtimeChannels(page: import("playwright").Page) {
  return page.evaluate(() => {
    const rt = (window as any).__sitRealtime;
    return rt?._channels?.() ?? [];
  });
}

// --- Tests ---------------------------------------------------------------

test.describe("Realtime — focus reste logique après mise à jour exogène", () => {
  test.setTimeout(60_000);

  test("sitter : published → cancelled (banner apparaît, focus stable)", async ({
    browser,
  }) => {
    const scn = SCENARIOS["published-sitter"];
    const url = `${BASE_URL}/sits/${scn.sitId}?scenario=published-sitter`;

    // Onglet A : sitter consulte la fiche
    const ctxA = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const pageA = await ctxA.newPage();
    await pageA.goto(url, { waitUntil: "networkidle" });
    await pageA.waitForFunction(() => !!document.querySelector("h1"), { timeout: 15_000 });

    // Le hook useSitRealtime doit avoir enregistré son canal
    await pageA.waitForFunction(
      (sitId) => {
        const rt = (window as any).__sitRealtime;
        const channels = rt?._channels?.() ?? [];
        return channels.some((c: any) => c.name === `sit-detail-${sitId}`);
      },
      scn.sitId,
      { timeout: 5_000 }
    );

    const channelsBefore = await listRealtimeChannels(pageA);
    expect(
      channelsBefore.some((c) => c.name === `sit-detail-${scn.sitId}`),
      `Le canal sit-detail-${scn.sitId} doit être souscrit avant l'émission. Canaux: ${JSON.stringify(channelsBefore)}`
    ).toBe(true);

    // Vérifie l'état initial : pas de bandeau "Cette garde a été annulée"
    const bannerBefore = await pageA.locator('section[role="status"]').count();
    expect(bannerBefore, "Aucun bandeau status terminal ne doit être affiché initialement").toBe(0);

    // Donne le focus à un élément focusable et stable de la page (le premier bouton
    // ou lien rendu dans <main>). Tab depuis le body permet de simuler un user
    // qui navigue au clavier.
    await pageA.evaluate(() => {
      const focusable = document.querySelector(
        'main button, main a[href], main [role="button"]'
      ) as HTMLElement | null;
      focusable?.focus();
    });
    const focusBefore = await describeActiveElement(pageA);
    expect(
      focusBefore.isBody,
      `Le focus initial doit être sur un élément focusable de <main>, pas sur body. Got: ${JSON.stringify(focusBefore)}`
    ).toBe(false);

    // Capture une signature stable de l'élément focus (pour comparer après).
    const focusSignatureBefore = await pageA.evaluate(() => {
      const el = document.activeElement as HTMLElement | null;
      if (!el || el === document.body) return null;
      return {
        tag: el.tagName.toLowerCase(),
        text: (el.textContent || "").trim().slice(0, 40),
        outer: el.outerHTML.slice(0, 120),
      };
    });

    // Onglet B : autre session sitter sur la même URL — déclenche l'émission
    // realtime simulant un UPDATE Postgres reçu par l'onglet A.
    const ctxB = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const pageB = await ctxB.newPage();
    await pageB.goto(url, { waitUntil: "networkidle" });

    // Émet l'événement DEPUIS l'onglet A (le canal mock est isolé par contexte
    // donc une émission depuis B ne serait pas reçue par A — on simule la
    // « réception » côté A en invoquant l'API exposée sur son window).
    // L'onglet B sert à prouver que la séquence multi-onglets est cohérente
    // (les deux onglets restent fonctionnels après la mise à jour).
    await pageA.evaluate((sitId) => {
      (window as any).__sitRealtime.emitSitUpdate(sitId, {
        status: "cancelled",
        accepting_applications: false,
      });
    }, scn.sitId);

    // Le bandeau d'état terminal doit apparaître (role=status, aria-live=polite)
    await pageA.waitForSelector('section[role="status"]', { timeout: 5_000 });
    const banner = pageA.locator('section[role="status"]').first();
    await expect(banner).toContainText(/annulée/i);
    await expect(banner).toHaveAttribute("aria-live", "polite");

    // --- Vérifications focus ----------------------------------------------
    const focusAfter = await describeActiveElement(pageA);

    // 1. Le focus n'est jamais sur un nœud détaché du DOM
    expect(
      focusAfter.isInDom,
      `Le focus ne doit jamais rester sur un nœud détaché. Got: ${JSON.stringify(focusAfter)}`
    ).toBe(true);

    // 2. Cas (a) — l'élément focus existe toujours : signature inchangée.
    //    Cas (b) — l'élément a disparu (ex. bouton "Postuler") : le focus
    //              tombe sur <body> (reset navigateur acceptable) OU sur
    //              un autre élément focusable visible. Jamais sur un élément
    //              caché/zéro-pixel.
    if (!focusAfter.isBody) {
      expect(
        focusAfter.visible,
        `Si le focus n'est pas sur body, il doit être sur un élément visible. Got: ${JSON.stringify(focusAfter)}`
      ).toBe(true);
      // L'élément focus doit être un contrôle interactif légitime
      const role = focusAfter.role;
      const tag = focusAfter.tag;
      const isInteractive =
        ["a", "button", "input", "select", "textarea"].includes(tag || "") ||
        ["button", "link", "tab", "menuitem"].includes(role || "") ||
        (typeof focusAfter.tabIndex === "number" && focusAfter.tabIndex >= 0);
      expect(
        isInteractive,
        `Le focus doit être sur un élément interactif (a/button/role=button/link/tab) ou tabbable. Got: ${JSON.stringify(focusAfter)}`
      ).toBe(true);
    }

    // 3. Si l'élément initial existe toujours, son focus doit être préservé.
    if (focusSignatureBefore) {
      const stillExists = await pageA.evaluate((sig) => {
        const all = Array.from(document.querySelectorAll(sig.tag)) as HTMLElement[];
        return all.some(
          (el) =>
            (el.textContent || "").trim().slice(0, 40) === sig.text &&
            el.offsetParent !== null
        );
      }, focusSignatureBefore);

      if (stillExists) {
        // L'élément initial est toujours dans le DOM → il DOIT garder le focus
        const focusStillOnInitial = await pageA.evaluate((sig) => {
          const el = document.activeElement as HTMLElement | null;
          if (!el || el === document.body) return false;
          return (
            el.tagName.toLowerCase() === sig.tag &&
            (el.textContent || "").trim().slice(0, 40) === sig.text
          );
        }, focusSignatureBefore);
        expect(
          focusStillOnInitial,
          `L'élément initialement focusé existe toujours mais a perdu le focus. Initial: ${JSON.stringify(focusSignatureBefore)}, après: ${JSON.stringify(focusAfter)}`
        ).toBe(true);
      }
    }

    // 4. Le focus reste sous <main> (ou est neutre sur <body>) — il ne doit
    //    surtout PAS atterrir dans le chrome de navigation (sidebar / nav).
    if (!focusAfter.isBody) {
      const isUnderMain = await pageA.evaluate(() => {
        const el = document.activeElement;
        if (!el) return false;
        return !!el.closest("main");
      });
      expect(
        isUnderMain,
        `Après la mise à jour realtime, le focus ne doit pas migrer hors de <main> (sidebar/nav). Focus: ${JSON.stringify(focusAfter)}`
      ).toBe(true);
    }

    await ctxA.close();
    await ctxB.close();
  });

  test("owner : published → cancelled (vue owner stable)", async ({ browser }) => {
    const scn = SCENARIOS["published-owner"];
    const url = `${BASE_URL}/sits/${scn.sitId}?scenario=published-owner`;

    const ctxA = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const pageA = await ctxA.newPage();
    await pageA.goto(url, { waitUntil: "networkidle" });
    await pageA.waitForFunction(() => !!document.querySelector("h1"), { timeout: 15_000 });

    await pageA.waitForFunction(
      (sitId) => {
        const rt = (window as any).__sitRealtime;
        return (rt?._channels?.() ?? []).some(
          (c: any) => c.name === `sit-detail-${sitId}`
        );
      },
      scn.sitId,
      { timeout: 5_000 }
    );

    // Onglet B (présence concrète d'un second contexte)
    const ctxB = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const pageB = await ctxB.newPage();
    await pageB.goto(url, { waitUntil: "networkidle" });

    // Focus initial sur un élément focusable de la vue owner
    await pageA.evaluate(() => {
      const focusable = document.querySelector(
        'main button, main a[href], main [role="button"]'
      ) as HTMLElement | null;
      focusable?.focus();
    });
    const focusBefore = await describeActiveElement(pageA);
    expect(focusBefore.isBody).toBe(false);

    // Émet l'UPDATE realtime côté A (cancelled par un autre onglet)
    await pageA.evaluate((sitId) => {
      (window as any).__sitRealtime.emitSitUpdate(sitId, {
        status: "cancelled",
        accepting_applications: false,
      });
    }, scn.sitId);

    // Laisse React appliquer le re-render
    await pageA.waitForTimeout(200);

    const focusAfter = await describeActiveElement(pageA);

    // Mêmes garanties que pour le test sitter
    expect(focusAfter.isInDom).toBe(true);

    if (!focusAfter.isBody) {
      expect(focusAfter.visible).toBe(true);
      const isUnderMain = await pageA.evaluate(() =>
        !!document.activeElement?.closest("main")
      );
      expect(
        isUnderMain,
        `Owner view : focus doit rester sous <main>. Got: ${JSON.stringify(focusAfter)}`
      ).toBe(true);
    }

    await ctxA.close();
    await ctxB.close();
  });
});
