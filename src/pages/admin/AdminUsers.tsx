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
import { format, formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { Eye, Ban, ShieldCheck, StickyNote, RotateCcw, Trash2, AlertTriangle, Crown, ChevronLeft, ChevronRight } from "lucide-react";
import { Switch } from "@/components/ui/switch";
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

import { DEPT_NAMES, getDeptCode, getDeptLabel } from "@/lib/departments";

const PAGE_SIZE = 50;

const AdminUsers = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState("all");
  const [filterVerification, setFilterVerification] = useState("all");
  const [filterDept, setFilterDept] = useState("all");
  const [page, setPage] = useState(0);
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
      .select("id, first_name, last_name, role, city, postal_code, avatar_url, bio, profile_completion, created_at, updated_at, cancellation_count, identity_verified, identity_verification_status, account_status, is_founder, skill_categories, available_for_help, custom_skills, completed_sits_count, cancellations_as_proprio")
      .order("created_at", { ascending: false });

    if (filterRole !== "all") query = query.eq("role", filterRole as any);
    if (filterVerification !== "all") {
      query = query.eq("identity_verification_status", filterVerification);
    }

    const { data, error } = await query;
    if (error) toast.error("Erreur de chargement");
    else {
      // Fetch emails for admin via RPC
      const userIds = (data || []).map((u: any) => u.id);
      let emailMap = new Map<string, string>();
      let modMap = new Map<string, { admin_notes: string | null; is_manual_super: boolean }>();
      if (userIds.length > 0) {
        const [emailRes, modRes] = await Promise.all([
          supabase.rpc("get_user_emails_admin", { p_user_ids: userIds }),
          supabase.from("profile_moderation").select("profile_id, admin_notes, is_manual_super"),
        ]);
        emailMap = new Map((emailRes.data || []).map((e: any) => [e.id, e.email]));
        modMap = new Map((modRes.data || []).map((m: any) => [m.profile_id, { admin_notes: m.admin_notes, is_manual_super: m.is_manual_super }]));
      }
      const enriched = (data || []).map((u: any) => {
        const mod = modMap.get(u.id);
        return {
          ...u,
          email: emailMap.get(u.id) || "",
          admin_notes: mod?.admin_notes || null,
          is_manual_super: mod?.is_manual_super || false,
        };
      });
      setUsers(enriched);
    }
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

  // Reset page when filters change
  useEffect(() => { setPage(0); }, [search, filterRole, filterVerification, filterDept]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  // Compute available departments from loaded users for the dropdown
  const availableDepts = Array.from(
    new Set(users.map((u) => getDeptCode(u.postal_code)).filter(Boolean) as string[])
  ).sort((a, b) => a.localeCompare(b, "fr"));

  const handleSuspend = async () => {
    const { error } = await supabase
      .from("profiles")
      .update({ account_status: "suspended" })
      .eq("id", suspendModal.userId);
    if (!error && suspendModal.reason) {
      await supabase.from("profile_moderation").upsert({
        profile_id: suspendModal.userId,
        admin_notes: suspendModal.reason,
      }, { onConflict: "profile_id" });
    }
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
      .from("profile_moderation")
      .upsert({
        profile_id: noteModal.userId,
        admin_notes: noteModal.currentNote,
      }, { onConflict: "profile_id" })
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
        <Select value={filterDept} onValueChange={setFilterDept}>
          <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
          <SelectContent className="max-h-60">
            <SelectItem value="all">Tous départements</SelectItem>
            {availableDepts.map((code) => (
              <SelectItem key={code} value={code}>
                {code} {DEPT_NAMES[code] || ""}
              </SelectItem>
            ))}
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
              <TableHead>Dernière activité</TableHead>
              <TableHead>Profil</TableHead>
              <TableHead>Vérification</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                  Chargement…
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                  Aucun utilisateur trouvé
                </TableCell>
              </TableRow>
            ) : (
              paginated.map((user) => {
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
                      {getDeptLabel(user.postal_code)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(user.created_at), "d MMM yyyy", { locale: fr })}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {user.updated_at
                        ? formatDistanceToNow(new Date(user.updated_at), { addSuffix: true, locale: fr })
                        : "—"}
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
                          title="Voir le profil"
                          onClick={() => window.open(`/gardiens/${user.id}`, "_blank")}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
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
                          title={user.is_manual_super ? "Retirer Super Gardien" : "Promouvoir Super Gardien"}
                          onClick={async () => {
                            const newVal = !user.is_manual_super;
                            const { error } = await supabase
                              .from("profile_moderation")
                              .upsert({
                                profile_id: user.id,
                                is_manual_super: newVal,
                              }, { onConflict: "profile_id" });
                            if (!error) {
                              toast(newVal ? "Super Gardien activé" : "Override retiré");
                              fetchUsers();
                            } else {
                              toast.error("Erreur lors de la mise à jour");
                            }
                          }}
                        >
                          <Crown className={`h-4 w-4 ${user.is_manual_super ? 'text-amber-500' : ''}`} />
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

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {filtered.length} utilisateur{filtered.length > 1 ? "s" : ""} · page {page + 1}/{totalPages}
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
              <ChevronLeft className="h-4 w-4 mr-1" /> Précédent
            </Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
              Suivant <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

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
