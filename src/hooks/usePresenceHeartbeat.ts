/**
 * Met à jour `profiles.last_seen_at` toutes les 60 s tant que la fenêtre est visible.
 * À utiliser une seule fois (dans AppLayout par ex.).
 */

import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export const usePresenceHeartbeat = () => {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    const ping = async () => {
      if (document.visibilityState !== "visible") return;
      try {
        await supabase.rpc("mark_user_seen");
      } catch {
        /* silent */
      }
    };

    ping();
    const interval = setInterval(ping, 60_000);
    const onVis = () => { if (document.visibilityState === "visible") ping(); };
    document.addEventListener("visibilitychange", onVis);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [user]);
};
