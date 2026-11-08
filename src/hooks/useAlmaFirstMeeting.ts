/**
 * useAlmaFirstMeeting, état "premier contact" avec Alma.
 *
 * Vérité serveur : colonne `profiles.alma_first_meeting_seen`. Si false,
 * on affiche l'accueil unique.
 * - `recordSeen()` (lot L0, 08/11/2026) : enregistre la rencontre dès
 *   l'affichage, la carte reste visible pendant la visite. Avant L0, seul un
 *   clic l'enregistrait : un membre qui faisait défiler retrouvait la carte en
 *   haut à chaque visite.
 * - `markSeen()` : enregistre et masque tout de suite (bouton principal, ×).
 */
import { fetchMyProfile, patchMyProfileCache } from "@/lib/myProfile";
import { useCallback, useEffect, useRef, useState } from "react";
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
      const { data } = await fetchMyProfile(user.id!);
      if (cancelled) return;
      const val = (data as any)?.alma_first_meeting_seen;
      setState({ loading: false, seen: val === true });
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const persistedRef = useRef(false);

  const persistSeen = useCallback(async () => {
    if (!user?.id || persistedRef.current) return;
    persistedRef.current = true;
    patchMyProfileCache(user.id, { alma_first_meeting_seen: true });
    try {
      await supabase
        .from("profiles")
        .update({ alma_first_meeting_seen: true } as any)
        .eq("id", user.id);
    } catch {
      /* silent, l'état optimiste suffit pour la session */
    }
  }, [user?.id]);

  const recordSeen = useCallback(() => {
    void persistSeen();
  }, [persistSeen]);

  const markSeen = useCallback(async () => {
    if (!user?.id) return;
    setState((s) => ({ ...s, seen: true }));
    await persistSeen();
  }, [user?.id, persistSeen]);

  return {
    loading,
    shouldShow: !loading && seen === false,
    recordSeen,
    markSeen,
  };
}
