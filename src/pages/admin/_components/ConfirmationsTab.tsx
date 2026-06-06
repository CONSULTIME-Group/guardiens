import { useEffect, useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { RefreshCw, CheckCircle2, Clock, XCircle, Hourglass } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format, formatDistanceToNowStrict } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";

interface Row {
  message_id: string;
  recipient_email: string;
  sent_at: string;
  status: string;
  error_message: string | null;
  user_id: string | null;
  user_created_at: string | null;
  confirmed_at: string | null;
  delay_seconds: number | null;
}

interface Stats {
  total_sent: number;
  total_failed: number;
  total_confirmed: number;
  total_pending: number;
  confirmation_rate: number;
  median_delay_seconds: number | null;
  avg_delay_seconds: number | null;
  p90_delay_seconds: number | null;
}

const RANGES = [
  { label: "24h", value: 1 },
  { label: "7 j", value: 7 },
  { label: "30 j", value: 30 },
];

const formatDelay = (s: number | null) => {
  if (s === null || s === undefined) return ",";
  if (s < 0) return ",";
  if (s < 60) return `${Math.round(s)}s`;
  if (s < 3600) return `${Math.round(s / 60)} min`;
  if (s < 86400) return `${(s / 3600).toFixed(1)} h`;
  return `${(s / 86400).toFixed(1)} j`;
};

const StatusBadge = ({ row }: { row: Row }) => {
  if (row.confirmed_at) {
    return <Badge variant="outline" className="border-green-500 text-green-700 gap-1"><CheckCircle2 className="h-3 w-3" />Confirmé</Badge>;
  }
  if (row.status === "sent") {
    return <Badge variant="outline" className="border-amber-500 text-warning gap-1"><Hourglass className="h-3 w-3" />En attente</Badge>;
  }
  if (row.status === "failed" || row.status === "dlq" || row.status === "bounced") {
    return <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" />Échec</Badge>;
  }
  return <Badge variant="secondary" className="gap-1"><Clock className="h-3 w-3" />{row.status}</Badge>;
};

export const ConfirmationsTab = () => {
  const [days, setDays] = useState(7);
  const [rows, setRows] = useState<Row[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "confirmed" | "pending" | "failed">("all");

  const load = useCallback(async () => {
    setLoading(true);
    const [r, s] = await Promise.all([
      supabase.rpc("admin_get_signup_confirmations", { p_days: days }),
      supabase.rpc("admin_get_signup_confirmation_stats", { p_days: days }),
    ]);
    if (r.error) {
      toast.error("Erreur chargement");
    } else {
      setRows((r.data ?? []) as Row[]);
    }
    if (!s.error && s.data && Array.isArray(s.data) && s.data[0]) {
      setStats(s.data[0] as Stats);
    }
    setLoading(false);
  }, [days]);

  useEffect(() => { load(); }, [load]);

  const filtered = rows.filter((r) => {
    if (search && !r.recipient_email.toLowerCase().includes(search.toLowerCase())) return false;
    if (filter === "confirmed") return !!r.confirmed_at;
    if (filter === "pending") return r.status === "sent" && !r.confirmed_at;
    if (filter === "failed") return ["failed", "dlq", "bounced"].includes(r.status);
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Range + actions */}
      <div className="flex flex-wrap items-center gap-2">
        {RANGES.map((r) => (
          <Button
            key={r.value}
            size="sm"
            variant={days === r.value ? "default" : "outline"}
            onClick={() => setDays(r.value)}
          >
            {r.label}
          </Button>
        ))}
        <Button size="sm" variant="ghost" onClick={load} disabled={loading} className="ml-auto gap-1">
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Rafraîchir
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="p-4">
          <div className="text-xs text-muted-foreground">Emails envoyés</div>
          <div className="text-2xl font-bold">{stats?.total_sent ?? ","}</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-xs text-muted-foreground">Confirmés</div>
          <div className="text-2xl font-bold text-green-700">{stats?.total_confirmed ?? ","}</div>
          <div className="text-xs text-muted-foreground mt-1">
            Taux : {stats?.confirmation_rate ?? 0}%
          </div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-xs text-muted-foreground">En attente</div>
          <div className="text-2xl font-bold text-warning">{stats?.total_pending ?? ","}</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-xs text-muted-foreground">Échecs</div>
          <div className="text-2xl font-bold text-destructive">{stats?.total_failed ?? ","}</div>
        </CardContent></Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card><CardContent className="p-4">
          <div className="text-xs text-muted-foreground">Délai médian de confirmation</div>
          <div className="text-xl font-semibold">{formatDelay(stats?.median_delay_seconds ?? null)}</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-xs text-muted-foreground">Délai moyen</div>
          <div className="text-xl font-semibold">{formatDelay(stats?.avg_delay_seconds ?? null)}</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-xs text-muted-foreground">Délai p90 (90% confirmés en moins de)</div>
          <div className="text-xl font-semibold">{formatDelay(stats?.p90_delay_seconds ?? null)}</div>
        </CardContent></Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="Rechercher un email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        {(["all", "confirmed", "pending", "failed"] as const).map((f) => (
          <Button
            key={f}
            size="sm"
            variant={filter === f ? "default" : "outline"}
            onClick={() => setFilter(f)}
          >
            {f === "all" ? "Tous" : f === "confirmed" ? "Confirmés" : f === "pending" ? "En attente" : "Échecs"}
          </Button>
        ))}
        <span className="text-xs text-muted-foreground ml-auto">{filtered.length} ligne(s)</span>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Destinataire</TableHead>
                <TableHead>Envoi</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Confirmé le</TableHead>
                <TableHead>Délai</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    {loading ? "Chargement…" : "Aucune confirmation sur la période"}
                  </TableCell>
                </TableRow>
              )}
              {filtered.map((row) => (
                <TableRow key={row.message_id}>
                  <TableCell className="font-mono text-xs">{row.recipient_email}</TableCell>
                  <TableCell className="text-xs">
                    {format(new Date(row.sent_at), "dd MMM HH:mm", { locale: fr })}
                    <div className="text-muted-foreground">
                      il y a {formatDistanceToNowStrict(new Date(row.sent_at), { locale: fr })}
                    </div>
                  </TableCell>
                  <TableCell><StatusBadge row={row} /></TableCell>
                  <TableCell className="text-xs">
                    {row.confirmed_at
                      ? format(new Date(row.confirmed_at), "dd MMM HH:mm", { locale: fr })
                      : ","}
                  </TableCell>
                  <TableCell className="text-xs font-medium">
                    {formatDelay(row.delay_seconds)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default ConfirmationsTab;
