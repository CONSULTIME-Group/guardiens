/**
 * Lot TRF2 (15/11/2026, arène claude/arene/2026-11-15-trafic) : onglet Leads
 * de /admin/traffic, lu par admin_channel_leads (drizzle 0166).
 * Règles pures : normalisation, regroupement par canal, campagnes.
 */
import { signupChannelLabel, signupSourceRange } from "@/lib/admin/signupSources";

export interface ChannelLeadRow {
  channel: string;
  /** Nul sur une ligne de campagne : arrivées sans campagne. */
  campaign: string | null;
  isCampaign: boolean;
  visits: number;
  signups: number;
  publishedMembers: number;
  applicants: number;
  helpers: number;
  outingMembers: number;
}

export interface ChannelLeads {
  sitsPublished: number;
  channels: (ChannelLeadRow & { label: string; campaigns: ChannelLeadRow[] })[];
}

/**
 * Lot TRF-3 (15/11/2026) : premier jour où la source d'inscription est
 * enregistrée (2 inscrits sur 5 le 12/11, tous à partir du 13/11). Avant,
 * tout inscrit tombe dans « Inconnu » : 202 sur 228 à 30 jours le 15/11.
 */
export const LEADS_TRACKING_START = "2026-11-12";
export const LEADS_PERIODS = ["suivi", 7, 30, 90] as const;
export type LeadsPeriod = (typeof LEADS_PERIODS)[number];
/** Période d'ouverture : depuis le début du suivi, où la source est connue. */
export const DEFAULT_LEADS_PERIOD: LeadsPeriod = "suivi";

export function leadsPeriodLabel(p: LeadsPeriod): string {
  if (p !== "suivi") return `${p} jours`;
  const [, m, d] = LEADS_TRACKING_START.split("-");
  return `Depuis le suivi (${d}/${m})`;
}

/** Bornes en jours de Paris ; « suivi » part du premier jour de collecte. */
export function leadsRange(p: LeadsPeriod, now = new Date()): { from: string; to: string } {
  const r = signupSourceRange(p === "suivi" ? 1 : p, now);
  return p === "suivi" ? { from: LEADS_TRACKING_START, to: r.to } : r;
}

export interface LeadsCoverage { signups: number; known: number; share: number; publishedMembers: number; publishedKnown: number }

/** Part des inscrits de la période dont la source est enregistrée. */
export function leadsCoverage(channels: ChannelLeadRow[]): LeadsCoverage {
  let signups = 0, known = 0, publishedMembers = 0, publishedKnown = 0;
  for (const c of channels) {
    signups += c.signups;
    publishedMembers += c.publishedMembers;
    if (c.channel !== "inconnu") { known += c.signups; publishedKnown += c.publishedMembers; }
  }
  return { signups, known, share: signups > 0 ? known / signups : 0, publishedMembers, publishedKnown };
}

/** Réseaux sociaux toujours affichés, même à zéro : c'est la question posée. */
export const SOCIAL_CHANNELS = ["facebook", "instagram", "youtube", "tiktok"] as const;

const num = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const emptyRow = (channel: string): ChannelLeadRow => ({
  channel, campaign: null, isCampaign: false,
  visits: 0, signups: 0, publishedMembers: 0, applicants: 0, helpers: 0, outingMembers: 0,
});

function normalizeRow(raw: unknown): ChannelLeadRow {
  const r = (raw ?? {}) as Record<string, unknown>;
  return {
    channel: String(r.channel ?? "inconnu"),
    campaign: typeof r.campaign === "string" && r.campaign ? r.campaign : null,
    isCampaign: r.is_campaign === true,
    visits: num(r.visits),
    signups: num(r.signups),
    publishedMembers: num(r.published_members),
    applicants: num(r.applicants),
    helpers: num(r.helpers),
    outingMembers: num(r.outing_members),
  };
}

/**
 * Canaux triés : ceux qui amènent des annonces, puis des inscrits, puis des
 * visites ; les quatre réseaux sociaux sont toujours présents. Campagnes du
 * canal triées de la même façon, « sans campagne » en dernier.
 */
export function buildChannelLeads(raw: unknown): ChannelLeads {
  const r = (raw ?? {}) as Record<string, unknown>;
  const rows = Array.isArray(r.rows) ? r.rows.map(normalizeRow) : [];
  const totals = new Map<string, ChannelLeadRow>();
  for (const row of rows.filter((x) => !x.isCampaign)) totals.set(row.channel, row);
  for (const c of SOCIAL_CHANNELS) if (!totals.has(c)) totals.set(c, emptyRow(c));
  const rank = (x: ChannelLeadRow) => [x.publishedMembers, x.signups, x.visits];
  const byRank = (a: ChannelLeadRow, b: ChannelLeadRow) => {
    const ra = rank(a), rb = rank(b);
    for (let i = 0; i < ra.length; i++) if (ra[i] !== rb[i]) return rb[i] - ra[i];
    return a.channel.localeCompare(b.channel);
  };
  // Lot TRF-3 : « Inconnu » (source non enregistrée) se lit en dernier.
  const byChannel = (a: ChannelLeadRow, b: ChannelLeadRow) =>
    a.channel === "inconnu" ? (b.channel === "inconnu" ? 0 : 1) : b.channel === "inconnu" ? -1 : byRank(a, b);
  const channels = [...totals.values()].sort(byChannel).map((t) => ({
    ...t,
    label: t.channel === "inconnu" ? "Source non enregistrée" : signupChannelLabel(t.channel),
    campaigns: rows
      .filter((x) => x.isCampaign && x.channel === t.channel)
      .sort((a, b) => (a.campaign === null ? 1 : b.campaign === null ? -1 : byRank(a, b))),
  }));
  return { sitsPublished: num(r.sits_published), channels };
}

export const campaignLabel = (campaign: string | null): string => campaign ?? "sans campagne";

/**
 * Lot TRF-3 : chemin d'arrivée sans le texte collé à la suite d'un lien
 * partagé (« …f5e13dPartagez »). Les chemins du site sont en minuscules.
 */
export function cleanLandingPath(path: string): string {
  const m = /^\/[a-z0-9\-/_.~%]*/.exec(path.split(/[?#]/)[0]);
  if (!m) return path;
  return m[0].length > 1 ? m[0].replace(/\/+$/, "") : m[0];
}
