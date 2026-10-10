import { ListingExitsSection } from "@/components/admin/ListingExitsSection";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { useState, useEffect, useCallback, useRef } from "react";
import { refreshAdminBadges } from "@/hooks/useAdminBadges";
import { fetchAllRows } from "@/lib/admin/fetchAllRows";
import { createSeqGuard } from "@/lib/admin/requestSeq";
import { canDeleteListing, canHideListing, deleteCountsSentence, hideListingUpdate, restoreListingUpdate, type DeleteCounts } from "@/lib/admin/listingActions";
import { UrlFilterNotice } from "@/components/admin/UrlFilterNotice";
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
import { Eye, EyeOff, Trash2, Search, Sparkles, Share2, Link2, Mail, BarChart3, MessageSquare, Download, ChevronLeft, ChevronRight, Send, Loader2, Image as ImageIcon, MoreHorizontal, Info } from "lucide-react";
import { buildCsv, downloadCsv } from "@/lib/admin/csv";
import { ErrorState } from "@/components/admin/ui";
import DossierDetailSheet from "@/components/admin/DossierDetailSheet";
import { LISTING_FILTERS, LISTING_FILTER_LABELS, listingCity, listingFilterScope, sitDistribution, sitSituation, SIT_BUCKETS_PRIMARY, SIT_BUCKETS_SECONDARY, type ListingFilter, type SitBucket } from "@/lib/admin/listingSituation";
import { useMessageAiAssistant, type MessageAiAction } from "@/hooks/useMessageAiAssistant";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { WriteToMemberDialog, type WriteToMemberTarget } from "./_components/users/WriteToMemberDialog";
import { useNavigate, useSearchParams } from "react-router-dom";
import DraftStatsPanel from "@/components/admin/DraftStatsPanel";
import ListingDrilldownDialog from "@/components/admin/ListingDrilldownDialog";
import ListingProximityCard from "@/components/admin/ListingProximityCard";
import ListingCoverPickerDialog from "@/components/admin/ListingCoverPickerDialog";
import { getCountryName } from "@/lib/countries";
import { avatarImageUrl } from "@/lib/storageImage";
import { resolveSitStatusBadge, type SitStatusBadgeVariant } from "@/lib/sitStatus";
import { unpublishReasonAdminLabel } from "@/lib/unpublishReason";


