import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Archive, ExternalLink, CheckCircle2, Star, Home, Handshake, Calendar, MapPin, Flag, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import HelpButton from "./HelpButton";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, isPast } from "date-fns";
import { fr } from "date-fns/locale";

interface ConversationHeaderProps {
  conv: any;
  userId?: string;
  userRole?: string;
  isMobile: boolean;
  onBack: () => void;
  onArchive: () => void;
  onActionDone: () => void;
  otherUserRating?: number;
  isFounder?: boolean;
  isEmergencySitter?: boolean;
}

const appStatusBadge: Record<string, { label: string; className: string }> = {
  pending: { label: "En attente", className: "bg-amber-50 text-amber-700" },
  viewed: { label: "En attente", className: "bg-amber-50 text-amber-700" },
  discussing: { label: "En discussion", className: "bg-blue-50 text-blue-700" },
  accepted: { label: "Acceptée ✓", className: "bg-primary/10 text-primary" },
  rejected: { label: "Déclinée", className: "bg-muted text-muted-foreground" },
  cancelled: { label: "Déclinée", className: "bg-muted text-muted-foreground" },
};

const capitalize = (s?: string | null) => {
  if (!s) return "";
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
};

const formatShortDate = (d: string) => {
  try { return format(new Date(d), "d MMM", { locale: fr }); } catch { return d; }
};

