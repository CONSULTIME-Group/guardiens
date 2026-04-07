import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { format, isPast, isFuture, differenceInDays, formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { AlertTriangle, Search, Eye, XCircle, Star, StickyNote, RotateCcw } from "lucide-react";
import { useNavigate } from "react-router-dom";

const AdminSitsManagement = () => {
  const navigate = useNavigate();
  const [sits, setSits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("no_draft");
  const [filterType, setFilterType] = useState<"all" | "sits" | "long_stays">("all");
  const [search, setSearch] = useState("");
  const [sitters, setSitters] = useState<Record<string, { name: string; avatar: string | null }>>({});
  const [reviews, setReviews] = useState<Record<string, { owner: boolean; sitter: boolean }>>({});
  const [cancelModal, setCancelModal] = useState<{ open: boolean; id: string; type: string; reason: string }>({ open: false, id: "", type: "", reason: "" });
  const [noteModal, setNoteModal] = useState<{ open: boolean; id: string; note: string }>({ open: false, id: "", note: "" });

  const fetchSits = useCallback(async () => {
    setLoading(true);
    const results: any[] = [];

    const getStatuses = () => {
      if (filterStatus === "no_draft") return ["confirmed", "completed", "cancelled", "published"];
      if (filterStatus === "all") return ["draft", "confirmed", "completed", "cancelled", "published"];
      return [filterStatus];
    };
    const statuses = getStatuses();

    if (filterType !== "long_stays") {
      const { data } = await supabase.from("sits").select("*, owner:profiles!sits_user_id_fkey(first_name, last_name, avatar_url, city)").in("status", statuses as any).order("created_at", { ascending: false });
      (data || []).forEach(d => results.push({ ...d, _type: "sit" }));
    }

    if (filterType !== "sits") {
      const { data } = await supabase.from("long_stays").select("*, owner:profiles!long_stays_user_id_fkey(first_name, last_name, avatar_url, city)").in("status", statuses as any).order("created_at", { ascending: false });
      (data || []).forEach(d => results.push({ ...d, _type: "long_stay" }));
    }

    results.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    setSits(results);
    setLoading(false);
  }, [filterStatus, filterType]);

  useEffect(() => { fetchSits(); }, [fetchSits]);

  // Fetch accepted sitters
  useEffect(() => {
    if (!sits.length) return;
    const fetchSitterData = async () => {
      const map: Record<string, { name: string; avatar: string | null }> = {};
      const sitIds = sits.filter(s => s._type === "sit").map(s => s.id);
      const lsIds = sits.filter(s => s._type === "long_stay").map(s => s.id);

      if (sitIds.length) {
        const { data } = await supabase.from("applications").select("sit_id, sitter:profiles!applications_sitter_id_fkey(first_name, last_name, avatar_url)").in("sit_id", sitIds).eq("status", "accepted");
        data?.forEach((a: any) => { if (a.sitter) map[a.sit_id] = { name: `${a.sitter.first_name || ""} ${a.sitter.last_name || ""}`.trim(), avatar: a.sitter.avatar_url }; });
      }
      if (lsIds.length) {
        const { data } = await supabase.from("long_stay_applications").select("long_stay_id, sitter:profiles!long_stay_applications_sitter_id_fkey(first_name, last_name, avatar_url)").in("long_stay_id", lsIds).eq("status", "accepted");
        data?.forEach((a: any) => { if (a.sitter) map[a.long_stay_id] = { name: `${a.sitter.first_name || ""} ${a.sitter.last_name || ""}`.trim(), avatar: a.sitter.avatar_url }; });
      }
      setSitters(map);
    };
    fetchSitterData();
  }, [sits]);

  // Fetch reviews
  useEffect(() => {
    if (!sits.length) return;
    const ids = sits.filter(s => s._type === "sit").map(s => s.id);
    if (!ids.length) return;
    supabase.from("reviews").select("sit_id, review_type").in("sit_id", ids).then(({ data }) => {
      const map: Record<string, { owner: boolean; sitter: boolean }> = {};
      data?.forEach((r: any) => {
        if (!map[r.sit_id]) map[r.sit_id] = { owner: false, sitter: false };
        if (r.review_type === "owner_to_sitter") map[r.sit_id].owner = true;
        if (r.review_type === "sitter_to_owner") map[r.sit_id].sitter = true;
      });
      setReviews(map);
    });
  }, [sits]);

  const getTimingStatus = (sit: any) => {
    if (sit.status === "cancelled") return { label: "Annulée", variant: "destructive" as const };
    if (sit.status === "completed") return { label: "Terminée", variant: "secondary" as const };
    if (!sit.start_date) return { label: "À venir", variant: "outline" as const };
    const start = new Date(sit.start_date);
    const end = sit.end_date ? new Date(sit.end_date) : null;
    if (isFuture(start)) return { label: "À venir", variant: "outline" as const };
    if (end && isPast(end)) return { label: "Dates passées", variant: "destructive" as const };
    return { label: "En cours", variant: "default" as const };
  };

  const forceComplete = async (sit: any) => {
    const table = sit._type === "sit" ? "sits" : "long_stays";
    await supabase.from(table).update({ status: "completed" as any }).eq("id", sit.id);
    toast.success("Garde marquée terminée"); fetchSits();
  };

  const handleCancel = async () => {
    const sit = sits.find(s => s.id === cancelModal.id);
    if (!sit) return;
    const table = sit._type === "sit" ? "sits" : "long_stays";
    await supabase.from(table).update({ status: "cancelled" as any, cancellation_reason: cancelModal.reason } as any).eq("id", cancelModal.id);

    // Notify both parties
    if (sit.user_id) {
      await supabase.from("notifications").insert({ user_id: sit.user_id, type: "sit_cancelled", title: "Garde annulée par l'admin", body: `La garde "${sit.title}" a été annulée. Motif : ${cancelModal.reason}`, link: `/sits/${sit.id}` });
    }
    const sitter = sitters[sit.id];
    // We don't have sitter user_id easily — the notification triggers will handle it

    toast.success("Garde annulée");
    setCancelModal({ open: false, id: "", type: "", reason: "" });
    fetchSits();
  };

  // Alerts
  const overdueConfirmed = sits.filter(s => s.status === "confirmed" && s.end_date && isPast(new Date(s.end_date)));
  const missingReviews14d = sits.filter(s => s.status === "completed" && s._type === "sit" && s.end_date && differenceInDays(new Date(), new Date(s.end_date)) >= 14 && (!reviews[s.id]?.owner || !reviews[s.id]?.sitter));
  const cancelledThisWeek = sits.filter(s => s.status === "cancelled" && differenceInDays(new Date(), new Date(s.created_at)) <= 7);

  const filtered = sits.filter(s => {
    if (!search) return true;
    const q = search.toLowerCase();
    return s.title?.toLowerCase().includes(q) || s.owner?.first_name?.toLowerCase().includes(q) || s.owner?.city?.toLowerCase().includes(q) || sitters[s.id]?.name?.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6">
      <h1 className="font-body text-2xl font-bold">Gardes</h1>

      {/* Alerts */}
      {(overdueConfirmed.length > 0 || missingReviews14d.length > 0 || cancelledThisWeek.length > 0) && (
        <div className="space-y-2">
          {overdueConfirmed.length > 0 && (
            <Card className="border-orange-200 bg-orange-50 dark:bg-orange-900/10 dark:border-orange-800">
              <CardContent className="p-3 flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-orange-500 shrink-0" />
                <p className="text-sm flex-1">{overdueConfirmed.length} garde{overdueConfirmed.length > 1 ? "s" : ""} avec dates passées mais encore "confirmée{overdueConfirmed.length > 1 ? "s" : ""}"</p>
              </CardContent>
            </Card>
          )}
          {missingReviews14d.length > 0 && (
            <Card className="border-orange-200 bg-orange-50 dark:bg-orange-900/10 dark:border-orange-800">
              <CardContent className="p-3 flex items-center gap-3">
                <Star className="h-5 w-5 text-orange-500 shrink-0" />
                <p className="text-sm flex-1">{missingReviews14d.length} garde{missingReviews14d.length > 1 ? "s" : ""} avec avis manquant depuis +14 jours</p>
              </CardContent>
            </Card>
          )}
          {cancelledThisWeek.length > 0 && (
            <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-900/10 dark:border-yellow-800">
              <CardContent className="p-3 flex items-center gap-3">
                <XCircle className="h-5 w-5 text-yellow-600 shrink-0" />
                <p className="text-sm flex-1">{cancelledThisWeek.length} annulation{cancelledThisWeek.length > 1 ? "s" : ""} cette semaine</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Rechercher…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={filterType} onValueChange={(v) => setFilterType(v as any)}>
          <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous types</SelectItem>
            <SelectItem value="sits">Classique</SelectItem>
            <SelectItem value="long_stays">Longue durée</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="no_draft">Sans brouillons</SelectItem>
            <SelectItem value="all">Tous statuts</SelectItem>
            <SelectItem value="confirmed">Confirmées</SelectItem>
            <SelectItem value="completed">Terminées</SelectItem>
            <SelectItem value="cancelled">Annulées</SelectItem>
            <SelectItem value="published">Publiées</SelectItem>
            <SelectItem value="draft">Brouillons</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-lg border bg-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Annonce</TableHead>
              <TableHead>Proprio</TableHead>
              <TableHead>Gardien</TableHead>
              <TableHead>Ville</TableHead>
              <TableHead>Dates</TableHead>
              <TableHead>Dernière activité</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Avis</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={10} className="text-center py-8 text-muted-foreground">Chargement…</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={10} className="text-center py-8 text-muted-foreground">Aucune garde</TableCell></TableRow>
            ) : filtered.map((sit) => {
              const timing = getTimingStatus(sit);
              const sitter = sitters[sit.id];
              const rev = reviews[sit.id] || { owner: false, sitter: false };
              const isOverdue = sit.status === "confirmed" && sit.end_date && isPast(new Date(sit.end_date));
              return (
                <TableRow key={`${sit._type}-${sit.id}`} className={isOverdue ? "bg-orange-50/50 dark:bg-orange-900/5" : ""}>
                  <TableCell className="font-medium max-w-[160px] truncate">{sit.title || "Sans titre"}</TableCell>
                  <TableCell className="text-sm">
                    <div className="flex items-center gap-2">
                      {sit.owner?.avatar_url && <img src={sit.owner.avatar_url} className="w-5 h-5 rounded-full object-cover" />}
                      <span>{sit.owner?.first_name} {sit.owner?.last_name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">
                    {sitter ? (
                      <div className="flex items-center gap-2">
                        {sitter.avatar && <img src={sitter.avatar} className="w-5 h-5 rounded-full object-cover" />}
                        <span>{sitter.name}</span>
                      </div>
                    ) : "—"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{sit.owner?.city || "—"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                    {sit.start_date ? format(new Date(sit.start_date), "d MMM", { locale: fr }) : "—"}
                    {" → "}
                    {sit.end_date ? format(new Date(sit.end_date), "d MMM yy", { locale: fr }) : "—"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                    {sit.updated_at ? formatDistanceToNow(new Date(sit.updated_at), { addSuffix: true, locale: fr }) : "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">{sit._type === "sit" ? "Classique" : "Longue durée"}</Badge>
                  </TableCell>
                  <TableCell><Badge variant={timing.variant}>{timing.label}</Badge></TableCell>
                  <TableCell className="text-xs">
                    {sit._type === "sit" ? (
                      <>
                        <div>P: {rev.owner ? "✅" : "❌"}</div>
                        <div>G: {rev.sitter ? "✅" : "❌"}</div>
                      </>
                    ) : "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" title="Voir" onClick={() => navigate(`/sits/${sit.id}`)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      {isOverdue && (
                        <Button variant="ghost" size="icon" title="Forcer fin" onClick={() => forceComplete(sit)}>
                          <RotateCcw className="h-4 w-4 text-primary" />
                        </Button>
                      )}
                      {sit.status === "confirmed" && (
                        <Button variant="ghost" size="icon" title="Annuler" onClick={() => setCancelModal({ open: true, id: sit.id, type: sit._type, reason: "" })}>
                          <XCircle className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Cancel modal */}
      <Dialog open={cancelModal.open} onOpenChange={(o) => !o && setCancelModal({ open: false, id: "", type: "", reason: "" })}>
        <DialogContent>
          <DialogHeader><DialogTitle>Annuler cette garde ?</DialogTitle></DialogHeader>
          <DialogDescription>Les deux parties seront notifiées.</DialogDescription>
          <Textarea value={cancelModal.reason} onChange={(e) => setCancelModal(s => ({ ...s, reason: e.target.value }))} placeholder="Motif d'annulation…" rows={3} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelModal({ open: false, id: "", type: "", reason: "" })}>Annuler</Button>
            <Button variant="destructive" onClick={handleCancel} disabled={!cancelModal.reason.trim()}>Confirmer l'annulation</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminSitsManagement;
