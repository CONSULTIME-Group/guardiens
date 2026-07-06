/**
 * useAlmaFrequency — lit la préférence `profiles.alma_frequency` de l'utilisateur.
 *
 * Valeurs : "silent" (Alma ne parle jamais spontanément), "balanced" (défaut),
 * "talkative" (Alma parle davantage, cross-page whispers — activé en Pass 4).
 *
 * Retourne "balanced" tant que la valeur n'est pas chargée, pour ne pas masquer
 * l'UI par défaut. `silent` = kill switch dur pour toutes les bulles proactives.
 */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type AlmaFrequency = "silent" | "low" | "balanced" | "talkative";

export function useAlmaFrequency(): {
  frequency: AlmaFrequency;
  loading: boolean;
  setFrequency: (f: AlmaFrequency) => Promise<void>;
} {
  const { user } = useAuth();
  const [frequency, setFrequencyState] = useState<AlmaFrequency>("balanced");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("alma_frequency" as any)
        .eq("id", user.id)
        .maybeSingle();
      if (cancelled) return;
      const raw = (data as any)?.alma_frequency;
      if (raw === "silent" || raw === "balanced" || raw === "talkative") {
        setFrequencyState(raw);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const setFrequency = async (f: AlmaFrequency) => {
    if (!user?.id) return;
    setFrequencyState(f);
    await supabase
      .from("profiles")
      .update({ alma_frequency: f } as any)
      .eq("id", user.id);
  };

  return { frequency, loading, setFrequency };
}
