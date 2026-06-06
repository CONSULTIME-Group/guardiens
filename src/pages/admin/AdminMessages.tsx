import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MessageSquare, Users, TrendingUp, Calendar, Reply, Layers } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { format, subDays, subMonths, formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { Link } from "react-router-dom";

type Period = "7d" | "30d" | "90d" | "all";

interface Stats {
  total_human: number;
  total_system: number;
  conversations_active: number;
  conversations_total: number;
  conversations_started_period: number;
  conversations_with_reply: number;
  reply_rate: number;
  active_days: number;
  avg_per_active_day: number;
  last_message_at: string | null;
  by_context: Record<string, number>;
  daily: { date: string; human: number; system: number }[];
}

interface TopUser {
  user_id: string;
  first_name: string | null;
  avatar_url: string | null;
  role: string | null;
  message_count: number;
  conv_count: number;
  last_message_at: string;
}

const CTX_LABEL: Record<string, string> = {
  sit_application: "Candidature garde",
  sitter_inquiry: "Contact gardien",
  small_mission: "Coup de main",
  private: "Privé",
};

const CTX_COLOR: Record<string, string> = {
  sit_application: "bg-primary",
  sitter_inquiry: "bg-info",
  small_mission: "bg-amber-500",
  private: "bg-muted-foreground",
};

export default function AdminMessages() {
  const [period, setPeriod] = useState<Period>("30d");
  const [stats, setStats] = useState<Stats | null>(null);
  const [topUsers, setTopUsers] = useState<TopUser[]>([]);
  const [loading, setLoading] = useState(true);

  const sinceISO = (p: Period): string | null => {
    const now = new Date();
    if (p === "7d") return subDays(now, 7).toISOString();
    if (p === "30d") return subDays(now, 30).toISOString();
    if (p === "90d") return subMonths(now, 3).toISOString();
    return null;
  };

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      const since = sinceISO(period);

      // 1) Server-side aggregate (no row limit, accurate)
      const { data: statsData, error: statsErr } = await supabase.rpc("admin_message_stats", {
        _since: since,
      });
      if (statsErr) console.error("admin_message_stats error", statsErr);

      // 2) Top users, RPC admin (contourne RLS, classement fiable)
      const { data: topData, error: topErr } = await supabase.rpc("admin_top_message_users", {
        _since: since,
        _limit: 20,
      });
      if (topErr) console.error("admin_top_message_users error", topErr);
      const top: TopUser[] = ((topData as any[]) || []).map((u) => ({
        user_id: u.user_id,
        first_name: u.first_name,
        avatar_url: u.avatar_url,
        role: u.role,
        message_count: u.message_count,
        conv_count: u.conv_count,
        last_message_at: u.last_message_at,
      }));

      if (!cancelled) {
        setStats((statsData as unknown as Stats) || null);
        setTopUsers(top);
        setLoading(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [period]);

  const roleLabel = (r: string | null) =>
    r === "owner" ? "Propriétaire" : r === "sitter" ? "Gardien" : r === "both" ? "Les deux" : ",";

  const maxBar = Math.max(...(stats?.daily.map((d) => d.human + d.system) || [1]), 1);
  const ctxEntries = Object.entries(stats?.by_context || {}).sort((a, b) => b[1] - a[1]);
  const ctxTotal = ctxEntries.reduce((s, [, v]) => s + v, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Messagerie</h1>
          <p className="text-sm text-muted-foreground">
            Statistiques fiables (calculs côté serveur, sans limite de lignes)
          </p>
        </div>
        <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">7 derniers jours</SelectItem>
            <SelectItem value="30d">30 derniers jours</SelectItem>
            <SelectItem value="90d">3 derniers mois</SelectItem>
            <SelectItem value="all">Depuis le début</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {loading || !stats ? (
          Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}><CardContent className="p-4"><Skeleton className="h-12 w-full" /></CardContent></Card>
          ))
        ) : (
          <>
            <KpiCard icon={<MessageSquare className="h-4 w-4 text-primary" />} label="Messages humains" value={stats.total_human} />
            <KpiCard icon={<Calendar className="h-4 w-4 text-muted-foreground" />} label="Messages système" value={stats.total_system} />
            <KpiCard
              icon={<Users className="h-4 w-4 text-info" />}
              label="Conv. avec échange"
              value={stats.conversations_active}
              hint={`/ ${stats.conversations_total} en base`}
            />
            <KpiCard
              icon={<Reply className="h-4 w-4 text-emerald-600" />}
              label="Taux de réponse"
              value={`${stats.reply_rate}%`}
              hint={`${stats.conversations_with_reply}/${stats.conversations_started_period} conv. répondues`}
            />
            <KpiCard
              icon={<TrendingUp className="h-4 w-4 text-warning" />}
              label="Moy. / jour actif"
              value={stats.avg_per_active_day}
              hint={`${stats.active_days} jour(s) avec activité`}
            />
            <KpiCard
              icon={<Layers className="h-4 w-4 text-muted-foreground" />}
              label="Dernier message"
              value={
                stats.last_message_at
                  ? formatDistanceToNow(new Date(stats.last_message_at), { addSuffix: true, locale: fr })
                  : ","
              }
              small
            />
          </>
        )}
      </div>

      {/* Breakdown by context */}
      {!loading && stats && ctxTotal > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Répartition par type de conversation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex h-3 rounded-full overflow-hidden bg-muted">
              {ctxEntries.map(([k, v]) => (
                <div
                  key={k}
                  className={CTX_COLOR[k] || "bg-muted-foreground"}
                  style={{ width: `${(v / ctxTotal) * 100}%` }}
                  title={`${CTX_LABEL[k] || k}: ${v}`}
                />
              ))}
            </div>
            <div className="flex flex-wrap gap-3 text-xs">
              {ctxEntries.map(([k, v]) => (
                <div key={k} className="flex items-center gap-1.5">
                  <span className={`inline-block w-2.5 h-2.5 rounded-sm ${CTX_COLOR[k] || "bg-muted-foreground"}`} />
                  <span className="text-foreground font-medium">{CTX_LABEL[k] || k}</span>
                  <span className="text-muted-foreground">{v} ({Math.round((v / ctxTotal) * 100)}%)</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Daily chart, zero-filled */}
      {!loading && stats && stats.daily.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Messages par jour, 14 derniers jours calendaires
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-1 h-32">
              {stats.daily.map((d) => {
                const total = d.human + d.system;
                return (
                  <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-[10px] text-muted-foreground font-medium">{total || ""}</span>
                    <div className="w-full flex flex-col-reverse" style={{ height: "100%" }}>
                      <div
                        className="w-full bg-primary/80 rounded-t-sm transition-all"
                        style={{ height: `${total === 0 ? 2 : (d.human / maxBar) * 100}%` }}
                      />
                      {d.system > 0 && (
                        <div
                          className="w-full bg-muted-foreground/40"
                          style={{ height: `${(d.system / maxBar) * 100}%` }}
                        />
                      )}
                    </div>
                    <span className="text-[9px] text-muted-foreground rotate-[-45deg] origin-top-left whitespace-nowrap mt-1">
                      {format(new Date(d.date), "dd/MM")}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="flex gap-3 text-[10px] text-muted-foreground mt-2 justify-end">
              <span className="flex items-center gap-1"><span className="w-2 h-2 bg-primary/80 rounded-sm" /> humain</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 bg-muted-foreground/40 rounded-sm" /> système</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Top users */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Top 20, Membres les plus actifs (par messages envoyés)</CardTitle>
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
                  <TableHead className="text-right">Conv.</TableHead>
                  <TableHead className="text-right">Dernier msg</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topUsers.map((u, i) => (
                  <TableRow key={u.user_id}>
                    <TableCell className="font-medium text-muted-foreground">{i + 1}</TableCell>
                    <TableCell>
                      <Link
                        to={`/admin/users?id=${u.user_id}`}
                        className="flex items-center gap-2 hover:underline"
                      >
                        <Avatar className="h-7 w-7">
                          <AvatarImage src={u.avatar_url || ""} />
                          <AvatarFallback className="text-xs">{(u.first_name || "?")[0]}</AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-medium">{u.first_name || "Anonyme"}</span>
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">{roleLabel(u.role)}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-semibold">{u.message_count}</TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground">{u.conv_count}</TableCell>
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

function KpiCard({
  icon, label, value, hint, small,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  hint?: string;
  small?: boolean;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-1.5">
          <div className="h-7 w-7 rounded-md bg-muted flex items-center justify-center">{icon}</div>
          <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">{label}</p>
        </div>
        <p className={small ? "text-sm font-semibold text-foreground" : "text-2xl font-bold text-foreground"}>{value}</p>
        {hint && <p className="text-[11px] text-muted-foreground mt-0.5">{hint}</p>}
      </CardContent>
    </Card>
  );
}
