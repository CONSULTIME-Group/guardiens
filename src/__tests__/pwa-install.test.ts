import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const track = vi.hoisted(() => vi.fn());
vi.mock("@/lib/analytics", () => ({ trackEvent: track }));
let pwa: typeof import("@/lib/pwa-install");
let media: Record<string, { matches: boolean; change?: () => void }>;
let handlers: Array<[string, EventListenerOrEventListenerObject]>;

beforeEach(async () => {
  vi.resetModules();
  vi.clearAllMocks();
  localStorage.clear(); sessionStorage.clear();
  Object.defineProperty(navigator, "standalone", { configurable: true, value: false });
  Object.defineProperty(navigator, "userAgent", { configurable: true, value: "Mozilla/5.0 (Linux; Android 14) AppleWebKit Chrome/140 Mobile Safari" });
  media = {};
  vi.stubGlobal("matchMedia", (query: string) => {
    const item = media[query] = { matches: false };
    return Object.assign(item, { addEventListener: (_: string, cb: () => void) => { item.change = cb; }, removeEventListener: vi.fn() });
  });
  handlers = [];
  const add = window.addEventListener.bind(window);
  vi.spyOn(window, "addEventListener").mockImplementation((type, handler, options) => {
    handlers.push([type, handler]); add(type, handler, options);
  });
  pwa = await import("@/lib/pwa-install");
  pwa.initPwaInstall();
});
afterEach(() => {
  handlers.forEach(([type, handler]) => window.removeEventListener(type, handler));
  vi.restoreAllMocks(); vi.unstubAllGlobals();
});

function promptEvent(outcome: "accepted" | "dismissed" = "accepted") {
  const prompt = vi.fn().mockResolvedValue({ outcome });
  const event = Object.assign(new Event("beforeinstallprompt"), { prompt, userChoice: Promise.resolve({ outcome }) });
  window.dispatchEvent(event);
  return prompt;
}

describe("installation PWA, états navigateur et mesures", () => {
  it("attend le signal natif, sans appeler prompt automatiquement", async () => {
    expect(await pwa.requestInstall()).toBe("unavailable");
    const prompt = promptEvent();
    expect(prompt).not.toHaveBeenCalled();
    expect(pwa.getInstallState().canPrompt).toBe(true);
    const pending = pwa.requestInstall();
    expect(prompt).toHaveBeenCalledOnce();
    expect(await pending).toBe("accepted");
    expect(await pwa.requestInstall()).toBe("unavailable");
    expect(pwa.getInstallState().knownInstalled).toBe(false);
    expect(track).not.toHaveBeenCalledWith("pwa_installed", expect.anything());
  });
  it("un refus n'est pas une installation", async () => {
    promptEvent("dismissed");
    expect(await pwa.requestInstall()).toBe("dismissed");
    expect(pwa.getInstallState().knownInstalled).toBe(false);
  });
  it("une erreur du prompt permet le repli vers les instructions", async () => {
    const prompt = promptEvent(); prompt.mockRejectedValue(new Error("unsupported"));
    expect(await pwa.requestInstall()).toBe("error");
  });
  it("mesure uniquement l'événement appinstalled comme confirmation", () => {
    promptEvent(); window.dispatchEvent(new Event("appinstalled"));
    expect(pwa.getInstallState()).toMatchObject({ knownInstalled: true, canPrompt: false });
    expect(pwa.reminderDue()).toBe(false);
    expect(track).toHaveBeenCalledWith("pwa_installed", { source: "browser_event" });
  });
  it("détecte le mode app et déduplique les ouvertures par session/compte", () => {
    const display = media["(display-mode: standalone)"];
    display.matches = true; display.change!();
    expect(pwa.getInstallState().standalone).toBe(true);
    pwa.recordAppOpen("A"); pwa.recordAppOpen("A"); pwa.recordAppOpen("B");
    expect(track.mock.calls.filter(([event]) => event === "pwa_app_open")).toHaveLength(2);
    expect(pwa.reminderDue()).toBe(false);
  });
  it("détecte navigator.standalone sur iPhone au retour sur la page", () => {
    Object.defineProperty(navigator, "standalone", { configurable: true, value: true });
    window.dispatchEvent(new Event("pageshow"));
    expect(pwa.getInstallState().standalone).toBe(true);
  });
  it("ne compte pas une visite navigateur comme ouverture d'app", () => {
    pwa.recordAppOpen("A"); expect(track).not.toHaveBeenCalled();
  });
  it("ne confond pas déclaration et confirmation", () => {
    pwa.declareInstalled();
    expect(pwa.reminderDue()).toBe(false);
    expect(track).toHaveBeenCalledWith("pwa_install_declared", { source: "settings" });
    expect(track).not.toHaveBeenCalledWith("pwa_installed", expect.anything());
  });
  it("limite les relances à 14 jours et trois impressions", () => {
    const day = 86400000;
    expect(pwa.reminderDue(day)).toBe(true);
    pwa.markInstallSuggestion(day);
    expect(pwa.reminderDue(14 * day)).toBe(false);
    expect(pwa.reminderDue(15 * day)).toBe(true);
    pwa.markInstallSuggestion(15 * day); pwa.markInstallSuggestion(29 * day);
    expect(pwa.reminderDue(43 * day)).toBe(false);
  });
  it("supporte un stockage bloqué sans relancer en boucle", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new Error("blocked"); });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("blocked"); });
    pwa.markInstallSuggestion(); expect(pwa.reminderDue()).toBe(false);
    pwa.declareInstalled(); expect(pwa.getInstallState().knownInstalled).toBe(true);
  });
  it("reconnaît un navigateur intégré et n'assimile pas un écran étroit à Android", () => {
    Object.defineProperty(navigator, "userAgent", { configurable: true, value: "Mozilla/5.0 (iPhone) Instagram" });
    expect(pwa.installPlatform()).toMatchObject({ mobile: true, ios: true, embedded: true });
    Object.defineProperty(navigator, "userAgent", { configurable: true, value: "Mozilla/5.0 (Windows NT 10.0) Chrome/140" });
    expect(pwa.installPlatform().mobile).toBe(false);
  });
});
