/**
 * useProfileCompletionMissing — champs manquants du barème de complétion,
 * calculés côté client avec le même barème que la fonction SQL
 * `calculate_profile_completion` (parité fixée par src/lib/profileCompletion.ts).
 *
 * Sert au bloc « prochain pas » du rail : au-dessus de 90 % de complétion,
 * on nomme précisément ce qui manque plutôt qu'une invitation générique.
 * Silencieux en cas d'erreur : la phrase de repli prend le relais.
 */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  computeOwnerCompletion,
  computeSitterCompletion,
  type CompletionItem,
  type ProfileRole,
} from "@/lib/profileCompletion";

const PROFILE_FIELDS =
  "first_name, postal_code, city, country, avatar_url, bio, identity_verified";

export const useProfileCompletionMissing = (
  role: ProfileRole,
  userId?: string,
): CompletionItem[] => {
  const [missing, setMissing] = useState<CompletionItem[]>([]);

  useEffect(() => {
    if (!userId) {
      setMissing([]);
      return;
    }
    let cancelled = false;

    const load = async () => {
      try {
        const { data: profile } = await supabase
          .from("profiles")
          .select(PROFILE_FIELDS)
          .eq("id", userId)
          .maybeSingle();
        if (!profile) {
          if (!cancelled) setMissing([]);
          return;
        }

        if (role === "sitter") {
          const [{ data: sp }, { count: galleryCount }] = await Promise.all([
            supabase
              .from("sitter_profiles")
              .select(
                "competences, lifestyle, geographic_radius, interests, languages, life_pace, animal_types",
              )
              .eq("user_id", userId)
              .maybeSingle(),
            supabase
              .from("sitter_gallery")
              .select("id", { count: "exact", head: true })
              .eq("user_id", userId),
          ]);
          const result = computeSitterCompletion({
            role: "sitter",
            ...profile,
            competences: sp?.competences ?? null,
            lifestyle: sp?.lifestyle ?? null,
            geographic_radius: sp?.geographic_radius ?? null,
            interests: sp?.interests ?? null,
            languages: sp?.languages ?? null,
            life_pace: sp?.life_pace ?? null,
            animal_types: sp?.animal_types ?? null,
            sitter_gallery_count: galleryCount ?? 0,
          });
          if (!cancelled) setMissing(result.missing);
          return;
        }

        const [{ data: op }, { data: properties }, { count: galleryCount }] =
          await Promise.all([
            supabase
              .from("owner_profiles")
              .select(
                "competences, interests, languages, life_pace, home_ambiance, preferred_sitter_types",
              )
              .eq("user_id", userId)
              .maybeSingle(),
            supabase.from("properties").select("id, description").eq("user_id", userId),
            supabase
              .from("owner_gallery")
              .select("id", { count: "exact", head: true })
              .eq("user_id", userId),
          ]);

        const propertyIds = (properties ?? []).map((p) => p.id);
        let hasPet = false;
        if (propertyIds.length > 0) {
          const { count: petsCount } = await supabase
            .from("pets")
            .select("id", { count: "exact", head: true })
            .in("property_id", propertyIds);
          hasPet = (petsCount ?? 0) > 0;
        }

        const result = computeOwnerCompletion({
          role: "owner",
          ...profile,
          owner_competences: op?.competences ?? null,
          interests: op?.interests ?? null,
          languages: op?.languages ?? null,
          life_pace: op?.life_pace ?? null,
          home_ambiance: op?.home_ambiance ?? null,
          preferred_sitter_types: op?.preferred_sitter_types ?? null,
          has_pet: hasPet,
          property_description:
            (properties ?? []).find((p) => (p.description?.length ?? 0) >= 50)
              ?.description ?? null,
          has_owner_gallery: (galleryCount ?? 0) > 0,
        });
        if (!cancelled) setMissing(result.missing);
      } catch {
        // Silencieux : la phrase de repli prend le relais.
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [role, userId]);

  return missing;
};
