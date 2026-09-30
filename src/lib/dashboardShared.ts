/**
 * Lectures partagées du tableau de bord (lot P1b).
 *
 * Plusieurs blocs (Alma, pastilles de navigation, action prioritaire,
 * profil propriétaire) lisent les mêmes listes du membre connecté : ses
 * annonces, ses coups de main, ses candidatures, ses écussons, sa fiche
 * d'urgence. Chaque liste est lue une seule fois, en version « index »
 * (colonnes légères), et partagée par le cache React Query. Chaque
 * lecteur dérive ensuite ce dont il a besoin.
 *
 * Hors application (tests sans client enregistré), chaque appel relit.
 */
import { supabase } from "@/integrations/supabase/client";
import { getAppQueryClient } from "@/lib/appQueryClient";

export const DASHBOARD_SHARED_STALE_MS = 60_000;

async function cached<T>(key: readonly unknown[], fn: () => Promise<T>): Promise<T> {
  const client = getAppQueryClient();
  if (!client) return fn();
  return client.fetchQuery({ queryKey: key, queryFn: fn, staleTime: DASHBOARD_SHARED_STALE_MS });
}

export type MySitIndexRow = { id: string; status: string; updated_at: string | null; created_at: string | null };

/** Annonces du membre, triées updated_at desc puis created_at desc. */
export function fetchMySitsIndex(userId: string): Promise<MySitIndexRow[]> {
  return cached(["my-sits-index", userId], async () => {
    const { data, error } = await supabase
      .from("sits")
      .select("id, status, updated_at, created_at")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as MySitIndexRow[];
  });
}

export type MyMissionIndexRow = {
  id: string; status: string; title?: string; category?: string; city?: string | null;
  date_needed?: string | null; created_at?: string; small_mission_responses?: Array<{ id: string; status: string }>;
};

/** Coups de main publiés par le membre (tous statuts, réponses incluses), plus récents d'abord. */
export function fetchMySmallMissionsIndex(userId: string): Promise<MyMissionIndexRow[]> {
  return cached(["my-small-missions-index", userId], async () => {
    const { data, error } = await supabase
      .from("small_missions")
      .select("id, title, category, city, date_needed, status, created_at, small_mission_responses(id, status)")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as MyMissionIndexRow[];
  });
}

export type MyApplicationIndexRow = { id: string; status: string };

/** Candidatures envoyées par le membre, colonnes légères. */
export function fetchMyApplicationsIndex(userId: string): Promise<MyApplicationIndexRow[]> {
  return cached(["my-applications-index", userId], async () => {
    const { data, error } = await supabase
      .from("applications")
      .select("id, status")
      .eq("sitter_id", userId);
    if (error) throw error;
    return (data ?? []) as MyApplicationIndexRow[];
  });
}

export type MyBadgeRow = { id: string; badge_id: string; created_at: string };

/** Écussons du membre, plus récents d'abord. */
export function fetchMyBadges(userId: string): Promise<MyBadgeRow[]> {
  return cached(["my-badges", userId], async () => {
    const { data, error } = await supabase
      .from("badge_attributions")
      .select("id, badge_id, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as MyBadgeRow[];
  });
}

/** Fiche gardien d'urgence du membre (identifiant seul), ou null. */
export function fetchMyEmergencyProfileId(userId: string): Promise<string | null> {
  return cached(["my-emergency-profile-id", userId], async () => {
    const { data, error } = await supabase
      .from("emergency_sitter_profiles")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw error;
    return ((data as { id?: string } | null)?.id as string | undefined) ?? null;
  });
}

/** Identifiant du membre connecté lu dans la session locale, sans réseau. */
export async function sessionUserId(): Promise<string | null> {
  try {
    const { data } = await supabase.auth.getSession();
    return data.session?.user?.id ?? null;
  } catch {
    return null;
  }
}

/** Logements du membre (toutes colonnes), plus anciens d'abord. */
export function fetchMyProperties(userId: string, opts?: { fresh?: boolean }): Promise<any[]> {
  const run = async () => {
    const { data, error } = await supabase
      .from("properties")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: true });
    if (error) throw error;
    return (data ?? []) as any[];
  };
  const client = getAppQueryClient();
  if (!client) return run();
  return client.fetchQuery({
    queryKey: ["my-properties", userId],
    queryFn: run,
    staleTime: opts?.fresh ? 0 : DASHBOARD_SHARED_STALE_MS,
  });
}

/** Invalide les logements partagés après une écriture. */
export function invalidateMyProperties(userId: string) {
  void getAppQueryClient()?.invalidateQueries({ queryKey: ["my-properties", userId] });
}

export type MyConversationIndexRow = { id: string; small_mission_id: string | null };

/** Conversations du membre (identifiants seuls). */
export function fetchMyConversationsIndex(userId: string): Promise<MyConversationIndexRow[]> {
  return cached(["my-conversations-index", userId], async () => {
    const { data, error } = await supabase
      .from("conversations")
      .select("id, small_mission_id")
      .or(`owner_id.eq.${userId},sitter_id.eq.${userId}`);
    if (error) throw error;
    return (data ?? []) as MyConversationIndexRow[];
  });
}
