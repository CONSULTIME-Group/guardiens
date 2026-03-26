import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Megaphone, CalendarCheck, Star, UserPlus, Handshake } from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell,
  FunnelChart, Funnel, LabelList,
} from "recharts";
import { format, subWeeks, subMonths, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";
import { fr } from "date-fns/locale";

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
  openMissions: number;
}

interface WeeklySignup { week: string; count: number }
interface CityData { city: string; count: number }
interface FunnelStep { name: string; value: number; fill: string }
interface MonthlyRating { month: string; avg: number; count: number }

const CHART_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--primary) / 0.8)",
  "hsl(var(--primary) / 0.6)",
  "hsl(var(--primary) / 0.4)",
  "hsl(var(--primary) / 0.25)",
];

const AdminDashboard = () => {
  const [stats, setStats] = useState<Stats | null>(null);
  const [weeklySignups, setWeeklySignups] = useState<WeeklySignup[]>([]);
  const [cityData, setCityData] = useState<CityData[]>([]);
  const [funnelData, setFunnelData] = useState<FunnelStep[]>([]);
  const [monthlyRatings, setMonthlyRatings] = useState<MonthlyRating[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
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
        { data: profilesData },
        { count: totalApplications },
        { count: confirmedSits },
      ] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "owner"),
        supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "sitter"),
        supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "both"),
        supabase.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", oneWeekAgo.toISOString()),
        supabase.from("sits").select("id", { count: "exact", head: true }).eq("status", "published"),
        supabase.from("sits").select("id", { count: "exact", head: true }).eq("status", "confirmed"),
        supabase.from("sits").select("id", { count: "exact", head: true }).eq("status", "completed"),
        supabase.from("reviews").select("overall_rating, created_at"),
        supabase.from("profiles").select("created_at, city"),
        supabase.from("applications").select("id", { count: "exact", head: true }),
        supabase.from("sits").select("id", { count: "exact", head: true }).in("status", ["confirmed", "completed"]),
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

      // Weekly signups (last 12 weeks)
      const weeks: WeeklySignup[] = [];
      for (let i = 11; i >= 0; i--) {
        const weekStart = startOfWeek(subWeeks(new Date(), i), { weekStartsOn: 1 });
        const weekEnd = endOfWeek(subWeeks(new Date(), i), { weekStartsOn: 1 });
        const count = (profilesData || []).filter(p => {
          const d = new Date(p.created_at);
          return d >= weekStart && d <= weekEnd;
        }).length;
        weeks.push({
          week: format(weekStart, "d MMM", { locale: fr }),
          count,
        });
      }
      setWeeklySignups(weeks);

      // City distribution (top 8)
      const cityMap: Record<string, number> = {};
      (profilesData || []).forEach(p => {
        const city = (p.city || "").trim();
        if (city) cityMap[city] = (cityMap[city] || 0) + 1;
      });
      const sortedCities = Object.entries(cityMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([city, count]) => ({ city, count }));
      setCityData(sortedCities);

      // Funnel
      const totalU = totalUsers || 0;
      const totalApp = totalApplications || 0;
      const totalConf = confirmedSits || 0;
      const totalComp = completedSits || 0;
      setFunnelData([
        { name: "Inscrits", value: totalU, fill: CHART_COLORS[0] },
        { name: "Annonces publiées", value: (activeListings || 0) + totalConf, fill: CHART_COLORS[1] },
        { name: "Candidatures", value: totalApp, fill: CHART_COLORS[2] },
        { name: "Gardes confirmées", value: totalConf, fill: CHART_COLORS[3] },
        { name: "Gardes terminées", value: totalComp, fill: CHART_COLORS[4] },
      ]);

      // Monthly average ratings (last 12 months)
      const months: MonthlyRating[] = [];
      for (let i = 11; i >= 0; i--) {
        const mStart = startOfMonth(subMonths(new Date(), i));
        const mEnd = endOfMonth(subMonths(new Date(), i));
        const monthReviews = (reviewsData || []).filter(r => {
          const d = new Date(r.created_at);
          return d >= mStart && d <= mEnd;
        });
        const avg = monthReviews.length > 0
          ? monthReviews.reduce((s, r) => s + r.overall_rating, 0) / monthReviews.length
          : 0;
        months.push({
          month: format(mStart, "MMM yy", { locale: fr }),
          avg: Math.round(avg * 10) / 10,
          count: monthReviews.length,
        });
      }
      setMonthlyRatings(months);

      setLoading(false);
    };

    fetchAll();
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
    <div className="space-y-8">
      <h1 className="font-body text-2xl font-bold">Dashboard</h1>

      {/* KPI cards */}
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

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekly signups */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Inscriptions par semaine</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={weeklySignups}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="week" tick={{ fontSize: 11 }} className="text-muted-foreground" />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} className="text-muted-foreground" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: "13px",
                    }}
                    labelFormatter={(l) => `Semaine du ${l}`}
                    formatter={(v: number) => [`${v} inscriptions`, "Inscrits"]}
                  />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2.5}
                    dot={{ fill: "hsl(var(--primary))", r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Geographic distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Répartition géographique</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              {cityData.length === 0 ? (
                <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                  Aucune donnée de ville disponible.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={cityData} layout="vertical" margin={{ left: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" horizontal={false} />
                    <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                    <YAxis dataKey="city" type="category" tick={{ fontSize: 11 }} width={90} />
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
                      {cityData.map((_, i) => (
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

      {/* Funnel */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Funnel de conversion</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-5 gap-3">
            {funnelData.map((step, i) => {
              const prevValue = i > 0 ? funnelData[i - 1].value : step.value;
              const rate = prevValue > 0 ? Math.round((step.value / prevValue) * 100) : 0;
              const widthPct = funnelData[0].value > 0
                ? Math.max(20, (step.value / funnelData[0].value) * 100)
                : 20;

              return (
                <div key={step.name} className="flex flex-col items-center text-center">
                  <div
                    className="rounded-lg flex items-center justify-center font-bold text-lg mb-2 transition-all"
                    style={{
                      width: `${widthPct}%`,
                      minWidth: "48px",
                      height: "56px",
                      backgroundColor: step.fill,
                      color: "hsl(var(--primary-foreground))",
                    }}
                  >
                    {step.value}
                  </div>
                  <p className="text-xs font-medium">{step.name}</p>
                  {i > 0 && (
                    <p className="text-[10px] text-muted-foreground mt-0.5">{rate}%</p>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Monthly ratings trend */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tendance des avis (note moyenne par mois)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            {monthlyRatings.every(m => m.count === 0) ? (
              <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                Aucun avis pour le moment.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyRatings}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 5]} ticks={[1, 2, 3, 4, 5]} tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: "13px",
                    }}
                    formatter={(v: number, name: string) => {
                      if (name === "avg") return [`${v}/5`, "Note moyenne"];
                      return [`${v}`, "Nombre d'avis"];
                    }}
                    labelFormatter={(l) => `${l}`}
                  />
                  <Bar dataKey="avg" radius={[4, 4, 0, 0]} fill="hsl(var(--primary))" name="avg" />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke="hsl(var(--primary) / 0.5)"
                    strokeWidth={2}
                    dot={{ fill: "hsl(var(--primary) / 0.5)", r: 3 }}
                    name="count"
                    yAxisId={0}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminDashboard;
