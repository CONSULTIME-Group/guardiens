import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { fetchMyProfile } from "@/lib/myProfile";
import { haversineDistance } from "@/utils/geo";

/**
 * Compteur dual « X personnes prêtes à donner un coup de main à <Rkm · Y en France ».
 *
 * Pourquoi : la preuve sociale globale (« 509 inscrits ») est trop abstraite sur
 * un dashboard utilisateur. On veut un signal LOCAL d'abord (« il y a du monde
 * dans votre coin »), puis NATIONAL en filet de sécurité (« sinon, la
 * communauté est vivante »).
 *
 * Définition « helper » : `available_for_help = true` ET au moins une compétence
 * renseignée (même règle que useNearbyHelpers, pour cohérence).
 *
 * Rayon local : 30 km (verrouillé, pas de fallback ici, on veut une vérité
 * locale binaire « oui/non, il y a du monde près de vous »).
 */

export type HelpersProximityCount = {
  localCount: number;
  nationalCount: number;
  radiusKm: number;
  hasGeo: boolean;
};

const LOCAL_RADIUS_KM = 30;

export function useHelpersProximityCount(currentUserId: string | undefined) {
  return useQuery<HelpersProximityCount>({
    queryKey: ["helpers-proximity-count", currentUserId],
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    queryFn: async () => {
      // Lot P1b : une seule lecture. Le compte exact national accompagne la
      // liste des coups de main (coordonnées approchées), filtrée ensuite
      // en mémoire pour le compte local, sans requête supplémentaire.
      let localCount = 0;
      let hasGeo = false;
      const [helpersRes, meRes] = await Promise.all([
        supabase
          .from("public_profiles")
          .select("id, latitude_approx, longitude_approx", { count: "exact" })
          .eq("available_for_help", true)
          .not("skill_categories", "eq", "{}")
          .order("id", { ascending: true })
          .limit(1000),
        currentUserId ? fetchMyProfile(currentUserId) : Promise.resolve({ data: null }),
      ]);
      const nationalCount = helpersRes.count ?? 0;
      const me = meRes.data as { latitude?: number | null; longitude?: number | null } | null;
      hasGeo = !!(me?.latitude && me?.longitude);
      if (hasGeo && currentUserId) {
        localCount = ((helpersRes.data ?? []) as any[]).filter((p) => {
          if (p.id === currentUserId || p.latitude_approx == null || p.longitude_approx == null) return false;
          const d = haversineDistance(
            { lat: me!.latitude as number, lng: me!.longitude as number },
            { lat: p.latitude_approx, lng: p.longitude_approx },
          );
          return d <= LOCAL_RADIUS_KM;
        }).length;
      }

      return {
        localCount,
        nationalCount: nationalCount ?? 0,
        radiusKm: LOCAL_RADIUS_KM,
        hasGeo,
      };
    },
  });
}
