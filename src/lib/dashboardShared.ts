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
/**
 * Logements et animaux : écrits depuis plusieurs écrans. Fenêtre courte,
 * juste assez pour dédoublonner le chargement d'une page.
 */
export const HOME_SHARED_STALE_MS = 10_000;

async function cached<T>(key: readonly unknown[], fn: () => Promise<T>): Promise<T> {
  const client = getAppQueryClient();
  if (!client) return fn();
  return client.fetchQuery({ queryKey: key, queryFn: fn, staleTime: DASHBOARD_SHARED_STALE_MS });
}

export type MySitIndexRow = { id: string; status: string; start_date: string | null; updated_at: string | null; created_at: string | null };

/**
 * Lot P3 : annonces complètes du membre (avec candidatures), lues une seule
 * fois. Le tableau de bord propriétaire les affiche, l'index en dérive.
 * `fresh` force une relecture (bouton Réessayer, retour sur l'onglet).
 */
export function fetchMySitsFull(userId: string, opts?: { fresh?: boolean }): Promise<any[]> {
  const key = ["my-sits-full", userId] as const;
  if (opts?.fresh) getAppQueryClient()?.removeQueries({ queryKey: key, exact: true });
  return cached(key, async () => {
    const { data, error } = await supabase
      .from("sits")
      .select("*, applications(id, status, sitter_id)")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as any[];
  });
}

const ts = (v: string | null | undefined) => (v ? Date.parse(v) || 0 : 0);

/** Annonces du membre, triées updated_at desc puis created_at desc. */
export async function fetchMySitsIndex(userId: string): Promise<MySitIndexRow[]> {
  const rows = await fetchMySitsFull(userId);
  return rows
    .map((r) => ({ id: r.id, status: r.status, start_date: r.start_date ?? null, updated_at: r.updated_at ?? null, created_at: r.created_at ?? null }))
    .sort((a, b) => {
      const ua = a.updated_at ? ts(a.updated_at) : -Infinity;
      const ub = b.updated_at ? ts(b.updated_at) : -Infinity;
      if (ub !== ua) return ub - ua;
      return ts(b.created_at) - ts(a.created_at);
    });
}

export type MyMissionIndexRow = {
  id: string; status: string; title?: string; category?: string; city?: string | null;
  date_needed?: string | null; created_at?: string; updated_at?: string | null;
  close_reason?: string | null; user_id?: string; small_mission_responses?: Array<{ id: string; status: string }>;
};

/** Coups de main publiés par le membre (tous statuts, réponses incluses), plus récents d'abord. */
export function fetchMySmallMissionsIndex(userId: string): Promise<MyMissionIndexRow[]> {
  return cached(["my-small-missions-index", userId], async () => {
    const { data, error } = await supabase
      .from("small_missions")
      .select("id, title, category, city, date_needed, status, created_at, updated_at, close_reason, user_id, small_mission_responses(id, status)")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as MyMissionIndexRow[];
  });
}

export type MyApplicationIndexRow = { id: string; status: string; [k: string]: any };

/** Candidatures envoyées par le membre, annonce jointe, plus récentes d'abord. */
export function fetchMyApplicationsIndex(userId: string): Promise<MyApplicationIndexRow[]> {
  return cached(["my-applications-index", userId], async () => {
    const { data, error } = await supabase
      .from("applications")
      .select("*, sit:sits(id, title, city, start_date, end_date, status, user_id, property_id, properties:property_id(photos))")
      .eq("sitter_id", userId)
      .order("created_at", { ascending: false });
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
    staleTime: opts?.fresh ? 0 : HOME_SHARED_STALE_MS,
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

export const OPEN_PUBLISHED_SITS_LIMIT = 500;
const OPEN_PUBLISHED_SITS_SELECT =
  "id, title, city, start_date, end_date, user_id, property_id, status, created_at, is_urgent, cover_photo_url, accepts_sitter_pets, accepts_sitter_children, departement_code, environments, accepting_applications, properties:property_id(photos, type, environment, cover_photo_url)";

/**
 * Annonces publiées non terminées des autres membres, plus récentes d'abord
 * (lot P1b). Partagée par « Annonces autour » et le classement « Pour vous »
 * du gardien : une seule lecture au lieu de trois (liste, compte, vivier).
 * Aucun filtre ajouté : chaque lecteur applique ses propres conditions.
 */
export function fetchOpenPublishedSits(userId: string): Promise<{ rows: any[]; error: unknown }> {
  const todayIso = new Date().toISOString().slice(0, 10);
  return cached(["open-published-sits", userId, todayIso], async () => {
    const { data, error } = await supabase
      .from("sits")
      .select(OPEN_PUBLISHED_SITS_SELECT)
      .eq("status", "published")
      .neq("user_id", userId)
      .gte("end_date", todayIso)
      .order("created_at", { ascending: false })
      .limit(OPEN_PUBLISHED_SITS_LIMIT);
    // Les erreurs restent portées par la valeur (jamais de rejet en cache).
    return { rows: (data ?? []) as any[], error: error ?? null };
  });
}

/** Animaux de tous les logements du membre (toutes colonnes). */
export function fetchMyPets(userId: string, opts?: { fresh?: boolean }): Promise<any[]> {
  const run = async () => {
    // Logements : la copie partagée suffit (fraîche de moins de 10 s).
    const props = await fetchMyProperties(userId);
    const ids = props.map((p) => p.id).filter(Boolean);
    if (ids.length === 0) return [];
    const { data, error } = await supabase.from("pets").select("*").in("property_id", ids);
    if (error) throw error;
    return (data ?? []) as any[];
  };
  const client = getAppQueryClient();
  if (!client) return run();
  return client.fetchQuery({
    queryKey: ["my-pets", userId],
    queryFn: run,
    staleTime: opts?.fresh ? 0 : HOME_SHARED_STALE_MS,
  });
}

export function invalidateMyPets(userId: string) {
  void getAppQueryClient()?.invalidateQueries({ queryKey: ["my-pets", userId] });
}

/**
 * Candidatures reçues sur les annonces du membre, plus récentes d'abord,
 * avec les politiques accompagnants de l'annonce (contexte d'affinité).
 */
export function fetchApplicationsOnMySits(userId: string): Promise<any[]> {
  return cached(["applications-on-my-sits", userId], async () => {
    const sits = await fetchMySitsIndex(userId);
    const ids = sits.map((s) => s.id);
    if (ids.length === 0) return [];
    const { data, error } = await supabase
      .from("applications")
      .select("*, sit:sits(title, start_date, end_date, accepts_sitter_pets, accepts_sitter_children)")
      .in("sit_id", ids)
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) throw error;
    return (data ?? []) as any[];
  });
}

/** 20 derniers coups de main ouverts, tous membres (lot P1b). */
export function fetchOpenSmallMissions(): Promise<{ rows: any[]; error: unknown }> {
  return cached(["open-small-missions"], async () => {
    const { data, error } = await supabase
      .from("small_missions")
      .select("id, title, category, city, postal_code, date_needed, status, created_at, user_id")
      .eq("status", "open")
      .order("created_at", { ascending: false })
      .limit(20);
    return { rows: (data ?? []) as any[], error: error ?? null };
  });
}
