import { useAuth } from "@/contexts/AuthContext";
import { Link } from "react-router-dom";
import {
  Plus, Calendar, MessageSquare, Star, Users, Eye, BookOpen,
  MapPin, Clock, MoreHorizontal, XCircle, CheckCircle, Phone,
  Image as ImageIcon, ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format, differenceInDays, isAfter, isBefore, isToday, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

/* ── Status configs ── */
const statusConfig: Record<string, { label: string; className: string }> = {
  draft: { label: "Brouillon", className: "bg-muted text-muted-foreground" },
  published: { label: "En recherche", className: "bg-primary/10 text-primary" },
  confirmed: { label: "Confirmée", className: "bg-primary/10 text-primary" },
  in_progress: { label: "En cours", className: "bg-primary/15 text-primary" },
  completed: { label: "Terminée", className: "bg-muted text-muted-foreground" },
  cancelled: { label: "Annulée", className: "bg-destructive/10 text-destructive" },
};

const appStatusConfig: Record<string, { label: string; className: string }> = {
  pending: { label: "Envoyée", className: "bg-muted text-muted-foreground" },
  viewed: { label: "Consultée", className: "bg-secondary/10 text-secondary" },
  discussing: { label: "En discussion", className: "bg-accent text-foreground" },
  accepted: { label: "Acceptée", className: "bg-primary/10 text-primary" },
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

const formatDate = (d: string | null) =>
  d ? format(parseISO(d), "d MMM yyyy", { locale: fr }) : "";

const formatShortDate = (d: string | null) =>
  d ? format(parseISO(d), "d MMM", { locale: fr }) : "";

const getDuration = (start: string | null, end: string | null) => {
  if (!start || !end) return null;
  const days = differenceInDays(parseISO(end), parseISO(start));
  return days <= 0 ? "1 jour" : `${days} jour${days > 1 ? "s" : ""}`;
};

const getEffectiveStatus = (sit: any): string => {
  if (sit.status === "cancelled") return "cancelled";
  if (sit.status === "completed") return "completed";
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
  const [sits, setSits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("upcoming");

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      if (activeRole === "owner") {
        const { data } = await supabase
          .from("sits")
          .select("*, properties(type, environment, photos, user_id)")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        const enriched = await Promise.all(
          (data || []).map(async (sit: any) => {
            const [appRes, sitterRes, petRes, reviewRes] = await Promise.all([
              supabase
                .from("applications")
                .select("id, sitter_id, status")
                .eq("sit_id", sit.id),
              supabase
                .from("applications")
                .select("sitter_id, sitter:profiles!applications_sitter_id_fkey(first_name, avatar_url, city)")
                .eq("sit_id", sit.id)
                .eq("status", "accepted")
                .maybeSingle(),
              supabase
                .from("pets")
                .select("name, species")
                .eq("property_id", sit.property_id),
              supabase
                .from("reviews")
                .select("id")
                .eq("sit_id", sit.id)
                .eq("reviewer_id", user.id)
                .maybeSingle(),
            ]);

            // Get sitter average rating
            let sitterRating = null;
            if (sitterRes.data?.sitter_id) {
              const { data: reviews } = await supabase
                .from("reviews")
                .select("overall_rating")
                .eq("reviewee_id", sitterRes.data.sitter_id)
                .eq("published", true);
              if (reviews?.length) {
                sitterRating = (reviews.reduce((sum: number, r: any) => sum + r.overall_rating, 0) / reviews.length).toFixed(1);
              }
            }

            return {
              ...sit,
              effectiveStatus: getEffectiveStatus(sit),
              applicationCount: appRes.data?.length || 0,
              acceptedSitter: sitterRes.data?.sitter ? { ...sitterRes.data.sitter, rating: sitterRating } : null,
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
            .from("reviews")
            .select("sit_id")
            .eq("reviewer_id", user.id)
            .in("sit_id", sitIds);
          reviewedSitIds = reviews?.map((r: any) => r.sit_id) || [];
        }

        // Get owner ratings
        const ownerIds = [...new Set(data?.map((a: any) => a.sit?.owner?.id).filter(Boolean) || [])];
        let ownerRatings: Record<string, string> = {};
        if (ownerIds.length > 0) {
          const { data: reviews } = await supabase
            .from("reviews")
            .select("reviewee_id, overall_rating")
            .in("reviewee_id", ownerIds)
            .eq("published", true);
          if (reviews?.length) {
            const grouped: Record<string, number[]> = {};
            reviews.forEach((r: any) => {
              if (!grouped[r.reviewee_id]) grouped[r.reviewee_id] = [];
              grouped[r.reviewee_id].push(r.overall_rating);
            });
            Object.entries(grouped).forEach(([id, ratings]) => {
              ownerRatings[id] = (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1);
            });
          }
        }

        // Get pets for each sit
        const propertyIds = [...new Set(data?.map((a: any) => a.sit?.property_id).filter(Boolean) || [])];
        let petsByProperty: Record<string, any[]> = {};
        if (propertyIds.length > 0) {
          const { data: pets } = await supabase
            .from("pets")
            .select("name, species, property_id")
            .in("property_id", propertyIds);
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
            owner: a.sit?.owner ? { ...a.sit.owner, rating: ownerRatings[a.sit.owner.id] || null } : null,
            hasReviewed: reviewedSitIds.includes(a.sit?.id),
            pets: petsByProperty[a.sit?.property_id] || [],
          })) || []
        );
      }
      setLoading(false);
    };
    load();
  }, [user, activeRole]);

  const tabCounts = useMemo(() => {
    const counts: Record<Tab, number> = { upcoming: 0, in_progress: 0, completed: 0, cancelled: 0 };
    sits.forEach((s) => {
      const es = s.effectiveStatus || s.status;
      const appStatus = s.application_status;

      if (activeRole === "owner") {
        if (es === "in_progress") counts.in_progress++;
        else if (es === "cancelled") counts.cancelled++;
        else if (es === "completed") counts.completed++;
        else counts.upcoming++; // draft, published, confirmed (future)
      } else {
        if (appStatus === "cancelled" || appStatus === "rejected" || es === "cancelled") counts.cancelled++;
        else if (es === "completed") counts.completed++;
        else if (es === "in_progress" && appStatus === "accepted") counts.in_progress++;
        else counts.upcoming++;
      }
    });
    return counts;
  }, [sits, activeRole]);

  const filteredSits = useMemo(() => {
    return sits.filter((s) => {
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
  }, [sits, activeRole, activeTab]);

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

      {/* Tabs with counters */}
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
          <p className="text-muted-foreground/60 text-sm">
            {activeTab === "upcoming" && activeRole === "owner"
              ? "Publiez une annonce pour trouver un gardien."
              : activeTab === "upcoming" && activeRole === "sitter"
              ? "Consultez les annonces pour postuler."
              : ""}
          </p>
          {activeTab === "upcoming" && activeRole === "owner" && (
            <Link to="/sits/create">
              <Button variant="outline" className="mt-4 gap-2">
                <Plus className="h-4 w-4" /> Créer une annonce
              </Button>
            </Link>
          )}
          {activeTab === "upcoming" && activeRole === "sitter" && (
            <Link to="/search">
              <Button variant="outline" className="mt-4 gap-2">
                <Eye className="h-4 w-4" /> Voir les annonces
              </Button>
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredSits.map((sit: any) => (
            <SitCard
              key={sit.id + (sit.application_id || "")}
              sit={sit}
              isOwner={activeRole === "owner"}
              userId={user?.id}
            />
          ))}
        </div>
      )}
    </div>
  );
};

