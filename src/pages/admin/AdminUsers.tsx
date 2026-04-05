import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Eye, Ban, ShieldCheck, StickyNote, RotateCcw, Trash2, AlertTriangle } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

const roleLabels: Record<string, string> = {
  owner: "Propriétaire",
  sitter: "Gardien",
  both: "Les deux",
};

const verificationLabels: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  not_submitted: { label: "Non vérifié", variant: "outline" },
  pending: { label: "En attente", variant: "secondary" },
  verified: { label: "Vérifié", variant: "default" },
  rejected: { label: "Refusé", variant: "destructive" },
};

const statusLabels: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  active: { label: "Actif", variant: "default" },
  suspended: { label: "Suspendu", variant: "destructive" },
  deletion_pending: { label: "Suppression en cours", variant: "secondary" },
};

const DEPT_NAMES: Record<string, string> = {
  "01":"Ain","02":"Aisne","03":"Allier","04":"Alpes-de-Haute-Provence","05":"Hautes-Alpes",
  "06":"Alpes-Maritimes","07":"Ardèche","08":"Ardennes","09":"Ariège","10":"Aube",
  "11":"Aude","12":"Aveyron","13":"Bouches-du-Rhône","14":"Calvados","15":"Cantal",
  "16":"Charente","17":"Charente-Maritime","18":"Cher","19":"Corrèze","2A":"Corse-du-Sud",
  "2B":"Haute-Corse","21":"Côte-d'Or","22":"Côtes-d'Armor","23":"Creuse","24":"Dordogne",
  "25":"Doubs","26":"Drôme","27":"Eure","28":"Eure-et-Loir","29":"Finistère",
  "30":"Gard","31":"Haute-Garonne","32":"Gers","33":"Gironde","34":"Hérault",
  "35":"Ille-et-Vilaine","36":"Indre","37":"Indre-et-Loire","38":"Isère","39":"Jura",
  "40":"Landes","41":"Loir-et-Cher","42":"Loire","43":"Haute-Loire","44":"Loire-Atlantique",
  "45":"Loiret","46":"Lot","47":"Lot-et-Garonne","48":"Lozère","49":"Maine-et-Loire",
  "50":"Manche","51":"Marne","52":"Haute-Marne","53":"Mayenne","54":"Meurthe-et-Moselle",
  "55":"Meuse","56":"Morbihan","57":"Moselle","58":"Nièvre","59":"Nord",
  "60":"Oise","61":"Orne","62":"Pas-de-Calais","63":"Puy-de-Dôme","64":"Pyrénées-Atlantiques",
  "65":"Hautes-Pyrénées","66":"Pyrénées-Orientales","67":"Bas-Rhin","68":"Haut-Rhin",
  "69":"Rhône","70":"Haute-Saône","71":"Saône-et-Loire","72":"Sarthe","73":"Savoie",
  "74":"Haute-Savoie","75":"Paris","76":"Seine-Maritime","77":"Seine-et-Marne",
  "78":"Yvelines","79":"Deux-Sèvres","80":"Somme","81":"Tarn","82":"Tarn-et-Garonne",
  "83":"Var","84":"Vaucluse","85":"Vendée","86":"Vienne","87":"Haute-Vienne",
  "88":"Vosges","89":"Yonne","90":"Territoire de Belfort","91":"Essonne",
  "92":"Hauts-de-Seine","93":"Seine-Saint-Denis","94":"Val-de-Marne","95":"Val-d'Oise",
  "971":"Guadeloupe","972":"Martinique","973":"Guyane","974":"Réunion","976":"Mayotte",
};

const getDeptCode = (cp: string | null): string | null => {
  if (!cp || cp.length < 2) return null;
  if (cp.startsWith("97") && cp.length >= 3) return cp.substring(0, 3);
  if (cp.startsWith("20")) {
    const num = parseInt(cp, 10);
    return num >= 20000 && num <= 20190 ? "2A" : "2B";
  }
  const code = cp.substring(0, 2);
  return DEPT_NAMES[code] ? code : null;
};

const getDeptLabel = (cp: string | null): string => {
  const code = getDeptCode(cp);
  if (!code) return "—";
  return `${code} ${DEPT_NAMES[code] || ""}`.trim();
};

