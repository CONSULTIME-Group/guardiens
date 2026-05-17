import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
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
 * Rayon local : 30 km (verrouillé — pas de fallback ici, on veut une vérité
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
      // 1. Total national (exact, via head: true)
      const { count: nationalCount } = await supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("available_for_help", true)
        .not("skill_categories", "eq", "{}");

      // 2. Local : on a besoin des coords du user + des helpers
      let localCount = 0;
      let hasGeo = false;

      if (currentUserId) {
        const { data: me } = await supabase
          .from("profiles")
          .select("latitude, longitude")
          .eq("id", currentUserId)
          .maybeSingle();

        hasGeo = !!(me?.latitude && me?.longitude);

        if (hasGeo) {
          const { data: pool } = await supabase
            .from("profiles")
            .select("id, latitude, longitude")
            .eq("available_for_help", true)
            .not("skill_categories", "eq", "{}")
            .not("latitude", "is", null)
            .not("longitude", "is", null)
            .neq("id", currentUserId)
            .limit(500);

          if (pool) {
            localCount = pool.filter((p: any) => {
              const d = haversineDistance(
                { lat: me!.latitude as number, lng: me!.longitude as number },
                { lat: p.latitude, lng: p.longitude },
              );
              return d <= LOCAL_RADIUS_KM;
            }).length;
          }
        }
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
