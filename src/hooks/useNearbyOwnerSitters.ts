import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { haversineDistance } from "@/utils/geo";

/**
 * « Gardiens près de chez vous » pour le dashboard propriétaire.
 *
 * Jumeau symétrique de `useNearbyHelpers` mais ciblant les gardiens (role ∈
 * {sitter, both}, profil minimalement actif). Tri par distance croissante,
 * fallback progressif 30 → 50 → 100 km, puis flag `is_beyond` si aucun
 * gardien dans 100 km — pour pouvoir afficher quand même les plus proches
 * disponibles, comme côté annonces.
 *
 * On retourne les `custom_skills` (savoir-faire secondaires) pour permettre
 * au composant d'afficher 1–2 chips qualitatifs différenciants.
 */

export type NearbyOwnerSitter = {
  id: string;
  first_name: string | null;
  avatar_url: string | null;
  city: string | null;
  identity_verified: boolean;
  completed_sits_count: number;
  skill_categories: string[];
  custom_skills: string[];
  distance_km: number | null;
  is_beyond: boolean;
  avg_rating: number | null;
};

const RADIUS_STEPS = [30, 50, 100];
const MAX_RESULTS = 6;

function normalizeCustom(raw: unknown): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw
      .map((item) => {
        if (typeof item === "string") return item.trim();
        if (item && typeof item === "object") {
          const obj = item as { status?: string; label?: string };
          const status = typeof obj.status === "string" ? obj.status : "approved";
          const label = typeof obj.label === "string" ? obj.label : "";
          return status === "approved" ? label.trim() : "";
        }
        return "";
      })
      .filter((s) => s.length > 0);
  }
  return [];
}

export function useNearbyOwnerSitters(currentUserId: string | undefined) {
  return useQuery<{ sitters: NearbyOwnerSitter[]; radiusUsed: number | null; hasGeo: boolean; totalCount: number }>({
    queryKey: ["nearby-owner-sitters", currentUserId],
    enabled: !!currentUserId,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      // 1. Coordonnées propriétaire (profiles puis fallback public_profiles)
      const { data: meRaw } = await supabase
        .from("profiles")
        .select("latitude, longitude")
        .eq("id", currentUserId!)
        .maybeSingle();
      let meLat: number | null = (meRaw?.latitude as number | null) ?? null;
      let meLng: number | null = (meRaw?.longitude as number | null) ?? null;
      if (meLat === null || meLng === null) {
        const { data: approx } = await supabase
          .from("public_profiles")
          .select("latitude_approx, longitude_approx")
          .eq("id", currentUserId!)
          .maybeSingle();
        if (approx?.latitude_approx && approx?.longitude_approx) {
          meLat = approx.latitude_approx as number;
          meLng = approx.longitude_approx as number;
        }
      }
      const hasGeo = meLat !== null && meLng !== null;

      // 2. Pool de gardiens actifs (large, on filtre côté client)
      const { data: pool } = await supabase
        .from("profiles")
        .select("id, first_name, avatar_url, city, identity_verified, completed_sits_count, skill_categories, custom_skills, latitude, longitude, account_status, role, profile_completion")
        .in("role", ["sitter", "both"])
        .eq("account_status", "active")
        .neq("id", currentUserId!)
        .gte("profile_completion", 40)
        .limit(500);

      if (!pool || pool.length === 0) {
        return { sitters: [], radiusUsed: null, hasGeo, totalCount: 0 };
      }

      // 3. Notes moyennes + compétences sitter (batch)
      const ids = pool.map((p) => p.id);
      const [{ data: reviewsData }, { data: sitterRows }] = await Promise.all([
        supabase
          .from("reviews")
          .select("reviewee_id, overall_rating")
          .in("reviewee_id", ids)
          .eq("published", true),
        supabase
          .from("sitter_profiles")
          .select("user_id, competences")
          .in("user_id", ids),
      ]);
      const ratingMap = new Map<string, number[]>();
      (reviewsData || []).forEach((r: { reviewee_id: string; overall_rating: number }) => {
        if (!ratingMap.has(r.reviewee_id)) ratingMap.set(r.reviewee_id, []);
        ratingMap.get(r.reviewee_id)!.push(r.overall_rating);
      });
      const sitterSkillsMap = new Map<string, string[]>();
      (sitterRows || []).forEach((s: any) => {
        if (Array.isArray(s.competences) && s.competences.length > 0) {
          sitterSkillsMap.set(s.user_id, s.competences.filter((c: any) => typeof c === "string" && c.trim().length > 0));
        }
      });

      const enriched: NearbyOwnerSitter[] = pool.map((p: any) => {
        const distance_km =
          hasGeo && p.latitude && p.longitude
            ? haversineDistance(
                { lat: meLat!, lng: meLng! },
                { lat: p.latitude, lng: p.longitude },
              )
            : null;
        const ratings = ratingMap.get(p.id) || [];
        const avg = ratings.length > 0
          ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10
          : null;
        const sitterSkills = sitterSkillsMap.get(p.id) || [];
        const profileCustom = normalizeCustom(p.custom_skills);
        const mergedSkills = Array.from(new Set([...sitterSkills, ...profileCustom]));
        return {
          id: p.id,
          first_name: p.first_name,
          avatar_url: p.avatar_url,
          city: p.city,
          identity_verified: !!p.identity_verified,
          completed_sits_count: p.completed_sits_count || 0,
          skill_categories: p.skill_categories || [],
          custom_skills: mergedSkills,
          distance_km,
          is_beyond: false,
          avg_rating: avg,
        };
      });

      const sortByDistance = (list: NearbyOwnerSitter[]) =>
        [...list].sort((a, b) => {
          const da = a.distance_km ?? Infinity;
          const db = b.distance_km ?? Infinity;
          if (da !== db) return da - db;
          if (a.identity_verified !== b.identity_verified) return a.identity_verified ? -1 : 1;
          if (a.completed_sits_count !== b.completed_sits_count) return b.completed_sits_count - a.completed_sits_count;
          return (b.avg_rating ?? 0) - (a.avg_rating ?? 0);
        });

      if (!hasGeo) {
        return {
          sitters: sortByDistance(enriched).slice(0, MAX_RESULTS),
          radiusUsed: null,
          hasGeo: false,
          totalCount: enriched.length,
        };
      }

      const withDistance = enriched.filter((h) => h.distance_km !== null);

      for (const radius of RADIUS_STEPS) {
        const inRange = withDistance.filter((h) => h.distance_km! <= radius);
        if (inRange.length >= 3) {
          return {
            sitters: sortByDistance(inRange).slice(0, MAX_RESULTS),
            radiusUsed: radius,
            hasGeo: true,
            totalCount: inRange.length,
          };
        }
      }

      const beyond = sortByDistance(withDistance)
        .slice(0, MAX_RESULTS)
        .map((s) => ({ ...s, is_beyond: true }));
      return { sitters: beyond, radiusUsed: null, hasGeo: true, totalCount: withDistance.length };
    },
  });
}
