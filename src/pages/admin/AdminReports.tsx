import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Eye, CheckCircle, StickyNote } from "lucide-react";

const reasonLabels: Record<string, string> = {
  inappropriate: "Contenu inapproprié",
  fake_profile: "Faux profil",
  harassment: "Harcèlement",
  fraud: "Annonce frauduleuse",
  other: "Autre",
};

const statusColors: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  new: { label: "Nouveau", variant: "destructive" },
  in_progress: { label: "En cours", variant: "secondary" },
  resolved: { label: "Traité", variant: "default" },
};

const AdminReports = () => {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("all");
  const [noteModal, setNoteModal] = useState<{ open: boolean; reportId: string; note: string }>({
    open: false, reportId: "", note: ""
  });

  const fetchReports = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from("reports")
      .select("*")
      .order("created_at", { ascending: false });

    if (filterStatus !== "all") query = query.eq("status", filterStatus);

    const { data, error } = await query;
    if (error) toast.error("Erreur de chargement");
    else setReports(data || []);
    setLoading(false);
  }, [filterStatus]);

  useEffect(() => { fetchReports(); }, [fetchReports]);

  // Fetch reporter names
  const [reporters, setReporters] = useState<Record<string, string>>({});
  useEffect(() => {
    if (!reports.length) return;
    const ids = [...new Set(reports.map((r) => r.reporter_id))];
    const fetchNames = async () => {
      const { data } = await supabase.from("profiles").select("id, first_name, last_name").in("id", ids);
      const map: Record<string, string> = {};
      data?.forEach((p: any) => { map[p.id] = `${p.first_name || ""} ${p.last_name || ""}`.trim(); });
      setReporters(map);
    };
    fetchNames();
  }, [reports]);

  const markResolved = async (id: string) => {
    const { error } = await supabase
      .from("reports")
      .update({ status: "resolved", resolved_at: new Date().toISOString() })
      .eq("id", id);
    if (error) toast.error("Erreur");
    else { toast.success("Signalement traité"); fetchReports(); }
  };

  const markInProgress = async (id: string) => {
    const { error } = await supabase.from("reports").update({ status: "in_progress" }).eq("id", id);
    if (error) toast.error("Erreur");
    else { toast.success("En cours de traitement"); fetchReports(); }
  };

  const saveNote = async () => {
    const { error } = await supabase.from("reports").update({ admin_notes: noteModal.note }).eq("id", noteModal.reportId);
    if (error) toast.error("Erreur");
    else { toast.success("Note enregistrée"); fetchReports(); }
    setNoteModal({ open: false, reportId: "", note: "" });
  };

  const newCount = reports.filter((r) => r.status === "new").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <h1 className="font-body text-2xl font-bold">Signalements</h1>
        {newCount > 0 && (
          <Badge variant="destructive">{newCount} nouveau{newCount > 1 ? "x" : ""}</Badge>
        )}
      </div>

      <div className="flex gap-3">
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous</SelectItem>
            <SelectItem value="new">Nouveaux</SelectItem>
            <SelectItem value="in_progress">En cours</SelectItem>
            <SelectItem value="resolved">Traités</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Type</TableHead>
              <TableHead>Signalé par</TableHead>
              <TableHead>Motif</TableHead>
              <TableHead>Détails</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Chargement…</TableCell></TableRow>
            ) : reports.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Aucun signalement</TableCell></TableRow>
            ) : reports.map((report) => {
              const s = statusColors[report.status] || statusColors.new;
              return (
                <TableRow key={report.id}>
                  <TableCell className="text-sm capitalize">{report.target_type}</TableCell>
                  <TableCell className="text-sm">{reporters[report.reporter_id] || "—"}</TableCell>
                  <TableCell className="text-sm">{reasonLabels[report.reason] || report.reason}</TableCell>
                  <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground">{report.details || "—"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {format(new Date(report.created_at), "d MMM yyyy", { locale: fr })}
                  </TableCell>
                  <TableCell><Badge variant={s.variant}>{s.label}</Badge></TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      {report.status === "new" && (
                        <Button variant="ghost" size="icon" title="En cours" onClick={() => markInProgress(report.id)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                      )}
                      {report.status !== "resolved" && (
                        <Button variant="ghost" size="icon" title="Marquer traité" onClick={() => markResolved(report.id)}>
                          <CheckCircle className="h-4 w-4 text-primary" />
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" title="Note interne" onClick={() => setNoteModal({ open: true, reportId: report.id, note: report.admin_notes || "" })}>
                        <StickyNote className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

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
