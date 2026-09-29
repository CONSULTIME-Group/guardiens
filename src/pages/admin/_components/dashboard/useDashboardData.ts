import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, subWeeks, startOfWeek, endOfWeek } from "date-fns";
import { fr } from "date-fns/locale";
import { postalToDept } from "@/lib/departments";
import { fetchAllRows } from "@/lib/admin/fetchAllRows";
import { reportAdminReadError, UNAVAILABLE_LABEL } from "@/lib/admin/readError";
import { statusChangeActivity } from "@/lib/admin/activityLabels";
import type { ActivityItem, WeeklySignup, DeptData } from "./types";

/** Comptes supprimés exclus de tous les compteurs de membres (lot A10). */
export const NOT_DELETED_FILTER = "account_status.is.null,account_status.neq.deleted";

export interface KeyFigures {
  totalUsers: number;
  newThisWeek: number;
  /** Gardes en status in_progress (une garde démarrée passe en in_progress). */
  ongoingSits: number;
  /** Gardes confirmées, pas encore démarrées. */
  confirmedUpcoming: number;
  /** Cinq dernières inscriptions de la semaine, lues dans la même requête que le compte. */
  recentSignups: ActivityItem[];
}

/**
 * Lot A13 : chiffres clés, trois lectures seulement. Les gardes en cours et
 * confirmées sont lues en une requête (statuts in_progress et confirmed),
 * puis comptées ici. Les annonces en ligne viennent de admin_liquidity_snapshot.
 */
export function useKeyFigures() {
  return useQuery<KeyFigures>({
    queryKey: ["admin_overview_key_figures"],
    staleTime: 30_000,
    queryFn: async () => {
      const oneWeekAgo = new Date(Date.now() - 7 * 86400_000).toISOString();
      const [total, week, sits] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }).or(NOT_DELETED_FILTER),
        supabase.from("profiles").select("id, first_name, role, created_at", { count: "exact" }).gte("created_at", oneWeekAgo).or(NOT_DELETED_FILTER).order("created_at", { ascending: false }).limit(5),
        supabase.from("sits").select("status").in("status", ["in_progress", "confirmed"]),
      ]);
      const failed = [total, week, sits].find((r: any) => r.error);
      if (failed) { reportAdminReadError("Vue d'ensemble : chiffres clés", failed.error); throw failed.error; }
      const rows = (sits.data ?? []) as Array<{ status: string }>;
      return {
        totalUsers: total.count ?? 0,
        newThisWeek: week.count ?? 0,
        ongoingSits: rows.filter((r) => r.status === "in_progress").length,
        confirmedUpcoming: rows.filter((r) => r.status === "confirmed").length,
        recentSignups: ((week.data ?? []) as any[]).map((p) => ({
          id: `profile-${p.id}`,
          text: `${p.first_name || "Quelqu'un"} s'est inscrit(e) (${p.role === "owner" ? "propriétaire" : p.role === "both" ? "propriétaire et gardien" : "gardien"})`,
          time: p.created_at,
          link: "/admin/users",
          type: "inscription" as const,
        })),
      };
    },
  });
}

/** Activité récente : quatre lectures, indépendantes des chiffres clés. */
export function useRecentActivity() {
  return useQuery<ActivityItem[]>({
    queryKey: ["admin_overview_activity"],
    staleTime: 30_000,
    queryFn: async () => {
      const results = await Promise.all([
        supabase.from("reviews").select("id, overall_rating, created_at, reviewer:profiles!reviews_reviewer_id_fkey(first_name), reviewee:profiles!reviews_reviewee_id_fkey(first_name)").order("created_at", { ascending: false }).limit(5),
        supabase.rpc("admin_get_recent_applications_activity", { p_limit: 5 }),
        supabase.rpc("admin_get_recent_sit_status_changes" as any, { p_limit: 8 }),
        supabase.rpc("admin_get_recent_account_deletions" as any, { p_limit: 5 }),
      ]);
      const failed = results.find((r: any) => r.error);
      if (failed) { reportAdminReadError("Vue d'ensemble : activité récente", (failed as any).error); throw (failed as any).error; }
      const [{ data: recentReviews }, { data: recentApplications }, { data: recentStatusChanges }, { data: recentDeletions }] = results as any[];
      return buildActivity({ recentReviews, recentApplications, recentStatusChanges, recentDeletions });
    },
  });
}

