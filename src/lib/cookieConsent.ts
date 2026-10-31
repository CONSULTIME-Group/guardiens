/**
 * Consentement cookies (lot C1, décision du 29/09/2026 ; volet publicitaire
 * ajouté le 31/10/2026 pour la campagne d'acquisition propriétaires).
 *
 * Google Analytics 4 et la mesure publicitaire Google Ads ne se chargent
 * qu'après un accord explicite donné dans le bandeau. Chaque volet a sa propre
 * réponse : une réponse absente laisse le volet bloqué. Choix conservé 6 mois,
 * puis redemandé.
 */

const CONSENT_KEY = "guardiens_cookie_consent_v1";
export const CONSENT_TTL_DAYS = 182; // 6 mois (recommandation CNIL)

export type ConsentValue = "granted" | "denied";

interface ConsentRecord {
  value: ConsentValue; // mesure d'audience (Google Analytics 4)
  ads?: ConsentValue; // mesure publicitaire (Google Ads)
  timestamp: number;
}

function readRecord(): ConsentRecord | null {
  try {
    const raw = localStorage.getItem(CONSENT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ConsentRecord;
    const ageDays = (Date.now() - parsed.timestamp) / (1000 * 60 * 60 * 24);
    if (ageDays > CONSENT_TTL_DAYS) {
      localStorage.removeItem(CONSENT_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function getStoredConsent(): ConsentValue | null {
  return readRecord()?.value ?? null;
}

/** Réponse publicitaire : null quand elle n'a jamais été donnée. */
export function getStoredAdsConsent(): ConsentValue | null {
  const record = readRecord();
  if (!record) return null;
  return record.ads === "granted" || record.ads === "denied" ? record.ads : null;
}

export interface ConsentChoice {
  analytics: ConsentValue;
  ads: ConsentValue | null;
}

export function setStoredConsent(value: ConsentValue, ads?: ConsentValue) {
  try {
    const previous = readRecord();
    const record: ConsentRecord = {
      value,
      ads: ads ?? previous?.ads,
      timestamp: Date.now(),
    };
    localStorage.setItem(CONSENT_KEY, JSON.stringify(record));
    // Notifier les listeners (bandeau, chargeurs de mesure)
    window.dispatchEvent(
      new CustomEvent("consent-changed", {
        detail: { analytics: value, ads: record.ads ?? null } satisfies ConsentChoice,
      }),
    );
  } catch {
    // ignore
  }
}

const GA_ID = "G-9JP4VR1RRP";
const ADS_ID = "AW-18547606637";
const SIGNUP_SEND_TO = "AW-18547606637/ZyrJCOqwr68dEO2ImIxF";
const ADS_REPORTED_PREFIX = "guardiens_ads_signup_reported_";
let gaLoaded = false;
let adsLoaded = false;
let gtagScriptLoaded = false;

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

/** Un seul chargement de gtag.js pour les deux destinations. */
function ensureGtagScript(id: string) {
  if (gtagScriptLoaded || typeof document === "undefined") return;
  gtagScriptLoaded = true;
  const s = document.createElement("script");
  s.src = `https://www.googletagmanager.com/gtag/js?id=${id}`;
  s.async = true;
  document.head.appendChild(s);
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

  ensureGtagScript(GA_ID);
}

/**
 * Mesure publicitaire Google Ads : autorise seulement le stockage publicitaire
 * (cookie de conversion), jamais le partage de données ni la personnalisation.
 */
export function enableAdsMeasurement() {
  if (typeof window === "undefined") return;
  const gtag = installGtagStub();
  gtag("consent", "update", { ad_storage: "granted" });
  if (adsLoaded) return;
  adsLoaded = true;
  gtag("js", new Date());
  gtag("config", ADS_ID, {
    allow_google_signals: false,
    allow_ad_personalization_signals: false,
  });
  ensureGtagScript(ADS_ID);
}

export function disableAdsMeasurement() {
  if (typeof window === "undefined") return;
  const gtag = installGtagStub();
  gtag("set", "user_data", null);
  gtag("consent", "update", { ad_storage: "denied" });
}

/**
 * Signale une inscription à Google Ads (conversion « Inscription
 * propriétaire »), seulement si la mesure publicitaire a été acceptée.
 * Une seule fois par compte : la clé locale évite un second envoi.
 */
export function reportSignupConversion(userId?: string | null): void {
  if (typeof window === "undefined") return;
  if (getStoredAdsConsent() !== "granted") return;
  const key = userId ? `${ADS_REPORTED_PREFIX}${userId}` : null;
  try {
    if (key && localStorage.getItem(key)) return;
  } catch {
    // stockage indisponible : l'envoi reste possible
  }
  const gtag = (window as any).gtag;
  if (typeof gtag !== "function") return;
  gtag("event", "conversion", { send_to: SIGNUP_SEND_TO, value: 1.0, currency: "EUR" });
  try {
    if (key) localStorage.setItem(key, "1");
  } catch {
    // ignore
  }
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
  if (typeof gtag === "function") gtag("consent", "update", { analytics_storage: "denied" });
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

/** Applique les deux réponses : chaque volet s'ouvre ou reste bloqué. */
function applyChoice(choice: ConsentChoice) {
  if (choice.analytics === "granted") {
    delete (window as any)[`ga-disable-${GA_ID}`];
    const gtag = installGtagStub();
    gtag("consent", "update", { analytics_storage: "granted" });
    loadGoogleAnalytics();
  } else {
    disableGoogleAnalytics();
    deleteGaCookies();
  }
  if (choice.ads === "granted") enableAdsMeasurement();
  else disableAdsMeasurement();
}

/** Applique un choix : accord, chargement ; refus ou retrait, coupure et effacement. */
export function applyConsent(choice: ConsentChoice | ConsentValue) {
  const normalized: ConsentChoice =
    typeof choice === "string" ? { analytics: choice, ads: null } : choice;
  applyChoice(normalized);
}

/** Le bandeau doit-il s'afficher au démarrage ? */
export function shouldShowBanner(): boolean {
  if (typeof window === "undefined") return false;
  if (isBotUserAgent()) return false;
  if (!readRecord()) return true;
  // Une réponse publicitaire absente laisse le volet bloqué : on la redemande.
  return getStoredAdsConsent() === null;
}

/** Rouvre le panneau depuis le lien « Gérer mes cookies ». */
export function openCookiePreferences() {
  window.dispatchEvent(new CustomEvent("open-cookie-preferences"));
}

/**
 * Démarrage : Consent Mode à « denied », puis chaque volet seulement si sa
 * réponse est enregistrée. Sans choix, rien n'est chargé.
 */
export function initConsent() {
  if (typeof window === "undefined") return;
  if (isBotUserAgent()) return;
  initConsentDefaults();
  const record = readRecord();
  if (record) applyChoice({ analytics: record.value, ads: getStoredAdsConsent() });
  const w = window as any;
  if (w.__guardiensConsentListener) window.removeEventListener("consent-changed", w.__guardiensConsentListener);
  w.__guardiensConsentListener = (e: Event) => applyConsent((e as CustomEvent).detail as ConsentChoice);
  window.addEventListener("consent-changed", w.__guardiensConsentListener);
}
