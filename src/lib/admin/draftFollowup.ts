import { fetchAllRows } from "@/lib/admin/fetchAllRows";

export interface DraftFollowup {
  ownerHasPublished: boolean;
  productEmailsAllowed: boolean | null;
  lastReminder: { status: string; created_at: string; delivered_at?: string | null; first_clicked_at?: string | null; bounced_at?: string | null } | null;
}

/** Lecture groupée, aucun email ni contenu privé ajouté au tableau. */
export async function loadDraftFollowups(client: any, drafts: Array<{ id: string; user_id: string }>): Promise<Map<string, DraftFollowup>> {
  const result = new Map<string, DraftFollowup>();
  if (!drafts.length) return result;
  if (drafts.length > 100) {
    for (let offset = 0; offset < drafts.length; offset += 100) {
      for (const [id, row] of await loadDraftFollowups(client, drafts.slice(offset, offset + 100))) result.set(id, row);
    }
    return result;
  }
  const owners = [...new Set(drafts.map(d => d.user_id))];
  const ids = drafts.map(d => d.id);
  const keys = ids.map(id => `sit-draft-reminder-${id}`);
  const [published, prefs, logs] = await Promise.all([
    fetchAllRows<any>((from, to) => client.from("sits").select("id, user_id").in("user_id", owners).not("published_at", "is", null).order("id").range(from, to)),
    client.rpc("admin_draft_email_preferences", { p_owner_ids: owners }),
    fetchAllRows<any>((from, to) => client.from("email_send_log")
      .select("id, status, created_at, delivered_at, first_clicked_at, bounced_at, metadata")
      .eq("template_name", "sit-draft-reminder")
      .or(`metadata->>sit_id.in.(${ids.join(",")}),metadata->>idempotency_key.in.(${keys.join(",")})`)
      .order("created_at", { ascending: false }).order("id").range(from, to)),
  ]);
  if (prefs.error) throw prefs.error;
  if (published.truncated || logs.truncated) throw new Error("draft_followup_incomplete");
  const publishedOwners = new Set(published.rows.map(r => r.user_id));
  const preferences = new Map<string, boolean>((prefs.data ?? []).map((r: any) => [r.user_id, r.product_emails]));
  for (const d of drafts) result.set(d.id, {
    ownerHasPublished: publishedOwners.has(d.user_id),
    productEmailsAllowed: preferences.get(d.user_id) ?? null,
    lastReminder: logs.rows.find(r => r.metadata?.sit_id === d.id || r.metadata?.idempotency_key === `sit-draft-reminder-${d.id}`) ?? null,
  });
  return result;
}

export function draftReminderLabel(log: DraftFollowup["lastReminder"]): string {
  if (!log) return "Aucune relance de brouillon enregistrée";
  if (log.bounced_at) return "Relance non remise";
  if (log.first_clicked_at) return "Relance : clic enregistré";
  if (log.delivered_at) return "Relance remise";
  const labels: Record<string, string> = { sent: "Relance envoyée", pending: "Relance en attente", deferred: "Relance différée", abandoned: "Relance annulée", failed: "Échec de la relance" };
  return labels[log.status] ?? "Relance : statut à vérifier";
}
