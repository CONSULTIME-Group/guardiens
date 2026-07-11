import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ExternalLink, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { toast } from "sonner";

const PAGE_SIZE = 50;

const ACTION_LABELS: Record<string, string> = {
  force_verify_identity: "Vérification d'identité forcée",
  toggle_super_gardien: "Bascule Super Gardien",
  reject_competence_label: "Compétence refusée",
  coordinate_backfill: "Backfill coordonnées",
  prodirectory_approved: "Fiche Pro annuaire approuvée",
  prodirectory_rejected: "Fiche Pro annuaire rejetée",
  pro_validate: "Validation Gardien Pro",
  force_complete_garde: "Garde forcée en « terminée »",
  content_unpublish: "Contenu dépublié",
  content_ai_regenerate: "Régénération IA de contenu",
  small_mission_delete: "Mission d'entraide supprimée",
  small_mission_hide: "Mission d'entraide masquée",
  small_mission_restore: "Mission d'entraide restaurée",
  small_mission_contact: "Posteur contacté (mission)",
  warn: "Avertissement (signalement)",
  hide: "Contenu masqué (signalement)",
  suspend: "Compte suspendu (signalement)",
  delete: "Contenu supprimé (signalement)",
};

const ACTION_OPTIONS = Object.keys(ACTION_LABELS);
const TARGET_OPTIONS = ["profile", "small_mission", "sit", "pro_directory", "pro", "competence", "profiles_bulk", "review", "report"];

const PERIOD_DAYS: Record<string, number | null> = {
  "7": 7, "30": 30, "90": 90, "all": null,
};

interface LogRow {
  id: string;
  admin_id: string;
  action: string;
  target_type: string;
  target_id: string | null;
  note: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

interface AdminInfo {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
}

function actionLabel(code: string): string {
  return ACTION_LABELS[code] ?? code;
}

function targetHref(row: LogRow): string | null {
  if (!row.target_id) return null;
  switch (row.target_type) {
    case "profile":
      return `/gardiens/${row.target_id}`;
    case "small_mission": {
      const slug = (row.metadata as any)?.slug;
      return `/petites-missions/${slug ?? row.target_id}`;
    }
    case "pro_directory":
    case "pro":
      return `/annuaire-pros`;
    case "sit":
    case "garde":
      return `/admin/sits-management`;
    case "review":
      return `/admin/reviews`;
    case "report":
      return `/admin/reports`;
    default:
      return null;
  }
}

function metadataSummary(row: LogRow): string {
  if (row.note && row.note.trim()) return row.note.trim();
  if (!row.metadata) return "";
  const keys = ["reason", "motif", "title", "subject", "response_count", "value", "status"];
  for (const k of keys) {
    const v = (row.metadata as any)[k];
    if (v != null && String(v).trim()) return `${k}: ${String(v)}`;
  }
  const first = Object.entries(row.metadata)[0];
  return first ? `${first[0]}: ${String(first[1]).slice(0, 60)}` : "";
}

const AdminAudit = () => {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<LogRow[]>([]);
  const [admins, setAdmins] = useState<Record<string, AdminInfo>>({});
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);

  const [actionFilter, setActionFilter] = useState<string>("all");
  const [targetFilter, setTargetFilter] = useState<string>("all");
  const [period, setPeriod] = useState<string>("30");
  const [search, setSearch] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setSearchDebounced(search.trim().toLowerCase()), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => { setPage(0); }, [actionFilter, targetFilter, period, searchDebounced]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      let query = supabase
        .from("admin_action_logs")
        .select("id, admin_id, action, target_type, target_id, note, metadata, created_at", { count: "exact" })
        .order("created_at", { ascending: false });

      if (actionFilter !== "all") query = query.eq("action", actionFilter);
      if (targetFilter !== "all") query = query.eq("target_type", targetFilter);
      const days = PERIOD_DAYS[period];
      if (days) {
        const since = new Date(Date.now() - days * 86400_000).toISOString();
        query = query.gte("created_at", since);
      }

      // Search par admin (nom/email) : on résout d'abord les admin_ids qui matchent, puis on filtre.
      if (searchDebounced) {
        const { data: profileMatches } = await supabase
          .from("profiles")
          .select("id, email")
          .or(`first_name.ilike.%${searchDebounced}%,last_name.ilike.%${searchDebounced}%,email.ilike.%${searchDebounced}%`)
          .limit(200);
        const ids = (profileMatches ?? []).map((p: any) => p.id);
        if (ids.length === 0) {
          if (!cancelled) { setRows([]); setTotal(0); setLoading(false); }
          return;
        }
        query = query.in("admin_id", ids);
      }

