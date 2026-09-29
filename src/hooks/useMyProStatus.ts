import { fetchMyProfile } from "@/lib/myProfile";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Statut professionnel du membre connecté ('none' par défaut).
 * Sert à n'avertir que les membres non déclarés lorsqu'ils mentionnent un tarif.
 */
export function useMyProStatus(): string {
  const { user } = useAuth();
  const [status, setStatus] = useState<string>("none");

  useEffect(() => {
    let cancelled = false;
    if (!user) {
      setStatus("none");
      return;
    }
    void (async () => {
      const { data } = await fetchMyProfile(user.id!);
      if (!cancelled) setStatus(((data as any)?.pro_status as string) || "none");
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  return status;
}
