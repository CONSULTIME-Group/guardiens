import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MessageSquare, Users, TrendingUp, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format, subDays, subMonths, startOfDay } from "date-fns";
import { fr } from "date-fns/locale";

interface MessageStats {
  totalHuman: number;
  totalSystem: number;
  totalConversations: number;
  avgPerDay: number;
}

interface TopUser {
  user_id: string;
  first_name: string | null;
  avatar_url: string | null;
  role: string | null;
  message_count: number;
  last_message_at: string;
}

interface DailyCount {
  date: string;
  count: number;
}

type Period = "7d" | "30d" | "90d" | "all";

export default function AdminMessages() {
  const [period, setPeriod] = useState<Period>("30d");
  const [stats, setStats] = useState<MessageStats | null>(null);
  const [topUsers, setTopUsers] = useState<TopUser[]>([]);
  const [dailyCounts, setDailyCounts] = useState<DailyCount[]>([]);
  const [loading, setLoading] = useState(true);

  const getSinceDate = (p: Period): string | null => {
    const now = new Date();
    if (p === "7d") return subDays(now, 7).toISOString();
    if (p === "30d") return subDays(now, 30).toISOString();
    if (p === "90d") return subMonths(now, 3).toISOString();
    return null;
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const since = getSinceDate(period);

      // Fetch all human messages for the period
      let query = supabase
        .from("messages")
        .select("id, sender_id, created_at, is_system, conversation_id")
        .eq("is_system", false);

      if (since) {
        query = query.gte("created_at", since);
      }

      const { data: messages, error } = await query.order("created_at", { ascending: false }).limit(1000);

      if (error || !messages) {
        console.error("Error fetching messages:", error);
        setLoading(false);
        return;
      }

      // Also get system message count
      let sysQuery = supabase
        .from("messages")
        .select("id", { count: "exact", head: true })
        .eq("is_system", true);
      if (since) sysQuery = sysQuery.gte("created_at", since);
      const { count: sysCount } = await sysQuery;

      // Compute stats
      const uniqueConvs = new Set(messages.map((m) => m.conversation_id));
      const days = period === "7d" ? 7 : period === "30d" ? 30 : period === "90d" ? 90 : Math.max(1, Math.ceil((Date.now() - new Date(messages[messages.length - 1]?.created_at || Date.now()).getTime()) / 86400000));

      setStats({
        totalHuman: messages.length,
        totalSystem: sysCount || 0,
        totalConversations: uniqueConvs.size,
        avgPerDay: Math.round((messages.length / days) * 10) / 10,
      });

      // Top 20 users by message count
      const userCounts: Record<string, { count: number; lastAt: string }> = {};
      for (const m of messages) {
        if (!userCounts[m.sender_id]) {
          userCounts[m.sender_id] = { count: 0, lastAt: m.created_at };
        }
        userCounts[m.sender_id].count++;
        if (m.created_at > userCounts[m.sender_id].lastAt) {
          userCounts[m.sender_id].lastAt = m.created_at;
        }
      }

      const sortedUserIds = Object.entries(userCounts)
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, 20);

      // Fetch profiles for top users
      const userIds = sortedUserIds.map(([id]) => id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, first_name, avatar_url, role")
        .in("id", userIds);

      const profileMap = new Map((profiles || []).map((p) => [p.id, p]));
      const topList: TopUser[] = sortedUserIds.map(([id, data]) => {
        const profile = profileMap.get(id);
        return {
          user_id: id,
          first_name: profile?.first_name || null,
          avatar_url: profile?.avatar_url || null,
          role: profile?.role || null,
          message_count: data.count,
          last_message_at: data.lastAt,
        };
      });
      setTopUsers(topList);

      // Daily counts (last 14 days max for chart)
      const dailyMap: Record<string, number> = {};
      for (const m of messages) {
        const day = format(new Date(m.created_at), "yyyy-MM-dd");
        dailyMap[day] = (dailyMap[day] || 0) + 1;
      }
      const daily = Object.entries(dailyMap)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .slice(-14)
        .map(([date, count]) => ({ date, count }));
      setDailyCounts(daily);

      setLoading(false);
    };

    fetchData();
  }, [period]);

  const roleLabel = (role: string | null) => {
    if (role === "owner") return "Propriétaire";
    if (role === "sitter") return "Gardien";
    if (role === "both") return "Les deux";
    return role || "—";
  };

  const maxCount = Math.max(...dailyCounts.map((d) => d.count), 1);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Messagerie</h1>
          <p className="text-sm text-muted-foreground">Statistiques des échanges entre membres</p>
        </div>
        <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">7 derniers jours</SelectItem>
            <SelectItem value="30d">30 derniers jours</SelectItem>
            <SelectItem value="90d">3 derniers mois</SelectItem>
            <SelectItem value="all">Tout</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}><CardContent className="p-5"><Skeleton className="h-10 w-20" /></CardContent></Card>
          ))
        ) : (
          <>
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <MessageSquare className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{stats?.totalHuman || 0}</p>
                    <p className="text-xs text-muted-foreground">Messages humains</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                    <Users className="h-5 w-5 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{stats?.totalConversations || 0}</p>
                    <p className="text-xs text-muted-foreground">Conversations actives</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                    <TrendingUp className="h-5 w-5 text-amber-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{stats?.avgPerDay || 0}</p>
                    <p className="text-xs text-muted-foreground">Moyenne / jour</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                    <Calendar className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{stats?.totalSystem || 0}</p>
                    <p className="text-xs text-muted-foreground">Messages système</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Mini bar chart */}
      {!loading && dailyCounts.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Messages par jour (14 derniers jours actifs)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-1 h-32">
              {dailyCounts.map((d) => (
                <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-[10px] text-muted-foreground font-medium">{d.count}</span>
                  <div
                    className="w-full bg-primary/80 rounded-t-sm transition-all"
                    style={{ height: `${Math.max(4, (d.count / maxCount) * 100)}%` }}
                  />
                  <span className="text-[9px] text-muted-foreground rotate-[-45deg] origin-top-left whitespace-nowrap mt-1">
                    {format(new Date(d.date), "dd/MM")}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Top 20 users */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Top 20 — Membres les plus actifs</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : topUsers.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Aucun message sur cette période</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">#</TableHead>
                  <TableHead>Membre</TableHead>
                  <TableHead>Rôle</TableHead>
                  <TableHead className="text-right">Messages</TableHead>
                  <TableHead className="text-right">Dernier msg</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topUsers.map((u, i) => (
                  <TableRow key={u.user_id}>
                    <TableCell className="font-medium text-muted-foreground">{i + 1}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-7 w-7">
                          <AvatarImage src={u.avatar_url || ""} />
                          <AvatarFallback className="text-xs">
                            {(u.first_name || "?")[0]}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-medium">{u.first_name || "Anonyme"}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{roleLabel(u.role)}</TableCell>
                    <TableCell className="text-right font-semibold">{u.message_count}</TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground">
                      {format(new Date(u.last_message_at), "dd MMM yyyy", { locale: fr })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
