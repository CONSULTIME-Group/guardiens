/**
 * Lot ANN-6 (17/11/2026) : le tri de la page Annonces se lit et se choisit sur
 * tous les filtres. Avant le lot, le sélecteur n'existait que sur le périmètre
 * « En ligne » (urgence) ; brouillons, prêtes et retirées se rangeaient par
 * création décroissante, sans le dire.
 */
export type ListingSortKey = "urgency" | "published" | "updated" | "created";

export const LISTING_SORT_LABELS: Record<ListingSortKey, string> = {
  urgency: "Trier : urgence",
  published: "Trier : publication récente",
  updated: "Trier : modifiée récemment",
  created: "Trier : création récente",
};

/** Clé de mémorisation du choix : tout le périmètre « En ligne » partage un tri. */
export function sortScopeOf(filter: string, inPublishedScope: boolean): string {
  return inPublishedScope ? "published" : filter;
}

/** Tri par défaut : urgence en ligne, modification récente pour les brouillons, création sinon. */
export function defaultSortFor(filter: string, inPublishedScope: boolean): ListingSortKey {
  if (inPublishedScope) return "urgency";
  if (filter === "ready" || filter === "preparing") return "updated";
  return "created";
}

/** Choix proposés, le premier est celui du filtre. L'urgence n'existe que pour les annonces en ligne. */
export function sortOptionsFor(inPublishedScope: boolean): ListingSortKey[] {
  return inPublishedScope
    ? ["urgency", "published", "updated", "created"]
    : ["updated", "created", "published"];
}

type SortableListing = { id: string; created_at?: string | null; updated_at?: string | null; published_at?: string | null };

const stamp = (v?: string | null): number => {
  if (!v) return Number.NEGATIVE_INFINITY;
  const t = Date.parse(v);
  return Number.isFinite(t) ? t : Number.NEGATIVE_INFINITY;
};

const FIELD: Record<Exclude<ListingSortKey, "urgency">, "published_at" | "updated_at" | "created_at"> = {
  published: "published_at",
  updated: "updated_at",
  created: "created_at",
};

/** Plus récent d'abord ; une date absente passe en dernier ; à égalité, l'identifiant garde l'ordre stable. */
export function compareListings(key: Exclude<ListingSortKey, "urgency">, a: SortableListing, b: SortableListing): number {
  const f = FIELD[key];
  const ta = stamp(a[f]);
  const tb = stamp(b[f]);
  if (ta !== tb) return ta === Number.NEGATIVE_INFINITY ? 1 : tb === Number.NEGATIVE_INFINITY ? -1 : tb - ta;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

/** Tri effectif : le choix de l'administrateur s'il vaut pour ce périmètre, sinon le défaut du filtre. */
export function effectiveSortKey(
  pick: { scope: string; key: ListingSortKey } | null,
  filter: string,
  inPublishedScope: boolean,
): ListingSortKey {
  if (pick && pick.scope === sortScopeOf(filter, inPublishedScope) && sortOptionsFor(inPublishedScope).includes(pick.key)) {
    return pick.key;
  }
  return defaultSortFor(filter, inPublishedScope);
}