const ConversationHeader = ({
  conv, userId, userRole, isMobile, onBack, onArchive, onActionDone,
  otherUserRating, isFounder, isEmergencySitter,
}: ConversationHeaderProps) => {
  const navigate = useNavigate();
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportSending, setReportSending] = useState(false);
  const [missionData, setMissionData] = useState<any>(null);
  const [responseData, setResponseData] = useState<any>(null);

  const isOwner = conv.owner_id === userId;
  const isPendingApp = conv.application_status === "pending" || conv.application_status === "discussing";
  const isConfirmed = conv.sit?.status === "confirmed";
  const isInProgress = conv.sit?.status === "in_progress";
  const isCompleted = conv.sit?.status === "completed";
  const isSmallMission = !!(conv as any).small_mission_id;
  const sitterName = capitalize(conv.other_user?.first_name) || "le gardien";
  const appBadge = conv.application_status ? appStatusBadge[conv.application_status] : null;

  // Mission exchange roles
  const isInitiator = responseData?.responder_id === userId;
  const isRecipient = missionData?.user_id === userId;

  // Load mission data if small_mission_id
  useEffect(() => {
    const missionId = (conv as any).small_mission_id;
    if (!missionId) return;

    const load = async () => {
      const [{ data: mission }, { data: response }] = await Promise.all([
        supabase.from("small_missions")
          .select("id, title, exchange_offer, date_needed, user_id")
          .eq("id", missionId)
          .single(),
        supabase.from("small_mission_responses")
          .select("id, status, responder_id, conversation_id")
          .eq("mission_id", missionId)
          .eq("conversation_id", conv.id)
          .maybeSingle(),
      ]);
      setMissionData(mission);
      setResponseData(response);
    };
    load();

    // Realtime
    const channel = supabase
      .channel(`response-${conv.id}`)
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "small_mission_responses",
        filter: `conversation_id=eq.${conv.id}`,
      }, (payload) => setResponseData(payload.new))
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [conv.id, (conv as any).small_mission_id]);

  const handleAcceptExchange = async () => {
    if (!responseData?.id) return;
    await supabase.from("small_mission_responses")
      .update({ status: "accepted" as any })
      .eq("id", responseData.id);
    await supabase.from("notifications").insert({
      user_id: responseData.responder_id,
      type: "mission_accepted",
      title: "Échange accepté !",
      body: `${capitalize(conv.other_user?.first_name) || "Un membre"} a accepté votre proposition pour "${missionData?.title}"`,
      link: `/messages?conversationId=${conv.id}`,
    });
    setResponseData((prev: any) => ({ ...prev, status: "accepted" }));
  };

  const handleDeclineExchange = async () => {
    if (!responseData?.id) return;
    await supabase.from("small_mission_responses")
      .update({ status: "declined" as any })
      .eq("id", responseData.id);
    await supabase.from("notifications").insert({
      user_id: responseData.responder_id,
      type: "mission_declined",
      title: "Échange décliné",
      body: `${capitalize(conv.other_user?.first_name) || "Un membre"} n'est pas disponible pour "${missionData?.title}"`,
      link: `/messages?conversationId=${conv.id}`,
    });
    setResponseData((prev: any) => ({ ...prev, status: "declined" }));
  };

  const handleMarkDone = async () => {
    if (!responseData?.id) return;
    await supabase.from("small_mission_responses")
      .update({ status: "completed" as any })
      .eq("id", responseData.id);
    setResponseData((prev: any) => ({ ...prev, status: "completed" }));
  };

  const handleLeaveReview = () => {
    navigate(`/avis-mission?missionId=${missionData?.id}&conversationId=${conv.id}`);
  };

  // Determine "Voir l'annonce" link
  const annonceLinkHref = conv.sit_id
    ? (isOwner ? `/sits/${conv.sit_id}` : `/annonces/${conv.sit_id}`)
    : null;

  const reportedUserId = conv.owner_id === userId ? conv.sitter_id : conv.owner_id;

  const handleReport = async () => {
    if (!userId || !reportReason.trim()) return;
    setReportSending(true);
    const { error } = await supabase.from("reports").insert({
      reporter_id: userId,
      target_type: "user",
      target_id: reportedUserId,
      report_type: "inappropriate",
      reason: reportReason.trim(),
    });
    setReportSending(false);
    if (error) {
      toast.error("Une erreur est survenue, réessayez.");
      return;
    }
    toast.success("Signalement envoyé. On examine ça dans les 24h.");
    setReportOpen(false);
    setReportReason("");
  };

  const handleAcceptApplication = async () => {
    if (!conv.sit_id) return;
    const { error } = await supabase
      .from("applications")
      .update({ status: "accepted" })
      .eq("sit_id", conv.sit_id)
      .eq("sitter_id", conv.sitter_id);
    if (error) { toast.error("Erreur"); return; }
    toast.success(`Candidature de ${sitterName} acceptée ✅`);
    onActionDone();
  };

  const handleDeclineApplication = async () => {
    if (!conv.sit_id) return;
    const { error } = await supabase
      .from("applications")
      .update({ status: "rejected" })
      .eq("sit_id", conv.sit_id)
      .eq("sitter_id", conv.sitter_id);
    if (error) { toast.error("Erreur"); return; }
    toast.success("Candidature déclinée");
    onActionDone();
  };

  return (
    <div className="border-b border-border bg-card">
      {/* Line 1 — Avatar + Name + Badge + Actions */}
      <div className="flex items-start justify-between gap-3 p-4">
        <div className="flex items-center gap-3 min-w-0">
          {isMobile && (
            <button onClick={onBack} className="p-1 hover:bg-accent rounded-lg" aria-label="Retour">
              <ArrowLeft className="h-5 w-5" />
            </button>
          )}
          <Link to={`/profil/${conv.other_user?.id}`} className="shrink-0">
            {conv.other_user?.avatar_url ? (
              <img src={conv.other_user.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover hover:ring-2 hover:ring-primary/50 transition-all" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium text-sm hover:ring-2 hover:ring-primary/50 transition-all">
                {conv.other_user?.first_name?.charAt(0)?.toUpperCase() || "?"}
              </div>
            )}
          </Link>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Link to={`/profil/${conv.other_user?.id}`} className="font-semibold text-base hover:text-primary transition-colors capitalize">
                {capitalize(conv.other_user?.first_name)}
              </Link>
              {/* MOD 3/7 — Application status badge in header */}
              {appBadge && !isSmallMission && (
                <span className={`${appBadge.className} rounded-full px-2 py-0.5 text-xs shrink-0`}>
                  {appBadge.label}
                </span>
              )}
              {otherUserRating !== undefined && otherUserRating > 0 && (
                <span className="flex items-center gap-0.5 text-xs text-muted-foreground ml-1">
                  <Star className="h-3 w-3 text-amber-500" fill="currentColor" /> {otherUserRating.toFixed(1)}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2 shrink-0">
          {annonceLinkHref && (
            <Link to={annonceLinkHref}>
              <Button size="sm" variant="outline" className="gap-1.5 border-primary text-primary hover:bg-primary/5">
                Voir l'annonce <ExternalLink className="h-3.5 w-3.5" />
              </Button>
            </Link>
          )}
          {isOwner && isPendingApp && (
            <>
              <Button size="sm" className="gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground" onClick={handleAcceptApplication}>
                <CheckCircle2 className="h-3.5 w-3.5" /> Accepter
              </Button>
              <Button size="sm" variant="outline" onClick={handleDeclineApplication}>
                Décliner
              </Button>
            </>
          )}
          {isConfirmed && conv.sit?.property_id && (
            <Link to={`/house-guide/${conv.sit.property_id}`}>
              <Button size="sm" variant="outline" className="gap-1.5">
                <Home className="h-3.5 w-3.5" /> Guide
              </Button>
            </Link>
          )}
          <button onClick={() => setReportOpen(true)} className="p-2 rounded-lg hover:bg-accent text-muted-foreground" title="Signaler" aria-label="Signaler">
            <Flag className="h-4 w-4" />
          </button>
          <button onClick={onArchive} className="p-2 rounded-lg hover:bg-accent text-muted-foreground" title="Archiver" aria-label="Archiver">
            <Archive className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Line 2 — Sit summary or mission category */}
      {conv.sit_id && conv.sit?.title && (
        <div className="flex items-center gap-3 px-4 py-2 border-t border-border/50 bg-accent/30 text-xs text-muted-foreground">
          {conv.sit?.start_date && (
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {formatShortDate(conv.sit.start_date)}
              {conv.sit?.end_date && ` → ${formatShortDate(conv.sit.end_date)}`}
            </span>
          )}
          {conv.other_user?.city && (
            <>
              <span>·</span>
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" /> {conv.other_user.city}
              </span>
            </>
          )}
        </div>
      )}
      {/* Small mission contextual banners */}
      {isSmallMission && missionData && responseData && responseData.status === "pending" && (
        <div className="px-4 py-3 bg-muted/50 border-t border-border">
          <p className="text-xs text-muted-foreground mb-0.5">Mission</p>
          <p className="text-sm font-medium text-foreground">{missionData.title}</p>
          <p className="text-xs text-muted-foreground mt-0.5 mb-2">
            En échange : {missionData.exchange_offer}
          </p>
          {isRecipient && (
            <div className="flex gap-2">
              <Button size="sm" onClick={handleAcceptExchange}>Accepter l'échange</Button>
              <Button size="sm" variant="outline" onClick={handleDeclineExchange}>Décliner</Button>
            </div>
          )}
          {isInitiator && (
            <p className="text-xs text-muted-foreground italic">En attente de réponse…</p>
          )}
        </div>
      )}
      {isSmallMission && missionData && responseData && responseData.status === "accepted" && (
        <div className="px-4 py-2 bg-green-50 border-t border-green-200 flex items-center gap-2">
          <CheckCircle className="text-green-600 w-4 h-4 shrink-0" />
          <span className="text-sm text-green-700 font-medium">Échange accepté ✓</span>
          {missionData.date_needed && isPast(new Date(missionData.date_needed)) && (
            <Button
              size="sm"
              variant="outline"
              className="ml-auto border-green-300 text-green-700 hover:bg-green-100"
              onClick={handleMarkDone}
            >
              Marquer comme terminé
            </Button>
          )}
        </div>
      )}
      {isSmallMission && missionData && responseData && responseData.status === "declined" && (
        <div className="px-4 py-2 bg-muted border-t border-border flex items-center gap-2">
          <XCircle className="text-muted-foreground w-4 h-4 shrink-0" />
          <span className="text-sm text-muted-foreground">Échange décliné</span>
        </div>
      )}
      {isSmallMission && missionData && responseData && responseData.status === "completed" && (
        <div className="px-4 py-2 bg-primary/5 border-t border-primary/20 flex items-center gap-2">
          <CheckCircle className="text-primary w-4 h-4 shrink-0" />
          <span className="text-sm text-primary font-medium">Échange terminé</span>
          <Button
            size="sm"
            variant="ghost"
            className="ml-auto text-primary hover:bg-primary/10"
            onClick={handleLeaveReview}
          >
            Laisser un avis →
          </Button>
        </div>
      )}
      {isSmallMission && !responseData && (
        <div className="px-4 py-2 border-t border-border/50 bg-accent/30 text-xs text-muted-foreground">
          🌿 Petite mission
        </div>
      )}

      {/* Status banners */}
      {isInProgress && (
        <div className="bg-primary/5 border-t border-primary/20 px-4 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-primary font-medium animate-pulse">
            <CheckCircle2 className="h-4 w-4" /> Garde en cours
          </div>
          {conv.sit?.property_id && (
            <HelpButton
              propertyId={conv.sit.property_id}
              ownerId={conv.owner_id}
              ownerName={capitalize(conv.other_user?.first_name) || "le propriétaire"}
              sitId={conv.sit_id || undefined}
              sitCity={conv.other_user?.city || undefined}
            />
          )}
        </div>
      )}

      {isCompleted && (
        <div className="bg-accent border-t border-border px-4 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-medium">
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" /> Garde terminée
          </div>
          <Link to={`/review/${conv.sit_id}`} className="text-xs font-medium text-primary hover:underline flex items-center gap-1">
            <Star className="h-3.5 w-3.5" /> Laisser un avis
          </Link>
        </div>
      )}

      {/* Report dialog */}
      <Dialog open={reportOpen} onOpenChange={setReportOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Signaler ce membre</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Textarea
              placeholder="Décris le problème en quelques mots"
              value={reportReason}
              onChange={e => setReportReason(e.target.value.slice(0, 300))}
              maxLength={300}
              className="min-h-[100px]"
            />
            <p className="text-xs text-muted-foreground text-right">{reportReason.length}/300</p>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setReportOpen(false)}>Annuler</Button>
            <Button onClick={handleReport} disabled={reportSending || !reportReason.trim()}>
              Envoyer le signalement
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ConversationHeader;
