/**
 * Charge une fois (par session) le profil propriétaire du visiteur connecté
 * + ses animaux, pour permettre le calcul d'affinité côté propriétaire qui
 * consulte un gardien (PublicSitterProfile, SearchOwner card, etc.).
 *
 * Cache module-level pour éviter une refetch par carte dans une liste.
 */
import { useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import type { AffinityOwnerInput } from "@/lib/affinityScore";

type Loaded = AffinityOwnerInput | null;

async function fetchOwnerWithPets(userId: string): Promise<Loaded> {
  const [ownerRes, propsRes] = await Promise.all([
    supabase.from("owner_profiles").select("*").eq("user_id", userId).maybeSingle(),
    supabase.from("properties").select("car_required, pets(species, special_needs, breed)").eq("user_id", userId),
  ]);
  if (!ownerRes.data) return null;
  const pets = (propsRes.data ?? []).flatMap((p: any) => p.pets ?? []);
  // Voiture requise si au moins une propriété le demande.
  const car_required = (propsRes.data ?? []).some((p: any) => p.car_required === true);
  return {
    ...(ownerRes.data as any),
    pets,
    car_required,
    // Pas de contexte annonce ici (le visiteur consulte un profil ou une
    // liste de gardiens, pas une de ses annonces) : les politiques
    // accompagnants ne sont pas évaluables. null explicite, neutre dans le
    // moteur, jamais pénalisant.
    accepts_sitter_pets: null,
    accepts_sitter_children: null,
    // Distance par couple : inconnue ici (le hook ne connaît pas le gardien
    // consulté). null explicite, critère hors dénominateur, jamais
    // pénalisant. Le consommateur qui connaît les deux coordonnées la
    // surcharge à l'appel du moteur.
    distance_km: null,
  } as AffinityOwnerInput;
}

// Client React Query actif, mémorisé pour permettre l'invalidation depuis
// `clearViewerOwnerCache` hors d'un composant.
let activeClient: QueryClient | null = null;

export function useViewerOwnerForAffinity(): {
  owner: Loaded;
  loading: boolean;
} {
  const { user } = useAuth();
  const userId = user?.id;
  activeClient = useQueryClient();

  const { data, isPending } = useQuery({
    queryKey: ["viewer-owner-affinity", userId],
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      try {
        return await fetchOwnerWithPets(userId!);
      } catch {
        return null;
      }
    },
  });

  // Signature inchangée : `loading` vaut true tant qu'un utilisateur est
  // présent et que la première lecture n'est pas résolue.
  return { owner: data ?? null, loading: !!userId && isPending };
}

/** Permet d'invalider le cache après une édition de profil/animaux. */
export function clearViewerOwnerCache(userId?: string) {
  if (!activeClient) return;
  if (userId) activeClient.removeQueries({ queryKey: ["viewer-owner-affinity", userId] });
  else activeClient.removeQueries({ queryKey: ["viewer-owner-affinity"] });
}
