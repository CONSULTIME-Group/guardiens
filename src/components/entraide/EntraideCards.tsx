import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import MissionBadgesReceived from "@/components/missions/MissionBadgesReceived";
import HelpCounts from "@/components/entraide/HelpCounts";
import { startConversationAndNavigate } from "@/lib/conversation";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface EntraideNeed {
  id: string;
  slug: string | null;
  title: string;
  city: string | null;
  date_needed: string | null;
  end_date: string | null;
  latitude: number | null;
  longitude: number | null;
  response_count: number;
}

export interface PublicHelper {
  id: string;
  first_name: string;
  avatar_url: string | null;
  city: string | null;
  latitude_approx: number | null;
  longitude_approx: number | null;
  helps_with: string | null;
}

const dateLabel = (need: EntraideNeed) => {
  const value = need.end_date || need.date_needed;
  if (!value) return "À convenir ensemble";
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric" }).format(new Date(value));
};

const locationLabel = (city: string | null, distance: number | null, showDistance: boolean) => {
  const place = city || "Près de chez vous";
  if (!showDistance || distance === null) return place;
  return `${place}, à ${Math.round(distance)} km`;
};

export const NeedCard = ({ need, distance, showDistance, compact = false }: {
  need: EntraideNeed;
  distance: number | null;
  showDistance: boolean;
  compact?: boolean;
}) => (
  <article className={`border border-border bg-card ${compact ? "p-3" : "p-4 sm:p-5"} rounded-lg`}>
    <p className="text-xs font-semibold text-primary">{locationLabel(need.city, distance, showDistance)}</p>
    <h3 className="mt-1 font-heading text-lg font-semibold text-foreground">{need.title}</h3>
    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
      <span>{dateLabel(need)}</span>
      {need.response_count > 0 && (
        <span>{need.response_count} personne{need.response_count > 1 ? "s ont" : " a"} dit je peux</span>
      )}
    </div>
    <Button asChild variant="outline" size="sm" className="mt-4">
      <Link to={`/petites-missions/${need.slug || need.id}`}>Voir le détail</Link>
    </Button>
  </article>
);

export const HelperCard = ({ helper, distance, showDistance, compact = false }: {
  helper: PublicHelper;
  distance: number | null;
  showDistance: boolean;
  compact?: boolean;
}) => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [opening, setOpening] = useState(false);
  const firstName = helper.first_name.trim() || "Membre";

  const contact = async () => {
    if (!isAuthenticated) {
      navigate(`/inscription?redirect=${encodeURIComponent(`/petites-missions?contact=${helper.id}`)}`);
      return;
    }
    if (opening) return;
    setOpening(true);
    try {
      await startConversationAndNavigate({ otherUserId: helper.id, context: "helper_inquiry" }, navigate);
    } catch {
      toast.error("La conversation sera disponible dans un instant. Réessayez.");
    } finally {
      setOpening(false);
    }
  };

  return (
    <article className={`border border-border bg-card ${compact ? "p-3" : "p-4 sm:p-5"} rounded-lg`}>
      <div className="flex items-start gap-3">
        <Avatar className="h-12 w-12 shrink-0">
          <AvatarImage src={helper.avatar_url || undefined} alt={`Portrait de ${firstName}`} />
          <AvatarFallback>{firstName.charAt(0).toUpperCase()}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <h3 className="font-heading text-lg font-semibold text-foreground">{firstName}</h3>
          <p className="text-xs text-muted-foreground">{locationLabel(helper.city, distance, showDistance)}</p>
          <HelpCounts userId={helper.id} className="mt-1" />
        </div>
        <MissionBadgesReceived profileId={helper.id} variant="compact" />
      </div>
      <p className="mt-3 text-sm leading-relaxed text-foreground">{helper.helps_with?.trim() || "Disponible pour un coup de main"}</p>
      <Button type="button" size="sm" className="mt-4" onClick={contact} disabled={opening}>
        {opening ? "Ouverture..." : `Écrire à ${firstName}`}
      </Button>
    </article>
  );
};