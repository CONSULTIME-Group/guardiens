import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Search, Archive, Trash2, Eye, RotateCcw, Mail, AlertTriangle, ArrowUpDown, Download, Send } from "lucide-react";
import { useNavigate } from "react-router-dom";
import ProximityCampaignCard from "@/components/admin/mass-email/ProximityCampaignCard";

const statusLabels: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  open: { label: "Ouverte", variant: "default" },
  in_progress: { label: "En cours", variant: "secondary" },
  completed: { label: "Terminée", variant: "outline" },
  cancelled: { label: "Annulée", variant: "destructive" },
};

const categoryLabels: Record<string, string> = {
  animals: "Animaux",
  garden: "Jardin",
  house: "Maison",
  skills: "Compétences",
};

const PAGE_SIZE = 25;
// Detect money mentions — symbol/word boundary based, lower false positives
const moneyPattern = /(\d+\s*€|€\s*\d+|\beuros?\b|\brémunér|\brémuner|\bremuner|\bsalaire\b|\btarif\b|\bpayer\b|\bpaiement\b|\bcash\b|\bespèces?\b)/i;

type SortKey = "created_at" | "view_count" | "response_count";

const AdminSmallMissions = () => {
  const navigate = useNavigate();
  const [missions, setMissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterPeriod, setFilterPeriod] = useState("all");
  const [sortBy, setSortBy] = useState<SortKey>("created_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [responseCounts, setResponseCounts] = useState<Record<string, number>>({});
  const [archiveId, setArchiveId] = useState<string | null>(null);
  const [restoreId, setRestoreId] = useState<string | null>(null);
  const [proximityMission, setProximityMission] = useState<{ id: string; title: string } | null>(null);
  const [kpis, setKpis] = useState({ total: 0, open: 0, totalViews: 0, totalResponses: 0, suspect: 0 });

  // Global KPIs (independent of pagination/filters)
  useEffect(() => {
    (async () => {
      const [{ count: total }, { count: open }, viewsRes, respRes] = await Promise.all([
        supabase.from("small_missions").select("*", { count: "exact", head: true }),
        supabase.from("small_missions").select("*", { count: "exact", head: true }).eq("status", "open" as any),
        supabase.from("small_missions").select("view_count"),
        supabase.from("small_mission_responses").select("*", { count: "exact", head: true }),
      ]);
      const totalViews = (viewsRes.data || []).reduce((s: number, r: any) => s + (r.view_count || 0), 0);
      setKpis(k => ({ ...k, total: total || 0, open: open || 0, totalViews, totalResponses: respRes.count || 0 }));
    })();
  }, []);

  const fetchMissions = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from("small_missions")
      .select("*, poster:profiles!small_missions_user_id_fkey(first_name, last_name, avatar_url)", { count: "exact" });

    if (filterStatus !== "all") query = query.eq("status", filterStatus as any);
    if (filterCategory !== "all") query = query.eq("category", filterCategory as any);
    if (filterPeriod !== "all") {
      const days = filterPeriod === "7d" ? 7 : filterPeriod === "30d" ? 30 : 90;
      const since = new Date(Date.now() - days * 86400000).toISOString();
      query = query.gte("created_at", since);
    }

    const ascending = sortDir === "asc";
    if (sortBy === "response_count") {
      query = query.order("created_at", { ascending: false });
    } else {
      query = query.order(sortBy, { ascending });
    }

    const from = page * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;
    query = query.range(from, to);

    const { data, count, error } = await query;
    if (error) toast.error("Erreur de chargement");
    else {
      setMissions(data || []);
      setTotalCount(count || 0);
    }
    setLoading(false);
  }, [filterStatus, filterCategory, filterPeriod, sortBy, sortDir, page]);

  useEffect(() => { fetchMissions(); }, [fetchMissions]);
  useEffect(() => { setPage(0); }, [filterStatus, filterCategory, filterPeriod, search]);

  // Fetch response counts for current page
  useEffect(() => {
    if (!missions.length) return;
    const ids = missions.map(m => m.id);
    supabase.from("small_mission_responses").select("id, mission_id").in("mission_id", ids).then(({ data }) => {
      const counts: Record<string, number> = {};
      data?.forEach((r: any) => { counts[r.mission_id] = (counts[r.mission_id] || 0) + 1; });
      setResponseCounts(counts);
    });
  }, [missions]);

  const filtered = useMemo(() => {
    let list = missions;
    if (search) {
      const s = search.toLowerCase();
      list = list.filter((m) =>
        m.title?.toLowerCase().includes(s) ||
        m.city?.toLowerCase().includes(s) ||
        m.poster?.first_name?.toLowerCase().includes(s)
      );
    }
    if (sortBy === "response_count") {
      list = [...list].sort((a, b) => {
        const d = (responseCounts[b.id] || 0) - (responseCounts[a.id] || 0);
        return sortDir === "asc" ? -d : d;
      });
    }
    return list;
  }, [missions, search, sortBy, sortDir, responseCounts]);

  const suspectMissions = filtered.filter(m => moneyPattern.test(m.description || "") || moneyPattern.test(m.exchange_offer || ""));

  const toggleSort = (key: SortKey) => {
    if (sortBy === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortBy(key); setSortDir("desc"); }
  };

  const handleArchive = async () => {
    if (!archiveId) return;
    await supabase.from("small_missions").update({ status: "cancelled" as any }).eq("id", archiveId);
    toast.success("Mission masquée"); setArchiveId(null); fetchMissions();
  };

  const handleRestore = async () => {
    if (!restoreId) return;
    await supabase.from("small_missions").update({ status: "open" as any }).eq("id", restoreId);
    toast.success("Mission restaurée"); setRestoreId(null); fetchMissions();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    await supabase.from("small_mission_responses").delete().eq("mission_id", deleteId);
    await supabase.from("small_missions").delete().eq("id", deleteId);
    toast.success("Mission supprimée définitivement");
    setDeleting(false); setDeleteId(null); fetchMissions();
  };

  const handleContact = async (mission: any) => {
    await supabase.from("notifications").insert({
      user_id: mission.user_id, type: "admin_contact",
      title: "Message de l'équipe Guardiens",
      body: `Un administrateur souhaite vous contacter au sujet de votre mission "${mission.title}".`,
    });
    toast.success("Notification envoyée au posteur");
  };

  const exportCsv = () => {
    const rows = [
      ["Titre", "Posteur", "Catégorie", "Ville", "Date", "Statut", "Réponses", "Vues"],
      ...filtered.map(m => [
        m.title, `${m.poster?.first_name || ""} ${m.poster?.last_name || ""}`.trim(),
        categoryLabels[m.category] || m.category, m.city || "",
        format(new Date(m.created_at), "yyyy-MM-dd"),
        statusLabels[m.status]?.label || m.status,
        String(responseCounts[m.id] || 0), String(m.view_count ?? 0),
      ]),
    ];
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `missions-${format(new Date(), "yyyy-MM-dd")}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const ratioGlobal = kpis.totalViews > 0 ? ((kpis.totalResponses / kpis.totalViews) * 100).toFixed(1) : "0";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight">Petites missions</h1>
        <Button variant="outline" size="sm" onClick={exportCsv}>
          <Download className="h-4 w-4 mr-2" /> Exporter CSV
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Total</p>
          <p className="text-2xl font-bold tabular-nums">{kpis.total}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Ouvertes</p>
          <p className="text-2xl font-bold tabular-nums">{kpis.open}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Vues cumulées</p>
          <p className="text-2xl font-bold tabular-nums">{kpis.totalViews}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Réponses</p>
          <p className="text-2xl font-bold tabular-nums">{kpis.totalResponses}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-xs text-muted-foreground">Ratio réponses/vues</p>
          <p className="text-2xl font-bold tabular-nums">{ratioGlobal}%</p>
        </CardContent></Card>
      </div>

      {suspectMissions.length > 0 && (
        <Card className="border-warning-border bg-warning-soft dark:bg-orange-900/10 dark:border-orange-800">
          <CardContent className="p-3 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-warning shrink-0" />
            <p className="text-sm flex-1">{suspectMissions.length} mission{suspectMissions.length > 1 ? "s" : ""} avec mention d'argent détectée{suspectMissions.length > 1 ? "s" : ""}, à vérifier</p>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Rechercher titre, ville, auteur…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous statuts</SelectItem>
            <SelectItem value="open">Ouvertes</SelectItem>
            <SelectItem value="in_progress">En cours</SelectItem>
            <SelectItem value="completed">Terminées</SelectItem>
            <SelectItem value="cancelled">Archivées</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes catégories</SelectItem>
            <SelectItem value="animals">Animaux</SelectItem>
            <SelectItem value="garden">Jardin</SelectItem>
            <SelectItem value="house">Maison</SelectItem>
            <SelectItem value="skills">Compétences</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterPeriod} onValueChange={setFilterPeriod}>
          <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toute période</SelectItem>
            <SelectItem value="7d">7 derniers jours</SelectItem>
            <SelectItem value="30d">30 derniers jours</SelectItem>
            <SelectItem value="90d">90 derniers jours</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <p className="text-sm text-muted-foreground">
        {totalCount} mission{totalCount > 1 ? "s" : ""} · Page {page + 1}/{totalPages}
      </p>

      <div className="rounded-lg border bg-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Titre</TableHead>
              <TableHead>Posteur</TableHead>
              <TableHead>Catégorie</TableHead>
              <TableHead>Ville</TableHead>
              <TableHead>
                <button onClick={() => toggleSort("created_at")} className="inline-flex items-center gap-1 hover:text-foreground">
                  Date <ArrowUpDown className="h-3 w-3" />
                </button>
              </TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>
                <button onClick={() => toggleSort("response_count")} className="inline-flex items-center gap-1 hover:text-foreground">
                  Réponses <ArrowUpDown className="h-3 w-3" />
                </button>
              </TableHead>
              <TableHead title="Nombre de vues uniques (hors auteur, 1/session)">
                <button onClick={() => toggleSort("view_count")} className="inline-flex items-center gap-1 hover:text-foreground">
                  Vues <ArrowUpDown className="h-3 w-3" />
                </button>
              </TableHead>
              <TableHead title="Réponses ÷ vues">Ratio</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={10} className="text-center py-8 text-muted-foreground">Chargement…</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={10} className="text-center py-8 text-muted-foreground">Aucune mission</TableCell></TableRow>
            ) : filtered.map((m) => {
              const status = statusLabels[m.status] || { label: m.status, variant: "outline" as const };
              const isSuspect = moneyPattern.test(m.description || "") || moneyPattern.test(m.exchange_offer || "");
              const views = m.view_count ?? 0;
              const resp = responseCounts[m.id] || 0;
              const ratio = views > 0 ? `${((resp / views) * 100).toFixed(0)}%` : "–";
              return (
                <TableRow key={m.id} className={isSuspect ? "bg-warning-soft/50 dark:bg-orange-900/5" : ""}>
                  <TableCell className="font-medium max-w-[180px] truncate">
                    {isSuspect && <AlertTriangle className="h-3 w-3 text-warning inline mr-1" />}
                    {m.title}
                  </TableCell>
                  <TableCell className="text-sm">
                    <div className="flex items-center gap-2">
                      {m.poster?.avatar_url && <img src={m.poster.avatar_url} className="w-5 h-5 rounded-full object-cover" alt="" />}
                      <span>{m.poster?.first_name} {m.poster?.last_name}</span>
                    </div>
                  </TableCell>
                  <TableCell><Badge variant="outline" className="text-xs">{categoryLabels[m.category] || m.category}</Badge></TableCell>
                  <TableCell className="text-sm text-muted-foreground">{m.city}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{format(new Date(m.created_at), "d MMM yyyy", { locale: fr })}</TableCell>
                  <TableCell><Badge variant={status.variant}>{status.label}</Badge></TableCell>
                  <TableCell className="text-sm font-medium tabular-nums">{resp}</TableCell>
                  <TableCell className="text-sm font-medium tabular-nums">{views}</TableCell>
                  <TableCell className="text-sm text-muted-foreground tabular-nums">{ratio}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" aria-label="Voir la mission" title="Voir" onClick={() => navigate(`/petites-missions/${(m as any).slug || m.id}`)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" aria-label="Contacter le posteur" title="Contacter" onClick={() => handleContact(m)}>
                        <Mail className="h-4 w-4" />
                      </Button>
                      {m.status !== "cancelled" ? (
                        <Button variant="ghost" size="icon" aria-label="Masquer la mission" title="Masquer" onClick={() => setArchiveId(m.id)}>
                          <Archive className="h-4 w-4" />
                        </Button>
                      ) : (
                        <Button variant="ghost" size="icon" aria-label="Restaurer la mission" title="Restaurer" onClick={() => setRestoreId(m.id)}>
                          <RotateCcw className="h-4 w-4" />
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" aria-label="Supprimer la mission" title="Supprimer" onClick={() => setDeleteId(m.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">{PAGE_SIZE} par page</p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => Math.max(0, p - 1))}>Précédent</Button>
          <Button variant="outline" size="sm" disabled={page + 1 >= totalPages} onClick={() => setPage(p => p + 1)}>Suivant</Button>
        </div>
      </div>

      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Supprimer cette mission ?</DialogTitle></DialogHeader>
          <DialogDescription>Cette action est irréversible. La mission et toutes ses réponses seront supprimées.</DialogDescription>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Annuler</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>{deleting ? "Suppression…" : "Supprimer"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!archiveId} onOpenChange={() => setArchiveId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Masquer cette mission ?</DialogTitle></DialogHeader>
          <DialogDescription>La mission sera retirée de la recherche. Vous pourrez la restaurer plus tard.</DialogDescription>
          <DialogFooter>
            <Button variant="outline" onClick={() => setArchiveId(null)}>Annuler</Button>
            <Button variant="destructive" onClick={handleArchive}>Masquer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!restoreId} onOpenChange={() => setRestoreId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Restaurer cette mission ?</DialogTitle></DialogHeader>
          <DialogDescription>La mission sera remise en ligne et visible dans la recherche.</DialogDescription>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRestoreId(null)}>Annuler</Button>
            <Button onClick={handleRestore}>Restaurer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminSmallMissions;
