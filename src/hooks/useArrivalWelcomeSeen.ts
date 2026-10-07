/**
 * Lot 1 : vrai si le membre a cliqué « Faisons connaissance » sur /bienvenue
 * (profiles.arrival_welcome_seen_at). Lecture partagée du profil (cache
 * my-profile déjà rempli par la session), aucune requête de plus.
 */
import { useEffect, useState } from "react";
import { fetchMyProfile } from "@/lib/myProfile";

export function useArrivalWelcomeSeen(userId: string | null | undefined): boolean {
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    if (!userId) { setSeen(false); return; }
    let cancelled = false;
    fetchMyProfile(userId)
      .then(({ data }) => { if (!cancelled) setSeen(!!(data as { arrival_welcome_seen_at?: string | null } | null)?.arrival_welcome_seen_at); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [userId]);
  return seen;
}
