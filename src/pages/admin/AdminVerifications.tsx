import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { ShieldCheck, ShieldX, RotateCcw } from "lucide-react";

const AdminVerifications = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("pending");
  const [rejectModal, setRejectModal] = useState<{ open: boolean; userId: string; reason: string }>({
    open: false, userId: "", reason: ""
  });
  const [selectedDoc, setSelectedDoc] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from("profiles")
      .select("id, first_name, last_name, email, avatar_url, identity_document_url, identity_verification_status, identity_verified, created_at")
      .order("updated_at", { ascending: false });

    if (filterStatus !== "all") {
      query = query.eq("identity_verification_status", filterStatus);
    }

    const { data, error } = await query;
    if (error) toast.error("Erreur");
    else setUsers((data || []).filter((u) => filterStatus === "all" || u.identity_verification_status === filterStatus));
    setLoading(false);
  }, [filterStatus]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleApprove = async (userId: string) => {
    const { error } = await supabase
      .from("profiles")
      .update({ identity_verified: true, identity_verification_status: "verified" })
      .eq("id", userId);
    if (error) toast.error("Erreur");
    else { toast.success("Identité validée ✅"); fetchUsers(); }
  };

  const handleReject = async () => {
    const { error } = await supabase
      .from("profiles")
      .update({ identity_verified: false, identity_verification_status: "rejected" })
      .eq("id", rejectModal.userId);

    if (!error) {
      // Log rejection reason
      await supabase.from("identity_verification_logs").insert({
        user_id: rejectModal.userId,
        result: "rejected",
        rejection_reason: rejectModal.reason,
      });

      // Send notification
      await supabase.from("notifications").insert({
        user_id: rejectModal.userId,
        type: "id_rejected",
        title: "Vérification d'identité refusée",
        body: `Votre pièce d'identité n'a pas pu être validée. Raison : ${rejectModal.reason}. Veuillez soumettre un nouveau document.`,
        link: "/settings",
      });

      toast.success("Document refusé");
      fetchUsers();
    } else {
      toast.error("Erreur");
    }
    setRejectModal({ open: false, userId: "", reason: "" });
  };

  const handleRequestResend = async (userId: string) => {
    await supabase.from("notifications").insert({
      user_id: userId,
      type: "id_resend_request",
      title: "Nouveau document demandé",
      body: "Nous avons besoin d'un nouveau document d'identité. Veuillez en soumettre un depuis vos paramètres.",
      link: "/settings",
    });
    await supabase.from("profiles").update({ identity_verification_status: "not_submitted" }).eq("id", userId);
    toast.success("Demande de renvoi envoyée");
    fetchUsers();
  };

  const pendingCount = users.filter((u) => u.identity_verification_status === "pending").length;

  const rejectionReasons = [
    "Photo floue",
    "Document expiré",
    "Document non conforme",
    "Informations illisibles",
    "Autre",
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <h1 className="font-body text-2xl font-bold">Vérifications d'identité</h1>
        {pendingCount > 0 && (
          <Badge variant="destructive">{pendingCount} en attente</Badge>
        )}
      </div>

      <Select value={filterStatus} onValueChange={setFilterStatus}>
        <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="pending">En attente</SelectItem>
          <SelectItem value="verified">Validés</SelectItem>
          <SelectItem value="rejected">Refusés</SelectItem>
          <SelectItem value="not_submitted">Non soumis</SelectItem>
          <SelectItem value="all">Tous</SelectItem>
        </SelectContent>
      </Select>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Utilisateur</TableHead>
              <TableHead>Document</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Chargement…</TableCell></TableRow>
            ) : users.length === 0 ? (
              <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Aucun document</TableCell></TableRow>
            ) : users.map((user) => (
              <TableRow key={user.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={user.avatar_url || undefined} />
                      <AvatarFallback>{(user.first_name?.[0] || "").toUpperCase()}{(user.last_name?.[0] || "").toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium">{user.first_name} {user.last_name}</div>
                      <div className="text-xs text-muted-foreground">{user.email}</div>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  {user.identity_document_url ? (
                    <Button variant="outline" size="sm" onClick={() => setSelectedDoc(user.identity_document_url)}>
                      Voir le document
                    </Button>
                  ) : (
                    <span className="text-sm text-muted-foreground">Non soumis</span>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant={
                    user.identity_verification_status === "verified" ? "default" :
                    user.identity_verification_status === "pending" ? "secondary" :
                    user.identity_verification_status === "rejected" ? "destructive" : "outline"
                  }>
                    {user.identity_verification_status === "verified" ? "Validé" :
                     user.identity_verification_status === "pending" ? "En attente" :
                     user.identity_verification_status === "rejected" ? "Refusé" : "Non soumis"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    {user.identity_verification_status === "pending" && (
                      <>
                        <Button variant="ghost" size="icon" title="Valider" onClick={() => handleApprove(user.id)}>
                          <ShieldCheck className="h-4 w-4 text-primary" />
                        </Button>
                        <Button variant="ghost" size="icon" title="Refuser" onClick={() => setRejectModal({ open: true, userId: user.id, reason: "" })}>
                          <ShieldX className="h-4 w-4 text-destructive" />
                        </Button>
                      </>
                    )}
                    {user.identity_verification_status === "rejected" && (
                      <Button variant="ghost" size="icon" title="Demander renvoi" onClick={() => handleRequestResend(user.id)}>
                        <RotateCcw className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Document viewer */}
      <Dialog open={!!selectedDoc} onOpenChange={(o) => !o && setSelectedDoc(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Document d'identité</DialogTitle></DialogHeader>
          {selectedDoc && (
            <img src={selectedDoc} alt="Document d'identité" className="w-full rounded-lg" />
          )}
        </DialogContent>
      </Dialog>

      {/* Reject modal */}
      <Dialog open={rejectModal.open} onOpenChange={(o) => !o && setRejectModal({ open: false, userId: "", reason: "" })}>
        <DialogContent>
          <DialogHeader><DialogTitle>Refuser le document</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Sélectionnez le motif de refus :</p>
            <div className="flex flex-wrap gap-2">
              {rejectionReasons.map((r) => (
                <Button
                  key={r}
                  variant={rejectModal.reason === r ? "default" : "outline"}
                  size="sm"
                  onClick={() => setRejectModal((s) => ({ ...s, reason: r }))}
                >
                  {r}
                </Button>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectModal({ open: false, userId: "", reason: "" })}>Annuler</Button>
            <Button variant="destructive" onClick={handleReject} disabled={!rejectModal.reason}>Refuser</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminVerifications;
