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
import { Eye, EyeOff, Trash2, Search, Sparkles, Share2, Link2, Mail, BarChart3, MessageSquare, Download, ChevronLeft, ChevronRight, Send, Loader2, Image as ImageIcon, MoreHorizontal, ExternalLink, UserRound } from "lucide-react";
import { listingLiveUrl } from "@/lib/admin/listingRowLinks";
import { buildCsv, downloadCsv } from "@/lib/admin/csv";
import { ErrorState } from "@/components/admin/ui";
import { loadDraftFollowups, draftReminderLabel, type DraftFollowup } from "@/lib/admin/draftFollowup";
import { draftReadiness, loadOwnerDraftContexts, parisToday, type OwnerDraftContext } from "@/lib/admin/draftReadiness";
import { useIsMobile } from "@/hooks/use-mobile";
import { LISTING_FILTERS, LISTING_FILTER_LABELS, LISTING_FILTER_MENU, listingCity, listingFilterScope, sitDistribution, sitSituation, SIT_BUCKETS_PRIMARY, SIT_BUCKETS_SECONDARY, type ListingFilter, type SitBucket } from "@/lib/admin/listingSituation";
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
import DraftReminderConversionPanel from "@/components/admin/DraftReminderConversionPanel";
import ListingDrilldownDialog from "@/components/admin/ListingDrilldownDialog";
import ListingProximityCard from "@/components/admin/ListingProximityCard";
import { OwnerAbsenceBadge } from "@/components/admin/OwnerAbsenceBadge";
import ListingCoverPickerDialog from "@/components/admin/ListingCoverPickerDialog";
import { getCountryName } from "@/lib/countries";
import { avatarImageUrl } from "@/lib/storageImage";
import { resolveSitStatusBadge, type SitStatusBadgeVariant } from "@/lib/sitStatus";
import { unpublishReasonAdminLabel } from "@/lib/unpublishReason";
import { calendarDate } from "@/lib/calendarDate";
import { isListingToStaff } from "@/lib/admin/listingToStaff";
import { compareUrgency, listingUrgency, matchesCounter, URGENCY_COUNTERS, type Urgency, type UrgencyInput } from "@/lib/admin/listingUrgency";
import { memberMessageDrafts, type MemberDraftTopic } from "@/lib/admin/memberMessageDrafts";
import { isPastDay } from "@/lib/calendarDate";
import { isListingStartedWaiting } from "@/lib/admin/listingStartedWaiting";
import { LISTING_SORT_LABELS, compareListings, effectiveSortKey, sortOptionsFor, sortScopeOf, type ListingSortKey } from "@/lib/admin/listingSort";
import { draftSummaryHead, draftSummaryParts, summarizeDrafts } from "@/lib/admin/draftSummary";
import { useAuth } from "@/contexts/AuthContext";
import { isNewListing, readNewsVisitSince } from "@/hooks/useAdminNews";


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
  // Lot ADM3 : publier à la place du propriétaire un brouillon complet.
  const [publishModal, setPublishModal] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);

  // Répartition complète (indépendante des filtres), rechargée après chaque action.
  const [kpis, setKpis] = useState<{ total: number; counts: Record<SitBucket, number>; newLast7d: number } | null>(null);
  const [kpisError, setKpisError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [statsNonce, setStatsNonce] = useState(0);
  // Lot ADM19 : date depuis laquelle une annonce compte comme « Nouvelle » (fin de la visite précédente), lue avant que l'ouverture de la page ne pose le repère.
  const { user: adminUser } = useAuth();
  const [newSince] = useState<string | null>(() => (adminUser?.id ? readNewsVisitSince("listings", adminUser.id) : null));

  // Pagination client-side
  const PAGE_SIZE = 25;
  const isMobile = useIsMobile();
  const [page, setPage] = useState(0);


  // Envoi de l'annonce aux gardiens du coin
  const [proximityListing, setProximityListing] = useState<any | null>(null);

  // Traffic sheet
  const [trafficOpen, setTrafficOpen] = useState(false);
  const [trafficListing, setTrafficListing] = useState<any | null>(null);
  // Lot ADM16 (lot A A3) : sources en échec dites, jamais « aucune source ».
  const [trafficError, setTrafficError] = useState(false);
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
        .select(`*, owner:profiles!sits_user_id_fkey(first_name, last_name, city, avatar_url, last_seen_at)`)
        .order("created_at", { ascending: false })
        .order("id", { ascending: true });
      if (focusSitId) return q.eq("id", focusSitId);
      if (focusOwnerId) return q.eq("user_id", focusOwnerId);
      const scope = listingFilterScope(filterStatus);
      if (scope.status) q = q.eq("status", scope.status as any);
      if (scope.statusIn) q = q.in("status", scope.statusIn as any);
      if (scope.statusNeq) q = q.neq("status", scope.statusNeq as any);
      if (scope.publishedSinceDays) q = q.gte("published_at", new Date(Date.now() - scope.publishedSinceDays * 86400_000).toISOString());
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

  // Lot ADM3 : contexte propriétaire (logement, photos, animaux) des brouillons
  // affichés, pour juger « prêt à publier » avec la règle du formulaire.
  const [draftFocus, setDraftFocus] = useState("all");
  const [draftFollowups, setDraftFollowups] = useState<Map<string, DraftFollowup> | null>(null);
  const [draftFollowupError, setDraftFollowupError] = useState(false);
  const [draftCtx, setDraftCtx] = useState<Map<string, OwnerDraftContext> | null>(null);
  const [draftCtxError, setDraftCtxError] = useState<string | null>(null);
  useEffect(() => {
    const owners = listings.filter((l: any) => l.status === "draft").map((l: any) => l.user_id).filter(Boolean);
    if (!owners.length) { setDraftCtx(new Map()); setDraftCtxError(null); return; }
    let cancelled = false;
    setDraftCtx(null);
    loadOwnerDraftContexts(supabase, owners)
      .then((m) => { if (!cancelled) { setDraftCtx(m); setDraftCtxError(null); } })
      .catch((e) => { if (!cancelled) { setDraftCtx(new Map()); setDraftCtxError(e?.message || "lecture refusée"); } });
    return () => { cancelled = true; };
  }, [listings]);
  useEffect(() => {
    let cancelled = false;
    setDraftFollowups(null); setDraftFollowupError(false);
    loadDraftFollowups(supabase, listings.filter(l => l.status === "draft" && !l.published_at))
      .then(rows => { if (!cancelled) setDraftFollowups(rows); })
      .catch(() => { if (!cancelled) setDraftFollowupError(true); });
    return () => { cancelled = true; };
  }, [listings]);
  const today = parisToday();
  const isReady = (l: any) => !!draftCtx && !draftCtxError && draftReadiness(l, draftCtx.get(l.user_id), today).ready;

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
        setStatsError("Statistiques des annonces indisponibles : le filtre « Sans candidature depuis 48 h » et les compteurs ne sont pas affichés.");
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

  // Lot ANN-1 : candidatures qui attendent une réponse, et la plus ancienne, par annonce.
  const [waiting, setWaiting] = useState<Record<string, { count: number; oldest: string | null }> | null>(null);
  useEffect(() => {
    setWaiting(null);
    const ids = listings.filter((l) => l.status === "published").map((l) => l.id);
    if (!ids.length) { setWaiting({}); return; }
    let cancelled = false;
    supabase.rpc("admin_get_listings_waiting" as any, { p_sit_ids: ids }).then(({ data, error }) => {
      if (cancelled) return;
      if (error) { console.error("admin_get_listings_waiting:", error); setWaiting({}); return; }
      const map: Record<string, { count: number; oldest: string | null }> = {};
      (data as any[] || []).forEach((r) => { map[r.sit_id] = { count: Number(r.waiting_count) || 0, oldest: r.oldest_waiting_at ?? null }; });
      setWaiting(map);
    });
    return () => { cancelled = true; };
  }, [listings, statsNonce]);
  // Lot ANN-6 : choix de tri mémorisé par périmètre ; sans choix, le défaut du filtre.
  const [sortPick, setSortPick] = useState<{ scope: string; key: ListingSortKey } | null>(null);
  const urgencyInput = (l: any): UrgencyInput | null => {
    const st = stats[l.id];
    if (!st || !waiting) return null;
    return { ...l, activeApplications: st.applications, waiting: waiting[l.id]?.count ?? 0, oldestWaitingAt: waiting[l.id]?.oldest ?? null };
  };
  const urgencyOf = (l: any): Urgency | null => {
    const input = urgencyInput(l);
    return input ? listingUrgency(input) : null;
  };

  const openTraffic = async (listing: any) => {
    setTrafficListing(listing);
    setTrafficOpen(true);
    setTrafficLoading(true);
    setTrafficSources([]);
    setTrafficError(false);
    const { data, error } = await supabase.rpc("admin_get_listing_traffic_sources" as any, { p_sit_id: listing.id, p_limit: 20 });
    if (error) {
      console.error("admin_get_listing_traffic_sources:", error);
      setTrafficError(true);
    }
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

  const handlePublishOnBehalf = async (id: string) => {
    const listing = listings.find((l) => l.id === id);
    if (!listing || !isReady(listing)) {
      toast.error("Ce brouillon n'est plus prêt à publier. Rechargez la liste.");
      setPublishModal(null);
      return;
    }
    setPublishing(true);
    const { data: userRes } = await supabase.auth.getUser();
    const adminId = userRes?.user?.id ?? null;
    const { data: updated, error } = await supabase
      .from("sits")
      .update({ status: "published" } as any)
      .eq("id", id)
      .eq("status", "draft")
      .is("unpublished_at", null)
      .select("id, published_at");
    setPublishing(false);
    if (error) {
      // Message des garde-fous de la base (photo, ville, description) affiché tel quel.
      toast.error(`Publication refusée : ${error.message}`);
      return;
    }
    if (!updated || updated.length === 0) {
      toast.error("Publication non effectuée : le brouillon a changé entre-temps.");
      setPublishModal(null);
      refreshAfterAction();
      return;
    }
    if (adminId) {
      const { error: logErr } = await supabase.from("admin_action_logs").insert({
        admin_id: adminId, action: "publish_on_behalf", target_type: "sit", target_id: id,
        metadata: { title: listing.title ?? null, owner_id: listing.user_id ?? null },
      } as any);
      if (logErr) console.error("admin_action_logs publish_on_behalf:", logErr);
    }
    toast.success("Annonce publiée. Prévenez le propriétaire.");
    setPublishModal(null);
    refreshAfterAction();
    if (listing.user_id) {
      const ownerName = `${listing.owner?.first_name || ""}`.trim();
      setWriteTarget({ userId: listing.user_id, userName: ownerName || "le propriétaire", sitId: id });
    }
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
    if (filterStatus === "preparing" && draftFocus !== "all" && !focusSitId && !focusOwnerId) {
      const past = !!l.start_date && l.start_date < today;
      if (draftFocus === "past" && !past) return false;
      if (draftFocus === "published" && !draftFollowups?.get(l.id)?.ownerHasPublished) return false;
      if (draftFocus === "resume" && (past || !draftFollowups?.has(l.id) || draftFollowups.get(l.id)!.ownerHasPublished)) return false;
    }
    if (search && !l.title?.toLowerCase().includes(search.toLowerCase()) && !l.owner?.first_name?.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterCity && filterCity !== "all_cities" && listingCity(l).city !== filterCity) return false;
    if (filterStatus === "ready" && !focusSitId && !focusOwnerId && !isReady(l)) return false;
    if (filterStatus === "to_staff" && !focusSitId && !focusOwnerId) {
      // Sans statistiques chargées, on ne sait pas : on n'affiche pas l'annonce.
      if (!stats[l.id]) return false;
      // Lot ADM12 : même règle que la pastille (admin_menu_badges) et le signal
      // (detect_stale_sits) : en ligne depuis 48 h, départ à venir, aucune
      // candidature active.
      if (!isListingToStaff({ ...l, activeApplications: stats[l.id].applications })) return false;
    }
    // Lot ANN-1 : compteurs en tête de page, mêmes règles que les phrases du jour.
    if ((filterStatus === "waiting_long" || filterStatus === "departure_soon") && !focusSitId && !focusOwnerId) {
      const input = urgencyInput(l);
      if (!input || !matchesCounter(filterStatus, listingUrgency(input), input)) return false;
    }
    // Lot VE-5 : annonces dont des candidats attendent une réponse, garde à venir (tuile de la vue d'ensemble).
    if (filterStatus === "awaiting_reply" && !focusSitId && !focusOwnerId) {
      if (!stats[l.id]) return false;
      if (!(stats[l.id].applications > 0) || (l.start_date && isPastDay(l.start_date))) return false;
    }
    // Lot ADM20 : garde commencée, candidats toujours en attente (même règle que la liste de travail).
    if (filterStatus === "started_waiting" && !focusSitId && !focusOwnerId) {
      if (!stats[l.id]) return false;
      if (!isListingStartedWaiting({ ...l, activeApplications: stats[l.id].applications })) return false;
    }
    return true;
  });

  // Lot ANN-1 : les annonces en ligne se rangent par urgence (rang, départ, attente).
  const urgencyReady = !!waiting && statsReady && !statsError;
  const PUBLISHED_SCOPE = ["published", "waiting_long", "departure_soon", "to_staff", "awaiting_reply", "started_waiting"];
  const inPublishedScope = PUBLISHED_SCOPE.includes(filterStatus);
  // Lot ANN-6 : le tri se choisit sur tous les filtres ; l'urgence reste réservée aux annonces en ligne.
  const sortScope = sortScopeOf(filterStatus, inPublishedScope);
  const sortKey = effectiveSortKey(sortPick, filterStatus, inPublishedScope);
  if (!focusSitId && !focusOwnerId) {
    if (sortKey === "urgency") {
      if (urgencyReady) filtered.sort((a, b) => compareUrgency(urgencyOf(a), urgencyOf(b)));
    } else {
      filtered.sort((a, b) => compareListings(sortKey, a, b));
    }
  }
  const counterCounts = inPublishedScope && urgencyReady && !focusSitId && !focusOwnerId
    ? (filterStatus === "published"
      ? Object.fromEntries(URGENCY_COUNTERS.map((c) => [c.filter, listings.filter((l) => { const i = urgencyInput(l); return !!i && matchesCounter(c.filter, listingUrgency(i), i); }).length]))
      : null)
    : null;
  const [lastCounts, setLastCounts] = useState<Record<string, number> | null>(null);
  if (counterCounts && JSON.stringify(counterCounts) !== JSON.stringify(lastCounts)) setLastCounts(counterCounts);
  const shownCounts = counterCounts ?? (inPublishedScope ? lastCounts : null);
  const selectFilter = (v: string) => {
    setFilterStatus(v as ListingFilter);
    setPage(0);
    const next = new URLSearchParams(urlParams);
    next.set("filter", v);
    setUrlParams(next, { replace: true });
  };
  const ownerTopicOf = (u: Urgency | null): MemberDraftTopic | null =>
    !u ? null : u.key === "started" ? "owner_started" : u.gesture === "broadcast" ? "no_applications" : (u.waitingDays !== null ? "owner_waiting" : null);
  const MONTHS_FR = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
  const frDayOf = (d?: string | null) => {
    if (!d) return null;
    const c = calendarDate(d);
    return `${c.getDate() === 1 ? "1er" : c.getDate()} ${MONTHS_FR[c.getMonth()]}`;
  };
  const whenOf = (u: Urgency | null) =>
    u?.daysToStart == null || u.daysToStart < 0 ? null : u.daysToStart === 0 ? "aujourd'hui" : u.daysToStart === 1 ? "demain" : `dans ${u.daysToStart} jours`;
  /** Lot ANN-2 : « Écrire au propriétaire » s'ouvre avec la situation et un texte prêt. */
  const writeOwner = (listing: any) => {
    const u = urgencyOf(listing);
    const topic = ownerTopicOf(u);
    const first = (listing.owner?.first_name ?? "").trim();
    const ownerName = `${listing.owner?.first_name || ""} ${listing.owner?.last_name || ""}`.trim();
    const city = listingCity(listing).city || null;
    const w = waiting?.[listing.id];
    if (!topic) { setWriteTarget({ userId: listing.user_id, userName: ownerName || "ce membre", sitId: listing.id, channel: "message" }); return; }
    const st = stats[listing.id];
    const published = listing.published_at ? Math.floor((Date.now() - Date.parse(listing.published_at)) / 86_400_000) : 0;
    setWriteTarget({
      userId: listing.user_id,
      userName: first || ownerName || "le propriétaire",
      sitId: listing.id,
      channel: "message",
      drafts: memberMessageDrafts(topic, {
        name: first, city, startsWhen: whenOf(u), startedOn: frDayOf(listing.start_date),
        waitingCount: w?.count ?? 0, waitingDays: u?.waitingDays ?? null,
        daysPublished: published, sittersNearby: null,
      }),
      context: {
        lines: [
          `${listing.title || "Annonce sans titre"}${city ? `, ${city}` : ""}${listing.start_date ? `, du ${frDayOf(listing.start_date)}${listing.end_date ? ` au ${frDayOf(listing.end_date)}` : ""}` : ""}.`,
          `${u?.phrase ?? ""}.${st ? ` ${st.views} vues.` : ""}`,
        ],
      },
    });
  };
  /** Lot ANN-2 : écrire à un candidat qui attend, depuis la fenêtre des candidatures. */
  const writeCandidate = (listing: any, c: { sitterId: string; firstName: string }) => {
    const u = urgencyOf(listing);
    setWriteTarget({
      userId: c.sitterId,
      userName: c.firstName || "ce gardien",
      sitId: listing.id,
      channel: "message",
      drafts: memberMessageDrafts("candidate_started", {
        name: c.firstName, city: listingCity(listing).city || null, ownerName: (listing.owner?.first_name ?? "").trim(),
        startedOn: u?.key === "started" ? frDayOf(listing.start_date) : null, startsWhen: whenOf(u),
      }),
      context: { lines: [`Candidature à « ${listing.title || "Annonce sans titre"} ».`, u?.phrase ? `${u.phrase}.` : ""].filter(Boolean) },
    });
  };
  const drillListing = drillSit ? listings.find((l) => l.id === drillSit.id) : null;

  /**
   * Lot ANN-3 (16/11/2026) : un geste conseillé par ligne, puis le menu en
   * trois groupes (Voir, Partager, Modérer). La diffusion n'a qu'un chemin :
   * le bouton quand l'annonce l'appelle, le menu sinon.
   */
  const broadcastShown = (listing: any, urg: Urgency | null, st: Stats | undefined) =>
    listing.status === "published" && (urg?.gesture === "broadcast" || filterStatus === "to_staff" || !!focusSitId || (!!st && !statsError && isListingToStaff({ ...listing, activeApplications: st.applications })));
  const rowActions = (listing: any, urg: Urgency | null, st: Stats | undefined, liveUrl: string | null, isAdminHidden: boolean, ownerFirst: string, variant: "row" | "card") => {
    const card = variant === "card";
    const writePrimary = urg?.gesture === "write_owner";
    const big = card ? "min-h-11 rounded-full flex-1 basis-40" : "";
    return (
      <div className={card ? "flex flex-wrap items-center gap-2" : "flex flex-wrap justify-end items-center gap-1"}>
        {isReady(listing) && (
          <Button size="sm" className={big} onClick={() => setPublishModal(listing.id)} data-testid="publish-on-behalf">
            <Send className="h-4 w-4 mr-1" /> Publier à sa place
          </Button>
        )}
        {broadcastShown(listing, urg, st) && (
          <Button size="sm" className={big} onClick={() => setProximityListing(listing)} data-testid="row-broadcast">
            <Send className="h-4 w-4 mr-1" /> Diffuser l'annonce
          </Button>
        )}
        <Button
          variant={writePrimary ? "default" : card ? "outline" : "ghost"}
          size="sm"
          className={big}
          disabled={!listing.user_id}
          onClick={() => writeOwner(listing)}
          data-testid="row-write-owner"
        >
          <Mail className="h-4 w-4 mr-1" /> {ownerFirst ? `Écrire à ${ownerFirst.split(" ")[0]}` : "Écrire"}
        </Button>
        {card && (<>
          <Button variant="ghost" size="icon" className="h-11 w-11" onClick={() => setCoverListing(listing)} aria-label="Photo de couverture" title="Photo de couverture" data-testid="row-cover-picker">
            <ImageIcon className="h-4 w-4" />
          </Button>
          {liveUrl ? (
            <Button variant="ghost" size="icon" className="h-11 w-11" asChild>
              <a href={liveUrl} target="_blank" rel="noopener noreferrer" aria-label="Voir la version en ligne" title="Voir la version en ligne" data-testid="row-live-link">
                <ExternalLink className="h-4 w-4" />
              </a>
            </Button>
          ) : (
            <Button variant="ghost" size="icon" className="h-11 w-11" disabled aria-label="Annonce pas en ligne" title="Annonce pas en ligne" data-testid="row-live-link">
              <ExternalLink className="h-4 w-4" />
            </Button>
          )}
        </>)}
        {rowMenu(listing, urg, st, isAdminHidden, card ? null : { liveUrl })}
      </div>
    );
  };

  // Lot ANN-6 : sur ordinateur, couverture et version en ligne rejoignent le groupe « Voir » du menu (media non nul).
  const rowMenu = (listing: any, urg: Urgency | null, st: Stats | undefined, isAdminHidden: boolean, media: { liveUrl: string | null } | null = null) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-11 w-11" aria-label="Autres actions" title="Autres actions">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60 max-h-[var(--radix-dropdown-menu-content-available-height)] overflow-y-auto" collisionPadding={8}>
        <DropdownMenuLabel className="text-xs text-muted-foreground">Voir</DropdownMenuLabel>
        <DropdownMenuItem onSelect={() => navigate(`/sits/${listing.id}`)}><Eye className="h-4 w-4 mr-2" /> Vue complète (admin)</DropdownMenuItem>
        {listing.user_id && (
          <DropdownMenuItem onSelect={() => navigate(`/admin/users?user=${listing.user_id}`)}><UserRound className="h-4 w-4 mr-2" /> Fiche du propriétaire</DropdownMenuItem>
        )}
        <DropdownMenuItem onSelect={() => openDrill(listing, "applications")}><MessageSquare className="h-4 w-4 mr-2" /> Candidatures et conversations</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => openTraffic(listing)}><BarChart3 className="h-4 w-4 mr-2" /> Sources de trafic</DropdownMenuItem>
        {media && (<>
          <DropdownMenuItem onSelect={() => setCoverListing(listing)} data-testid="menu-cover-picker"><ImageIcon className="h-4 w-4 mr-2" /> Photo de couverture</DropdownMenuItem>
          {media.liveUrl ? (
            <DropdownMenuItem asChild data-testid="menu-live-link">
              <a href={media.liveUrl} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-4 w-4 mr-2" /> Voir la version en ligne</a>
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem disabled data-testid="menu-live-link"><ExternalLink className="h-4 w-4 mr-2" /> Annonce pas en ligne</DropdownMenuItem>
          )}
        </>)}
        {listing.status === "published" && !broadcastShown(listing, urg, st) && (
          <DropdownMenuItem onSelect={() => setProximityListing(listing)}><Send className="h-4 w-4 mr-2" /> Diffuser aux gardiens du coin</DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-xs text-muted-foreground">Partager</DropdownMenuLabel>
        <DropdownMenuItem onSelect={() => handleCopyLink(listing)}><Link2 className="h-4 w-4 mr-2" /> Copier le lien</DropdownMenuItem>
        {typeof navigator !== "undefined" && typeof navigator.share === "function" && (
          <DropdownMenuItem onSelect={() => handleNativeShare(listing)}><Share2 className="h-4 w-4 mr-2" /> Partage rapide</DropdownMenuItem>
        )}
        <DropdownMenuItem onSelect={() => handleShareTo(listing, "facebook")}><Share2 className="h-4 w-4 mr-2" /> Facebook</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => handleShareTo(listing, "whatsapp")}><Share2 className="h-4 w-4 mr-2" /> WhatsApp</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => handleShareTo(listing, "email")}><Mail className="h-4 w-4 mr-2" /> E-mail</DropdownMenuItem>
        {(isAdminHidden || canHideListing(listing.status) || canDeleteListing(listing.status)) && (<>
          <DropdownMenuSeparator />
          <DropdownMenuLabel className="text-xs text-muted-foreground">Modérer</DropdownMenuLabel>
        </>)}
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
  );
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
        l.start_date ? format(calendarDate(l.start_date), "yyyy-MM-dd") : "",
        l.end_date ? format(calendarDate(l.end_date), "yyyy-MM-dd") : "",
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

      {/* Lot ANN-1 : ce qui demande un geste, en tête de page. */}
      {inPublishedScope && !focusSitId && !focusOwnerId && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5" data-testid="urgency-counters">
          {URGENCY_COUNTERS.map((c) => {
            const n = shownCounts?.[c.filter];
            const on = filterStatus === c.filter;
            const hot = (c.filter === "waiting_long" || c.filter === "departure_soon" || c.filter === "started_waiting") && (n ?? 0) > 0;
            return (
              <button
                key={c.filter}
                type="button"
                aria-pressed={on}
                onClick={() => selectFilter(c.filter)}
                className={`min-h-11 rounded-2xl border bg-card p-4 text-left transition-colors hover:border-primary ${on ? "border-primary ring-1 ring-primary" : "border-border"}`}
              >
                <span className={`block font-heading text-3xl font-bold ${hot ? "text-destructive" : "text-foreground"}`}>{n === undefined ? "·" : n}</span>
                <span className="mt-0.5 block text-sm text-foreground">{c.label}</span>
              </button>
            );
          })}
        </div>
      )}

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

      {(filterStatus === "preparing" || filterStatus === "ready") && !focusSitId && !focusOwnerId && draftCtx && !draftCtxError && (() => {
        const sum = summarizeDrafts(listings, draftCtx, today);
        if (sum.total === 0) return null;
        const parts = draftSummaryParts(sum);
        return (
          <p className="text-sm text-muted-foreground" data-testid="drafts-summary" role="status">
            <strong className="text-foreground">{draftSummaryHead(sum.total)}</strong>
            {parts.length > 0 && <> : {parts.map((p, i) => (
              <span key={p.key}>{i > 0 ? ", " : ""}{p.count} {p.label}</span>
            ))}</>}
            {sum.ready > 0 && filterStatus !== "ready" && (
              <> · <button type="button" className="underline underline-offset-2 text-foreground" onClick={() => selectFilter("ready")} data-testid="drafts-summary-ready">Voir les prêts à publier</button></>
            )}
          </p>
        );
      })()}

      {filterStatus === "preparing" && !focusSitId && !focusOwnerId && <div className="flex items-center gap-3 text-sm">
        <label htmlFor="draft-followup-filter">Brouillons</label>
        <Select disabled={!draftFollowups || draftFollowupError} value={draftFocus} onValueChange={value => { setDraftFocus(value); setPage(0); }}>
          <SelectTrigger id="draft-followup-filter" className="w-[280px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous</SelectItem>
            <SelectItem value="resume">À reprendre, sans publication antérieure</SelectItem>
            <SelectItem value="past">Dates de début dépassées</SelectItem>
            <SelectItem value="published">Propriétaire ayant déjà publié</SelectItem>
          </SelectContent>
        </Select>
        {draftFollowupError && <span className="text-muted-foreground">Suivi des relances indisponible</span>}
      </div>}
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
            {LISTING_FILTER_MENU.map((f) => <SelectItem key={f} value={f}>{LISTING_FILTER_LABELS[f]}</SelectItem>)}
            {!(LISTING_FILTER_MENU as readonly string[]).includes(filterStatus) && (
              <SelectItem value={filterStatus}>{LISTING_FILTER_LABELS[filterStatus]}</SelectItem>
            )}
          </SelectContent>
        </Select>
        <Select value={sortKey} onValueChange={(v) => { setSortPick({ scope: sortScope, key: v as ListingSortKey }); setPage(0); }}>
          <SelectTrigger className="w-[230px]" aria-label="Tri" data-testid="sort-select"><SelectValue /></SelectTrigger>
          <SelectContent>
            {sortOptionsFor(inPublishedScope).map((k) => (
              <SelectItem key={k} value={k}>{LISTING_SORT_LABELS[k]}</SelectItem>
            ))}
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


      {isMobile ? (
        <div className="space-y-3" data-testid="listing-cards">
          {loading ? (
            <p className="text-center py-8 text-muted-foreground">Chargement…</p>
          ) : loadError ? (
            <p className="text-center py-8 text-destructive">Indisponible</p>
          ) : countUnknown ? (
            <p className="text-center py-8 text-muted-foreground">{statsError ? "Indisponible, candidatures non lues" : "Chargement des candidatures…"}</p>
          ) : filtered.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">Aucune annonce</p>
          ) : paginated.map((listing) => {
            const st = stats[listing.id];
            const sit = sitSituation(listing);
            const city = listingCity(listing);
            const isAdminHidden = listing.status === "cancelled" && !!listing.hidden_by;
            const ownerName = `${listing.owner?.first_name || ""} ${listing.owner?.last_name || ""}`.trim();
            const urg = urgencyOf(listing);
            const ownerFirst = (listing.owner?.first_name ?? "").trim();
            const dates = `${listing.start_date ? format(calendarDate(listing.start_date), "d MMM", { locale: fr }) : "·"} au ${listing.end_date ? format(calendarDate(listing.end_date), "d MMM yy", { locale: fr }) : "·"}`;
            return (
              <article key={listing.id} className="rounded-2xl border bg-card p-4 space-y-3" data-testid="listing-card">
                <div className="min-w-0">
                  <p className="font-medium leading-snug line-clamp-2">{listing.title || "Sans titre"}</p>
                  <p className="text-xs text-muted-foreground mt-1">{ownerName || "Propriétaire non renseigné"} · {city.city || "·"} · {dates}</p>
                  {isNewListing(listing, newSince) && <Badge className="mt-1 px-1.5 py-0 text-[10px]">Nouvelle</Badge>}
                </div>
                {urg ? (
                  <div data-testid="card-urgency" data-key={urg.key}>
                    <p className={`text-sm font-semibold ${urg.tone === "urgent" ? "text-destructive" : urg.tone === "late" ? "text-secondary" : urg.tone === "good" ? "text-primary" : "text-foreground"}`}>{urg.phrase}</p>
                    {urg.chip && <p className="text-[11px] text-muted-foreground mt-0.5">{urg.chip}</p>}
                  </div>
                ) : (
                  <div><Badge variant={sit.tone}>{sit.label}</Badge>{sit.detail && <p className="text-[11px] text-muted-foreground mt-0.5">{sit.detail}</p>}</div>
                )}
                <div className="flex gap-4 text-sm tabular-nums">
                  <button type="button" className="min-h-11 text-left" onClick={() => openDrill(listing, "applications")} disabled={!st || st.applications === 0}>
                    <span className="font-semibold">{st ? st.applications : "·"}</span> <span className="text-muted-foreground">candidature{st && st.applications > 1 ? "s" : ""}</span>
                  </button>
                  <button type="button" className="min-h-11 text-left" onClick={() => openDrill(listing, "conversations")} disabled={!st || st.messages === 0}>
                    <span className="font-semibold">{st ? st.messages : "·"}</span> <span className="text-muted-foreground">message{st && st.messages > 1 ? "s" : ""}</span>
                  </button>
                  <span className="min-h-11 inline-flex items-center"><span className="font-semibold">{st ? st.views : "·"}</span>&nbsp;<span className="text-muted-foreground">vues</span></span>
                </div>
                {rowActions(listing, urg, st, listingLiveUrl(listing), isAdminHidden, ownerFirst, "card")}
              </article>
            );
          })}
        </div>
      ) : (
      <div className="rounded-lg border bg-card overflow-x-auto">
        <Table className="table-fixed min-w-[1080px]">
          <colgroup>
            <col className="w-[26%]" /><col className="w-[15%]" /><col className="w-[17%]" />
            <col className="w-[8%]" /><col className="w-[8%]" /><col className="w-[6%]" /><col className="w-[340px]" />
          </colgroup>
          <TableHeader>
            <TableRow>
              <TableHead>Annonce</TableHead>
              <TableHead>Lieu et dates</TableHead>
              <TableHead>Situation</TableHead>
              <TableHead className="text-right">Candidatures</TableHead>
              <TableHead className="text-right" title="Messages échangés dans les conversations liées à l'annonce">Messages</TableHead>
              <TableHead className="text-right" title="Vues totales (public + membres)">Vues</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Chargement…</TableCell></TableRow>
            ) : loadError ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-destructive">Indisponible</TableCell></TableRow>
            ) : countUnknown ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">{statsError ? "Indisponible, candidatures non lues" : "Chargement des candidatures…"}</TableCell></TableRow>
            ) : filterStatus === "ready" && !focusSitId && !focusOwnerId && (draftCtxError || !draftCtx) ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">{draftCtxError ? "Indisponible, contexte du brouillon non lu" : "Lecture des informations du brouillon…"}</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Aucune annonce</TableCell></TableRow>
            ) : paginated.map((listing) => {
              const sit = sitSituation(listing);
              const st = stats[listing.id];
              const city = listingCity(listing);
              const isAdminHidden = listing.status === "cancelled" && !!listing.hidden_by;
              const coverUrl = (listing as any).cover_photo_url as string | null;
              const coverNotPlace = !coverUrl || animalPhotoUrls.has(coverUrl);
              const ownerName = `${listing.owner?.first_name || ""} ${listing.owner?.last_name || ""}`.trim();
              const liveUrl = listingLiveUrl(listing);
              const urg = urgencyOf(listing);
              const ownerFirst = (listing.owner?.first_name ?? "").trim();
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
                    <OwnerAbsenceBadge lastSeenAt={listing.owner?.last_seen_at} className="mt-1" />
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
                    {listing.start_date ? format(calendarDate(listing.start_date), "d MMM", { locale: fr }) : "·"}
                    {" au "}
                    {listing.end_date ? format(calendarDate(listing.end_date), "d MMM yy", { locale: fr }) : "·"}
                    </div>
                    {!listing.published_at && (listing.created_at || listing.updated_at) && (
                      <div className="mt-0.5 text-[11px] text-muted-foreground" data-testid="row-created">
                        {listing.created_at && <>créée le {format(new Date(listing.created_at), "d MMM", { locale: fr })}</>}
                        {listing.updated_at && (
                          <>{listing.created_at ? " · " : ""}modifiée {formatDistanceToNow(new Date(listing.updated_at), { addSuffix: true, locale: fr })}</>
                        )}
                      </div>
                    )}
                    {listing.published_at && (
                      <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px]">
                        <span>publiée {formatDistanceToNow(new Date(listing.published_at), { addSuffix: true, locale: fr })}</span>
                        {isNewListing(listing, newSince) && (
                          <Badge className="px-1.5 py-0 text-[10px]" data-testid="row-new" title="Publiée depuis votre dernière visite">Nouvelle</Badge>
                        )}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    {urg ? (
                      <div data-testid="row-urgency" data-key={urg.key}>
                        <p className={`text-sm font-semibold ${urg.tone === "urgent" ? "text-destructive" : urg.tone === "late" ? "text-secondary" : urg.tone === "good" ? "text-primary" : "text-foreground"}`}>{urg.phrase}</p>
                        {urg.chip && <p className="text-[11px] text-muted-foreground mt-0.5">{urg.chip}</p>}
                      </div>
                    ) : (<>
                    <Badge variant={sit.tone}>{sit.label}</Badge>
                    {sit.detail && <p className="text-[11px] text-muted-foreground mt-0.5">{sit.detail}</p>}
                    </>)}
                    {listing.status === "draft" && !listing.published_at && (() => {
                      const readiness = draftCtx && !draftCtxError ? draftReadiness(listing, draftCtx.get(listing.user_id), today) : null;
                      const followup = draftFollowups?.get(listing.id);
                      const missing = readiness?.missing.map(m => m.label).join(" · ");
                      return <div className="text-xs text-muted-foreground mt-1 max-w-sm space-y-1">
                        <p>{!readiness ? "Complétude à vérifier" : readiness.blocked === "past" ? "Date de début dépassée : dates à revoir" : readiness.blocked === "no_city" ? "Commune à renseigner" : readiness.ready ? "Informations complètes : publication à confirmer" : missing || "Brouillon à vérifier"}</p>
                        {followup?.ownerHasPublished && <p>Ce propriétaire a déjà publié une autre annonce.</p>}
                        {followup?.productEmailsAllowed === false && <p>Relances désactivées par le propriétaire.</p>}
                        <p>{followup ? draftReminderLabel(followup.lastReminder) : draftFollowupError ? "Historique des relances indisponible" : "Lecture des relances…"}
                          {followup?.lastReminder && ` · ${format(new Date(followup.lastReminder.created_at), "d MMM yyyy", { locale: fr })}`}
                        </p>
                      </div>;
                    })()}

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
                  <TableCell className="text-right text-sm tabular-nums" data-testid="row-messages">
                    {st && !statsError ? (
                      <>
                        {st.messages > 0 ? (
                          <button onClick={() => openDrill(listing, "conversations")} className="font-medium text-foreground hover:text-primary hover:underline" title="Voir les conversations">
                            {st.messages}
                          </button>
                        ) : (
                          <span className="text-muted-foreground">0</span>
                        )}
                        {st.conversations > 0 && (
                          <p className="text-[11px] text-muted-foreground">{st.conversations} conversation{st.conversations > 1 ? "s" : ""}</p>
                        )}
                      </>
                    ) : (
                      <span className="text-muted-foreground">{statsError ? "Indisponible" : "·"}</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right text-sm tabular-nums">{st?.views ?? "·"}</TableCell>
                  <TableCell className="text-right">
                    {rowActions(listing, urg, st, liveUrl, isAdminHidden, ownerFirst, "row")}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
      )}

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


      {/* Lot ANN-1 : les statistiques de la page passent sous la liste. */}
      <details className="rounded-2xl border bg-card px-4 py-3" data-testid="listing-stats">
        <summary className="cursor-pointer min-h-11 flex items-center font-heading text-base font-semibold">Statistiques de la page</summary>
        <div className="mt-3 space-y-6">
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
      <DraftReminderConversionPanel />
      <ListingExitsSection />
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

        </div>
      </details>

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
            ) : trafficError ? (
              <ErrorState detail="Sources de trafic" onRetry={() => trafficListing && void openTraffic(trafficListing)} />
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

      {/* Lot ADM3 : publication à la place du propriétaire */}
      <Dialog open={!!publishModal} onOpenChange={(o) => !o && !publishing && setPublishModal(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Publier ce brouillon à la place du propriétaire ?</DialogTitle></DialogHeader>
          <DialogDescription>
            Le brouillon est complet. Une fois publié, les gardiens proches reçoivent l'alerte habituelle et l'action est inscrite au journal d'audit. Un message au propriétaire s'ouvre ensuite pour le prévenir.
          </DialogDescription>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPublishModal(null)} disabled={publishing}>Annuler</Button>
            <Button onClick={() => publishModal && handlePublishOnBehalf(publishModal)} disabled={publishing}>
              {publishing && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}Publier
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
        onWriteCandidate={drillListing ? (c) => { setDrillOpen(false); writeCandidate(drillListing, c); } : undefined}
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
