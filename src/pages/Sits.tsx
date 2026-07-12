import { useAuth } from "@/contexts/AuthContext";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  Plus, Calendar, MessageSquare, Star, Users, Eye, BookOpen,
  MapPin, Clock, MoreHorizontal, XCircle, CheckCircle,
  Image as ImageIcon, ChevronRight, Archive, Trash2, RefreshCw,
  AlertTriangle, Pencil, Lock, MessageCircle,
  KeyRound, Home, ClipboardList, X, Copy, Check, Loader2, Search,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import EmptyState from "@/components/shared/EmptyState";
import { useEffect, useState, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAlmaCulturalFact } from "@/hooks/useAlmaCulturalFact";
import { useAlmaUsageNudge } from "@/hooks/useAlmaUsageNudge";
import { format, differenceInDays, isAfter, isBefore, isToday, parseISO, isWithinInterval, startOfDay, endOfDay } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { Helmet } from "react-helmet-async";
import MobileStickyCTA from "@/components/dashboard/owner/MobileStickyCTA";
import { RepublishAlmaDialog } from "@/components/ai/alma/RepublishAlmaDialog";

/* ── Status configs (tokens sémantiques uniquement, compat dark mode) ── */
const statusConfig: Record<string, { label: string; className: string }> = {
  draft: { label: "Brouillon", className: "bg-muted text-muted-foreground" },
  published: { label: "En attente", className: "bg-muted text-muted-foreground" },
  published_with_apps: { label: "Candidature(s) reçue(s)", className: "bg-info-soft text-info border border-info-border" },
  confirmed: { label: "Garde confirmée", className: "bg-success-soft text-success border border-success-border" },
  in_progress: { label: "En cours", className: "bg-success-soft text-success border border-success-border" },
  completed: { label: "Terminée", className: "bg-muted text-foreground border border-border" },
  cancelled: { label: "Annulée", className: "bg-destructive/10 text-destructive-text" },
  expired: { label: "Expirée", className: "bg-warning-soft text-warning-foreground border border-warning-border" },
  unpublished: { label: "Dépubliée", className: "bg-muted text-muted-foreground border border-border" },
  archived: { label: "Archivée", className: "bg-muted text-muted-foreground border border-dashed border-border" },
};

const appStatusConfig: Record<string, { label: string; className: string; pulse?: boolean }> = {
  pending: { label: "Envoyée", className: "bg-primary/10 text-primary", pulse: true },
  viewed: { label: "Consultée", className: "bg-secondary/10 text-secondary" },
  discussing: { label: "En discussion", className: "bg-accent text-foreground" },
  accepted: { label: "Acceptée", className: "bg-success-soft text-success border border-success-border" },
  rejected: { label: "Déclinée", className: "bg-destructive/10 text-destructive-text" },
  cancelled: { label: "Annulée", className: "bg-destructive/10 text-destructive-text" },
  owner_found: { label: "Propriétaire a trouvé", className: "bg-muted text-muted-foreground border border-border" },
  owner_withdrew: { label: "Annonce retirée", className: "bg-muted text-muted-foreground border border-border" },
};

type Tab = "upcoming" | "in_progress" | "completed" | "cancelled";
type OwnerTab = "active" | "drafts" | "past";

const tabs: { value: Tab; label: string; icon: typeof Calendar }[] = [
  { value: "upcoming", label: "Actives", icon: Calendar },
  { value: "in_progress", label: "En garde", icon: Clock },
  { value: "completed", label: "Terminées", icon: CheckCircle },
  { value: "cancelled", label: "Refusées", icon: XCircle },
];


const ownerTabs: { value: OwnerTab; label: string; icon: typeof Calendar }[] = [
  { value: "active", label: "En ligne", icon: Calendar },
  { value: "drafts", label: "Brouillons", icon: Pencil },
  { value: "past", label: "Passées", icon: Archive },
];

const formatShortDate = (d: string | null) =>
  d ? format(parseISO(d), "d MMM", { locale: fr }) : "";

const getDuration = (start: string | null, end: string | null) => {
  if (!start || !end) return null;
  const days = differenceInDays(parseISO(end), parseISO(start));
  return days <= 0 ? "1 jour" : `${days} jour${days > 1 ? "s" : ""}`;
};

const capitalize = (s: string) => s ? s.charAt(0).toUpperCase() + s.slice(1) : "";

const getEffectiveStatus = (sit: any): string => {
  // Rule A1: expiration a la priorite absolue sur le statut brut cancelled.
  if (sit.cancellation_reason === "expired") return "expired";
  if (sit.status === "cancelled") return "cancelled";
  if (sit.status === "completed") return "completed";
  // Expired: end_date passed and not confirmed/completed
  if (sit.end_date && ["published", "draft"].includes(sit.status)) {
    const end = parseISO(sit.end_date);
    if (isBefore(end, new Date())) return "expired";
  }
  if (sit.status === "confirmed" && sit.start_date && sit.end_date) {
    const today = new Date();
    const start = parseISO(sit.start_date);
    const end = parseISO(sit.end_date);
    if ((isToday(start) || isAfter(today, start)) && (isToday(end) || isBefore(today, end))) {
      return "in_progress";
    }
  }
  return sit.status;
};

// Owner-only: overlays d'affichage supplementaires (dépubliée, archivée manuelle)
// La vue sitter continue d'utiliser getEffectiveStatus tel quel.
const getOwnerEffectiveStatus = (sit: any): string => {
  if (sit.cancellation_reason === "archived") return "archived";
  if (sit.status === "draft" && sit.unpublished_at) {
    // Dépubliée dont end_date est passee → traitée comme "expirée" (Passées).
    if (sit.end_date && isBefore(parseISO(sit.end_date), new Date())) return "expired";
    return "unpublished";
  }
  return getEffectiveStatus(sit);
};

