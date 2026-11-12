/**
 * Pages SEO STATIQUES (issues de pages .tsx, pas de la base) a rafraichir dans
 * le cache Prerender apres chaque mise en ligne. Source unique, lue par
 * detect-deploy-and-mark-dirty (marquage) et consume-seo-dirty (consommation).
 *
 * Regle : une URL n'entre dans cette liste que si elle repond 200 en
 * production. Une route inexistante ou un article non publie consomme un
 * render Prerender facture a chaque mise en ligne sans rien mettre en cache,
 * puisque Prerender ne met en cache que les reponses 200.
 */
export const STATIC_SEO_URLS: readonly string[] = [
  "https://guardiens.fr/",
  "https://guardiens.fr/tarifs",
  "https://guardiens.fr/actualites",
  // Hubs publics : traites au premier passage avec le journal et l'accueil.
  "https://guardiens.fr/annonces",
  "https://guardiens.fr/guides",
  "https://guardiens.fr/faq",
  "https://guardiens.fr/a-propos",
  "https://guardiens.fr/contact",
  // Lot SEO-2 : hubs alimentés par la base, rafraîchis à chaque mise en ligne.
  // 10 URL pour un budget de 6 par passage : les 4 dernières partent au
  // passage suivant (cron 15 min), sans dépasser le budget.
  "https://guardiens.fr/projets",
  "https://guardiens.fr/petites-missions",
  "https://guardiens.fr/house-sitting",
  "https://guardiens.fr/departement",
  "https://guardiens.fr/races",
  "https://guardiens.fr/associations",
];

/**
 * Ligne de prerender_family_state qui porte le repere de marquage des pages
 * statiques : last_marked_at = date de la derniere mise en ligne detectee,
 * last_hash = empreinte du bundle correspondant.
 */
export const STATIC_FAMILY = "static";

/** Source ecrite dans prerender_recache_log pour ces pages. */
export const STATIC_LOG_SOURCE = "consume-seo-dirty:static";

/** Renders par passage de consume-seo-dirty pour les pages statiques. */
export const STATIC_RENDER_BUDGET = 6;

/**
 * Le detecteur marque les pages statiques seulement quand un nouveau bundle
 * apparait, jamais au premier passage a table vide, et jamais si le plafond
 * mensuel de renders serait franchi.
 */
export function shouldMarkStatic(p: {
  bundleChanged: boolean;
  isFirstEverRun: boolean;
  monthlyUsed: number;
  monthlyBudget: number;
}): boolean {
  if (!p.bundleChanged || p.isFirstEverRun) return false;
  return p.monthlyUsed + STATIC_SEO_URLS.length <= p.monthlyBudget;
}

/**
 * Lot PR4 (12/11/2026). Une page statique est rendue une fois par 24 heures au
 * plus par ce circuit : 59 mises en ligne du 04/11 au 12/11/2026 ont coute 423
 * rendus pour 14 pages. La page reste en attente et part des que son dernier
 * rendu reussi a 24 heures.
 */
export const STATIC_MIN_RENDER_INTERVAL_HOURS = 24;

/**
 * Lot PR4. Pages d'agregat (accueil, hubs, pages ville, guides de ville,
 * departements) : tout changement public les remet dans la file des
 * changements. Un rendu toutes les 6 heures au plus par cette file : l'accueil
 * y a ete rendu 119 fois en 7 jours. Les pages d'un seul element (annonce,
 * fiche, besoin, article) gardent leur rendu au passage suivant.
 */
export const HUB_MIN_RENDER_INTERVAL_HOURS = 6;

/** Lignes de file lues en plus du budget, pour qu'un hub en attente ne prenne la place de personne. */
export const OUTBOX_SPACING_LOOKAHEAD = 60;

const HOUR_MS = 3_600_000;
const STATIC_PATHS: ReadonlySet<string> = new Set(STATIC_SEO_URLS.map((u) => new URL(u).pathname));
const HUB_CHILD_RE = /^\/(house-sitting|guides|departement)\/[^/]+$/;

/** Vrai pour l'accueil, un hub de STATIC_SEO_URLS, une page ville, un guide de ville ou un departement. */
export function isHubPath(path: string): boolean {
  return STATIC_PATHS.has(path) || HUB_CHILD_RE.test(path);
}

/**
 * Partage les lignes de la file des changements, dans leur ordre : un hub rendu
 * avec succes depuis moins de `minIntervalMs` attend (`spaced`, avec l'heure a
 * laquelle il redevient du), les autres lignes sont rendues dans la limite du
 * budget. Une ligne au-dela du budget reste telle quelle pour le passage suivant.
 */
export function spaceOutboxHubs<T extends { path: string }>(
  rows: readonly T[],
  lastOkMsByPath: ReadonlyMap<string, number>,
  nowMs: number,
  budget: number = STATIC_RENDER_BUDGET,
  minIntervalMs: number = HUB_MIN_RENDER_INTERVAL_HOURS * HOUR_MS,
): { toRender: T[]; spaced: Array<{ row: T; until: string }> } {
  const toRender: T[] = [];
  const spaced: Array<{ row: T; until: string }> = [];
  for (const row of rows) {
    const last = isHubPath(row.path) ? lastOkMsByPath.get(row.path) : undefined;
    if (last !== undefined && nowMs - last < minIntervalMs) {
      spaced.push({ row, until: new Date(last + minIntervalMs).toISOString() });
    } else if (toRender.length < Math.max(0, budget)) {
      toRender.push(row);
    }
  }
  return { toRender, spaced };
}

/**
 * URL a recacher : celles dont le dernier recache reussi est anterieur au
 * repere (ou absent), plafonnees au budget, dans l'ordre de la liste.
 *
 * Avec `nowMs` (lot PR4), une URL rendue avec succes depuis moins de
 * `minIntervalMs` attend : elle reste comptee dans `deferred`. `lastOkByUrl`
 * doit alors couvrir au moins cette duree, reperes anterieurs compris.
 */
export function pickStaticToRecache(
  markedAt: string | null,
  lastOkByUrl: Map<string, string>,
  budget: number = STATIC_RENDER_BUDGET,
  nowMs?: number,
  minIntervalMs: number = STATIC_MIN_RENDER_INTERVAL_HOURS * HOUR_MS,
): { toRecache: string[]; deferred: number } {
  if (!markedAt) return { toRecache: [], deferred: 0 };
  const markMs = new Date(markedAt).getTime();
  const pending = STATIC_SEO_URLS.filter((u) => {
    const last = lastOkByUrl.get(u);
    return !last || new Date(last).getTime() < markMs;
  });
  const due = nowMs === undefined ? pending : pending.filter((u) => {
    const last = lastOkByUrl.get(u);
    return !last || nowMs - new Date(last).getTime() >= minIntervalMs;
  });
  const toRecache = due.slice(0, Math.max(0, budget));
  return { toRecache, deferred: pending.length - toRecache.length };
}
