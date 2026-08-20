/**
 * Critères réellement manquants pour franchir le seuil de candidature.
 * Sert uniquement à formuler la mention sous le bouton « Postuler », pour ne
 * jamais afficher un texte figé : le gardien doit lire ce qui manque,
 * nommément, pas un compteur abstrait.
 */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  APPLY_GATE_FIELDS,
  missingFor,
} from "@/components/profile/CompleteProfileToApplyModal";

export interface ApplyGateMissing {
  count: number;
  /** Titres des champs manquants, dans l'ordre du barème. */
  titles: string[];
}

export function useApplyGateMissingCount(enabled: boolean): ApplyGateMissing | null {
  const { user } = useAuth();
  const [missingInfo, setMissingInfo] = useState<ApplyGateMissing | null>(null);

  useEffect(() => {
    if (!enabled || !user) {
      setMissingInfo(null);
      return;
    }
    let cancelled = false;
    (async () => {
      const [profileRes, sitterRes] = await Promise.all([
        supabase
          .from("profiles")
          .select("first_name, postal_code, city, country, avatar_url, bio")
          .eq("id", user.id)
          .maybeSingle(),
        supabase
          .from("sitter_profiles")
          .select("geographic_radius, competences, lifestyle, interests, languages, life_pace, animal_types")
          .eq("user_id", user.id)
          .maybeSingle(),
      ]);
      if (cancelled) return;
      const p: any = profileRes.data || {};
      const s: any = sitterRes.data || {};
      const missing = missingFor({
        first_name: p.first_name || "",
        postal_code: p.postal_code || "",
        city: p.city || "",
        country: p.country || "FR",
        avatar_url: p.avatar_url || "",
        bio: p.bio || "",
        geographic_radius: s.geographic_radius || 0,
        competences: s.competences || [],
        lifestyle: s.lifestyle || [],
        interests: s.interests || [],
        languages: s.languages || [],
        life_pace: s.life_pace || "",
        animal_types: s.animal_types || [],
        // La galerie n'entre pas dans la mention sous le bouton : elle n'est
        // proposée qu'en cas d'élargissement du barème.
        has_gallery: true,
      });
      const fields = APPLY_GATE_FIELDS.filter((f) => missing[f.key]);
      setMissingInfo({ count: fields.length, titles: fields.map((f) => f.title) });
    })();
    return () => {
      cancelled = true;
    };
  }, [enabled, user]);

  return missingInfo;
}

export default useApplyGateMissingCount;
