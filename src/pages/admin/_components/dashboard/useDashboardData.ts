import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format, subWeeks, startOfWeek, endOfWeek } from "date-fns";
import { fr } from "date-fns/locale";
import { postalToDept } from "@/lib/departments";
import { fetchAllRows } from "@/lib/admin/fetchAllRows";
import { reportAdminReadError, UNAVAILABLE_LABEL } from "@/lib/admin/readError";
import { statusChangeActivity } from "@/lib/admin/activityLabels";
import type {
  Stats, ActivityItem, WeeklySignup, DeptData,
} from "./types";
import { MONTHLY_SUBSCRIPTION_EUR } from "./types";

interface DashboardData {
  loading: boolean;
  /** Lecture en échec : l'écran affiche une erreur, jamais des zéros. */
  error: string | null;
  stats: Stats | null;
  activity: ActivityItem[];
}

/** Comptes supprimés exclus de tous les compteurs de membres (lot A10). */
export const NOT_DELETED_FILTER = "account_status.is.null,account_status.neq.deleted";

/**
 * Centralise les requêtes Supabase du Dashboard admin. Les tendances (lecture
 * complète de profiles) vivent dans useDashboardTrends, chargé à l'ouverture.
 */
export function useDashboardData(): DashboardData {
  const [stats, setStats] = useState<Stats | null>(null);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAll = async () => {
      try {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

      const results = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }).or(NOT_DELETED_FILTER),
        supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "owner").or(NOT_DELETED_FILTER),
        supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "sitter").or(NOT_DELETED_FILTER),
        supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "both").or(NOT_DELETED_FILTER),
        supabase.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", oneWeekAgo.toISOString()).or(NOT_DELETED_FILTER),
        supabase.from("sits").select("id", { count: "exact", head: true }).eq("status", "published"),
        // Une garde démarrée passe en in_progress (auto-transition-sits).
        supabase.from("sits").select("id", { count: "exact", head: true }).eq("status", "in_progress"),
        supabase.from("sits").select("id", { count: "exact", head: true }).eq("status", "confirmed"),
        supabase.from("profiles").select("id, first_name, role, created_at").or(NOT_DELETED_FILTER).order("created_at", { ascending: false }).limit(5),
        supabase.from("reviews").select("id, overall_rating, created_at, reviewer_id, reviewee_id, sit_id, reviewer:profiles!reviews_reviewer_id_fkey(first_name), reviewee:profiles!reviews_reviewee_id_fkey(first_name)").order("created_at", { ascending: false }).limit(5),
        supabase.rpc("admin_get_recent_applications_activity", { p_limit: 5 }),
        supabase.from("subscriptions").select("id", { count: "exact", head: true }).eq("status", "active"),
        supabase.rpc("admin_get_recent_sit_status_changes" as any, { p_limit: 8 }),
        supabase.rpc("admin_get_recent_account_deletions" as any, { p_limit: 5 }),
      ]);
      const failed = results.find((r: any) => r.error);
      if (failed) throw (failed as any).error;
      const [
        { count: totalUsers }, { count: owners }, { count: sitters }, { count: bothCount },
        { count: newThisWeek }, { count: activeListings }, { count: ongoingSits }, { count: confirmedUpcoming },
        { data: recentProfiles }, { data: recentReviews }, { data: recentApplications },
        { count: activeSubscriptions }, { data: recentStatusChanges }, { data: recentDeletions },
      ] = results as any[];

      // Avis : moyenne exacte, lecture paginée (l'API coupe à 1 000 lignes).
      const reviewsRes = await fetchAllRows<{ overall_rating: number }>((from, to) =>
        supabase.from("reviews").select("overall_rating").order("id").range(from, to));
      const reviewsData = reviewsRes.rows;
      const totalReviews = reviewsData.length;
      const avgRating = totalReviews > 0
        ? reviewsData.reduce((sum, r) => sum + r.overall_rating, 0) / totalReviews
        : 0;

      const monthRevenue = Math.round((activeSubscriptions || 0) * MONTHLY_SUBSCRIPTION_EUR);

      setStats({
        totalUsers: totalUsers || 0,
        owners: owners || 0,
        sitters: sitters || 0,
        both: bothCount || 0,
        newThisWeek: newThisWeek || 0,
        activeListings: activeListings || 0,
        ongoingSits: ongoingSits || 0,
        confirmedUpcoming: confirmedUpcoming || 0,
        totalReviews,
        avgRating: Math.round(avgRating * 10) / 10,
        monthRevenue,
      });

      // Activité
      const activityItems: ActivityItem[] = [];

      (recentProfiles || []).forEach(p => {
        const roleLabel = p.role === "owner" ? "propriétaire" : p.role === "both" ? "propriétaire & gardien" : "gardien";
        activityItems.push({
          id: `profile-${p.id}`,
          text: `${p.first_name || "Quelqu'un"} s'est inscrit(e) (${roleLabel})`,
          time: p.created_at,
          link: `/admin/users`,
          type: "inscription",
        });
      });

      // Changements de statut (historique réel via sit_status_history), libellés français.
      (recentStatusChanges || []).forEach((h: any) => {
        const ownerName = h.owner_first_name || "Un propriétaire";
        const city = h.owner_city ? ` à ${h.owner_city}` : "";
        const title = h.sit_title ? ` « ${h.sit_title} »` : "";
        const act = statusChangeActivity(h.old_status ?? null, h.new_status);
        if (!act) return;
        activityItems.push({
          id: `status-${h.id}`,
          text: `${ownerName} ${act.verb}${title}${city}`,
          time: h.changed_at,
          link: `/admin/listings`,
          type: act.kind,
        });
      });

      (recentReviews || []).forEach((r: any) => {
        const reviewerName = r.reviewer?.first_name || "Quelqu'un";
        const revieweeName = r.reviewee?.first_name || "un membre";
        activityItems.push({
          id: `review-${r.id}`,
          text: `${reviewerName} a laissé un avis ${r.overall_rating}/5 à ${revieweeName}`,
          time: r.created_at,
          link: `/admin/reviews`,
          type: "avis",
        });
      });

      (recentApplications || []).forEach((a: any) => {
        const sitterName = a.sitter_first_name || "Un gardien";
        const sitTitle = a.sit_title || "une garde";
        activityItems.push({
          id: `app-${a.id}`,
          text: `Nouvelle candidature de ${sitterName} pour ${sitTitle}`,
          time: a.created_at,
          link: `/admin/sits-management`,
          type: "candidature",
        });
      });

      // Demandes de suppression de compte
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
        activityItems.push({
          id: `del-${d.id}`,
          text: `${name}${city} a demandé la suppression de son compte${suffix}`,
          time: d.requested_at,
          link: `/admin/demandes-suppression`,
          type: "suppression",
        });
      });

      activityItems.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
      setActivity(activityItems.slice(0, 12));
      } catch (e) {
        reportAdminReadError("Vue d'ensemble : chiffres clés", e);
        setError(UNAVAILABLE_LABEL);
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, []);

  return { loading, error, stats, activity };
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
