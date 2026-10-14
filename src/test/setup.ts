import "@testing-library/jest-dom";
import { expect, vi } from "vitest";
import frCommon from "@/i18n/locales/fr/common.json";

/**
 * Lot A3 (audit Alma du 14/10/2026) : aucun test n'écrit en production.
 * 548 événements alma_conversation_message_sent sur 609 en 30 jours venaient
 * des tests (analytics réel, base de production lue dans .env).
 *
 * 1. La mesure est un mock pour tous les fichiers de test. Un fichier peut
 *    toujours poser son propre vi.mock("@/lib/analytics") ; le verrou
 *    src/__tests__/a3/no-test-writes.test.ts vérifie que trackEvent reste un
 *    mock.
 * 2. Filet : toute écriture (méthode autre que GET ou HEAD) vers l'hôte
 *    Supabase est refusée et notée dans __A3_BLOCKED_SUPABASE_WRITES__. Le
 *    client répond par une erreur, comme sans réseau. Un test qui veut un
 *    réseau simulé pose son propre fetch (vi.stubGlobal, vi.spyOn).
 */
vi.mock("@/lib/analytics", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/analytics")>();
  return {
    ...actual,
    trackEvent: vi.fn(async () => undefined),
    trackEventBeacon: vi.fn(() => true),
    trackCtaClick: vi.fn(),
    trackEventWithUserId: vi.fn(async () => undefined),
    trackFirstAction: vi.fn(async () => undefined),
  };
});

const supabaseHost = (() => {
  try {
    return new URL(String(import.meta.env.VITE_SUPABASE_URL ?? "")).host || null;
  } catch {
    return null;
  }
})();

const blockedWrites: Array<{ method: string; url: string }> = [];
(globalThis as any).__A3_BLOCKED_SUPABASE_WRITES__ = blockedWrites;

function isSupabaseWrite(input: unknown, init?: { method?: string }): { method: string; url: string } | null {
  const url = typeof input === "string"
    ? input
    : input instanceof URL
      ? input.href
      : typeof (input as any)?.url === "string"
        ? (input as any).url
        : "";
  const method = String(init?.method ?? (input as any)?.method ?? "GET").toUpperCase();
  if (method === "GET" || method === "HEAD") return null;
  let host = "";
  try {
    host = new URL(url).host;
  } catch {
    return null;
  }
  const supabase = (supabaseHost && host === supabaseHost) || host.endsWith(".supabase.co");
  return supabase ? { method, url } : null;
}

/**
 * Seule exception : src/integration/, sondes volontaires de la production
 * (lectures anonymes, fonctions de lecture, écriture anonyme dont le refus
 * par la RLS est vérifié). Aucune n'y écrit une mesure.
 */
function isIntegrationProbe(): boolean {
  try {
    const path = String((expect as any)?.getState?.()?.testPath ?? "");
    return /[\\/]src[\\/]integration[\\/]/.test(path);
  } catch {
    return false;
  }
}

if (typeof globalThis.fetch === "function") {
  const realFetch = globalThis.fetch.bind(globalThis);
  const guardedFetch = ((input: any, init?: any) => {
    const write = isSupabaseWrite(input, init);
    if (write && !isIntegrationProbe()) {
      blockedWrites.push(write);
      return Promise.reject(new TypeError(`Lot A3 : écriture vers Supabase refusée en test (${write.method} ${write.url})`));
    }
    return realFetch(input, init);
  }) as typeof fetch;
  (guardedFetch as any).__a3Guard = true;
  globalThis.fetch = guardedFetch;
}

// Lot P5 : en test, le dictionnaire complet est présent dès l'init (comme avant).
(globalThis as any).__I18N_FULL__ = frCommon;

// jsdom n'implémente pas HTMLCanvasElement.getContext, or lottie-web
// l'appelle au chargement du module. On fournit un stub minimal.
if (typeof HTMLCanvasElement !== "undefined") {
  HTMLCanvasElement.prototype.getContext = (() => ({
    fillStyle: "",
    fillRect: () => {},
    clearRect: () => {},
    getImageData: () => ({ data: [] }),
    putImageData: () => {},
    createImageData: () => ({ data: [] }),
    setTransform: () => {},
    drawImage: () => {},
    save: () => {},
    restore: () => {},
    beginPath: () => {},
    moveTo: () => {},
    lineTo: () => {},
    closePath: () => {},
    stroke: () => {},
    translate: () => {},
    scale: () => {},
    rotate: () => {},
    arc: () => {},
    fill: () => {},
    measureText: () => ({ width: 0 }),
    transform: () => {},
    rect: () => {},
    clip: () => {},
  })) as unknown as HTMLCanvasElement["getContext"];
}

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
});
