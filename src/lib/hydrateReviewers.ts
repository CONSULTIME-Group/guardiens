import { supabase } from "@/integrations/supabase/client";

/**
 * Hydrate une liste d'avis avec les infos publiques du reviewer (et optionnellement reviewee).
 * Nécessaire car la table `profiles` est protégée par RLS (chaque user ne voit que son propre profil).
 * On utilise donc la vue `public_profiles` qui expose les champs publics à tous.
 */
export async function hydrateReviewers<T extends { reviewer_id?: string | null; reviewee_id?: string | null }>(
  reviews: T[],
  options: { includeReviewee?: boolean } = {}
): Promise<(T & { reviewer: { first_name: string | null; avatar_url: string | null } | null; reviewee?: { first_name: string | null; avatar_url: string | null } | null })[]> {
  if (!reviews || reviews.length === 0) return [] as any;

  const ids = new Set<string>();
  reviews.forEach((r) => {
    if (r.reviewer_id) ids.add(r.reviewer_id);
    if (options.includeReviewee && r.reviewee_id) ids.add(r.reviewee_id);
  });

  if (ids.size === 0) return reviews.map((r) => ({ ...r, reviewer: null, reviewee: null })) as any;

  const { data: profs } = await supabase
    .from("public_profiles" as any)
    .select("id, first_name, avatar_url")
    .in("id", Array.from(ids));

  const map: Record<string, { first_name: string | null; avatar_url: string | null }> = {};
  (profs as any[] | null)?.forEach((p: any) => {
    map[p.id] = { first_name: p.first_name, avatar_url: p.avatar_url };
  });

  return reviews.map((r: any) => ({
    ...r,
    reviewer: r.reviewer_id ? map[r.reviewer_id] || null : null,
    reviewee: options.includeReviewee && r.reviewee_id ? map[r.reviewee_id] || null : null,
  })) as any;
}
