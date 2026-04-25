import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useAdmin } from "@/hooks/useAdmin";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { RefreshCw, AlertTriangle, CheckCircle2, Search } from "lucide-react";

interface AppRow {
  id: string;
  status: string;
  created_at: string;
  sit_id: string;
  sitter_id: string;
  sit?: {
    title: string | null;
    user_id: string;
    status: string;
  } | null;
  sitter?: {
    first_name: string | null;
    last_name: string | null;
  } | null;
  owner?: {
    first_name: string | null;
    last_name: string | null;
  } | null;
}

const statusColor: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  accepted: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  rejected: "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300",
  withdrawn: "bg-muted text-muted-foreground",
};

const AdminDiagnostics = () => {
  const { user } = useAuth();
  const { isAdmin } = useAdmin();
  const [rows, setRows] = useState<AppRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const [lastFetched, setLastFetched] = useState<Date | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Requête identique à celle utilisée côté admin pour reproduire
      // exactement ce que RLS retourne pour auth.uid().
      const { data, error: err } = await supabase
        .from("applications")
        .select(
          "id, status, created_at, sit_id, sitter_id, " +
            "sit:sits!applications_sit_id_fkey(title, user_id, status), " +
            "sitter:profiles!applications_sitter_id_fkey(first_name, last_name)"
        )
        .order("created_at", { ascending: false });

      if (err) throw err;

      // Charger en parallèle les profils des propriétaires (user_id du sit)
      const ownerIds = Array.from(
        new Set(((data as any[]) || []).map((r) => r.sit?.user_id).filter(Boolean))
      ) as string[];

      let ownersMap = new Map<string, { first_name: string | null; last_name: string | null }>();
      if (ownerIds.length) {
        const { data: owners } = await supabase
          .from("profiles")
          .select("id, first_name, last_name")
          .in("id", ownerIds);
        (owners || []).forEach((o: any) => ownersMap.set(o.id, o));
      }

      const enriched: AppRow[] = ((data as any[]) || []).map((r) => ({
        ...r,
        owner: r.sit?.user_id ? ownersMap.get(r.sit.user_id) : null,
      }));

      setRows(enriched);
      setLastFetched(new Date());
    } catch (e: any) {
      setError(e?.message || "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filtered = useMemo(() => {
    if (!filter.trim()) return rows;
    const q = filter.toLowerCase();
    return rows.filter((r) => {
      return (
        r.sit?.title?.toLowerCase().includes(q) ||
        r.sitter?.first_name?.toLowerCase().includes(q) ||
        r.sitter?.last_name?.toLowerCase().includes(q) ||
        r.owner?.first_name?.toLowerCase().includes(q) ||
        r.owner?.last_name?.toLowerCase().includes(q) ||
        r.sit_id.includes(q) ||
        r.sitter_id.includes(q) ||
        r.id.includes(q)
      );
    });
  }, [rows, filter]);

  // Compteur par sit
  const countsBySit = useMemo(() => {
    const m = new Map<string, { total: number; pending: number; title: string }>();
    rows.forEach((r) => {
      const cur = m.get(r.sit_id) || {
        total: 0,
        pending: 0,
        title: r.sit?.title || "—",
      };
      cur.total += 1;
      if (r.status === "pending") cur.pending += 1;
      m.set(r.sit_id, cur);
    });
    return Array.from(m.entries()).sort((a, b) => b[1].total - a[1].total);
  }, [rows]);

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Diagnostic — Candidatures</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Liste des candidatures retournées par la requête Supabase{" "}
            <code className="text-xs bg-muted px-1.5 py-0.5 rounded">applications</code> avec
            l'<code className="text-xs bg-muted px-1.5 py-0.5 rounded">auth.uid()</code> courant
            (RLS appliqué).
          </p>
        </div>
        <Button onClick={fetchData} disabled={loading} variant="outline" size="sm">
          <RefreshCw className={`h-4 w-4 mr-1.5 ${loading ? "animate-spin" : ""}`} />
          Recharger
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Contexte d'authentification</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1.5 text-sm">
          <div className="flex gap-2">
            <span className="text-muted-foreground w-32">auth.uid()</span>
            <code className="text-xs bg-muted px-2 py-0.5 rounded">{user?.id || "—"}</code>
          </div>
          <div className="flex gap-2">
            <span className="text-muted-foreground w-32">email</span>
            <span>{user?.email || "—"}</span>
          </div>
          <div className="flex gap-2 items-center">
            <span className="text-muted-foreground w-32">rôle admin</span>
            {isAdmin ? (
              <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                <CheckCircle2 className="h-3 w-3 mr-1" /> admin
              </Badge>
            ) : (
              <Badge variant="outline">non admin</Badge>
            )}
          </div>
          {lastFetched && (
            <div className="flex gap-2 text-xs text-muted-foreground pt-1">
              <span className="w-32">dernière requête</span>
              <span>{format(lastFetched, "PPpp", { locale: fr })}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {error && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="pt-6 flex items-start gap-3 text-sm">
            <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-destructive">Erreur de requête</p>
              <p className="text-muted-foreground mt-1">{error}</p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Total visibles" value={rows.length} />
        <StatCard
          label="En attente"
          value={rows.filter((r) => r.status === "pending").length}
          tone="amber"
        />
        <StatCard
          label="Acceptées"
          value={rows.filter((r) => r.status === "accepted").length}
          tone="emerald"
        />
        <StatCard label="Annonces concernées" value={countsBySit.length} />
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Compteurs par annonce</CardTitle>
          <CardDescription>
            Permet de comparer rapidement avec ce qu'affiche l'écran public ou le dashboard
            propriétaire.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Annonce</TableHead>
                  <TableHead className="w-24 text-right">Total</TableHead>
                  <TableHead className="w-28 text-right">En attente</TableHead>
                  <TableHead className="w-32">sit_id</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {countsBySit.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-6">
                      {loading ? "Chargement…" : "Aucune candidature visible."}
                    </TableCell>
                  </TableRow>
                ) : (
                  countsBySit.map(([sitId, c]) => (
                    <TableRow key={sitId}>
                      <TableCell className="font-medium">
                        <Link
                          to={`/sits/${sitId}`}
                          className="hover:underline text-primary"
                        >
                          {c.title}
                        </Link>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{c.total}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {c.pending > 0 ? (
                          <Badge className={statusColor.pending}>{c.pending}</Badge>
                        ) : (
                          <span className="text-muted-foreground">0</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <code className="text-[11px] text-muted-foreground">
                          {sitId.slice(0, 8)}…
                        </code>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Détail des candidatures</CardTitle>
          <CardDescription>
            Liste brute filtrée par RLS. Si une ligne attendue n'apparaît pas ici, c'est
            qu'elle est bloquée par les policies pour <code>{user?.id?.slice(0, 8)}…</code>.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Filtrer par titre, prénom, ID…"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Annonce</TableHead>
                  <TableHead>Propriétaire</TableHead>
                  <TableHead>Candidat</TableHead>
                  <TableHead>Statut</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-6">
                      {loading ? "Chargement…" : "Aucun résultat."}
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {format(new Date(r.created_at), "dd/MM/yy HH:mm")}
                      </TableCell>
                      <TableCell className="max-w-[260px] truncate">
                        <Link
                          to={`/sits/${r.sit_id}`}
                          className="hover:underline text-primary text-sm"
                        >
                          {r.sit?.title || "—"}
                        </Link>
                      </TableCell>
                      <TableCell className="text-sm">
                        {r.owner
                          ? `${r.owner.first_name || ""} ${r.owner.last_name || ""}`.trim() ||
                            "—"
                          : "—"}
                      </TableCell>
                      <TableCell className="text-sm">
                        {r.sitter
                          ? `${r.sitter.first_name || ""} ${r.sitter.last_name || ""}`.trim() ||
                            "—"
                          : "—"}
                      </TableCell>
                      <TableCell>
                        <Badge className={statusColor[r.status] || ""}>{r.status}</Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

const StatCard = ({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: "amber" | "emerald";
}) => (
  <Card>
    <CardContent className="pt-5 pb-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p
        className={`text-2xl font-bold tabular-nums mt-1 ${
          tone === "amber"
            ? "text-amber-600 dark:text-amber-400"
            : tone === "emerald"
            ? "text-emerald-600 dark:text-emerald-400"
            : "text-foreground"
        }`}
      >
        {value}
      </p>
    </CardContent>
  </Card>
);

export default AdminDiagnostics;
