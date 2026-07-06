/**
 * useAlmaFirstMeeting — état "premier contact" avec Alma.
 *
 * Vérité serveur : colonne `profiles.alma_first_meeting_seen`. Si false,
 * on affiche l'accueil unique. `markSeen()` bascule le flag côté DB (et
 * met à jour l'état local optimiste). Aucune reréapparition possible.
 */
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface State {
  loading: boolean;
  seen: boolean | null;
}

export function useAlmaFirstMeeting() {
  const { user } = useAuth();
  const [{ loading, seen }, setState] = useState<State>({ loading: true, seen: null });

  useEffect(() => {
    if (!user?.id) {
      setState({ loading: false, seen: null });
      return;
    }
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("alma_first_meeting_seen" as any)
        .eq("id", user.id)
        .maybeSingle();
      if (cancelled) return;
      const val = (data as any)?.alma_first_meeting_seen;
      setState({ loading: false, seen: val === true });
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const markSeen = useCallback(async () => {
    if (!user?.id) return;
    setState((s) => ({ ...s, seen: true }));
    try {
      await supabase
        .from("profiles")
        .update({ alma_first_meeting_seen: true } as any)
        .eq("id", user.id);
    } catch {
      /* silent, l'état optimiste suffit pour la session */
    }
  }, [user?.id]);

  return {
    loading,
    shouldShow: !loading && seen === false,
    markSeen,
  };
}
