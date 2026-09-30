import { publishedReviewsLoader, sitterAffinityLoader, sitterCompetencesLoader } from "@/lib/batchedReads";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { selectNearbyCandidates, sortNearbyByDistance } from "@/lib/ownerSitterPool";
import { fetchOwnerSpaceDetailReads } from "@/lib/ownerSpaceReads";
import type { AffinitySitterInput } from "@/lib/affinityScore";
import { fetchSitterPoolShared } from "@/lib/fetchSitterPool";
import { fetchMyProfile } from "@/lib/myProfile";

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

const MAX_RESULTS = 6;


/**
 * Colonnes du moteur d'affinité, écrites une seule fois et réutilisées par
 * les surfaces qui affichent la chip réciproque (SpotlightNearbyPanel).
 */
export const NEARBY_AFFINITY_COLUMNS =
  "user_id, experience_years, life_pace, lifestyle, availability_during, has_vehicle, has_license, languages, interests, work_during_sit, sensitivities, animal_types, sitter_type, travels_with_children, travels_with_own_animals, special_animal_skills, farm_animals_ok";

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
        fetchMyProfile(currentUserId!),
        // Repli approché lu seulement si les coordonnées exactes manquent.
        Promise.resolve({ data: null as any }),
        // Vivier de gardiens actifs, complet : aucun filtre de complétude
        // ni de confiance (la vue ne retient déjà que les comptes actifs).
        // Plafond de lecture technique, tracé s'il est atteint.
        // Lot P1b : même lecture que l'onglet « Pour vous ».
        fetchSitterPoolShared(currentUserId!).then((r) => ({ data: r.rows })),
      ]);

      const pool = poolRes.data;
      // Lot P4 : sélection pure partagée avec la lecture groupée de
      // l'espace propriétaire (lib/ownerSitterPool), logique inchangée.
      const sel = selectNearbyCandidates(pool ?? [], meRes.data as any);
      const hasGeo = sel.hasGeo;
      void approxRes;

      if (!pool || pool.length === 0) {
        return { sitters: [], radiusUsed: null, hasGeo, totalCount: 0 };
      }
      const { radiusUsed, totalCount, beyond, candidates } = sel;
      const ids = candidates.map((c) => c.id);

      // VAGUE 2 : données d'affichage, uniquement pour ces candidats.
      // Lot P4 : la salve groupée de l'espace propriétaire a déjà lu ces
      // identifiants ; les chargeurs les servent depuis leur cache.
      await fetchOwnerSpaceDetailReads(currentUserId!).catch(() => undefined);
      const [reviewsRes, sitterRes, affinityRes] = await Promise.all([
        publishedReviewsLoader.rows(ids),
        sitterCompetencesLoader.rows(ids),
        sitterAffinityLoader.rows(ids),
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
        sitters: sortNearbyByDistance(finalList).slice(0, MAX_RESULTS),
        radiusUsed,
        hasGeo,
        totalCount,
      };
    },
  });
}
