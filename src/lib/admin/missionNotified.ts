// Audit du 10/10/2026 : « Notifiés » réunit les deux sources d'envoi réussi
// réellement lisibles par l'admin, dédupliquées par publication et destinataire.
//  - mission_notification_queue, status = sent (vagues automatiques)
//  - mass_email_sends des campagnes mass_emails.segment = proximity, statut
//    d'envoi réussi seulement (jamais queued, pending, failed).
import { supabase } from "@/integrations/supabase/client";
import { fetchAllRows } from "@/lib/admin/fetchAllRows";

export const PROXIMITY_SUCCESS_STATUSES = ["sent", "delivered", "opened", "clicked"] as const;

export const NOTIFIED_SCOPE =
  "Envois réussis des vagues automatiques et des campagnes de proximité, une personne comptée une fois par publication. Les envois en attente ou en échec ne sont pas comptés.";

export interface QueueRow { mission_id: string; helper_id: string | null }
export interface ProximityRow { mission_id: string; email: string | null }

const norm = (e: string | null | undefined) => (e ?? "").trim().toLowerCase();

/** Pur : compte par publication les destinataires distincts. */
export function reconcileNotified(
  queue: QueueRow[],
  helperEmails: Record<string, string | null | undefined>,
  proximity: ProximityRow[],
): Record<string, number> {
  const seen = new Map<string, Set<string>>();
  const add = (mission: string, key: string) => {
    if (!mission || !key) return;
    let s = seen.get(mission);
    if (!s) seen.set(mission, (s = new Set()));
    s.add(key);
  };
  for (const q of queue) {
    if (!q.helper_id) continue;
    const email = norm(helperEmails[q.helper_id]);
    add(q.mission_id, email ? `e:${email}` : `u:${q.helper_id}`);
  }
  for (const p of proximity) {
    const email = norm(p.email);
    if (email) add(p.mission_id, `e:${email}`);
  }
  const out: Record<string, number> = {};
  seen.forEach((s, k) => { out[k] = s.size; });
  return out;
}

const CHUNK = 100;

export async function loadNotifiedCounts(): Promise<Record<string, number>> {
  const queueRes = await fetchAllRows<QueueRow>((from, to) =>
    supabase.from("mission_notification_queue").select("mission_id, helper_id").eq("status", "sent")
      .order("id", { ascending: true }).range(from, to) as any,
  );
  const campaignsRes = await fetchAllRows<{ id: string; filters: any }>((from, to) =>
    supabase.from("mass_emails").select("id, filters").eq("segment", "proximity")
      .order("created_at", { ascending: true }).order("id", { ascending: true }).range(from, to) as any,
  );
  const missionByCampaign = new Map<string, string>();
  for (const c of campaignsRes.rows) {
    const mid = c.filters?.mission_id;
    if (typeof mid === "string" && mid) missionByCampaign.set(c.id, mid);
  }
  const campaignIds = [...missionByCampaign.keys()];
  const proximity: ProximityRow[] = [];
  for (let i = 0; i < campaignIds.length; i += CHUNK) {
    const chunk = campaignIds.slice(i, i + CHUNK);
    const res = await fetchAllRows<{ mass_email_id: string; recipient_email: string | null }>((from, to) =>
      supabase.from("mass_email_sends").select("mass_email_id, recipient_email")
        .in("mass_email_id", chunk).in("status", PROXIMITY_SUCCESS_STATUSES as unknown as string[])
        .order("id", { ascending: true }).range(from, to) as any,
    );
    for (const r of res.rows) proximity.push({ mission_id: missionByCampaign.get(r.mass_email_id)!, email: r.recipient_email });
  }
  const helperIds = [...new Set(queueRes.rows.map((q) => q.helper_id).filter(Boolean) as string[])];
  const helperEmails: Record<string, string | null> = {};
  if (proximity.length > 0) {
    for (let i = 0; i < helperIds.length; i += CHUNK) {
      const { data, error } = await supabase.from("profiles").select("id, email").in("id", helperIds.slice(i, i + CHUNK));
      if (error) throw error;
      for (const p of (data ?? []) as Array<{ id: string; email: string | null }>) helperEmails[p.id] = p.email;
    }
  }
  return reconcileNotified(queueRes.rows, helperEmails, proximity);
}