/* ── Unified Card ── */
const SitCard = ({ sit, isOwner, userId }: { sit: any; isOwner: boolean; userId?: string }) => {
  const effectiveStatus = sit.effectiveStatus || sit.status;
  const duration = getDuration(sit.start_date, sit.end_date);
  const photo = sit.properties?.photos?.[0];

  // Determine the person to display (the other party)
  const otherParty = isOwner ? sit.acceptedSitter : sit.owner;

  // Status badge
  let displayStatus: { label: string; className: string };
  if (isOwner) {
    displayStatus = statusConfig[effectiveStatus] || statusConfig.draft;
  } else {
    const appStatus = sit.application_status;
    if (appStatus === "accepted" && (effectiveStatus === "confirmed" || effectiveStatus === "in_progress" || effectiveStatus === "completed")) {
      displayStatus = statusConfig[effectiveStatus];
    } else {
      displayStatus = appStatusConfig[appStatus] || statusConfig[effectiveStatus] || statusConfig.draft;
    }
  }

  // Animals summary
  const petSummary = sit.pets?.length
    ? sit.pets.map((p: any) => p.name).join(", ")
    : null;

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
         {photo && (
          <div className="shrink-0 hidden sm:block relative">
            <img src={photo} alt="" className="w-32 h-24 rounded-xl object-cover" />
          </div>
        )}

        <div className="flex-1 p-4">
          {/* Top row: title + status */}
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <Link to={`/sits/${sit.id}`} className="hover:underline">
                <h3 className="font-heading font-semibold truncate text-sm md:text-base">
                  {sit.title || "Sans titre"}
                </h3>
              </Link>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {formatShortDate(sit.start_date)} → {formatShortDate(sit.end_date)}
                </span>
                {duration && (
                  <span className="text-xs text-muted-foreground">· {duration}</span>
                )}
                {(isOwner ? sit.owner?.city : sit.owner?.city) && !isOwner && (
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {sit.owner?.city}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span className={cn(
                "px-2.5 py-1 rounded-full text-xs font-medium",
                displayStatus.className
              )}>
                {displayStatus.label}
              </span>
              <ActionsMenu sit={sit} isOwner={isOwner} effectiveStatus={effectiveStatus} />
            </div>
          </div>

          {/* Other party info */}
          <div className="flex items-center justify-between mt-3">
            <div className="flex items-center gap-3">
              {otherParty && (
                <div className="flex items-center gap-2">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={otherParty.avatar_url} />
                    <AvatarFallback className="text-xs font-semibold bg-primary/10 text-primary">
                      {otherParty.first_name?.charAt(0) || "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <span className="text-sm font-medium">{otherParty.first_name}</span>
                    {otherParty.rating && (
                      <span className="text-xs text-muted-foreground ml-1.5">
                        <Star className="h-3 w-3 inline text-secondary fill-secondary -mt-0.5" /> {otherParty.rating}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Candidates count removed — integrated into QuickActions button */}
            </div>

            {/* Pet summary */}
            {petSummary && (
              <span className="text-xs text-muted-foreground hidden md:block">
                🐾 {petSummary}
              </span>
            )}
          </div>

          {/* Quick actions */}
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            <QuickActions sit={sit} isOwner={isOwner} effectiveStatus={effectiveStatus} />
          </div>
        </div>
      </div>
    </div>
  );
};

/* ── Quick action buttons ── */
const QuickActions = ({ sit, isOwner, effectiveStatus }: { sit: any; isOwner: boolean; effectiveStatus: string }) => {
  const btnClass = "text-xs font-medium flex items-center gap-1 px-2.5 py-1.5 rounded-lg transition-colors";

  if (effectiveStatus === "in_progress") {
    return (
      <>
        <Link to={`/messages`} className={cn(btnClass, "bg-primary/10 text-primary hover:bg-primary/20")}>
          <MessageSquare className="h-3.5 w-3.5" /> Contacter
        </Link>
        {isOwner && sit.property_id && (
          <Link to={`/house-guide/${sit.property_id}`} className={cn(btnClass, "bg-accent text-muted-foreground hover:text-foreground")}>
            <BookOpen className="h-3.5 w-3.5" /> Guide
          </Link>
        )}
        {!isOwner && sit.property_id && (
          <Link to={`/house-guide/${sit.property_id}`} className={cn(btnClass, "bg-accent text-muted-foreground hover:text-foreground")}>
            <BookOpen className="h-3.5 w-3.5" /> Guide maison
          </Link>
        )}
      </>
    );
  }

  if (effectiveStatus === "confirmed") {
    return (
      <>
        <Link to={`/messages`} className={cn(btnClass, "bg-primary/10 text-primary hover:bg-primary/20")}>
          <MessageSquare className="h-3.5 w-3.5" /> Contacter {isOwner ? sit.acceptedSitter?.first_name : sit.owner?.first_name}
        </Link>
        {sit.property_id && (
          <Link to={`/house-guide/${sit.property_id}`} className={cn(btnClass, "bg-accent text-muted-foreground hover:text-foreground")}>
            <BookOpen className="h-3.5 w-3.5" /> Guide
          </Link>
        )}
        <Link to={`/sits/${sit.id}`} className={cn(btnClass, "bg-primary/10 text-primary hover:bg-primary/20")}>
          <CheckCircle className="h-3.5 w-3.5" /> Checklist
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
    if (count === 0) {
      return (
        <span className={cn(btnClass, "border border-border text-muted-foreground cursor-default")}>
          Aucune candidature
        </span>
      );
    }
    if (count === 1) {
      return (
        <Link to={`/sits/${sit.id}`} className={cn(btnClass, "bg-primary/10 text-primary hover:bg-primary/20")}>
          <Users className="h-3.5 w-3.5" /> Voir 1 candidature
        </Link>
      );
    }
    return (
      <Link to={`/sits/${sit.id}`} className={cn(btnClass, "bg-primary text-primary-foreground hover:bg-primary/90")}>
        <Users className="h-3.5 w-3.5" /> Voir {count} candidatures
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
const ActionsMenu = ({ sit, isOwner, effectiveStatus }: { sit: any; isOwner: boolean; effectiveStatus: string }) => {
  const showMenu = ["confirmed", "in_progress", "published", "draft"].includes(effectiveStatus) && isOwner;
  if (!showMenu) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="p-1 rounded-md hover:bg-accent transition-colors opacity-0 group-hover:opacity-100">
          <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {effectiveStatus === "draft" && (
          <DropdownMenuItem asChild>
            <Link to={`/sits/${sit.id}/edit`} className="flex items-center gap-2">
              <Eye className="h-4 w-4" /> Modifier
            </Link>
          </DropdownMenuItem>
        )}
        {effectiveStatus === "published" && (
          <DropdownMenuItem asChild>
            <Link to={`/sits/${sit.id}/edit`} className="flex items-center gap-2">
              <Eye className="h-4 w-4" /> Modifier l'annonce
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
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default Sits;
