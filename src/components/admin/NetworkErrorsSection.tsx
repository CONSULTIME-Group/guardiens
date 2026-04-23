import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Network, RefreshCw } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";

type Period = "24h" | "7d" | "30d" | "all";

interface NetworkErrorRow {
  id: string;
  message: string;
  occurrences: number;
  last_seen_at: string;
  context: any;
  resolved_at: string | null;
}

const PERIOD_HOURS: Record<Period, number | null> = {
  "24h": 24,
  "7d": 24 * 7,
  "30d": 24 * 30,
  all: null,
};

const statusBadgeVariant = (status: number): "destructive" | "secondary" | "outline" => {
  if (status >= 500) return "destructive";
  if (status >= 400) return "secondary";
  return "outline";
};

export const NetworkErrorsSection = () => {
  const [rows, setRows] = useState<NetworkErrorRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>("7d");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const load = async () => {
    setLoading(true);
    let q = supabase
      .from("error_logs")
      .select("id, message, occurrences, last_seen_at, context, resolved_at")
      .eq("source", "NetworkErrorMonitor")
      .order("last_seen_at", { ascending: false })
      .limit(300);

    const hours = PERIOD_HOURS[period];
    if (hours !== null) {
      const since = new Date(Date.now() - hours * 3600_000).toISOString();
      q = q.gte("last_seen_at", since);
    }

    const { data, error } = await q;
    if (error) toast.error("Chargement des erreurs réseau impossible");
    setRows((data as NetworkErrorRow[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [period]);

  const enriched = useMemo(() => {
    return rows.map((r) => {
      const ctx = r.context ?? {};
      return {
        ...r,
        route: typeof ctx.route === "string" ? ctx.route : "—",
        method: typeof ctx.method === "string" ? ctx.method : "—",
        url: typeof ctx.url === "string" ? ctx.url : "—",
        status: typeof ctx.status === "number" ? ctx.status : 0,
      };
    });
  }, [rows]);

  const filtered = useMemo(() => {
    if (statusFilter === "all") return enriched;
    if (statusFilter === "4xx") return enriched.filter((r) => r.status >= 400 && r.status < 500);
    if (statusFilter === "5xx") return enriched.filter((r) => r.status >= 500 && r.status < 600);
    if (statusFilter === "0") return enriched.filter((r) => r.status === 0);
    return enriched;
  }, [enriched, statusFilter]);

  const stats = useMemo(() => {
    const total = filtered.reduce((s, r) => s + (r.occurrences || 1), 0);
    const unique = filtered.length;
    const routes = new Set(filtered.map((r) => r.route)).size;
    return { total, unique, routes };
  }, [filtered]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Network className="h-5 w-5 text-destructive" />
              Erreurs réseau (NetworkErrorMonitor)
            </CardTitle>
            <CardDescription className="mt-1">
              Réponses non-2xx captées sur les écrans critiques (route, méthode, URL, statut).
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            <Select value={period} onValueChange={(v: Period) => setPeriod(v)}>
              <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="24h">Dernières 24h</SelectItem>
                <SelectItem value="7d">7 derniers jours</SelectItem>
                <SelectItem value="30d">30 derniers jours</SelectItem>
                <SelectItem value="all">Tout</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous statuts</SelectItem>
                <SelectItem value="4xx">4xx</SelectItem>
                <SelectItem value="5xx">5xx</SelectItem>
                <SelectItem value="0">Réseau (0)</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={load} variant="outline" size="sm" className="gap-2">
              <RefreshCw className="h-4 w-4" /> Actualiser
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 mt-4">
          <div className="rounded-md border border-border p-3">
            <p className="text-xs text-muted-foreground">Occurrences</p>
            <p className="text-2xl font-bold">{stats.total}</p>
          </div>
          <div className="rounded-md border border-border p-3">
            <p className="text-xs text-muted-foreground">Erreurs uniques</p>
            <p className="text-2xl font-bold">{stats.unique}</p>
          </div>
          <div className="rounded-md border border-border p-3">
            <p className="text-xs text-muted-foreground">Routes touchées</p>
            <p className="text-2xl font-bold">{stats.routes}</p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {loading ? (
          <div className="p-8 text-center text-muted-foreground text-sm">Chargement…</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground text-sm">
            Aucune erreur réseau sur cette période.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[90px]">Statut</TableHead>
                  <TableHead className="w-[80px]">Méthode</TableHead>
                  <TableHead className="w-[180px]">Route</TableHead>
                  <TableHead>URL</TableHead>
                  <TableHead className="w-[80px] text-right">×</TableHead>
                  <TableHead className="w-[140px]">Dernière vue</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r) => (
                  <TableRow key={r.id} className={r.resolved_at ? "opacity-50" : ""}>
                    <TableCell>
                      <Badge variant={statusBadgeVariant(r.status)}>{r.status || "net"}</Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{r.method}</TableCell>
                    <TableCell className="font-mono text-xs truncate max-w-[180px]" title={r.route}>
                      {r.route}
                    </TableCell>
                    <TableCell className="font-mono text-xs truncate max-w-[400px]" title={r.url}>
                      {r.url}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{r.occurrences}</TableCell>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatDistanceToNow(new Date(r.last_seen_at), { addSuffix: true, locale: fr })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default NetworkErrorsSection;