      const from = page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      const { data, error, count } = await query.range(from, to);
      if (cancelled) return;
      if (error) {
        toast.error("Chargement impossible");
        console.error(error);
        setRows([]); setTotal(0); setLoading(false);
        return;
      }
      const list = (data ?? []) as LogRow[];
      setRows(list);
      setTotal(count ?? 0);

      // Résolution admins
      const ids = Array.from(new Set(list.map((r) => r.admin_id).filter(Boolean)));
      if (ids.length > 0) {
        const missing = ids.filter((id) => !admins[id]);
        if (missing.length > 0) {
          const [{ data: profs }, { data: emails }] = await Promise.all([
            supabase.from("profiles").select("id, first_name, last_name, email").in("id", missing),
            supabase.rpc("get_user_emails_admin" as never, { p_user_ids: missing } as never),
          ]);
          if (!cancelled) {
            const emailMap: Record<string, string> = {};
            for (const e of (emails as any[] ?? [])) emailMap[e.user_id ?? e.id] = e.email;
            const next: Record<string, AdminInfo> = { ...admins };
            for (const p of (profs as any[] ?? [])) {
              next[p.id] = { id: p.id, first_name: p.first_name, last_name: p.last_name, email: emailMap[p.id] ?? p.email ?? null };
            }
            for (const id of missing) {
              if (!next[id]) next[id] = { id, first_name: null, last_name: null, email: emailMap[id] ?? null };
            }
            setAdmins(next);
          }
        }
      }
      setLoading(false);
    };
    load();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actionFilter, targetFilter, period, searchDebounced, page]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const adminLabel = (id: string) => {
    const a = admins[id];
    if (!a) return id.slice(0, 8) + "…";
    const name = [a.first_name, a.last_name].filter(Boolean).join(" ").trim();
    return name || a.email || id.slice(0, 8) + "…";
  };
  const adminEmail = (id: string) => admins[id]?.email ?? "";

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Journal d'audit"
        description="Historique des actions administratives, les plus récentes en premier."
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Action</label>
          <Select value={actionFilter} onValueChange={setActionFilter}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les actions</SelectItem>
              {ACTION_OPTIONS.map((a) => (
                <SelectItem key={a} value={a}>{actionLabel(a)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Type de cible</label>
          <Select value={targetFilter} onValueChange={setTargetFilter}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les cibles</SelectItem>
              {TARGET_OPTIONS.map((t) => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Période</label>
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="7">7 derniers jours</SelectItem>
              <SelectItem value="30">30 derniers jours</SelectItem>
              <SelectItem value="90">90 derniers jours</SelectItem>
              <SelectItem value="all">Tout</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Admin (nom ou email)</label>
          <div className="relative">
            <Search className="h-4 w-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher…" className="pl-9" />
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-40">Date</TableHead>
              <TableHead>Admin</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Cible</TableHead>
              <TableHead>Note / metadata</TableHead>
              <TableHead className="w-24 text-right">Lien</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={6}><Skeleton className="h-6 w-full" /></TableCell>
                </TableRow>
              ))
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                  Aucune action enregistrée avec ces filtres.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((r) => {
                const href = targetHref(r);
                return (
                  <TableRow key={r.id}>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(r.created_at).toLocaleString("fr-FR")}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm font-medium">{adminLabel(r.admin_id)}</div>
                      {adminEmail(r.admin_id) && (
                        <div className="text-xs text-muted-foreground">{adminEmail(r.admin_id)}</div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">{actionLabel(r.action)}</div>
                      {!ACTION_LABELS[r.action] && (
                        <div className="text-xs text-muted-foreground font-mono">{r.action}</div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{r.target_type}</Badge>
                    </TableCell>
                    <TableCell className="max-w-md">
                      <div className="text-xs text-muted-foreground truncate" title={metadataSummary(r)}>
                        {metadataSummary(r) || "—"}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      {href ? (
                        <Button asChild variant="ghost" size="sm">
                          <Link to={href}>
                            <ExternalLink className="h-4 w-4" />
                          </Link>
                        </Button>
                      ) : null}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <div>
          {total > 0 ? `${page * PAGE_SIZE + 1}–${Math.min((page + 1) * PAGE_SIZE, total)} sur ${total}` : "0 résultat"}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0 || loading}>
            <ChevronLeft className="h-4 w-4 mr-1" />Précédent
          </Button>
          <span>{page + 1} / {totalPages}</span>
          <Button variant="outline" size="sm" onClick={() => setPage((p) => (p + 1 < totalPages ? p + 1 : p))} disabled={page + 1 >= totalPages || loading}>
            Suivant<ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AdminAudit;
