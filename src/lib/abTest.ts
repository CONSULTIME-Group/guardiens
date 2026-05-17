/**
 * A/B testing minimaliste — assignation déterministe & sticky.
 *
 * Principe :
 *  - Pour un utilisateur connecté : hash(userId + experimentKey) → bucket A/B.
 *    Stable à vie, pas besoin de stockage. Le même user revoit toujours le
 *    même variant, peu importe l'appareil.
 *  - Pour un visiteur anonyme : on génère un identifiant aléatoire stocké
 *    dans localStorage (`ab:anonId`) et on hash de la même façon.
 *    → sticky par appareil, perdu si l'utilisateur efface ses données.
 *
 * Hypothèse RGPD : pas d'identifiant publicitaire, pas de cross-site tracking.
 * On considère ces ids comme essentiels au fonctionnement (sinon un user
 * verrait des variantes différentes à chaque visite, ce qui casse le produit).
 */

export type Variant = "A" | "B";

const ANON_KEY = "ab:anonId";

function getAnonId(): string {
  if (typeof window === "undefined") return "ssr";
  try {
    let id = window.localStorage.getItem(ANON_KEY);
    if (!id) {
      id = (crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`);
      window.localStorage.setItem(ANON_KEY, id);
    }
    return id;
  } catch {
    return "anon";
  }
}

/**
 * Hash FNV-1a 32-bit — rapide, distribution uniforme suffisante pour A/B.
 */
function hash(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }
  return h >>> 0;
}

/**
 * Renvoie le bucket A ou B pour une expérience donnée.
 * @param experimentKey identifiant unique de l'expérience (versionné si tu en changes les règles).
 * @param userId si connu, sinon fallback sur l'anonId localStorage.
 */
export function getVariant(experimentKey: string, userId?: string | null): Variant {
  const subject = userId || getAnonId();
  return hash(`${experimentKey}:${subject}`) % 2 === 0 ? "A" : "B";
}
