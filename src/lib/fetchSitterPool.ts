/**
 * Lecture COMPLÈTE du vivier de gardiens (public_profiles, role sitter/both).
 *
 * Lot D0 (27/09/2026) : un `.limit(2000)` ne suffit pas, le serveur plafonne
 * chaque réponse à 1 000 lignes. Les compteurs construits sur la longueur de
 * la liste plafonnaient donc à 1 000 (« Voir les 1000 gardiens » pour 1 326
 * profils), et les comptes de proximité ne voyaient qu'une partie du vivier.
 * Lecture paginée par pages de 1 000, triée par id (ordre stable), plus un
 * comptage exact (count exact, head true) avec les mêmes filtres.
 */
import { supabase } from "@/integrations/supabase/client";

export const SITTER_POOL_PAGE = 1000;
/** Borne de sécurité : 20 pages, soit 20 000 profils. Tracée si atteinte. */
const MAX_PAGES = 20;

export async function fetchSitterPool<T = any>(select: string, excludeUserId: string): Promise<T[]> {
  const rows: T[] = [];
  for (let page = 0; page < MAX_PAGES; page++) {
    const from = page * SITTER_POOL_PAGE;
    const { data, error } = await supabase
      .from("public_profiles")
      .select(select)
      .in("role", ["sitter", "both"])
      .neq("id", excludeUserId)
      .order("id", { ascending: true })
      .range(from, from + SITTER_POOL_PAGE - 1);
    if (error) throw error;
    const batch = (data ?? []) as T[];
    rows.push(...batch);
    if (batch.length < SITTER_POOL_PAGE) return rows;
  }
  console.warn(`[sitter-pool] ${MAX_PAGES} pages lues, vivier tronqué.`);
  return rows;
}

/** Taille exacte du vivier, mêmes filtres que fetchSitterPool. */
export async function countSitterPool(excludeUserId: string): Promise<number> {
  const { count, error } = await supabase
    .from("public_profiles")
    .select("id", { count: "exact", head: true })
    .in("role", ["sitter", "both"])
    .neq("id", excludeUserId);
  if (error) throw error;
  return count ?? 0;
}

/**
 * Lot P1b : vivier complet partagé par les blocs du tableau de bord
 * propriétaire (« Pour vous » et « Près de chez vous »). Une seule lecture
 * paginée, colonnes réunies, et le compte exact porté par la première page.
 * Aucun filtre ajouté : mêmes conditions que fetchSitterPool.
 */
export const SITTER_POOL_SHARED_SELECT =
  "id, first_name, avatar_url, city, latitude_approx, longitude_approx, identity_verified, profile_completion, role, completed_sits_count, skill_categories, custom_skills";

async function readSitterPoolWithCount(excludeUserId: string): Promise<{ rows: any[]; count: number }> {
  const rows: any[] = [];
  let count = 0;
  for (let page = 0; page < MAX_PAGES; page++) {
    const from = page * SITTER_POOL_PAGE;
    const { data, error, count: c } = await supabase
      .from("public_profiles")
      .select(SITTER_POOL_SHARED_SELECT, page === 0 ? { count: "exact" } : undefined)
      .in("role", ["sitter", "both"])
      .neq("id", excludeUserId)
      .order("id", { ascending: true })
      .range(from, from + SITTER_POOL_PAGE - 1);
    if (error) throw error;
    if (page === 0) count = c ?? 0;
    const batch = (data ?? []) as any[];
    rows.push(...batch);
    if (batch.length < SITTER_POOL_PAGE) return { rows, count: Math.max(count, rows.length) };
  }
  console.warn(`[sitter-pool] ${MAX_PAGES} pages lues, vivier tronqué.`);
  return { rows, count: Math.max(count, rows.length) };
}

export async function fetchSitterPoolShared(excludeUserId: string): Promise<{ rows: any[]; count: number }> {
  const { getAppQueryClient } = await import("@/lib/appQueryClient");
  const client = getAppQueryClient();
  if (!client) return readSitterPoolWithCount(excludeUserId);
  return client.fetchQuery({
    queryKey: ["sitter-pool-shared", excludeUserId],
    queryFn: () => readSitterPoolWithCount(excludeUserId),
    staleTime: 5 * 60 * 1000,
  });
}
