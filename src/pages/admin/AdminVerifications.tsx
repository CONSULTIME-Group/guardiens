import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { ShieldCheck, ShieldX, RotateCcw, Clock, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";

const AdminVerifications = () => {
  const [queue, setQueue] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({ pending: 0, verifiedWeek: 0, rejectedWeek: 0 });
  const [rejectModal, setRejectModal] = useState<{ open: boolean; userId: string; reason: string; customReason: string }>({
    open: false, userId: "", reason: "", customReason: ""
  });

  const fetchQueue = useCallback(async () => {
    setLoading(true);
    // Fetch pending verifications — FIFO order (oldest first)
    const { data } = await supabase
      .from("profiles")
      .select("id, first_name, last_name, email, avatar_url, identity_document_url, identity_selfie_url, identity_verification_status, created_at, updated_at")
      .eq("identity_verification_status", "pending")
      .order("updated_at", { ascending: true });
    setQueue(data || []);

    // Fetch metrics
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
    const [pendingRes, verifiedRes, rejectedRes] = await Promise.all([
      supabase.from("profiles").select("id", { count: "exact", head: true }).eq("identity_verification_status", "pending"),
      supabase.from("identity_verification_logs").select("id", { count: "exact", head: true }).eq("result", "verified").gte("created_at", weekAgo),
      supabase.from("identity_verification_logs").select("id", { count: "exact", head: true }).eq("result", "rejected").gte("created_at", weekAgo),
    ]);
    setMetrics({
      pending: pendingRes.count || 0,
      verifiedWeek: verifiedRes.count || 0,
      rejectedWeek: rejectedRes.count || 0,
    });
    setLoading(false);
  }, []);

  // Fetch attempt count for each user
  const [attemptCounts, setAttemptCounts] = useState<Record<string, number>>({});
  useEffect(() => {
    if (!queue.length) return;
    const ids = queue.map(u => u.id);
    supabase.from("identity_verification_logs").select("user_id").in("user_id", ids).then(({ data }) => {
      const counts: Record<string, number> = {};
      data?.forEach((log: any) => { counts[log.user_id] = (counts[log.user_id] || 0) + 1; });
      setAttemptCounts(counts);
    });
  }, [queue]);

  useEffect(() => { fetchQueue(); }, [fetchQueue]);

  const handleApprove = async (userId: string) => {
    const { error } = await supabase
      .from("profiles")
      .update({ identity_verified: true, identity_verification_status: "verified" })
      .eq("id", userId);
    if (error) { toast.error("Erreur"); return; }

    await supabase.from("identity_verification_logs").insert({ user_id: userId, result: "verified" });
    await supabase.from("notifications").insert({
      user_id: userId, type: "id_verified",
      title: "Identité vérifiée ✓",
      body: "Votre identité a été vérifiée. Le badge apparaît maintenant sur votre profil.",
      link: "/profile",
    });
    toast.success("Identité validée ✅");
    fetchQueue();
  };

  const handleReject = async () => {
    const reason = rejectModal.reason === "Autre" ? rejectModal.customReason : rejectModal.reason;
    if (!reason) { toast.error("Veuillez préciser un motif"); return; }

    const { error } = await supabase
      .from("profiles")
      .update({ identity_verified: false, identity_verification_status: "rejected" })
      .eq("id", rejectModal.userId);
    if (error) { toast.error("Erreur"); return; }

    await supabase.from("identity_verification_logs").insert({
      user_id: rejectModal.userId, result: "rejected", rejection_reason: reason,
    });
    await supabase.from("notifications").insert({
      user_id: rejectModal.userId, type: "id_rejected",
      title: "Vérification d'identité refusée",
      body: `Votre document n'a pas pu être validé. Raison : ${reason}. Vous pouvez soumettre un nouveau document.`,
      link: "/settings",
    });
    toast.success("Document refusé");
    setRejectModal({ open: false, userId: "", reason: "", customReason: "" });
    fetchQueue();
  };

  const handleRequestResend = async (userId: string) => {
    await supabase.from("profiles").update({ identity_verification_status: "not_submitted" }).eq("id", userId);
    await supabase.from("notifications").insert({
      user_id: userId, type: "id_resend_request",
      title: "Nouveau document demandé",
      body: "Nous avons besoin d'un nouveau document d'identité. Veuillez en soumettre un depuis vos paramètres.",
      link: "/settings",
    });
    toast.success("Demande de nouveau document envoyée");
    fetchQueue();
  };

  const rejectionReasons = ["Photo floue", "Document expiré", "Selfie ne correspond pas", "Document non conforme", "Autre"];

  if (loading) return <div className="text-muted-foreground py-8 text-center">Chargement…</div>;

  return (
    <div className="space-y-6">
      <h1 className="font-body text-2xl font-bold">Vérifications d'identité</h1>

      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-yellow-100 dark:bg-yellow-900/30">
              <Clock className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{metrics.pending}</p>
              <p className="text-xs text-muted-foreground">En attente</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
              <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{metrics.verifiedWeek}</p>
              <p className="text-xs text-muted-foreground">Validées cette semaine</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30">
              <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{metrics.rejectedWeek}</p>
              <p className="text-xs text-muted-foreground">Refusées cette semaine</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Queue */}
      {queue.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <ShieldCheck className="h-12 w-12 mx-auto mb-3 text-primary/40" />
          <p className="font-medium">Aucune vérification en attente</p>
          <p className="text-sm">Toutes les demandes ont été traitées 🎉</p>
        </div>
      ) : (
        <div className="space-y-6">
          {queue.map((user, idx) => {
            const attempts = attemptCounts[user.id] || 0;
            return (
              <Card key={user.id} className="overflow-hidden">
                <CardContent className="p-5 space-y-4">
                  {/* Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {user.avatar_url ? (
                        <img src={user.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center font-bold text-sm">
                          {user.first_name?.charAt(0) || "?"}
                        </div>
                      )}
                      <div>
                        <p className="font-medium">{user.first_name} {user.last_name}</p>
                        <p className="text-xs text-muted-foreground">{user.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {attempts > 0 && (
                        <Badge variant="outline" className="text-xs">
                          <AlertTriangle className="h-3 w-3 mr-1" /> Tentative n°{attempts + 1}
                        </Badge>
                      )}
                      <Badge variant="secondary" className="text-xs">
                        <Clock className="h-3 w-3 mr-1" /> {format(new Date(user.updated_at), "d MMM yyyy HH:mm", { locale: fr })}
                      </Badge>
                      <span className="text-xs text-muted-foreground font-mono">#{idx + 1}</span>
                    </div>
                  </div>

                  {/* Side-by-side: Document + Selfie + Avatar */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Document d'identité</p>
                      {user.identity_document_url ? (
                        <img src={user.identity_document_url} alt="Document" className="w-full h-48 object-contain rounded-lg border bg-muted cursor-pointer hover:opacity-80 transition-opacity" />
                      ) : (
                        <div className="w-full h-48 rounded-lg border bg-muted flex items-center justify-center text-xs text-muted-foreground">Non fourni</div>
                      )}
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Selfie</p>
                      {user.identity_selfie_url ? (
                        <img src={user.identity_selfie_url} alt="Selfie" className="w-full h-48 object-contain rounded-lg border bg-muted" />
                      ) : (
                        <div className="w-full h-48 rounded-lg border bg-muted flex items-center justify-center text-xs text-muted-foreground">Non fourni</div>
                      )}
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Photo de profil</p>
                      {user.avatar_url ? (
                        <img src={user.avatar_url} alt="Profil" className="w-full h-48 object-contain rounded-lg border bg-muted" />
                      ) : (
                        <div className="w-full h-48 rounded-lg border bg-muted flex items-center justify-center text-xs text-muted-foreground">Aucune photo</div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-3 pt-2 border-t border-border">
                    <Button size="sm" className="gap-1.5" onClick={() => handleApprove(user.id)}>
                      <ShieldCheck className="h-4 w-4" /> Valider
                    </Button>
                    <Button size="sm" variant="destructive" className="gap-1.5" onClick={() => setRejectModal({ open: true, userId: user.id, reason: "", customReason: "" })}>
                      <ShieldX className="h-4 w-4" /> Refuser
                    </Button>
                    <Button size="sm" variant="outline" className="gap-1.5" onClick={() => handleRequestResend(user.id)}>
                      <RotateCcw className="h-4 w-4" /> Demander nouveau document
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Reject modal */}
      <Dialog open={rejectModal.open} onOpenChange={(o) => !o && setRejectModal({ open: false, userId: "", reason: "", customReason: "" })}>
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
            {rejectModal.reason === "Autre" && (
              <Textarea
                value={rejectModal.customReason}
                onChange={(e) => setRejectModal((s) => ({ ...s, customReason: e.target.value }))}
                placeholder="Précisez le motif…"
                rows={2}
              />
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectModal({ open: false, userId: "", reason: "", customReason: "" })}>Annuler</Button>
            <Button variant="destructive" onClick={handleReject} disabled={!rejectModal.reason || (rejectModal.reason === "Autre" && !rejectModal.customReason)}>
              Refuser
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminVerifications;
