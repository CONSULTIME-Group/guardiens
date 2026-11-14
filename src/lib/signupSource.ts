/**
 * Lot SRC1 (12/11/2026) : source d'arrivée enregistrée à l'inscription.
 *
 * À la première page vue d'une visite, on retient d'où vient la personne :
 * paramètres utm, TYPE d'identifiant de clic publicitaire (jamais sa valeur),
 * domaine du site précédent, chemin d'entrée. La source vit en mémoire de
 * page. Elle n'est copiée en sessionStorage (durée de l'onglet) qu'avec
 * l'accord « Mesure d'audience ». Aucun localStorage, aucune conservation
 * entre deux visites.
 *
 * Elle part ensuite avec l'inscription : métadonnées de signUp pour un
 * compte par email (écrite par handle_new_user), paramètre signup_src de
 * l'URL de retour pour Google (écrite par record_signup_source).
 */
import { supabase } from "@/integrations/supabase/client";
import { getStoredConsent } from "@/lib/cookieConsent";

export const CLICK_ID_TYPES = ["gclid", "gbraid", "wbraid", "fbclid", "msclkid"] as const;
export type ClickIdType = (typeof CLICK_ID_TYPES)[number];

/** Clés courtes : l'objet voyage dans une URL (300 caractères au plus). */
export interface SignupSource {
  /** utm_source */
  us?: string;
  /** utm_medium */
  um?: string;
  /** utm_campaign */
  uc?: string;
  /** Type d'identifiant de clic présent, jamais sa valeur. */
  ck?: ClickIdType;
  /** Domaine du site précédent, hors Guardiens. */
  rd?: string;
  /** Chemin d'entrée, sans paramètres. */
  lp?: string;
  /** Lien de parrainage (?ref=) présent à l'arrivée. */
  rf?: 1;
  /** Heure de la première page vue (ISO). */
  ts?: string;
}

export type SignupChannel =
  | "google_ads" | "facebook_ads" | "email" | "parrainage" | "facebook"
  | "instagram" | "youtube" | "tiktok" | "recherche_naturelle" | "ia" | "autre_site" | "direct";

export const SIGNUP_SRC_PARAM = "signup_src";
export const SIGNUP_SOURCE_SESSION_KEY = "guardiens_signup_source";
export const SIGNUP_SRC_MAX_LENGTH = 300;
const OWN_HOSTS = /(^|\.)guardiens\.fr$|(^|\.)lovable\.app$|(^|\.)lovable\.dev$|^localhost$/;
const NEW_ACCOUNT_MAX_AGE_MS = 30 * 60 * 1000;

const cleanValue = (v: string | null | undefined, max: number): string | undefined => {
  const out = (v ?? "").toLowerCase().replace(/[^a-z0-9 _.+~-]/g, "").trim().slice(0, max);
  return out || undefined;
};

const referrerDomain = (referrer: string | null | undefined): string | undefined => {
  if (!referrer) return undefined;
  try {
    const host = new URL(referrer).hostname.toLowerCase().replace(/^www\./, "");
    if (!host || OWN_HOSTS.test(host) || !/^[a-z0-9.-]{1,120}$/.test(host)) return undefined;
    return host;
  } catch {
    return undefined;
  }
};

