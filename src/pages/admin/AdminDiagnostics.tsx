import { KpiTile } from "@/components/admin/ui";
import WebVitalsCard from "@/components/admin/diagnostics/WebVitalsCard";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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

interface BackfillResult {
  processed: number;
  updated: number;
  skipped: number;
  errors: number;
  unique_postal_codes: number;
  dry_run: boolean;
  duration_ms: number;
}

const statusColor: Record<string, string> = {
  pending: "bg-warning-soft text-warning-foreground dark:bg-warning dark:text-warning",
  accepted: "bg-success/10 text-success dark:bg-success dark:text-success",
  rejected: "bg-destructive/10 text-destructive dark:bg-destructive dark:text-destructive",
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
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [geoResult, setGeoResult] = useState<BackfillResult | null>(null);
  const [geoConfirmOpen, setGeoConfirmOpen] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      // RPC sécurisée : retourne uniquement les méta-données admin (pas le contenu des candidatures)
      const { data, error: err } = await supabase.rpc("admin_get_applications_diagnostic");

      if (err) throw err;

      const enriched: AppRow[] = ((data as any[]) || []).map((r) => ({
        id: r.id,
        status: r.status,
        created_at: r.created_at,
        sit_id: r.sit_id,
        sitter_id: r.sitter_id,
        sit: { title: r.sit_title, user_id: r.sit_user_id, status: r.sit_status },
        sitter: { first_name: r.sitter_first_name, last_name: r.sitter_last_name },
        owner: { first_name: r.owner_first_name, last_name: r.owner_last_name },
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

  const runCoordinateBackfill = async () => {
    setGeoLoading(true);
    setGeoError(null);
    setGeoResult(null);
    try {
      if (!isAdmin) throw new Error("Accès réservé aux admins.");

      const { data, error: invokeError } = await supabase.functions.invoke(
        "backfill-profile-coordinates",
        { body: {} },
      );

      if (invokeError) throw invokeError;
      if (data?.error) throw new Error(data.error);

      const result = data as BackfillResult;
      setGeoResult(result);

      // Audit trail
      const { data: userData } = await supabase.auth.getUser();
      const adminId = userData.user?.id;
      if (adminId) {
        await supabase.from("admin_action_logs").insert({
          admin_id: adminId,
          action: "coordinate_backfill",
          target_type: "profiles_bulk",
          target_id: null,
          metadata: {
            affected: result?.updated ?? null,
            processed: result?.processed ?? null,
            skipped: result?.skipped ?? null,
            errors: result?.errors ?? null,
          },
        });
      }
    } catch (e: any) {
      setGeoError(e?.message || "Erreur inconnue");
    } finally {
      setGeoLoading(false);
      setGeoConfirmOpen(false);
    }
  };


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
        title: r.sit?.title || "·",
      };
      cur.total += 1;
      if (r.status === "pending") cur.pending += 1;
      m.set(r.sit_id, cur);
    });
    return Array.from(m.entries()).sort((a, b) => b[1].total - a[1].total);
  }, [rows]);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Diagnostic"
        description="Candidatures lisibles par votre compte administrateur, avec les outils techniques de mise en ligne."
        actions={<>
          <Button asChild variant="ghost" size="sm"><Link to="/admin/build-info">Version en ligne</Link></Button>
          <Button asChild variant="ghost" size="sm"><Link to="/admin/prerender">Instantanés des pages</Link></Button>
          <Button onClick={fetchData} disabled={loading} variant="outline" size="sm">
            <RefreshCw className={`h-4 w-4 mr-1.5 ${loading ? "animate-spin" : ""}`} />
            Recharger
          </Button>
        </>}
      />

      <WebVitalsCard />

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Contexte d'authentification</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1.5 text-sm">
          <div className="flex gap-2">
            <span className="text-muted-foreground w-32">auth.uid()</span>
            <code className="text-xs bg-muted px-2 py-0.5 rounded">{user?.id || "·"}</code>
          </div>
          <div className="flex gap-2">
            <span className="text-muted-foreground w-32">email</span>
            <span>{user?.email || "·"}</span>
          </div>
          <div className="flex gap-2 items-center">
            <span className="text-muted-foreground w-32">rôle admin</span>
            {isAdmin ? (
              <Badge className="bg-success/10 text-success dark:bg-success dark:text-success">
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

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Coordonnées des profils</CardTitle>
          <CardDescription>
            Rattrape les profils qui ont un code postal mais pas encore de latitude/longitude,
            afin que le rayon d'entraide fonctionne sur une vraie distance.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={() => setGeoConfirmOpen(true)} disabled={geoLoading || !isAdmin} size="sm">
              <RefreshCw className={`h-4 w-4 mr-1.5 ${geoLoading ? "animate-spin" : ""}`} />
              Rattraper les coordonnées
            </Button>
            {!isAdmin && <span className="text-sm text-muted-foreground">Admin requis.</span>}
          </div>
          {geoError && (
            <div className="rounded-md border border-destructive/50 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              {geoError}
            </div>
          )}
          {geoResult && (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <InlineMetric label="Profils traités" value={geoResult.processed} />
              <InlineMetric label="Mis à jour" value={geoResult.updated} tone="emerald" />
              <InlineMetric label="Ignorés" value={geoResult.skipped} />
              <InlineMetric label="Erreurs" value={geoResult.errors} tone="amber" />
              <InlineMetric label="Codes postaux" value={geoResult.unique_postal_codes} />
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
                  <TableHead className="w-32">Annonce</TableHead>
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
                          {r.sit?.title || "·"}
                        </Link>
                      </TableCell>
                      <TableCell className="text-sm">
                        {r.owner
                          ? `${r.owner.first_name || ""} ${r.owner.last_name || ""}`.trim() ||
                            "·"
                          : "·"}
                      </TableCell>
                      <TableCell className="text-sm">
                        {r.sitter
                          ? `${r.sitter.first_name || ""} ${r.sitter.last_name || ""}`.trim() ||
                            "·"
                          : "·"}
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

      <AlertDialog open={geoConfirmOpen} onOpenChange={(v) => { if (!v && !geoLoading) setGeoConfirmOpen(false); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rattraper les coordonnées ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette opération va recalculer et réécrire en base les coordonnées
              (latitude/longitude) de nombreux profils à partir de leur code postal.
              C'est une action de masse qui modifie durablement les données de géolocalisation
              des membres. Elle sera tracée dans le journal d'audit.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={geoLoading}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              disabled={geoLoading}
              onClick={(e) => { e.preventDefault(); runCoordinateBackfill(); }}
            >
              {geoLoading ? "Traitement…" : "Confirmer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

const StatCard = ({ label, value, tone }: { label: string; value: number; tone?: "amber" | "emerald" }) => (
  <KpiTile label={label} value={value} tone={tone === "amber" ? "warning" : tone === "emerald" ? "success" : "default"} />
);

const InlineMetric = ({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: "amber" | "emerald";
}) => (
  <div className="rounded-md border bg-muted/30 px-3 py-2">
    <p className="text-xs text-muted-foreground">{label}</p>
    <p
      className={`text-xl font-bold tabular-nums mt-1 ${
        tone === "amber"
          ? "text-warning dark:text-warning"
          : tone === "emerald"
          ? "text-success dark:text-success"
          : "text-foreground"
      }`}
    >
      {value}
    </p>
  </div>
);

export default AdminDiagnostics;
