import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { format, startOfWeek } from "date-fns";
import { fr } from "date-fns/locale";
import { ShieldCheck, ShieldX, RotateCcw, Clock, CheckCircle2, XCircle, AlertTriangle, Eye, ExternalLink } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

type HistoryFilter = "all" | "verified" | "rejected" | "pending";

const AdminVerifications = () => {
  const [queue, setQueue] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyUserId, setBusyUserId] = useState<string | null>(null);
  const [metrics, setMetrics] = useState({ pending: 0, verifiedWeek: 0, rejectedWeek: 0 });
  const [rejectModal, setRejectModal] = useState<{ open: boolean; userId: string; reason: string; customReason: string }>({
    open: false, userId: "", reason: "", customReason: ""
  });

  // History state
  const [history, setHistory] = useState<any[]>([]);
  const [historyFilter, setHistoryFilter] = useState<HistoryFilter>("all");
  const [historyPage, setHistoryPage] = useState(0);
  const [historyTotal, setHistoryTotal] = useState(0);
  const PAGE_SIZE = 20;

  // Document viewer modal
  const [docModal, setDocModal] = useState<{ open: boolean; docUrl: string | null; selfieUrl: string | null; name: string }>({
    open: false, docUrl: null, selfieUrl: null, name: ""
  });

  // Revoke modal
  const [revokeModal, setRevokeModal] = useState<{ open: boolean; userId: string; name: string; reason: string }>({
    open: false, userId: "", name: "", reason: ""
  });

  const hydrateIdentityAssets = async (users: any[]) => {
    return Promise.all(
      users.map(async (user) => {
        const { data, error } = await supabase.functions.invoke("admin-manage-identity-verification", {
          body: { action: "preview", userId: user.id },
        });

        if (error) {
          console.error("identity preview error", user.id, error);
        }

        return {
          ...user,
          identity_document_signed_url: data?.docUrl ?? null,
          identity_selfie_signed_url: data?.selfieUrl ?? null,
        };
      }),
    );
  };

  const runIdentityAction = async (action: "approve" | "reject" | "request_resend" | "revoke", userId: string, reason?: string) => {
    const { error } = await supabase.functions.invoke("admin-manage-identity-verification", {
      body: { action, userId, reason },
    });

    if (error) throw error;
  };

  const fetchQueue = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("profiles")
      .select("id, first_name, last_name, email, avatar_url, identity_document_url, identity_selfie_url, identity_verification_status, created_at, updated_at")
      .eq("identity_verification_status", "pending")
      .order("updated_at", { ascending: true });
    setQueue(await hydrateIdentityAssets(data || []));

    const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 }).toISOString();
    const [pendingRes, verifiedRes, rejectedRes] = await Promise.all([
      supabase.from("profiles").select("id", { count: "exact", head: true }).eq("identity_verification_status", "pending"),
      supabase.from("profiles").select("id", { count: "exact", head: true }).eq("identity_verification_status", "verified").gte("updated_at", weekStart),
      supabase.from("profiles").select("id", { count: "exact", head: true }).eq("identity_verification_status", "rejected").gte("updated_at", weekStart),
    ]);
    setMetrics({
      pending: pendingRes.count || 0,
      verifiedWeek: verifiedRes.count || 0,
      rejectedWeek: rejectedRes.count || 0,
    });
    setLoading(false);
  }, []);

  const fetchHistory = useCallback(async () => {
    let query = supabase
      .from("profiles")
      .select("id, first_name, last_name, email, avatar_url, identity_document_url, identity_selfie_url, identity_verification_status, created_at, updated_at", { count: "exact" })
      .in("identity_verification_status", historyFilter === "all" ? ["verified", "rejected", "pending"] : [historyFilter])
      .order("updated_at", { ascending: false })
      .range(historyPage * PAGE_SIZE, (historyPage + 1) * PAGE_SIZE - 1);

    // Only include profiles that have actually submitted (not_submitted excluded)
    query = query.neq("identity_verification_status", "not_submitted");

    const { data, count } = await query;
    setHistory(await hydrateIdentityAssets(data || []));
    setHistoryTotal(count || 0);

    // Fetch rejection reasons from logs for rejected users
    if (data?.length) {
      const rejectedIds = data.filter((u: any) => u.identity_verification_status === "rejected").map((u: any) => u.id);
      if (rejectedIds.length) {
        const { data: logs } = await supabase
          .from("identity_verification_logs")
          .select("user_id, rejection_reason, created_at")
          .in("user_id", rejectedIds)
          .eq("result", "rejected")
          .order("created_at", { ascending: false });

        // Map latest rejection reason per user
        const reasonMap: Record<string, string> = {};
        logs?.forEach((log: any) => {
          if (!reasonMap[log.user_id]) reasonMap[log.user_id] = log.rejection_reason || "";
        });
        setHistory(prev => prev.map(u => ({ ...u, _rejectionReason: reasonMap[u.id] || "" })));
      }
    }
  }, [historyFilter, historyPage]);

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
  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  const refreshAll = () => { fetchQueue(); fetchHistory(); };

  const handleApprove = async (userId: string) => {
    setBusyUserId(userId);
    try {
      await runIdentityAction("approve", userId);

      toast.success("Identité validée ✅");
      refreshAll();
      window.dispatchEvent(new Event("admin-badges-refresh"));
    } catch (error: any) {
      toast.error(error?.message || "Impossible de valider cette vérification");
    } finally {
      setBusyUserId(null);
    }
  };

  const handleReject = async () => {
    const reason = rejectModal.reason === "Autre" ? rejectModal.customReason : rejectModal.reason;
    if (!reason) { toast.error("Veuillez préciser un motif"); return; }

    setBusyUserId(rejectModal.userId);
    try {
      await runIdentityAction("reject", rejectModal.userId, reason);

      toast.success("Document refusé");
      setRejectModal({ open: false, userId: "", reason: "", customReason: "" });
      refreshAll();
      window.dispatchEvent(new Event("admin-badges-refresh"));
    } catch (error: any) {
      toast.error(error?.message || "Impossible de refuser cette vérification");
    } finally {
      setBusyUserId(null);
    }
  };

  const handleRequestResend = async (userId: string) => {
    setBusyUserId(userId);
    try {
      await runIdentityAction("request_resend", userId);

      toast.success("Demande de nouveau document envoyée");
      refreshAll();
      window.dispatchEvent(new Event("admin-badges-refresh"));
    } catch (error: any) {
      toast.error(error?.message || "Impossible d'envoyer la demande");
    } finally {
      setBusyUserId(null);
    }
  };

  const handleRevoke = async () => {
    if (!revokeModal.reason.trim()) { toast.error("Précisez un motif"); return; }
    setBusyUserId(revokeModal.userId);
    try {
      await runIdentityAction("revoke", revokeModal.userId, revokeModal.reason);

      toast.success("Vérification révoquée");
      setRevokeModal({ open: false, userId: "", name: "", reason: "" });
      refreshAll();
      window.dispatchEvent(new Event("admin-badges-refresh"));
    } catch (error: any) {
      toast.error(error?.message || "Impossible de révoquer cette vérification");
    } finally {
      setBusyUserId(null);
    }
  };

  const rejectionReasons = ["Photo floue", "Document expiré", "Selfie ne correspond pas", "Document non conforme", "Autre"];

  const statusBadge = (status: string) => {
    switch (status) {
      case "verified": return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300 border-0">Validée</Badge>;
      case "rejected": return <Badge className="bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300 border-0">Refusée</Badge>;
      case "pending": return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300 border-0">En attente</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const totalPages = Math.ceil(historyTotal / PAGE_SIZE);

  if (loading) return <div className="text-muted-foreground py-8 text-center">Chargement…</div>;

  return (
    <div className="space-y-6">
      <h1 className="font-body text-2xl font-bold">Vérifications d'identité</h1>

      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-yellow-100 dark:bg-yellow-900/30"><Clock className="h-5 w-5 text-yellow-600 dark:text-yellow-400" /></div>
            <div><p className="text-2xl font-bold">{metrics.pending}</p><p className="text-xs text-muted-foreground">En attente</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30"><CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" /></div>
            <div><p className="text-2xl font-bold">{metrics.verifiedWeek}</p><p className="text-xs text-muted-foreground">Validées cette semaine</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30"><XCircle className="h-5 w-5 text-red-600 dark:text-red-400" /></div>
            <div><p className="text-2xl font-bold">{metrics.rejectedWeek}</p><p className="text-xs text-muted-foreground">Refusées cette semaine</p></div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Queue */}
      {queue.length > 0 && (
        <div className="space-y-4">
          <h2 className="font-heading text-lg font-semibold">En attente de traitement ({queue.length})</h2>
          <div className="space-y-6">
            {queue.map((user, idx) => {
              const attempts = attemptCounts[user.id] || 0;
              return (
                <Card key={user.id} className="overflow-hidden">
                  <CardContent className="p-5 space-y-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-3 min-w-0">
                        {user.avatar_url ? (
                          <img src={user.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover" />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center font-bold text-sm">{user.first_name?.charAt(0) || "?"}</div>
                        )}
                        <div className="min-w-0">
                          <p className="font-medium break-words">{user.first_name} {user.last_name}</p>
                          <p className="text-xs text-muted-foreground break-all">{user.email}</p>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        {attempts > 0 && <Badge variant="outline" className="text-xs"><AlertTriangle className="h-3 w-3 mr-1" /> Tentative n°{attempts + 1}</Badge>}
                        <Badge variant="secondary" className="text-xs"><Clock className="h-3 w-3 mr-1" /> {format(new Date(user.updated_at), "d MMM yyyy HH:mm", { locale: fr })}</Badge>
                        <span className="text-xs text-muted-foreground font-mono">#{idx + 1}</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Document d'identité</p>
                        {user.identity_document_signed_url ? (
                          <img
                            src={user.identity_document_signed_url}
                            alt="Document"
                            className="w-full h-48 object-contain rounded-lg border bg-muted cursor-pointer hover:opacity-80 transition-opacity"
                            onClick={() => setDocModal({
                              open: true,
                              docUrl: user.identity_document_signed_url,
                              selfieUrl: user.identity_selfie_signed_url,
                              name: `${user.first_name} ${user.last_name}`
                            })}
                          />
                        ) : <div className="w-full h-48 rounded-lg border bg-muted flex items-center justify-center text-xs text-muted-foreground">Document inaccessible ou non fourni</div>}
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Selfie</p>
                        {user.identity_selfie_signed_url ? <img src={user.identity_selfie_signed_url} alt="Selfie" className="w-full h-48 object-contain rounded-lg border bg-muted" /> : <div className="w-full h-48 rounded-lg border bg-muted flex items-center justify-center text-xs text-muted-foreground">Non fourni</div>}
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Photo de profil</p>
                        {user.avatar_url ? <img src={user.avatar_url} alt="Profil" className="w-full h-48 object-contain rounded-lg border bg-muted" /> : <div className="w-full h-48 rounded-lg border bg-muted flex items-center justify-center text-xs text-muted-foreground">Aucune photo</div>}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-border">
                      <Button size="sm" className="gap-1.5" disabled={busyUserId === user.id} onClick={() => handleApprove(user.id)}><ShieldCheck className="h-4 w-4" /> {busyUserId === user.id ? "Validation..." : "Valider"}</Button>
                      <Button size="sm" variant="destructive" className="gap-1.5" disabled={busyUserId === user.id} onClick={() => setRejectModal({ open: true, userId: user.id, reason: "", customReason: "" })}><ShieldX className="h-4 w-4" /> Refuser</Button>
                      <Button size="sm" variant="outline" className="gap-1.5" disabled={busyUserId === user.id} onClick={() => handleRequestResend(user.id)}><RotateCcw className="h-4 w-4" /> Demander nouveau document</Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* History */}
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="font-heading text-lg font-semibold">Historique des vérifications</h2>
          <div className="flex flex-wrap gap-2">
            {(["all", "verified", "rejected", "pending"] as HistoryFilter[]).map(f => (
              <Button
                key={f}
                size="sm"
                variant={historyFilter === f ? "default" : "outline"}
                onClick={() => { setHistoryFilter(f); setHistoryPage(0); }}
              >
                {{ all: "Toutes", verified: "Validées", rejected: "Refusées", pending: "En attente" }[f]}
              </Button>
            ))}
          </div>
        </div>

        {history.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <ShieldCheck className="h-12 w-12 mx-auto mb-3 text-primary/40" />
            <p className="font-medium">
              {historyFilter === "pending" ? "Aucune vérification en attente" : "Aucune vérification trouvée"}
            </p>
            {historyFilter === "pending" && <p className="text-sm">Toutes les demandes ont été traitées 🎉</p>}
          </div>
        ) : (
          <>
            <div className="rounded-lg border bg-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12"></TableHead>
                    <TableHead>Membre</TableHead>
                      <TableHead className="hidden md:table-cell">Email</TableHead>
                      <TableHead className="hidden md:table-cell">Soumission</TableHead>
                      <TableHead className="hidden md:table-cell">Traitement</TableHead>
                    <TableHead>Statut</TableHead>
                      <TableHead className="hidden lg:table-cell">Motif</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.map(user => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={user.avatar_url || undefined} />
                          <AvatarFallback className="text-xs">{user.first_name?.charAt(0) || "?"}</AvatarFallback>
                        </Avatar>
                      </TableCell>
                      <TableCell className="font-medium">{user.first_name} {user.last_name}</TableCell>
                      <TableCell className="hidden md:table-cell text-sm text-muted-foreground break-all">{user.email}</TableCell>
                      <TableCell className="hidden md:table-cell text-sm">{format(new Date(user.created_at), "d MMM yyyy", { locale: fr })}</TableCell>
                      <TableCell className="hidden md:table-cell text-sm">{format(new Date(user.updated_at), "d MMM yyyy", { locale: fr })}</TableCell>
                      <TableCell>{statusBadge(user.identity_verification_status)}</TableCell>
                      <TableCell className="hidden lg:table-cell text-sm text-muted-foreground max-w-[200px] truncate">
                        {user._rejectionReason || "—"}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 gap-1 text-xs"
                            onClick={() => setDocModal({
                              open: true,
                              docUrl: user.identity_document_signed_url,
                              selfieUrl: user.identity_selfie_signed_url,
                              name: `${user.first_name} ${user.last_name}`
                            })}
                          >
                            <Eye className="h-3.5 w-3.5" /> Doc
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 gap-1 text-xs"
                            onClick={() => window.open(`/profil/${user.id}`, "_blank")}
                          >
                            <ExternalLink className="h-3.5 w-3.5" /> Profil
                          </Button>
                          {user.identity_verification_status === "verified" && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 gap-1 text-xs text-destructive hover:text-destructive"
                              onClick={() => setRevokeModal({ open: true, userId: user.id, name: `${user.first_name} ${user.last_name}`, reason: "" })}
                            >
                              <ShieldX className="h-3.5 w-3.5" /> Révoquer
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">{historyTotal} résultat{historyTotal > 1 ? "s" : ""}</p>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" disabled={historyPage === 0} onClick={() => setHistoryPage(p => p - 1)}>Précédent</Button>
                  <span className="text-sm py-2 px-2">{historyPage + 1} / {totalPages}</span>
                  <Button size="sm" variant="outline" disabled={historyPage >= totalPages - 1} onClick={() => setHistoryPage(p => p + 1)}>Suivant</Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Reject modal */}
      <Dialog open={rejectModal.open} onOpenChange={(o) => !o && setRejectModal({ open: false, userId: "", reason: "", customReason: "" })}>
        <DialogContent>
          <DialogHeader><DialogTitle>Refuser le document</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Sélectionnez le motif de refus :</p>
            <div className="flex flex-wrap gap-2">
              {rejectionReasons.map((r) => (
                <Button key={r} variant={rejectModal.reason === r ? "default" : "outline"} size="sm" onClick={() => setRejectModal((s) => ({ ...s, reason: r }))}>{r}</Button>
              ))}
            </div>
            {rejectModal.reason === "Autre" && (
              <Textarea value={rejectModal.customReason} onChange={(e) => setRejectModal((s) => ({ ...s, customReason: e.target.value }))} placeholder="Précisez le motif…" rows={2} />
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectModal({ open: false, userId: "", reason: "", customReason: "" })}>Annuler</Button>
            <Button variant="destructive" onClick={handleReject} disabled={!rejectModal.reason || (rejectModal.reason === "Autre" && !rejectModal.customReason)}>Refuser</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Document viewer modal */}
      <Dialog open={docModal.open} onOpenChange={(o) => !o && setDocModal({ open: false, docUrl: null, selfieUrl: null, name: "" })}>
        <DialogContent className="max-w-3xl w-[calc(100vw-2rem)] max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Documents — {docModal.name}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase">Pièce d'identité</p>
              {docModal.docUrl ? <img src={docModal.docUrl} alt="Document" className="w-full rounded-lg border" /> : <div className="h-48 rounded-lg border bg-muted flex items-center justify-center text-sm text-muted-foreground">Non fourni</div>}
            </div>
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase">Selfie</p>
              {docModal.selfieUrl ? <img src={docModal.selfieUrl} alt="Selfie" className="w-full rounded-lg border" /> : <div className="h-48 rounded-lg border bg-muted flex items-center justify-center text-sm text-muted-foreground">Non fourni</div>}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Revoke modal */}
      <Dialog open={revokeModal.open} onOpenChange={(o) => !o && setRevokeModal({ open: false, userId: "", name: "", reason: "" })}>
        <DialogContent>
          <DialogHeader><DialogTitle>Révoquer la vérification</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Retirer le badge « ID vérifiée » de <strong>{revokeModal.name}</strong>. Cette action est irréversible.</p>
          <Textarea value={revokeModal.reason} onChange={(e) => setRevokeModal(s => ({ ...s, reason: e.target.value }))} placeholder="Motif de la révocation…" rows={3} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRevokeModal({ open: false, userId: "", name: "", reason: "" })}>Annuler</Button>
            <Button variant="destructive" onClick={handleRevoke} disabled={!revokeModal.reason.trim()}>Révoquer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminVerifications;