/** Construit la source d'une arrivée. Fonction pure. */
export function buildSignupSource(input: { search: string; pathname: string; referrer?: string | null; now?: Date }): SignupSource {
  const params = new URLSearchParams(input.search || "");
  const src: SignupSource = {};
  const us = cleanValue(params.get("utm_source"), 80);
  const um = cleanValue(params.get("utm_medium"), 80);
  const uc = cleanValue(params.get("utm_campaign"), 120);
  if (us) src.us = us;
  if (um) src.um = um;
  if (uc) src.uc = uc;
  const ck = CLICK_ID_TYPES.find((k) => params.has(k));
  if (ck) src.ck = ck;
  const rd = referrerDomain(input.referrer);
  if (rd) src.rd = rd;
  const lp = (input.pathname || "/").split(/[?#]/)[0].slice(0, 200);
  src.lp = lp.startsWith("/") ? lp : "/";
  if (params.has("ref")) src.rf = 1;
  src.ts = (input.now ?? new Date()).toISOString();
  return src;
}

const ADS_HOST = /(^|\.)(google|bing|qwant|duckduckgo|ecosia)\./;
const FACEBOOK_HOST = /(^|\.)(facebook|instagram|fb)\./;
const AI_HOST = /(^|\.)(chatgpt|openai|perplexity|gemini|claude|copilot)\./;
const PAID_MEDIUMS = ["cpc", "ppc", "paid", "paid_social", "paidsocial", "paid-social", "ads", "cpm"];
const FACEBOOK_SOURCES = ["facebook", "fb"];
const INSTAGRAM_HOST = /(^|\.)instagram\./;
const INSTAGRAM_SOURCES = ["instagram", "ig"];
const YOUTUBE_HOST = /(^|\.)(youtube|youtu)\./;
const YOUTUBE_SOURCES = ["youtube", "yt"];
const TIKTOK_HOST = /(^|\.)tiktok\./;

/**
 * Canal d'une source, par ordre de priorité. Même règle que la fonction
 * derive_signup_channel de la base, qui fait foi (parité verrouillée par
 * src/__tests__/src1/ et scripts/test-src1-source-inscription.mjs).
 */
export function deriveSignupChannel(src: SignupSource | null | undefined): SignupChannel {
  const s = src ?? {};
  const rd = `${s.rd ?? ""}.`;
  const us = s.us ?? "";
  if (s.ck === "gclid" || s.ck === "gbraid" || s.ck === "wbraid") return "google_ads";
  if (s.ck === "fbclid" && PAID_MEDIUMS.includes(s.um ?? "")) return "facebook_ads";
  if (us === "email") return "email";
  if (s.rf === 1) return "parrainage";
  if (us === "tiktok" || (s.rd && TIKTOK_HOST.test(rd))) return "tiktok";
  if (YOUTUBE_SOURCES.includes(us) || (s.rd && YOUTUBE_HOST.test(rd))) return "youtube";
  if (INSTAGRAM_SOURCES.includes(us) || (s.rd && INSTAGRAM_HOST.test(rd))) return "instagram";
  if (s.ck === "fbclid" || (s.rd && FACEBOOK_HOST.test(rd)) || FACEBOOK_SOURCES.includes(us)) return "facebook";
  if (!s.ck && s.rd && ADS_HOST.test(rd)) return "recherche_naturelle";
  if ((s.rd && AI_HOST.test(rd)) || /^(chatgpt|openai|perplexity|gemini|claude|copilot)/.test(us)) return "ia";
  if (s.rd || us) return "autre_site";
  return "direct";
}

/** JSON compact, 300 caractères au plus : les champs longs tombent d'abord. */
export function encodeSignupSource(src: SignupSource): string {
  const copy: SignupSource = { ...src };
  for (const drop of ["uc", "lp", "rd", "um", "us"] as const) {
    if (JSON.stringify(copy).length <= SIGNUP_SRC_MAX_LENGTH) break;
    delete copy[drop];
  }
  return JSON.stringify(copy);
}

export function decodeSignupSource(raw: string | null | undefined): SignupSource | null {
  if (!raw || raw.length > SIGNUP_SRC_MAX_LENGTH) return null;
  try {
    const p = JSON.parse(raw) as Record<string, unknown>;
    if (!p || typeof p !== "object" || Array.isArray(p)) return null;
    const out: SignupSource = {};
    const us = cleanValue(typeof p.us === "string" ? p.us : "", 80);
    const um = cleanValue(typeof p.um === "string" ? p.um : "", 80);
    const uc = cleanValue(typeof p.uc === "string" ? p.uc : "", 120);
    if (us) out.us = us;
    if (um) out.um = um;
    if (uc) out.uc = uc;
    if (typeof p.ck === "string" && (CLICK_ID_TYPES as readonly string[]).includes(p.ck)) out.ck = p.ck as ClickIdType;
    if (typeof p.rd === "string" && /^[a-z0-9.-]{1,120}$/.test(p.rd)) out.rd = p.rd;
    if (typeof p.lp === "string" && p.lp.startsWith("/")) out.lp = p.lp.split(/[?#]/)[0].slice(0, 200);
    if (p.rf === 1) out.rf = 1;
    if (typeof p.ts === "string" && Number.isFinite(Date.parse(p.ts))) out.ts = p.ts;
    return out;
  } catch {
    return null;
  }
}

/** Remplace la valeur des identifiants de clic par 1 dans une chaîne de recherche. */
export function maskClickIds(search: string | null | undefined): string | undefined {
  if (!search) return undefined;
  const params = new URLSearchParams(search);
  let touched = false;
  for (const key of CLICK_ID_TYPES) {
    if (params.has(key)) {
      params.set(key, "1");
      touched = true;
    }
  }
  if (!touched) return search;
  const out = params.toString();
  return out ? `?${out}` : undefined;
}

let memorySource: SignupSource | null = null;
let consentListening = false;

const persistIfAllowed = () => {
  if (!memorySource || typeof window === "undefined") return;
  try {
    if (getStoredConsent() === "granted") {
      sessionStorage.setItem(SIGNUP_SOURCE_SESSION_KEY, JSON.stringify(memorySource));
    } else {
      sessionStorage.removeItem(SIGNUP_SOURCE_SESSION_KEY);
    }
  } catch { /* stockage indisponible : la mémoire de page suffit */ }
};

const readSessionSource = (): SignupSource | null => {
  try {
    if (getStoredConsent() !== "granted") return null;
    return decodeSignupSource(sessionStorage.getItem(SIGNUP_SOURCE_SESSION_KEY));
  } catch {
    return null;
  }
};

const readUrlSource = (): SignupSource | null => {
  try {
    return decodeSignupSource(new URLSearchParams(window.location.search).get(SIGNUP_SRC_PARAM));
  } catch {
    return null;
  }
};

/**
 * À appeler à chaque page vue : seule la première de la visite compte, la
 * première source n'est jamais écrasée. Au retour de Google, la source
 * portée par l'URL (signup_src) prime sur ce retour lui-même.
 */
export function captureSignupSource(input: { search: string; pathname: string; referrer?: string | null }): void {
  if (typeof window === "undefined" || memorySource) return;
  memorySource = readUrlSource() ?? readSessionSource() ?? buildSignupSource(input);
  persistIfAllowed();
  if (!consentListening) {
    consentListening = true;
    window.addEventListener("consent-changed", persistIfAllowed);
  }
}

export function getSignupSource(): SignupSource | null {
  if (memorySource) return memorySource;
  if (typeof window === "undefined") return null;
  return readUrlSource() ?? readSessionSource();
}

/** Ajoute ?signup_src= à l'URL de retour de Google. Sans source, URL inchangée. */
export function withSignupSrcParam(target: string): string {
  const src = getSignupSource();
  if (!src) return target;
  const sep = target.includes("?") ? "&" : "?";
  return `${target}${sep}${SIGNUP_SRC_PARAM}=${encodeURIComponent(encodeSignupSource(src))}`;
}

export function clearSignupSrcParam(): void {
  try {
    const url = new URL(window.location.href);
    if (url.searchParams.has(SIGNUP_SRC_PARAM)) {
      url.searchParams.delete(SIGNUP_SRC_PARAM);
      window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
    }
  } catch { /* rien */ }
}

/** Un membre existant ne déclenche aucun appel : compte de moins de 30 minutes, créé par un fournisseur externe. */
export function shouldRecordSignupSource(user: { created_at?: string; app_metadata?: { provider?: string } }, now = Date.now()): boolean {
  const created = Date.parse(user.created_at ?? "");
  if (!Number.isFinite(created) || now - created > NEW_ACCOUNT_MAX_AGE_MS || now < created - 60_000) return false;
  // Un compte par email porte sa source dans les métadonnées de signUp.
  return (user.app_metadata?.provider ?? "email") !== "email";
}

let recorded = false;

/**
 * À appeler dans fetchProfile. Une fois par page, seulement pour un compte
 * tout juste créé par Google. Le serveur recalcule le canal et n'écrase
 * jamais une source déjà enregistrée.
 */
export async function recordPendingSignupSource(user: { created_at?: string; app_metadata?: { provider?: string } }): Promise<void> {
  if (recorded || !shouldRecordSignupSource(user)) {
    clearSignupSrcParam();
    return;
  }
  const src = getSignupSource();
  recorded = true;
  if (src) {
    try {
      await (supabase.rpc as any)("record_signup_source", { p: src });
    } catch { /* la mesure ne bloque jamais la connexion */ }
  }
  clearSignupSrcParam();
}

/** Tests seulement. */
export function __resetSignupSourceForTests(): void {
  memorySource = null;
  recorded = false;
}
