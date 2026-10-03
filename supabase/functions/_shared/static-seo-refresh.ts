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
  "https://guardiens.fr/faq",
  "https://guardiens.fr/a-propos",
  "https://guardiens.fr/contact",
  // Lot SEO-2 : hubs alimentés par la base, rafraîchis à chaque mise en ligne.
  // 8 URL pour un budget de 6 par passage : les 2 dernières partent au
  // passage suivant (cron 15 min), sans dépasser le budget.
  "https://guardiens.fr/projets",
  "https://guardiens.fr/petites-missions",
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
 * URL a recacher : celles dont le dernier recache reussi est anterieur au
 * repere (ou absent), plafonnees au budget, dans l'ordre de la liste.
 */
export function pickStaticToRecache(
  markedAt: string | null,
  lastOkByUrl: Map<string, string>,
  budget: number = STATIC_RENDER_BUDGET,
): { toRecache: string[]; deferred: number } {
  if (!markedAt) return { toRecache: [], deferred: 0 };
  const markMs = new Date(markedAt).getTime();
  const pending = STATIC_SEO_URLS.filter((u) => {
    const last = lastOkByUrl.get(u);
    return !last || new Date(last).getTime() < markMs;
  });
  const toRecache = pending.slice(0, Math.max(0, budget));
  return { toRecache, deferred: pending.length - toRecache.length };
}
