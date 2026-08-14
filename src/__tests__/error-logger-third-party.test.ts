import { describe, it, expect } from "vitest";
import { detectThirdPartySource } from "@/lib/errorLogger";

/**
 * Garde-fou du filtre anti-bruit de errorLogger.
 * Référence : erreur "Cannot read properties of undefined (reading 'M_ID')"
 * remontée entre le 11/08 et le 14/08/2026 avec une stack 100%
 * chrome-extension:// (assistant de saisie tiers, empreinte l588z7).
 * Les unhandledrejection n'ont pas de filename : sans détection sur la
 * première frame de la stack, elles polluaient /admin/errors en sévérité
 * "unhandled_rejection".
 *
 * Contre-cas critique : les extensions qui patchent window.fetch insèrent
 * leurs frames SOUS nos frames dans les erreurs "Network non-2xx". Celles-ci
 * restent actionnables et ne doivent PAS être classées "extension".
 */

const ORIGIN = window.location.origin;

const EXTENSION_STACK = `TypeError: Cannot read properties of undefined (reading 'M_ID')
    at F (chrome-extension://eppiocemhmnlbhjplcgkofciiegomcon/executors/200.js:1:761)
    at X (chrome-extension://eppiocemhmnlbhjplcgkofciiegomcon/executors/200.js:1:1442)`;

const FETCH_PATCHED_STACK = `Error: Network non-2xx: 500 POST https://example.co/functions/v1/send-mass-email
    at window.fetch (${ORIGIN}/assets/NetworkErrorMonitor-C6qFVK2a.js:1:2508)
    at async chrome-extension://eppiocemhmnlbhjplcgkofciiegomcon/executors/200.js:1:1442`;

const APP_STACK = `TypeError: Cannot read properties of undefined (reading 'map')
    at Ge (${ORIGIN}/assets/index-abc123.js:212:50124)
    at ${ORIGIN}/assets/index-abc123.js:212:50901`;

describe("detectThirdPartySource", () => {
  it("classe 'extension' une stack 100% chrome-extension sans source (cas unhandledrejection)", () => {
    expect(detectThirdPartySource(null, EXTENSION_STACK)).toBe("extension");
  });

  it("classe 'extension' même si une source est fournie (la première frame prime)", () => {
    expect(detectThirdPartySource(`${ORIGIN}/`, EXTENSION_STACK)).toBe("extension");
  });

  it("couvre moz/safari/edge-extension en première frame", () => {
    expect(
      detectThirdPartySource(null, "Error: x\n    at y (moz-extension://abc/content.js:1:1)"),
    ).toBe("extension");
    expect(
      detectThirdPartySource(null, "Error: x\n    at y (safari-web-extension://abc/content.js:1:1)"),
    ).toBe("extension");
    expect(
      detectThirdPartySource(null, "Error: x\n    at y (edge-extension://abc/content.js:1:1)"),
    ).toBe("extension");
  });

  it("couvre le format Firefox (fn@url)", () => {
    expect(
      detectThirdPartySource(null, "F@moz-extension://abc/executors/200.js:1:761"),
    ).toBe("extension");
  });

  it("classe 'extension' via la source seule (window.onerror avec filename)", () => {
    expect(detectThirdPartySource("chrome-extension://abc/content.js", null)).toBe("extension");
  });

  it("ne classe PAS une erreur réseau dont la stack contient une frame d'extension sous nos frames (fetch patché)", () => {
    expect(detectThirdPartySource(null, FETCH_PATCHED_STACK)).toBeNull();
  });

  it("ne classe PAS une stack de notre bundle", () => {
    expect(detectThirdPartySource(`${ORIGIN}/assets/index-abc123.js`, APP_STACK)).toBeNull();
  });

  it("ne classe PAS une erreur sans source ni stack", () => {
    expect(detectThirdPartySource(null, null)).toBeNull();
  });
});
