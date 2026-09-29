// Garde-fou de pression des campagnes propriétaires (lot N4b).
// Un propriétaire qui a reçu 3 emails ou plus sur 7 jours est exclu de l'envoi
// du jour, pas définitivement : il redevient éligible au prochain envoi.
// Les emails transactionnels (compte, messages, candidatures, alertes admin)
// ne comptent pas.

// deno-lint-ignore no-explicit-any
type Client = any;
const IN_CHUNK = 150;
const PAGE = 1000;

export const OWNER_CAMPAIGN_MAX_RECENT_EMAILS = 3;
export const OWNER_CAMPAIGN_PRESSURE_DAYS = 7;

export const PRESSURE_IGNORED_TEMPLATES: ReadonlySet<string> = new Set([
  "signup", "recovery", "system", "magiclink", "magic-link", "magic_link", "invite", "email_change", "reauthentication",
  "new-message", "unread-messages-reminder", "new-application",
  "content-quality-digest", "analysis-requests-digest",
]);

/** Transactionnel : liste ci-dessus, ou tout gabarit d'alerte admin (préfixe admin-). */
export function isPressureIgnored(template: string | null | undefined): boolean {
  const t = (template ?? "").trim().toLowerCase();
  return PRESSURE_IGNORED_TEMPLATES.has(t) || t.startsWith("admin-") || t.startsWith("admin_");
}

export interface SendLogLite { recipient_email: string | null; template_name: string | null; status: string | null; message_id?: string | null }

/** Compte par lower(email), statut sent ou bounced, transactionnels exclus, un message compté une fois. */
export function countRecentEmails(rows: SendLogLite[]): Map<string, number> {
  const seen = new Map<string, Set<string>>();
  const out = new Map<string, number>();
  rows.forEach((r, i) => {
    const email = (r.recipient_email ?? "").trim().toLowerCase();
    if (!email || (r.status !== "sent" && r.status !== "bounced") || isPressureIgnored(r.template_name)) return;
    const key = r.message_id || `row-${i}`;
    const set = seen.get(email) ?? new Set<string>();
    if (set.has(key)) return;
    set.add(key);
    seen.set(email, set);
    out.set(email, (out.get(email) ?? 0) + 1);
  });
  return out;
}

export const isUnderPressure = (counts: Map<string, number>, email: string | null | undefined) =>
  (counts.get((email ?? "").trim().toLowerCase()) ?? 0) >= OWNER_CAMPAIGN_MAX_RECENT_EMAILS;

/** Filtre pur : renvoie les lignes gardées et le nombre d'exclus. */
export function splitByPressure<T extends { email?: string | null }>(rows: T[], counts: Map<string, number>): { rows: T[]; pressureExcluded: number } {
  const kept = rows.filter((r) => !isUnderPressure(counts, r.email));
  return { rows: kept, pressureExcluded: rows.length - kept.length };
}

/** Lecture par paquets de email_send_log (lecture seule). */
export async function loadRecentEmailCounts(client: Client, emails: string[], days = OWNER_CAMPAIGN_PRESSURE_DAYS): Promise<Map<string, number>> {
  const since = new Date(Date.now() - days * 86400000).toISOString();
  const list = [...new Set(emails.map((e) => (e ?? "").trim().toLowerCase()).filter(Boolean))];
  const rows: SendLogLite[] = [];
  for (let i = 0; i < list.length; i += IN_CHUNK) {
    const chunk = list.slice(i, i + IN_CHUNK);
    for (let from = 0; ; from += PAGE) {
      const { data, error } = await client.from("email_send_log")
        .select("recipient_email, template_name, status, message_id")
        .in("recipient_email", chunk).in("status", ["sent", "bounced"]).gte("created_at", since)
        .order("created_at", { ascending: true }).order("id", { ascending: true })
        .range(from, from + PAGE - 1);
      if (error) throw new Error(`email_send_log lookup failed: ${error.message}`);
      rows.push(...((data ?? []) as SendLogLite[]));
      if (!data || data.length < PAGE) break;
    }
  }
  return countRecentEmails(rows);
}
