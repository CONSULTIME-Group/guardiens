/**
 * Unique mémoire de langue du produit.
 *
 * Ce module ne dépend de rien : il est importé aussi bien par l'initialisation
 * i18next que par les utilitaires de langue, sans créer de cycle. Toute
 * écriture de préférence de langue passe par cette constante, et par elle
 * seule.
 */
export const LANG_STORAGE_KEY = "guardiens.lang";

/**
 * Clés héritées d'anciennes versions du détecteur i18next. Elles ne sont plus
 * jamais écrites : on les lit une fois au démarrage, on reprend leur valeur si
 * la clé canonique est vide, puis on les supprime définitivement.
 */
const LEGACY_STORAGE_KEYS = ["lang", "i18nextLng"] as const;

export function migrateLegacyLangStorage(supported: readonly string[]): void {
  if (typeof window === "undefined") return;
  try {
    for (const legacy of LEGACY_STORAGE_KEYS) {
      const value = window.localStorage.getItem(legacy);
      if (value === null) continue;
      const current = window.localStorage.getItem(LANG_STORAGE_KEY);
      if (!current && supported.includes(value.toLowerCase())) {
        window.localStorage.setItem(LANG_STORAGE_KEY, value.toLowerCase());
      }
      window.localStorage.removeItem(legacy);
    }
  } catch {
    // stockage indisponible (navigation privée, iframe) : sans effet
  }
}