type BadgeVariant = SitStatusBadgeVariant;

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
  const [writeTarget, setWriteTarget] = useState<WriteToMemberTarget | null>(null);
  const navigate = useNavigate();
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  // Annonces = vie de la publication. Par défaut : tout ce qui est visible publiquement ou bloqué côté annonce (hors brouillons et hors gardes opérationnelles déjà confirmées)
  // ?filter= (statut), ?sit= (une annonce, tout statut), ?owner= (un propriétaire, tout statut).
  const [urlParams, setUrlParams] = useSearchParams();
  const urlFilter = urlParams.get("filter");
  const focusSitId = urlParams.get("sit");
  const focusOwnerId = urlParams.get("owner");
  const [filterStatus, setFilterStatus] = useState<ListingFilter>(() =>
    (LISTING_FILTERS as readonly string[]).includes(urlFilter ?? "") ? (urlFilter as ListingFilter) : "published",
  );
  // Navigation externe (menu latéral) : ?filter= réaligné dans le même rendu.
  const [seenUrlFilter, setSeenUrlFilter] = useState(urlFilter);
  if (seenUrlFilter !== urlFilter) {
    setSeenUrlFilter(urlFilter);
    if ((LISTING_FILTERS as readonly string[]).includes(urlFilter ?? "")) setFilterStatus(urlFilter as ListingFilter);
    // Lot A9 : l'entrée « Annonces » du menu (sans filtre) ouvre la vue « En ligne ».
    else if (!urlFilter) setFilterStatus("published");
  }
  const [statsReady, setStatsReady] = useState(false);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [listingsTruncated, setListingsTruncated] = useState(false);
  const listingsSeq = useRef(createSeqGuard());
  const clearFocus = () => {
    const next = new URLSearchParams(urlParams);
    next.delete("sit");
    next.delete("owner");
    setUrlParams(next, { replace: true });
  };
  const [filterCity, setFilterCity] = useState("");
  const [stats, setStats] = useState<Record<string, Stats>>({});
  const [cities, setCities] = useState<string[]>([]);
  const [deleteModal, setDeleteModal] = useState<string | null>(null);
  const [hideModal, setHideModal] = useState<string | null>(null);
  const [restoreModal, setRestoreModal] = useState<string | null>(null);

  // Répartition complète (indépendante des filtres), rechargée après chaque action.
  const [kpis, setKpis] = useState<{ total: number; counts: Record<SitBucket, number>; newLast7d: number } | null>(null);
  const [kpisError, setKpisError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [statsNonce, setStatsNonce] = useState(0);
  const [detailListing, setDetailListing] = useState<any | null>(null);

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

  // Sélecteur de photo de couverture (choix explicite administrateur)
  const [coverListing, setCoverListing] = useState<any | null>(null);
  // URLs de photos d'animaux (galerie animals_life + table pets), pour le repère visuel
  const [animalPhotoUrls, setAnimalPhotoUrls] = useState<Set<string>>(new Set());

  const fetchListings = useCallback(async () => {
    const token = listingsSeq.current.next();
    setLoading(true);
    const build = () => {
      let q = supabase
        .from("sits")
        .select(`*, owner:profiles!sits_user_id_fkey(first_name, last_name, city, avatar_url)`)
        .order("created_at", { ascending: false })
        .order("id", { ascending: true });
      if (focusSitId) return q.eq("id", focusSitId);
      if (focusOwnerId) return q.eq("user_id", focusOwnerId);
      const scope = listingFilterScope(filterStatus);
      if (scope.status) q = q.eq("status", scope.status as any);
      if (scope.statusIn) q = q.in("status", scope.statusIn as any);
      if (scope.statusNeq) q = q.neq("status", scope.statusNeq as any);
      if (scope.unpublished === "null") q = q.is("unpublished_at", null);
      if (scope.unpublished === "not_null") q = q.not("unpublished_at", "is", null);
      if (scope.hiddenBy === "null") q = q.is("hidden_by", null);
      if (scope.hiddenBy === "not_null") q = q.not("hidden_by", "is", null);
      return q;
    };
    let data: any[] | null = null;
    let error: unknown = null;
    try {
      const res = await fetchAllRows<any>((from, to) => build().range(from, to));
      data = res.rows;
      if (listingsSeq.current.isCurrent(token)) setListingsTruncated(res.truncated);
    } catch (e) {
      error = e;
    }
    if (!listingsSeq.current.isCurrent(token)) return;
    if (error) {
      // Jamais les annonces d'un filtre précédent présentées comme le résultat actuel.
      setListings([]);
      setCities([]);
      setLoadError((error as any)?.message || "lecture refusée");
    } else {
      setLoadError(null);
      setListings(data || []);
      const uniqueCities = [...new Set((data || []).map((l: any) => listingCity(l).city).filter(Boolean))];
      setCities((uniqueCities as string[]).sort((x, y) => x.localeCompare(y, "fr")));
    }
    setLoading(false);
  }, [filterStatus, focusSitId, focusOwnerId]);

  useEffect(() => { fetchListings(); }, [fetchListings]);

  // Repère visuel : couverture absente ou couverture montrant un animal
  useEffect(() => {
    if (!listings.length) { setAnimalPhotoUrls(new Set()); return; }
    let cancelled = false;
    (async () => {
      const ownerIds = [...new Set(listings.map((l: any) => l.user_id).filter(Boolean))];
      const propertyIds = [...new Set(listings.map((l: any) => l.property_id).filter(Boolean))];
      const [galleryRes, petsRes] = await Promise.all([
        ownerIds.length
          ? supabase.from("owner_gallery").select("photo_url").eq("category", "animals_life" as any).in("user_id", ownerIds)
          : Promise.resolve({ data: [] } as any),
        propertyIds.length
          ? supabase.from("pets").select("photo_url").in("property_id", propertyIds)
          : Promise.resolve({ data: [] } as any),
      ]);
      if (cancelled) return;
      const urls = new Set<string>();
      for (const row of [...(((galleryRes as any).data as any[]) || []), ...(((petsRes as any).data as any[]) || [])]) {
        if (row?.photo_url) urls.add(row.photo_url as string);
      }
      setAnimalPhotoUrls(urls);
    })();
    return () => { cancelled = true; };
  }, [listings]);



  // Répartition complète : chaque annonce dans exactement une case.
  const loadKpis = useCallback(async () => {
    setKpisError(null);
    try {
      const { rows } = await fetchAllRows<any>((from, to) =>
        supabase.from("sits").select("id, status, unpublished_at, hidden_by, created_at")
          .order("created_at", { ascending: false }).order("id", { ascending: true }).range(from, to),
      );
      const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      const d = sitDistribution(rows);
      setKpis({ ...d, newLast7d: rows.filter((r) => r.created_at && new Date(r.created_at).getTime() >= weekAgo).length });
    } catch (e: any) {
      setKpis(null);
      setKpisError(e?.message || "lecture refusée");
    }
  }, []);
  useEffect(() => { loadKpis(); }, [loadKpis]);
  const refreshAfterAction = () => { fetchListings(); loadKpis(); refreshAdminBadges(); };

  // Reset pagination quand le contexte de filtrage change
  useEffect(() => { setPage(0); }, [filterStatus, search, filterCity]);


  // Batch stats : vues, vues uniques, msg, conversations, candidatures, dernière vue
  useEffect(() => {
    setStatsReady(false);
    setStatsError(null);
    setStats({});
    if (!listings.length) { setStats({}); setStatsReady(true); return; }
    let cancelled = false;
    const ids = listings.map((l) => l.id);
    supabase.rpc("admin_get_listings_stats" as any, { p_sit_ids: ids }).then(({ data, error }) => {
      if (cancelled) return;
      if (error) {
        console.error("admin_get_listings_stats:", error);
        setStats({});
        setStatsError("Statistiques des annonces indisponibles : le filtre « Sans candidature » et les compteurs ne sont pas affichés.");
        return;
      }
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
      setStatsReady(true);
    });
    return () => { cancelled = true; };
  }, [listings, statsNonce]);

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
    const listing = listings.find(l => l.id === id);
    if (!listing || !canHideListing(listing.status)) {
      toast.error("Seule une annonce en ligne ou un brouillon peut être masqué.");
      setHideModal(null);
      return;
    }
    const { error } = await supabase
      .from("sits")
      .update(hideListingUpdate(listing.status, adminId ?? null, new Date().toISOString()) as any)
      .eq("id", id);
    if (error) {
      toast.error("Erreur : " + error.message);
      return;
    }
    let notifyFailed = false;
    if (listing.user_id) {
      const { error: nErr } = await supabase.from("notifications").insert({
        user_id: listing.user_id, type: "listing_hidden",
        title: "Annonce masquée par l'équipe",
        body: `Votre annonce "${listing.title || "Sans titre"}" est masquée de la recherche par l'équipe Guardiens.`,
        link: `/sits/${id}`,
      });
      if (nErr) { notifyFailed = true; console.error("notify owner hide:", nErr); toast.error(`Annonce masquée, mais le propriétaire n'a pas été notifié : ${nErr.message}`); }
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
    if (!notifyFailed) toast.success("Annonce masquée, propriétaire notifié"); setHideModal(null); refreshAfterAction();
  };

  const handleRestore = async (id: string) => {
    const { data: userRes } = await supabase.auth.getUser();
    const adminId = userRes?.user?.id;
    const listing = listings.find(l => l.id === id);
    const { error } = await supabase
      .from("sits")
      .update(restoreListingUpdate(listing ?? {}) as any)
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
    toast.success("Annonce remise en ligne"); setRestoreModal(null); refreshAfterAction();
  };

  const [deleteCounts, setDeleteCounts] = useState<DeleteCounts | null>(null);
  const [deleteCountsError, setDeleteCountsError] = useState<string | null>(null);
  useEffect(() => {
    setDeleteCounts(null);
    setDeleteCountsError(null);
    if (!deleteModal) return;
    let stale = false;
    supabase.rpc("admin_listing_delete_counts" as any, { p_sit_id: deleteModal }).then(({ data, error }) => {
      if (stale) return;
      if (error) { setDeleteCountsError(error.message); return; }
      const d = (data ?? {}) as Partial<DeleteCounts>;
      setDeleteCounts({ applications: Number(d.applications) || 0, messages: Number(d.messages) || 0, reviews: Number(d.reviews) || 0, badges: Number(d.badges) || 0 });
    });
    return () => { stale = true; };
  }, [deleteModal]);

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
      refreshAdminBadges();
      setDeleteModal(null);
      setListings(prev => prev.filter(l => l.id !== id));
      await fetchListings();
      loadKpis();
    } catch (err: any) {
      toast.error("Erreur : " + (err?.message || "suppression impossible"));
      setDeleteModal(null);
    }
  };

  const filtered = listings.filter((l) => {
    if (search && !l.title?.toLowerCase().includes(search.toLowerCase()) && !l.owner?.first_name?.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterCity && filterCity !== "all_cities" && listingCity(l).city !== filterCity) return false;
    if (filterStatus === "to_staff" && !focusSitId && !focusOwnerId) {
      // Sans statistiques chargées, on ne sait pas : on n'affiche pas l'annonce.
      if (!stats[l.id]) return false;
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const apps = stats[l.id].applications;
      const notPast = !l.end_date || new Date(l.end_date) >= today;
      if (apps !== 0 || !notPast) return false;
    }
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages - 1);
  const paginated = filtered.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);

  const handleExportCsv = () => {
    const header = ["Titre", "Propriétaire", "Ville", "Source de la ville", "Pays", "Début", "Fin", "Situation", "Précision", "Vues", "Membres uniques", "Messages", "Candidatures", "Dernière vue", "Retirée le", "Motif du retrait"];
    // Statistiques indisponibles : cellule vide, jamais zéro.
    const n = (v: number | undefined) => (v === undefined ? "" : v);
    const rows = filtered.map((l) => {
      const st = stats[l.id];
      const owner = `${l.owner?.first_name || ""} ${l.owner?.last_name || ""}`.trim();
      const city = listingCity(l);
      const sit = sitSituation(l);
      return [
        l.title || "Sans titre",
        owner,
        city.city ?? "",
        city.city ? (city.fromOwner ? "Profil du propriétaire" : "Annonce") : "",
        l.country ? getCountryName(l.country) : "",
        l.start_date ? format(new Date(l.start_date), "yyyy-MM-dd") : "",
        l.end_date ? format(new Date(l.end_date), "yyyy-MM-dd") : "",
        sit.label,
        sit.detail ?? "",
        n(st?.views), n(st?.uniqueViews), n(st?.messages), n(st?.applications),
        st?.lastViewAt ? format(new Date(st.lastViewAt), "yyyy-MM-dd HH:mm") : "",
        l.unpublished_at ? format(new Date(l.unpublished_at), "d MMMM yyyy", { locale: fr }) : "",
        l.unpublished_at ? unpublishReasonAdminLabel(l.last_unpublished_reason) : "",
      ];
    });
    downloadCsv(buildCsv(header, rows), `annonces-${format(new Date(), "yyyy-MM-dd")}.csv`);
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

  // Totaux d'en-tête, cohérents avec les annonces affichées (filtered)
  // Statistiques absentes ou en échec : aucun total, jamais un zéro.
  const statsOk = statsReady && !statsError;
  const sumStat = (k: "views" | "uniqueViews" | "messages" | "applications"): number | null =>
    statsOk ? filtered.reduce((a, l) => a + (stats[l.id]?.[k] ?? 0), 0) : null;
  const statShown = (v: number | null) => v === null ? (statsError ? "Indisponible" : "…") : String(v);
  const totalViews = statShown(sumStat("views"));
  const totalUniques = statShown(sumStat("uniqueViews"));
  const totalMsg = statShown(sumStat("messages"));
  const totalApps = statShown(sumStat("applications"));
  const countUnknown = filterStatus === "to_staff" && !focusSitId && !focusOwnerId && !statsOk;
  const lastViewGlobal = filtered
    .map((l) => stats[l.id]?.lastViewAt)
    .filter(Boolean)
    .sort()
    .pop() as string | undefined;

  return (
    <div className="space-y-6">
      <AdminPageHeader title="Annonces" description="Vie de la publication : visibilité, trafic et candidatures." />
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 -mt-3">
        <div>
          <p className="text-sm text-muted-foreground">
            Le suivi après acceptation (gardes confirmées, terminées ou annulées) se trouve dans l'onglet{' '}
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

      {/* Répartition complète : la somme des cases égale le total. */}
      {kpisError ? (
        <ErrorState detail={`Répartition des annonces : ${kpisError}`} onRetry={loadKpis} />
      ) : (
        <div className="space-y-2">
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
            {[
              { label: "Total annonces", value: kpis?.total },
              ...SIT_BUCKETS_PRIMARY.map((b) => ({ label: b.label, value: kpis?.counts[b.key] })),
              { label: "Créées ces 7 jours", value: kpis?.newLast7d },
            ].map((k) => (
              <Card key={k.label}>
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground">{k.label}</p>
                  <p className="text-2xl font-bold text-foreground mt-1">
                    {k.value === undefined ? "·" : k.value.toLocaleString("fr-FR")}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
          {kpis && (
            <details className="rounded-lg border bg-card px-4 py-2 text-sm">
              <summary className="cursor-pointer text-muted-foreground">
                Autres états : {SIT_BUCKETS_SECONDARY.reduce((sum, b) => sum + kpis.counts[b.key], 0).toLocaleString("fr-FR")} annonces
              </summary>
              <ul className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1">
                {SIT_BUCKETS_SECONDARY.filter((b) => b.key !== "unknown" || kpis.counts.unknown > 0).map((b) => (
                  <li key={b.key} className="flex justify-between gap-2">
                    <span className="text-muted-foreground">{b.label}</span>
                    <span className="font-medium tabular-nums">{kpis.counts[b.key]}</span>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}

      <DraftStatsPanel />
      <ListingExitsSection />

      {(focusSitId || focusOwnerId) && (
        <UrlFilterNotice
          label={focusSitId ? "Annonce ciblée, tous statuts confondus" : "Annonces de ce propriétaire, tous statuts confondus"}
          notFound={!loading && listings.length === 0}
          notFoundText={focusSitId ? "Aucune annonce ne correspond à cet identifiant." : "Aucune annonce pour ce propriétaire."}
          onClear={clearFocus}
        />
      )}
      {statsError && <ErrorState detail={statsError} onRetry={() => setStatsNonce((n) => n + 1)} />}
      {loadError && <ErrorState detail={`Liste des annonces : ${loadError}`} onRetry={fetchListings} />}
      {filterStatus === "to_staff" && !statsReady && !statsError && listings.length > 0 && (
        <p role="status" className="text-sm text-muted-foreground">Chargement des candidatures…</p>
      )}

      <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Rechercher titre ou proprio…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={filterStatus} onValueChange={(v) => {
          setFilterStatus(v as ListingFilter);
          setPage(0);
          const next = new URLSearchParams(urlParams);
          next.set("filter", v);
          setUrlParams(next, { replace: true });
        }}>
          <SelectTrigger className="w-[260px]" aria-label="Situation"><SelectValue /></SelectTrigger>
          <SelectContent>
            {LISTING_FILTERS.map((f) => <SelectItem key={f} value={f}>{LISTING_FILTER_LABELS[f]}</SelectItem>)}
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
          {listingsTruncated && (
            <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
              Vue limitée aux 50 000 annonces les plus récentes, les totaux sont partiels
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          <Badge variant="secondary">{countUnknown ? (statsError ? "Nombre indisponible" : "Nombre en chargement") : `${filtered.length} annonce${filtered.length > 1 ? "s" : ""}`}</Badge>
          <Badge variant="outline">Vues : {totalViews}</Badge>
          <Badge variant="outline">Membres uniques, somme par annonce (une personne peut compter plusieurs fois) : {totalUniques}</Badge>
          <Badge variant="outline">Messages, somme : {totalMsg}</Badge>
          <Badge variant="outline">Candidatures : {totalApps}</Badge>
          {lastViewGlobal && (
            <Badge variant="outline">
              Dernière vue {formatDistanceToNow(new Date(lastViewGlobal), { addSuffix: true, locale: fr })}
            </Badge>
          )}
        </div>
      </div>

      <div className="rounded-lg border bg-card overflow-x-auto">
        <Table className="table-fixed min-w-[900px]">
          <colgroup>
            <col className="w-[30%]" /><col className="w-[17%]" /><col className="w-[19%]" />
            <col className="w-[9%]" /><col className="w-[6%]" /><col className="w-[260px]" />
          </colgroup>
          <TableHeader>
            <TableRow>
              <TableHead>Annonce</TableHead>
              <TableHead>Lieu et dates</TableHead>
              <TableHead>Situation</TableHead>
              <TableHead className="text-right">Candidatures</TableHead>
              <TableHead className="text-right" title="Vues totales (public + membres)">Vues</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Chargement…</TableCell></TableRow>
            ) : loadError ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-destructive">Indisponible</TableCell></TableRow>
            ) : countUnknown ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">{statsError ? "Indisponible, candidatures non lues" : "Chargement des candidatures…"}</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Aucune annonce</TableCell></TableRow>
            ) : paginated.map((listing) => {
              const sit = sitSituation(listing);
              const st = stats[listing.id];
              const city = listingCity(listing);
              const isAdminHidden = listing.status === "cancelled" && !!listing.hidden_by;
              const coverUrl = (listing as any).cover_photo_url as string | null;
              const coverNotPlace = !coverUrl || animalPhotoUrls.has(coverUrl);
              const ownerName = `${listing.owner?.first_name || ""} ${listing.owner?.last_name || ""}`.trim();
              const contact = () => setWriteTarget({ userId: listing.user_id, userName: ownerName || "ce membre", sitId: listing.id });
              return (
                <TableRow key={listing.id}>
                  <TableCell className="min-w-0">
                    <div className="flex items-center gap-2 min-w-0">
                      {coverNotPlace && (
                        <span
                          className="h-2 w-2 shrink-0 rounded-full bg-warning"
                          title={coverUrl ? "Couverture montrant un animal" : "Aucune couverture définie"}
                          aria-label={coverUrl ? "Couverture montrant un animal" : "Aucune couverture définie"}
                        />
                      )}
                      <span className="font-medium line-clamp-2">{listing.title || "Sans titre"}</span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5 text-xs text-muted-foreground">
                      {listing.owner?.avatar_url && <img src={avatarImageUrl(listing.owner.avatar_url, 24)} alt="" className="w-4 h-4 rounded-full object-cover" />}
                      <span className="truncate">{ownerName || "Propriétaire non renseigné"}</span>
                    </div>
                    {st && !statsError ? (
                      <Button variant="link" onClick={() => openDrill(listing, "conversations")} className="h-auto justify-start p-0 mt-1 text-xs">
                        {st.messages} message{st.messages !== 1 ? "s" : ""}
                      </Button>
                    ) : (
                      <p className="mt-1 text-xs text-muted-foreground">{statsError ? "Messages indisponibles" : "Lecture des messages en cours…"}</p>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span>{city.city || "·"}</span>
                      {city.fromOwner && <span className="text-[10px]" title="L'annonce ne précise pas de ville : ville du profil du propriétaire">(profil)</span>}
                      {listing.country && listing.country !== "FR" && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">{getCountryName(listing.country)}</Badge>
                      )}
                    </div>
                    <div className="text-xs whitespace-nowrap">
                    {listing.start_date ? format(new Date(listing.start_date), "d MMM", { locale: fr }) : "·"}
                    {" au "}
                    {listing.end_date ? format(new Date(listing.end_date), "d MMM yy", { locale: fr }) : "·"}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={sit.tone}>{sit.label}</Badge>
                    {sit.detail && <p className="text-[11px] text-muted-foreground mt-0.5">{sit.detail}</p>}
                  </TableCell>
                  <TableCell className="text-right text-sm tabular-nums">
                    {st && st.applications > 0 ? (
                      <button onClick={() => openDrill(listing, "applications")} className="font-medium text-foreground hover:text-primary hover:underline" title="Voir les candidats">
                        {st.applications}
                      </button>
                    ) : (
                      <span className="text-muted-foreground">{st ? st.applications : statsError ? "Indisponible" : "·"}</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right text-sm tabular-nums">{st?.views ?? "·"}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end items-center gap-1 whitespace-nowrap">
                      <Button variant="outline" size="sm" onClick={() => setDetailListing(listing)}>
                        <Info className="h-4 w-4 mr-1" /> Détails
                      </Button>
                      <Button variant="ghost" size="sm" disabled={!listing.user_id} onClick={contact}>
                        <Mail className="h-4 w-4 mr-1" /> Contacter
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" aria-label="Autres actions" title="Autres actions">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-60">
                          <DropdownMenuItem onSelect={() => navigate(`/sits/${listing.id}`)}><Eye className="h-4 w-4 mr-2" /> Voir l'annonce publique</DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => openTraffic(listing)}><BarChart3 className="h-4 w-4 mr-2" /> Sources de trafic</DropdownMenuItem>
                          {st && st.messages > 0 && (
                            <DropdownMenuItem onSelect={() => openDrill(listing, "conversations")}><MessageSquare className="h-4 w-4 mr-2" /> Conversations ({st.messages} messages)</DropdownMenuItem>
                          )}
                          <DropdownMenuItem onSelect={() => setCoverListing(listing)}><ImageIcon className="h-4 w-4 mr-2" /> Photo de couverture</DropdownMenuItem>
                          <DropdownMenuItem disabled={!listing.user_id} onSelect={() => setMessageModal({ open: true, listing, content: "" })}><MessageSquare className="h-4 w-4 mr-2" /> Message rapide au propriétaire</DropdownMenuItem>
                          {listing.status === "published" && (
                            <DropdownMenuItem onSelect={() => setProximityListing(listing)}><Send className="h-4 w-4 mr-2" /> Envoyer aux gardiens du coin</DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuLabel className="text-xs text-muted-foreground">Partager</DropdownMenuLabel>
                          <DropdownMenuItem onSelect={() => handleCopyLink(listing)}><Link2 className="h-4 w-4 mr-2" /> Copier le lien</DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => handleNativeShare(listing)}><Share2 className="h-4 w-4 mr-2" /> Partage rapide</DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => handleShareTo(listing, "facebook")}>Facebook</DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => handleShareTo(listing, "twitter")}>X (Twitter)</DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => handleShareTo(listing, "whatsapp")}>WhatsApp</DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => handleShareTo(listing, "email")}><Mail className="h-4 w-4 mr-2" /> E-mail</DropdownMenuItem>
                          {(isAdminHidden || canHideListing(listing.status) || canDeleteListing(listing.status)) && <DropdownMenuSeparator />}
                          {isAdminHidden ? (
                            <DropdownMenuItem onSelect={() => setRestoreModal(listing.id)}><Sparkles className="h-4 w-4 mr-2" /> Remettre en ligne</DropdownMenuItem>
                          ) : canHideListing(listing.status) ? (
                            <DropdownMenuItem onSelect={() => setHideModal(listing.id)}><EyeOff className="h-4 w-4 mr-2" /> Masquer l'annonce</DropdownMenuItem>
                          ) : null}
                          {canDeleteListing(listing.status) && (
                            <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={() => setDeleteModal(listing.id)}>
                              <Trash2 className="h-4 w-4 mr-2" /> Supprimer l'annonce
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <DossierDetailSheet
        kind="sit"
        item={detailListing}
        open={!!detailListing}
        onOpenChange={(o) => { if (!o) setDetailListing(null); }}
        extra={detailListing ? (
          <p className="text-sm text-muted-foreground">
            {stats[detailListing.id]
              ? `${stats[detailListing.id].views} vues, ${stats[detailListing.id].uniqueViews} membres connectés distincts, ${stats[detailListing.id].messages} messages dans ${stats[detailListing.id].conversations} conversations.`
              : "Statistiques de trafic indisponibles."}
          </p>
        ) : null}
        footer={detailListing ? (
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => navigate(`/sits/${detailListing.id}`)}>Voir l'annonce publique</Button>
            {detailListing.user_id && <Button size="sm" variant="ghost" onClick={() => navigate(`/admin/users?user=${detailListing.user_id}`)}>Fiche du membre</Button>}
          </div>
        ) : null}
      />

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
              {trafficListing?.owner?.first_name} {trafficListing?.owner?.last_name} · {trafficListing?.owner?.city || "·"}
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
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground mt-1" title="Nombre de membres connectés distincts ayant vu l'annonce (chemins /sits et /annonces, identifiant et slug). Les visiteurs non connectés ne sont pas comptés, aucun identifiant de séance n'étant enregistré.">Membres uniques</div>
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
          <DialogDescription>
            {(() => {
              const l = listings.find((x) => x.id === restoreModal);
              return l?.status_before_hidden === "draft"
                ? "L'annonce retrouve son statut d'avant masquage : brouillon."
                : "L'annonce retrouve son statut d'avant masquage et redevient visible dans la recherche.";
            })()}
          </DialogDescription>
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
            {deleteCountsError
              ? `Décompte indisponible : ${deleteCountsError}`
              : deleteCounts
                ? `${deleteCountsSentence(deleteCounts)} Action irréversible, le propriétaire est notifié.`
                : "Décompte en cours…"}
          </DialogDescription>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteModal(null)}>Annuler</Button>
            <Button variant="destructive" disabled={!deleteCounts} onClick={() => deleteModal && handleDelete(deleteModal)}>Supprimer définitivement</Button>
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

      {/* Photo de couverture (choix explicite administrateur) */}
      <ListingCoverPickerDialog
        open={!!coverListing}
        onOpenChange={(o) => !o && setCoverListing(null)}
        sitId={coverListing?.id ?? null}
        sitTitle={coverListing?.title ?? null}
        ownerId={coverListing?.user_id ?? null}
        propertyId={coverListing?.property_id ?? null}
        currentCover={(coverListing as any)?.cover_photo_url ?? null}
        onSaved={(sitId, url) => {
          setListings((prev) => prev.map((l: any) => (l.id === sitId ? { ...l, cover_photo_url: url } : l)));
          setCoverListing((prev: any) => (prev && prev.id === sitId ? { ...prev, cover_photo_url: url } : prev));
        }}
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
        <DialogContent className="max-w-3xl p-0 gap-0 max-h-[95vh] sm:max-h-[85vh] flex flex-col overflow-hidden">
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-border shrink-0">
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
              onClose={() => setProximityListing(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      <WriteToMemberDialog target={writeTarget} onClose={() => setWriteTarget(null)} />
    </div>

  );
};

export default AdminListings;
