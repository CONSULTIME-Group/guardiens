/**
 * Lot SRC1 : lecture « Inscriptions par canal » de /admin/traffic.
 * Règles pures : libellés, période, total.
 */
export interface SignupSourceRow {
  channel: string;
  signups: number;
  owners: number;
  sitters: number;
  boths: number;
  google_accounts: number;
  email_accounts: number;
  members_with_published_sit: number;
  published_sits: number;
}

export const SIGNUP_CHANNEL_LABELS: Record<string, string> = {
  google_ads: "Google Ads",
  facebook_ads: "Publicité Facebook",
  email: "Email",
  parrainage: "Parrainage",
  facebook: "Facebook et Instagram",
  recherche_naturelle: "Recherche naturelle",
  ia: "Assistants IA",
  autre_site: "Autre site",
  direct: "Accès direct",
  inconnu: "Inconnu",
};

export const signupChannelLabel = (channel: string): string => SIGNUP_CHANNEL_LABELS[channel] ?? channel;

export const SIGNUP_SOURCE_PERIODS = [7, 30, 90] as const;
export type SignupSourcePeriod = (typeof SIGNUP_SOURCE_PERIODS)[number];

const parisDay = (d: Date): string =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit" }).format(d);

/** Jours de Paris, bornes comprises : aujourd'hui et les (N - 1) jours d'avant. */
export function signupSourceRange(days: SignupSourcePeriod, now = new Date()): { from: string; to: string } {
  const start = new Date(now.getTime() - (days - 1) * 86_400_000);
  return { from: parisDay(start), to: parisDay(now) };
}

const num = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

export function normalizeSignupSourceRows(raw: unknown): SignupSourceRow[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((r) => {
    const row = (r ?? {}) as Record<string, unknown>;
    return {
      channel: String(row.channel ?? "inconnu"),
      signups: num(row.signups),
      owners: num(row.owners),
      sitters: num(row.sitters),
      boths: num(row.boths),
      google_accounts: num(row.google_accounts),
      email_accounts: num(row.email_accounts),
      members_with_published_sit: num(row.members_with_published_sit),
      published_sits: num(row.published_sits),
    };
  });
}

export function totalSignupSources(rows: SignupSourceRow[]): SignupSourceRow {
  return rows.reduce<SignupSourceRow>((t, r) => ({
    channel: "total",
    signups: t.signups + r.signups,
    owners: t.owners + r.owners,
    sitters: t.sitters + r.sitters,
    boths: t.boths + r.boths,
    google_accounts: t.google_accounts + r.google_accounts,
    email_accounts: t.email_accounts + r.email_accounts,
    members_with_published_sit: t.members_with_published_sit + r.members_with_published_sit,
    published_sits: t.published_sits + r.published_sits,
  }), { channel: "total", signups: 0, owners: 0, sitters: 0, boths: 0, google_accounts: 0, email_accounts: 0, members_with_published_sit: 0, published_sits: 0 });
}
