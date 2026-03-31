import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2 } from "lucide-react";
import type { GA4ChannelRow } from "@/hooks/useSeoData";

const CHANNEL_MAP: Record<string, string> = {
  "Organic Search": "Recherche organique",
  Direct: "Direct",
  "Organic Social": "Réseaux sociaux",
  Referral: "Référents",
};

const CHANNEL_COLORS: Record<string, string> = {
  "Recherche organique": "#2D6A4F",
  Direct: "#52B788",
  "Réseaux sociaux": "#95D5B2",
  Référents: "#B7E4C7",
  Autres: "#D8F3DC",
};

function normalizeChannels(raw: GA4ChannelRow[]) {
  const known = new Set(Object.keys(CHANNEL_MAP));
  const mapped: Record<string, { sessions: number; activeUsers: number }> = {};

  for (const row of raw) {
    const label = known.has(row.channel)
      ? CHANNEL_MAP[row.channel]
      : "Autres";
    if (!mapped[label]) mapped[label] = { sessions: 0, activeUsers: 0 };
    mapped[label].sessions += row.sessions;
    mapped[label].activeUsers += row.activeUsers;
  }

  const totalSessions = Object.values(mapped).reduce((s, v) => s + v.sessions, 0);

  return Object.entries(mapped)
    .map(([name, v]) => ({
      name,
      sessions: v.sessions,
      activeUsers: v.activeUsers,
      percent: totalSessions > 0 ? Math.round((v.sessions / totalSessions) * 100) : 0,
      color: CHANNEL_COLORS[name] || "#D8F3DC",
    }))
    .sort((a, b) => b.sessions - a.sessions);
}

interface Props {
  channels: GA4ChannelRow[] | undefined;
  loading: boolean;
}

const TrafficSources = ({ channels, loading }: Props) => {
  if (loading) {
    return (
      <Card>
        <CardContent className="py-12 flex items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!channels || channels.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          Aucune donnée sur cette période
        </CardContent>
      </Card>
    );
  }

  const data = normalizeChannels(channels);
  const totalSessions = data.reduce((s, d) => s + d.sessions, 0);

  return (
    <div className="space-y-4">
      <h2 className="font-semibold text-base mb-4">Sources de trafic (30j)</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Donut chart */}
        <Card>
          <CardContent className="pt-6 pb-4">
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    dataKey="sessions"
                    paddingAngle={2}
                    stroke="none"
                  >
                    {data.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => [value.toLocaleString(), "Sessions"]}
                    contentStyle={{ borderRadius: "8px", fontSize: "12px" }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 justify-center mt-2">
              {data.map((d) => (
                <div key={d.name} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: d.color }}
                  />
                  {d.name} · {d.percent}%
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardContent className="pt-6 pb-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Canal</TableHead>
                  <TableHead className="text-right">Sessions</TableHead>
                  <TableHead className="text-right">Utilisateurs</TableHead>
                  <TableHead className="text-right">% du total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((d) => (
                  <TableRow key={d.name}>
                    <TableCell className="flex items-center gap-2">
                      <span
                        className="inline-block h-2.5 w-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: d.color }}
                      />
                      {d.name}
                    </TableCell>
                    <TableCell className="text-right">{d.sessions.toLocaleString()}</TableCell>
                    <TableCell className="text-right">{d.activeUsers.toLocaleString()}</TableCell>
                    <TableCell className="text-right">{d.percent}%</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TrafficSources;
