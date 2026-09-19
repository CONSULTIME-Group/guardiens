import { trackEvent } from "@/lib/analytics";
import { getDeviceContext } from "@/lib/deviceContext";

interface InstallPrompt extends Event {
  prompt(): Promise<{ outcome: "accepted" | "dismissed" }>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}
const KNOWN_KEY = "guardiens_pwa_install_known";
const REMINDER_KEY = "guardiens_pwa_install_reminder";
const TWO_WEEKS = 14 * 24 * 60 * 60 * 1000;
let deferred: InstallPrompt | null = null;
let dispose: (() => void) | undefined;
const listeners = new Set<() => void>();
let state = { standalone: false, knownInstalled: false, canPrompt: false };
const memory = new Map<string, string>();

function read(key: string): string | null {
  try { return localStorage.getItem(key) ?? memory.get(key) ?? null; }
  catch { return memory.get(key) ?? null; }
}
function write(key: string, value: string) {
  memory.set(key, value);
  try { localStorage.setItem(key, value); } catch { /* Session fallback. */ }
}
function update(next: Partial<typeof state>) {
  state = { ...state, ...next };
  listeners.forEach((listener) => listener());
}
export const getInstallState = () => state;
export const subscribeInstall = (listener: () => void) => {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
};

export function installPlatform() {
  const context = getDeviceContext();
  const ua = typeof navigator === "undefined" ? "" : navigator.userAgent;
  return {
    ios: context?.os === "ios",
    mobile: context?.os === "ios" || context?.os === "android",
    embedded: /FBAN|FBAV|Instagram|\bLine\/|TikTok|; wv\)/i.test(ua),
  };
}

/** Capture the browser event before lazy routes mount. No service worker/cache. */
export function initPwaInstall() {
  if (dispose || typeof window === "undefined") return;
  const display = window.matchMedia("(display-mode: standalone)");
  const minimal = window.matchMedia("(display-mode: minimal-ui)");
  const refresh = () => {
    const standalone = display.matches || minimal.matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
    if (standalone) write(KNOWN_KEY, "1");
    update({ standalone, knownInstalled: read(KNOWN_KEY) === "1" });
  };
  const onPrompt = (event: Event) => {
    // Keep the browser's default promotion available to anonymous visitors too.
    deferred = event as InstallPrompt;
    update({ canPrompt: true });
  };
  const onInstalled = () => {
    deferred = null;
    write(KNOWN_KEY, "1");
    update({ canPrompt: false, knownInstalled: true });
    void trackEvent("pwa_installed", { source: "browser_event" });
  };
  window.addEventListener("beforeinstallprompt", onPrompt);
  window.addEventListener("appinstalled", onInstalled);
  window.addEventListener("pageshow", refresh);
  display.addEventListener("change", refresh);
  minimal.addEventListener("change", refresh);
  refresh();
  dispose = () => {
    window.removeEventListener("beforeinstallprompt", onPrompt);
    window.removeEventListener("appinstalled", onInstalled);
    window.removeEventListener("pageshow", refresh);
    display.removeEventListener("change", refresh);
    minimal.removeEventListener("change", refresh);
  };
}
if (import.meta.hot) import.meta.hot.dispose(() => { dispose?.(); dispose = undefined; });

export function reminderDue(now = Date.now()): boolean {
  if (state.standalone || state.knownInstalled) return false;
  try {
    const value = JSON.parse(read(REMINDER_KEY) ?? "{}");
    return (Number(value.count) || 0) < 3 && (!value.last || now - Number(value.last) >= TWO_WEEKS);
  } catch { return false; }
}
export function markInstallSuggestion(now = Date.now()) {
  let count = 0;
  try { count = Number(JSON.parse(read(REMINDER_KEY) ?? "{}").count) || 0; } catch { /* reset */ }
  write(REMINDER_KEY, JSON.stringify({ last: now, count: count + 1 }));
}
export const firstInstallVisitDue = (userId: string) => read(`guardiens_pwa_welcome:${userId}`) !== "1";
export function markInstallWelcome(userId: string) {
  write(`guardiens_pwa_welcome:${userId}`, "1");
  markInstallSuggestion();
  void trackEvent("pwa_install_suggestion_shown", { source: "first_mobile_visit" });
}
export function declareInstalled() {
  write(KNOWN_KEY, "1");
  update({ knownInstalled: true });
  void trackEvent("pwa_install_declared", { source: "settings" });
}
export async function requestInstall(): Promise<"accepted" | "dismissed" | "unavailable" | "error"> {
  const prompt = deferred;
  if (!prompt || state.standalone) return "unavailable";
  deferred = null;
  update({ canPrompt: false });
  void trackEvent("pwa_install_clicked", { source: "settings" });
  try {
    // Must run synchronously from the user's click, before any await.
    const result = await prompt.prompt();
    const choice = result ?? await prompt.userChoice;
    void trackEvent("pwa_install_choice", { source: "settings", metadata: { outcome: choice.outcome } });
    // Acceptance is NOT an appinstalled confirmation.
    return choice.outcome;
  } catch { return "error"; }
}

export function recordAppOpen(userId: string) {
  if (!state.standalone) return;
  const key = `guardiens_pwa_open:${userId}`;
  try {
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");
  } catch {
    if (memory.has(key)) return;
    memory.set(key, "1");
  }
  void trackEvent("pwa_app_open", { source: "standalone" });
}
