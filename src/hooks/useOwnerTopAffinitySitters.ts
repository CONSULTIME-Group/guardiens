/**
 * Owner Pass 3 — 3 gardiens qui vous correspondent (score d'affinité).
 *
 * Charge le profil owner, un pool de gardiens actifs vérifiés à proximité
 * (fallback progressif 30 → 50 → 100 km), calcule le score d'affinité via
 * `computeAffinityScore` et retourne les 3 meilleurs.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { computeAffinityScore, type AffinityResult } from "@/lib/affinityScore";
import { haversineDistance } from "@/utils/geo";

export interface AffinitySitterCard {
  id: string;
  first_name: string | null;
  city: string | null;
  avatar_url: string | null;
  distance_km: number | null;
  affinity: AffinityResult;
}

interface Result {
  topSitters: AffinitySitterCard[];
  totalPool: number;
  hasGeo: boolean;
  isLoading: boolean;
}

const RADIUS_STEPS = [30, 50, 100];

export function useOwnerTopAffinitySitters(): Result {
  const { user } = useAuth();
  const userId = user?.id;

  const q = useQuery({
    queryKey: ["owner-top-affinity-sitters", userId],
    enabled: !!userId,
    staleTime: 10 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    queryFn: async () => {
      // 1. Owner : coordonnées + prefs matching + pets
      const [{ data: me }, { data: ownerPrefs }, { data: pets }] = await Promise.all([
        supabase.from("profiles").select("latitude, longitude, city").eq("id", userId!).maybeSingle(),
        supabase.from("owner_profiles").select("preferred_sitter_types, home_ambiance, languages, interests, life_pace, presence_expected").eq("user_id", userId!).maybeSingle(),
        supabase.from("pets").select("species, special_needs, property_id, properties!inner(user_id)").eq("properties.user_id", userId!),
      ]);

      const meLat = (me?.latitude as number | null) ?? null;
      const meLng = (me?.longitude as number | null) ?? null;
      const hasGeo = meLat !== null && meLng !== null;

      // 2. Pool sitters vérifiés
      const { data: pool } = await supabase
        .from("profiles")
        .select("id, first_name, avatar_url, city, latitude, longitude, identity_verified, profile_completion, role, account_status")
        .in("role", ["sitter", "both"])
        .eq("account_status", "active")
        .eq("identity_verified", true)
        .gte("profile_completion", 60)
        .neq("id", userId!)
        .limit(300);

      if (!pool || pool.length === 0) {
        return { topSitters: [] as AffinitySitterCard[], totalPool: 0, hasGeo };
      }

      const ids = pool.map((p) => p.id);
      const { data: sitterRows } = await supabase
        .from("sitter_profiles")
        .select("user_id, animal_types, life_pace, languages, interests, work_during_sit, sensitivities, special_animal_skills, sitter_type, experience_years, travels_with_children, travels_with_own_animals")
        .in("user_id", ids);

      const sitterByUser = new Map<string, any>((sitterRows ?? []).map((s: any) => [s.user_id, s]));

      // 3. Filtrage géo progressif
      const withDistance = pool
        .map((p: any) => {
          let distance_km: number | null = null;
          if (hasGeo && p.latitude != null && p.longitude != null) {
            distance_km = haversineDistance(
              { lat: meLat!, lng: meLng! },
              { lat: p.latitude, lng: p.longitude },
            );
          }
          return { ...p, distance_km };
        });

      let scoped = withDistance;
      if (hasGeo) {
        for (const radius of RADIUS_STEPS) {
          const inRadius = withDistance.filter((p) => p.distance_km != null && p.distance_km <= radius);
          if (inRadius.length >= 3) {
            scoped = inRadius;
            break;
          }
          scoped = inRadius;
        }
        if (scoped.length < 3) scoped = withDistance;
      }

      // 4. Score d'affinité
      const ownerInput = {
        preferred_sitter_types: ownerPrefs?.preferred_sitter_types ?? null,
        home_ambiance: (ownerPrefs as any)?.home_ambiance ?? null,
        languages: (ownerPrefs as any)?.languages ?? null,
        interests: (ownerPrefs as any)?.interests ?? null,
        life_pace: (ownerPrefs as any)?.life_pace ?? null,
        presence_expected: ownerPrefs?.presence_expected ?? null,
        pets: (pets ?? []).map((p: any) => ({ species: p.species, special_needs: p.special_needs })),
      };

      const scored: AffinitySitterCard[] = [];
      for (const p of scoped) {
        const sitter = sitterByUser.get(p.id);
        if (!sitter) continue;
        const affinity = computeAffinityScore(ownerInput as any, sitter as any);
        if (!affinity) continue;
        scored.push({
          id: p.id,
          first_name: p.first_name ?? null,
          city: p.city ?? null,
          avatar_url: p.avatar_url ?? null,
          distance_km: p.distance_km,
          affinity,
        });
      }

      scored.sort((a, b) => {
        if (b.affinity.score !== a.affinity.score) return b.affinity.score - a.affinity.score;
        const da = a.distance_km ?? 999;
        const db = b.distance_km ?? 999;
        return da - db;
      });

      return {
        topSitters: scored.slice(0, 3),
        totalPool: scoped.length,
        hasGeo,
      };
    },
  });

  const data = q.data;
  return {
    topSitters: data?.topSitters ?? [],
    totalPool: data?.totalPool ?? 0,
    hasGeo: data?.hasGeo ?? false,
    isLoading: q.isLoading,
  };
}