const Sits = () => {
  const { user, activeRole } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [sits, setSits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Alma étape 1 — compagnon culturel + usage_nudge sur la liste sits.
  useAlmaCulturalFact({ surface: "sits_list", context: { role: activeRole } });
  useAlmaUsageNudge({
    surface: "sits_list",
    role: activeRole === "owner" ? "owner" : "sitter",
    state: "any",
  });

  // Onglet actif synchronisé avec l'URL (?tab=...), partageable, retour navigateur OK
  const validTabs: Tab[] = ["upcoming", "in_progress", "completed", "cancelled"];
  const validOwnerTabs: OwnerTab[] = ["active", "drafts", "past"];
  const urlTab = searchParams.get("tab");
  const isOwnerView = activeRole === "owner";
  const activeTab: Tab = (urlTab && validTabs.includes(urlTab as Tab) ? urlTab : "upcoming") as Tab;
  // Rétro-compat : ancien lien ?tab=archived → past
  const normalizedOwnerTab = urlTab === "archived" ? "past" : urlTab;
  const activeOwnerTab: OwnerTab = (normalizedOwnerTab && validOwnerTabs.includes(normalizedOwnerTab as OwnerTab) ? normalizedOwnerTab : "active") as OwnerTab;
  const setActiveTab = useCallback((tab: Tab | OwnerTab) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (tab === "upcoming" || tab === "active") next.delete("tab");
      else next.set("tab", tab);
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  // (showArchived state removed, replaced by tabs)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [archiveConfirm, setArchiveConfirm] = useState<string | null>(null);
  const [republishDialog, setRepublishDialog] = useState<{ id: string; title?: string | null } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [openGuideId, setOpenGuideId] = useState<string | null>(null);
  const [openGuide, setOpenGuide] = useState<any | null>(null);
  const [guideLoading, setGuideLoading] = useState(false);
  // Tri owner : "urgent" (pending count desc) par défaut, ou "recent" (updated_at desc)
  const [ownerSortMode, setOwnerSortMode] = useState<"urgent" | "recent">("urgent");
  // Modale de retrait de candidature côté gardien
  const [withdrawApp, setWithdrawApp] = useState<{ appId: string; sitTitle: string; conversationId: string | null } | null>(null);
  const [withdrawing, setWithdrawing] = useState(false);

  // Load full guide when openGuideId is set
  useEffect(() => {
    if (!openGuideId) {
      setOpenGuide(null);
      return;
    }
    const sit = sits.find(s => s.id === openGuideId);
    if (!sit) return;

    setGuideLoading(true);
    supabase
      .from("house_guides")
      .select("*")
      .eq("user_id", sit.user_id || sit.owner?.id)
      .eq("published", true)
      .maybeSingle()
      .then(({ data }) => {
        setOpenGuide(data);
        setGuideLoading(false);
      });
  }, [openGuideId, sits]);

  const loadSits = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setLoadError(null);

    try {
      if (activeRole === "owner") {
        // Charge la ville du proprio + sa galerie photos (source unique de photos owner)
        const [ownerProfileRes, galleryRes] = await Promise.all([
          supabase.from("profiles").select("city").eq("id", user.id).maybeSingle(),
          supabase
            .from("owner_gallery")
            .select("photo_url, position")
            .eq("user_id", user.id)
            .order("position", { ascending: true }),
        ]);
        if (ownerProfileRes.error) throw ownerProfileRes.error;
        if (galleryRes.error) throw galleryRes.error;

        const ownerCity = ownerProfileRes.data?.city || null;
        const ownerGalleryPhotos = (galleryRes.data || [])
          .map((g: any) => g.photo_url)
          .filter(Boolean);
        const firstGalleryPhoto = ownerGalleryPhotos[0] || null;

        // RPC unique : remplace le fan-out (sits + N × applications/pets/reviews).
        const { data, error } = await supabase.rpc("get_owner_sits_enriched", {
          p_owner: user.id,
        });
        if (error) throw error;

        const rows: any[] = (data as any[]) || [];

        // Auto-expire cote client (publiees ET brouillons dont end_date est passee).
        const toExpire = rows.filter((s: any) =>
          s.end_date
          && ["published", "draft"].includes(s.status)
          && isBefore(parseISO(s.end_date), new Date())
        );
        if (toExpire.length > 0) {
          const ids = toExpire.map((s: any) => s.id);
          const { error: expErr } = await supabase
            .from("sits")
            .update({ status: "cancelled" as any, cancellation_reason: "expired" })
            .in("id", ids)
            .eq("user_id", user.id);
          if (expErr) {
            // Non bloquant pour l'affichage : on log seulement.
            console.warn("[Sits] auto-expire failed", expErr);
          }
        }

        const enriched = rows.map((sit: any) => {
          const wasExpired = toExpire.some((e: any) => e.id === sit.id);
          const overlaid = {
            ...sit,
            status: wasExpired ? "cancelled" : sit.status,
            cancellation_reason: wasExpired ? "expired" : sit.cancellation_reason,
          };
          return {
            ...sit,
            status: overlaid.status,
            cancellation_reason: overlaid.cancellation_reason,
            effectiveStatus: getOwnerEffectiveStatus(overlaid),
            applicationCount: sit.application_count || 0,
            pendingApplicationCount: sit.pending_application_count || 0,
            acceptedSitter: sit.accepted_sitter || null,
            pets: sit.pets || [],
            hasReviewed: !!sit.has_reviewed,
            ownerCity,
            ownerGalleryFirstPhoto: firstGalleryPhoto,
          };
        });
        setSits(enriched);
      } else {
        // Sitter view (inchangee)
        const { data, error } = await supabase
          .from("applications")
          .select("*, sit:sits(*, properties(type, environment, photos), owner:profiles!sits_user_id_fkey(first_name, avatar_url, city, id))")
          .eq("sitter_id", user.id)
          .order("created_at", { ascending: false });
        if (error) throw error;

        const sitIds = data?.map((a: any) => a.sit?.id).filter(Boolean) || [];
        let reviewedSitIds: string[] = [];
        if (sitIds.length > 0) {
          const { data: reviews } = await supabase
            .from("reviews").select("sit_id").eq("reviewer_id", user.id).in("sit_id", sitIds);
          reviewedSitIds = reviews?.map((r: any) => r.sit_id) || [];
        }

        const propertyIds = [...new Set(data?.map((a: any) => a.sit?.property_id).filter(Boolean) || [])];
        let petsByProperty: Record<string, any[]> = {};
        if (propertyIds.length > 0) {
          const { data: pets } = await supabase
            .from("pets").select("name, species, property_id").in("property_id", propertyIds);
          pets?.forEach((p: any) => {
            if (!petsByProperty[p.property_id]) petsByProperty[p.property_id] = [];
            petsByProperty[p.property_id].push(p);
          });
        }

        // For all applications: conversation + last message + unread.
        // Guide only for accepted/active sits.
        const guideMap: Record<string, { id: string; published: boolean } | null> = {};
        const convMap: Record<string, string | null> = {};
        const lastMsgMap: Record<string, { content: string; created_at: string; from_me: boolean } | null> = {};
        const unreadMap: Record<string, number> = {};

        await Promise.all((data || []).map(async (a: any) => {
          const sitId = a.sit?.id;
          const ownerId = a.sit?.user_id;
          if (!sitId || !ownerId) return;

          const isAcceptedActive =
            a.status === "accepted" && ["confirmed", "in_progress"].includes(a.sit?.status);

          const [guideRes, convRes] = await Promise.all([
            isAcceptedActive
              ? supabase
                  .from("house_guides")
                  .select("id, published")
                  .eq("user_id", ownerId)
                  .eq("published", true)
                  .maybeSingle()
              : Promise.resolve({ data: null } as any),
            supabase
              .from("conversations")
              .select("id")
              .eq("sit_id", sitId)
              .eq("owner_id", ownerId)
              .eq("sitter_id", user.id)
              .maybeSingle(),
          ]);

          guideMap[sitId] = (guideRes as any).data || null;
          const convId = convRes.data?.id || null;
          convMap[sitId] = convId;

          if (convId) {
            const [lastRes, unreadRes] = await Promise.all([
              supabase
                .from("messages")
                .select("content, created_at, sender_id, is_system")
                .eq("conversation_id", convId)
                .eq("is_system", false)
                .order("created_at", { ascending: false })
                .limit(1)
                .maybeSingle(),
              supabase
                .from("messages")
                .select("id", { count: "exact", head: true })
                .eq("conversation_id", convId)
                .is("read_at", null)
                .neq("sender_id", user.id),
            ]);
            lastMsgMap[sitId] = lastRes.data
              ? {
                  content: lastRes.data.content,
                  created_at: lastRes.data.created_at,
                  from_me: lastRes.data.sender_id === user.id,
                }
              : null;
            unreadMap[sitId] = unreadRes.count || 0;
          }
        }));

        setSits(
          data?.map((a: any) => ({
            ...a.sit,
            effectiveStatus: getEffectiveStatus(a.sit),
            application_status: a.status,
            application_id: a.id,
            application_created_at: a.created_at,
            application_viewed_at: a.viewed_at,
            owner: a.sit?.owner || null,
            hasReviewed: reviewedSitIds.includes(a.sit?.id),
            pets: petsByProperty[a.sit?.property_id] || [],
            houseGuide: guideMap[a.sit?.id] || null,
            conversationId: convMap[a.sit?.id] || null,
            lastMessage: lastMsgMap[a.sit?.id] || null,
            unreadCount: unreadMap[a.sit?.id] || 0,
          })) || []
        );
      }
    } catch (err: any) {
      console.error("[Sits] loadSits failed", err);
      setSits([]);
      setLoadError(
        err?.message
          ? "Impossible de charger vos annonces. Vérifiez votre connexion et réessayez."
          : "Une erreur est survenue. Réessayez dans un instant.",
      );
    } finally {
      setLoading(false);
    }
  }, [user, activeRole]);

  useEffect(() => { loadSits(); }, [loadSits]);

  // Realtime : rafraichit la liste owner quand un sit ou une candidature change.
  // La vue sitter garde son propre mecanisme (aucune souscription ici).
  useEffect(() => {
    if (!user || activeRole !== "owner") return;

    let refetchTimer: number | null = null;
    const scheduleRefetch = () => {
      if (refetchTimer !== null) return;
      refetchTimer = window.setTimeout(() => {
        refetchTimer = null;
        void loadSits();
      }, 400);
    };

    const channel = supabase
      .channel(`sits-owner-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "sits", filter: `user_id=eq.${user.id}` },
        () => scheduleRefetch(),
      )
      .on(
        "postgres_changes",
        // RLS restreint deja aux applications sur les sits du owner.
        { event: "*", schema: "public", table: "applications" },
        () => scheduleRefetch(),
      )
      .subscribe();

    return () => {
      if (refetchTimer !== null) window.clearTimeout(refetchTimer);
      void supabase.removeChannel(channel);
    };
  }, [user, activeRole, loadSits]);

  const handleArchive = async (sitId: string) => {
    try {
      const { error } = await supabase.from("sits").update({
        status: "cancelled" as any,
        cancellation_reason: "archived",
      }).eq("id", sitId).eq("user_id", user!.id);
      if (error) throw error;
      toast({ title: "Annonce archivée" });
      setArchiveConfirm(null);
      loadSits();
    } catch (err: any) {
      console.error("[Sits] archive failed", err);
      toast({
        variant: "destructive",
        title: "Impossible d'archiver",
        description: "L'archivage a échoué. Réessayez dans un instant.",
      });
    }
  };

  const handleDelete = async (sitId: string) => {
    try {
      const { error } = await supabase.from("sits").delete().eq("id", sitId).eq("user_id", user!.id);
      if (error) throw error;
      toast({ title: "Annonce supprimée" });
      setDeleteConfirm(null);
      loadSits();
    } catch (err: any) {
      console.error("[Sits] delete failed", err);
      toast({
        variant: "destructive",
        title: "Suppression impossible",
        description: "La suppression a échoué. Réessayez dans un instant.",
      });
    }
  };

  const handleRepublish = async (sitId: string) => {
    const sit = sits.find((s) => s.id === sitId);
    const todayIso = new Date().toISOString().split("T")[0];
    // Garde A3 : ne pas republier une annonce dont les dates sont deja passees.
    if (sit?.end_date && sit.end_date < todayIso) {
      toast({
        title: "Dates a mettre a jour",
        description: "Les dates de cette annonce sont passees. Modifiez-les avant de republier.",
      });
      navigate(`/sits/${sitId}/edit`);
      return;
    }
    try {
      const { error } = await supabase.from("sits").update({
        status: "published" as any,
        cancellation_reason: null,
        cancelled_at: null,
        cancelled_by: null,
        unpublished_at: null,
        last_unpublished_reason: null,
      } as any).eq("id", sitId).eq("user_id", user!.id);
      if (error) throw error;
      toast({ title: "Annonce republiée" });
      loadSits();
    } catch (err: any) {
      console.error("[Sits] republish failed", err);
      toast({
        variant: "destructive",
        title: "Republication impossible",
        description: "La republication a échoué. Réessayez dans un instant.",
      });
    }
  };

  // Bucketing owner : En ligne / Brouillons / Passees
  //  - En ligne  : publiees, confirmees, en cours (avec ou sans candidatures)
  //  - Brouillons: vrais brouillons jamais publies (non expires) + dépubliées dont les dates ne sont PAS passees
  //  - Passees   : expired, completed, cancelled (manuel), archived (manuel)
  // Une annonce est "passee" (cycle termine) si :
  //  - effectiveStatus in {expired, completed, archived, cancelled}
  const isPast = (s: any) => {
    const es = s.effectiveStatus || s.status;
    return ["expired", "completed", "archived", "cancelled"].includes(es);
  };
  const isDraft = (s: any) => {
    if (isPast(s)) return false;
    const es = s.effectiveStatus || s.status;
    // vrai brouillon jamais publie OU dépubliée non expiree (effectiveStatus='unpublished')
    return es === "draft" || es === "unpublished";
  };
  const isActive = (s: any) => !isPast(s) && !isDraft(s);
  // Alias legacy pour la vue sitter (elle utilise isArchived pour derouler activeSits).
  const isArchived = isPast;

  const activeSits = useMemo(() => sits.filter(s => !isArchived(s)), [sits]);
  

  // Comptages onglets sitter (vue inchangée)
  // Une expiration/archivage owner-side est mappe vers "cancelled" cote sitter pour preserver le comportement.
  const tabCounts = useMemo(() => {
    const counts: Record<Tab, number> = { upcoming: 0, in_progress: 0, completed: 0, cancelled: 0 };
    if (isOwnerView) return counts;
    activeSits.forEach((s) => {
      const es = s.effectiveStatus || s.status;
      const appStatus = s.application_status;
      if (appStatus === "cancelled" || appStatus === "rejected" || es === "cancelled" || es === "expired" || es === "archived") counts.cancelled++;
      else if (es === "completed") counts.completed++;
      else if (es === "in_progress" && appStatus === "accepted") counts.in_progress++;
      else counts.upcoming++;
    });
    return counts;
  }, [activeSits, isOwnerView]);

  // Comptages onglets owner : En ligne / Brouillons / Passees
  const ownerTabCounts = useMemo(() => {
    const counts: Record<OwnerTab, number> = { active: 0, drafts: 0, past: 0 };
    if (!isOwnerView) return counts;
    sits.forEach((s) => {
      if (isPast(s)) counts.past++;
      else if (isDraft(s)) counts.drafts++;
      else counts.active++;
    });
    return counts;
  }, [sits, isOwnerView]);

  const filteredSits = useMemo(() => {
    let base: any[] = [];
    if (isOwnerView) {
      base = sits.filter((s) => {
        switch (activeOwnerTab) {
          case "drafts":
            return isDraft(s);
          case "past":
            return isPast(s);
          case "active":
          default:
            return isActive(s);
        }
      });
    } else {
      base = activeSits.filter((s) => {
        const es = s.effectiveStatus || s.status;
        const appStatus = s.application_status;
        switch (activeTab) {
          case "in_progress": return es === "in_progress" && appStatus === "accepted";
          case "completed": return es === "completed";
          case "cancelled": return appStatus === "cancelled" || appStatus === "rejected" || es === "cancelled";
          case "upcoming": return !["completed", "cancelled"].includes(es) && !["cancelled", "rejected"].includes(appStatus) && es !== "in_progress";
        }
        return false;
      });
    }
    const q = searchQuery.trim().toLowerCase();
    let searched = q
      ? base.filter((s) => {
          const fields = [
            s.title, s.city, s.ownerCity,
            s.owner?.first_name, s.owner?.city,
            s.acceptedSitter?.first_name, s.acceptedSitter?.city,
            ...(s.pets || []).map((p: any) => p.name),
          ].filter(Boolean).join(" ").toLowerCase();
          return fields.includes(q);
        })
      : base;

    // Tri owner (onglet actif & en garde) : "urgent" par défaut (pending desc)
    if (isOwnerView && (activeOwnerTab === "active")) {
      const bySort = [...searched];
      if (ownerSortMode === "urgent") {
        bySort.sort((a, b) => {
          const pa = a.pendingApplicationCount || 0;
          const pb = b.pendingApplicationCount || 0;
          if (pa !== pb) return pb - pa;
          const ua = new Date(a.updated_at || a.created_at || 0).getTime();
          const ub = new Date(b.updated_at || b.created_at || 0).getTime();
          return ub - ua;
        });
      } else {
        bySort.sort((a, b) => {
          const ua = new Date(a.updated_at || a.created_at || 0).getTime();
          const ub = new Date(b.updated_at || b.created_at || 0).getTime();
          return ub - ua;
        });
      }
      return bySort;
    }
    return searched;
  }, [activeSits, sits, isOwnerView, activeTab, activeOwnerTab, searchQuery, ownerSortMode]);

  // Suggestions de recherche : titres, villes, gardiens/propriétaires, animaux (uniques)
  const searchSuggestions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q || q.length < 1) return [] as { label: string; type: string }[];
    const seen = new Set<string>();
    const out: { label: string; type: string }[] = [];
    const push = (label: string | undefined | null, type: string) => {
      if (!label) return;
      const key = `${type}:${label.toLowerCase()}`;
      if (seen.has(key)) return;
      if (!label.toLowerCase().includes(q)) return;
      seen.add(key);
      out.push({ label, type });
    };
    for (const s of sits) {
      push(s.title, "Annonce");
      push(s.city || s.ownerCity, "Ville");
      if (isOwnerView) {
        push(s.acceptedSitter?.first_name, "Gardien");
      } else {
        push(s.owner?.first_name, "Propriétaire");
      }
      (s.pets || []).forEach((p: any) => push(p?.name, "Animal"));
      if (out.length >= 30) break;
    }
    return out.slice(0, 8);
  }, [sits, searchQuery, isOwnerView]);

  // Sous-titre contextuel : informations utiles plutôt que générique
  const headerSubtitle = useMemo(() => {
    if (isOwnerView) {
      const pendingApps = activeSits.reduce((sum, s) => sum + (s.pendingApplicationCount || 0), 0);
      const inProgress = activeSits.filter((s) => (s.effectiveStatus || s.status) === "in_progress").length;
      const parts: string[] = [];
      if (pendingApps > 0) parts.push(`${pendingApps} candidature${pendingApps > 1 ? "s" : ""} en attente`);
      if (inProgress > 0) parts.push(`${inProgress} garde${inProgress > 1 ? "s" : ""} en cours`);
      else if (ownerTabCounts.active > 0) parts.push(`${ownerTabCounts.active} annonce${ownerTabCounts.active > 1 ? "s" : ""} active${ownerTabCounts.active > 1 ? "s" : ""}`);
      return parts.length > 0 ? parts.join(" · ") : "Gérez vos annonces et suivez vos gardes.";
    }
    const upcoming = tabCounts.upcoming;
    const inProgress = tabCounts.in_progress;
    const parts: string[] = [];
    if (inProgress > 0) parts.push(`${inProgress} garde${inProgress > 1 ? "s" : ""} en cours`);
    if (upcoming > 0) parts.push(`${upcoming} à venir`);
    return parts.length > 0 ? parts.join(" · ") : "Suivez vos candidatures et gardes.";
  }, [tabCounts, ownerTabCounts, activeSits, isOwnerView]);

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto animate-fade-in pb-[calc(9rem+env(safe-area-inset-bottom))] md:pb-8">
      <Helmet><meta name="robots" content="noindex, nofollow" /></Helmet>
      {/* Header */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="font-heading text-2xl md:text-3xl font-bold mb-1">
            {activeRole === "owner" ? "Mes annonces" : "Mes candidatures"}
          </h1>
          <p className="text-muted-foreground text-sm">
            {headerSubtitle}
          </p>
        </div>
        {activeRole === "owner" ? (
          // Sur mobile, le FAB MobileStickyCTA porte le CTA "Publier", on évite le doublon.
          <Link to="/sits/create" className="hidden sm:inline-flex shrink-0 self-auto">
            <Button className="gap-2">
              <Plus className="h-4 w-4" /> Publier
            </Button>
          </Link>
        ) : (
          <Link to="/search" className="shrink-0 self-start sm:self-auto">
            <Button variant="outline" className="gap-2 w-full sm:w-auto">
              <Eye className="h-4 w-4" /> Voir les annonces
            </Button>
          </Link>
        )}
      </div>

      {/* Tabs, mask-fade à droite pour signaler le scroll horizontal sur mobile */}
      <div
        className="flex gap-2 overflow-x-auto pb-2 mb-6 scrollbar-hide"
        style={{
          WebkitMaskImage: "linear-gradient(to right, black calc(100% - 24px), transparent 100%)",
          maskImage: "linear-gradient(to right, black calc(100% - 24px), transparent 100%)",
        }}
      >
        {isOwnerView ? (
          ownerTabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={cn(
                "px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors shrink-0 flex items-center gap-1.5",
                activeOwnerTab === tab.value
                  ? "bg-primary text-primary-foreground"
                  : "bg-accent text-muted-foreground hover:text-foreground"
              )}
            >
              {tab.label}
              {ownerTabCounts[tab.value] > 0 && (
                <span className={cn(
                  "text-[10px] rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 font-semibold",
                  activeOwnerTab === tab.value
                    ? "bg-primary-foreground/20 text-primary-foreground"
                    : "bg-muted-foreground/15 text-muted-foreground"
                )}>
                  {ownerTabCounts[tab.value]}
                </span>
              )}
            </button>
          ))
        ) : (
          tabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={cn(
                "px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors shrink-0 flex items-center gap-1.5",
                activeTab === tab.value
                  ? "bg-primary text-primary-foreground"
                  : "bg-accent text-muted-foreground hover:text-foreground"
              )}
            >
              {tab.label}
              {tabCounts[tab.value] > 0 && (
                <span className={cn(
                  "text-[10px] rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 font-semibold",
                  activeTab === tab.value
                    ? "bg-primary-foreground/20 text-primary-foreground"
                    : "bg-muted-foreground/15 text-muted-foreground"
                )}>
                  {tabCounts[tab.value]}
                </span>
              )}
            </button>
          ))
        )}
      </div>

      {/* Recherche rapide */}
      {sits.length > 0 && (
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" aria-hidden="true" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setShowSuggestions(true); }}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
            placeholder={isOwnerView ? "Rechercher (titre, ville, gardien, animal)…" : "Rechercher (ville, propriétaire, animal)…"}
            className="w-full pl-9 pr-9 py-2 rounded-lg border border-border bg-card text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50"
            aria-label="Rechercher dans mes annonces"
            autoComplete="off"
          />
          {searchQuery && (
            <button
              onClick={() => { setSearchQuery(""); setShowSuggestions(false); }}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted"
              aria-label="Effacer la recherche"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          {showSuggestions && searchSuggestions.length > 0 && (
            <ul
              role="listbox"
              className="absolute z-20 left-0 right-0 mt-1 max-h-72 overflow-auto rounded-lg border border-border bg-popover shadow-lg py-1"
            >
              {searchSuggestions.map((s, i) => (
                <li key={`${s.type}-${s.label}-${i}`}>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => { setSearchQuery(s.label); setShowSuggestions(false); }}
                    className="w-full flex items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-muted"
                  >
                    <span className="truncate">{s.label}</span>
                    <span className="text-[11px] uppercase tracking-wide text-muted-foreground shrink-0">{s.type}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Tri owner (onglet En ligne) */}
      {isOwnerView && activeOwnerTab === "active" && sits.length > 1 && (
        <div className="flex items-center justify-end gap-2 mb-3">
          <span className="text-xs text-muted-foreground">Trier</span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-xs text-foreground hover:border-primary/40 transition-colors"
              >
                {ownerSortMode === "urgent" ? "Plus urgentes" : "Plus récentes"}
                <ChevronRight className="h-3 w-3 rotate-90 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem onClick={() => setOwnerSortMode("urgent")}>
                Plus urgentes
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setOwnerSortMode("recent")}>
                Plus récentes
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}



      {/* Content */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-card rounded-xl border border-border p-4 animate-pulse">
              <div className="h-5 bg-muted rounded w-1/3 mb-3" />
              <div className="h-4 bg-muted rounded w-1/2 mb-2" />
              <div className="h-4 bg-muted rounded w-1/4" />
            </div>
          ))}
        </div>
      ) : loadError ? (
        <div
          role="alert"
          className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-center"
        >
          <AlertTriangle className="h-6 w-6 text-destructive mx-auto mb-2" aria-hidden="true" />
          <h2 className="font-heading font-semibold text-base mb-1">
            Chargement impossible
          </h2>
          <p className="text-sm text-muted-foreground mb-4">{loadError}</p>
          <Button variant="outline" size="sm" onClick={() => loadSits()} className="gap-2">
            <RefreshCw className="h-4 w-4" /> Réessayer
          </Button>
        </div>
      ) : filteredSits.length === 0 ? (
        <>
          {isOwnerView && activeOwnerTab === "active" && (
            <EmptyState
              illustration="emptyCalendar"
              title="Aucune annonce active"
              description={
                sits.length > 0
                  ? `Vous avez ${sits.length} annonce${sits.length > 1 ? "s" : ""} dans votre historique. Republiez une garde pour retrouver un gardien de confiance près de chez vous.`
                  : "Publiez votre première annonce pour trouver un gardien de confiance près de chez vous."
              }
              actionLabel={sits.length > 0 ? "Publier une nouvelle annonce" : "Publier une annonce"}
              actionTo="/sits/create"
              actionIcon={Plus}
            />
          )}
          {isOwnerView && activeOwnerTab === "drafts" && (
            <EmptyState
              illustration="emptyCalendar"
              title="Aucun brouillon"
              description="Vos annonces non publiées apparaîtront ici. Vous pouvez les compléter à tout moment."
            />
          )}
          {isOwnerView && activeOwnerTab === "past" && (
            <EmptyState
              illustration="quietLeaf"
              title="Aucune annonce passée"
              description="Vos annonces terminées, expirées, annulées ou archivées s'afficheront ici."
            />
          )}
          {!isOwnerView && activeTab === "upcoming" && (
            <EmptyState
              illustration="sitterReady"
              title="Aucune garde à venir"
              description="Consultez les annonces disponibles et postulez pour votre prochaine garde."
              actionLabel="Voir les annonces"
              actionTo="/search"
              actionIcon={Eye}
            />
          )}
          {!isOwnerView && activeTab === "in_progress" && (
            <EmptyState
              illustration="sleepingCat"
              title="Aucune garde en cours"
              description="Vos gardes en cours apparaîtront ici dès le jour J."
              actionLabel="Trouver une garde"
              actionTo="/search"
              actionIcon={Eye}
            />
          )}
          {!isOwnerView && activeTab === "completed" && (
            <EmptyState
              illustration="emptyCalendar"
              title="Aucune garde passée"
              description="Vos gardes terminées s'afficheront ici, avec les avis reçus."
              actionLabel="Trouver une garde"
              actionTo="/search"
              actionIcon={Eye}
            />
          )}
          {!isOwnerView && activeTab === "cancelled" && (
            <EmptyState
              illustration="quietLeaf"
              title="Rien à signaler ici"
              description="Les annonces et candidatures annulées apparaîtraient à cet endroit."
              actionLabel="Trouver une garde"
              actionTo="/search"
              actionIcon={Eye}
            />
          )}

        </>
      ) : (
        <div className="space-y-3">
          {filteredSits.map((sit: any) => {
            // effectiveStatus deja calcule par getOwnerEffectiveStatus dans l'enrichissement.
            // Dans l'onglet Passees, l'affichage suit directement effectiveStatus.
            const cardSit = sit;
            return (
              <SitCard
                key={sit.id + (sit.application_id || "")}
                sit={cardSit}
                isOwner={isOwnerView}
                onArchive={() => setArchiveConfirm(sit.id)}
                onDelete={() => setDeleteConfirm(sit.id)}
                onRepublish={() =>
                  isOwnerView && activeOwnerTab === "past"
                    ? setRepublishDialog({ id: sit.id, title: sit.title })
                    : handleRepublish(sit.id)
                }
                onOpenGuide={(id) => setOpenGuideId(id)}
                onWithdraw={(appId) =>
                  setWithdrawApp({
                    appId,
                    sitTitle: sit.title || "cette annonce",
                    conversationId: sit.conversationId || null,
                  })
                }
              />
            );
          })}
        </div>
      )}

      {republishDialog && (
        <RepublishAlmaDialog
          open={!!republishDialog}
          onOpenChange={(v) => !v && setRepublishDialog(null)}
          sitId={republishDialog.id}
          sourceTitle={republishDialog.title}
        />
      )}

      {/* Guide detail view */}
      {openGuideId && (
        <div className="bg-card border border-border rounded-xl overflow-hidden mt-4">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold text-foreground">Guide de la maison</span>
              <span className="text-xs text-muted-foreground">
                · {sits.find(s => s.id === openGuideId)?.owner?.first_name || sits.find(s => s.id === openGuideId)?.acceptedSitter?.first_name}
              </span>
            </div>
            <Button
              size="sm"
              variant="ghost"
              className="text-muted-foreground h-8 w-8 p-0"
              onClick={() => setOpenGuideId(null)}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          {guideLoading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          )}

          {!guideLoading && openGuide && (
            <div className="p-4 space-y-4">
              {openGuide.owner_message && (
                <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                  <p className="text-xs text-primary font-medium mb-1">
                    Un mot de {sits.find(s => s.id === openGuideId)?.owner?.first_name || "votre hôte"}
                  </p>
                  <p className="text-sm text-foreground italic">
                    "{openGuide.owner_message}"
                  </p>
                </div>
              )}

              <GuideSection title="Accès & logistique" icon={KeyRound}>
                <GuideField label="Adresse" value={openGuide.exact_address} />
                <GuideField label="Instructions clés" value={openGuide.key_instructions} />
                <GuideField label="Codes d'accès" value={openGuide.access_codes} copyable />
                <GuideField
                  label="Wifi"
                  value={openGuide.wifi_name && openGuide.wifi_password
                    ? `${openGuide.wifi_name}, ${openGuide.wifi_password}`
                    : openGuide.wifi_name ?? null}
                  copyable
                />
                <GuideField label="Instructions Wifi" value={openGuide.wifi_instructions} />
                <GuideField label="Parking" value={openGuide.parking_instructions} />
                <GuideField label="Poubelles" value={openGuide.trash_days} />
              </GuideSection>

              <GuideSection title="Logement" icon={Home}>
                <GuideField label="Chauffage" value={openGuide.heating_instructions} />
                <GuideField label="Électroménager" value={openGuide.appliance_notes} />
                <GuideField label="Zones interdites" value={openGuide.forbidden_zones} />
                <GuideField label="Plantes" value={openGuide.plants_watering} />
                <GuideField label="Courrier" value={openGuide.mail_instructions} />
              </GuideSection>

              <GuideSection title="Contacts d'urgence" icon={AlertTriangle}>
                <GuideField label="Vétérinaire" value={openGuide.vet_name} />
                <GuideField label="Tél. vétérinaire" value={openGuide.vet_phone} copyable />
                <GuideField label="Adresse vétérinaire" value={openGuide.vet_address} />
                <GuideField label="Personne de confiance" value={openGuide.neighbor_name} />
                <GuideField label="Tél. personne de confiance" value={openGuide.neighbor_phone} copyable />
                <GuideField label="Contact d'urgence proprio" value={openGuide.emergency_contact_name} />
                <GuideField label="Tél. urgence" value={openGuide.emergency_contact_phone} copyable />
                <GuideField label="Plombier" value={openGuide.plumber_phone} copyable />
                <GuideField label="Électricien" value={openGuide.electrician_phone} copyable />
              </GuideSection>

              {openGuide.detailed_instructions && (
                <GuideSection title="Instructions générales" icon={ClipboardList}>
                  <p className="text-sm text-foreground/80 whitespace-pre-wrap leading-relaxed">
                    {openGuide.detailed_instructions}
                  </p>
                </GuideSection>
              )}
            </div>
          )}

          {!guideLoading && !openGuide && (
            <div className="py-8 text-center">
              <p className="text-sm text-muted-foreground">
                Le guide n'est pas encore disponible.
              </p>
            </div>
          )}
        </div>
      )}



      {/* Confirm dialogs */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette annonce ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. L'annonce sera définitivement supprimée.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteConfirm && handleDelete(deleteConfirm)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!archiveConfirm} onOpenChange={() => setArchiveConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archiver cette annonce ?</AlertDialogTitle>
            <AlertDialogDescription>
              L'annonce sera masquée de la liste. Vous pourrez la republier plus tard.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={() => archiveConfirm && handleArchive(archiveConfirm)}>
              Archiver
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Retrait de candidature (gardien) */}
      <AlertDialog open={!!withdrawApp} onOpenChange={(o) => { if (!o && !withdrawing) setWithdrawApp(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Retirer votre candidature ?</AlertDialogTitle>
            <AlertDialogDescription>
              Vous êtes sûr de retirer votre candidature pour cette garde ? Le propriétaire recevra une notification et pourra continuer à traiter les autres candidats.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={withdrawing}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              disabled={withdrawing}
              onClick={async (e) => {
                e.preventDefault();
                if (!withdrawApp || !user) return;
                setWithdrawing(true);
                try {
                  // Enum applications.status ne contient pas 'withdrawn' : on utilise
                  // 'cancelled' (candidature annulée par le gardien). Aucune migration
                  // BDD nécessaire, comportement UX identique.
                  const { error } = await supabase
                    .from("applications")
                    .update({ status: "cancelled" as any })
                    .eq("id", withdrawApp.appId)
                    .eq("sitter_id", user.id);
                  if (error) throw error;

                  if (withdrawApp.conversationId) {
                    await supabase.from("messages").insert({
                      conversation_id: withdrawApp.conversationId,
                      sender_id: user.id,
                      content: "Le gardien a retiré sa candidature.",
                      is_system: true,
                    });
                  }
                  toast({ title: "Candidature retirée" });
                  setWithdrawApp(null);
                  loadSits();
                } catch (err: any) {
                  console.error("[Sits] withdraw failed", err);
                  toast({
                    variant: "destructive",
                    title: "Retrait impossible",
                    description: "Réessayez dans un instant.",
                  });
                } finally {
                  setWithdrawing(false);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {withdrawing ? "Retrait…" : "Retirer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>


      {/* Sticky CTA mobile owner, visible dès qu'il y a au moins une annonce */}
      {isOwnerView && sits.length > 0 && (
        <MobileStickyCTA label="Publier une annonce" to="/sits/create" />
      )}
    </div>
  );
};

/* ── Card ── */
const SitCard = ({
  sit, isOwner, onArchive, onDelete, onRepublish, onOpenGuide, onWithdraw,
}: {
  sit: any; isOwner: boolean;
  onArchive: () => void; onDelete: () => void; onRepublish: () => void; onOpenGuide: (id: string) => void;
  onWithdraw?: (appId: string) => void;
}) => {
  const effectiveStatus = sit.effectiveStatus || sit.status;
  const duration = getDuration(sit.start_date, sit.end_date);
  // Couverture : photo de couv choisie sur la fiche en priorité, puis 1re photo de la galerie owner, puis ancien fallback property.
  const photo = sit.cover_photo_url || sit.ownerGalleryFirstPhoto || sit.properties?.photos?.[0];

  const otherParty = isOwner ? sit.acceptedSitter : sit.owner;

  // Titre principal : on respecte le titre saisi par le propriétaire.
  // Fallback automatique uniquement si aucun titre n'a été défini.
  const petNames = sit.pets?.map((p: any) => capitalize(p.name)).join(" + ") || "";
  const dateRange = sit.start_date && sit.end_date
    ? `${formatShortDate(sit.start_date)} → ${formatShortDate(sit.end_date)}`
    : "";
  const fallbackTitle = petNames && dateRange
    ? `${petNames} · ${dateRange}`
    : petNames || dateRange || "Sans titre";
  const displayTitle = (sit.title && sit.title.trim()) ? sit.title : fallbackTitle;
  // Ville (côté propriétaire = sa propre ville via property/owner ; côté gardien = ville du proprio)
  const city = sit.ownerCity || sit.properties?.city || otherParty?.city || sit.owner?.city || null;

  // Status badge
  let displayStatus: { label: string; className: string };
  if (isOwner) {
    if (effectiveStatus === "published" && sit.applicationCount > 0) {
      displayStatus = statusConfig.published_with_apps;
    } else {
      displayStatus = statusConfig[effectiveStatus] || statusConfig.draft;
    }
  } else {
    const appStatus = sit.application_status;
    if (appStatus === "accepted" && ["confirmed", "in_progress", "completed"].includes(effectiveStatus)) {
      displayStatus = statusConfig[effectiveStatus];
    } else if (
      appStatus === "cancelled"
      && sit.status === "draft"
      && (sit.last_unpublished_reason === "found_offline" || sit.last_unpublished_reason === "found_onplatform")
    ) {
      // Le propriétaire a dépublié en indiquant avoir trouvé un gardien → message dédié
      displayStatus = appStatusConfig.owner_found;
    } else if (appStatus === "cancelled" && sit.status === "draft" && sit.unpublished_at) {
      // Dépubliée pour une autre raison (plans changés, etc.)
      displayStatus = appStatusConfig.owner_withdrew;
    } else {
      displayStatus = appStatusConfig[appStatus] || statusConfig[effectiveStatus] || statusConfig.draft;
    }
  }

  // Urgent badge: start_date < now + 48h and not confirmed/completed
  const isUrgent = sit.is_urgent || (
    sit.start_date &&
    !["confirmed", "completed", "cancelled"].includes(effectiveStatus) &&
    differenceInDays(parseISO(sit.start_date), new Date()) < 2
  );

  return (
    <div className="bg-card rounded-xl border border-border hover:shadow-md transition-shadow overflow-hidden group">
      {/* In progress banner */}
      {effectiveStatus === "in_progress" && (
        <div className="bg-primary text-primary-foreground px-4 py-2 text-xs font-medium flex items-center gap-2">
          <Clock className="h-3.5 w-3.5" />
          Garde en cours
          {sit.end_date && (() => {
            const remaining = differenceInDays(parseISO(sit.end_date), new Date());
            return remaining > 0 ? `, ${remaining} jour${remaining > 1 ? "s" : ""} restant${remaining > 1 ? "s" : ""}` : ", Dernier jour";
          })()}
        </div>
      )}

      <div className="flex">
        {/* Thumbnail */}
        <div className="shrink-0 hidden sm:block">
          {photo ? (
            <img src={photo} alt="" className="w-28 h-full min-h-[6rem] object-cover" />
          ) : (
            <div className="w-28 h-full min-h-[6rem] bg-muted flex items-center justify-center">
              <ImageIcon className="h-6 w-6 text-muted-foreground/30" />
            </div>
          )}
        </div>

        <div className="flex-1 p-4">
          {/* Top row */}
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <Link to={`/sits/${sit.id}`} className="hover:underline">
                <h3 className="font-heading font-semibold truncate text-sm md:text-base">
                  {displayTitle}
                </h3>
              </Link>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                {city && (
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <MapPin className="h-3 w-3" /> {city}
                  </span>
                )}
                {dateRange && (
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-3 w-3" /> {dateRange}
                    {duration && <span className="text-muted-foreground/70">· {duration}</span>}
                  </span>
                )}
                {sit.flexible_dates && (
                  <span className="text-xs px-1.5 py-0.5 rounded bg-accent text-muted-foreground font-medium">
                    Dates flexibles
                  </span>
                )}
                {isUrgent && effectiveStatus !== "expired" && (
                  <span className="text-xs px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 font-medium">
                    Urgent
                  </span>
                )}
                {isOwner && sit.applicationCount > 0 && effectiveStatus === "published" && (
                  <span className="text-xs text-blue-600 font-medium flex items-center gap-1">
                    <Users className="h-3 w-3" /> {sit.applicationCount} candidature{sit.applicationCount > 1 ? "s" : ""}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {isOwner && sit.pendingApplicationCount > 0 && (
                <span
                  className="min-w-[20px] h-5 rounded-full bg-destructive text-destructive-foreground text-[11px] font-bold inline-flex items-center justify-center px-1.5"
                  aria-label={`${sit.pendingApplicationCount} candidature${sit.pendingApplicationCount > 1 ? "s" : ""} en attente`}
                  title={`${sit.pendingApplicationCount} candidature${sit.pendingApplicationCount > 1 ? "s" : ""} en attente`}
                >
                  {sit.pendingApplicationCount}
                </span>
              )}
              <span className={cn("px-2.5 py-1 rounded-full text-xs font-medium inline-flex items-center gap-1.5", displayStatus.className)}>
                {(displayStatus as any).pulse && (
                  <span className="relative flex h-1.5 w-1.5" aria-hidden="true">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success/70 opacity-75" />
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-success" />
                  </span>
                )}
                {displayStatus.label}
              </span>
              {isOwner && (
                <ActionsMenu
                  sit={sit}
                  effectiveStatus={effectiveStatus}
                  onArchive={onArchive}
                  onDelete={onDelete}
                  onRepublish={onRepublish}
                />
              )}
            </div>
          </div>

          {/* Sitter meta : envoi + consultation par le propriétaire */}
          {!isOwner && sit.application_status === "pending" && sit.application_created_at && (() => {
            const sent = `Envoyée ${
              (() => {
                try {
                  const d = new Date(sit.application_created_at);
                  const days = Math.max(0, Math.floor((Date.now() - d.getTime()) / 86400000));
                  return days === 0 ? "aujourd'hui" : days === 1 ? "il y a 1 jour" : `il y a ${days} jours`;
                } catch { return ""; }
              })()
            }`;
            const viewedLabel = sit.application_viewed_at
              ? (() => {
                  const d = new Date(sit.application_viewed_at);
                  const days = Math.max(0, Math.floor((Date.now() - d.getTime()) / 86400000));
                  return days === 0
                    ? "Vue par le propriétaire aujourd'hui"
                    : days === 1
                      ? "Vue par le propriétaire il y a 1 jour"
                      : `Vue par le propriétaire il y a ${days} jours`;
                })()
              : "En attente de consultation";
            return (
              <div className="mt-2 flex flex-col gap-0.5">
                <span className="text-xs text-muted-foreground">{sent}</span>
                <span className="text-xs text-muted-foreground">{viewedLabel}</span>
              </div>
            );
          })()}

          {/* Other party */}
          {otherParty && (
            <div className="flex items-center gap-2 mt-3">
              <Avatar className="h-7 w-7">
                <AvatarImage src={otherParty.avatar_url} />
                <AvatarFallback className="text-xs font-semibold bg-primary/10 text-primary">
                  {otherParty.first_name?.charAt(0) || "?"}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium">{capitalize(otherParty.first_name || "")}</span>
              {otherParty.city && (
                <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                  <MapPin className="h-3 w-3" /> {otherParty.city}
                </span>
              )}
            </div>
          )}

          {/* Chat preview (sitter side) */}
          {!isOwner && sit.lastMessage && (
            <Link
              to={sit.conversationId ? `/messages?c=${sit.conversationId}` : "/messages"}
              className="mt-3 flex items-start gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2 hover:bg-muted/60 transition-colors"
            >
              <MessageCircle className="h-3.5 w-3.5 mt-0.5 text-muted-foreground shrink-0" />
              <div className="min-w-0 flex-1">
                <p className={cn(
                  "text-xs truncate",
                  sit.unreadCount > 0 ? "text-foreground font-medium" : "text-muted-foreground"
                )}>
                  {sit.lastMessage.from_me ? "Vous : " : ""}{sit.lastMessage.content}
                </p>
                <p className="text-[10px] text-muted-foreground/70 mt-0.5">
                  {format(parseISO(sit.lastMessage.created_at), "d MMM, HH:mm", { locale: fr })}
                </p>
              </div>
              {sit.unreadCount > 0 && (
                <span className="shrink-0 bg-primary text-primary-foreground text-[10px] font-semibold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1.5">
                  {sit.unreadCount}
                </span>
              )}
            </Link>
          )}

          {/* Quick actions */}
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            <QuickActions sit={sit} isOwner={isOwner} effectiveStatus={effectiveStatus} onRepublish={onRepublish} onOpenGuide={onOpenGuide} onWithdraw={onWithdraw} />
          </div>

        </div>
      </div>
    </div>
  );
};

/* ── Quick actions ── */
const QuickActions = ({
  sit, isOwner, effectiveStatus, onRepublish, onOpenGuide, onWithdraw,
}: {
  sit: any; isOwner: boolean; effectiveStatus: string; onRepublish: () => void; onOpenGuide: (id: string) => void;
  onWithdraw?: (appId: string) => void;
}) => {
  const btnClass = "text-xs font-medium flex items-center gap-1 px-2.5 py-1.5 rounded-lg transition-colors";

  if (!isOwner && (effectiveStatus === "in_progress" || effectiveStatus === "confirmed") && sit.application_status === "accepted") {
    const startDate = sit.start_date ? new Date(sit.start_date) : null;
    const endDate = sit.end_date ? new Date(sit.end_date) : null;
    const today = new Date();
    const guideExists = !!sit.houseGuide?.published;
    const guideAccessible = startDate && endDate && isWithinInterval(today, {
      start: startOfDay(startDate),
      end: endOfDay(endDate),
    });

    return (
      <>
        {sit.conversationId ? (
          <Link
            to={`/messages?c=${sit.conversationId}`}
            className={cn(btnClass, "bg-primary/10 text-primary hover:bg-primary/20")}
          >
            <MessageCircle className="h-3.5 w-3.5" /> Message
          </Link>
        ) : (
          <span className={cn(btnClass, "bg-primary/10 text-primary opacity-50 cursor-not-allowed")}>
            <MessageCircle className="h-3.5 w-3.5" /> Message
          </span>
        )}

        {!guideExists ? (
          <span className={cn(btnClass, "border border-border text-muted-foreground cursor-default")}>
            <BookOpen className="h-3.5 w-3.5" /> Pas de guide
          </span>
        ) : guideAccessible ? (
          <button
            onClick={() => onOpenGuide(sit.id)}
            className={cn(btnClass, "bg-primary text-primary-foreground hover:bg-primary/90")}
          >
            <BookOpen className="h-3.5 w-3.5" /> Guide de la maison
          </button>
        ) : startDate ? (
          <span className={cn(btnClass, "border border-border text-muted-foreground cursor-default")}>
            <Lock className="h-3.5 w-3.5" /> Dispo le {format(startDate, 'dd MMM', { locale: fr })}
          </span>
        ) : null}
      </>
    );
  }

  if (effectiveStatus === "in_progress" && isOwner) {
    const messageHref = sit.conversationId ? `/messages?c=${sit.conversationId}` : "/messages";
    return (
      <>
        <Link to={messageHref} className={cn(btnClass, "bg-primary/10 text-primary hover:bg-primary/20")}>
          <MessageSquare className="h-3.5 w-3.5" /> Contacter
        </Link>
        {sit.property_id && (
          <Link to={`/house-guide/${sit.property_id}`} className={cn(btnClass, "bg-accent text-muted-foreground hover:text-foreground")}>
            <BookOpen className="h-3.5 w-3.5" /> Guide
          </Link>
        )}
      </>
    );
  }

  if (effectiveStatus === "confirmed" && isOwner) {
    const messageHref = sit.conversationId ? `/messages?c=${sit.conversationId}` : "/messages";
    return (
      <>
        <Link to={`/sits/${sit.id}`} className={cn(btnClass, "bg-primary/10 text-primary hover:bg-primary/20")}>
          <ChevronRight className="h-3.5 w-3.5" /> Voir la garde
        </Link>
        <Link to={messageHref} className={cn(btnClass, "bg-accent text-muted-foreground hover:text-foreground")}>
          <MessageSquare className="h-3.5 w-3.5" /> Contacter
        </Link>
      </>
    );
  }

  if (effectiveStatus === "completed") {
    return (
      <>
        {!sit.hasReviewed && (
          <Link to={`/review/${sit.id}`} className={cn(btnClass, "bg-secondary/10 text-secondary hover:bg-secondary/20")}>
            <Star className="h-3.5 w-3.5" /> Laisser un avis
          </Link>
        )}
        {sit.hasReviewed && (
          <span className={cn(btnClass, "bg-accent text-muted-foreground cursor-default")}>
            <CheckCircle className="h-3.5 w-3.5" /> Avis laissé
          </span>
        )}
      </>
    );
  }

  if (effectiveStatus === "published" && isOwner) {
    const count = sit.applicationCount || 0;
    return (
      <>
        {count > 0 ? (
          <Link to={`/sits/${sit.id}`} className={cn(btnClass, "bg-primary text-primary-foreground hover:bg-primary/90")}>
            <Users className="h-3.5 w-3.5" /> Voir {count} candidature{count > 1 ? "s" : ""}
          </Link>
        ) : (
          <span className={cn(btnClass, "border border-border text-muted-foreground cursor-default")}>
            Aucune candidature
          </span>
        )}
        <Link to={`/sits/${sit.id}/edit`} className={cn(btnClass, "bg-accent text-muted-foreground hover:text-foreground")}>
          <Pencil className="h-3.5 w-3.5" /> Modifier
        </Link>
      </>
    );
  }

  if (effectiveStatus === "expired" || effectiveStatus === "unpublished" || effectiveStatus === "archived") {
    return (
      <>
        <button onClick={onRepublish} className={cn(btnClass, "bg-primary/10 text-primary hover:bg-primary/20")}>
          <RefreshCw className="h-3.5 w-3.5" /> Republier
        </button>
      </>
    );
  }

  if (effectiveStatus === "draft" && isOwner) {
    return (
      <Link to={`/sits/create?draftId=${sit.id}`} className={cn(btnClass, "bg-accent text-muted-foreground hover:text-foreground")}>
        <Pencil className="h-3.5 w-3.5" /> Reprendre
      </Link>
    );
  }

  if (!isOwner && ["pending", "viewed", "discussing"].includes(sit.application_status)) {
    return (
      <>
        <Link to={`/sits/${sit.id}`} className={cn(btnClass, "bg-accent text-muted-foreground hover:text-foreground")}>
          <ChevronRight className="h-3.5 w-3.5" /> Voir l'annonce
        </Link>
        {sit.conversationId && (
          <Link
            to={`/messages?c=${sit.conversationId}`}
            className={cn(btnClass, "border border-primary/40 text-primary hover:bg-primary/10")}
          >
            <MessageCircle className="h-3.5 w-3.5" /> Ouvrir la conversation
          </Link>
        )}
        {sit.application_status === "pending" && sit.application_id && onWithdraw && (
          <button
            type="button"
            onClick={() => onWithdraw(sit.application_id)}
            className={cn(btnClass, "text-muted-foreground hover:text-destructive ml-auto")}
          >
            Retirer ma candidature
          </button>
        )}
      </>
    );
  }

  // Gardien dont la candidature a été annulée car le propriétaire a trouvé
  // → rebond direct vers la recherche pré-filtrée (même ville + dates)
  if (
    !isOwner &&
    effectiveStatus === "cancelled" &&
    sit.status === "draft" &&
    (sit.last_unpublished_reason === "found_offline" || sit.last_unpublished_reason === "found_onplatform")
  ) {
    const params = new URLSearchParams();
    const city = sit.ownerCity || sit.properties?.city || sit.owner?.city || null;
    if (city) params.set("ville", city);
    if (sit.start_date) params.set("debut", sit.start_date);
    if (sit.end_date) params.set("fin", sit.end_date);
    const qs = params.toString();
    const searchHref = qs ? `/search?${qs}` : "/search";
    const hasContext = Boolean(city || sit.start_date || sit.end_date);
    const label = hasContext ? "Voir les gardes similaires" : "Voir les autres gardes";
    return (
      <Link to={searchHref} className={cn(btnClass, "bg-primary/10 text-primary hover:bg-primary/20")}>
        <Search className="h-3.5 w-3.5" /> {label}
      </Link>
    );
  }

  if (effectiveStatus === "cancelled") {
    return (
      <Link to={`/sits/${sit.id}`} className={cn(btnClass, "bg-accent text-muted-foreground hover:text-foreground")}>
        <Eye className="h-3.5 w-3.5" /> Voir les détails
      </Link>
    );
  }

  return null;
};

/* ── Context menu ── */
const ActionsMenu = ({
  sit, effectiveStatus, onArchive, onDelete, onRepublish,
}: {
  sit: any; effectiveStatus: string;
  onArchive: () => void; onDelete: () => void; onRepublish: () => void;
}) => {
  const showMenu = ["confirmed", "in_progress", "published", "draft", "expired", "cancelled", "unpublished", "archived"].includes(effectiveStatus);
  if (!showMenu) return null;

  const canEdit = ["draft", "published", "unpublished"].includes(effectiveStatus);
  const canRepublish = ["expired", "cancelled", "unpublished", "archived"].includes(effectiveStatus);
  const canArchive = ["published", "draft"].includes(effectiveStatus) && sit.applicationCount > 0;
  const canDelete = ["published", "draft", "expired", "cancelled", "unpublished", "archived"].includes(effectiveStatus) && sit.applicationCount === 0;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="p-1.5 rounded-md hover:bg-accent transition-colors"
          aria-label="Actions sur l'annonce"
        >
          <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuItem asChild>
          <Link to={`/sits/${sit.id}`} className="flex items-center gap-2">
            <Eye className="h-4 w-4" /> Voir l'annonce
          </Link>
        </DropdownMenuItem>
        {canEdit && (
          <DropdownMenuItem asChild>
            <Link to={`/sits/${sit.id}/edit`} className="flex items-center gap-2">
              <Pencil className="h-4 w-4" /> Modifier
            </Link>
          </DropdownMenuItem>
        )}
        {(effectiveStatus === "confirmed" || effectiveStatus === "in_progress") && sit.property_id && (
          <DropdownMenuItem asChild>
            <Link to={`/house-guide/${sit.property_id}`} className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" /> Guide de la maison
            </Link>
          </DropdownMenuItem>
        )}
        {canRepublish && (
          <DropdownMenuItem onClick={onRepublish} className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4" /> Republier
          </DropdownMenuItem>
        )}
        {(canArchive || canDelete) && <DropdownMenuSeparator />}
        {canArchive && (
          <DropdownMenuItem onClick={onArchive} className="flex items-center gap-2 text-muted-foreground">
            <Archive className="h-4 w-4" /> Archiver
          </DropdownMenuItem>
        )}
        {canDelete && (
          <DropdownMenuItem onClick={onDelete} className="flex items-center gap-2 text-destructive">
            <Trash2 className="h-4 w-4" /> Supprimer
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

/* ── Guide section ── */
const GuideSection = ({
  title,
  icon: SectionIcon,
  children,
}: {
  title: string;
  icon: LucideIcon;
  children: React.ReactNode;
}) => (
  <div className="space-y-2">
    <div className="flex items-center gap-1.5">
      <SectionIcon className="w-3.5 h-3.5 text-muted-foreground" />
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </p>
    </div>
    <div className="bg-muted/30 rounded-lg p-3 space-y-3">
      {children}
    </div>
  </div>
);

/* ── Guide field ── */
const GuideField = ({
  label,
  value,
  copyable = false,
}: {
  label: string;
  value: string | null | undefined;
  copyable?: boolean;
}) => {
  const [copied, setCopied] = useState(false);

  if (!value?.trim()) return null;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex items-start justify-between gap-3">
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
        <p className="text-sm text-foreground break-words">{value}</p>
      </div>
      {copyable && (
        <button
          onClick={handleCopy}
          className="shrink-0 mt-3 p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          title="Copier"
        >
          {copied
            ? <Check className="w-3.5 h-3.5 text-primary" />
            : <Copy className="w-3.5 h-3.5" />
          }
        </button>
      )}
    </div>
  );
};

export default Sits;
