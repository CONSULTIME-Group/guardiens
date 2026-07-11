import { useState, useEffect, useCallback } from "react";
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

const targetTypeLabels: Record<string, string> = {
  profile: "Profil",
  listing: "Annonce",
  review: "Avis",
  message: "Message",
  small_mission: "Petite mission",
};

type ActionKey = "warn" | "hide" | "suspend" | "delete" | "none";
const DESTRUCTIVE_ACTIONS: ActionKey[] = ["suspend", "delete"];

function targetHref(targetType: string, targetId: string): string | null {
  switch (targetType) {
    case "profile": return `/gardiens/${targetId}`;
    case "listing": return `/annonces/${targetId}`;
    case "small_mission": return `/petites-missions/${targetId}`;
    case "review": return `/mes-avis?highlight=${targetId}`;
    case "message": return `/messagerie?message=${targetId}`;
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
  const [actionModal, setActionModal] = useState<{ open: boolean; reportId: string; action: ActionKey | "" }>({ open: false, reportId: "", action: "" });
  const [confirmDestructive, setConfirmDestructive] = useState<{ open: boolean; action: ActionKey | null }>({ open: false, action: null });

  const fetchReports = useCallback(async () => {
    setLoading(true);
    const from = page * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;
    let query = supabase
      .from("reports")
      .select("*", { count: "exact" })
      .order("status", { ascending: true })
      .order("created_at", { ascending: true });
    if (filterStatus === "pending") query = query.in("status", ["new", "in_progress"]);
    else if (filterStatus !== "all") query = query.eq("status", filterStatus);
    const { data, error, count } = await query.range(from, to);
    if (error) toast.error("Erreur de chargement");
    else {
      setReports(data || []);
      setTotal(count ?? 0);
    }
    setLoading(false);
  }, [filterStatus, page]);

  useEffect(() => { setPage(0); }, [filterStatus]);
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

  const markInProgress = async (id: string) => {
    await supabase.from("reports").update({ status: "in_progress" }).eq("id", id);
    toast.success("Prise en charge"); fetchReports();
  };

  const currentReport = reports.find(r => r.id === actionModal.reportId);
  const currentTargetLabel = currentReport
    ? `${targetTypeLabels[currentReport.target_type] || currentReport.target_type} — ${currentReport.target_id}`
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
        },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      toast.success(`Action « ${actionModal.action} » appliquée`);
      setActionModal({ open: false, reportId: "", action: "" });
      setConfirmDestructive({ open: false, action: null });
      fetchReports();
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
    await supabase.from("reports").update({ admin_notes: noteModal.note }).eq("id", noteModal.reportId);
    toast.success("Note enregistrée"); fetchReports();
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
      <div className="flex items-center gap-3">
        <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight">Signalements</h1>
        {newCount > 0 && <Badge variant="destructive">{newCount} nouveau{newCount > 1 ? "x" : ""}</Badge>}
      </div>

      <Select value={filterStatus} onValueChange={setFilterStatus}>
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
            const href = targetHref(report.target_type, report.target_id);
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
                          <Badge variant="outline" className="text-xs">{targetTypeLabels[report.target_type] || report.target_type}</Badge>
                          <span className="text-sm font-medium">{reasonLabels[report.reason] || report.reason}</span>
                          {href && (
                            <a
                              href={href}
                              target="_blank"
                              rel="noopener noreferrer"
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
                            Action prise : <span className="font-medium">{report.action_taken}</span>
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
                      <span className="font-medium">Note admin :</span> {report.admin_notes}
                    </div>
                  )}

                  <div className="flex items-center gap-2 pt-2 border-t border-border flex-wrap">
                    {report.status === "new" && (
                      <Button size="sm" variant="outline" className="gap-1.5" onClick={() => markInProgress(report.id)}>
                        <Eye className="h-3.5 w-3.5" /> Prendre en charge
                      </Button>
                    )}
                    {report.status !== "resolved" && (
                      <Button size="sm" className="gap-1.5" onClick={() => setActionModal({ open: true, reportId: report.id, action: "" })}>
                        <CheckCircle className="h-3.5 w-3.5" /> Prendre une action
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" className="gap-1.5" onClick={() => setNoteModal({ open: true, reportId: report.id, note: report.admin_notes || "" })}>
                      <StickyNote className="h-3.5 w-3.5" /> Note
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
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
              Action irréversible sur : <strong>{currentTargetLabel}</strong>.<br />
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
          <DialogHeader><DialogTitle>Note interne</DialogTitle></DialogHeader>
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
