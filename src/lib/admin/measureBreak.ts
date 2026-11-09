/**
 * Lot ADM6 : rupture de la mesure d'audience interne. Le 14/10/2026 au soir
 * (lot perf 1), robots et navigateurs pilotés ne sont plus comptés : les
 * pages vues passent de 4 000 à 5 300 par jour à environ 600 à 1 300, sans
 * baisse de l'audience réelle (statistiques de l'hébergeur stables).
 */
export const PAGE_VIEW_MEASURE_CHANGE = new Date("2026-10-14T22:00:00Z");

/**
 * Avertissement à afficher quand la période comparée commence avant la
 * rupture : la comparaison de pages vues avec la période d'avant est faussée.
 * `previousStart` : début de la période précédente comparée.
 */
export function measureBreakNotice(previousStart: Date, now: Date = new Date()): string | null {
  if (previousStart >= PAGE_VIEW_MEASURE_CHANGE || now < PAGE_VIEW_MEASURE_CHANGE) return null;
  return "Depuis le 14/10/2026 au soir, les robots ne sont plus comptés : les pages vues comparées à la période d'avant paraissent en forte baisse sans que l'audience réelle ait baissé.";
}

/**
 * Lot perf 19 : rupture de la série « Première annonce » sur /search,
 * /recherche et /annonces. Depuis la mise en ligne du 09/11/2026, une carte
 * arrivée après une première issue vide (rayon vide, puis « Élargir ») n'est
 * plus comptée comme première annonce : elle part en GESTURE_CARD (« Après un
 * geste »), et l'abandon d'une liste se compte sur FIRST_RESULT. Les lignes
 * d'avant ne portent pas FIRST_RESULT.
 */
export const FIRST_CARD_MEASURE_CHANGE = new Date("2026-11-09T12:00:00Z");

/** Avertissement quand la fenêtre lue (depuis `windowStart`) chevauche la rupture du lot perf 19. */
export function firstCardMeasureNotice(windowStart: Date, now: Date = new Date()): string | null {
  if (windowStart >= FIRST_CARD_MEASURE_CHANGE || now < FIRST_CARD_MEASURE_CHANGE) return null;
  return "Depuis le 09/11/2026, « Première annonce » ne compte plus les cartes arrivées après un geste du membre (elles passent dans « Après un geste ») : la série baisse sans que la vitesse ait changé.";
}
