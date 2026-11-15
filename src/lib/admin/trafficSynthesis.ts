/**
 * Lot TRF-6 : phrases de synthèse des onglets de /admin/traffic. Règles pures.
 */
import type { ChannelLeadRow } from "@/lib/admin/channelLeads";

const fmt = (n: number) => new Intl.NumberFormat("fr-FR").format(n);
const plural = (n: number, one: string, many: string) => `${fmt(n)} ${n > 1 ? many : one}`;

/** « 26 inscrits depuis le 12/11 (4 jours), 26 avec une source. La recherche naturelle en amène 9, Facebook 7. » */
export function leadsPhrase(channels: (ChannelLeadRow & { label: string })[], periodPhrase: string): string {
  const signups = channels.reduce((s, c) => s + c.signups, 0);
  const known = channels.filter((c) => c.channel !== "inconnu");
  const knownSignups = known.reduce((s, c) => s + c.signups, 0);
  const head = `${plural(signups, "inscrit", "inscrits")} ${periodPhrase}, ${fmt(knownSignups)} avec une source enregistrée.`;
  const top = known.filter((c) => c.signups > 0).sort((a, b) => b.signups - a.signups).slice(0, 3);
  if (top.length === 0) return head;
  const [first, ...rest] = top;
  const tail = [`${first.label} en amène ${fmt(first.signups)}`, ...rest.map((c) => `${c.label} ${fmt(c.signups)}`)].join(", ");
  return `${head} ${tail}.`;
}

export function totalVisits(channels: ChannelLeadRow[]): number {
  return channels.reduce((s, c) => s + c.visits, 0);
}

/** « Sur 210 inscriptions démarrées en 7 jours, 70 comptes créés (33 %). 30 membres ont fait une première action. » */
export function funnelPhrase(started: number, accounts: number, firstAction: number, periodPhrase: string): string {
  const rate = started > 0 ? Math.min(100, Math.round((accounts / started) * 100)) : 0;
  return `Sur ${plural(started, "inscription démarrée", "inscriptions démarrées")} ${periodPhrase}, ${plural(accounts, "compte créé", "comptes créés")} (${rate} %). ${plural(firstAction, "membre a fait", "membres ont fait")} une première action.`;
}

/** « 482 clics Google sur 29 jours (+16,4 %), 475 hors marque. 2 actions faites, prochaine relecture le 13/12. » */
export function seoPhrase(input: { clicks: number; previousClicks: number | null; nonBrand: number; period: string; treated: number; nextReview: string | null }): string {
  const delta = input.previousClicks && input.previousClicks > 0
    ? ` (${((input.clicks - input.previousClicks) / input.previousClicks * 100).toLocaleString("fr-FR", { maximumFractionDigits: 1, signDisplay: "always" })} %)`
    : "";
  const head = `${plural(input.clicks, "clic Google", "clics Google")} sur ${input.period}${delta}, ${fmt(input.nonBrand)} hors marque.`;
  if (input.treated === 0) return head;
  return `${head} ${plural(input.treated, "action faite", "actions faites")}${input.nextReview ? `, prochaine relecture le ${input.nextReview}` : ""}.`;
}
