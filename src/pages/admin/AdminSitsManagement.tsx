import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { format, isPast, isFuture, differenceInDays, formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { AlertTriangle, Search, Eye, XCircle, Star, StickyNote, RotateCcw, User, Calendar, MapPin, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { getCountryName } from "@/lib/countries";
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

const AdminSitsManagement = () => {
  const navigate = useNavigate();
  const [sits, setSits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("operational");
  const [search, setSearch] = useState("");
  const [filterCountry, setFilterCountry] = useState<string>("all");
  const [sitters, setSitters] = useState<Record<string, { name: string; avatar: string | null; id?: string }>>({});
  const [reviews, setReviews] = useState<Record<string, { owner: boolean; sitter: boolean }>>({});
  const [statsBySit, setStatsBySit] = useState<Record<string, { views: number; messages: number }>>({});
  const [cancelModal, setCancelModal] = useState<{ open: boolean; id: string; type: string; reason: string }>({ open: false, id: "", type: "", reason: "" });
  const [cancelling, setCancelling] = useState(false);
  const [noteModal, setNoteModal] = useState<{ open: boolean; id: string; note: string }>({ open: false, id: "", note: "" });
  const [forceCompleteModal, setForceCompleteModal] = useState<{ open: boolean; sit: any | null }>({ open: false, sit: null });
  const [forcingComplete, setForcingComplete] = useState(false);

  // Sheet state
  const [selectedSit, setSelectedSit] = useState<any | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetApplications, setSheetApplications] = useState<any[]>([]);
  const [sheetAppsLoading, setSheetAppsLoading] = useState(false);
  const [sheetStats, setSheetStats] = useState<{ view_count: number; message_count: number; conversation_count: number } | null>(null);
  const [showAllApps, setShowAllApps] = useState(false);

  const fetchSits = useCallback(async () => {
    setLoading(true);
    const results: any[] = [];

    const getStatuses = () => {
      // "operational" = vraies gardes post-acceptation. Le reste appartient à l'onglet Annonces.
      if (filterStatus === "operational") return ["confirmed", "completed", "cancelled"];
      if (filterStatus === "no_draft") return ["confirmed", "completed", "cancelled", "published"];
      if (filterStatus === "all") return ["draft", "confirmed", "completed", "cancelled", "published"];
      return [filterStatus];
    };
    const statuses = getStatuses();

    const { data } = await supabase.from("sits").select("*, owner:profiles!sits_user_id_fkey(first_name, last_name, avatar_url, city)").in("status", statuses as any).order("created_at", { ascending: false });
    (data || []).forEach(d => results.push({ ...d, _type: "sit" }));

    results.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    setSits(results);
    setLoading(false);
  }, [filterStatus]);

  useEffect(() => { fetchSits(); }, [fetchSits]);

  // Fetch accepted sitters
  useEffect(() => {
    if (!sits.length) return;
    const fetchSitterData = async () => {
      const map: Record<string, { name: string; avatar: string | null; id?: string }> = {};
      const sitIds = sits.map(s => s.id);

      if (sitIds.length) {
        // RPC sécurisée : ne retourne que le gardien accepté (pas les candidatures non retenues)
        const { data, error } = await supabase.rpc("admin_get_accepted_sitters", { p_sit_ids: sitIds });
        if (error) console.error("admin_get_accepted_sitters:", error);
        (data || []).forEach((a: any) => {
          map[a.sit_id] = {
            name: `${a.first_name || ""} ${a.last_name || ""}`.trim(),
            avatar: a.avatar_url,
            id: a.sitter_id,
          };
        });
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
    supabase.from("reviews").select("sit_id, reviewer_id, reviewee_id, review_type").in("sit_id", ids).then(({ data }) => {
      const map: Record<string, { owner: boolean; sitter: boolean }> = {};
      data?.forEach((r: any) => {
        if (!map[r.sit_id]) map[r.sit_id] = { owner: false, sitter: false };
        if (r.review_type === "garde") {
          if (sitters[r.sit_id]?.name && r.reviewee_id) {
            // fallback handled by reviewer/reviewee pairing below when UI loads
          }
          if (r.reviewer_id === sits.find((s) => s.id === r.sit_id)?.user_id) map[r.sit_id].owner = true;
          else map[r.sit_id].sitter = true;
        }
      });
      setReviews(map);
    });
  }, [sits]);

  // Batch fetch view/message counts for the table
  useEffect(() => {
    if (!sits.length) { setStatsBySit({}); return; }
    const ids = sits.map(s => s.id);
    supabase.rpc("admin_get_sits_stats" as any, { p_sit_ids: ids }).then(({ data, error }) => {
      if (error) { console.error("admin_get_sits_stats:", error); return; }
      const map: Record<string, { views: number; messages: number }> = {};
      (data as any[] || []).forEach(r => {
        map[r.sit_id] = { views: Number(r.view_count) || 0, messages: Number(r.message_count) || 0 };
      });
      setStatsBySit(map);
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
    setForcingComplete(true);
    const { error } = await supabase.from("sits").update({ status: "completed" as any }).eq("id", sit.id);
    if (error) {
      toast.error(error.message || "Erreur");
      setForcingComplete(false);
      return;
    }
    // Journal d'audit admin
    const { data: userData } = await supabase.auth.getUser();
    const adminId = userData.user?.id;
    if (adminId) {
      await supabase.from("admin_action_logs").insert({
        admin_id: adminId,
        action: "force_complete_garde",
        target_type: "garde",
        target_id: sit.id,
        metadata: {
          title: sit.title ?? null,
          owner_id: sit.user_id ?? null,
          previous_status: sit.status ?? null,
          start_date: sit.start_date ?? null,
          end_date: sit.end_date ?? null,
        },
      });
    }
    toast.success("Garde marquée terminée");
    setForcingComplete(false);
    setForceCompleteModal({ open: false, sit: null });
    fetchSits();
  };

  const handleCancel = async () => {
    const sit = sits.find(s => s.id === cancelModal.id);
    if (!sit) return;
    setCancelling(true);

    await supabase.from("sits").update({ status: "cancelled" as any, cancellation_reason: cancelModal.reason } as any).eq("id", cancelModal.id);

    if (sit.user_id) {
      await supabase.from("notifications").insert({ user_id: sit.user_id, type: "sit_cancelled", title: "Garde annulée par l'admin", body: `La garde "${sit.title}" a été annulée. Motif : ${cancelModal.reason}`, link: `/sits/${sit.id}` });
    }

    const confirmedSitterId = sitters[sit.id]?.id;
    if (confirmedSitterId) {
      await supabase.from("notifications").insert({ user_id: confirmedSitterId, type: "sit_cancelled", title: "Garde annulée par l'admin", body: `La garde "${sit.title}" a été annulée. Motif : ${cancelModal.reason}`, link: `/sits/${sit.id}` });
    }

    toast.success("Garde annulée");
    setCancelling(false);
    setCancelModal({ open: false, id: "", type: "", reason: "" });
    fetchSits();
  };

  // Sheet: open sit detail
  const openSitSheet = async (sit: any) => {
    setSelectedSit(sit);
    setSheetOpen(true);
    setShowAllApps(false);
    setSheetAppsLoading(true);
    setSheetStats(null);

    // RPC sécurisée : statut + date + gardien (id/prénom/avatar) sans message ni champs internes
    const [appsRes, statsRes] = await Promise.all([
      supabase.rpc("admin_get_sit_applications", { p_sit_id: sit.id }),
      supabase.rpc("admin_get_sit_stats", { p_sit_id: sit.id }),
    ]);
    const data = (appsRes.data || []).map((r: any) => ({
      id: r.id,
      status: r.status,
      created_at: r.created_at,
      sitter_id: r.sitter_id,
      sitter: { first_name: r.sitter_first_name, avatar_url: r.sitter_avatar_url },
    }));

    setSheetApplications(data);
    setSheetAppsLoading(false);
    const s = (statsRes.data as any)?.[0];
    if (s) setSheetStats({ view_count: Number(s.view_count) || 0, message_count: Number(s.message_count) || 0, conversation_count: Number(s.conversation_count) || 0 });
  };

  // Sheet: admin status transitions
  const handleSheetTransition = async (newStatus: string) => {
    if (!selectedSit) return;
    const { error } = await supabase.from("sits").update({ status: newStatus as any }).eq("id", selectedSit.id);
    if (error) {
      toast.error("Erreur lors de la mise à jour");
      return;
    }
    toast.success(newStatus === "in_progress" ? "Garde marquée en cours" : "Garde marquée terminée");
    setSelectedSit((prev: any) => prev ? { ...prev, status: newStatus } : null);
    fetchSits();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending": return <Badge variant="outline">En attente</Badge>;
      case "accepted": return <Badge variant="default">Acceptée</Badge>;
      case "rejected": return <Badge variant="destructive">Refusée</Badge>;
      case "withdrawn": return <Badge variant="secondary">Retirée</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Alerts
  const overdueConfirmed = sits.filter(s => s.status === "confirmed" && s.end_date && isPast(new Date(s.end_date)));
  const missingReviews14d = sits.filter(s => s.status === "completed" && s._type === "sit" && s.end_date && differenceInDays(new Date(), new Date(s.end_date)) >= 14 && (!reviews[s.id]?.owner || !reviews[s.id]?.sitter));
  const cancelledThisWeek = sits.filter(s => s.status === "cancelled" && differenceInDays(new Date(), new Date(s.created_at)) <= 7);

  const filtered = sits.filter(s => {
    if (filterCountry === "fr" && (s.country || "FR") !== "FR") return false;
    if (filterCountry === "intl" && (s.country || "FR") === "FR") return false;
    if (filterCountry !== "all" && filterCountry !== "fr" && filterCountry !== "intl" && (s.country || "FR") !== filterCountry) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return s.title?.toLowerCase().includes(q) || s.owner?.first_name?.toLowerCase().includes(q) || s.owner?.city?.toLowerCase().includes(q) || sitters[s.id]?.name?.toLowerCase().includes(q);
  });

  const availableCountries = Array.from(new Set(sits.map(s => s.country || "FR").filter(Boolean))).sort();
  const intlSitsCount = sits.filter(s => (s.country || "FR") !== "FR").length;

  const visibleApps = showAllApps ? sheetApplications : sheetApplications.slice(0, 3);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight">Gardes</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Cycle opérationnel post-acceptation (confirmed, completed, cancelled) : pairing proprio/gardien, statut temporel, avis.
        </p>
        <p className="text-sm text-muted-foreground mt-1">
          Pour les annonces publiées (en recherche de gardien), les brouillons et les statistiques de trafic, consultez l'onglet{' '}
          <button
            onClick={() => navigate('/admin/listings')}
            className="font-medium text-foreground underline hover:text-primary transition-colors"
          >
            Annonces
          </button>.
        </p>
      </div>

      {/* Alerts */}
      {(overdueConfirmed.length > 0 || missingReviews14d.length > 0 || cancelledThisWeek.length > 0) && (
        <div className="space-y-2">
          {overdueConfirmed.length > 0 && (
            <Card className="border-warning-border bg-warning-soft">
              <CardContent className="p-3 flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-warning shrink-0" />
                <p className="text-sm flex-1">{overdueConfirmed.length} garde{overdueConfirmed.length > 1 ? "s" : ""} avec dates passées mais encore "confirmée{overdueConfirmed.length > 1 ? "s" : ""}"</p>
              </CardContent>
            </Card>
          )}
          {missingReviews14d.length > 0 && (
            <Card className="border-warning-border bg-warning-soft">
              <CardContent className="p-3 flex items-center gap-3">
                <Star className="h-5 w-5 text-warning shrink-0" />
                <p className="text-sm flex-1">{missingReviews14d.length} garde{missingReviews14d.length > 1 ? "s" : ""} avec avis manquant depuis +14 jours</p>
              </CardContent>
            </Card>
          )}
          {cancelledThisWeek.length > 0 && (
            <Card className="border-warning-border bg-warning-soft">
              <CardContent className="p-3 flex items-center gap-3">
                <XCircle className="h-5 w-5 text-warning shrink-0" />
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
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[220px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="operational">Opérationnelles (par défaut)</SelectItem>
            <SelectItem value="confirmed">Confirmées uniquement</SelectItem>
            <SelectItem value="completed">Terminées</SelectItem>
            <SelectItem value="cancelled">Annulées</SelectItem>
            <SelectItem value="no_draft">+ Annonces publiées</SelectItem>
            <SelectItem value="published">Publiées (pré-confirmation)</SelectItem>
            <SelectItem value="draft">Brouillons</SelectItem>
            <SelectItem value="all">Tous statuts</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterCountry} onValueChange={setFilterCountry}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Pays" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous pays {intlSitsCount > 0 ? `(${intlSitsCount} hors FR)` : ""}</SelectItem>
            <SelectItem value="fr">France uniquement</SelectItem>
            <SelectItem value="intl">Hors France</SelectItem>
            {availableCountries.filter(c => c !== "FR").map(c => (
              <SelectItem key={c} value={c}>{getCountryName(c)}</SelectItem>
            ))}
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
              <TableHead className="text-right">Vues</TableHead>
              <TableHead className="text-right">Msg</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Avis</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={11} className="text-center py-8 text-muted-foreground">Chargement…</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={11} className="text-center py-8 text-muted-foreground">Aucune garde</TableCell></TableRow>
            ) : filtered.map((sit) => {
              const timing = getTimingStatus(sit);
              const sitter = sitters[sit.id];
              const rev = reviews[sit.id] || { owner: false, sitter: false };
              const isOverdue = sit.status === "confirmed" && sit.end_date && isPast(new Date(sit.end_date));
              return (
                <TableRow
                  key={sit.id}
                  className={`transition-colors hover:bg-muted/50 ${isOverdue ? "bg-warning-soft/50" : ""}`}
                >
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
                    ) : ","}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <span>{sit.owner?.city || ","}</span>
                      {sit.country && sit.country !== "FR" && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">{getCountryName(sit.country)}</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                    {sit.start_date ? format(new Date(sit.start_date), "d MMM", { locale: fr }) : ","}
                    {" → "}
                    {sit.end_date ? format(new Date(sit.end_date), "d MMM yy", { locale: fr }) : ","}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                    {sit.updated_at ? formatDistanceToNow(new Date(sit.updated_at), { addSuffix: true, locale: fr }) : ","}
                  </TableCell>
                  <TableCell className="text-right text-sm font-medium tabular-nums">{statsBySit[sit.id]?.views ?? ","}</TableCell>
                  <TableCell className="text-right text-sm font-medium tabular-nums">{statsBySit[sit.id]?.messages ?? ","}</TableCell>
                  <TableCell><Badge variant={timing.variant}>{timing.label}</Badge></TableCell>
                  <TableCell className="text-xs">
                    <div>P: {rev.owner ? "✅" : "❌"}</div>
                    <div>G: {rev.sitter ? "✅" : "❌"}</div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" title="Voir le dossier" onClick={() => openSitSheet(sit)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      {isOverdue && (
                        <Button variant="ghost" size="icon" title="Forcer fin" onClick={() => setForceCompleteModal({ open: true, sit })} disabled={forcingComplete && forceCompleteModal.sit?.id === sit.id}>
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
          <DialogDescription>
            {sitters[cancelModal.id]?.id ? "Les deux parties seront notifiées." : "Le propriétaire sera notifié."}
          </DialogDescription>
          <Textarea value={cancelModal.reason} onChange={(e) => setCancelModal(s => ({ ...s, reason: e.target.value }))} placeholder="Motif d'annulation…" rows={3} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelModal({ open: false, id: "", type: "", reason: "" })} disabled={cancelling}>Annuler</Button>
            <Button variant="destructive" onClick={handleCancel} disabled={!cancelModal.reason.trim() || cancelling}>
              {cancelling ? "Annulation…" : "Confirmer l'annulation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sit detail Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="text-lg font-semibold">
              {selectedSit?.title || "Sans titre"}
            </SheetTitle>
          </SheetHeader>

          {selectedSit && (
            <div className="mt-6 space-y-6">
              {/* Section 1: Récapitulatif */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Récapitulatif</h3>

                <div className="space-y-3">
                  {/* Owner */}
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      {selectedSit.owner?.avatar_url ? (
                        <AvatarImage src={selectedSit.owner.avatar_url} />
                      ) : null}
                      <AvatarFallback><User className="h-4 w-4" /></AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-xs text-muted-foreground">Propriétaire</p>
                      <p className="text-sm font-medium">
                        {selectedSit.owner?.first_name || ","}
                      </p>
                    </div>
                  </div>

                  {/* Sitter */}
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      {sitters[selectedSit.id]?.avatar ? (
                        <AvatarImage src={sitters[selectedSit.id].avatar!} />
                      ) : null}
                      <AvatarFallback><User className="h-4 w-4" /></AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-xs text-muted-foreground">Gardien assigné</p>
                      <p className="text-sm font-medium">
                        {sitters[selectedSit.id]?.name || ","}
                      </p>
                    </div>
                  </div>

                  {/* Dates */}
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Dates</p>
                      <p className="text-sm font-medium">
                        {selectedSit.start_date ? format(new Date(selectedSit.start_date), "d MMM yyyy", { locale: fr }) : ","}
                        {" → "}
                        {selectedSit.end_date ? format(new Date(selectedSit.end_date), "d MMM yyyy", { locale: fr }) : ","}
                      </p>
                    </div>
                  </div>

                  {/* Status + Type */}
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={getTimingStatus(selectedSit).variant}>
                        {getTimingStatus(selectedSit).label}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Section : Statistiques */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Statistiques</h3>
                <div className="grid grid-cols-3 gap-2">
                  <div className="rounded-lg border p-3 text-center">
                    <p className="text-2xl font-semibold">{sheetStats?.view_count ?? ","}</p>
                    <p className="text-xs text-muted-foreground mt-1">Vues</p>
                  </div>
                  <div className="rounded-lg border p-3 text-center">
                    <p className="text-2xl font-semibold">{sheetStats?.message_count ?? ","}</p>
                    <p className="text-xs text-muted-foreground mt-1">Messages</p>
                  </div>
                  <div className="rounded-lg border p-3 text-center">
                    <p className="text-2xl font-semibold">{sheetStats?.conversation_count ?? ","}</p>
                    <p className="text-xs text-muted-foreground mt-1">Conversations</p>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Section 2: Candidatures */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  Candidatures ({sheetApplications.length})
                </h3>

                {sheetAppsLoading ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">Chargement…</p>
                ) : sheetApplications.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">Aucune candidature</p>
                ) : (
                  <div className="space-y-2">
                    {visibleApps.map((app: any) => (
                      <div key={app.id} className="flex items-center justify-between rounded-lg border p-3">
                        <button
                          type="button"
                          onClick={() => app.sitter_id && navigate(`/gardiens/${app.sitter_id}`)}
                          disabled={!app.sitter_id}
                          className="flex items-center gap-3 text-left hover:text-primary transition-colors disabled:cursor-not-allowed disabled:hover:text-foreground"
                          title={app.sitter_id ? "Voir le profil du gardien" : undefined}
                        >
                          <Avatar className="h-7 w-7">
                            {app.sitter?.avatar_url ? (
                              <AvatarImage src={app.sitter.avatar_url} />
                            ) : null}
                            <AvatarFallback className="text-xs"><User className="h-3 w-3" /></AvatarFallback>
                          </Avatar>
                          <span className="text-sm font-medium underline-offset-2 hover:underline">
                            {app.sitter?.first_name || ","}
                          </span>
                        </button>
                        {getStatusBadge(app.status)}
                      </div>
                    ))}

                    {sheetApplications.length > 3 && !showAllApps && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full text-primary"
                        onClick={() => setShowAllApps(true)}
                      >
                        Afficher toutes ({sheetApplications.length})
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    )}
                  </div>
                )}
              </div>

              <Separator />

              {/* Section 3: Actions admin */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Actions</h3>

                {selectedSit.status === "confirmed" && (
                  <Button
                    className="w-full"
                    onClick={() => handleSheetTransition("in_progress")}
                  >
                    Marquer en cours
                  </Button>
                )}

                {selectedSit.status === "in_progress" && (
                  <Button
                    className="w-full"
                    onClick={() => handleSheetTransition("completed")}
                  >
                    Marquer terminée
                  </Button>
                )}

                {selectedSit.status !== "confirmed" && selectedSit.status !== "in_progress" && (
                  <p className="text-sm text-muted-foreground text-center py-2">Aucune action disponible</p>
                )}
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      <AlertDialog
        open={forceCompleteModal.open}
        onOpenChange={(v) => { if (!v && !forcingComplete) setForceCompleteModal({ open: false, sit: null }); }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Forcer la fin de la garde « {forceCompleteModal.sit?.title ?? "sans titre"} » ?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {(() => {
                const s = forceCompleteModal.sit;
                const ownerName = sitters[s?.user_id]?.name ?? null;
                const sitterName = s?.confirmed_sitter_id ? sitters[s.confirmed_sitter_id]?.name ?? null : null;
                const parts: string[] = [];
                if (ownerName) parts.push(`Propriétaire : ${ownerName}`);
                if (sitterName) parts.push(`Gardien : ${sitterName}`);
                return (
                  <>
                    {parts.length > 0 && <span className="block mb-2 text-foreground">{parts.join(" · ")}</span>}
                    Cette action clôt la garde de force en la passant au statut « terminée »,
                    même si les dates ou l'accord des deux parties ne sont pas complets.
                    Elle sera tracée dans le journal d'audit.
                  </>
                );
              })()}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={forcingComplete}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              disabled={forcingComplete}
              onClick={(e) => { e.preventDefault(); if (forceCompleteModal.sit) forceComplete(forceCompleteModal.sit); }}
            >
              {forcingComplete ? "Clôture," : "Confirmer la clôture"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminSitsManagement;
