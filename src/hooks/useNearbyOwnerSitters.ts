import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { haversineDistance } from "@/utils/geo";
import type { AffinitySitterInput } from "@/lib/affinityScore";

/**
 * « Gardiens près de chez vous » pour le dashboard propriétaire.
 *
 * Jumeau symétrique de `useNearbyHelpers` mais ciblant les gardiens (role ∈
 * {sitter, both}). Vivier COMPLET : aucun filtre de confiance ni de
 * complétude (décision de Jérémie, 20/08/2026 : tri, jamais de filtre de
 * pool). Tri par distance croissante, fallback progressif 30 → 50 → 100 km,
 * puis flag `is_beyond` si aucun gardien dans 100 km, pour pouvoir afficher
 * quand même les plus proches disponibles, comme côté annonces.
 *
 * On retourne les `custom_skills` (savoir-faire secondaires) pour permettre
 * au composant d'afficher 1 à 2 chips qualitatifs différenciants.
 *
 * Volume réseau (lot 2B, 05/09/2026) : le vivier entier est toujours lu,
 * compté et trié ; seules les données d'AFFICHAGE (notes, compétences,
 * affinité) sont chargées, et uniquement pour les `ENRICH_CAP` premiers
 * candidats du tri. Aucun gardien n'est retiré du vivier, aucun compteur ne
 * change : on cesse simplement d'enrichir des profils qui ne peuvent
 * mathématiquement pas apparaître dans un Top 6.
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
  /** Entrée du moteur d'affinité, null si le gardien n'a pas de ligne. */
  affinity_input: AffinitySitterInput | null;
};

const RADIUS_STEPS = [30, 50, 100];
const MAX_RESULTS = 6;
/** Borne technique de lecture du vivier, tracée si atteinte. */
const POOL_READ_CAP = 2000;
/**
 * Nombre de candidats enrichis (notes, compétences, affinité) après tri.
 * Quatre fois MAX_RESULTS : marge confortable pour que le départage par
 * note, dernier critère de la chaîne, ne puisse pas changer le Top 6.
 */
const ENRICH_CAP = 24;

/**
 * Colonnes du moteur d'affinité, écrites une seule fois et réutilisées par
 * les surfaces qui affichent la chip réciproque (SpotlightNearbyPanel).
 */
