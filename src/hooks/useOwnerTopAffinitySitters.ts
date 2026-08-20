/**
 * Owner Pass 3 — 3 gardiens qui vous correspondent (score d'affinité).
 *
 * Charge le profil owner, un pool de gardiens actifs à proximité
 * (fallback progressif 30 → 50 → 100 km), calcule le score d'affinité via
 * `computeAffinityScore` et retourne les 3 meilleurs.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { computeAffinityResultFull, type AffinityResult } from "@/lib/affinityScore";
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
      // 1. Owner : coordonnées + prefs matching + pets + voiture requise
      const [{ data: me }, { data: ownerPrefs }, { data: pets }, { data: myProperties }] = await Promise.all([
        supabase.from("profiles").select("latitude, longitude, city").eq("id", userId!).maybeSingle(),
        supabase.from("owner_profiles").select("preferred_sitter_types, home_ambiance, languages, interests, life_pace, presence_expected").eq("user_id", userId!).maybeSingle(),
        supabase.from("pets").select("species, special_needs, breed, property_id, properties!inner(user_id)").eq("properties.user_id", userId!),
        supabase.from("properties").select("car_required").eq("user_id", userId!),
      ]);

      const meLat = (me?.latitude as number | null) ?? null;
      const meLng = (me?.longitude as number | null) ?? null;
      const hasGeo = meLat !== null && meLng !== null;

      // 2. Pool sitters vérifiés
      const { data: pool } = await supabase
        .from("public_profiles")
        .select("id, first_name, avatar_url, city, latitude_approx, longitude_approx, identity_verified, profile_completion, role")
        .in("role", ["sitter", "both"])
        .eq("identity_verified", true)
        .gte("profile_completion", 60)
        .neq("id", userId!)
        .limit(300);

      if (!pool || pool.length === 0) {
        return { topSitters: [] as AffinitySitterCard[], totalPool: 0, hasGeo };
      }

      const ids = pool.map((p) => p.id);
      const { data: sitterRows } = await supabase
        .from("sitter_profiles_affinity")
        .select("user_id, experience_years, life_pace, lifestyle, availability_during, has_vehicle, has_license, languages, interests, work_during_sit, sensitivities, animal_types, sitter_type, travels_with_children, travels_with_own_animals, special_animal_skills, farm_animals_ok")
        .in("user_id", ids);

      const sitterByUser = new Map<string, any>((sitterRows ?? []).map((s: any) => [s.user_id, s]));

      // 3. Filtrage géo progressif
      const withDistance = pool
        .map((p: any) => {
          let distance_km: number | null = null;
          if (hasGeo && p.latitude_approx != null && p.longitude_approx != null) {
            distance_km = haversineDistance(
              { lat: meLat!, lng: meLng! },
              { lat: p.latitude_approx, lng: p.longitude_approx },
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
        car_required: (myProperties ?? []).some((p: any) => p.car_required === true),
        pets: (pets ?? []).map((p: any) => ({ species: p.species, special_needs: p.special_needs, breed: p.breed ?? null })),
      };

      const scored: AffinitySitterCard[] = [];
      for (const p of scoped) {
        const sitter = sitterByUser.get(p.id);
        if (!sitter) continue;
        // Doctrine : on trie par pertinence, on n'élimine jamais. Tous les
        // gardiens du pool entrent dans le classement ; le chiffre affiché
        // dépend de `affinity.scoreReliable`, pas d'une exclusion ici.
        const affinity = computeAffinityResultFull(ownerInput as any, sitter as any);
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
