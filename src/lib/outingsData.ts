/**
 * Lot SORT1 : lectures et écritures des sorties. Les tables du lot sont
 * absentes des types générés tant que la migration 0145 n'est pas en base,
 * d'où le client non typé de ce seul fichier.
 */
import { supabase } from "@/integrations/supabase/client";
import type { OutingSource, PublicOuting } from "@/lib/outings";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

const LIST_LIMIT = 60;

function normalize(row: Record<string, unknown>): PublicOuting {
  return {
    ...(row as unknown as PublicOuting),
    capacity: Number(row.capacity),
    reserved: Number(row.reserved),
    taken: Number(row.taken),
    participation_eur: row.participation_eur === null || row.participation_eur === undefined ? null : Number(row.participation_eur),
    organizer_identity_verified: row.organizer_identity_verified === true,
  };
}

/** Sorties ouvertes à venir, la plus proche dans le temps d'abord. */
export async function fetchUpcomingOutings(): Promise<{ data: PublicOuting[]; error: string | null }> {
  const { data, error } = await db
    .from("public_outings")
    .select("*")
    .eq("status", "open")
    .gt("starts_at", new Date().toISOString())
    .order("starts_at", { ascending: true })
    .limit(LIST_LIMIT);
  if (error) return { data: [], error: error.message };
  return { data: ((data ?? []) as Record<string, unknown>[]).map(normalize), error: null };
}

export async function fetchOutingBySlug(slug: string): Promise<{ data: PublicOuting | null; error: string | null }> {
  const { data, error } = await db.from("public_outings").select("*").eq("slug", slug).maybeSingle();
  if (error) return { data: null, error: error.message };
  return { data: data ? normalize(data as Record<string, unknown>) : null, error: null };
}

export type MyOutingStatus = "going" | "left" | "removed" | null;

export async function fetchMyOutingStatus(outingId: string): Promise<MyOutingStatus> {
  const { data, error } = await db.rpc("outing_my_status", { p_outing: outingId });
  if (error) return null;
  return data === "going" || data === "left" || data === "removed" ? data : null;
}

export interface OutingAttendee {
  user_id: string;
  first_name: string | null;
  member_since: string | null;
  identity_verified: boolean;
  joined_at: string;
}

export async function fetchOutingAttendees(outingId: string): Promise<{ data: OutingAttendee[]; error: string | null }> {
  const { data, error } = await db.rpc("outing_attendee_list", { p_outing: outingId });
  if (error) return { data: [], error: error.message };
  return { data: (data ?? []) as OutingAttendee[], error: null };
}

export interface OutingActionResult {
  ok: boolean;
  reason?: string;
  already?: boolean;
  left?: number;
}

async function action(name: string, args: Record<string, unknown>): Promise<OutingActionResult> {
  const { data, error } = await db.rpc(name, args);
  if (error) return { ok: false, reason: "error" };
  return (data ?? { ok: false, reason: "error" }) as OutingActionResult;
}

export const joinOuting = (outingId: string, source: OutingSource) => action("outing_join", { p_outing: outingId, p_source: source });
export const leaveOuting = (outingId: string) => action("outing_leave", { p_outing: outingId });
export const removeOutingAttendee = (outingId: string, userId: string) => action("outing_remove_attendee", { p_outing: outingId, p_user: userId });
export const cancelOuting = (outingId: string, note: string) => action("outing_cancel", { p_outing: outingId, p_note: note });

export async function updateOuting(outingId: string, row: Record<string, unknown>): Promise<{ ok: boolean; error: string | null }> {
  const { data, error } = await db.from("outings").update(row).eq("id", outingId).select("id");
  if (error) return { ok: false, error: error.message };
  return { ok: Array.isArray(data) && data.length === 1, error: null };
}

export async function createOuting(row: Record<string, unknown>): Promise<{ slug: string | null; error: string | null; hint: string | null }> {
  const { data, error } = await db.from("outings").insert(row).select("slug").single();
  if (error) return { slug: null, error: error.message, hint: error.hint ?? null };
  return { slug: (data as { slug: string }).slug, error: null, hint: null };
}

// ── Lot SORT4 : alerte « nouvelle sortie » ──
export type OutingAlertRadius = "quartier" | "5" | "15";
export interface OutingAlertPreference { enabled: boolean; radius: OutingAlertRadius }

export async function fetchMyOutingAlertPreference(): Promise<OutingAlertPreference | null> {
  const { data, error } = await db.rpc("my_outing_alert_preference");
  if (error || !data) return null;
  const radius = data.radius === "quartier" || data.radius === "5" ? data.radius : "15";
  return { enabled: data.enabled !== false, radius };
}

export async function saveMyOutingAlertPreference(pref: OutingAlertPreference): Promise<boolean> {
  const { data, error } = await db.rpc("set_my_outing_alert_preference", { p_enabled: pref.enabled, p_radius: pref.radius });
  return !error && data?.ok === true;
}

/** Arrêt ou reprise par le lien de l'email, sans connexion. */
export async function setOutingAlertsByToken(token: string, enabled: boolean): Promise<boolean> {
  const { data, error } = await db.rpc("outing_alerts_set_by_token", { p_token: token, p_enabled: enabled });
  return !error && data?.ok === true;
}
