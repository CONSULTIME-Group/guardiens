import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { format, formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { Eye, EyeOff, Trash2, Search, Sparkles, Share2, Link2, Mail, BarChart3, MessageSquare, Download, ChevronLeft, ChevronRight, Send, Loader2 } from "lucide-react";
import { useMessageAiAssistant, type MessageAiAction } from "@/hooks/useMessageAiAssistant";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useNavigate } from "react-router-dom";
import DraftStatsPanel from "@/components/admin/DraftStatsPanel";
import ListingDrilldownDialog from "@/components/admin/ListingDrilldownDialog";
import ListingProximityCard from "@/components/admin/ListingProximityCard";
import { getCountryName } from "@/lib/countries";

type BadgeVariant = "default" | "secondary" | "outline" | "destructive";
const statusLabels: Record<string, { label: string; variant: BadgeVariant }> = {
  draft: { label: "Brouillon", variant: "outline" },
  published: { label: "En ligne", variant: "default" },
  confirmed: { label: "Confirmée", variant: "secondary" },
  completed: { label: "Terminée", variant: "secondary" },
  cancelled: { label: "Annulée (auteur)", variant: "outline" },
  archived: { label: "Archivée", variant: "secondary" },
};

const resolveStatusBadge = (listing: any): { label: string; variant: BadgeVariant } => {
  if (listing.status === "cancelled") {
    return listing.hidden_by
      ? { label: "Masquée (admin)", variant: "destructive" }
      : { label: "Annulée (auteur)", variant: "outline" };
  }
  return statusLabels[listing.status] || statusLabels.draft;
};

type Stats = {
  views: number;
  uniqueViews: number;
  publicViews: number;
  memberViews: number;
  uniqueMemberViews: number;
  messages: number;
  conversations: number;
  applications: number;
  lastViewAt: string | null;
};

