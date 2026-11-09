/**
 * Lot ADM17 (lot B H1, lot B F1) : une fenêtre pour tous les chiffres de
 * Trafic. « 7 jours » = les 168 dernières heures, comme l'entonnoir
 * d'inscription (get_signup_funnel_metrics), Utilisateurs et la vue
 * d'ensemble ; la période comparée est celle qui la précède, de même durée.
 */
export function trafficWindow(days: number, now: Date = new Date()) {
  const ms = days * 24 * 60 * 60 * 1000;
  const until = now;
  const since = new Date(now.getTime() - ms);
  const sincePrev = new Date(since.getTime() - ms);
  return { since, until, sincePrev };
}
