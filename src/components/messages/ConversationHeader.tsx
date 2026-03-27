import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Archive, ExternalLink, CheckCircle2, Star, Home, Handshake } from "lucide-react";
import StatusShield from "@/components/badges/StatusShield";
import HelpButton from "./HelpButton";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ConversationHeaderProps {
  conv: any;
  userId?: string;
  isMobile: boolean;
  onBack: () => void;
  onArchive: () => void;
  onActionDone: () => void;
  otherUserRating?: number;
  isFounder?: boolean;
  isEmergencySitter?: boolean;
}

const statusLabels: Record<string, string> = {
  draft: "Brouillon", published: "En discussion", confirmed: "Confirmée",
  in_progress: "En cours", completed: "Terminée", cancelled: "Annulée",
};

const ConversationHeader = ({
  conv, userId, isMobile, onBack, onArchive, onActionDone,
  otherUserRating, isFounder, isEmergencySitter,
}: ConversationHeaderProps) => {
  const isOwner = conv.owner_id === userId;
  const isPendingApp = conv.application_status === "pending" || conv.application_status === "discussing";
  const isConfirmed = conv.sit?.status === "confirmed";
  const isInProgress = conv.sit?.status === "in_progress";
  const isCompleted = conv.sit?.status === "completed";
  const isSmallMission = !!(conv as any).small_mission_id;
  const sitterName = conv.other_user?.first_name || "le gardien";

  const handleAcceptApplication = async () => {
    if (!conv.sit_id) return;
    const sitterId = isOwner ? conv.sitter_id : conv.owner_id;
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
      {/* Main header row */}
      <div className="flex items-center gap-3 p-4">
        {isMobile && (
          <button onClick={onBack} className="p-1 hover:bg-accent rounded-lg">
            <ArrowLeft className="h-5 w-5" />
          </button>
        )}
        <Link to={`/profil/${conv.other_user?.id}`} className="shrink-0">
          {conv.other_user?.avatar_url ? (
            <img src={conv.other_user.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover hover:ring-2 hover:ring-primary/50 transition-all" />
          ) : (
            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center font-heading text-sm font-bold hover:ring-2 hover:ring-primary/50 transition-all">
              {conv.other_user?.first_name?.charAt(0) || "?"}
            </div>
          )}
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <Link to={`/profil/${conv.other_user?.id}`} className="font-medium text-sm hover:text-primary transition-colors">
              {conv.other_user?.first_name}
            </Link>
            {conv.other_user?.identity_verified && <StatusShield type="verified" size="xs" />}
            {isFounder && <StatusShield type="founder" size="xs" />}
            {isEmergencySitter && <StatusShield type="emergency" size="xs" />}
            {otherUserRating !== undefined && otherUserRating > 0 && (
              <span className="flex items-center gap-0.5 text-xs text-muted-foreground ml-1">
                <Star className="h-3 w-3 text-amber-500" fill="currentColor" /> {otherUserRating.toFixed(1)}
              </span>
            )}
          </div>
          <Link to={`/profil/${conv.other_user?.id}`} className="text-[11px] text-primary hover:underline">
            Voir le profil →
          </Link>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 shrink-0">
          {isOwner && isPendingApp && (
            <>
              <Button size="sm" className="gap-1.5 bg-green-600 hover:bg-green-700 text-white" onClick={handleAcceptApplication}>
                <CheckCircle2 className="h-3.5 w-3.5" /> Accepter {sitterName}
              </Button>
              <Button size="sm" variant="outline" onClick={handleDeclineApplication}>
                Décliner
              </Button>
            </>
          )}
          {isConfirmed && conv.sit?.property_id && (
            <Link to={`/house-guide/${conv.sit.property_id}`}>
              <Button size="sm" variant="outline" className="gap-1.5">
                <Home className="h-3.5 w-3.5" /> Guide de la maison
              </Button>
            </Link>
          )}
          {isSmallMission && (
            <Button size="sm" variant="outline" className="gap-1.5">
              <Handshake className="h-3.5 w-3.5" /> Mission terminée
            </Button>
          )}
          <button onClick={onArchive} className="p-2 rounded-lg hover:bg-accent text-muted-foreground" title="Archiver">
            <Archive className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Sit summary banner */}
      {conv.sit_id && conv.sit?.title && (
        <Link
          to={`/sits/${conv.sit_id}`}
          className="flex items-center gap-2 px-4 py-2 border-t border-border/50 bg-accent/30 hover:bg-accent/50 transition-colors text-xs text-muted-foreground"
        >
          <ExternalLink className="h-3 w-3 shrink-0" />
          <span className="truncate">{conv.sit?.title}</span>
          {conv.sit?.status && (
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium shrink-0 ${
              conv.sit.status === "confirmed" ? "bg-green-100 text-green-700" :
              conv.sit.status === "in_progress" ? "bg-emerald-100 text-emerald-700" :
              conv.sit.status === "completed" ? "bg-accent text-accent-foreground" :
              conv.sit.status === "cancelled" ? "bg-destructive/10 text-destructive" :
              "bg-blue-100 text-blue-700"
            }`}>
              {statusLabels[conv.sit.status] || conv.sit.status}
            </span>
          )}
        </Link>
      )}

      {/* Status banners */}
      {isInProgress && (
        <div className="bg-emerald-50 dark:bg-emerald-900/20 border-t border-emerald-200 dark:border-emerald-800 px-4 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-400 font-medium animate-pulse">
            <CheckCircle2 className="h-4 w-4" /> Garde en cours
          </div>
          {conv.sit?.property_id && (
            <HelpButton
              propertyId={conv.sit.property_id}
              ownerId={conv.owner_id}
              ownerName={conv.other_user?.first_name || "le propriétaire"}
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
    </div>
  );
};

export default ConversationHeader;
