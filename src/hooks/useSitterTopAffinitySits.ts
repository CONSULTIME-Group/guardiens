/**
 * Charge les 3 meilleures annonces pour un gardien selon le score d'affinité.
 *
 * Précepte 2026 : le nouveau gardien voit d'abord des annonces qui lui
 * correspondent (score d'affinité déjà calculé côté client) plutôt qu'une
 * checklist ou des KPI vides.
 *
 * Retour :
 *  - `topSits`         : 3 sits triés par score décroissant
 *  - `hasMinimumPool`  : true si ≥ 1 sit scorable (fallback sinon vers empty state)
 *  - `totalPublished`  : volume global d'annonces actives (pour l'empty state)
 *  - `hasPostalCode`   : vrai si le gardien a renseigné un code postal
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { computeAffinityScore, type AffinityResult } from "@/lib/affinityScore";

export interface AffinitySitCard {
  id: string;
  title: string | null;
  city: string | null;
  start_date: string | null;
  end_date: string | null;
  cover_photo_url: string | null;
  owner_first_name: string | null;
  pet_species: string[];
  affinity: AffinityResult;
}

interface Result {
  topSits: AffinitySitCard[];
  hasMinimumPool: boolean;
  hasPostalCode: boolean;
  totalPublished: number;
  isLoading: boolean;
}

export function useSitterTopAffinitySits(): Result {
  const { user } = useAuth();
  const userId = user?.id;

  const q = useQuery({
    queryKey: ["sitter-top-affinity-sits", userId],
    enabled: !!userId,
    staleTime: 10 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    queryFn: async () => {
      // 1. Profil gardien (préférences pour le score)
      const { data: sitter } = await supabase
        .from("sitter_profiles")
        .select(
          "animal_types, life_pace, languages, interests, work_during_sit, sensitivities, special_animal_skills, sitter_type, experience_years, travels_with_children, travels_with_own_animals",
        )
        .eq("user_id", userId!)
        .maybeSingle();

      const { data: profile } = await supabase
        .from("profiles")
        .select("postal_code")
        .eq("id", userId!)
        .maybeSingle();

      const hasPostalCode = !!profile?.postal_code;

      // 2. Volume total (pour l'empty state)
      const { count: totalPublished } = await supabase
        .from("sits")
        .select("id", { count: "exact", head: true })
        .eq("status", "published")
        .eq("accepting_applications", true);

      // 3. Pool candidat
      const todayIso = new Date().toISOString().slice(0, 10);
      const sitsRes: any = await supabase
        .from("sits")
        .select("id, title, city, start_date, end_date, cover_photo_url, user_id, property_id, accepts_sitter_pets, accepts_sitter_children")
        .eq("status", "published")
        .eq("accepting_applications", true)
        .gte("end_date", todayIso)
        .neq("user_id", userId!)
        .order("created_at", { ascending: false })
        .limit(30);
      const sits: any[] = sitsRes.data ?? [];

      if (sits.length === 0 || !sitter) {
        return {
          topSits: [] as AffinitySitCard[],
          totalPublished: totalPublished ?? 0,
          hasPostalCode,
        };
      }

      const ownerIds = Array.from(new Set(sits.map((s) => s.user_id).filter(Boolean))) as string[];
      const propertyIds = Array.from(new Set(sits.map((s) => s.property_id).filter(Boolean))) as string[];

      const [ownersRes, petsRes, ownerProfilesRes]: any[] = await Promise.all([
        supabase.from("profiles").select("id, first_name").in("id", ownerIds),
        propertyIds.length > 0
          ? supabase.from("pets").select("property_id, species, special_needs").in("property_id", propertyIds)
          : Promise.resolve({ data: [] }),
        supabase
          .from("owner_profiles")
          .select("user_id, preferred_sitter_types, home_ambiance, languages, interests, life_pace, presence_expected")
          .in("user_id", ownerIds),
      ]);

      const firstNameByOwner = new Map<string, string | null>(
        (ownersRes.data ?? []).map((p: any) => [p.id, p.first_name ?? null]),
      );
      const petsByProperty = new Map<string, { species: string | null; special_needs: string | null }[]>();
      for (const p of (petsRes.data ?? []) as any[]) {
        const arr = petsByProperty.get(p.property_id) ?? [];
        arr.push({ species: p.species, special_needs: p.special_needs });
        petsByProperty.set(p.property_id, arr);
      }
      const ownerPrefsById = new Map<string, any>(
        (ownerProfilesRes.data ?? []).map((o: any) => [o.user_id, o]),
      );

      const scored: AffinitySitCard[] = [];
      for (const sit of sits) {
        const ownerPrefs = ownerPrefsById.get(sit.user_id) ?? {};
        const pets = petsByProperty.get(sit.property_id) ?? [];
        const affinity = computeAffinityScore(
          {
            preferred_sitter_types: ownerPrefs.preferred_sitter_types,
            home_ambiance: ownerPrefs.home_ambiance,
            languages: ownerPrefs.languages,
            interests: ownerPrefs.interests,
            life_pace: ownerPrefs.life_pace,
            presence_expected: ownerPrefs.presence_expected,
            pets,
            accepts_sitter_pets: sit.accepts_sitter_pets ?? null,
            accepts_sitter_children: sit.accepts_sitter_children ?? null,
          },
          sitter as any,
        );
        if (!affinity) continue;
        scored.push({
          id: sit.id,
          title: sit.title,
          city: sit.city,
          start_date: sit.start_date,
          end_date: sit.end_date,
          cover_photo_url: sit.cover_photo_url,
          owner_first_name: firstNameByOwner.get(sit.user_id) ?? null,
          pet_species: pets.map((p) => p.species ?? "").filter(Boolean),
          affinity,
        });
      }

      scored.sort((a, b) => b.affinity.score - a.affinity.score);
      return {
        topSits: scored.slice(0, 3),
        totalPublished: totalPublished ?? 0,
        hasPostalCode,
      };
    },
  });

  const data = q.data;
  return {
    topSits: data?.topSits ?? [],
    hasMinimumPool: (data?.topSits.length ?? 0) >= 1,
    hasPostalCode: data?.hasPostalCode ?? false,
    totalPublished: data?.totalPublished ?? 0,
    isLoading: q.isLoading,
  };
}
