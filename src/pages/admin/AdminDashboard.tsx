import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Users, Megaphone, CalendarCheck, Star, UserPlus, Handshake,
  ExternalLink, AlertTriangle, ShieldCheck, Briefcase, Flag, CreditCard, Mail,
  ListChecks, Clock, MessageSquare, BookOpen, ThumbsUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell,
} from "recharts";
import { format, subWeeks, startOfWeek, endOfWeek, formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface Stats {
  totalUsers: number;
  owners: number;
  sitters: number;
  both: number;
  newThisWeek: number;
  activeListings: number;
  ongoingSits: number;
  totalReviews: number;
  avgRating: number;
  monthRevenue: number;
}

interface Alert {
  label: string;
  count: number;
  link: string;
  icon: React.ElementType;
}

interface ActivityItem {
  id: string;
  text: string;
  time: string;
  link: string;
  type: "inscription" | "annonce" | "avis" | "candidature";
}

interface ActionCard {
  label: string;
  count: number;
  link: string;
  icon: React.ElementType;
}

interface WeeklySignup { week: string; sitters: number; owners: number }
interface DeptData { dept: string; count: number }

import { postalToDept } from "@/lib/departments";

const CHART_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--primary) / 0.8)",
  "hsl(var(--primary) / 0.6)",
  "hsl(var(--primary) / 0.4)",
  "hsl(var(--primary) / 0.25)",
];

