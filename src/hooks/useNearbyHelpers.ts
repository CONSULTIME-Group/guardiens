import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { qk } from "@/lib/queryKeys";

/**
 * Helpers du coin (gens disponibles « pour un coup de main »).
 *
 * SÉCURITÉ : ce hook ne reçoit JAMAIS les coordonnées GPS d'autres utilisateurs.
 * Le filtrage géographique et le tri par distance sont réalisés côté serveur
 * par la fonction Postgres `get_nearby_helpers` (SECURITY DEFINER), qui
 * renvoie uniquement une distance déjà calculée.
 */

export type NearbyHelper = {
  id: string;
  first_name: string | null;
  avatar_url: string | null;
  city: string | null;
  skill_categories: string[];
  custom_skills: string[];
  bio: string | null;
  identity_verified: boolean;
  completed_sits_count: number;
  distance_km: number | null;
};

export type NearbyHelpersResult = {
  helpers: NearbyHelper[];
  radiusUsed: number; // km
  hasGeo: boolean;
  includesExtendedSkillProfiles: boolean;
};

export const RADIUS_STEPS = [30, 50, 100];
const MAX_RESULTS = 8;
const MAX_RADIUS_KM = 100;

/** Zone « ultra-proche » — bonus custom_skills réservé à ce périmètre. */
export const NEAR_RADIUS_KM = 5;

export function prioritizeHelpers(list: NearbyHelper[]): NearbyHelper[] {
  return [...list].sort((a, b) => {
    const da = a.distance_km ?? Infinity;
    const db = b.distance_km ?? Infinity;
    const aNear = da <= NEAR_RADIUS_KM;
    const bNear = db <= NEAR_RADIUS_KM;
    if (aNear && bNear) {
      const aHasSkills = a.custom_skills.length > 0 ? 1 : 0;
      const bHasSkills = b.custom_skills.length > 0 ? 1 : 0;
      if (aHasSkills !== bHasSkills) return bHasSkills - aHasSkills;
    }
    if (da !== db) return da - db;
    const aVer = a.identity_verified ? 1 : 0;
    const bVer = b.identity_verified ? 1 : 0;
    return bVer - aVer;
  });
}

export function nextRadiusStep(current: number): number | null {
  return RADIUS_STEPS.find((r) => r > current) ?? null;
}

export type NearbyHelpersOptions = {
  forcedRadius?: number | null;
};

const normalizeCustom = (raw: any): string[] => {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw
      .map((item) => {
        if (typeof item === "string") return item.trim();
        if (item && typeof item === "object") {
          const status = typeof item.status === "string" ? item.status : "approved";
          const label = typeof item.label === "string" ? item.label : "";
          return status === "approved" ? label.trim() : "";
        }
        return "";
      })
      .filter((s) => s.length > 0);
  }
  if (typeof raw === "string" && raw.trim().length > 0) return [raw];
  return [];
};

export function useNearbyHelpers(
  currentUserId: string | undefined,
  options: NearbyHelpersOptions = {},
) {
  const { forcedRadius = null } = options;
  return useQuery<NearbyHelpersResult>({
    queryKey: qk.nearbyHelpers(currentUserId, forcedRadius),
    enabled: !!currentUserId,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_nearby_helpers", {
        p_max_results: MAX_RESULTS,
        p_max_radius_km: MAX_RADIUS_KM,
      });
      if (error) throw error;

      const rows = (data as any[]) ?? [];
      const hasGeo = rows.length > 0 ? !!rows[0].has_geo : false;

      const enriched: NearbyHelper[] = rows.map((p: any) => ({
        id: p.id,
        first_name: p.first_name,
        avatar_url: p.avatar_url,
        city: p.city,
        skill_categories: p.skill_categories || [],
        custom_skills: normalizeCustom(p.custom_skills),
        bio: typeof p.bio === "string" && p.bio.trim().length > 0 ? p.bio : null,
        identity_verified: !!p.identity_verified,
        completed_sits_count: p.completed_sits_count || 0,
        distance_km: p.distance_km ?? null,
      }));

      const sorted = prioritizeHelpers(enriched);

      if (!hasGeo) {
        return {
          helpers: sorted.slice(0, MAX_RESULTS),
          radiusUsed: 0,
          hasGeo: false,
          includesExtendedSkillProfiles: false,
        };
      }

      if (forcedRadius && forcedRadius > 0) {
        const inRange = sorted.filter(
          (h) => h.distance_km !== null && h.distance_km <= forcedRadius,
        );
        return {
          helpers: inRange.slice(0, MAX_RESULTS),
          radiusUsed: forcedRadius,
          hasGeo: true,
          includesExtendedSkillProfiles: false,
        };
      }

      // Plus petit palier contenant au moins 3 helpers, sinon 100.
      let radiusUsed = RADIUS_STEPS[RADIUS_STEPS.length - 1];
      for (const radius of RADIUS_STEPS) {
        const count = sorted.filter(
          (h) => h.distance_km !== null && h.distance_km <= radius,
        ).length;
        if (count >= 3) {
          radiusUsed = radius;
          break;
        }
      }

      return {
        helpers: sorted.slice(0, MAX_RESULTS),
        radiusUsed,
        hasGeo: true,
        includesExtendedSkillProfiles: false,
      };
    },
  });
}
