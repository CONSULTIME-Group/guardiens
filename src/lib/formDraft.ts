/**
 * Brouillons locaux de formulaires.
 *
 * Objectif : ne plus perdre une saisie quand l'onglet est quitté (copier-coller
 * depuis un traitement de texte, bascule d'application sur mobile, rechargement
 * accidentel). Les valeurs sont conservées dans localStorage, puis restaurées
 * au retour, et effacées après enregistrement ou annulation.
 */

const PREFIX = "guardiens_draft:";
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

interface StoredDraft<T> {
  savedAt: number;
  value: T;
}

export function readFormDraft<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredDraft<T>;
    if (!parsed || typeof parsed.savedAt !== "number") return null;
    if (Date.now() - parsed.savedAt > MAX_AGE_MS) {
      localStorage.removeItem(PREFIX + key);
      return null;
    }
    return parsed.value ?? null;
  } catch {
    return null;
  }
}

export function writeFormDraft<T>(key: string, value: T): void {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify({ savedAt: Date.now(), value }));
  } catch {
    /* quota ou mode privé : la saisie continue normalement */
  }
}

/** Horodatage de la dernière sauvegarde locale, ou null. */
export function getFormDraftSavedAt(key: string): number | null {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredDraft<unknown>;
    return typeof parsed?.savedAt === "number" ? parsed.savedAt : null;
  } catch {
    return null;
  }
}

export function clearFormDraft(key: string): void {
  try {
    localStorage.removeItem(PREFIX + key);
  } catch {
    /* rien à faire */
  }
}

/** Liste les clés de brouillon existantes commençant par un préfixe donné. */
export function listFormDraftKeys(prefix: string): string[] {
  const out: string[] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(PREFIX + prefix)) out.push(k.slice(PREFIX.length));
    }
  } catch {
    return out;
  }
  return out;
}
