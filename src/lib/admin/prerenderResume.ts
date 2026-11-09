/**
 * Rendu SEO sous le voyant de la vue d'ensemble.
 *
 * Lot SEO1 (19/10/2026) : seuls les rendus réussis (ok = true) comptent.
 * Lot ADM12 (09/11/2026, arène admin) : depuis le lot PR3 (06/11/2026),
 * public.seo_reserve_render compte les rendus réussis depuis le début du cycle
 * de facturation Prerender, le 4 du mois à 0 h (heure de Paris), et refuse tout
 * rendu à partir de 9 900 (hors rallonge seo_render_allowance). La phrase
 * compte donc sur le même cycle ; au plafond, la reprise a lieu au cycle
 * suivant. L'ancienne fenêtre glissante de 30 jours affichait un chiffre qui ne
 * bloquait plus rien (9 727 sur 30 jours pour 1 969 sur le cycle, 09/11/2026).
 */
export const CONSUMER_RENDER_CEILING = 9_900;
export const CYCLE_START_DAY = 4;

const PARIS = "Europe/Paris";

function parisParts(t: number): { y: number; m: number; d: number; h: number; mi: number } {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: PARIS, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(new Date(t));
  const get = (k: string) => Number(parts.find((p) => p.type === k)?.value);
  return { y: get("year"), m: get("month"), d: get("day"), h: get("hour"), mi: get("minute") };
}

/** Instant UTC de minuit, heure de Paris, pour un jour donné (mois 1 à 12, débordement accepté). */
export function parisMidnight(y: number, m: number, d: number): Date {
  const naive = Date.UTC(y, m - 1, d, 0, 0);
  let t = naive;
  for (let i = 0; i < 2; i++) {
    const p = parisParts(t);
    const asUtc = Date.UTC(p.y, p.m - 1, p.d, p.h, p.mi);
    t = naive - (asUtc - t);
  }
  return new Date(t);
}

/** Début du cycle en cours : le 4 du mois à 0 h à Paris, ou celui du mois précédent avant le 4. */
export function renderCycleStart(now: Date): Date {
  const p = parisParts(now.getTime());
  const thisMonth = parisMidnight(p.y, p.m, CYCLE_START_DAY);
  return now.getTime() >= thisMonth.getTime() ? thisMonth : parisMidnight(p.y, p.m - 1, CYCLE_START_DAY);
}

/** Début du cycle suivant : date de reprise quand le plafond est atteint. */
export function nextRenderCycleStart(now: Date): Date {
  const start = renderCycleStart(now);
  const p = parisParts(start.getTime());
  return parisMidnight(p.y, p.m + 1, CYCLE_START_DAY);
}

export function formatParisDay(d: Date): string {
  return new Intl.DateTimeFormat("fr-FR", { timeZone: PARIS, day: "2-digit", month: "2-digit", year: "numeric" }).format(d);
}

const fmtCount = (n: number) => new Intl.NumberFormat("fr-FR").format(n);

export interface PrerenderResumeInput {
  okRendersInCycle: number;
  cycleStart: Date;
  nextCycleStart: Date;
  backlog: number;
}

/** Phrase de la vue d'ensemble, sur le cycle qui décide réellement du blocage. */
export function prerenderResumeSentence({ okRendersInCycle, cycleStart, nextCycleStart, backlog }: PrerenderResumeInput): string {
  const pages = `${backlog} page${backlog > 1 ? "s" : ""} en attente de rendu`;
  const since = `depuis le ${formatParisDay(cycleStart)}`;
  if (okRendersInCycle < CONSUMER_RENDER_CEILING) {
    return `Rendu actif : ${fmtCount(okRendersInCycle)} rendus ${since} (plafond ${fmtCount(CONSUMER_RENDER_CEILING)}), ${pages}.`;
  }
  return `${fmtCount(okRendersInCycle)} rendus ${since} (plafond ${fmtCount(CONSUMER_RENDER_CEILING)}), reprise le ${formatParisDay(nextCycleStart)}, ${pages}.`;
}
