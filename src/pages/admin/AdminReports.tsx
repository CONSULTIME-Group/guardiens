import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { useState, useEffect, useCallback, useRef } from "react";
import { refreshAdminBadges } from "@/hooks/useAdminBadges";
import { createSeqGuard } from "@/lib/admin/requestSeq";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
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
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Eye, CheckCircle, StickyNote, AlertTriangle, ExternalLink, UserX, EyeOff, Trash2, ShieldAlert, ChevronLeft, ChevronRight } from "lucide-react";

const PAGE_SIZE = 50;


const reasonLabels: Record<string, string> = {
  inappropriate: "Contenu inapproprié",
  fake_profile: "Faux profil",
  harassment: "Harcèlement",
  fraud: "Annonce frauduleuse",
  other: "Autre",
};

// Valeurs réelles de la table : « sit » et « user ». « listing » et
// « profile » restent en repli pour d'anciens signalements.
const targetTypeLabels: Record<string, string> = {
  sit: "Annonce",
  user: "Profil",
  profile: "Profil",
  listing: "Annonce",
  review: "Avis",
  message: "Message",
  small_mission: "Entraide",
};

type ActionKey = "warn" | "hide" | "suspend" | "delete" | "none";
const DESTRUCTIVE_ACTIONS: ActionKey[] = ["suspend", "delete"];

const actionLabels: Record<string, string> = {
  warn: "Avertissement",
  hide: "Contenu masqué",
  suspend: "Compte suspendu",
  delete: "Contenu supprimé",
  none: "Aucune action, signalement non fondé",
};

/** Lot A9 : liens vers les vues admin, jamais vers les pages membres. */
export function targetHref(targetType: string, targetId: string, conversationId?: string | null): string | null {
  switch (targetType) {
    case "user":
    case "profile": return `/admin/users?user=${targetId}`;
    case "sit":
    case "listing": return `/admin/listings?sit=${targetId}`;
    case "small_mission": return `/admin/small-missions`;
    case "review": return `/admin/reviews`;
    case "message": return conversationId ? `/admin/messages?conversation=${conversationId}` : `/admin/messages`;
    default: return null;
  }
}

