import { useAuth } from "@/contexts/AuthContext";
import { Link } from "react-router-dom";
import { Plus, Calendar, MessageSquare, Star, Users, Eye, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";

const statusConfig: Record<string, { label: string; className: string }> = {
  draft: { label: "Brouillon", className: "bg-muted text-muted-foreground" },
  published: { label: "En recherche", className: "bg-orange-100 text-orange-700" },
  confirmed: { label: "Confirmée", className: "bg-green-100 text-green-700" },
  completed: { label: "Terminée", className: "bg-muted text-muted-foreground" },
  cancelled: { label: "Annulée", className: "bg-destructive/10 text-destructive" },
};

const appStatusConfig: Record<string, { label: string; className: string }> = {
  pending: { label: "En attente", className: "bg-orange-100 text-orange-700" },
  viewed: { label: "Consultée", className: "bg-orange-100 text-orange-700" },
  discussing: { label: "En discussion", className: "bg-blue-100 text-blue-700" },
  accepted: { label: "Acceptée", className: "bg-green-100 text-green-700" },
  rejected: { label: "Refusée", className: "bg-destructive/10 text-destructive" },
  cancelled: { label: "Annulée", className: "bg-destructive/10 text-destructive" },
};

type OwnerTab = "all" | "published" | "confirmed" | "completed" | "cancelled";
type SitterTab = "all" | "applications" | "confirmed" | "completed" | "cancelled";

const ownerTabs: { value: OwnerTab; label: string }[] = [
  { value: "all", label: "Toutes" },
  { value: "published", label: "En recherche" },
  { value: "confirmed", label: "Confirmées" },
  { value: "completed", label: "Terminées" },
  { value: "cancelled", label: "Annulées" },
];

const sitterTabs: { value: SitterTab; label: string }[] = [
  { value: "all", label: "Toutes" },
  { value: "applications", label: "Candidatures" },
  { value: "confirmed", label: "Confirmées" },
  { value: "completed", label: "Terminées" },
  { value: "cancelled", label: "Annulées" },
];

const formatDate = (d: string | null) =>
  d ? format(new Date(d), "d MMM yyyy", { locale: fr }) : "";

const Sits = () => {
  const { user, activeRole } = useAuth();
  const [sits, setSits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [ownerTab, setOwnerTab] = useState<OwnerTab>("all");
  const [sitterTab, setSitterTab] = useState<SitterTab>("all");

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      if (activeRole === "owner") {
        const { data } = await supabase
          .from("sits")
          .select("*, properties(type, environment, photos)")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        const enriched = await Promise.all(
          (data || []).map(async (sit: any) => {
            const [appRes, sitterRes] = await Promise.all([
              supabase
                .from("applications")
                .select("id, sitter_id, status")
                .eq("sit_id", sit.id),
              sit.status === "confirmed"
                ? supabase
                    .from("applications")
                    .select("sitter_id, sitter:profiles!applications_sitter_id_fkey(first_name, avatar_url)")
                    .eq("sit_id", sit.id)
                    .eq("status", "accepted")
                    .maybeSingle()
                : Promise.resolve({ data: null }),
            ]);

            return {
              ...sit,
              applicationCount: appRes.data?.length || 0,
              acceptedSitter: sitterRes.data?.sitter || null,
            };
          })
        );
        setSits(enriched);
      } else {
        const { data } = await supabase
          .from("applications")
          .select("*, sit:sits(*, properties(type, environment, photos), owner:profiles!sits_user_id_fkey(first_name, avatar_url, city))")
          .eq("sitter_id", user.id)
          .order("created_at", { ascending: false });

        // Check which sits user has already reviewed
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

        setSits(
          data?.map((a: any) => ({
            ...a.sit,
            application_status: a.status,
            application_id: a.id,
            owner: a.sit?.owner || null,
            hasReviewed: reviewedSitIds.includes(a.sit?.id),
          })) || []
        );
      }
      setLoading(false);
    };
    load();
  }, [user, activeRole]);

  const filteredSits = useMemo(() => {
    if (activeRole === "owner") {
      if (ownerTab === "all") return sits;
      return sits.filter((s) => s.status === ownerTab);
    } else {
      if (sitterTab === "all") return sits;
      if (sitterTab === "applications")
        return sits.filter((s) =>
          ["pending", "viewed", "discussing"].includes(s.application_status)
        );
      if (sitterTab === "confirmed")
        return sits.filter(
          (s) => s.application_status === "accepted" && s.status === "confirmed"
        );
      if (sitterTab === "completed")
        return sits.filter((s) => s.status === "completed");
      if (sitterTab === "cancelled")
        return sits.filter(
          (s) => s.status === "cancelled" || s.application_status === "cancelled"
        );
      return sits;
    }
  }, [sits, activeRole, ownerTab, sitterTab]);

  const tabs = activeRole === "owner" ? ownerTabs : sitterTabs;
  const activeTab = activeRole === "owner" ? ownerTab : sitterTab;
  const setTab = activeRole === "owner"
    ? (v: string) => setOwnerTab(v as OwnerTab)
    : (v: string) => setSitterTab(v as SitterTab);

  return (
    <div className="p-4 md:p-10 max-w-4xl mx-auto animate-fade-in pb-24 md:pb-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-heading text-2xl md:text-3xl font-bold mb-1">Mes gardes</h1>
          <p className="text-muted-foreground text-sm">
            {activeRole === "owner"
              ? "Gérez vos annonces de garde."
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
            onClick={() => setTab(tab.value)}
            className={cn(
              "px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors shrink-0",
              activeTab === tab.value
                ? "bg-primary text-primary-foreground"
                : "bg-accent text-muted-foreground hover:text-foreground"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <p className="text-muted-foreground py-10 text-center">Chargement...</p>
      ) : filteredSits.length === 0 ? (
        <div className="text-center py-20">
          <Calendar className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
          <p className="text-muted-foreground">Aucune garde dans cette catégorie.</p>
          {activeRole === "owner" && ownerTab === "all" && (
            <Link to="/sits/create">
              <Button variant="outline" className="mt-4 gap-2">
                <Plus className="h-4 w-4" /> Créer ma première annonce
              </Button>
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredSits.map((sit: any) =>
            activeRole === "owner" ? (
              <OwnerSitCard key={sit.id} sit={sit} />
            ) : (
              <SitterSitCard key={sit.id + sit.application_id} sit={sit} />
            )
          )}
        </div>
      )}
    </div>
  );
};

/* ── Owner Card ── */
const OwnerSitCard = ({ sit }: { sit: any }) => {
  const status = statusConfig[sit.status] || statusConfig.draft;
  const photo = sit.properties?.photos?.[0];

  return (
    <Link
      to={`/sits/${sit.id}`}
      className="block bg-card rounded-xl border border-border hover:shadow-md transition-shadow overflow-hidden"
    >
      <div className="flex">
        {photo && (
          <img
            src={photo}
            alt=""
            className="w-24 h-full object-cover shrink-0 hidden sm:block"
          />
        )}
        <div className="flex-1 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="font-heading font-semibold truncate text-sm md:text-base">
                {sit.title || "Sans titre"}
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                {formatDate(sit.start_date)} → {formatDate(sit.end_date)}
                {sit.flexible_dates && " · Flexible"}
              </p>
            </div>
            <span
              className={cn(
                "px-2.5 py-1 rounded-full text-xs font-medium shrink-0",
                status.className
              )}
            >
              {status.label}
            </span>
          </div>

          {/* Enrichments */}
          <div className="flex items-center gap-4 mt-3 flex-wrap">
            {sit.status === "confirmed" && sit.acceptedSitter && (
              <div className="flex items-center gap-2">
                {sit.acceptedSitter.avatar_url ? (
                  <img
                    src={sit.acceptedSitter.avatar_url}
                    alt=""
                    className="w-6 h-6 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-bold">
                    {sit.acceptedSitter.first_name?.charAt(0) || "?"}
                  </div>
                )}
                <span className="text-xs font-medium">
                  {sit.acceptedSitter.first_name}
                </span>
              </div>
            )}

            {sit.status === "published" && sit.applicationCount > 0 && (
              <span className="flex items-center gap-1 text-xs text-primary font-medium">
                <Users className="h-3.5 w-3.5" />
                {sit.applicationCount} candidature
                {sit.applicationCount > 1 ? "s" : ""}
              </span>
            )}
          </div>

          {/* Action hints */}
          <div className="mt-3">
            {sit.status === "published" && (
              <span className="text-xs text-primary font-medium flex items-center gap-1">
                <Eye className="h-3.5 w-3.5" /> Voir les candidatures
              </span>
            )}
            {sit.status === "confirmed" && (
              <div className="flex gap-3">
                <span className="text-xs text-primary font-medium flex items-center gap-1">
                  <MessageSquare className="h-3.5 w-3.5" /> Conversation
                </span>
                <span className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                  <BookOpen className="h-3.5 w-3.5" /> Guide
                </span>
              </div>
            )}
            {sit.status === "completed" && (
              <span className="text-xs text-primary font-medium flex items-center gap-1">
                <Star className="h-3.5 w-3.5" /> Laisser un avis
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
};

/* ── Sitter Card ── */
const SitterSitCard = ({ sit }: { sit: any }) => {
  const sitStatus = statusConfig[sit.status] || statusConfig.draft;
  const appStatus = appStatusConfig[sit.application_status];
  const displayStatus =
    sit.application_status === "accepted" && sit.status === "confirmed"
      ? sitStatus
      : appStatus || sitStatus;

  const owner = sit.owner;
  const photo = sit.properties?.photos?.[0];

  return (
    <Link
      to={`/sits/${sit.id}`}
      className="block bg-card rounded-xl border border-border hover:shadow-md transition-shadow overflow-hidden"
    >
      <div className="flex">
        {photo && (
          <img
            src={photo}
            alt=""
            className="w-24 h-full object-cover shrink-0 hidden sm:block"
          />
        )}
        <div className="flex-1 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="font-heading font-semibold truncate text-sm md:text-base">
                {sit.title || "Sans titre"}
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                {formatDate(sit.start_date)} → {formatDate(sit.end_date)}
                {owner?.city && ` · ${owner.city}`}
              </p>
            </div>
            <span
              className={cn(
                "px-2.5 py-1 rounded-full text-xs font-medium shrink-0",
                displayStatus.className
              )}
            >
              {displayStatus.label}
            </span>
          </div>

          {/* Owner info */}
          {owner && (
            <div className="flex items-center gap-2 mt-3">
              {owner.avatar_url ? (
                <img
                  src={owner.avatar_url}
                  alt=""
                  className="w-6 h-6 rounded-full object-cover"
                />
              ) : (
                <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-bold">
                  {owner.first_name?.charAt(0) || "?"}
                </div>
              )}
              <span className="text-xs font-medium">{owner.first_name}</span>
            </div>
          )}

          {/* Action hints */}
          <div className="mt-3">
            {sit.application_status === "accepted" &&
              sit.status === "confirmed" && (
                <span className="text-xs text-primary font-medium flex items-center gap-1">
                  <MessageSquare className="h-3.5 w-3.5" /> Ouvrir la
                  conversation
                </span>
              )}
            {sit.status === "completed" && !sit.hasReviewed && (
              <span className="text-xs text-primary font-medium flex items-center gap-1">
                <Star className="h-3.5 w-3.5" /> Laisser un avis
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
};

export default Sits;
