/**
 * Lot ONB1 : vrai si le compte relève du parcours d'arrivée v2.
 *
 * Critère principal : compte créé après la bascule du flag arrival_v2
 * (même règle que isArrivalV2Account). Critère de secours : le membre a
 * cliqué « Faisons connaissance » sur /bienvenue (arrival_welcome_seen_at).
 *
 * Avant ONB1, seul le second critère comptait : un compte v2 qui n'avait
 * pas cliqué le bouton de /bienvenue revoyait l'ancienne modale
 * d'onboarding (17 finisseurs v2 sur 22 l'ont revue, 10 l'ont refaite).
 *
 * `ready` reste faux tant que le profil et le flag ne sont pas lus : les
 * consommateurs attendent avant d'afficher l'ancienne modale, ce qui évite
 * qu'elle apparaisse une fraction de seconde à un compte v2.
 * Lectures : profil partagé (cache my-profile) et flag en cache module.
 */
import { useEffect, useState } from "react";
import { fetchMyProfile } from "@/lib/myProfile";
import { useFeatureFlag } from "@/hooks/useFeatureFlag";
import { ARRIVAL_FLAG, isArrivalV2Account } from "@/lib/arrivalFlag";

export interface ArrivalV2AccountState {
  isV2: boolean;
  ready: boolean;
}

/** Règle pure, testée à part. */
export function resolveArrivalV2Account(
  flag: { enabled: boolean; appliesSince: string | null },
  profile: { created_at?: string | null; arrival_welcome_seen_at?: string | null } | null,
): boolean {
  if (profile?.arrival_welcome_seen_at) return true;
  return isArrivalV2Account(flag, profile?.created_at ?? null);
}

export function useArrivalV2Account(userId: string | null | undefined): ArrivalV2AccountState {
  const flag = useFeatureFlag(ARRIVAL_FLAG);
  const [profile, setProfile] = useState<{ created_at?: string | null; arrival_welcome_seen_at?: string | null } | null>(null);
  const [profileReady, setProfileReady] = useState(false);

  useEffect(() => {
    if (!userId) { setProfile(null); setProfileReady(false); return; }
    let cancelled = false;
    setProfileReady(false);
    fetchMyProfile(userId)
      .then(({ data }) => {
        if (cancelled) return;
        setProfile((data as { created_at?: string | null; arrival_welcome_seen_at?: string | null } | null) ?? null);
        setProfileReady(true);
      })
      .catch(() => { if (!cancelled) setProfileReady(true); });
    return () => { cancelled = true; };
  }, [userId]);

  return {
    isV2: resolveArrivalV2Account(flag, profile),
    ready: !!userId && profileReady && !flag.loading,
  };
}
