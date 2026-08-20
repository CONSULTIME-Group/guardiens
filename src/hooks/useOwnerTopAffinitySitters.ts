/**
 * Owner Pass 3 : 3 gardiens qui vous correspondent (score d'affinité).
 *
 * Charge le profil owner, le vivier de gardiens actifs, calcule le score
 * d'affinité via le MOTEUR UNIQUE partagé (`computeAffinityResultFull`, le
 * même calcul que la distribution des emails) et retourne les 3 meilleurs.
 *
 * DOCTRINE DÉFINITIVE (décision de Jérémie, 20/08/2026) : tri, on filtre
 * jamais. Aucun filtre de pool n'est admis, quel que soit son motif :
 * identité vérifiée, complétude, ancienneté, note, abonnement se TRIENT,
 * rien de tout cela ne FILTRE. Pas de constante d'arbitrage, pas de bascule.
 * - L'identité vérifiée départage le classement à score égal et s'affiche
 *   en badge sur la carte ; un gardien non vérifié reste dans la liste.
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
 * Plafond de scoring : au-delà, les gardiens les plus éloignés ne sont pas
 * scorés (coût de calcul). Tri par distance AVANT plafonnement, nombre
 * écarté tracé, jamais silencieux.
 */
export const POOL_SCORING_CAP = 600;

/**
 * Plafond de lecture du vivier (borne technique de requête). Si le vivier
 * grandit jusqu'à l'atteindre, la troncature est journalisée, jamais
 * silencieuse.
 */
export const POOL_READ_CAP = 2000;

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
  scoredCount: number;
  hasGeo: boolean;
  isLoading: boolean;
}

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

      // 2. Vivier de gardiens actifs, COMPLET : aucun filtre de confiance
      // (identité vérifiée, complétude). La vue public_profiles ne contient
      // déjà que des comptes actifs avec prénom, c'est la seule hygiène
      // admise. Le plafond de lecture est une borne technique, tracée.
      const { data: pool } = await supabase
        .from("public_profiles")
        .select("id, first_name, avatar_url, city, latitude_approx, longitude_approx, identity_verified, profile_completion, role")
        .in("role", ["sitter", "both"])
        .neq("id", userId!)
        .limit(POOL_READ_CAP);

      if (pool && pool.length === POOL_READ_CAP) {
        console.warn(
          `[top3] plafond de lecture ${POOL_READ_CAP} atteint : le vivier est tronqué avant tri, augmenter POOL_READ_CAP.`,
        );
      }

      if (!pool || pool.length === 0) {
        return { topSitters: [] as AffinitySitterCard[], totalPool: 0, scoredCount: 0, hasGeo, poolExcludedByCap: 0 };
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
        // Sans coordonnées à départager, l'identité vérifiée d'abord.
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

      // Chaîne de départage (règle 2 du bloc normatif) : affinité d'abord,
      // puis identité vérifiée, puis photo de profil présente, puis
      // distance. Les signaux de confiance départagent, ils ne notent pas.
      // Le tri utilise le SCORE DE TRI (sortScore = score × confiance,
      // décision du 20/08/2026) : un 100 % construit sur un seul critère ne
      // passe plus devant un 78 % construit sur sept. Le score brut reste
      // celui affiché sur la carte.
      scored.sort((a, b) => {
        if (b.affinity.sortScore !== a.affinity.sortScore) return b.affinity.sortScore - a.affinity.sortScore;
        if (a.identity_verified !== b.identity_verified) return a.identity_verified ? -1 : 1;
        const aPhoto = a.avatar_url ? 1 : 0;
        const bPhoto = b.avatar_url ? 1 : 0;
        if (aPhoto !== bPhoto) return bPhoto - aPhoto;
        const da = a.distance_km ?? 999;
        const db = b.distance_km ?? 999;
        return da - db;
      });

      return {
        topSitters: scored.slice(0, 3),
        // Taille réelle du vivier lu, AVANT le plafond de scoring. C'est le
        // chiffre annoncé dans le lien "Voir les N gardiens" : il doit
        // correspondre à ce que le propriétaire trouve derrière /search.
        totalPool: pool.length,
        // Nombre réellement scoré (après plafond de calcul). Diagnostic
        // uniquement, jamais affiché.
        scoredCount: scoped.length,
        hasGeo,
        poolExcludedByCap,
      };
    },
  });

  const data = q.data;
  return {
    topSitters: data?.topSitters ?? [],
    totalPool: data?.totalPool ?? 0,
    scoredCount: data?.scoredCount ?? 0,
    hasGeo: data?.hasGeo ?? false,
    isLoading: q.isLoading,
  };
}
