/**
 * useFirstNearbyMission — récupère la première mission d'entraide ouverte
 * du département de l'utilisateur (exclut ses propres missions).
 * Partagé entre dashboards gardien et propriétaire pour le volet DONNER
 * de la section entraide bidimensionnelle.
 */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface FirstNearbyMission {
  id: string;
  title: string | null;
  category: string | null;
  city: string | null;
  postal_code: string | null;
  date_needed: string | null;
}

export function useFirstNearbyMission(userId: string | undefined) {
  const [mission, setMission] = useState<FirstNearbyMission | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!userId) {
      setMission(null);
      return;
    }
    let cancelled = false;

    const run = async () => {
      setLoading(true);
      try {
        const { data: profile } = await supabase
          .from("profiles")
          .select("postal_code")
          .eq("id", userId)
          .maybeSingle();

        const dept = profile?.postal_code?.slice(0, 2);
        if (!dept) {
          if (!cancelled) setMission(null);
          return;
        }

        const { data: missions } = await supabase
          .from("small_missions")
          .select("id, title, category, city, postal_code, date_needed, user_id, status")
          .eq("status", "open")
          .order("created_at", { ascending: false })
          .limit(20);

        const first = (missions || [])
          .filter((m: any) => m.user_id !== userId && m.postal_code?.startsWith(dept))
          .slice(0, 1)[0] as FirstNearbyMission | undefined;

        if (!cancelled) setMission(first ?? null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void run();
    return () => { cancelled = true; };
  }, [userId]);

  return { mission, loading };
}
