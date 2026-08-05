import { supabase } from "@/integrations/supabase/client";
import { DELETED_MEMBER_NAME } from "@/lib/memberUtils";

type MemberDisplay = {
  first_name: string | null;
  avatar_url: string | null;
  is_deleted?: boolean;
};

/**
 * Hydrate une liste d'avis avec les infos publiques du reviewer (et optionnellement reviewee).
 * Nécessaire car la table `profiles` est protégée par RLS (chaque user ne voit que son propre profil).
 * On utilise donc la vue `public_profiles` qui expose les champs publics à tous.
 *
 * Les comptes effacés sont anonymisés, pas détruits : ils sortent de
 * `public_profiles`, mais leurs avis restent visibles. La fonction
 * `get_member_display` fournit alors le nom neutre "Membre supprimé".
 */
export async function hydrateReviewers<T extends { reviewer_id?: string | null; reviewee_id?: string | null }>(
  reviews: T[],
  options: { includeReviewee?: boolean } = {}
): Promise<(T & { reviewer: (MemberDisplay | null); reviewee?: (MemberDisplay | null) })[]> {
  if (!reviews || reviews.length === 0) return [] as any;

  const ids = new Set<string>();
  reviews.forEach((r) => {
    if (r.reviewer_id) ids.add(r.reviewer_id);
    if (options.includeReviewee && r.reviewee_id) ids.add(r.reviewee_id);
  });

  if (ids.size === 0) return reviews.map((r) => ({ ...r, reviewer: null, reviewee: null })) as any;

  const idList = Array.from(ids);

  const { data: profs } = await supabase
    .from("public_profiles" as any)
    .select("id, first_name, avatar_url")
    .in("id", idList);

  const map: Record<string, MemberDisplay> = {};
  (profs as any[] | null)?.forEach((p: any) => {
    map[p.id] = { first_name: p.first_name, avatar_url: p.avatar_url, is_deleted: false };
  });

  // Identifiants absents de la vue publique : comptes anonymisés ou masqués.
  const missing = idList.filter((id) => !map[id]);
  if (missing.length > 0) {
    const { data: fallback } = await supabase.rpc("get_member_display" as any, {
      _ids: missing,
    });
    (fallback as any[] | null)?.forEach((p: any) => {
      map[p.id] = {
        first_name: p.is_deleted ? DELETED_MEMBER_NAME : p.first_name,
        avatar_url: p.is_deleted ? null : p.avatar_url,
        is_deleted: Boolean(p.is_deleted),
      };
    });
  }

  return reviews.map((r: any) => ({
    ...r,
    reviewer: r.reviewer_id ? map[r.reviewer_id] || null : null,
    reviewee: options.includeReviewee && r.reviewee_id ? map[r.reviewee_id] || null : null,
  })) as any;
}

