/**
 * Gestion du consentement RGPD pour les cookies analytics (Google Analytics).
 * Stocke le choix dans localStorage avec une date d'expiration de 13 mois (CNIL).
 */

const CONSENT_KEY = "guardiens_cookie_consent_v1";
const CONSENT_TTL_DAYS = 395; // 13 mois (CNIL)

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

export function loadGoogleAnalytics() {
  if (gaLoaded || typeof window === "undefined") return;
  gaLoaded = true;
  const s = document.createElement("script");
  s.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
  s.async = true;
  document.head.appendChild(s);
    s.onload = () => {
      (window as any).dataLayer = (window as any).dataLayer || [];
      function gtag(...args: any[]) {
        (window as any).dataLayer.push(args);
      }
      (window as any).gtag = gtag;
      gtag("js", new Date());
      // Mesure d'audience exemptée CNIL : IP anonymisée, pas de pub/remarketing,
      // pas de Google Signals, pas de partage cross-produits.
      gtag("config", GA_ID, {
        send_page_view: true,
        anonymize_ip: true,
        allow_google_signals: false,
        allow_ad_personalization_signals: false,
      });
    };
}

export function disableGoogleAnalytics() {
  // Désactive le tracking GA si l'utilisateur révoque
  (window as any)[`ga-disable-${GA_ID}`] = true;
}

/**
 * Initialise GA au boot.
 * Mesure d'audience exemptée CNIL (anonymize_ip, pas de pub/signals) :
 * pas de bandeau requis. On charge GA pour TOUS les visiteurs, sauf opt-out
 * explicite stocké en localStorage.
 */
export function initConsent() {
  const consent = getStoredConsent();
  if (consent === "denied") {
    disableGoogleAnalytics();
    return;
  }
  // Charge GA tôt mais hors du chemin critique du LCP.
  // 2 s était trop long : rebonds rapides / connexions mobiles lentes
  // partaient avant l'envoi du page_view, ce qui sous-mesurait le trafic.
  if (typeof (window as any).requestIdleCallback === "function") {
    (window as any).requestIdleCallback(() => loadGoogleAnalytics(), { timeout: 1500 });
  } else {
    setTimeout(loadGoogleAnalytics, 300);
  }
}
