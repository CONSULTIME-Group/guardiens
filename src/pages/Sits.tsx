import { useAuth } from "@/contexts/AuthContext";
import { Link, useNavigate } from "react-router-dom";
import {
  Plus, Calendar, MessageSquare, Star, Users, Eye, BookOpen,
  MapPin, Clock, MoreHorizontal, XCircle, CheckCircle,
  Image as ImageIcon, ChevronRight, Archive, Trash2, RefreshCw,
  AlertTriangle, Pencil,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useState, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format, differenceInDays, isAfter, isBefore, isToday, parseISO } from "date-fns";
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
  { value: "upcoming", label: "A venir", icon: Calendar },
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
  const [sits, setSits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("upcoming");
  const [showArchived, setShowArchived] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [archiveConfirm, setArchiveConfirm] = useState<string | null>(null);

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

      setSits(
        data?.map((a: any) => ({
          ...a.sit,
          effectiveStatus: getEffectiveStatus(a.sit),
          application_status: a.status,
          application_id: a.id,
          owner: a.sit?.owner || null,
          hasReviewed: reviewedSitIds.includes(a.sit?.id),
          pets: petsByProperty[a.sit?.property_id] || [],
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

  return (
    <div className="p-4 md:p-10 max-w-4xl mx-auto animate-fade-in pb-24 md:pb-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-heading text-2xl md:text-3xl font-bold mb-1">
            {activeRole === "owner" ? "Mes annonces" : "Mes gardes"}
          </h1>
          <p className="text-muted-foreground text-sm">
            {activeRole === "owner"
              ? "Gérez vos annonces et suivez vos gardes."
              : "Suivez vos candidatures et gardes."}
          </p>
        </div>
        {activeRole === "owner" && (
          <Link to="/sits/create">
            <Button className="gap-2">
              <Plus className="h-4 w-4" /> Publier
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
        <div className="text-center py-20">
          <Calendar className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
          <p className="text-muted-foreground font-medium mb-1">
            {activeTab === "upcoming" && "Aucune garde à venir"}
            {activeTab === "in_progress" && "Aucune garde en cours"}
            {activeTab === "completed" && "Aucune garde passée"}
            {activeTab === "cancelled" && "Aucune garde annulée"}
          </p>
          {activeTab === "upcoming" && activeRole === "owner" && (
            <>
              <p className="text-muted-foreground/60 text-sm">Vous n'avez pas encore publié d'annonce.</p>
              <Link to="/sits/create">
                <Button variant="outline" className="mt-4 gap-2">
                  <Plus className="h-4 w-4" /> Publier ma première annonce
                </Button>
              </Link>
            </>
          )}
          {activeTab === "upcoming" && activeRole === "sitter" && (
            <>
              <p className="text-muted-foreground/60 text-sm">Consultez les annonces pour postuler.</p>
              <Link to="/search">
                <Button variant="outline" className="mt-4 gap-2">
                  <Eye className="h-4 w-4" /> Voir les annonces
                </Button>
              </Link>
            </>
          )}
        </div>
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
            />
          ))}
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
  sit, isOwner, onArchive, onDelete, onRepublish,
}: {
  sit: any; isOwner: boolean;
  onArchive: () => void; onDelete: () => void; onRepublish: () => void;
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
            <QuickActions sit={sit} isOwner={isOwner} effectiveStatus={effectiveStatus} onRepublish={onRepublish} />
          </div>
        </div>
      </div>
    </div>
  );
};

/* ── Quick actions ── */
const QuickActions = ({
  sit, isOwner, effectiveStatus, onRepublish,
}: {
  sit: any; isOwner: boolean; effectiveStatus: string; onRepublish: () => void;
}) => {
  const btnClass = "text-xs font-medium flex items-center gap-1 px-2.5 py-1.5 rounded-lg transition-colors";

  if (effectiveStatus === "in_progress") {
    return (
      <>
        <Link to="/messages" className={cn(btnClass, "bg-primary/10 text-primary hover:bg-primary/20")}>
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

  if (effectiveStatus === "confirmed") {
    return (
      <>
        <Link to={`/sits/${sit.id}`} className={cn(btnClass, "bg-primary/10 text-primary hover:bg-primary/20")}>
          <ChevronRight className="h-3.5 w-3.5" /> Voir la garde
        </Link>
        <Link to="/messages" className={cn(btnClass, "bg-accent text-muted-foreground hover:text-foreground")}>
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

export default Sits;
