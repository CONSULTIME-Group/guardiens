import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useAdmin } from "@/hooks/useAdmin";

/**
 * Pastilles du menu admin. Une seule lecture : la fonction SQL
 * admin_menu_badges() (SECURITY DEFINER, réservée aux admins) renvoie toutes
 * les files, avec les mêmes définitions que les pages cibles.
 */
export interface AdminBadges {
  verifications: number;
  experiences: number;
  skills: number;
  reviewsModeration: number;
  reviewDisputes: number;
  reports: number;
  contactMessages: number;
  adminMessageFailed: number;
  errors: number;
  guideRequests: number;
  analysisRequests: number;
  deletionRequests: number;
  sitsToStaff: number;
}

export const BADGE_KEYS: (keyof AdminBadges)[] = [
  "verifications", "experiences", "skills", "reviewsModeration", "reviewDisputes",
  "reports", "contactMessages", "adminMessageFailed", "errors", "guideRequests",
  "analysisRequests", "deletionRequests", "sitsToStaff",
];

/** Préfixe commun : invalider ce préfixe rafraîchit les pastilles de tout utilisateur. */
export const ADMIN_BADGES_QUERY_KEY = ["admin-badges"] as const;
export const adminBadgesQueryKey = (userId: string | undefined) =>
  [...ADMIN_BADGES_QUERY_KEY, userId] as const;

export const ADMIN_BADGES_REFRESH_EVENT = "admin-badges-refresh";

/** À appeler après toute action qui change une file admin. */
export function refreshAdminBadges(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(ADMIN_BADGES_REFRESH_EVENT));
  }
}

export async function fetchAdminBadges(): Promise<AdminBadges> {
  const { data, error } = await supabase.rpc("admin_menu_badges" as any);
  if (error) throw error;
  const raw = (data ?? {}) as Record<string, unknown>;
  const out = {} as AdminBadges;
  for (const k of BADGE_KEYS) {
    const v = Number(raw[k]);
    out[k] = Number.isFinite(v) ? v : 0;
  }
  return out;
}

export interface AdminBadgesState {
  badges: Partial<AdminBadges>;
  /** true : lecture en échec, les pastilles affichent « ? », jamais 0. */
  unavailable: boolean;
}

/**
 * @param adminConfirmed état admin déjà connu de l'appelant (AdminLayout le
 * passe avant sa garde). Sinon, lu via useAdmin.
 */
export function useAdminBadges(adminConfirmed?: boolean): AdminBadgesState {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const admin = useAdmin();
  const userId = user?.id;
  const isAdmin = adminConfirmed ?? (admin.isAdmin && !admin.loading);

  const { data, isError, error } = useQuery({
    queryKey: adminBadgesQueryKey(userId),
    queryFn: fetchAdminBadges,
    enabled: !!userId && isAdmin === true,
    staleTime: 30_000,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
    retry: 1,
  });

  useEffect(() => {
    if (isError) console.error("[admin-badges] lecture impossible", error);
  }, [isError, error]);

  useEffect(() => {
    const handler = () => {
      // Chaque instance du hook écoute l'événement : sans cancelRefetch:false,
      // la seconde invalidation annulerait la première et doublerait l'appel.
      queryClient.invalidateQueries({ queryKey: ADMIN_BADGES_QUERY_KEY }, { cancelRefetch: false });
    };
    window.addEventListener(ADMIN_BADGES_REFRESH_EVENT, handler);
    return () => window.removeEventListener(ADMIN_BADGES_REFRESH_EVENT, handler);
  }, [queryClient]);

  return { badges: data ?? {}, unavailable: isError && !data };
}