const ACTIVITY_BADGE: Record<ActivityItem["type"], { label: string; variant: "secondary" | "outline" }> = {
  inscription: { label: "Inscription", variant: "secondary" },
  annonce: { label: "Annonce", variant: "outline" },
  avis: { label: "Avis", variant: "secondary" },
  candidature: { label: "Candidature", variant: "outline" },
};

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [weeklySignups, setWeeklySignups] = useState<WeeklySignup[]>([]);
  const [deptData, setDeptData] = useState<DeptData[]>([]);
  const [loading, setLoading] = useState(true);

  // "À traiter" and "En retard" states
  const [actionCards, setActionCards] = useState<ActionCard[]>([]);
  const [lateCards, setLateCards] = useState<ActionCard[]>([]);

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
        // Additional counts for "À traiter"
        { count: pendingContactMessages },
        { count: pendingSkills },
        { count: pendingReviewModeration },
        // "En retard" counts
        { count: lateVerifications },
        { count: lateContactMessages },
        { count: lateReports },
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
        supabase.from("profiles").select("id", { count: "exact", head: true }).eq("identity_verification_status", "pending"),
        supabase.from("external_experiences").select("id", { count: "exact", head: true }).eq("verification_status", "pending"),
        supabase.from("reports").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("profiles").select("id, first_name, role, created_at").order("created_at", { ascending: false }).limit(5),
        supabase.from("sits").select("id, title, created_at, status, property_id, properties!inner(user_id, ...profiles!inner(first_name, city))").order("created_at", { ascending: false }).limit(5),
        supabase.from("reviews").select("id, overall_rating, created_at, reviewer_id, reviewee_id, sit_id, reviewer:profiles!reviews_reviewer_id_fkey(first_name), reviewee:profiles!reviews_reviewee_id_fkey(first_name)").order("created_at", { ascending: false }).limit(5),
        supabase.rpc("admin_get_recent_applications_activity", { p_limit: 5 }),
        supabase.from("subscriptions").select("id", { count: "exact", head: true }).eq("status", "active"),
        // New queries for "À traiter"
        supabase.from("contact_messages").select("id", { count: "exact", head: true }).eq("status", "new"),
        supabase.from("skills_library").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("reviews").select("id", { count: "exact", head: true }).eq("moderation_status", "pending"),
        // "En retard" queries
        supabase.from("profiles").select("id", { count: "exact", head: true }).eq("identity_verification_status", "pending").lt("created_at", ago24h),
        supabase.from("contact_messages").select("id", { count: "exact", head: true }).eq("status", "new").lt("created_at", ago48h),
        supabase.from("reports").select("id", { count: "exact", head: true }).eq("status", "pending").lt("created_at", ago72h),
      ]);

      const totalReviews = reviewsData?.length || 0;
      const avgRating = totalReviews > 0
        ? reviewsData!.reduce((sum, r) => sum + r.overall_rating, 0) / totalReviews
        : 0;

      const monthRevenue = (activeSubscriptions || 0) * 49;

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

      // "À traiter" cards
      const actions: ActionCard[] = [];
      if ((pendingVerifications || 0) > 0) actions.push({ label: "Vérifications ID", count: pendingVerifications || 0, link: "/admin/verifications", icon: ShieldCheck });
      if ((pendingExperiences || 0) > 0) actions.push({ label: "Expériences", count: pendingExperiences || 0, link: "/admin/experiences", icon: Briefcase });
      if ((pendingReports || 0) > 0) actions.push({ label: "Signalements", count: pendingReports || 0, link: "/admin/reports", icon: Flag });
      if ((pendingContactMessages || 0) > 0) actions.push({ label: "Messages contact", count: pendingContactMessages || 0, link: "/admin/contact-messages", icon: MessageSquare });
      if ((pendingSkills || 0) > 0) actions.push({ label: "Compétences", count: pendingSkills || 0, link: "/admin/skills", icon: BookOpen });
      if ((pendingReviewModeration || 0) > 0) actions.push({ label: "Avis en attente", count: pendingReviewModeration || 0, link: "/admin/reviews", icon: ThumbsUp });
      setActionCards(actions);

      // "En retard" cards
      const late: ActionCard[] = [];
      if ((lateVerifications || 0) > 0) late.push({ label: "Vérifications > 24h", count: lateVerifications || 0, link: "/admin/verifications", icon: ShieldCheck });
      if ((lateContactMessages || 0) > 0) late.push({ label: "Messages > 48h", count: lateContactMessages || 0, link: "/admin/contact-messages", icon: MessageSquare });
      if ((lateReports || 0) > 0) late.push({ label: "Signalements > 72h", count: lateReports || 0, link: "/admin/reports", icon: Flag });
      setLateCards(late);

      // Alerts (kept as-is)
      const alertList: Alert[] = [];
      if ((pendingVerifications || 0) > 0) alertList.push({ label: "vérifications ID en attente", count: pendingVerifications || 0, link: "/admin/verifications", icon: ShieldCheck });
      if ((pendingExperiences || 0) > 0) alertList.push({ label: "expériences à vérifier", count: pendingExperiences || 0, link: "/admin/experiences", icon: Briefcase });
      if ((pendingReports || 0) > 0) alertList.push({ label: "signalements non traités", count: pendingReports || 0, link: "/admin/reports", icon: Flag });
      setAlerts(alertList);

      // Weekly signups (last 12 weeks)
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

      // Department distribution (top 10)
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

      // Activity timeline
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

      (recentSits || []).forEach((s: any) => {
        if (s.status === "published") {
          const ownerName = s.properties?.first_name || "Un propriétaire";
          const city = s.properties?.city || "";
          activityItems.push({
            id: `sit-${s.id}`,
            text: `${ownerName} a publié une annonce${city ? ` à ${city}` : ""}`,
            time: s.created_at,
            link: `/admin/listings`,
            type: "annonce",
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
        const sitterName = a.sitter?.first_name || "Un gardien";
        const sitTitle = a.sit?.title || "une garde";
        activityItems.push({
          id: `app-${a.id}`,
          text: `Nouvelle candidature de ${sitterName} pour ${sitTitle}`,
          time: a.created_at,
          link: `/admin/sits-management`,
          type: "candidature",
        });
      });

      activityItems.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
      setActivity(activityItems.slice(0, 10));

      setLoading(false);
    };

    fetchAll();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="h-28 rounded-lg" />)}
        </div>
      </div>
    );
  }

  if (!stats) return null;

  const cards = [
    {
      title: "Inscrits",
      value: stats.totalUsers,
      subtitle: `${stats.owners} proprios · ${stats.sitters} gardiens · ${stats.both} mixtes`,
      icon: Users,
      link: "/admin/users",
    },
    {
      title: "Nouveaux cette semaine",
      value: stats.newThisWeek,
      subtitle: "Depuis 7 jours",
      icon: UserPlus,
      link: "/admin/users",
    },
    {
      title: "Annonces actives",
      value: stats.activeListings,
      subtitle: "Publiées",
      icon: Megaphone,
      link: "/admin/listings",
    },
    {
      title: "Gardes en cours",
      value: stats.ongoingSits,
      subtitle: "Confirmées",
      icon: CalendarCheck,
      link: "/admin/sits-management",
    },
    {
      title: "Avis",
      value: stats.totalReviews,
      subtitle: stats.avgRating > 0 ? `Note moyenne : ${stats.avgRating}/5` : "Aucun avis",
      icon: Star,
      link: "/admin/reviews",
    },
    {
      title: "Revenus du mois",
      value: `${stats.monthRevenue}€`,
      subtitle: "Abonnements",
      icon: CreditCard,
      link: "/admin/subscriptions",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header + Google Analytics link */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="font-body text-2xl font-bold">Dashboard</h1>
        <Button variant="outline" size="sm" asChild>
          <a href="https://analytics.google.com/analytics/web/#/p/G-9JP4VR1RRP" target="_blank" rel="noopener noreferrer">
            <ExternalLink className="h-4 w-4 mr-2" />
            Google Analytics
          </a>
        </Button>
      </div>

      {/* 1. BLOC "À TRAITER MAINTENANT" */}
      {actionCards.length > 0 && (
        <div className="space-y-3">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <ListChecks className="h-5 w-5 text-primary" />
            À traiter
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {actionCards.map((card) => (
              <button
                key={card.link + card.label}
                onClick={() => navigate(card.link)}
                className="flex items-center gap-4 rounded-xl border border-border bg-card p-4 text-left hover:shadow-md transition-shadow"
              >
                <div className="rounded-lg bg-primary/10 p-2">
                  <card.icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-primary">{card.count}</p>
                  <p className="text-sm text-muted-foreground">{card.label}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 2. BLOC "EN RETARD" */}
      {lateCards.length > 0 && (
        <div className="space-y-3">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <Clock className="h-5 w-5 text-orange-600" />
            En retard
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {lateCards.map((card) => (
              <button
                key={card.link + card.label}
                onClick={() => navigate(card.link)}
                className="flex items-center gap-4 rounded-xl border border-orange-200 bg-orange-50 p-4 text-left hover:bg-orange-100 transition-colors"
              >
                <div className="rounded-lg bg-orange-100 p-2">
                  <card.icon className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-orange-700">{card.count}</p>
                  <p className="text-sm text-orange-600">{card.label}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 3. Alertes orange existantes */}
      {alerts.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {alerts.map((alert) => (
            <button
              key={alert.link}
              onClick={() => navigate(alert.link)}
              className="flex items-center gap-3 p-4 rounded-xl bg-orange-50 border border-orange-200 text-left hover:bg-orange-100 transition-colors"
            >
              <div className="p-2 rounded-lg bg-orange-100">
                <AlertTriangle className="h-4 w-4 text-orange-600" />
              </div>
              <span className="text-sm font-medium text-orange-800">
                <strong>{alert.count}</strong> {alert.label}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* 4. Timeline activité récente (enrichie avec badges) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Activité récente</CardTitle>
        </CardHeader>
        <CardContent>
          {activity.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune activité récente.</p>
          ) : (
            <div className="space-y-0">
              {activity.map((item) => (
                <button
                  key={item.id}
                  onClick={() => navigate(item.link)}
                  className="flex items-start gap-3 w-full text-left py-3 px-2 rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="mt-1.5 w-2 h-2 rounded-full bg-primary shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant={ACTIVITY_BADGE[item.type].variant} className="text-[10px] px-1.5 py-0">
                        {ACTIVITY_BADGE[item.type].label}
                      </Badge>
                      <p className="text-sm text-foreground">{item.text}</p>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {formatDistanceToNow(new Date(item.time), { addSuffix: true, locale: fr })}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 5. KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {cards.map((card) => (
          <Card
            key={card.title}
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => navigate(card.link)}
          >
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {card.title}
              </CardTitle>
              <card.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{card.value}</div>
              <p className="text-xs text-muted-foreground mt-1">{card.subtitle}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 6. Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Inscriptions par semaine</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 mb-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-primary" />
                Gardiens
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: "hsl(45, 93%, 47%)" }} />
                Propriétaires
              </span>
            </div>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={weeklySignups}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="week" tick={{ fontSize: 11 }} className="text-muted-foreground" />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: "13px",
                    }}
                    labelFormatter={(l) => `Semaine du ${l}`}
                  />
                  <Line type="monotone" dataKey="sitters" name="Gardiens" stroke="hsl(var(--primary))" strokeWidth={2.5} dot={{ fill: "hsl(var(--primary))", r: 3 }} />
                  <Line type="monotone" dataKey="owners" name="Propriétaires" stroke="hsl(45, 93%, 47%)" strokeWidth={2.5} dot={{ fill: "hsl(45, 93%, 47%)", r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Répartition par département (top 10)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-56">
              {deptData.length === 0 ? (
                <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                  Aucune donnée disponible.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={deptData} layout="vertical" margin={{ left: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" horizontal={false} />
                    <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                    <YAxis dataKey="dept" type="category" tick={{ fontSize: 11 }} width={140} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                        fontSize: "13px",
                      }}
                      formatter={(v: number) => [`${v} utilisateurs`, "Inscrits"]}
                    />
                    <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                      {deptData.map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 7. Rappels onboarding J+1 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Rappels onboarding
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Envoyer manuellement l'email J+1 aux inscrits des dernières 48h avec un profil complété à moins de 60%.
          </p>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Mail className="h-4 w-4 mr-2" />
                Envoyer onboarding J+1 maintenant
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Confirmer l'envoi</AlertDialogTitle>
                <AlertDialogDescription>
                  Cela enverra un email de rappel aux membres inscrits dans les dernières 48h dont le profil est complété à moins de 60%. Les doublons sont automatiquement exclus.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Annuler</AlertDialogCancel>
                <AlertDialogAction onClick={async () => {
                  try {
                    const { data, error } = await supabase.functions.invoke('send-onboarding-j1', {
                      body: { minHours: 0, maxHours: 48 },
                    });
                    if (error) throw error;
                    toast.success(`Envoi terminé : ${data?.sent ?? 0} email(s) envoyé(s), ${data?.skipped ?? 0} ignoré(s)`);
                  } catch (err: any) {
                    toast.error("Erreur lors de l'envoi : " + (err.message || "Erreur inconnue"));
                  }
                }}>
                  Confirmer l'envoi
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminDashboard;
