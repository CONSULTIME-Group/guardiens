/**
 * Lot E21 (25/10/2026) : nombre de personnes prévenues par les vagues d'un
 * besoin, pour la barre basse de la fiche (« {N} personnes prévenues »).
 * Lu par mission_notified_count (migration 0103), qui renvoie le seul nombre.
 * Sans réponse lisible, la barre garde « Je peux » seul.
 */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export function notifiedLine(count: number | null | undefined): string | null {
  if (typeof count !== "number" || !Number.isFinite(count) || count <= 0) return null;
  return count === 1 ? "1 personne prévenue" : `${count} personnes prévenues`;
}

export function responsesLine(responses: number): string {
  if (responses <= 0) return "Vous seriez la première réponse";
  return responses === 1 ? "1 personne a dit « Je peux »" : `${responses} personnes ont dit « Je peux »`;
}

export function useMissionNotifiedCount(missionId: string | null | undefined): number | null {
  const [count, setCount] = useState<number | null>(null);
  useEffect(() => {
    if (!missionId) return;
    let cancelled = false;
    (supabase as any)
      .rpc("mission_notified_count", { p_mission_id: missionId })
      .then(({ data, error }: { data: unknown; error: unknown }) => {
        if (!cancelled) setCount(!error && typeof data === "number" ? data : null);
      }, () => { if (!cancelled) setCount(null); });
    return () => { cancelled = true; };
  }, [missionId]);
  return count;
}
