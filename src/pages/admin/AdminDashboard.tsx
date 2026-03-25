import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Megaphone, CalendarCheck, Star, UserPlus, Clock } from "lucide-react";

interface Stats {
  totalUsers: number;
  owners: number;
  sitters: number;
  both: number;
  newThisWeek: number;
  activeListings: number;
  ongoingSits: number;
  completedSits: number;
  totalReviews: number;
  avgRating: number;
}

const AdminDashboard = () => {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

      const [
        { count: totalUsers },
        { count: owners },
        { count: sitters },
        { count: bothCount },
        { count: newThisWeek },
        { count: activeListings },
        { count: ongoingSits },
        { count: completedSits },
        { data: reviewsData },
      ] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "owner"),
        supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "sitter"),
        supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "both"),
        supabase.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", oneWeekAgo.toISOString()),
        supabase.from("sits").select("id", { count: "exact", head: true }).eq("status", "published"),
        supabase.from("sits").select("id", { count: "exact", head: true }).eq("status", "confirmed"),
        supabase.from("sits").select("id", { count: "exact", head: true }).eq("status", "completed"),
        supabase.from("reviews").select("overall_rating"),
      ]);

      const totalReviews = reviewsData?.length || 0;
      const avgRating = totalReviews > 0
        ? reviewsData!.reduce((sum, r) => sum + r.overall_rating, 0) / totalReviews
        : 0;

      setStats({
        totalUsers: totalUsers || 0,
        owners: owners || 0,
        sitters: sitters || 0,
        both: bothCount || 0,
        newThisWeek: newThisWeek || 0,
        activeListings: activeListings || 0,
        ongoingSits: ongoingSits || 0,
        completedSits: completedSits || 0,
        totalReviews,
        avgRating: Math.round(avgRating * 10) / 10,
      });
      setLoading(false);
    };

    fetchStats();
  }, []);

  if (loading) {
    return <div className="text-muted-foreground">Chargement des statistiques…</div>;
  }

  if (!stats) return null;

  const cards = [
    {
      title: "Inscrits",
      value: stats.totalUsers,
      subtitle: `${stats.owners} proprios · ${stats.sitters} gardiens · ${stats.both} mixtes`,
      icon: Users,
    },
    {
      title: "Nouveaux cette semaine",
      value: stats.newThisWeek,
      subtitle: "Depuis 7 jours",
      icon: UserPlus,
    },
    {
      title: "Annonces actives",
      value: stats.activeListings,
      subtitle: "Publiées",
      icon: Megaphone,
    },
    {
      title: "Gardes en cours",
      value: stats.ongoingSits,
      subtitle: `${stats.completedSits} terminées au total`,
      icon: CalendarCheck,
    },
    {
      title: "Avis",
      value: stats.totalReviews,
      subtitle: stats.avgRating > 0 ? `Note moyenne : ${stats.avgRating}/5` : "Aucun avis",
      icon: Star,
    },
  ];

  return (
    <div className="space-y-6">
      <h1 className="font-body text-2xl font-bold">Dashboard</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {cards.map((card) => (
          <Card key={card.title}>
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
    </div>
  );
};

export default AdminDashboard;