const AdminListings = () => {
  const navigate = useNavigate();
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  // Annonces = vie de la publication. Par défaut : tout ce qui est visible publiquement ou bloqué côté annonce (hors brouillons et hors gardes opérationnelles déjà confirmées)
  const [filterStatus, setFilterStatus] = useState<"published" | "draft" | "cancelled" | "all" | "no_draft" | "to_staff">("published");
  const [filterCity, setFilterCity] = useState("");
  const [stats, setStats] = useState<Record<string, Stats>>({});
  const [cities, setCities] = useState<string[]>([]);
  const [deleteModal, setDeleteModal] = useState<string | null>(null);
  const [hideModal, setHideModal] = useState<string | null>(null);
  const [restoreModal, setRestoreModal] = useState<string | null>(null);

  // KPIs (indépendants des filtres, calculés au montage)
  const [kpis, setKpis] = useState<{ total: number; published: number; draft: number; cancelled: number; archived: number; newLast7d: number } | null>(null);

  // Pagination client-side
  const PAGE_SIZE = 25;
  const [page, setPage] = useState(0);

  // Message rapide au propriétaire
  const [messageModal, setMessageModal] = useState<{ open: boolean; listing: any | null; content: string }>({ open: false, listing: null, content: "" });
  const [sendingMessage, setSendingMessage] = useState(false);
  const messageAi = useMessageAiAssistant({
    getBody: () => messageModal.content,
    setBody: (next) => setMessageModal((m) => ({ ...m, content: next.slice(0, 2000) })),
  });
  const messageAiButtons: Array<{ action: MessageAiAction; label: string }> = [
    { action: "warmer", label: "Reformuler" },
    { action: "proofread", label: "Corriger" },
    { action: "shorten", label: "Raccourcir" },
  ];

  // Envoi de l'annonce aux gardiens du coin
  const [proximityListing, setProximityListing] = useState<any | null>(null);

  // Traffic sheet
  const [trafficOpen, setTrafficOpen] = useState(false);
  const [trafficListing, setTrafficListing] = useState<any | null>(null);
  const [trafficSources, setTrafficSources] = useState<Array<{ referrer_host: string; hits: number; last_hit_at: string }>>([]);
  const [trafficLoading, setTrafficLoading] = useState(false);

  // Drill-down (candidatures + conversations + messages)
  const [drillOpen, setDrillOpen] = useState(false);
  const [drillSit, setDrillSit] = useState<{ id: string; title: string | null } | null>(null);
  const [drillTab, setDrillTab] = useState<"applications" | "conversations">("applications");
  const openDrill = (listing: any, tab: "applications" | "conversations") => {
    setDrillSit({ id: listing.id, title: listing.title });
    setDrillTab(tab);
    setDrillOpen(true);
  };

  const fetchListings = useCallback(async () => {
    setLoading(true);
    let q = supabase
      .from("sits")
      .select(`*, owner:profiles!sits_user_id_fkey(first_name, last_name, city, avatar_url)`)
      .order("created_at", { ascending: false })
      .limit(2000);
    if (filterStatus === "no_draft") {
      q = q.neq("status", "draft" as any);
    } else if (filterStatus === "to_staff") {
      q = q.eq("status", "published" as any);
    } else if (filterStatus !== "all") {
      q = q.eq("status", filterStatus as any);
    }
    const { data, error } = await q;
    if (error) toast.error("Erreur de chargement");
    else {
      setListings(data || []);
      const uniqueCities = [...new Set((data || []).map((l: any) => l.owner?.city).filter(Boolean))];
      setCities(uniqueCities as string[]);
    }
    setLoading(false);
  }, [filterStatus]);

  useEffect(() => { fetchListings(); }, [fetchListings]);

  // KPI counts (indépendants des filtres, calculés au montage)
  useEffect(() => {
    (async () => {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const [totalRes, pubRes, draftRes, cancRes, archRes, newRes] = await Promise.all([
        supabase.from("sits").select("id", { count: "exact", head: true }),
        supabase.from("sits").select("id", { count: "exact", head: true }).eq("status", "published" as any),
        supabase.from("sits").select("id", { count: "exact", head: true }).eq("status", "draft" as any),
        supabase.from("sits").select("id", { count: "exact", head: true }).eq("status", "cancelled" as any),
        supabase.from("sits").select("id", { count: "exact", head: true }).eq("status", "archived" as any),
        supabase.from("sits").select("id", { count: "exact", head: true }).gte("created_at", sevenDaysAgo),
      ]);
      setKpis({
        total: totalRes.count ?? 0,
        published: pubRes.count ?? 0,
        draft: draftRes.count ?? 0,
        cancelled: cancRes.count ?? 0,
        archived: archRes.count ?? 0,
        newLast7d: newRes.count ?? 0,
      });
    })();
  }, []);

  // Reset pagination quand le contexte de filtrage change
  useEffect(() => { setPage(0); }, [filterStatus, search, filterCity]);


  // Batch stats : vues, vues uniques, msg, conversations, candidatures, dernière vue
  useEffect(() => {
    if (!listings.length) { setStats({}); return; }
    const ids = listings.map((l) => l.id);
    supabase.rpc("admin_get_listings_stats" as any, { p_sit_ids: ids }).then(({ data, error }) => {
      if (error) { console.error("admin_get_listings_stats:", error); return; }
      const map: Record<string, Stats> = {};
      (data as any[] || []).forEach((r) => {
        map[r.sit_id] = {
          views: Number(r.view_count) || 0,
          uniqueViews: Number(r.unique_view_count) || 0,
          publicViews: Number(r.public_view_count) || 0,
          memberViews: Number(r.member_view_count) || 0,
          uniqueMemberViews: Number(r.unique_member_view_count) || 0,
          messages: Number(r.message_count) || 0,
          conversations: Number(r.conversation_count) || 0,
          applications: Number(r.application_count) || 0,
          lastViewAt: r.last_view_at,
        };
      });
      setStats(map);
    });
  }, [listings]);

  const openTraffic = async (listing: any) => {
    setTrafficListing(listing);
    setTrafficOpen(true);
    setTrafficLoading(true);
    setTrafficSources([]);
    const { data, error } = await supabase.rpc("admin_get_listing_traffic_sources" as any, { p_sit_id: listing.id, p_limit: 20 });
    if (error) console.error("admin_get_listing_traffic_sources:", error);
    setTrafficSources((data as any[]) || []);
    setTrafficLoading(false);
  };

  const handleHide = async (id: string) => {
    const { data: userRes } = await supabase.auth.getUser();
    const adminId = userRes?.user?.id;
    const { error } = await supabase
      .from("sits")
      .update({ status: "cancelled" as any, hidden_by: adminId ?? null, hidden_at: new Date().toISOString() } as any)
      .eq("id", id);
    if (error) {
      toast.error("Erreur : " + error.message);
      return;
    }
    const listing = listings.find(l => l.id === id);
    try {
      if (listing?.user_id) {
        await supabase.from("notifications").insert({
          user_id: listing.user_id, type: "listing_hidden",
          title: "Annonce masquée par l'admin",
          body: `Votre annonce "${listing.title || "Sans titre"}" a été masquée de la recherche par un administrateur.`,
          link: `/sits/${id}`,
        });
      }
    } catch (e) {
      console.error("notify owner hide:", e);
    }
    try {
      if (adminId) {
        await supabase.from("admin_action_logs").insert({
          admin_id: adminId, action: "hide_listing", target_type: "sit", target_id: id,
        } as any);
      }
    } catch (e) {
      console.error("admin_action_logs hide:", e);
    }
    toast.success("Annonce masquée"); setHideModal(null); fetchListings();
  };

  const handleRestore = async (id: string) => {
    const { data: userRes } = await supabase.auth.getUser();
    const adminId = userRes?.user?.id;
    const { error } = await supabase
      .from("sits")
      .update({ status: "published" as any, hidden_by: null, hidden_at: null } as any)
      .eq("id", id);
    if (error) {
      toast.error("Erreur : " + error.message);
      return;
    }
    try {
      if (adminId) {
        await supabase.from("admin_action_logs").insert({
          admin_id: adminId, action: "restore_listing", target_type: "sit", target_id: id,
        } as any);
      }
    } catch (e) {
      console.error("admin_action_logs restore:", e);
    }
    toast.success("Annonce remise en ligne"); setRestoreModal(null); fetchListings();
  };

  const handleDelete = async (id: string) => {
    const listing = listings.find(l => l.id === id);
    try {
      const { data, error } = await supabase.functions.invoke("admin-delete-listing", {
        body: {
          listingId: id,
          listingType: "sits",
          ownerUserId: listing?.user_id ?? null,
          listingTitle: listing?.title ?? "Sans titre",
        },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "suppression impossible");
      toast.success("Annonce supprimée");
      setDeleteModal(null);
      setListings(prev => prev.filter(l => l.id !== id));
      await fetchListings();
    } catch (err: any) {
      toast.error("Erreur : " + (err?.message || "suppression impossible"));
      setDeleteModal(null);
    }
  };

  const filtered = listings.filter((l) => {
    if (search && !l.title?.toLowerCase().includes(search.toLowerCase()) && !l.owner?.first_name?.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterCity && filterCity !== "all_cities" && l.owner?.city !== filterCity) return false;
    if (filterStatus === "to_staff") {
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const apps = stats[l.id]?.applications || 0;
      const notPast = !l.end_date || new Date(l.end_date) >= today;
      if (apps !== 0 || !notPast) return false;
    }
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages - 1);
  const paginated = filtered.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);

  const handleExportCsv = () => {
    const header = ["Titre", "Proprio", "Ville", "Pays", "Début", "Fin", "Statut", "Vues", "Uniques", "Messages", "Candidatures", "Dernière vue"];
    const esc = (v: any) => {
      const s = v == null ? "" : String(v);
      return `"${s.replace(/"/g, '""')}"`;
    };
    const rows = filtered.map((l) => {
      const st = stats[l.id];
      const owner = `${l.owner?.first_name || ""} ${l.owner?.last_name || ""}`.trim();
      return [
        l.title || "Sans titre",
        owner,
        l.owner?.city || "",
        l.country ? getCountryName(l.country) : "",
        l.start_date ? format(new Date(l.start_date), "yyyy-MM-dd") : "",
        l.end_date ? format(new Date(l.end_date), "yyyy-MM-dd") : "",
        resolveStatusBadge(l).label,
        st?.views ?? 0,
        st?.uniqueViews ?? 0,
        st?.messages ?? 0,
        st?.applications ?? 0,
        st?.lastViewAt ? format(new Date(st.lastViewAt), "yyyy-MM-dd HH:mm") : "",
      ].map(esc).join(",");
    });
    const csv = "\uFEFF" + [header.map(esc).join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `annonces-${format(new Date(), "yyyy-MM-dd")}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleSendMessage = async () => {
    const content = messageModal.content.trim();
    const target = messageModal.listing;
    if (!content || !target?.user_id) {
      toast.error("Le message ne peut pas être vide");
      return;
    }
    setSendingMessage(true);
    const { data, error } = await supabase.rpc("admin_send_message_to_user", {
      p_target_user_id: target.user_id,
      p_content: content,
    });
    setSendingMessage(false);
    if (error) {
      try {
        await supabase.rpc("admin_log_message_failure", {
          p_target_user_id: target.user_id,
          p_content: content,
          p_error_message: error.message || "Erreur inconnue",
        });
      } catch { /* noop */ }
      toast.error(error.message || "Erreur lors de l'envoi");
      return;
    }
    toast.success("Message envoyé");
    const convId = data as string;
    setMessageModal({ open: false, listing: null, content: "" });
    if (convId) navigate(`/messages?conversation=${convId}`);
  };


  const buildShareData = (listing: any) => {
    const url = `https://guardiens.fr/annonces/${listing.id}`;
    const title = listing.title || "Une annonce de garde sur Guardiens";
    const text = `${title}${listing.owner?.city ? `, ${listing.owner.city}` : ""} : découvrez cette annonce sur Guardiens.`;
    return { url, title, text };
  };
  const withShareTracking = (url: string, channel: "twitter" | "facebook" | "whatsapp" | "email") => {
    const tracked = new URL(url);
    tracked.searchParams.set("utm_source", channel === "twitter" ? "twitter" : channel);
    tracked.searchParams.set("utm_medium", "share");
    tracked.searchParams.set("utm_campaign", "admin_listing_share");
    return tracked.toString();
  };
  const handleCopyLink = async (listing: any) => {
    const { url } = buildShareData(listing);
    try { await navigator.clipboard.writeText(url); toast.success("Lien copié"); }
    catch { toast.error("Impossible de copier le lien"); }
  };
  const handleNativeShare = async (listing: any) => {
    const data = buildShareData(listing);
    if (typeof navigator !== "undefined" && (navigator as any).share) {
      try { await (navigator as any).share(data); } catch {}
    } else handleCopyLink(listing);
  };
  const openShareWindow = (url: string) => window.open(url, "_blank", "noopener,noreferrer,width=600,height=600");
  const handleShareTo = (listing: any, channel: "twitter" | "facebook" | "whatsapp" | "email") => {
    const data = buildShareData(listing);
    const encodedUrl = encodeURIComponent(withShareTracking(data.url, channel));
    const encodedText = encodeURIComponent(data.text);
    switch (channel) {
      case "twitter": openShareWindow(`https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`); break;
      case "facebook": openShareWindow(`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`); break;
      case "whatsapp": openShareWindow(`https://wa.me/?text=${encodedText}%20${encodedUrl}`); break;
      case "email": window.location.href = `mailto:?subject=${encodeURIComponent(data.title)}&body=${encodedText}%0A%0A${encodedUrl}`; break;
    }
  };

  // Totaux d'en-tête — cohérents avec les annonces affichées (filtered)
  const totalViews = filtered.reduce((a, l) => a + (stats[l.id]?.views || 0), 0);
  const totalUniques = filtered.reduce((a, l) => a + (stats[l.id]?.uniqueViews || 0), 0);
  const totalMsg = filtered.reduce((a, l) => a + (stats[l.id]?.messages || 0), 0);
  const totalApps = filtered.reduce((a, l) => a + (stats[l.id]?.applications || 0), 0);
  const lastViewGlobal = filtered
    .map((l) => stats[l.id]?.lastViewAt)
    .filter(Boolean)
    .sort()
    .pop() as string | undefined;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight">Annonces</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Vie de la publication : visibilité, trafic, candidatures. Annonces publiées, brouillons et masquées.
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Pour le suivi opérationnel post-acceptation (confirmed, completed, cancelled), consultez l'onglet{' '}
            <button
              onClick={() => navigate('/admin/sits-management')}
              className="font-medium text-foreground underline hover:text-primary transition-colors"
            >
              Gardes
            </button>.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleExportCsv} disabled={filtered.length === 0}>
          <Download className="h-4 w-4 mr-2" />
          Exporter CSV
        </Button>
      </div>

      {/* KPI banner */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: "Total annonces", value: kpis?.total },
          { label: "En ligne", value: kpis?.published },
          { label: "Brouillons", value: kpis?.draft },
          { label: "Masquées / annulées", value: kpis?.cancelled },
          { label: "Archivées", value: kpis?.archived },
          { label: "Nouvelles 7 jours", value: kpis?.newLast7d },
        ].map((k) => (
          <Card key={k.label}>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{k.label}</p>
              <p className="text-2xl font-bold text-foreground mt-1">
                {k.value === undefined ? "–" : k.value.toLocaleString("fr-FR")}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <DraftStatsPanel />

      <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Rechercher titre ou proprio…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as any)}>
          <SelectTrigger className="w-[220px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="published">En ligne (par défaut)</SelectItem>
            <SelectItem value="to_staff">À staffer (0 candidature)</SelectItem>
            <SelectItem value="draft">Brouillons</SelectItem>
            <SelectItem value="cancelled">Masquées / annulées</SelectItem>
            <SelectItem value="no_draft">Tout sauf brouillons</SelectItem>
            <SelectItem value="all">Tous statuts</SelectItem>
          </SelectContent>
        </Select>
        {cities.length > 0 && (
          <Select value={filterCity} onValueChange={setFilterCity}>
            <SelectTrigger className="w-[160px]"><SelectValue placeholder="Ville" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all_cities">Toutes villes</SelectItem>
              {cities.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
      </div>


      <div className="space-y-2">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="font-medium">Totaux sur les annonces affichées :</span>
          {listings.length >= 2000 && (
            <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
              Vue limitée aux 2000 annonces les plus récentes, les totaux sont partiels
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          <Badge variant="secondary">{filtered.length} annonce{filtered.length > 1 ? "s" : ""}</Badge>
          <Badge variant="outline">{totalViews} vues</Badge>
          <Badge variant="outline">{totalUniques} uniques</Badge>
          <Badge variant="outline">{totalMsg} msg</Badge>
          <Badge variant="outline">{totalApps} candidatures</Badge>
          {lastViewGlobal && (
            <Badge variant="outline">
              Dernière vue {formatDistanceToNow(new Date(lastViewGlobal), { addSuffix: true, locale: fr })}
            </Badge>
          )}
        </div>
      </div>

      <div className="rounded-lg border bg-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Titre</TableHead>
              <TableHead>Proprio</TableHead>
              <TableHead>Ville</TableHead>
              <TableHead>Dates</TableHead>
              <TableHead className="text-right" title="Vues totales (public + membres)">Vues</TableHead>
              <TableHead className="text-right" title="Visiteurs uniques (par session/membre)">Uniques</TableHead>
              <TableHead className="text-right">Msg</TableHead>
              <TableHead className="text-right">Cand.</TableHead>
              <TableHead>Dernière vue</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={11} className="text-center py-8 text-muted-foreground">Chargement…</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={11} className="text-center py-8 text-muted-foreground">Aucune annonce</TableCell></TableRow>
            ) : paginated.map((listing) => {
              const s = resolveStatusBadge(listing);
              const st = stats[listing.id];
              const isAdminHidden = listing.status === "cancelled" && !!listing.hidden_by;
              const isAuthorCancelled = listing.status === "cancelled" && !listing.hidden_by;
              return (
                <TableRow key={listing.id}>
                  <TableCell className="font-medium max-w-[200px] truncate">{listing.title || "Sans titre"}</TableCell>
                  <TableCell className="text-sm">
                    <div className="flex items-center gap-2">
                      {listing.owner?.avatar_url && <img src={listing.owner.avatar_url} className="w-6 h-6 rounded-full object-cover" />}
                      <span>{listing.owner?.first_name} {listing.owner?.last_name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <span>{listing.owner?.city || ","}</span>
                      {listing.country && listing.country !== "FR" && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">{getCountryName(listing.country)}</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                    {listing.start_date ? format(new Date(listing.start_date), "d MMM", { locale: fr }) : ","}
                    {" → "}
                    {listing.end_date ? format(new Date(listing.end_date), "d MMM yy", { locale: fr }) : ","}
                  </TableCell>
                  <TableCell className="text-right text-sm font-medium tabular-nums">{st?.views ?? ","}</TableCell>
                  <TableCell className="text-right text-sm text-muted-foreground tabular-nums">{st?.uniqueViews ?? ","}</TableCell>
                  <TableCell className="text-right text-sm tabular-nums">
                    {st && st.messages > 0 ? (
                      <button
                        onClick={() => openDrill(listing, "conversations")}
                        className="font-medium text-foreground hover:text-primary hover:underline"
                        title="Voir les conversations et lire les messages"
                      >
                        {st.messages}
                      </button>
                    ) : (
                      <span className="text-muted-foreground">{st?.messages ?? ","}</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right text-sm tabular-nums">
                    {st && st.applications > 0 ? (
                      <button
                        onClick={() => openDrill(listing, "applications")}
                        className="font-medium text-foreground hover:text-primary hover:underline"
                        title="Voir les candidats"
                      >
                        {st.applications}
                      </button>
                    ) : (
                      <span className="text-muted-foreground">{st?.applications ?? ","}</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                    {st?.lastViewAt ? formatDistanceToNow(new Date(st.lastViewAt), { addSuffix: true, locale: fr }) : ","}
                  </TableCell>
                  <TableCell><Badge variant={s.variant}>{s.label}</Badge></TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" title="Sources de trafic" aria-label="Sources de trafic" onClick={() => openTraffic(listing)}>
                        <BarChart3 className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" title="Voir l'annonce" aria-label="Voir l'annonce" onClick={() => navigate(`/sits/${listing.id}`)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Message au propriétaire"
                        aria-label="Message au propriétaire"
                        onClick={() => setMessageModal({ open: true, listing, content: "" })}
                        disabled={!listing.user_id}
                      >
                        <MessageSquare className="h-4 w-4" />
                      </Button>
                      {listing.status === "published" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Envoyer aux gardiens du coin"
                          aria-label="Envoyer aux gardiens du coin"
                          onClick={() => setProximityListing(listing)}
                        >
                          <Send className="h-4 w-4" />
                        </Button>
                      )}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" title="Partager" aria-label="Partager">
                            <Share2 className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56">
                          <DropdownMenuLabel className="text-xs text-muted-foreground">Partager cette annonce</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onSelect={() => handleCopyLink(listing)}><Link2 className="h-4 w-4 mr-2" /> Copier le lien</DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => handleNativeShare(listing)}><Share2 className="h-4 w-4 mr-2" /> Partage rapide…</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onSelect={() => handleShareTo(listing, "facebook")}>Facebook</DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => handleShareTo(listing, "twitter")}>X (Twitter)</DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => handleShareTo(listing, "whatsapp")}>WhatsApp</DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => handleShareTo(listing, "email")}><Mail className="h-4 w-4 mr-2" /> E-mail</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                      {isAdminHidden ? (
                        <Button variant="ghost" size="icon" title="Remettre en ligne" aria-label="Remettre en ligne" onClick={() => setRestoreModal(listing.id)}>
                          <Sparkles className="h-4 w-4 text-primary" />
                        </Button>
                      ) : isAuthorCancelled ? null : (
                        <Button variant="ghost" size="icon" title="Masquer" aria-label="Masquer l'annonce" onClick={() => setHideModal(listing.id)}>
                          <EyeOff className="h-4 w-4" />
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" title="Supprimer" aria-label="Supprimer l'annonce" onClick={() => setDeleteModal(listing.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {filtered.length > 0 && (
        <div className="flex items-center justify-between gap-3 text-sm text-muted-foreground">
          <span>
            {filtered.length.toLocaleString("fr-FR")} annonce{filtered.length > 1 ? "s" : ""} · page {currentPage + 1}/{totalPages}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={currentPage === 0}
              aria-label="Page précédente"
            >
              <ChevronLeft className="h-4 w-4 mr-1" /> Précédent
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={currentPage >= totalPages - 1}
              aria-label="Page suivante"
            >
              Suivant <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}


      {/* Traffic sheet */}
      <Sheet open={trafficOpen} onOpenChange={setTrafficOpen}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="text-base">
              {trafficListing?.title || "Annonce"}
            </SheetTitle>
            <p className="text-xs text-muted-foreground">
              {trafficListing?.owner?.first_name} {trafficListing?.owner?.last_name} · {trafficListing?.owner?.city || ","}
            </p>
          </SheetHeader>

          {trafficListing && stats[trafficListing.id] && (
            <div className="grid grid-cols-3 gap-2 my-4">
              <div className="rounded-md border p-3 text-center">
                <div className="text-xl font-semibold tabular-nums">{stats[trafficListing.id].views}</div>
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground mt-1">Vues</div>
              </div>
              <div className="rounded-md border p-3 text-center">
                <div className="text-xl font-semibold tabular-nums">{stats[trafficListing.id].uniqueViews}</div>
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground mt-1">Uniques</div>
              </div>
              <div className="rounded-md border p-3 text-center">
                <div className="text-xl font-semibold tabular-nums">{stats[trafficListing.id].publicViews}</div>
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground mt-1">Public</div>
              </div>
              <div className="rounded-md border p-3 text-center">
                <div className="text-xl font-semibold tabular-nums">{stats[trafficListing.id].memberViews}</div>
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground mt-1">Membres</div>
              </div>
              <div className="rounded-md border p-3 text-center">
                <div className="text-xl font-semibold tabular-nums">{stats[trafficListing.id].messages}</div>
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground mt-1">Messages</div>
              </div>
              <div className="rounded-md border p-3 text-center">
                <div className="text-xl font-semibold tabular-nums">{stats[trafficListing.id].applications}</div>
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground mt-1">Candidatures</div>
              </div>
              <div className="rounded-md border p-3 text-center">
                <div className="text-xl font-semibold tabular-nums">
                  {stats[trafficListing.id].views > 0
                    ? Math.round((stats[trafficListing.id].applications / stats[trafficListing.id].views) * 100)
                    : 0}%
                </div>
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground mt-1">Cand./Vues</div>
              </div>
            </div>
          )}

          <Separator />

          <div className="mt-4">
            <h4 className="text-sm font-semibold mb-2">Sources de trafic</h4>
            <p className="text-xs text-muted-foreground mb-3">
              D'où viennent les visiteurs de cette annonce (referrer HTTP).
            </p>
            {trafficLoading ? (
              <p className="text-sm text-muted-foreground">Chargement…</p>
            ) : trafficSources.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucune vue enregistrée.</p>
            ) : (
              <ul className="space-y-1.5">
                {trafficSources.map((s) => (
                  <li key={s.referrer_host} className="flex items-center justify-between gap-2 text-sm border-b border-border/50 pb-1.5">
                    <span className="truncate font-mono text-xs">{s.referrer_host}</span>
                    <span className="flex items-center gap-3 shrink-0">
                      <span className="tabular-nums font-medium">{s.hits}</span>
                      <span className="text-[11px] text-muted-foreground tabular-nums">
                        {formatDistanceToNow(new Date(s.last_hit_at), { addSuffix: true, locale: fr })}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="mt-6">
            <Button variant="outline" size="sm" className="w-full" onClick={() => trafficListing && navigate(`/sits/${trafficListing.id}`)}>
              Ouvrir l'annonce publique
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Hide confirmation */}
      <Dialog open={!!hideModal} onOpenChange={(o) => !o && setHideModal(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Masquer cette annonce ?</DialogTitle></DialogHeader>
          <DialogDescription>L'annonce sera retirée de la recherche. Le propriétaire sera notifié.</DialogDescription>
          <DialogFooter>
            <Button variant="outline" onClick={() => setHideModal(null)}>Annuler</Button>
            <Button variant="destructive" onClick={() => hideModal && handleHide(hideModal)}>Masquer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Restore confirmation */}
      <Dialog open={!!restoreModal} onOpenChange={(o) => !o && setRestoreModal(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Remettre cette annonce en ligne ?</DialogTitle></DialogHeader>
          <DialogDescription>L'annonce redeviendra visible dans la recherche.</DialogDescription>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRestoreModal(null)}>Annuler</Button>
            <Button onClick={() => restoreModal && handleRestore(restoreModal)}>Remettre en ligne</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={!!deleteModal} onOpenChange={(o) => !o && setDeleteModal(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Supprimer cette annonce ?</DialogTitle></DialogHeader>
          <DialogDescription>
            {deleteModal && (stats[deleteModal]?.applications || 0) > 0
              ? `Cette annonce a ${stats[deleteModal].applications} candidature${stats[deleteModal].applications > 1 ? "s" : ""}. Elles seront supprimées avec l'annonce. Cette action est irréversible.`
              : "Cette action est irréversible. Le propriétaire sera notifié."}
          </DialogDescription>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteModal(null)}>Annuler</Button>
            <Button variant="destructive" onClick={() => deleteModal && handleDelete(deleteModal)}>Supprimer définitivement</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Drill-down candidatures / conversations / messages */}
      <ListingDrilldownDialog
        open={drillOpen}
        onOpenChange={setDrillOpen}
        sitId={drillSit?.id ?? null}
        sitTitle={drillSit?.title ?? null}
        initialTab={drillTab}
      />

      {/* Message rapide au propriétaire */}
      <Dialog
        open={messageModal.open}
        onOpenChange={(o) => !o && !sendingMessage && setMessageModal({ open: false, listing: null, content: "" })}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Message au propriétaire
              {messageModal.listing?.owner?.first_name ? ` , ${messageModal.listing.owner.first_name}` : ""}
            </DialogTitle>
          </DialogHeader>
          <DialogDescription>
            Le message sera envoyé en votre nom dans la messagerie du propriétaire de l'annonce
            {messageModal.listing?.title ? ` « ${messageModal.listing.title} »` : ""}.
          </DialogDescription>
          <div className="space-y-2">
            <Textarea
              placeholder="Votre message…"
              value={messageModal.content}
              onChange={(e) => setMessageModal((m) => ({ ...m, content: e.target.value }))}
              rows={6}
              maxLength={2000}
              disabled={sendingMessage || messageAi.isLoading}
            />
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
                <Sparkles className="h-3 w-3 text-primary" /> Assistant IA :
              </span>
              {messageAiButtons.map((b) => (
                <Button
                  key={b.action}
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  disabled={sendingMessage || messageAi.isLoading}
                  onClick={() => messageAi.run(b.action)}
                >
                  {messageAi.loading === b.action ? (
                    <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />
                  ) : null}
                  {b.label}
                </Button>
              ))}
            </div>
            <div className="text-xs text-muted-foreground text-right">
              {messageModal.content.length}/2000
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setMessageModal({ open: false, listing: null, content: "" })}
              disabled={sendingMessage}
            >
              Annuler
            </Button>
            <Button onClick={handleSendMessage} disabled={sendingMessage || !messageModal.content.trim()}>
              {sendingMessage ? "Envoi…" : "Envoyer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Envoi de l'annonce aux gardiens du coin */}
      <Dialog open={!!proximityListing} onOpenChange={(o) => !o && setProximityListing(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              Envoyer aux gardiens du coin
              {proximityListing?.title ? ` , ${proximityListing.title}` : ""}
            </DialogTitle>
            <DialogDescription>
              Un email personnalisé par gardien, jamais de copie groupée. Aperçu obligatoire avant tout envoi.
            </DialogDescription>
          </DialogHeader>
          {proximityListing && (
            <ListingProximityCard
              sitId={proximityListing.id}
              initialRadiusKm={30}
              autoPreview
              hideHeader
            />
          )}
        </DialogContent>
      </Dialog>
    </div>

  );
};

export default AdminListings;
