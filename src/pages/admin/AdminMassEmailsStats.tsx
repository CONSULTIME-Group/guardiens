import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Row = {
  event_type: "click" | "mission_created";
  utm_campaign: string;
  utm_content: string | null;
  user_id: string | null;
  mission_id: string | null;
  created_at: string;
};

type CampaignStats = {
  campaign: string;
  clicks: number;
  uniqueVisitors: number;
  missions: number;
  conversionRate: number;
};

const RANGES = [
  { label: "7 derniers jours", value: 7 },
  { label: "30 derniers jours", value: 30 },
  { label: "90 derniers jours", value: 90 },
  { label: "Tout", value: 0 },
];

export default function AdminMassEmailsStats() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState<number>(30);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      let q = supabase
        .from("email_campaign_events")
        .select("event_type,utm_campaign,utm_content,user_id,mission_id,created_at")
        .order("created_at", { ascending: false })
        .limit(5000);
      if (days > 0) {
        const since = new Date(Date.now() - days * 86400_000).toISOString();
        q = q.gte("created_at", since);
      }
      const { data, error } = await q;
      if (cancelled) return;
      if (error) {
        console.error(error);
        setRows([]);
      } else {
        setRows((data ?? []) as Row[]);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [days]);

  const stats: CampaignStats[] = useMemo(() => {
    const map = new Map<string, { clicks: number; visitors: Set<string>; missions: number }>();
    for (const r of rows) {
      const key = r.utm_campaign;
      if (!map.has(key)) map.set(key, { clicks: 0, visitors: new Set(), missions: 0 });
      const s = map.get(key)!;
      if (r.event_type === "click") {
        s.clicks++;
        s.visitors.add(r.user_id ?? `anon-${r.created_at}`);
      } else if (r.event_type === "mission_created") {
        s.missions++;
      }
    }
    return Array.from(map.entries())
      .map(([campaign, s]) => ({
        campaign,
        clicks: s.clicks,
        uniqueVisitors: s.visitors.size,
        missions: s.missions,
        conversionRate: s.visitors.size > 0 ? (s.missions / s.visitors.size) * 100 : 0,
      }))
      .sort((a, b) => b.clicks - a.clicks);
  }, [rows]);

  const totals = useMemo(
    () => ({
      clicks: stats.reduce((a, b) => a + b.clicks, 0),
      missions: stats.reduce((a, b) => a + b.missions, 0),
      campaigns: stats.length,
    }),
    [stats],
  );

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold">Statistiques des envois groupés</h1>
          <p className="text-sm text-muted-foreground">
            Clics et conversions attribués via UTM (table <code>email_campaign_events</code>).
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={String(days)} onValueChange={(v) => setDays(Number(v))}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {RANGES.map((r) => (
                <SelectItem key={r.value} value={String(r.value)}>
                  {r.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button asChild variant="outline">
            <Link to="/admin/envois-groupes">Retour aux envois</Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Campagnes actives</CardTitle></CardHeader>
          <CardContent><div className="text-3xl font-semibold">{totals.campaigns}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Clics totaux</CardTitle></CardHeader>
          <CardContent><div className="text-3xl font-semibold">{totals.clicks}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Missions créées (attribuées)</CardTitle></CardHeader>
          <CardContent><div className="text-3xl font-semibold">{totals.missions}</div></CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Performance par campagne</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Chargement…</p>
          ) : stats.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Aucun événement enregistré sur cette période. Les données apparaîtront après le premier envoi avec UTM actif.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Campagne</TableHead>
                  <TableHead className="text-right">Clics</TableHead>
                  <TableHead className="text-right">Visiteurs uniques</TableHead>
                  <TableHead className="text-right">Missions</TableHead>
                  <TableHead className="text-right">Taux de conversion</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.map((s) => (
                  <TableRow key={s.campaign}>
                    <TableCell className="font-medium">{s.campaign}</TableCell>
                    <TableCell className="text-right">{s.clicks}</TableCell>
                    <TableCell className="text-right">{s.uniqueVisitors}</TableCell>
                    <TableCell className="text-right">
                      {s.missions > 0 ? (
                        <Badge variant="secondary">{s.missions}</Badge>
                      ) : (
                        <span className="text-muted-foreground">0</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {s.uniqueVisitors > 0 ? `${s.conversionRate.toFixed(1)} %` : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Méthodologie : un clic = un événement <code>click</code>. Une mission créée alors qu'une campagne est active
        en localStorage (TTL 7 jours) génère un événement <code>mission_created</code> attribué à cette campagne.
        Le taux de conversion = missions ÷ visiteurs uniques.
      </p>
    </div>
  );
}