export function buildActivity({ recentReviews, recentApplications, recentStatusChanges, recentDeletions }: {
  recentReviews?: any[] | null; recentApplications?: any[] | null; recentStatusChanges?: any[] | null; recentDeletions?: any[] | null;
}): ActivityItem[] {
  const activityItems: ActivityItem[] = [];
  (recentStatusChanges || []).forEach((h: any) => {
    const ownerName = h.owner_first_name || "Un propriétaire";
    const city = h.owner_city ? ` à ${h.owner_city}` : "";
    const title = h.sit_title ? ` « ${h.sit_title} »` : "";
    const act = statusChangeActivity(h.old_status ?? null, h.new_status);
    if (!act) return;
    activityItems.push({ id: `status-${h.id}`, text: `${ownerName} ${act.verb}${title}${city}`, time: h.changed_at, link: `/admin/listings`, type: act.kind });
  });
  (recentReviews || []).forEach((r: any) => {
    const reviewerName = r.reviewer?.first_name || "Quelqu'un";
    const revieweeName = r.reviewee?.first_name || "un membre";
    activityItems.push({ id: `review-${r.id}`, text: `${reviewerName} a laissé un avis ${r.overall_rating}/5 à ${revieweeName}`, time: r.created_at, link: `/admin/reviews`, type: "avis" });
  });
  (recentApplications || []).forEach((a: any) => {
    activityItems.push({ id: `app-${a.id}`, text: `Nouvelle candidature de ${a.sitter_first_name || "Un gardien"} pour ${a.sit_title || "une garde"}`, time: a.created_at, link: `/admin/sits-management`, type: "candidature" });
  });
  (recentDeletions || []).forEach((d: any) => {
    const name = d.first_name || "Un membre";
    const city = d.city ? ` (${d.city})` : "";
    const scheduled = d.scheduled_for ? new Date(d.scheduled_for) : null;
    const daysLeft = scheduled ? Math.max(0, Math.ceil((scheduled.getTime() - Date.now()) / 86400000)) : null;
    const suffix = d.status === "pending" && daysLeft !== null
      ? `, suppression effective dans ${daysLeft}j`
      : d.status === "cancelled" ? ", annulée"
      : d.status === "completed" ? ", finalisée"
      : "";
    activityItems.push({ id: `del-${d.id}`, text: `${name}${city} a demandé la suppression de son compte${suffix}`, time: d.requested_at, link: `/admin/demandes-suppression`, type: "suppression" });
  });
  activityItems.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
  return activityItems.slice(0, 12);
}

interface TrendsData {
  loading: boolean;
  error: string | null;
  weeklySignups: WeeklySignup[];
  deptData: DeptData[];
  partial: boolean;
}

/** Tendances : lecture complète de profiles, lancée seulement quand `enabled`. */
export function useDashboardTrends(enabled: boolean): TrendsData {
  const [state, setState] = useState<TrendsData>({ loading: false, error: null, weeklySignups: [], deptData: [], partial: false });
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    setState((s) => ({ ...s, loading: true, error: null }));
    (async () => {
      try {
        const profilesRes = await fetchAllRows<{ created_at: string; role: string; id: string; postal_code: string | null }>((from, to) =>
          supabase.from("profiles").select("created_at, role, id, postal_code").or(NOT_DELETED_FILTER).order("id").range(from, to));
        const profilesData = profilesRes.rows;
        const weeks: WeeklySignup[] = [];
        for (let i = 11; i >= 0; i--) {
          const weekStart = startOfWeek(subWeeks(new Date(), i), { weekStartsOn: 1 });
          const weekEnd = endOfWeek(subWeeks(new Date(), i), { weekStartsOn: 1 });
          const weekProfiles = profilesData.filter(p => {
            const d = new Date(p.created_at);
            return d >= weekStart && d <= weekEnd;
          });
          weeks.push({
            week: format(weekStart, "d MMM", { locale: fr }),
            sitters: weekProfiles.filter(p => p.role === "sitter" || p.role === "both").length,
            owners: weekProfiles.filter(p => p.role === "owner" || p.role === "both").length,
          });
        }
        const deptMap: Record<string, number> = {};
        profilesData.forEach(p => {
          const dept = postalToDept(p.postal_code);
          deptMap[dept] = (deptMap[dept] || 0) + 1;
        });
        const nonRenseigne = deptMap["Non renseigné"] || 0;
        delete deptMap["Non renseigné"];
        const sorted = Object.entries(deptMap)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 10)
          .map(([dept, count]) => ({ dept, count }));
        if (nonRenseigne > 0) sorted.push({ dept: "Non renseigné", count: nonRenseigne });
        if (!cancelled) setState({ loading: false, error: null, weeklySignups: weeks, deptData: sorted, partial: profilesRes.truncated });
      } catch (e) {
        reportAdminReadError("Vue d'ensemble : tendances", e);
        if (!cancelled) setState((s) => ({ ...s, loading: false, error: UNAVAILABLE_LABEL }));
      }
    })();
    return () => { cancelled = true; };
  }, [enabled]);
  return state;
}
