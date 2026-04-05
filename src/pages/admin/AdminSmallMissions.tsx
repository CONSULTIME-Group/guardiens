import { useState, useEffect, useCallback } from "react";
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
import { Search, Archive, Trash2, Eye, RotateCcw, Mail, AlertTriangle } from "lucide-react";
import { useNavigate } from "react-router-dom";

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

const AdminSmallMissions = () => {
  const navigate = useNavigate();
  const [missions, setMissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [responseCounts, setResponseCounts] = useState<Record<string, number>>({});

  const fetchMissions = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from("small_missions")
      .select("*, poster:profiles!small_missions_user_id_fkey(first_name, last_name, avatar_url)")
      .order("created_at", { ascending: false });

    if (filterStatus !== "all") query = query.eq("status", filterStatus as any);
    if (filterCategory !== "all") query = query.eq("category", filterCategory as any);

    const { data, error } = await query;
    if (error) toast.error("Erreur de chargement");
    else setMissions(data || []);
    setLoading(false);
  }, [filterStatus, filterCategory]);

  useEffect(() => { fetchMissions(); }, [fetchMissions]);

  // Fetch response counts
  useEffect(() => {
    if (!missions.length) return;
    const ids = missions.map(m => m.id);
    supabase.from("small_mission_responses").select("id, mission_id").in("mission_id", ids).then(({ data }) => {
      const counts: Record<string, number> = {};
      data?.forEach((r: any) => { counts[r.mission_id] = (counts[r.mission_id] || 0) + 1; });
      setResponseCounts(counts);
    });
  }, [missions]);

  const filtered = missions.filter((m) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return m.title?.toLowerCase().includes(s) || m.city?.toLowerCase().includes(s) || m.poster?.first_name?.toLowerCase().includes(s);
  });

  // Detect missions mentioning money
  const moneyPattern = /€|\beuro|payer|remunér|salaire|tarif|\d+\s*€/i;
  const suspectMissions = filtered.filter(m => moneyPattern.test(m.description || "") || moneyPattern.test(m.exchange_offer || ""));

  const handleArchive = async (id: string) => {
    await supabase.from("small_missions").update({ status: "cancelled" as any }).eq("id", id);
    toast.success("Mission masquée"); fetchMissions();
  };

  const handleRestore = async (id: string) => {
    await supabase.from("small_missions").update({ status: "open" as any }).eq("id", id);
    toast.success("Mission restaurée"); fetchMissions();
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
    // Create notification instead of relying on email
    await supabase.from("notifications").insert({
      user_id: mission.user_id, type: "admin_contact",
      title: "Message de l'équipe Guardiens",
      body: `Un administrateur souhaite vous contacter au sujet de votre mission "${mission.title}".`,
    });
    toast.success("Notification envoyée au posteur");
  };

  return (
    <div className="space-y-6">
      <h1 className="font-body text-2xl font-bold">Petites missions</h1>

      {/* Alert for suspect missions */}
      {suspectMissions.length > 0 && (
        <Card className="border-orange-200 bg-orange-50 dark:bg-orange-900/10 dark:border-orange-800">
          <CardContent className="p-3 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-orange-500 shrink-0" />
            <p className="text-sm flex-1">{suspectMissions.length} mission{suspectMissions.length > 1 ? "s" : ""} avec mention d'argent détectée{suspectMissions.length > 1 ? "s" : ""} — à vérifier</p>
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
      </div>

      <p className="text-sm text-muted-foreground">
        {filtered.length} mission{filtered.length > 1 ? "s" : ""} · {missions.filter(m => m.status === "open").length} ouvertes
      </p>

      <div className="rounded-lg border bg-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Titre</TableHead>
              <TableHead>Posteur</TableHead>
              <TableHead>Catégorie</TableHead>
              <TableHead>Ville</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Réponses</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Chargement…</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Aucune mission</TableCell></TableRow>
            ) : filtered.map((m) => {
              const status = statusLabels[m.status] || { label: m.status, variant: "outline" as const };
              const isSuspect = moneyPattern.test(m.description || "") || moneyPattern.test(m.exchange_offer || "");
              return (
                <TableRow key={m.id} className={isSuspect ? "bg-orange-50/50 dark:bg-orange-900/5" : ""}>
                  <TableCell className="font-medium max-w-[180px] truncate">
                    {isSuspect && <AlertTriangle className="h-3 w-3 text-orange-500 inline mr-1" />}
                    {m.title}
                  </TableCell>
                  <TableCell className="text-sm">
                    <div className="flex items-center gap-2">
                      {m.poster?.avatar_url && <img src={m.poster.avatar_url} className="w-5 h-5 rounded-full object-cover" />}
                      <span>{m.poster?.first_name} {m.poster?.last_name}</span>
                    </div>
                  </TableCell>
                  <TableCell><Badge variant="outline" className="text-xs">{categoryLabels[m.category] || m.category}</Badge></TableCell>
                  <TableCell className="text-sm text-muted-foreground">{m.city}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{format(new Date(m.created_at), "d MMM yyyy", { locale: fr })}</TableCell>
                  <TableCell><Badge variant={status.variant}>{status.label}</Badge></TableCell>
                  <TableCell className="text-sm font-medium">{responseCounts[m.id] || 0}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" title="Voir" onClick={() => navigate(`/petites-missions/${m.id}`)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" title="Contacter" onClick={() => handleContact(m)}>
                        <Mail className="h-4 w-4" />
                      </Button>
                      {m.status !== "cancelled" ? (
                        <Button variant="ghost" size="icon" title="Masquer" onClick={() => handleArchive(m.id)}>
                          <Archive className="h-4 w-4" />
                        </Button>
                      ) : (
                        <Button variant="ghost" size="icon" title="Restaurer" onClick={() => handleRestore(m.id)}>
                          <RotateCcw className="h-4 w-4" />
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" title="Supprimer" onClick={() => setDeleteId(m.id)}>
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
    </div>
  );
};

export default AdminSmallMissions;
