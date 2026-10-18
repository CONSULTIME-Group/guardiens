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
