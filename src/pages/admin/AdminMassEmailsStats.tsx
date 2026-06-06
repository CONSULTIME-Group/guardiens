import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type EventRow = {
  event_type: "click" | "mission_created";
  utm_campaign: string;
  utm_content: string | null;
  user_id: string | null;
  mission_id: string | null;
  created_at: string;
};

type MassEmailRow = {
  id: string;
  subject: string;
  cta_url: string | null;
  recipients_count: number | null;
  status: string;
  created_at: string;
};

type CampaignStats = {
  campaign: string;
  sent: number;
  clicks: number;
  uniqueVisitors: number;
  missions: number;
  ctr: number;
  conversionRate: number;
};

const RANGES = [
  { label: "7 derniers jours", value: 7 },
  { label: "30 derniers jours", value: 30 },
  { label: "90 derniers jours", value: 90 },
  { label: "Tout", value: 0 },
];

/** Extrait `utm_campaign` d'une URL CTA, sinon null. */
function extractCampaign(url: string | null): string | null {
  if (!url) return null;
  try {
    return new URL(url).searchParams.get("utm_campaign");
  } catch {
    return null;
  }
}

export default function AdminMassEmailsStats() {
  const [events, setEvents] = useState<EventRow[]>([]);
  const [massEmails, setMassEmails] = useState<MassEmailRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState<number>(30);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const since = days > 0 ? new Date(Date.now() - days * 86400_000).toISOString() : null;

      let evQ = supabase
        .from("email_campaign_events")
        .select("event_type,utm_campaign,utm_content,user_id,mission_id,created_at")
        .order("created_at", { ascending: false })
        .limit(5000);
      if (since) evQ = evQ.gte("created_at", since);

      let meQ = supabase
        .from("mass_emails")
        .select("id,subject,cta_url,recipients_count,status,created_at")
        .order("created_at", { ascending: false })
        .limit(500);
      if (since) meQ = meQ.gte("created_at", since);

      const [{ data: ev, error: evErr }, { data: me, error: meErr }] = await Promise.all([evQ, meQ]);
      if (cancelled) return;
      if (evErr) console.error(evErr);
      if (meErr) console.error(meErr);
      setEvents((ev ?? []) as EventRow[]);
      setMassEmails((me ?? []) as MassEmailRow[]);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [days]);

  const stats: CampaignStats[] = useMemo(() => {
    const map = new Map<
      string,
      { sent: number; clicks: number; visitors: Set<string>; missions: number }
    >();

    // 1) Envois (sent), agrégation depuis mass_emails (utm_campaign extrait du cta_url)
    for (const m of massEmails) {
      const c = extractCampaign(m.cta_url);
      if (!c) continue;
      if (!map.has(c)) map.set(c, { sent: 0, clicks: 0, visitors: new Set(), missions: 0 });
      map.get(c)!.sent += m.recipients_count ?? 0;
    }

    // 2) Clics et conversions
    for (const r of events) {
      const key = r.utm_campaign;
      if (!map.has(key)) map.set(key, { sent: 0, clicks: 0, visitors: new Set(), missions: 0 });
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
        sent: s.sent,
        clicks: s.clicks,
        uniqueVisitors: s.visitors.size,
        missions: s.missions,
        ctr: s.sent > 0 ? (s.visitors.size / s.sent) * 100 : 0,
        conversionRate: s.visitors.size > 0 ? (s.missions / s.visitors.size) * 100 : 0,
      }))
      .sort((a, b) => b.sent - a.sent || b.clicks - a.clicks);
  }, [events, massEmails]);

  const totals = useMemo(
    () => ({
      campaigns: stats.length,
      sent: stats.reduce((a, b) => a + b.sent, 0),
      clicks: stats.reduce((a, b) => a + b.clicks, 0),
      missions: stats.reduce((a, b) => a + b.missions, 0),
    }),
    [stats],
  );

  const oser = stats.find((s) => s.campaign === "oser-2026-05");

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold">Campagnes mail</h1>
          <p className="text-sm text-muted-foreground">
            Envoyés, clics uniques, missions créées, CTR et taux de conversion par campagne.
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

      {/* Carte dédiée à la campagne phare oser-2026-05 */}
      <Card className="border-primary/30">
        <CardHeader>
          <CardTitle className="text-lg">Campagne phare : oser-2026-05</CardTitle>
        </CardHeader>
        <CardContent>
          {oser ? (
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
              <Metric label="Envoyés" value={oser.sent} />
              <Metric label="Clics uniques" value={oser.uniqueVisitors} />
              <Metric label="Missions créées" value={oser.missions} />
              <Metric label="CTR" value={oser.sent > 0 ? `${oser.ctr.toFixed(1)} %` : ","} />
              <Metric
                label="Taux de conversion"
                value={oser.uniqueVisitors > 0 ? `${oser.conversionRate.toFixed(1)} %` : ","}
              />
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Aucun envoi détecté pour <code>oser-2026-05</code> sur cette période.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Totaux globaux */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Metric label="Campagnes" value={totals.campaigns} card />
        <Metric label="Envoyés" value={totals.sent} card />
        <Metric label="Clics totaux" value={totals.clicks} card />
        <Metric label="Missions attribuées" value={totals.missions} card />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Toutes les campagnes</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Chargement…</p>
          ) : stats.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Aucune campagne sur cette période. Les données apparaîtront après le premier envoi avec UTM actif.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Campagne</TableHead>
                  <TableHead className="text-right">Envoyés</TableHead>
                  <TableHead className="text-right">Clics uniques</TableHead>
                  <TableHead className="text-right">Missions</TableHead>
                  <TableHead className="text-right">CTR</TableHead>
                  <TableHead className="text-right">Conversion</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.map((s) => (
                  <TableRow key={s.campaign}>
                    <TableCell className="font-medium">{s.campaign}</TableCell>
                    <TableCell className="text-right">{s.sent || ","}</TableCell>
                    <TableCell className="text-right">{s.uniqueVisitors}</TableCell>
                    <TableCell className="text-right">
                      {s.missions > 0 ? <Badge variant="secondary">{s.missions}</Badge> : <span className="text-muted-foreground">0</span>}
                    </TableCell>
                    <TableCell className="text-right">{s.sent > 0 ? `${s.ctr.toFixed(1)} %` : ","}</TableCell>
                    <TableCell className="text-right">{s.uniqueVisitors > 0 ? `${s.conversionRate.toFixed(1)} %` : ","}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Méthodologie : <strong>Envoyés</strong> = somme des destinataires des envois groupés dont le CTA porte
        l'<code>utm_campaign</code>. <strong>Clics uniques</strong> = visiteurs distincts ayant ouvert un lien UTM
        (anonymes inclus). <strong>CTR</strong> = clics uniques ÷ envoyés. <strong>Conversion</strong> = missions
        créées ÷ clics uniques. Attribution conservée 7 jours en localStorage.
      </p>
    </div>
  );
}

function Metric({ label, value, card }: { label: string; value: number | string; card?: boolean }) {
  const inner = (
    <>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-2xl font-semibold mt-1">{value}</div>
    </>
  );
  if (card) {
    return (
      <Card>
        <CardContent className="pt-6">{inner}</CardContent>
      </Card>
    );
  }
  return <div>{inner}</div>;
}