const AdminReports = () => {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [filterStatus, setFilterStatus] = useState("pending");
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [reporters, setReporters] = useState<Record<string, { name: string; avatar: string | null }>>({});
  const [noteModal, setNoteModal] = useState<{ open: boolean; reportId: string; note: string }>({ open: false, reportId: "", note: "" });
  const [memberMessage, setMemberMessage] = useState("");
  const [msgConversations, setMsgConversations] = useState<Record<string, string>>({});
  const [actionModal, setActionModal] = useState<{ open: boolean; reportId: string; action: ActionKey | "" }>({ open: false, reportId: "", action: "" });
  const [confirmDestructive, setConfirmDestructive] = useState<{ open: boolean; action: ActionKey | null }>({ open: false, action: null });

  const reportsSeq = useRef(createSeqGuard());
  const fetchReports = useCallback(async () => {
    const token = reportsSeq.current.next();
    setLoading(true);
    const from = page * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;
    let query = supabase
      .from("reports")
      .select("*", { count: "exact" })
      .order("status", { ascending: true })
      .order("created_at", { ascending: true })
      .order("id", { ascending: true });
    if (filterStatus === "pending") query = query.in("status", ["new", "in_progress"]);
    else if (filterStatus !== "all") query = query.eq("status", filterStatus);
    const { data, error, count } = await query.range(from, to);
    // Réponse périmée : une requête plus récente a été lancée entre-temps.
    if (!reportsSeq.current.isCurrent(token)) return;
    if (error) toast.error("Erreur de chargement");
    else {
      setReports(data || []);
      setTotal(count ?? 0);
    }
    setLoading(false);
  }, [filterStatus, page]);

  useEffect(() => { fetchReports(); }, [fetchReports]);


  useEffect(() => {
    if (!reports.length) return;
    const ids = [...new Set(reports.map((r) => r.reporter_id))];
    supabase.from("profiles").select("id, first_name, last_name, avatar_url").in("id", ids).then(({ data }) => {
      const map: Record<string, { name: string; avatar: string | null }> = {};
      data?.forEach((p: any) => { map[p.id] = { name: `${p.first_name || ""} ${p.last_name || ""}`.trim(), avatar: p.avatar_url }; });
      setReporters(map);
    });
  }, [reports]);

  // Conversations des messages signalés, pour le lien « Voir la cible ».
  useEffect(() => {
    const ids = reports.filter((r) => r.target_type === "message" && r.target_id).map((r) => r.target_id);
    if (!ids.length) return;
    supabase.from("messages").select("id, conversation_id").in("id", ids).then(({ data, error }) => {
      if (error) { console.error("reports message conversations", error); return; }
      const map: Record<string, string> = {};
      (data || []).forEach((m: any) => { if (m.conversation_id) map[m.id] = m.conversation_id; });
      setMsgConversations(map);
    });
  }, [reports]);

  const markInProgress = async (id: string) => {
    const { error } = await supabase.from("reports").update({ status: "in_progress" }).eq("id", id);
    if (error) { toast.error(`Prise en charge impossible : ${error.message}`); return; }
    toast.success("Signalement pris en charge"); fetchReports(); refreshAdminBadges();
  };

  const currentReport = reports.find(r => r.id === actionModal.reportId);
  const currentTargetLabel = currentReport
    ? `${targetTypeLabels[currentReport.target_type] || "Contenu"}, motif « ${reasonLabels[currentReport.reason] || "Autre"} »`
    : "";

  const executeAction = async () => {
    if (!actionModal.reportId || !actionModal.action) return;
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-moderate-report", {
        body: {
          report_id: actionModal.reportId,
          action: actionModal.action,
          admin_note: currentReport?.admin_notes || undefined,
          member_message: memberMessage.trim() || undefined,
        },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      toast.success(`${actionLabels[actionModal.action] || "Décision"} : signalement clos`);
      setMemberMessage("");
      setActionModal({ open: false, reportId: "", action: "" });
      setConfirmDestructive({ open: false, action: null });
      fetchReports();
      refreshAdminBadges();
    } catch (e: any) {
      console.error("admin-moderate-report failed", e);
      toast.error(`Échec : ${e?.message || "erreur serveur"}`);
    } finally {
      setSubmitting(false);
    }
  };

  const onConfirmClick = () => {
    if (!actionModal.action) return;
    if (DESTRUCTIVE_ACTIONS.includes(actionModal.action)) {
      setConfirmDestructive({ open: true, action: actionModal.action });
    } else {
      executeAction();
    }
  };

  const saveNote = async () => {
    const { error } = await supabase.from("reports").update({ admin_notes: noteModal.note }).eq("id", noteModal.reportId);
    if (error) { toast.error(`Note non enregistrée : ${error.message}`); return; }
    toast.success("Note interne enregistrée"); fetchReports();
    setNoteModal({ open: false, reportId: "", note: "" });
  };

  const [newCount, setNewCount] = useState(0);
  useEffect(() => {
    supabase
      .from("reports")
      .select("id", { count: "exact", head: true })
      .eq("status", "new")
      .then(({ count }) => setNewCount(count ?? 0));
  }, [reports]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));


  const statusBadge = (status: string) => {
    if (status === "new") return <Badge variant="destructive">Nouveau</Badge>;
    if (status === "in_progress") return <Badge variant="secondary">En cours</Badge>;
    return <Badge variant="default">Traité</Badge>;
  };

  if (loading && reports.length === 0) return <div className="text-muted-foreground py-8 text-center">Chargement…</div>;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Signalements"
        description="Signalements de membres, d'annonces et de messages."
        actions={newCount > 0 ? <Badge variant="destructive">{newCount} nouveau{newCount > 1 ? "x" : ""}</Badge> : undefined}
      />

      <Select value={filterStatus} onValueChange={(v) => { setFilterStatus(v); setPage(0); }}>
        <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="pending">Non traités</SelectItem>
          <SelectItem value="new">Nouveaux</SelectItem>
          <SelectItem value="in_progress">En cours</SelectItem>
          <SelectItem value="resolved">Traités</SelectItem>
          <SelectItem value="all">Tous</SelectItem>
        </SelectContent>
      </Select>

      {reports.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <ShieldAlert className="h-12 w-12 mx-auto mb-3 text-primary/40" />
          <p className="font-medium">Aucun signalement</p>
        </div>
      ) : (
        <div className="space-y-4">
          {reports.map((report) => {
            const reporter = reporters[report.reporter_id];
            const href = targetHref(report.target_type, report.target_id, msgConversations[report.target_id]);
            return (
              <Card key={report.id}>
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-destructive/10">
                        <AlertTriangle className="h-5 w-5 text-destructive" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                          <Badge variant="outline" className="text-xs">{targetTypeLabels[report.target_type] || "Contenu"}</Badge>
                          <span className="text-sm font-medium">{reasonLabels[report.reason] || report.reason}</span>
                          {href && (
                            <a
                              href={href}
                              className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                            >
                              Voir la cible <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Signalé par <span className="font-medium">{reporter?.name || "Inconnu"}</span> · {format(new Date(report.created_at), "d MMM yyyy à HH:mm", { locale: fr })}
                        </p>
                        {report.action_taken && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Décision : <span className="font-medium">{actionLabels[report.action_taken] || "Décision enregistrée"}</span>
                          </p>
                        )}
                      </div>
                    </div>
                    {statusBadge(report.status)}
                  </div>

                  {report.details && (
                    <p className="text-sm bg-muted/50 p-3 rounded-lg">{report.details}</p>
                  )}

                  {report.admin_notes && (
                    <div className="text-xs bg-warning-soft p-2 rounded-lg border border-warning-border">
                      <span className="font-medium">Note interne (jamais envoyée) :</span> {report.admin_notes}
                    </div>
                  )}
                  {report.member_message && (
                    <div className="text-xs bg-muted/50 p-2 rounded-lg border border-border">
                      <span className="font-medium">Message envoyé au membre :</span> {report.member_message}
                    </div>
                  )}

                  <div className="flex items-center gap-2 pt-2 border-t border-border flex-wrap">
                    {report.status === "new" && (
                      <Button size="sm" variant="outline" className="gap-1.5" onClick={() => markInProgress(report.id)}>
                        <Eye className="h-3.5 w-3.5" /> Prendre en charge
                      </Button>
                    )}
                    {report.status !== "resolved" && (
                      <Button size="sm" className="gap-1.5" onClick={() => { setMemberMessage(""); setActionModal({ open: true, reportId: report.id, action: "" }); }}>
                        <CheckCircle className="h-3.5 w-3.5" /> Prendre une action
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" className="gap-1.5" onClick={() => setNoteModal({ open: true, reportId: report.id, note: report.admin_notes || "" })}>
                      <StickyNote className="h-3.5 w-3.5" /> Note interne
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {total} signalement{total > 1 ? "s" : ""} · page {page + 1}/{totalPages}
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={page === 0 || loading} onClick={() => setPage(p => p - 1)}>
              <ChevronLeft className="h-4 w-4 mr-1" /> Précédent
            </Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages - 1 || loading} onClick={() => setPage(p => p + 1)}>
              Suivant <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}



      {/* Action modal */}
      <Dialog open={actionModal.open} onOpenChange={(o) => !o && !submitting && setActionModal({ open: false, reportId: "", action: "" })}>
        <DialogContent>
          <DialogHeader><DialogTitle>Prendre une action</DialogTitle></DialogHeader>
          <div className="space-y-2">
            {[
              { key: "warn" as const, label: "Avertir l'utilisateur", icon: AlertTriangle },
              { key: "hide" as const, label: "Masquer le contenu", icon: EyeOff },
              { key: "suspend" as const, label: "Suspendre le compte", icon: UserX },
              { key: "delete" as const, label: "Supprimer le contenu", icon: Trash2 },
              { key: "none" as const, label: "Aucune action (non fondé)", icon: CheckCircle },
            ].map(({ key, label, icon: Icon }) => (
              <Button
                key={key}
                variant={actionModal.action === key ? "default" : "outline"}
                className="w-full justify-start gap-2"
                onClick={() => setActionModal((s) => ({ ...s, action: key }))}
              >
                <Icon className="h-4 w-4" /> {label}
              </Button>
            ))}
          </div>
          <div className="space-y-1.5">
            <label htmlFor="report-member-message" className="text-sm font-medium">Message au membre (envoyé par email)</label>
            <Textarea
              id="report-member-message"
              value={memberMessage}
              onChange={(e) => setMemberMessage(e.target.value)}
              rows={3}
              maxLength={2000}
              placeholder="Expliquez la décision au membre concerné et au signaleur."
            />
            <p className="text-xs text-muted-foreground">La note interne reste dans l'espace admin.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" disabled={submitting} onClick={() => setActionModal({ open: false, reportId: "", action: "" })}>Annuler</Button>
            <Button onClick={onConfirmClick} disabled={!actionModal.action || submitting}>
              {submitting ? "En cours…" : "Confirmer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Destructive confirmation */}
      <AlertDialog
        open={confirmDestructive.open}
        onOpenChange={(o) => !o && !submitting && setConfirmDestructive({ open: false, action: null })}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmDestructive.action === "suspend" ? "Suspendre ce compte ?" : "Supprimer ce contenu ?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDestructive.action === "suspend"
                ? <>Suspension réversible depuis la fiche membre, sur : <strong>{currentTargetLabel}</strong>.<br /></>
                : <>Action irréversible sur : <strong>{currentTargetLabel}</strong>.<br /></>}
              Confirmez-vous&nbsp;?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitting}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); executeAction(); }}
              disabled={submitting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {submitting ? "En cours…" : "Confirmer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Note modal */}
      <Dialog open={noteModal.open} onOpenChange={(o) => !o && setNoteModal({ open: false, reportId: "", note: "" })}>
        <DialogContent>
          <DialogHeader><DialogTitle>Note interne (jamais envoyée)</DialogTitle></DialogHeader>
          <Textarea value={noteModal.note} onChange={(e) => setNoteModal((s) => ({ ...s, note: e.target.value }))} rows={4} placeholder="Note admin…" />
          <DialogFooter>
            <Button variant="outline" onClick={() => setNoteModal({ open: false, reportId: "", note: "" })}>Annuler</Button>
            <Button onClick={saveNote}>Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminReports;
