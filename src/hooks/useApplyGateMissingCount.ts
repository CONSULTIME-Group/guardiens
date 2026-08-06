/**
 * Nombre de critères réellement manquants pour franchir le seuil de candidature.
 * Sert uniquement à formuler la mention sous le bouton « Postuler », pour ne
 * jamais afficher un texte figé.
 */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  APPLY_GATE_FIELDS,
  missingFor,
} from "@/components/profile/CompleteProfileToApplyModal";

export function useApplyGateMissingCount(enabled: boolean): number | null {
  const { user } = useAuth();
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    if (!enabled || !user) {
      setCount(null);
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
          .select("geographic_radius, competences")
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
      });
      setCount(APPLY_GATE_FIELDS.filter((f) => missing[f.key]).length);
    })();
    return () => {
      cancelled = true;
    };
  }, [enabled, user]);

  return count;
}

export default useApplyGateMissingCount;
