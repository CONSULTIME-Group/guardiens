import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format, subWeeks, startOfWeek, endOfWeek } from "date-fns";
import { fr } from "date-fns/locale";
import {
  ShieldCheck, Briefcase, Flag, MessageSquare, BookOpen, ThumbsUp, UserMinus,
} from "lucide-react";
import { postalToDept } from "@/lib/departments";
import type {
  Stats, ActivityItem, ActionCard, WeeklySignup, DeptData,
} from "./types";
import { MONTHLY_SUBSCRIPTION_EUR } from "./types";

interface DashboardData {
  loading: boolean;
  stats: Stats | null;
  actionCards: ActionCard[];
  lateCards: ActionCard[];
  activity: ActivityItem[];
  weeklySignups: WeeklySignup[];
  deptData: DeptData[];
}

/**
 * Centralise les ~24 requêtes Supabase du Dashboard admin et expose
 * l'ensemble des données dérivées prêtes pour l'affichage.
 */
export function useDashboardData(): DashboardData {
  const [stats, setStats] = useState<Stats | null>(null);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [weeklySignups, setWeeklySignups] = useState<WeeklySignup[]>([]);
  const [deptData, setDeptData] = useState<DeptData[]>([]);
  const [actionCards, setActionCards] = useState<ActionCard[]>([]);
  const [lateCards, setLateCards] = useState<ActionCard[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

      const now = new Date();
      const ago24h = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
      const ago48h = new Date(now.getTime() - 48 * 60 * 60 * 1000).toISOString();
      const ago72h = new Date(now.getTime() - 72 * 60 * 60 * 1000).toISOString();

      const [
        { count: totalUsers },
        { count: owners },
        { count: sitters },
        { count: bothCount },
        { count: newThisWeek },
        { count: activeListings },
        { count: ongoingSits },
        { data: reviewsData },
        { data: profilesData },
        { count: pendingVerifications },
        { count: pendingExperiences },
        { count: pendingReports },
        { data: recentProfiles },
        { data: recentSits },
        { data: recentReviews },
        { data: recentApplications },
        { count: activeSubscriptions },
        { count: pendingContactMessages },
        { count: pendingSkills },
        { count: pendingReviewModeration },
        { count: lateVerifications },
        { count: lateContactMessages },
        { count: lateReports },
        { data: recentStatusChanges },
        { data: recentDeletions },
        { data: pendingDeletionsCount },
      ] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "owner"),
        supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "sitter"),
        supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "both"),
        supabase.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", oneWeekAgo.toISOString()),
        supabase.from("sits").select("id", { count: "exact", head: true }).eq("status", "published"),
        supabase.from("sits").select("id", { count: "exact", head: true }).eq("status", "confirmed"),
        supabase.from("reviews").select("overall_rating"),
        supabase.from("profiles").select("created_at, city, role, first_name, id, postal_code"),
        supabase.from("profiles").select("id", { count: "exact", head: true }).or("identity_verification_status.eq.pending,and(identity_verification_status.eq.not_submitted,identity_document_url.not.is.null),and(identity_verification_status.eq.not_submitted,identity_selfie_url.not.is.null)"),
        supabase.from("external_experiences").select("id", { count: "exact", head: true }).eq("verification_status", "pending"),
        supabase.from("reports").select("id", { count: "exact", head: true }).eq("status", "new"),
        supabase.from("profiles").select("id, first_name, role, created_at").order("created_at", { ascending: false }).limit(5),
        supabase.from("sits").select("id, title, created_at, status, property_id, properties!inner(user_id, ...profiles!inner(first_name, city))").order("created_at", { ascending: false }).limit(5),
        supabase.from("reviews").select("id, overall_rating, created_at, reviewer_id, reviewee_id, sit_id, reviewer:profiles!reviews_reviewer_id_fkey(first_name), reviewee:profiles!reviews_reviewee_id_fkey(first_name)").order("created_at", { ascending: false }).limit(5),
        supabase.rpc("admin_get_recent_applications_activity", { p_limit: 5 }),
        supabase.from("subscriptions").select("id", { count: "exact", head: true }).eq("status", "active"),
        supabase.from("contact_messages").select("id", { count: "exact", head: true }).eq("status", "new"),
        supabase.from("skills_library").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("reviews").select("id", { count: "exact", head: true }).eq("moderation_status", "pending"),
        supabase.from("profiles").select("id", { count: "exact", head: true }).or("identity_verification_status.eq.pending,and(identity_verification_status.eq.not_submitted,identity_document_url.not.is.null),and(identity_verification_status.eq.not_submitted,identity_selfie_url.not.is.null)").lt("created_at", ago24h),
        supabase.from("contact_messages").select("id", { count: "exact", head: true }).eq("status", "new").lt("created_at", ago48h),
        supabase.from("reports").select("id", { count: "exact", head: true }).eq("status", "new").lt("created_at", ago72h),
        supabase.rpc("admin_get_recent_sit_status_changes" as any, { p_limit: 8 }),
        supabase.rpc("admin_get_recent_account_deletions" as any, { p_limit: 5 }),
        supabase.rpc("admin_get_pending_deletions_count" as any),
      ]);

      // Compétences saisies dans les profils mais pas encore validées
      // (source #2 affichée dans /admin/skills, non comptée par status='pending')
      let pendingProfileSkills = 0;
      try {
        const [{ data: validatedComps }, { data: sitterComps }, { data: ownerComps }] = await Promise.all([
          supabase.from("competences_validees").select("label"),
          supabase.from("sitter_profiles").select("competences").not("competences", "is", null),
          supabase.from("owner_profiles").select("competences").not("competences", "is", null),
        ]);
        const validatedSet = new Set((validatedComps || []).map((c: any) => c.label));
        const seen = new Set<string>();
        [...(sitterComps || []), ...(ownerComps || [])].forEach((row: any) => {
          (row.competences || []).forEach((c: string) => {
            if (c && !validatedSet.has(c)) seen.add(c);
          });
        });
        pendingProfileSkills = seen.size;
      } catch {
        pendingProfileSkills = 0;
      }

      const totalReviews = reviewsData?.length || 0;
      const avgRating = totalReviews > 0
        ? reviewsData!.reduce((sum, r) => sum + r.overall_rating, 0) / totalReviews
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
        totalReviews,
        avgRating: Math.round(avgRating * 10) / 10,
        monthRevenue,
      });

      // À traiter
      const actions: ActionCard[] = [];
      if ((pendingVerifications || 0) > 0) actions.push({ label: "Vérifications ID", count: pendingVerifications || 0, link: "/admin/verifications", icon: ShieldCheck });
      if ((pendingExperiences || 0) > 0) actions.push({ label: "Expériences", count: pendingExperiences || 0, link: "/admin/experiences", icon: Briefcase });
      if ((pendingReports || 0) > 0) actions.push({ label: "Signalements", count: pendingReports || 0, link: "/admin/reports", icon: Flag });
      if ((pendingContactMessages || 0) > 0) actions.push({ label: "Messages contact", count: pendingContactMessages || 0, link: "/admin/contact-messages", icon: MessageSquare });
      const totalSkills = (pendingSkills || 0) + pendingProfileSkills;
      if (totalSkills > 0) actions.push({ label: "Compétences", count: totalSkills, link: "/admin/skills", icon: BookOpen });
      if ((pendingReviewModeration || 0) > 0) actions.push({ label: "Avis en attente", count: pendingReviewModeration || 0, link: "/admin/reviews", icon: ThumbsUp });
      const pendingDelCount = (pendingDeletionsCount as unknown as number) || 0;
      if (pendingDelCount > 0) actions.push({ label: "Suppressions compte", count: pendingDelCount, link: "/admin/users?filter=deletion-pending", icon: UserMinus });
      setActionCards(actions);

      // En retard
      const late: ActionCard[] = [];
      if ((lateVerifications || 0) > 0) late.push({ label: "Vérifications > 24h", count: lateVerifications || 0, link: "/admin/verifications", icon: ShieldCheck });
      if ((lateContactMessages || 0) > 0) late.push({ label: "Messages > 48h", count: lateContactMessages || 0, link: "/admin/contact-messages", icon: MessageSquare });
      if ((lateReports || 0) > 0) late.push({ label: "Signalements > 72h", count: lateReports || 0, link: "/admin/reports", icon: Flag });
      setLateCards(late);

      // Inscriptions hebdomadaires (12 dernières semaines)
      const weeks: WeeklySignup[] = [];
      for (let i = 11; i >= 0; i--) {
        const weekStart = startOfWeek(subWeeks(new Date(), i), { weekStartsOn: 1 });
        const weekEnd = endOfWeek(subWeeks(new Date(), i), { weekStartsOn: 1 });
        const weekProfiles = (profilesData || []).filter(p => {
          const d = new Date(p.created_at);
          return d >= weekStart && d <= weekEnd;
        });
        weeks.push({
          week: format(weekStart, "d MMM", { locale: fr }),
          sitters: weekProfiles.filter(p => p.role === "sitter" || p.role === "both").length,
          owners: weekProfiles.filter(p => p.role === "owner" || p.role === "both").length,
        });
      }
      setWeeklySignups(weeks);

      // Top 10 départements
      const deptMap: Record<string, number> = {};
      (profilesData || []).forEach(p => {
        const dept = postalToDept((p as any).postal_code);
        deptMap[dept] = (deptMap[dept] || 0) + 1;
      });
      const nonRenseigne = deptMap["Non renseigné"] || 0;
      delete deptMap["Non renseigné"];
      const sorted = Object.entries(deptMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([dept, count]) => ({ dept, count }));
      if (nonRenseigne > 0) sorted.push({ dept: "Non renseigné", count: nonRenseigne });
      setDeptData(sorted);

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

      // Publications & dépublications (historique réel via sit_status_history)
      (recentStatusChanges || []).forEach((h: any) => {
        const ownerName = h.owner_first_name || "Un propriétaire";
        const city = h.owner_city ? ` à ${h.owner_city}` : "";
        const title = h.sit_title ? ` « ${h.sit_title} »` : "";
        if (h.new_status === "published") {
          activityItems.push({
            id: `pub-${h.id}`,
            text: `${ownerName} a publié${title}${city}`,
            time: h.changed_at,
            link: `/admin/listings`,
            type: "publication",
          });
        } else if (h.old_status === "published") {
          activityItems.push({
            id: `unpub-${h.id}`,
            text: `${ownerName} a dépublié${title} (→ ${h.new_status})`,
            time: h.changed_at,
            link: `/admin/listings`,
            type: "depublication",
          });
        }
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
          ? ` — suppression effective dans ${daysLeft}j`
          : d.status === "cancelled" ? " — annulée"
          : d.status === "completed" ? " — finalisée"
          : "";
        activityItems.push({
          id: `del-${d.id}`,
          text: `${name}${city} a demandé la suppression de son compte${suffix}`,
          time: d.requested_at,
          link: `/admin/users?filter=deletion-pending`,
          type: "suppression",
        });
      });

      activityItems.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
      setActivity(activityItems.slice(0, 10));

      setLoading(false);
    };

    fetchAll();
  }, []);

  return { loading, stats, actionCards, lateCards, activity, weeklySignups, deptData };
}
