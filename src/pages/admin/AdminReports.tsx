import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Eye, CheckCircle, StickyNote, AlertTriangle, Clock, ExternalLink, UserX, EyeOff, Trash2, ShieldAlert } from "lucide-react";

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

const AdminReports = () => {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("pending");
  const [reporters, setReporters] = useState<Record<string, { name: string; avatar: string | null }>>({});
  const [noteModal, setNoteModal] = useState<{ open: boolean; reportId: string; note: string }>({ open: false, reportId: "", note: "" });
  const [actionModal, setActionModal] = useState<{ open: boolean; reportId: string; action: string }>({ open: false, reportId: "", action: "" });

  const fetchReports = useCallback(async () => {
    setLoading(true);
    let query = supabase.from("reports").select("*").order("status", { ascending: true }).order("created_at", { ascending: true });
    if (filterStatus === "pending") query = query.in("status", ["new", "in_progress"]);
    else if (filterStatus !== "all") query = query.eq("status", filterStatus);
    const { data, error } = await query;
    if (error) toast.error("Erreur de chargement");
    else setReports(data || []);
    setLoading(false);
  }, [filterStatus]);

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

  const takeAction = async () => {
    const report = reports.find(r => r.id === actionModal.reportId);
    if (!report) return;

    // Update the report status
    await supabase.from("reports").update({ status: "resolved", resolved_at: new Date().toISOString() }).eq("id", actionModal.reportId);

    // Send email to reporter
    const { data: emailData } = await supabase.rpc("get_user_emails_admin", { p_user_ids: [report.reporter_id] });
    const reporterEmail = emailData?.[0]?.email;
    if (reporterEmail) {
      await supabase.functions.invoke("send-transactional-email", {
        body: {
          templateName: "report-resolved",
          recipientEmail: reporterEmail,
          idempotencyKey: `report-resolved-${actionModal.reportId}`,
          templateData: { reason: report.reason, status: "resolved", adminNotes: report.admin_notes || undefined },
        },
      });
    }

    toast.success(`Action "${actionModal.action}" appliquée`);
    setActionModal({ open: false, reportId: "", action: "" });
    fetchReports();
  };

  const saveNote = async () => {
    await supabase.from("reports").update({ admin_notes: noteModal.note }).eq("id", noteModal.reportId);
    toast.success("Note enregistrée"); fetchReports();
    setNoteModal({ open: false, reportId: "", note: "" });
  };

  const newCount = reports.filter((r) => r.status === "new").length;
  const inProgressCount = reports.filter((r) => r.status === "in_progress").length;

  const statusBadge = (status: string) => {
    if (status === "new") return <Badge variant="destructive">Nouveau</Badge>;
    if (status === "in_progress") return <Badge variant="secondary">En cours</Badge>;
    return <Badge variant="default">Traité</Badge>;
  };

  if (loading) return <div className="text-muted-foreground py-8 text-center">Chargement…</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <h1 className="font-body text-2xl font-bold">Signalements</h1>
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
            return (
              <Card key={report.id}>
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-red-50 dark:bg-red-900/20">
                        <AlertTriangle className="h-5 w-5 text-red-500" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-0.5">
                          <Badge variant="outline" className="text-xs">{targetTypeLabels[report.target_type] || report.target_type}</Badge>
                          <span className="text-sm font-medium">{reasonLabels[report.reason] || report.reason}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Signalé par <span className="font-medium">{reporter?.name || "Inconnu"}</span> · {format(new Date(report.created_at), "d MMM yyyy à HH:mm", { locale: fr })}
                        </p>
                      </div>
                    </div>
                    {statusBadge(report.status)}
                  </div>

                  {report.details && (
                    <p className="text-sm bg-muted/50 p-3 rounded-lg">{report.details}</p>
                  )}

                  {report.admin_notes && (
                    <div className="text-xs bg-yellow-50 dark:bg-yellow-900/20 p-2 rounded-lg border border-yellow-200 dark:border-yellow-800">
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
      <Dialog open={actionModal.open} onOpenChange={(o) => !o && setActionModal({ open: false, reportId: "", action: "" })}>
        <DialogContent>
          <DialogHeader><DialogTitle>Prendre une action</DialogTitle></DialogHeader>
          <div className="space-y-2">
            {[
              { key: "warn", label: "Avertir l'utilisateur", icon: AlertTriangle },
              { key: "hide", label: "Masquer le contenu", icon: EyeOff },
              { key: "suspend", label: "Suspendre le compte", icon: UserX },
              { key: "delete", label: "Supprimer le contenu", icon: Trash2 },
              { key: "none", label: "Aucune action (non fondé)", icon: CheckCircle },
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
            <Button variant="outline" onClick={() => setActionModal({ open: false, reportId: "", action: "" })}>Annuler</Button>
            <Button onClick={takeAction} disabled={!actionModal.action}>Confirmer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
