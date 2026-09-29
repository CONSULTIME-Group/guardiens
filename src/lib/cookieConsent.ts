/**
 * Consentement cookies (lot C1, décision du 29/09/2026).
 * GA4 n'est pas exempté par la CNIL : il se charge seulement après un accord
 * explicite donné dans le bandeau. Choix conservé 6 mois, puis redemandé.
 */

const CONSENT_KEY = "guardiens_cookie_consent_v1";
export const CONSENT_TTL_DAYS = 182; // 6 mois (recommandation CNIL)

export type ConsentValue = "granted" | "denied";

interface ConsentRecord {
  value: ConsentValue;
  timestamp: number;
}

export function getStoredConsent(): ConsentValue | null {
  try {
    const raw = localStorage.getItem(CONSENT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ConsentRecord;
    const ageDays = (Date.now() - parsed.timestamp) / (1000 * 60 * 60 * 24);
    if (ageDays > CONSENT_TTL_DAYS) {
      localStorage.removeItem(CONSENT_KEY);
      return null;
    }
    return parsed.value;
  } catch {
    return null;
  }
}

export function setStoredConsent(value: ConsentValue) {
  try {
    const record: ConsentRecord = { value, timestamp: Date.now() };
    localStorage.setItem(CONSENT_KEY, JSON.stringify(record));
    // Notifier les listeners (banner, GA loader)
    window.dispatchEvent(new CustomEvent("consent-changed", { detail: value }));
  } catch {
    // ignore
  }
}

const GA_ID = "G-9JP4VR1RRP";
let gaLoaded = false;

function installGtagStub() {
  const w = window as any;
  w.dataLayer = w.dataLayer || [];
  if (typeof w.gtag !== "function") {
    // IMPORTANT: use `arguments` (Arguments object), not rest params.
    // Google Tag (gtag.js v2) checks Arguments-object internals when draining
    // the dataLayer queue; a plain Array pushed via `...args` silently drops
    // all queued commands (js/config/event) → 0 /g/collect hits.
    w.gtag = function gtag() {
      // eslint-disable-next-line prefer-rest-params
      w.dataLayer.push(arguments);
    };
  }
  return w.gtag as (...args: any[]) => void;
}


export function loadGoogleAnalytics() {
  if (gaLoaded || typeof window === "undefined") return;
  if ((window as any)[`ga-disable-${GA_ID}`]) return;
  gaLoaded = true;

  const gtag = installGtagStub();
  gtag("js", new Date());
  // Chargé uniquement après accord (lot C1). IP anonymisée, signaux Google
  // et personnalisation publicitaire désactivés.
  gtag("config", GA_ID, {
    send_page_view: true,
    page_path: window.location.pathname + window.location.search,
    page_location: window.location.href,
    anonymize_ip: true,
    allow_google_signals: false,
    allow_ad_personalization_signals: false,
    cookie_expires: 60 * 60 * 24 * 395, // _ga : 13 mois maximum (CNIL)
  });

  const s = document.createElement("script");
  s.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
  s.async = true;
  document.head.appendChild(s);
}

export function trackGoogleAnalyticsPageView(path: string) {
  if (typeof window === "undefined") return;
  if ((window as any)[`ga-disable-${GA_ID}`]) return;
  const gtag = (window as any).gtag;
  if (typeof gtag !== "function") return;
  gtag("event", "page_view", {
    send_to: GA_ID,
    page_path: path,
    page_location: `${window.location.origin}${path}`,
    page_title: document.title,
  });
}

export function disableGoogleAnalytics() {
  (window as any)[`ga-disable-${GA_ID}`] = true;
  const gtag = (window as any).gtag;
  if (typeof gtag === "function") gtag("consent", "update", DENIED);
}

const DENIED = {
  analytics_storage: "denied",
  ad_storage: "denied",
  ad_user_data: "denied",
  ad_personalization: "denied",
} as const;

/** Supprime les cookies _ga et _ga_* sur le domaine courant et ses parents. */
export function deleteGaCookies() {
  if (typeof document === "undefined") return;
  const names = document.cookie
    .split(";")
    .map((c) => c.split("=")[0].trim())
    .filter((n) => n === "_ga" || n.startsWith("_ga_"));
  const host = window.location.hostname;
  const parts = host.split(".");
  const domains = [""];
  for (let i = 0; i < parts.length - 1; i++) domains.push(`; domain=.${parts.slice(i).join(".")}`);
  for (const n of names) {
    for (const d of domains) document.cookie = `${n}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/${d}`;
  }
}

/** Robots et Prerender : ni bandeau ni mesure, HTML servi identique. */
export function isBotUserAgent(ua: string = typeof navigator !== "undefined" ? navigator.userAgent : ""): boolean {
  return /bot|crawl|spider|slurp|prerender|lighthouse|facebookexternalhit|embedly|preview/i.test(ua);
}

/** Consent Mode v2 à « denied », posé avant tout chargement de gtag.js. */
export function initConsentDefaults() {
  if (typeof window === "undefined") return;
  const gtag = installGtagStub();
  gtag("consent", "default", { ...DENIED, wait_for_update: 500 });
}

function grantAndLoad() {
  delete (window as any)[`ga-disable-${GA_ID}`];
  const gtag = installGtagStub();
  gtag("consent", "update", { analytics_storage: "granted" });
  loadGoogleAnalytics();
}

/** Applique un choix : accord, chargement ; refus ou retrait, coupure et effacement. */
export function applyConsent(value: ConsentValue) {
  if (value === "granted") grantAndLoad();
  else {
    disableGoogleAnalytics();
    deleteGaCookies();
  }
}

/** Le bandeau doit-il s'afficher au démarrage ? */
export function shouldShowBanner(): boolean {
  if (typeof window === "undefined") return false;
  if (isBotUserAgent()) return false;
  return getStoredConsent() === null;
}

/** Rouvre le panneau depuis le lien « Gérer mes cookies ». */
export function openCookiePreferences() {
  window.dispatchEvent(new CustomEvent("open-cookie-preferences"));
}

/**
 * Démarrage : Consent Mode à « denied », puis GA4 seulement si un accord
 * « granted » valide est enregistré. Sans choix, rien n'est chargé.
 */
export function initConsent() {
  if (typeof window === "undefined") return;
  if (isBotUserAgent()) return;
  initConsentDefaults();
  const consent = getStoredConsent();
  if (consent === "granted") grantAndLoad();
  else if (consent === "denied") disableGoogleAnalytics();
  window.addEventListener("consent-changed", (e) => applyConsent((e as CustomEvent).detail as ConsentValue));
}
