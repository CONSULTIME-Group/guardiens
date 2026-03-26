import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Search, Archive, Trash2, Eye, RotateCcw } from "lucide-react";

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
  const [missions, setMissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchMissions = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from("small_missions")
      .select("*, profiles:user_id(first_name, last_name, email)")
      .order("created_at", { ascending: false });

    if (filterStatus !== "all") {
      query = query.eq("status", filterStatus as any);
    }

    const { data, error } = await query;
    if (error) {
      toast.error("Erreur de chargement");
    } else {
      setMissions(data || []);
    }
    setLoading(false);
  }, [filterStatus]);

  useEffect(() => { fetchMissions(); }, [fetchMissions]);

  const filtered = missions.filter((m) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      m.title?.toLowerCase().includes(s) ||
      m.city?.toLowerCase().includes(s) ||
      m.profiles?.first_name?.toLowerCase().includes(s) ||
      m.profiles?.last_name?.toLowerCase().includes(s) ||
      m.profiles?.email?.toLowerCase().includes(s)
    );
  });

  const handleArchive = async (id: string) => {
    const { error } = await supabase
      .from("small_missions")
      .update({ status: "cancelled" as any })
      .eq("id", id);
    if (error) {
      toast.error("Erreur lors de l'archivage");
    } else {
      toast.success("Mission archivée (hors ligne)");
      fetchMissions();
    }
  };

  const handleRestore = async (id: string) => {
    const { error } = await supabase
      .from("small_missions")
      .update({ status: "open" as any })
      .eq("id", id);
    if (error) {
      toast.error("Erreur lors de la restauration");
    } else {
      toast.success("Mission restaurée");
      fetchMissions();
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);

    // Delete responses first
    await supabase.from("small_mission_responses").delete().eq("mission_id", deleteId);

    const { error } = await supabase.from("small_missions").delete().eq("id", deleteId);
    if (error) {
      toast.error("Erreur lors de la suppression");
    } else {
      toast.success("Mission supprimée définitivement");
      fetchMissions();
    }
    setDeleting(false);
    setDeleteId(null);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground">Entraide — Petites missions</h1>
        <p className="text-sm text-muted-foreground mt-1">Gérer les annonces d'entraide de la communauté</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher par titre, ville, auteur..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            <SelectItem value="open">Ouvertes</SelectItem>
            <SelectItem value="in_progress">En cours</SelectItem>
            <SelectItem value="completed">Terminées</SelectItem>
            <SelectItem value="cancelled">Archivées</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Stats */}
      <div className="flex gap-4 text-sm text-muted-foreground">
        <span>{filtered.length} mission{filtered.length > 1 ? "s" : ""}</span>
        <span>·</span>
        <span>{missions.filter(m => m.status === "open").length} ouvertes</span>
        <span>·</span>
        <span>{missions.filter(m => m.status === "cancelled").length} archivées</span>
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Titre</TableHead>
              <TableHead className="hidden sm:table-cell">Catégorie</TableHead>
              <TableHead className="hidden sm:table-cell">Ville</TableHead>
              <TableHead className="hidden md:table-cell">Auteur</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead className="hidden md:table-cell">Date</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  Chargement…
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  Aucune mission trouvée
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((m) => {
                const status = statusLabels[m.status] || { label: m.status, variant: "outline" as const };
                const author = m.profiles;
                return (
                  <TableRow key={m.id}>
                    <TableCell className="font-medium max-w-[200px] truncate">{m.title}</TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <Badge variant="outline">{categoryLabels[m.category] || m.category}</Badge>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-muted-foreground">{m.city}</TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground text-sm">
                      {author?.first_name} {author?.last_name}
                    </TableCell>
                    <TableCell>
                      <Badge variant={status.variant}>{status.label}</Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground text-sm">
                      {format(new Date(m.created_at), "dd MMM yyyy", { locale: fr })}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {m.status !== "cancelled" ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Archiver (mettre hors ligne)"
                            onClick={() => handleArchive(m.id)}
                          >
                            <Archive className="h-4 w-4" />
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Restaurer"
                            onClick={() => handleRestore(m.id)}
                          >
                            <RotateCcw className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Supprimer définitivement"
                          onClick={() => setDeleteId(m.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Delete confirmation dialog */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Supprimer cette mission ?</DialogTitle>
            <DialogDescription>
              Cette action est irréversible. La mission et toutes ses réponses seront supprimées définitivement.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteId(null)}>Annuler</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? "Suppression…" : "Supprimer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminSmallMissions;
