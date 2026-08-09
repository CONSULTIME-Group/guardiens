import { SUPPORTED_LANGS, type SupportedLang } from "@/i18n";

/**
 * Choix de langue explicite de l'utilisateur.
 *
 * L'URL reste la source de vérité au rendu (`?lang=xx`), mais le choix
 * explicite est mémorisé pour survivre à une navigation vers un lien interne
 * qui ne porte pas le paramètre. Sans cela, chaque clic ramenait au français.
 *
 * Aucune détection automatique via l'en-tête du navigateur : un premier
 * visiteur sans choix reste en français, ce qui préserve l'URL canonique.
 */
const STORAGE_KEY = "guardiens.lang";

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
    if (lang === "fr") window.localStorage.removeItem(STORAGE_KEY);
    else window.localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    // stockage indisponible (navigation privée, iframe) : sans effet
  }
}

/**
 * Ajoute le paramètre de langue à un chemin interne, sauf en français.
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
