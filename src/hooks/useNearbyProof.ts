/**
 * Lot ANN1 : lectures du bloc « N gardiens à moins de 50 km de chez vous ».
 * Deux lectures au plus dans le cas courant (compte dans le rayon, visages),
 * une de plus seulement quand le total des inscrits sert de repli.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { fetchMyProfile } from "@/lib/myProfile";
import { buildNearbyProof, pickNearbyFaces, NEARBY_PROOF_MIN_LOCAL, NEARBY_PROOF_RADIUS_KM, type NearbyFace, type NearbyProof } from "@/lib/nearbyProof";

const PARIS = { lat: 48.8566, lng: 2.3522 };

export function useNearbyProof(userId: string | undefined, enabled: boolean) {
  return useQuery<{ proof: NearbyProof | null; faces: NearbyFace[] }>({
    queryKey: ["nearby-proof", userId],
    enabled: !!userId && enabled,
    staleTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: false,
    queryFn: async () => {
      const me = (await fetchMyProfile(userId!)).data as { latitude?: number | null; longitude?: number | null; role?: string | null } | null;
      const lat = typeof me?.latitude === "number" ? me.latitude : null;
      const lng = typeof me?.longitude === "number" ? me.longitude : null;
      let localCount: number | null = null;
      let faces: NearbyFace[] = [];
      if (lat !== null && lng !== null) {
        const dLat = NEARBY_PROOF_RADIUS_KM / 111;
        const dLng = NEARBY_PROOF_RADIUS_KM / (111 * Math.max(0.2, Math.cos((lat * Math.PI) / 180)));
        const [countRes, facesRes] = await Promise.all([
          supabase.rpc("count_eligible_sitters", { p_lat: lat, p_lng: lng, p_radius_km: NEARBY_PROOF_RADIUS_KM }),
          supabase
            .from("public_profiles")
            .select("id, first_name, avatar_url, latitude_approx, longitude_approx")
            .in("role", ["sitter", "both"])
            .not("avatar_url", "is", null)
            .gte("latitude_approx", lat - dLat).lte("latitude_approx", lat + dLat)
            .gte("longitude_approx", lng - dLng).lte("longitude_approx", lng + dLng)
            .limit(60),
        ]);
        if (typeof countRes.data === "number") {
          // Le membre à double rôle se compte lui-même : on le retire.
          localCount = Math.max(0, countRes.data - (me?.role === "both" || me?.role === "sitter" ? 1 : 0));
        }
        if (!facesRes.error && Array.isArray(facesRes.data)) {
          faces = pickNearbyFaces({ lat, lng, id: userId! }, facesRes.data as never);
        }
      }
      let nationalCount: number | null = null;
      if (localCount === null || localCount < NEARBY_PROOF_MIN_LOCAL) {
        const { data } = await supabase.rpc("count_eligible_sitters", { p_lat: PARIS.lat, p_lng: PARIS.lng, p_radius_km: 21000 });
        nationalCount = typeof data === "number" ? data : null;
      }
      const proof = buildNearbyProof({ localCount, nationalCount, names: faces.map((f) => f.first_name) });
      return { proof, faces: proof?.scope === "local" && proof.names.length === 3 ? faces : [] };
    },
  });
}
