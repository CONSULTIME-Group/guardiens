/**
 * Owner Pass 3 — 3 gardiens qui vous correspondent (score d'affinité).
 *
 * Charge le profil owner, le vivier de gardiens actifs, calcule le score
 * d'affinité via le MOTEUR UNIQUE partagé (`computeAffinityResultFull`, le
 * même calcul que la distribution des emails) et retourne les 3 meilleurs.
 *
 * DOCTRINE : ON TRIE PAR PERTINENCE, ON N'ÉLIMINE JAMAIS.
 * - L'identité vérifiée et la complétude DÉPARTAGENT le classement, elles
 *   ne filtrent pas le vivier (constante TOP3_TRUST_POLICY ci-dessous).
 * - Une garde sans animaux est une garde légitime : le critère espèces
 *   sort alors du dénominateur, il ne vide jamais la liste.
 * - Un gardien sans ligne sitter_profiles est scoré (tous critères non
 *   évaluables), jamais écarté.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { computeAffinityResultFull, type AffinityResult } from "@/lib/affinityScore";
import { haversineDistance } from "@/utils/geo";

/**
 * TOP3_TRUST_POLICY, politique de confiance du Top 3 propriétaire.
 *
 * "sort" (doctrine cible) : identité vérifiée et complétude trient le
 *   classement, jamais de filtre. L'écusson « Identité vérifiée » affiché
 *   sur la carte est un fait sur ce profil, pas une promesse générale.
 * "filter" (comportement historique, 56 gardiens visibles sur 991) :
 *   conservé uniquement comme retour arrière documenté. Jérémie tranche
 *   avant toute bascule définitive.
 */
export const TOP3_TRUST_POLICY: "sort" | "filter" = "sort";

/**
 * Plafond de scoring : au-delà, les gardiens les plus éloignés ne sont pas
 * scorés (coût de calcul). Le nombre écarté est tracé, jamais silencieux.
 */
export const POOL_SCORING_CAP = 600;

export interface AffinitySitterCard {
  id: string;
  first_name: string | null;
  city: string | null;
  avatar_url: string | null;
  distance_km: number | null;
  identity_verified: boolean;
  affinity: AffinityResult;
}

interface Result {
  topSitters: AffinitySitterCard[];
  totalPool: number;
  hasGeo: boolean;
  isLoading: boolean;
}

export function useOwnerTopAffinitySitters(): Result {
  const { user } = useAuth();
  const userId = user?.id;

  const q = useQuery({
    queryKey: ["owner-top-affinity-sitters", userId, TOP3_TRUST_POLICY],
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

      // 2. Vivier de gardiens actifs. Aucun filtre de confiance en mode
      // "sort" : la vérification et la complétude trient, elles n'excluent
      // pas. Le plafond de lecture est une borne technique, tracée plus bas.
      let poolQuery = supabase
        .from("public_profiles")
        .select("id, first_name, avatar_url, city, latitude_approx, longitude_approx, identity_verified, profile_completion, role")
        .in("role", ["sitter", "both"])
        .neq("id", userId!);
      if (TOP3_TRUST_POLICY === "filter") {
        // Retour arrière documenté : ancien barrage (56 gardiens visibles
        // sur 991). Ne s'active que par décision explicite de Jérémie.
        poolQuery = poolQuery.eq("identity_verified", true).gte("profile_completion", 60);
      }
      const { data: pool } = await poolQuery.limit(2000);

      if (!pool || pool.length === 0) {
        return { topSitters: [] as AffinitySitterCard[], totalPool: 0, hasGeo, poolExcludedByCap: 0 };
      }

      const ids = pool.map((p) => p.id);
      const { data: sitterRows } = await supabase
        .from("sitter_profiles_affinity")
        .select("user_id, experience_years, life_pace, lifestyle, availability_during, has_vehicle, has_license, languages, interests, work_during_sit, sensitivities, animal_types, sitter_type, travels_with_children, travels_with_own_animals, special_animal_skills, farm_animals_ok")
        .in("user_id", ids);

      const sitterByUser = new Map<string, any>((sitterRows ?? []).map((s: any) => [s.user_id, s]));

      // 3. Distance, puis plafond de scoring : on garde les plus proches.
      const withDistance = pool.map((p: any) => {
        let distance_km: number | null = null;
        if (hasGeo && p.latitude_approx != null && p.longitude_approx != null) {
          distance_km = haversineDistance(
            { lat: meLat!, lng: meLng! },
            { lat: p.latitude_approx, lng: p.longitude_approx },
          );
        }
        return { ...p, distance_km };
      });

      const byDistance = [...withDistance].sort((a, b) => {
        const da = a.distance_km ?? Number.POSITIVE_INFINITY;
        const db = b.distance_km ?? Number.POSITIVE_INFINITY;
        if (da !== db) return da - db;
        // Sans coordonnées à départager, les profils vérifiés d'abord.
        return Number(b.identity_verified === true) - Number(a.identity_verified === true);
      });
      const scoped = byDistance.slice(0, POOL_SCORING_CAP);
      const poolExcludedByCap = byDistance.length - scoped.length;
      if (poolExcludedByCap > 0) {
        console.info(
          `[top3] plafond de scoring ${POOL_SCORING_CAP} atteint : ${poolExcludedByCap} gardiens les plus éloignés non scorés.`,
        );
      }

      // 4. Score d'affinité, moteur unique. Un gardien sans ligne
      // sitter_profiles est scoré avec une entrée vide : tous ses critères
      // sont non évaluables (neutres), il reste dans le classement.
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
        const sitter = sitterByUser.get(p.id) ?? {};
        // Doctrine : on trie par pertinence, on n'élimine jamais. Tous les
        // gardiens du vivier entrent dans le classement ; le chiffre affiché
        // dépend de `affinity.scoreReliable`, pas d'une exclusion ici.
        const affinity = computeAffinityResultFull(ownerInput as any, sitter as any);
        scored.push({
          id: p.id,
          first_name: p.first_name ?? null,
          city: p.city ?? null,
          avatar_url: p.avatar_url ?? null,
          distance_km: p.distance_km,
          identity_verified: p.identity_verified === true,
          affinity,
        });
      }

      // Tri : affinité d'abord, puis la confiance départage (vérifiés
      // devant à score égal), puis la distance.
      scored.sort((a, b) => {
        if (b.affinity.score !== a.affinity.score) return b.affinity.score - a.affinity.score;
        if (a.identity_verified !== b.identity_verified) return a.identity_verified ? -1 : 1;
        const da = a.distance_km ?? 999;
        const db = b.distance_km ?? 999;
        return da - db;
      });

      return {
        topSitters: scored.slice(0, 3),
        totalPool: scoped.length,
        hasGeo,
        poolExcludedByCap,
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
