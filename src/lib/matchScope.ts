/**
 * Élargissement progressif du pool d'annonces du tableau de bord gardien
 * (audit du 19/08/2026 : le filtre départemental seul laissait 86 % des
 * gardiens sur une section vide).
 *
 * Paliers, arrêt au premier qui donne au moins une annonce :
 *   1. même département (code postal du propriétaire, aucun calcul de
 *      distance, aucune requête supplémentaire)
 *   2. à moins de 100 km à vol d'oiseau (coordonnées approximatives du
 *      propriétaire via public_profiles, jamais le géocodage du nom de
 *      ville, source d'homonymes)
 *   3. à moins de 200 km
 *   4. France entière, triée par score d'affinité (voir orderByAffinity)
 *
 * Un gardien sans coordonnées (258 profils au 19/08/2026) ne peut calculer
 * aucune distance : il conserve le palier département via son code postal
 * puis tombe directement au palier national, jamais sur un écran vide.
 */
import { haversineDistance } from "@/utils/geo";

export type PoolScope = "dept" | "km100" | "km200" | "country" | "none";

export const NEAR_KM = 100;
export const FAR_KM = 200;

export interface GeoPoint {
  lat: number;
  lng: number;
}

interface PickProgressiveScopeInput<T> {
  sits: T[];
  sitterDept: string | null;
  sitterCoords: GeoPoint | null;
  getDept: (sit: T) => string | null;
  getCoords: (sit: T) => GeoPoint | null;
}

export function pickProgressiveScope<T>({
  sits,
  sitterDept,
  sitterCoords,
  getDept,
  getCoords,
}: PickProgressiveScopeInput<T>): { scoped: T[]; scope: PoolScope } {
  if (sits.length === 0) return { scoped: [], scope: "none" };

  if (sitterDept) {
    const sameDept = sits.filter((s) => getDept(s) === sitterDept);
    if (sameDept.length > 0) return { scoped: sameDept, scope: "dept" };
  }

  if (sitterCoords) {
    const within = (km: number) =>
      sits.filter((s) => {
        const c = getCoords(s);
        return c ? haversineDistance(sitterCoords, c) <= km : false;
      });
    const near = within(NEAR_KM);
    if (near.length > 0) return { scoped: near, scope: "km100" };
    const far = within(FAR_KM);
    if (far.length > 0) return { scoped: far, scope: "km200" };
  }

  return { scoped: sits, scope: "country" };
}

/**
 * Palier national : les annonces les plus proches du profil d'abord (score
 * d'affinité décroissant), les non scorées en fin de liste. Tri stable :
 * à score égal, l'ordre d'entrée (plus récentes d'abord) est conservé.
 */
export function orderByAffinity<T extends { id: string }>(
  cards: T[],
  scoreById: ReadonlyMap<string, number>,
): T[] {
  return cards
    .map((card, index) => ({ card, index }))
    .sort((a, b) => {
      const sa = scoreById.get(a.card.id);
      const sb = scoreById.get(b.card.id);
      if (sa == null && sb == null) return a.index - b.index;
      if (sa == null) return 1;
      if (sb == null) return -1;
      return sb - sa || a.index - b.index;
    })
    .map(({ card }) => card);
}

/**
 * Sous-titre de la section rencontre : dit la vérité sur le palier atteint,
 * jamais une distance mensongère.
 */
export function scopeSubtitle(scope: PoolScope): string {
  if (scope === "dept") return "Dans votre département, en ce moment.";
  if (scope === "km100") return "À moins de 100 km de chez vous.";
  if (scope === "km200") return "À moins de 200 km de chez vous.";
  return "Partout en France, les plus proches de votre profil.";
}