const AdminUsers = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState("all");
  const [filterVerification, setFilterVerification] = useState("all");
  const [filterDept, setFilterDept] = useState("all");

  // Modal states
  const [noteModal, setNoteModal] = useState<{ open: boolean; userId: string; currentNote: string }>({
    open: false, userId: "", currentNote: ""
  });
  const [suspendModal, setSuspendModal] = useState<{ open: boolean; userId: string; reason: string }>({
    open: false, userId: "", reason: ""
  });
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; userId: string; userName: string }>({
    open: false, userId: "", userName: ""
  });
  const [deleting, setDeleting] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    if (filterRole !== "all") query = query.eq("role", filterRole as any);
    if (filterVerification !== "all") {
      query = query.eq("identity_verification_status", filterVerification);
    }

    const { data, error } = await query;
    if (error) toast.error("Erreur de chargement");
    else setUsers(data || []);
    setLoading(false);
  }, [filterRole, filterVerification]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const filtered = users.filter((u) => {
    if (search) {
      const s = search.toLowerCase();
      if (
        !(u.first_name || "").toLowerCase().includes(s) &&
        !(u.last_name || "").toLowerCase().includes(s) &&
        !(u.email || "").toLowerCase().includes(s)
      ) return false;
    }
    if (filterDept !== "all") {
      const code = getDeptCode(u.postal_code);
      if (code !== filterDept) return false;
    }
    return true;
  });

  // Compute available departments from loaded users for the dropdown
  const availableDepts = Array.from(
    new Set(users.map((u) => getDeptCode(u.postal_code)).filter(Boolean) as string[])
  ).sort((a, b) => a.localeCompare(b, "fr"));

  const handleSuspend = async () => {
    const { error } = await supabase
      .from("profiles")
      .update({ account_status: "suspended", admin_notes: suspendModal.reason })
      .eq("id", suspendModal.userId);
    if (error) toast.error("Erreur");
    else { toast.success("Compte suspendu"); fetchUsers(); }
    setSuspendModal({ open: false, userId: "", reason: "" });
  };

  const handleReactivate = async (userId: string) => {
    const { error } = await supabase
      .from("profiles")
      .update({ account_status: "active" })
      .eq("id", userId);
    if (error) toast.error("Erreur");
    else { toast.success("Compte réactivé"); fetchUsers(); }
  };

  const handleForceVerify = async (userId: string) => {
    const { error } = await supabase
      .from("profiles")
      .update({ identity_verified: true, identity_verification_status: "verified" })
      .eq("id", userId);
    if (error) toast.error("Erreur");
    else { toast.success("Identité validée"); fetchUsers(); }
  };

  const handleSaveNote = async () => {
    const { error } = await supabase
      .from("profiles")
      .update({ admin_notes: noteModal.currentNote })
      .eq("id", noteModal.userId);
    if (error) toast.error("Erreur");
    else { toast.success("Note enregistrée"); fetchUsers(); }
    setNoteModal({ open: false, userId: "", currentNote: "" });
  };

  const handleDeleteUser = async () => {
    setDeleting(true);
    const { data, error } = await supabase.functions.invoke("admin-delete-user", {
      body: { userId: deleteConfirm.userId },
    });
    if (error || data?.error) {
      toast.error(data?.error || "Erreur lors de la suppression");
    } else {
      toast.success("Compte supprimé définitivement");
      fetchUsers();
    }
    setDeleting(false);
    setDeleteConfirm({ open: false, userId: "", userName: "" });
  };

  return (
    <div className="space-y-6">
      <h1 className="font-body text-2xl font-bold">Utilisateurs</h1>

      <div className="flex flex-col sm:flex-row gap-3">
        <Input
          placeholder="Rechercher par nom ou email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <Select value={filterRole} onValueChange={setFilterRole}>
          <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous rôles</SelectItem>
            <SelectItem value="owner">Propriétaire</SelectItem>
            <SelectItem value="sitter">Gardien</SelectItem>
            <SelectItem value="both">Les deux</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterVerification} onValueChange={setFilterVerification}>
          <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes vérifications</SelectItem>
            <SelectItem value="not_submitted">Non vérifié</SelectItem>
            <SelectItem value="pending">En attente</SelectItem>
            <SelectItem value="verified">Vérifié</SelectItem>
            <SelectItem value="rejected">Refusé</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Utilisateur</TableHead>
              <TableHead>Rôle</TableHead>
              <TableHead>Code postal</TableHead>
              <TableHead>Département</TableHead>
              <TableHead>Inscription</TableHead>
              <TableHead>Profil</TableHead>
              <TableHead>Vérification</TableHead>
              <TableHead>Statut</TableHead>
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
                  Aucun utilisateur trouvé
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((user) => {
                const verif = verificationLabels[user.identity_verification_status || "not_submitted"] || verificationLabels.not_submitted;
                const status = statusLabels[user.account_status || "active"] || statusLabels.active;

                return (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={user.avatar_url || undefined} />
                          <AvatarFallback className="text-xs">
                            {(user.first_name?.[0] || "").toUpperCase()}
                            {(user.last_name?.[0] || "").toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium text-sm">
                            {user.first_name} {user.last_name}
                          </div>
                          <div className="text-xs text-muted-foreground">{user.email}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{roleLabels[user.role] || user.role}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {user.postal_code || "—"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {user.postal_code
                        ? (/^97[1-6]/.test(user.postal_code) ? user.postal_code.slice(0, 3) : user.postal_code.slice(0, 2))
                        : "—"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(user.created_at), "d MMM yyyy", { locale: fr })}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full"
                            style={{ width: `${user.profile_completion || 0}%` }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground">{user.profile_completion || 0}%</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={verif.variant}>{verif.label}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={status.variant}>{status.label}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Forcer vérification ID"
                          onClick={() => handleForceVerify(user.id)}
                          disabled={user.identity_verified}
                        >
                          <ShieldCheck className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Note interne"
                          onClick={() => setNoteModal({
                            open: true,
                            userId: user.id,
                            currentNote: user.admin_notes || "",
                          })}
                        >
                          <StickyNote className="h-4 w-4" />
                        </Button>
                        {user.account_status === "suspended" ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Réactiver"
                            onClick={() => handleReactivate(user.id)}
                          >
                            <RotateCcw className="h-4 w-4 text-primary" />
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Suspendre"
                            onClick={() => setSuspendModal({ open: true, userId: user.id, reason: "" })}
                          >
                            <Ban className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Supprimer définitivement"
                          onClick={() => setDeleteConfirm({
                            open: true,
                            userId: user.id,
                            userName: `${user.first_name || ""} ${user.last_name || ""}`.trim() || user.email || "cet utilisateur",
                          })}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
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

      {/* Suspend Modal */}
      <Dialog open={suspendModal.open} onOpenChange={(o) => !o && setSuspendModal({ open: false, userId: "", reason: "" })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Suspendre le compte</DialogTitle>
          </DialogHeader>
          <Textarea
            placeholder="Motif de suspension…"
            value={suspendModal.reason}
            onChange={(e) => setSuspendModal((s) => ({ ...s, reason: e.target.value }))}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setSuspendModal({ open: false, userId: "", reason: "" })}>
              Annuler
            </Button>
            <Button variant="destructive" onClick={handleSuspend}>
              Suspendre
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Note Modal */}
      <Dialog open={noteModal.open} onOpenChange={(o) => !o && setNoteModal({ open: false, userId: "", currentNote: "" })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Note interne</DialogTitle>
          </DialogHeader>
          <Textarea
            placeholder="Note visible uniquement par les admins…"
            value={noteModal.currentNote}
            onChange={(e) => setNoteModal((s) => ({ ...s, currentNote: e.target.value }))}
            rows={4}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setNoteModal({ open: false, userId: "", currentNote: "" })}>
              Annuler
            </Button>
            <Button onClick={handleSaveNote}>Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteConfirm.open} onOpenChange={(o) => !o && setDeleteConfirm({ open: false, userId: "", userName: "" })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Suppression définitive
            </AlertDialogTitle>
            <AlertDialogDescription>
              Vous êtes sur le point de supprimer définitivement le compte de <strong>{deleteConfirm.userName}</strong>.
              Cette action est <strong>irréversible</strong> : toutes les données (profil, annonces, candidatures, messages) seront supprimées.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteUser}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Suppression…" : "Supprimer définitivement"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminUsers;