export const NEARBY_AFFINITY_COLUMNS =
  "user_id, experience_years, life_pace, lifestyle, availability_during, has_vehicle, has_license, languages, interests, work_during_sit, sensitivities, animal_types, sitter_type, travels_with_children, travels_with_own_animals, special_animal_skills, farm_animals_ok";

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
    // Un retour d'onglet ne doit pas relancer la lecture du vivier.
    refetchOnWindowFocus: false,
    queryFn: async () => {
      // VAGUE 1 : coordonnées propriétaire (exactes puis repli approché) et
      // vivier complet, en parallèle. La lecture approchée part
      // systématiquement (elle ne coûte qu'une ligne) mais ne sert qu'en
      // repli, exactement comme avant.
      const [meRes, approxRes, poolRes] = await Promise.all([
        supabase.from("profiles").select("latitude, longitude").eq("id", currentUserId!).maybeSingle(),
        supabase
          .from("public_profiles")
          .select("latitude_approx, longitude_approx")
          .eq("id", currentUserId!)
          .maybeSingle(),
        // Vivier de gardiens actifs, complet : aucun filtre de complétude
        // ni de confiance (la vue ne retient déjà que les comptes actifs).
        // Plafond de lecture technique, tracé s'il est atteint.
        supabase
          .from("public_profiles")
          .select("id, first_name, avatar_url, city, identity_verified, completed_sits_count, skill_categories, custom_skills, latitude_approx, longitude_approx, role")
          .in("role", ["sitter", "both"])
          .neq("id", currentUserId!)
          .limit(POOL_READ_CAP),
      ]);

      let meLat: number | null = (meRes.data?.latitude as number | null) ?? null;
      let meLng: number | null = (meRes.data?.longitude as number | null) ?? null;
      if (meLat === null || meLng === null) {
        const approx = approxRes.data;
        if (approx?.latitude_approx && approx?.longitude_approx) {
          meLat = approx.latitude_approx as number;
          meLng = approx.longitude_approx as number;
        }
      }
      const hasGeo = meLat !== null && meLng !== null;

      const pool = poolRes.data;
      if (pool && pool.length === POOL_READ_CAP) {
        console.warn(
          `[nearby-owner-sitters] plafond de lecture ${POOL_READ_CAP} atteint : vivier tronqué avant tri, augmenter POOL_READ_CAP.`,
        );
      }

      if (!pool || pool.length === 0) {
        return { sitters: [], radiusUsed: null, hasGeo, totalCount: 0 };
      }

      // En mémoire, sans requête : distances sur TOUT le vivier.
      const enriched: NearbyOwnerSitter[] = pool.map((p: any) => {
        const distance_km =
          hasGeo && p.latitude_approx != null && p.longitude_approx != null
            ? haversineDistance(
                { lat: meLat!, lng: meLng! },
                { lat: p.latitude_approx, lng: p.longitude_approx },
              )
            : null;
        return {
          id: p.id,
          first_name: p.first_name,
          avatar_url: p.avatar_url,
          city: p.city,
          identity_verified: !!p.identity_verified,
          completed_sits_count: p.completed_sits_count || 0,
          skill_categories: p.skill_categories || [],
          custom_skills: normalizeCustom(p.custom_skills),
          distance_km,
          is_beyond: false,
          avg_rating: null,
          affinity_input: null,
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

      // Paliers de rayon et filet `is_beyond`, calculés sur le vivier
      // entier : `radiusUsed` et `totalCount` sont donc inchangés.
      let selection: NearbyOwnerSitter[];
      let radiusUsed: number | null = null;
      let totalCount: number;
      let beyond = false;

      if (!hasGeo) {
        selection = sortByDistance(enriched);
        totalCount = enriched.length;
      } else {
        const withDistance = enriched.filter((h) => h.distance_km !== null);
        const step = RADIUS_STEPS.map((radius) => ({
          radius,
          inRange: withDistance.filter((h) => h.distance_km! <= radius),
        })).find((s) => s.inRange.length >= 3);
        if (step) {
          selection = sortByDistance(step.inRange);
          radiusUsed = step.radius;
          totalCount = step.inRange.length;
        } else {
          selection = sortByDistance(withDistance);
          totalCount = withDistance.length;
          beyond = true;
        }
      }

      // Candidats à enrichir. Différence de comportement assumée : sans
      // géoloc, cette présélection se fait sur identité vérifiée puis
      // nombre de gardes, avant que les notes soient connues ; le
      // départage par note ne joue donc plus qu'à l'intérieur de ces 24.
      // Avec géoloc, la distance domine le tri et le Top 6 est strictement
      // identique à celui d'avant.
      const candidates = selection.slice(0, ENRICH_CAP);
      const ids = candidates.map((c) => c.id);

      // VAGUE 2 : données d'affichage, uniquement pour ces candidats.
      const [reviewsRes, sitterRes, affinityRes] = await Promise.all([
        supabase
          .from("reviews")
          .select("reviewee_id, overall_rating")
          .in("reviewee_id", ids)
          .eq("published", true),
        supabase.from("public_sitter_profiles").select("user_id, competences").in("user_id", ids),
        supabase.from("sitter_profiles_affinity").select(NEARBY_AFFINITY_COLUMNS).in("user_id", ids),
      ]);
      const readError = [reviewsRes, sitterRes, affinityRes].find((result) => result.error)?.error;
      if (readError) throw readError;

      const ratingMap = new Map<string, number[]>();
      (reviewsRes.data || []).forEach((r: { reviewee_id: string; overall_rating: number }) => {
        if (!ratingMap.has(r.reviewee_id)) ratingMap.set(r.reviewee_id, []);
        ratingMap.get(r.reviewee_id)!.push(r.overall_rating);
      });
      const sitterSkillsMap = new Map<string, string[]>();
      (sitterRes.data || []).forEach((s: any) => {
        if (Array.isArray(s.competences) && s.competences.length > 0) {
          sitterSkillsMap.set(s.user_id, s.competences.filter((c: any) => typeof c === "string" && c.trim().length > 0));
        }
      });
      const affinityMap = new Map<string, AffinitySitterInput>();
      (affinityRes.data || []).forEach((row: any) => {
        if (row?.user_id) {
          const { user_id, ...rest } = row;
          affinityMap.set(user_id, rest as AffinitySitterInput);
        }
      });

      const finalList = candidates.map((c) => {
        const ratings = ratingMap.get(c.id) || [];
        const avg =
          ratings.length > 0
            ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10
            : null;
        const sitterSkills = sitterSkillsMap.get(c.id) || [];
        return {
          ...c,
          custom_skills: Array.from(new Set([...sitterSkills, ...c.custom_skills])),
          avg_rating: avg,
          affinity_input: affinityMap.get(c.id) ?? null,
          is_beyond: beyond,
        };
      });

      return {
        sitters: sortByDistance(finalList).slice(0, MAX_RESULTS),
        radiusUsed,
        hasGeo,
        totalCount,
      };
    },
  });
}
