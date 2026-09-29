import { campaignLabel } from "@/lib/admin/labels";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { fetchAllRows } from "@/lib/admin/fetchAllRows";
import { campaignCounts, clickRate, type MassSendRow } from "@/lib/admin/massEmailCounts";
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
  status: string;
  filters?: { template_name?: string } | null;
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
  const [sends, setSends] = useState<MassSendRow[]>([]);
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
        .select("id,subject,cta_url,status,created_at,filters")
        .order("created_at", { ascending: false })
        .limit(500);
      if (since) meQ = meQ.gte("created_at", since);

      const [{ data: ev, error: evErr }, { data: me, error: meErr }] = await Promise.all([evQ, meQ]);
      if (cancelled) return;
      if (evErr) console.error(evErr);
      if (meErr) console.error(meErr);
      setEvents((ev ?? []) as EventRow[]);
      const list = (me ?? []) as MassEmailRow[];
      setMassEmails(list);
      // Lot A8 : destinataires, envoyés et cliqueurs lus dans mass_email_sends.
      const ids = list.map((m) => m.id);
      const rows: MassSendRow[] = [];
      for (let i = 0; i < ids.length; i += 100) {
        const chunk = ids.slice(i, i + 100);
        try {
          const res = await fetchAllRows<MassSendRow>((from, to) =>
            supabase.from("mass_email_sends").select("mass_email_id,recipient_email,status,first_clicked_at")
              .in("mass_email_id", chunk).order("created_at", { ascending: true }).order("id", { ascending: true }).range(from, to) as any);
          rows.push(...res.rows);
        } catch (e) { console.error(e); }
      }
      if (cancelled) return;
      setSends(rows);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [days]);

  const stats: CampaignStats[] = useMemo(() => {
    // Lot A8 : une campagne = utm_campaign du CTA, sinon gabarit. Destinataires
    // et cliqueurs uniques par adresse, depuis mass_email_sends.
    const keyOf = (m: MassEmailRow) => extractCampaign(m.cta_url) ?? m.filters?.template_name ?? null;
    const idsByKey = new Map<string, Set<string>>();
    for (const m of massEmails) {
      const k = keyOf(m);
      if (!k) continue;
      if (!idsByKey.has(k)) idsByKey.set(k, new Set());
      idsByKey.get(k)!.add(m.id);
    }
    const missions = new Map<string, number>();
    for (const r of events) {
      if (r.event_type === "mission_created") missions.set(r.utm_campaign, (missions.get(r.utm_campaign) ?? 0) + 1);
    }
    return Array.from(idsByKey.entries())
      .map(([campaign, ids]) => {
        const c = campaignCounts(sends.filter((s) => ids.has(s.mass_email_id)));
        const m = missions.get(campaign) ?? 0;
        return {
          campaign,
          sent: c.recipients,
          clicks: c.clickers,
          uniqueVisitors: c.clickers,
          missions: m,
          ctr: clickRate(c.clickers, c.recipients),
          conversionRate: c.clickers > 0 ? (m / c.clickers) * 100 : 0,
        };
      })
      .sort((a, b) => b.sent - a.sent || b.clicks - a.clicks);
  }, [events, massEmails, sends]);

  const totals = useMemo(
    () => ({
      campaigns: stats.length,
      sent: stats.reduce((a, b) => a + b.sent, 0),
      clicks: stats.reduce((a, b) => a + b.clicks, 0),
      missions: stats.reduce((a, b) => a + b.missions, 0),
    }),
    [stats],
  );

  return (
    <div className="space-y-6">
      <AdminPageHeader title="Stats campagnes" description="Envoyés, clics uniques, missions créées, taux de clic et de conversion par campagne." />
      <div className="flex items-center justify-end gap-4 flex-wrap">
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

      {/* Totaux globaux */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Metric label="Campagnes" value={totals.campaigns} card />
        <Metric label="Envoyés" value={totals.sent} card />
        <Metric label="Clics uniques" value={totals.clicks} card />
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
                  <TableHead className="text-right">Taux de clic</TableHead>
                  <TableHead className="text-right">Conversion</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.map((s) => (
                  <TableRow key={s.campaign}>
                    <TableCell className="font-medium">{campaignLabel(s.campaign)}</TableCell>
                    <TableCell className="text-right">{s.sent || "·"}</TableCell>
                    <TableCell className="text-right">{s.uniqueVisitors}</TableCell>
                    <TableCell className="text-right">
                      {s.missions > 0 ? <Badge variant="secondary">{s.missions}</Badge> : <span className="text-muted-foreground">0</span>}
                    </TableCell>
                    <TableCell className="text-right">{s.sent > 0 ? `${s.ctr.toFixed(1)} %` : "·"}</TableCell>
                    <TableCell className="text-right">{s.uniqueVisitors > 0 ? `${s.conversionRate.toFixed(1)} %` : "·"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Méthodologie : <strong>Envoyés</strong> = destinataires distincts des envois groupés (hors ignorés), lus
        dans le détail des envois. <strong>Clics uniques</strong> = destinataires distincts ayant cliqué, jamais un
        visiteur anonyme. <strong>Taux de clic</strong> = clics uniques ÷ envoyés, au plus 100 %. <strong>Conversion</strong> = missions
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
