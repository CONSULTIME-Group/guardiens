// Fenêtre de sélection des annonces pour les digests.
//
// Constat du 19/08/2026 : send-alert-digest et send-nearby-daily-digest
// filtraient les annonces sur created_at. Une annonce restée en brouillon
// puis publiée plus de 24 h après sa création n'entrait jamais dans la
// fenêtre : quatre annonces publiées le 18/08 (brouillons de 8 a 45 jours)
// ont ainsi ete invisibles pour ce canal, a vie.
//
// La clé de vérité est la mise en ligne : published_at. Le repli sur
// created_at ne sert que pour les lignes historiques sans published_at.

export interface PublicationDates {
  created_at: string | null;
  published_at: string | null;
}

/** Normalise un ISO pour PostgREST : sans millisecondes, suffixe Z. */
function toPostgrestIso(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toISOString().slice(0, 19) + "Z";
}

/**
 * Clause `.or()` PostgREST : dans la fenêtre si publiée depuis `sinceISO`,
 * ou, pour l'historique sans published_at, créée depuis `sinceISO`.
 * Se combine par ET avec les autres clauses `.or()` de la requête.
 */
export function publicationWindowOrClause(sinceISO: string): string {
  const since = toPostgrestIso(sinceISO);
  return `published_at.gte.${since},and(published_at.is.null,created_at.gte.${since})`;
}

/** Prédicat miroir de la clause, pour les tests et les contrôles hors SQL. */
export function isWithinPublicationWindow(sit: PublicationDates, sinceISO: string): boolean {
  const since = Date.parse(sinceISO);
  if (Number.isNaN(since)) return false;
  if (sit.published_at) {
    const published = Date.parse(sit.published_at);
    return !Number.isNaN(published) && published >= since;
  }
  if (sit.created_at) {
    const created = Date.parse(sit.created_at);
    return !Number.isNaN(created) && created >= since;
  }
  return false;
}
