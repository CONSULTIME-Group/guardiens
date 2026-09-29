/**
 * Lot A8 : compteurs de campagnes calculés depuis mass_email_sends.
 * recipients_count et sent_count de mass_emails ne comptaient que le statut
 * « sent », que les webhooks remplacent par delivered, opened, etc.
 */
export const MASS_SENT_STATUSES: ReadonlySet<string> = new Set(["sent", "delivered", "opened", "clicked", "bounced", "complained"]);
export const MASS_IGNORED_STATUSES: ReadonlySet<string> = new Set(["skipped", "suppressed"]);

export interface MassSendRow {
  mass_email_id: string;
  recipient_email: string | null;
  status: string | null;
  first_clicked_at?: string | null;
}

export interface CampaignCounts { recipients: number; sent: number; clickers: number }

/** Destinataires hors ignorés, envoyés, cliqueurs uniques (par destinataire, jamais anonymes). */
export function campaignCounts(rows: MassSendRow[]): CampaignCounts {
  const recipients = new Set<string>();
  const sent = new Set<string>();
  const clickers = new Set<string>();
  for (const r of rows) {
    const email = (r.recipient_email ?? "").trim().toLowerCase();
    const status = r.status ?? "";
    if (!email || MASS_IGNORED_STATUSES.has(status)) continue;
    recipients.add(email);
    if (MASS_SENT_STATUSES.has(status)) sent.add(email);
    if (r.first_clicked_at) clickers.add(email);
  }
  return { recipients: recipients.size, sent: sent.size, clickers: clickers.size };
}

/** Compteurs par campagne. */
export function countsByCampaign(rows: MassSendRow[]): Map<string, CampaignCounts> {
  const groups = new Map<string, MassSendRow[]>();
  for (const r of rows) {
    const g = groups.get(r.mass_email_id) ?? [];
    g.push(r);
    groups.set(r.mass_email_id, g);
  }
  const out = new Map<string, CampaignCounts>();
  for (const [id, g] of groups) out.set(id, campaignCounts(g));
  return out;
}

/** Taux de clic en pourcentage, plafonné à 100 (un cliqueur est un destinataire). */
export function clickRate(clickers: number, recipients: number): number {
  if (recipients <= 0) return 0;
  return Math.min(100, (clickers / recipients) * 100);
}
