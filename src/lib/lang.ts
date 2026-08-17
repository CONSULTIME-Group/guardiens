import { SUPPORTED_LANGS, type SupportedLang } from "@/i18n";
import { LANG_STORAGE_KEY } from "@/lib/langStorageKey";

/**
 * Choix de langue explicite de l'utilisateur.
 *
 * L'URL reste la source de vérité au rendu (`?lang=xx`), mais le choix
 * explicite est mémorisé pour survivre à une navigation vers un lien interne
 * qui ne porte pas le paramètre. Sans cela, chaque clic ramenait au français.
 *
 * Une seule clé existe dans tout le produit, définie dans
 * `src/lib/langStorageKey.ts`, et c'est aussi celle que lit le détecteur
 * i18next (lookupLocalStorage).
 */
const STORAGE_KEY = LANG_STORAGE_KEY;

export const isSupportedLang = (value: string | null | undefined): value is SupportedLang =>
  !!value && (SUPPORTED_LANGS as readonly string[]).includes(value);

export function getStoredLang(): SupportedLang | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return isSupportedLang(raw) ? raw : null;
  } catch {
    return null;
  }
}

export function setStoredLang(lang: SupportedLang): void {
  if (typeof window === "undefined") return;
  try {
    // Le français est écrit comme les autres : un retour explicite au
    // français doit primer sur la langue du navigateur.
    window.localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    // stockage indisponible (navigation privée, iframe) : sans effet
  }
}

/**
 * Ajoute le paramètre de langue à une URL, sauf en français.
 *
 * Réservé aux cas où le contexte JavaScript est perdu : liens provoquant un
 * rechargement complet hors routeur, balises hreflang, sitemap, liens sortants
 * (emails, partenaires). La navigation du routeur conserve l'état i18n, donc
 * décorer les liens internes ne ferait que dupliquer les URL crawlables.
 * Conserve les paramètres existants et le fragment.
 */
export function withLang(path: string, lang: string | null | undefined): string {
  if (!path || !isSupportedLang(lang) || lang === "fr") return path;
  if (/^(https?:)?\/\//i.test(path) || path.startsWith("mailto:") || path.startsWith("tel:")) {
    return path;
  }
  const [beforeHash, hash] = path.split("#");
  const [pathname, query = ""] = beforeHash.split("?");
  const params = new URLSearchParams(query);
  params.set("lang", lang);
  return `${pathname}?${params.toString()}${hash ? `#${hash}` : ""}`;
}

/**
 * Langue cible avant le premier rendu : lien explicite, puis choix mémorisé,
 * puis détection navigateur, puis français.
 *
 * Cas particulier des langues retirées du produit (de, it, es le
 * 17/08/2026) : un paramètre `?lang=` explicite mais non supporté impose le
 * français immédiatement, sans tenir compte du choix mémorisé ni du
 * navigateur. C'est ce qui garantit qu'une ancienne URL `?lang=de` ou
 * `?lang=es` connue de Google rend la page française indexable avec sa
 * canonique auto-référente, au lieu d'une variante noindex.
 */
export function resolveInitialLang(): string {
  if (typeof window === "undefined") return "fr";
  try {
    const raw = new URLSearchParams(window.location.search).get("lang")?.toLowerCase();
    if (raw) {
      return isSupportedLang(raw) ? raw : "fr";
    }
  } catch {
    // URL illisible : on continue sur le choix mémorisé.
  }

  const stored = getStoredLang();
  if (stored) return stored;

  try {
    if (typeof navigator !== "undefined") {
      const candidate = navigator.language || (navigator.languages && navigator.languages[0]);
      if (candidate) {
        const code = candidate.split("-")[0].toLowerCase().slice(0, 2);
        if (isSupportedLang(code)) return code;
      }
    }
  } catch {
    // Détection navigateur indisponible : repli sur le français.
  }

  return "fr";
}

/**
 * Locale BCP 47 sûre pour Intl.
 *
 * Certains environnements (navigateurs headless, systèmes POSIX) exposent des
 * valeurs invalides comme "en-US@posix", qui font lever une RangeError à
 * toLocaleDateString ou Intl.NumberFormat. On nettoie l'extension POSIX, on
 * valide, puis on retombe sur le français.
 */
export function safeLocale(value?: string | null, fallback = "fr-FR"): string {
  const raw = (value ?? "").split("@")[0].trim();
  if (!raw) return fallback;
  try {
    return Intl.DateTimeFormat.supportedLocalesOf([raw]).length ? raw : fallback;
  } catch {
    return fallback;
  }
}
