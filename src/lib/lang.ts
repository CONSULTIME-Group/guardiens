import { SUPPORTED_LANGS, type SupportedLang } from "@/i18n";

/**
 * Choix de langue explicite de l'utilisateur.
 *
 * L'URL reste la source de vérité au rendu (`?lang=xx`), mais le choix
 * explicite est mémorisé pour survivre à une navigation vers un lien interne
 * qui ne porte pas le paramètre. Sans cela, chaque clic ramenait au français.
 *
 * Cette clé est aussi celle que lit et écrit le détecteur i18next
 * (lookupLocalStorage), pour qu'il n'existe qu'une seule mémoire de langue.
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
