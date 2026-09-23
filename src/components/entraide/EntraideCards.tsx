import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import MissionBadgesReceived, { type MissionBadgeRow } from "@/components/missions/MissionBadgesReceived";
import HelpCounts from "@/components/entraide/HelpCounts";
import { categoryInitial } from "@/lib/entraideHubModel";
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
  photos?: string[] | null;
  sit_mode?: string | null;
  category?: string | null;
  user_id?: string | null;
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
}) => {
  const photo = need.photos?.[0] || null;
  return (
    <article className={`border border-border bg-card ${compact ? "p-3" : "p-4 sm:p-5"} rounded-lg`}>
      {/* Photo réelle en tête de carte, ou en-tête typographique sobre avec ville et date. */}
      {photo ? (
        <div className={`overflow-hidden rounded-md border border-border bg-muted ${compact ? "mb-3" : "mb-4"}`}>
          <img
            src={photo}
            alt={need.title}
            width={640}
            height={480}
            loading="lazy"
            decoding="async"
            className="aspect-[4/3] w-full object-cover"
          />
        </div>
      ) : (
        <div className={`rounded-md border border-border bg-muted/40 ${compact ? "mb-3 px-3 py-2.5" : "mb-4 px-4 py-3"}`}>
          <p className="text-xs font-semibold text-primary">{locationLabel(need.city, distance, showDistance)}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{dateLabel(need)}</p>
        </div>
      )}
      <h3 className="font-heading text-lg font-semibold text-foreground">{need.title}</h3>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
        {photo && <span>{dateLabel(need)}</span>}
        {need.response_count > 0 && (
          <span>{need.response_count} personne{need.response_count > 1 ? "s ont" : " a"} dit je peux</span>
        )}
      </div>
      <Button asChild variant="outline" size="sm" className="mt-4">
        <Link to={`/petites-missions/${need.slug || need.id}`}>Voir le détail</Link>
      </Button>
    </article>
  );
};

export type NeedRowState = "default" | "own" | "responded";

/**
 * Ligne compacte de besoin, vue liste de l'Entraide.
 * La ligne entière ouvre le détail, le bouton « Je peux » reste au-dessus.
 */
export const NeedRow = ({ need, distance, state, onCanHelp, pending = false }: {
  need: EntraideNeed;
  distance: number | null;
  state: NeedRowState;
  onCanHelp: () => void;
  pending?: boolean;
}) => {
  const photo = need.photos?.[0] || null;
  const place = distance === null ? (need.city || "Près de chez vous") : `à ${Math.round(distance)} km, ${need.city || "près de chez vous"}`;
  const meta = [place, dateLabel(need), need.response_count > 0 ? `${need.response_count} « Je peux »` : null]
    .filter(Boolean).join(" · ");

  return (
    <li className="relative flex items-center gap-3 rounded-lg border border-border bg-card p-3">
      {photo ? (
        <img
          src={photo}
          alt={need.title}
          width={72}
          height={72}
          loading="lazy"
          decoding="async"
          className="h-[72px] w-[72px] shrink-0 rounded-md border border-border object-cover"
        />
      ) : (
        <span
          aria-hidden="true"
          className="flex h-[72px] w-[72px] shrink-0 items-center justify-center rounded-md bg-secondary font-heading text-xl font-semibold text-secondary-foreground"
        >
          {categoryInitial(need.category)}
        </span>
      )}
      <div className="min-w-0 flex-1">
        <h3 className="line-clamp-1 font-heading text-base font-semibold text-foreground">
          <Link to={`/petites-missions/${need.slug || need.id}`} className="after:absolute after:inset-0 after:content-['']">
            {need.title}
          </Link>
        </h3>
        <p className="line-clamp-1 text-xs text-muted-foreground">{meta}</p>
      </div>
      <div className="relative z-10 shrink-0">
        {state === "own" ? (
          <span className="text-xs font-semibold text-muted-foreground">Votre besoin</span>
        ) : state === "responded" ? (
          <span className="text-xs font-semibold text-primary">Vous avez dit je peux</span>
        ) : (
          <Button type="button" size="sm" onClick={onCanHelp} disabled={pending}>
            {pending ? "Envoi..." : "Je peux"}
          </Button>
        )}
      </div>
    </li>
  );
};

export const HelperCard = ({ helper, distance, showDistance, compact = false, counts, badgeRows }: {
  helper: PublicHelper;
  distance: number | null;
  showDistance: boolean;
  compact?: boolean;
  counts?: { given_count: number | null; received_count: number | null } | null;
  badgeRows?: MissionBadgeRow[];
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
          <HelpCounts userId={helper.id} className="mt-1" counts={counts} />
        </div>
        <MissionBadgesReceived profileId={helper.id} variant="compact" rows={badgeRows} />
      </div>
      <p className="mt-3 text-sm leading-relaxed text-foreground">{helper.helps_with?.trim() || "Disponible pour un coup de main"}</p>
      <Button type="button" size="sm" className="mt-4" onClick={contact} disabled={opening}>
        {opening ? "Ouverture..." : `Écrire à ${firstName}`}
      </Button>
    </article>
  );
};

