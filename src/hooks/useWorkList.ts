import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useAdmin } from "@/hooks/useAdmin";
import { ADMIN_BADGES_REFRESH_EVENT } from "@/hooks/useAdminBadges";
import { reportAdminReadError } from "@/lib/admin/readError";
import { buildWorkList, type WorkListModel, type WorkListRaw } from "@/lib/admin/pilotage";

/**
 * Lot ADM14 (lot 3 du plan de l'arène admin du 09/11/2026) : la liste de
 * travail est lue une fois (public.admin_work_list, mise en forme par
 * buildWorkList) et partagée par la vue d'ensemble, son état du site, la
 * pastille du menu et le bouton du menu mobile. Rangée sous
 * « admin_dashboard_snapshot » : toute carte d'action qui invalide ce préfixe
 * rafraîchit aussi la pastille.
 */
export const WORK_LIST_QUERY_KEY = ["admin_dashboard_snapshot", "work-list"] as const;

export async function fetchWorkList(): Promise<WorkListModel> {
  const { data, error } = await supabase.rpc("admin_work_list");
  if (error) {
    reportAdminReadError("Vue d'ensemble : liste de travail", error);
    throw error;
  }
  return buildWorkList(data as unknown as WorkListRaw);
}

export interface WorkListState {
  model: WorkListModel | null;
  loading: boolean;
  error: unknown;
}

/**
 * @param adminConfirmed état admin déjà connu de l'appelant (AdminLayout le
 * passe avant sa garde). Sinon, lu via useAdmin.
 */
export function useWorkList(adminConfirmed?: boolean): WorkListState {
  const { user } = useAuth();
  const admin = useAdmin();
  const isAdmin = adminConfirmed ?? (admin.isAdmin && !admin.loading);
  const q = useQuery<WorkListModel>({
    queryKey: WORK_LIST_QUERY_KEY,
    queryFn: fetchWorkList,
    enabled: !!user?.id && isAdmin === true,
    staleTime: 30_000,
    // admin_site_health compte les pages vues de 8 jours : une relecture toutes
    // les 2 minutes suffit à la pastille comme à la page.
    refetchInterval: 120_000,
    refetchOnWindowFocus: true,
    retry: 1,
  });
  // Une action dans une file (contact, signalement, RGPD, avis…) appelle
  // refreshAdminBadges : la liste et la pastille se relisent.
  const qc = useQueryClient();
  useEffect(() => {
    const onRefresh = () => { void qc.invalidateQueries({ queryKey: WORK_LIST_QUERY_KEY }, { cancelRefetch: false }); };
    window.addEventListener(ADMIN_BADGES_REFRESH_EVENT, onRefresh);
    return () => window.removeEventListener(ADMIN_BADGES_REFRESH_EVENT, onRefresh);
  }, [qc]);
  return { model: q.data ?? null, loading: q.isLoading, error: q.error };
}

/**
 * Texte de la pastille unique : le nombre de lignes de la liste. « ? » quand
 * la lecture échoue, ou quand une source manque et que la liste lue est vide
 * (jamais un 0 trompeur) ; rien quand la liste est vide et complète.
 */
export function workListBadgeText(model: WorkListModel | null, failed: boolean): string | null {
  if (!model) return failed ? "?" : null;
  const n = model.items.length;
  if (n === 0) return model.unavailable.length > 0 ? "?" : null;
  return String(n);
}

/** Libellé lu par les lecteurs d'écran avec la pastille. */
export function workListBadgeLabel(text: string): string {
  if (text === "?") return "Liste de travail indisponible";
  return text === "1" ? "1 ligne dans la liste de travail" : `${text} lignes dans la liste de travail`;
}
