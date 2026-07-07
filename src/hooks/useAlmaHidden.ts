/**
 * useAlmaHidden — préférence utilisateur "Alma masquée".
 *
 * Lit et met à jour la colonne `profiles.alma_hidden`. Quand true, le dock
 * Alma disparaît complètement de l'UI. Réversible depuis Réglages > Alma.
 */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function useAlmaHidden(): {
  hidden: boolean;
  loading: boolean;
  setHidden: (v: boolean) => Promise<void>;
} {
  const { user } = useAuth();
  const [hidden, setHiddenState] = useState<boolean>(false);
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
        .select("alma_hidden" as any)
        .eq("id", user.id)
        .maybeSingle();
      if (cancelled) return;
      const raw = (data as any)?.alma_hidden;
      setHiddenState(raw === true);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const setHidden = async (v: boolean) => {
    if (!user?.id) return;
    setHiddenState(v);
    await supabase
      .from("profiles")
      .update({ alma_hidden: v } as any)
      .eq("id", user.id);
  };

  return { hidden, loading, setHidden };
}
