import { useAuth } from "@/contexts/AuthContext";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  Plus, Calendar, MessageSquare, Star, Users, Eye, BookOpen,
  MapPin, Clock, MoreHorizontal, XCircle, CheckCircle,
  Image as ImageIcon, ChevronRight, Archive, Trash2, RefreshCw,
  AlertTriangle, Pencil, Lock, MessageCircle,
  KeyRound, Home, ClipboardList, X, Copy, Check, Loader2,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import EmptyState from "@/components/shared/EmptyState";
import { useEffect, useState, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
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

/* ── Status configs ── */
const statusConfig: Record<string, { label: string; className: string }> = {
  draft: { label: "Brouillon", className: "bg-muted text-muted-foreground" },
  published: { label: "En attente", className: "bg-muted text-muted-foreground" },
  published_with_apps: { label: "Candidature(s) reçue(s)", className: "bg-blue-50 text-blue-700 border border-blue-200" },
  confirmed: { label: "Garde confirmée", className: "bg-emerald-50 text-emerald-700 border border-emerald-200" },
  in_progress: { label: "En cours", className: "bg-emerald-50 text-emerald-700 border border-emerald-200" },
  completed: { label: "Terminée", className: "bg-muted text-foreground" },
  cancelled: { label: "Annulée", className: "bg-destructive/10 text-destructive" },
  expired: { label: "Expirée", className: "bg-red-50 text-red-600 border border-red-100" },
};

const appStatusConfig: Record<string, { label: string; className: string }> = {
  pending: { label: "Envoyée", className: "bg-muted text-muted-foreground" },
  viewed: { label: "Consultée", className: "bg-secondary/10 text-secondary" },
  discussing: { label: "En discussion", className: "bg-accent text-foreground" },
  accepted: { label: "Acceptée", className: "bg-emerald-50 text-emerald-700" },
  rejected: { label: "Déclinée", className: "bg-destructive/10 text-destructive" },
  cancelled: { label: "Annulée", className: "bg-destructive/10 text-destructive" },
};

type Tab = "upcoming" | "in_progress" | "completed" | "cancelled";

const tabs: { value: Tab; label: string; icon: typeof Calendar }[] = [
  { value: "upcoming", label: "À venir", icon: Calendar },
  { value: "in_progress", label: "En cours", icon: Clock },
  { value: "completed", label: "Passées", icon: CheckCircle },
  { value: "cancelled", label: "Annulées", icon: XCircle },
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

const Sits = () => {
  const { user, activeRole } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [sits, setSits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Onglet actif synchronisé avec l'URL (?tab=...) — partageable, retour navigateur OK
  const validTabs: Tab[] = ["upcoming", "in_progress", "completed", "cancelled"];
  const urlTab = searchParams.get("tab") as Tab | null;
  const activeTab: Tab = urlTab && validTabs.includes(urlTab) ? urlTab : "upcoming";
  const setActiveTab = useCallback((tab: Tab) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (tab === "upcoming") next.delete("tab");
      else next.set("tab", tab);
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  const [showArchived, setShowArchived] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [archiveConfirm, setArchiveConfirm] = useState<string | null>(null);
  const [openGuideId, setOpenGuideId] = useState<string | null>(null);
  const [openGuide, setOpenGuide] = useState<any | null>(null);
  const [guideLoading, setGuideLoading] = useState(false);

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

    if (activeRole === "owner") {
      const { data } = await supabase
        .from("sits")
        .select("*, properties(type, environment, photos, user_id)")
        .eq("user_id", user.id)
        .order("start_date", { ascending: false, nullsFirst: false });

      // Auto-expire sits client-side
      const toExpire = (data || []).filter((s: any) =>
        s.end_date && ["published"].includes(s.status) && isBefore(parseISO(s.end_date), new Date())
      );
      if (toExpire.length > 0) {
        // Mark as cancelled with reason 'expired' in DB
        for (const s of toExpire) {
          await supabase.from("sits").update({
            status: "cancelled" as any,
            cancellation_reason: "expired",
          }).eq("id", s.id);
        }
      }

      const enriched = await Promise.all(
        (data || []).map(async (sit: any) => {
          const [appRes, sitterRes, petRes, reviewRes] = await Promise.all([
            supabase.from("applications").select("id, sitter_id, status").eq("sit_id", sit.id),
            supabase.from("applications")
              .select("sitter_id, sitter:profiles!applications_sitter_id_fkey(first_name, avatar_url, city)")
              .eq("sit_id", sit.id).eq("status", "accepted").maybeSingle(),
            supabase.from("pets").select("name, species").eq("property_id", sit.property_id),
            supabase.from("reviews").select("id").eq("sit_id", sit.id).eq("reviewer_id", user.id).maybeSingle(),
          ]);

          return {
            ...sit,
            // Override status for expired ones we just updated
            status: toExpire.find((e: any) => e.id === sit.id) ? "cancelled" : sit.status,
            cancellation_reason: toExpire.find((e: any) => e.id === sit.id) ? "expired" : sit.cancellation_reason,
            effectiveStatus: getEffectiveStatus({
              ...sit,
              status: toExpire.find((e: any) => e.id === sit.id) ? "cancelled" : sit.status,
            }),
            applicationCount: appRes.data?.length || 0,
            pendingApplicationCount: appRes.data?.filter((a: any) => a.status === "pending").length || 0,
            acceptedSitter: sitterRes.data?.sitter ? sitterRes.data.sitter : null,
            pets: petRes.data || [],
            hasReviewed: !!reviewRes.data,
          };
        })
      );
      setSits(enriched);
    } else {
      // Sitter view
      const { data } = await supabase
        .from("applications")
        .select("*, sit:sits(*, properties(type, environment, photos), owner:profiles!sits_user_id_fkey(first_name, avatar_url, city, id))")
        .eq("sitter_id", user.id)
        .order("created_at", { ascending: false });

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

      // For accepted sits (confirmed/in_progress), load guide + conversation
      const acceptedSits = (data || []).filter((a: any) =>
        a.status === "accepted" && ["confirmed", "in_progress"].includes(a.sit?.status)
      );

      const guideMap: Record<string, { id: string; published: boolean } | null> = {};
      const convMap: Record<string, string | null> = {};

      await Promise.all(acceptedSits.map(async (a: any) => {
        const sitId = a.sit?.id;
        const ownerId = a.sit?.user_id;
        if (!sitId || !ownerId) return;

        const [guideRes, convRes] = await Promise.all([
          supabase
            .from("house_guides")
            .select("id, published")
            .eq("user_id", ownerId)
            .eq("published", true)
            .maybeSingle(),
          supabase
            .from("conversations")
            .select("id")
            .eq("sit_id", sitId)
            .or(`owner_id.eq.${ownerId},sitter_id.eq.${user.id}`)
            .maybeSingle(),
        ]);

        guideMap[sitId] = guideRes.data || null;
        convMap[sitId] = convRes.data?.id || null;
      }));

      setSits(
        data?.map((a: any) => ({
          ...a.sit,
          effectiveStatus: getEffectiveStatus(a.sit),
          application_status: a.status,
          application_id: a.id,
          owner: a.sit?.owner || null,
          hasReviewed: reviewedSitIds.includes(a.sit?.id),
          pets: petsByProperty[a.sit?.property_id] || [],
          houseGuide: guideMap[a.sit?.id] || null,
          conversationId: convMap[a.sit?.id] || null,
        })) || []
      );
    }
    setLoading(false);
  }, [user, activeRole]);

  useEffect(() => { loadSits(); }, [loadSits]);

  const handleArchive = async (sitId: string) => {
    await supabase.from("sits").update({
      status: "cancelled" as any,
      cancellation_reason: "archived",
    }).eq("id", sitId).eq("user_id", user!.id);
    toast({ title: "Annonce archivée" });
    setArchiveConfirm(null);
    loadSits();
  };

  const handleDelete = async (sitId: string) => {
    await supabase.from("sits").delete().eq("id", sitId).eq("user_id", user!.id);
    toast({ title: "Annonce supprimée" });
    setDeleteConfirm(null);
    loadSits();
  };

  const handleRepublish = async (sitId: string) => {
    const today = new Date().toISOString().split("T")[0];
    await supabase.from("sits").update({
      status: "published" as any,
      cancellation_reason: null,
      cancelled_at: null,
      cancelled_by: null,
    }).eq("id", sitId).eq("user_id", user!.id);
    toast({ title: "Annonce republiée" });
    loadSits();
  };

  // Separate active from archived/expired
  const isArchived = (s: any) =>
    s.status === "cancelled" && (s.cancellation_reason === "archived" || s.cancellation_reason === "expired");
  const isExpired = (s: any) => s.cancellation_reason === "expired";

  const activeSits = useMemo(() => sits.filter(s => !isArchived(s)), [sits]);
  const archivedSits = useMemo(() => sits.filter(s => isArchived(s)), [sits]);

  const tabCounts = useMemo(() => {
    const counts: Record<Tab, number> = { upcoming: 0, in_progress: 0, completed: 0, cancelled: 0 };
    activeSits.forEach((s) => {
      const es = s.effectiveStatus || s.status;
      if (activeRole === "owner") {
        if (es === "in_progress") counts.in_progress++;
        else if (es === "cancelled") counts.cancelled++;
        else if (es === "completed") counts.completed++;
        else counts.upcoming++;
      } else {
        const appStatus = s.application_status;
        if (appStatus === "cancelled" || appStatus === "rejected" || es === "cancelled") counts.cancelled++;
        else if (es === "completed") counts.completed++;
        else if (es === "in_progress" && appStatus === "accepted") counts.in_progress++;
        else counts.upcoming++;
      }
    });
    return counts;
  }, [activeSits, activeRole]);

  const filteredSits = useMemo(() => {
    return activeSits.filter((s) => {
      const es = s.effectiveStatus || s.status;
      const appStatus = s.application_status;
      if (activeRole === "owner") {
        switch (activeTab) {
          case "in_progress": return es === "in_progress";
          case "completed": return es === "completed";
          case "cancelled": return es === "cancelled";
          case "upcoming": return !["in_progress", "completed", "cancelled"].includes(es);
        }
      } else {
        switch (activeTab) {
          case "in_progress": return es === "in_progress" && appStatus === "accepted";
          case "completed": return es === "completed";
          case "cancelled": return appStatus === "cancelled" || appStatus === "rejected" || es === "cancelled";
          case "upcoming": return !["completed", "cancelled"].includes(es) && !["cancelled", "rejected"].includes(appStatus) && es !== "in_progress";
        }
      }
      return false;
    });
  }, [activeSits, activeRole, activeTab]);

  // Sous-titre contextuel : informations utiles plutôt que générique
  const headerSubtitle = useMemo(() => {
    const upcoming = tabCounts.upcoming;
    const inProgress = tabCounts.in_progress;
    if (activeRole === "owner") {
      const pendingApps = activeSits.reduce((sum, s) => sum + (s.pendingApplicationCount || 0), 0);
      const parts: string[] = [];
      if (pendingApps > 0) parts.push(`${pendingApps} candidature${pendingApps > 1 ? "s" : ""} en attente`);
      if (inProgress > 0) parts.push(`${inProgress} garde${inProgress > 1 ? "s" : ""} en cours`);
      else if (upcoming > 0) parts.push(`${upcoming} annonce${upcoming > 1 ? "s" : ""} active${upcoming > 1 ? "s" : ""}`);
      return parts.length > 0 ? parts.join(" · ") : "Gérez vos annonces et suivez vos gardes.";
    } else {
      const parts: string[] = [];
      if (inProgress > 0) parts.push(`${inProgress} garde${inProgress > 1 ? "s" : ""} en cours`);
      if (upcoming > 0) parts.push(`${upcoming} à venir`);
      return parts.length > 0 ? parts.join(" · ") : "Suivez vos candidatures et gardes.";
    }
  }, [tabCounts, activeSits, activeRole]);

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto animate-fade-in pb-24 md:pb-8">
      <Helmet><meta name="robots" content="noindex, nofollow" /></Helmet>
      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-6">
        <div className="min-w-0">
          <h1 className="font-heading text-2xl md:text-3xl font-bold mb-1">
            {activeRole === "owner" ? "Mes annonces" : "Mes gardes"}
          </h1>
          <p className="text-muted-foreground text-sm truncate">
            {headerSubtitle}
          </p>
        </div>
        {activeRole === "owner" ? (
          <Link to="/sits/create" className="shrink-0">
            <Button className="gap-2">
              <Plus className="h-4 w-4" /> Publier
            </Button>
          </Link>
        ) : (
          <Link to="/search" className="shrink-0">
            <Button variant="outline" className="gap-2">
              <Eye className="h-4 w-4" /> Voir les annonces
            </Button>
          </Link>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-6 scrollbar-hide">
        {tabs.map((tab) => (
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
        ))}
      </div>

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
      ) : filteredSits.length === 0 ? (
        <>
          {activeTab === "upcoming" && activeRole === "owner" && (
            <EmptyState
              illustration="emptyCalendar"
              title="Aucune annonce à venir"
              description="Publiez votre première annonce pour trouver un gardien de confiance près de chez vous."
              actionLabel="Publier une annonce"
              actionTo="/sits/create"
              actionIcon={Plus}
            />
          )}
          {activeTab === "upcoming" && activeRole === "sitter" && (
            <EmptyState
              illustration="sitterReady"
              title="Aucune garde à venir"
              description="Consultez les annonces disponibles et postulez pour votre prochaine garde."
              actionLabel="Voir les annonces"
              actionTo="/search"
              actionIcon={Eye}
            />
          )}
          {activeTab === "in_progress" && (
            <EmptyState illustration="sleepingCat" title="Aucune garde en cours" description="Vos gardes en cours apparaîtront ici." />
          )}
          {activeTab === "completed" && (
            <EmptyState illustration="sleepingCat" title="Aucune garde passée" description="Vos gardes terminées apparaîtront ici." />
          )}
          {activeTab === "cancelled" && (
            <EmptyState illustration="sleepingCat" title="Aucune garde annulée" description="Tant mieux ! Aucune annulation pour le moment." />
          )}
        </>
      ) : (
        <div className="space-y-3">
          {filteredSits.map((sit: any) => (
            <SitCard
              key={sit.id + (sit.application_id || "")}
              sit={sit}
              isOwner={activeRole === "owner"}
              onArchive={() => setArchiveConfirm(sit.id)}
              onDelete={() => setDeleteConfirm(sit.id)}
              onRepublish={() => handleRepublish(sit.id)}
              onOpenGuide={(id) => setOpenGuideId(id)}
            />
          ))}
        </div>
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
                    ? `${openGuide.wifi_name} — ${openGuide.wifi_password}`
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

      {/* Archived section */}
      {activeRole === "owner" && archivedSits.length > 0 && (
        <div className="mt-10 border-t border-border pt-6">
          <button
            onClick={() => setShowArchived(!showArchived)}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2"
          >
            <Archive className="h-4 w-4" />
            {showArchived ? "Masquer" : "Voir"} les annonces archivées ({archivedSits.length})
          </button>
          {showArchived && (
            <div className="space-y-3 mt-4">
              {archivedSits.map((sit: any) => (
                <SitCard
                  key={sit.id}
                  sit={{ ...sit, effectiveStatus: isExpired(sit) ? "expired" : "cancelled" }}
                  isOwner
                  onArchive={() => {}}
                  onDelete={() => setDeleteConfirm(sit.id)}
                  onRepublish={() => handleRepublish(sit.id)}
                  onOpenGuide={(id) => setOpenGuideId(id)}
                />
              ))}
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
    </div>
  );
};

/* ── Card ── */
const SitCard = ({
  sit, isOwner, onArchive, onDelete, onRepublish, onOpenGuide,
}: {
  sit: any; isOwner: boolean;
  onArchive: () => void; onDelete: () => void; onRepublish: () => void; onOpenGuide: (id: string) => void;
}) => {
  const effectiveStatus = sit.effectiveStatus || sit.status;
  const duration = getDuration(sit.start_date, sit.end_date);
  const photo = sit.properties?.photos?.[0];

  const otherParty = isOwner ? sit.acceptedSitter : sit.owner;

  // Build dynamic title
  const petNames = sit.pets?.map((p: any) => capitalize(p.name)).join(" + ") || "";
  const dateRange = sit.start_date && sit.end_date
    ? `${formatShortDate(sit.start_date)} → ${formatShortDate(sit.end_date)}`
    : "";
  const dynamicTitle = petNames && dateRange
    ? `${petNames} · ${dateRange}`
    : sit.title || "Sans titre";

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
            return remaining > 0 ? ` — ${remaining} jour${remaining > 1 ? "s" : ""} restant${remaining > 1 ? "s" : ""}` : " — Dernier jour";
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
                  {dynamicTitle}
                </h3>
              </Link>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                {duration && (
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-3 w-3" /> {duration}
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
              <span className={cn("px-2.5 py-1 rounded-full text-xs font-medium", displayStatus.className)}>
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

          {/* Quick actions */}
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            <QuickActions sit={sit} isOwner={isOwner} effectiveStatus={effectiveStatus} onRepublish={onRepublish} onOpenGuide={onOpenGuide} />
          </div>
        </div>
      </div>
    </div>
  );
};

/* ── Quick actions ── */
const QuickActions = ({
  sit, isOwner, effectiveStatus, onRepublish, onOpenGuide,
}: {
  sit: any; isOwner: boolean; effectiveStatus: string; onRepublish: () => void; onOpenGuide: (id: string) => void;
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

  if (effectiveStatus === "expired") {
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
      <Link to={`/sits/${sit.id}/edit`} className={cn(btnClass, "bg-accent text-muted-foreground hover:text-foreground")}>
        <Pencil className="h-3.5 w-3.5" /> Modifier
      </Link>
    );
  }

  if (!isOwner && ["pending", "viewed", "discussing"].includes(sit.application_status)) {
    return (
      <Link to={`/sits/${sit.id}`} className={cn(btnClass, "bg-accent text-muted-foreground hover:text-foreground")}>
        <ChevronRight className="h-3.5 w-3.5" /> Voir l'annonce
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
  const canDelete = sit.applicationCount === 0;
  const showMenu = ["confirmed", "in_progress", "published", "draft", "expired"].includes(effectiveStatus);
  if (!showMenu) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="p-1 rounded-md hover:bg-accent transition-colors opacity-0 group-hover:opacity-100">
          <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {["draft", "published"].includes(effectiveStatus) && (
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
        {effectiveStatus === "expired" && (
          <DropdownMenuItem onClick={onRepublish} className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4" /> Republier
          </DropdownMenuItem>
        )}
        {["published", "draft"].includes(effectiveStatus) && (
          <>
            <DropdownMenuSeparator />
            {sit.applicationCount > 0 ? (
              <DropdownMenuItem onClick={onArchive} className="flex items-center gap-2 text-muted-foreground">
                <Archive className="h-4 w-4" /> Archiver
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem onClick={onDelete} className="flex items-center gap-2 text-destructive">
                <Trash2 className="h-4 w-4" /> Supprimer
              </DropdownMenuItem>
            )}
          </>
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
