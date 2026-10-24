import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import MissionBadgesReceived, { type MissionBadgeRow } from "@/components/missions/MissionBadgesReceived";
import HelpCounts from "@/components/entraide/HelpCounts";
import { startConversation } from "@/lib/conversation";
import { helperActivityLabel, helperFirstMessage, helperSkills } from "@/lib/helperDisplay";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { capitalizeFirstName, publicFirstName } from "@/lib/displayName";
import { avatarImageUrl } from "@/lib/storageImage";
import { missionSpotKey } from "@/lib/missionSpot";
import { MISSION_SPOT_LARGE, MISSION_SPOT_SMALL } from "@/components/entraide/missionSpotImages";
import { needExcerpt } from "@/lib/needExcerpt";

export interface EntraideNeed {
  id: string;
  slug: string | null;
  title: string;
  /** Lot E13 : description lue par la liste, extrait affiché sous le titre. */
  description?: string | null;
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
  author_avatar_url?: string | null;
  author_first_name?: string | null;
}


export interface PublicHelper {
  id: string;
  first_name: string;
  avatar_url: string | null;
  city: string | null;
  latitude_approx: number | null;
  longitude_approx: number | null;
  helps_with: string | null;
  /** Lot E3 : savoir-faire du profil gardien puis propriétaire (vue public_helpers). */
  competences?: string[] | null;
  /** Lot E3 : dernier jour d'activité, à la journée. */
  last_active_on?: string | null;
}

export const dateLabel = (need: Pick<EntraideNeed, "end_date" | "date_needed">) => {
  const value = need.end_date || need.date_needed;
  if (!value) return "À convenir ensemble";
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric" }).format(new Date(value));
};

const locationLabel = (city: string | null, distance: number | null, showDistance: boolean) => {
  const place = capitalizeFirstName(city) || "Près de chez vous";
  if (!showDistance || distance === null) return place;
  if (distance < 2) return `${place}, tout près de chez vous`;
  return `${place}, à ${Math.round(distance)} km`;
};

export const NeedCard = ({ need, distance, showDistance, compact = false }: {
  need: EntraideNeed;
  distance: number | null;
  showDistance: boolean;
  compact?: boolean;
}) => {
  const photo = need.photos?.[0] || null;
  // Sans photo de mission : portrait public de l'auteur, sinon gouache de la
  // catégorie (lot P3).
  const [avatarFailed, setAvatarFailed] = useState(false);
  const authorAvatar = !photo && !avatarFailed ? need.author_avatar_url || null : null;
  const authorName = capitalizeFirstName(need.author_first_name) || null;
  const spot = !photo && !authorAvatar ? MISSION_SPOT_LARGE[missionSpotKey(need.category, need.title)] : null;
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
      ) : authorAvatar ? (
        <div className={`overflow-hidden rounded-md border border-border bg-muted ${compact ? "mb-3" : "mb-4"}`}>
          <img
            src={avatarImageUrl(authorAvatar, 640)}
            alt={authorName ? `Portrait de ${authorName}, auteur de l'annonce` : "Portrait de l'auteur de l'annonce"}
            width={640}
            height={480}
            loading="lazy"
            decoding="async"
            onError={() => setAvatarFailed(true)}
            className="aspect-[4/3] w-full object-cover"
          />
        </div>
      ) : (
        <div className={`flex aspect-[4/3] items-center justify-center overflow-hidden rounded-md border border-border bg-muted/40 ${compact ? "mb-3" : "mb-4"}`}>
          <img
            src={spot ?? undefined}
            alt=""
            aria-hidden="true"
            width={480}
            height={480}
            loading="lazy"
            decoding="async"
            data-testid="need-card-spot"
            className="h-[85%] w-auto object-contain"
          />
        </div>
      )}
      <h3 className="font-heading text-lg font-semibold text-foreground">{need.title}</h3>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
        {photo && <span>{dateLabel(need)}</span>}
        {!photo && <span>{locationLabel(need.city, distance, showDistance)}</span>}
        {!photo && <span>{dateLabel(need)}</span>}
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

/** Lot E13 : lieu, date et nombre de « Je peux », partagés par la ligne et la fenêtre. */
export function needMetaLine(need: EntraideNeed, distance: number | null): string {
  const city = capitalizeFirstName(need.city) || "Près de chez vous";
  const place = distance === null
    ? city
    : distance < 2
      ? `${city}, tout près de chez vous`
      : `à ${Math.round(distance)} km, ${city}`;
  return [place, dateLabel(need), need.response_count > 0 ? `${need.response_count} « Je peux »` : null]
    .filter(Boolean).join(" · ");
}

/**
 * Ligne de besoin, vue liste de l'Entraide.
 * Lot E13 (24/10/2026) : sur téléphone, le titre prend toute la largeur (le
 * bouton passe sous l'extrait), en police de lecture et non de titre, et un
 * extrait de la description dit ce qui est demandé avant le « Je peux ».
 * La ligne entière ouvre le détail, le bouton reste au-dessus.
 */
export const NeedRow = ({ need, distance, state, onCanHelp, pending = false }: {
  need: EntraideNeed;
  distance: number | null;
  state: NeedRowState;
  onCanHelp: () => void;
  pending?: boolean;
}) => {
  const photo = need.photos?.[0] || null;
  // Sans photo de mission : portrait public de l'auteur, sinon gouache de la
  // catégorie (lot P3).
  const [avatarFailed, setAvatarFailed] = useState(false);
  const authorAvatar = !photo && !avatarFailed ? need.author_avatar_url || null : null;
  const authorName = capitalizeFirstName(need.author_first_name) || null;
  const meta = needMetaLine(need, distance);
  const excerpt = needExcerpt(need.description, need.title, 280);
  const thumb = "h-14 w-14 sm:h-[72px] sm:w-[72px] shrink-0 rounded-md border border-border";

  return (
    <li
      className="relative grid grid-cols-[56px_minmax(0,1fr)] gap-x-3 gap-y-2 rounded-lg border border-border bg-card p-3 sm:grid-cols-[72px_minmax(0,1fr)] sm:p-4"
      data-testid="need-row"
    >
      {photo ? (
        <img
          src={photo}
          alt={need.title}
          width={72}
          height={72}
          loading="lazy"
          decoding="async"
          className={`${thumb} object-cover sm:row-span-3`}
        />
      ) : authorAvatar ? (
        <img
          src={avatarImageUrl(authorAvatar, 144)}
          alt={authorName ? `Portrait de ${authorName}, auteur de l'annonce` : "Portrait de l'auteur de l'annonce"}
          width={72}
          height={72}
          loading="lazy"
          decoding="async"
          onError={() => setAvatarFailed(true)}
          className={`${thumb} object-cover sm:row-span-3`}
        />
      ) : (
        <img
          src={MISSION_SPOT_SMALL[missionSpotKey(need.category, need.title)]}
          alt=""
          aria-hidden="true"
          width={72}
          height={72}
          loading="lazy"
          decoding="async"
          data-testid="need-row-spot"
          className={`${thumb} bg-muted/40 object-contain p-1 sm:row-span-3`}
        />
      )}
      {/* Police de lecture : le style global des titres (Playfair) est écarté ici. */}
      <h3 className="self-center font-body line-clamp-3 text-[15px] font-semibold leading-snug text-foreground sm:line-clamp-2">
        <Link to={`/petites-missions/${need.slug || need.id}`} className="after:absolute after:inset-0 after:content-['']">
          {need.title}
        </Link>
      </h3>
      {excerpt && (
        <p className="col-span-2 line-clamp-2 text-sm leading-relaxed text-foreground/80 sm:col-span-1 sm:col-start-2" data-testid="need-row-excerpt">
          {excerpt}
        </p>
      )}
      <div className="col-span-2 flex items-center justify-between gap-3 sm:col-span-1 sm:col-start-2">
        <p className="min-w-0 line-clamp-2 text-xs leading-snug text-muted-foreground">{meta}</p>
        <div className="relative z-10 shrink-0">
          {state === "own" ? (
            <span className="text-xs font-semibold text-muted-foreground">Votre besoin</span>
          ) : state === "responded" ? (
            <span className="text-xs font-semibold text-primary">Vous avez dit je peux</span>
          ) : (
            <Button type="button" variant="outline" className="min-h-11 rounded-full px-5" onClick={onCanHelp} disabled={pending}>
              {pending ? "Envoi..." : "Je peux"}
            </Button>
          )}
        </div>
      </div>
    </li>
  );
};

/**
 * Ouvre la conversation avec une personne prête à aider, premier message
 * prérempli (lot E3). Sert aussi au retour d'inscription (?contact=, lot E4).
 */
export async function openHelperConversation(helper: PublicHelper, navigate: (to: string) => void): Promise<boolean> {
  const firstName = capitalizeFirstName(publicFirstName(helper.first_name)) || "";
  try {
    const { conversationId, error } = await startConversation({ otherUserId: helper.id, context: "helper_inquiry" });
    if (!conversationId) {
      toast.error(error?.includes("soi-même")
        ? "Cette carte est la vôtre."
        : "La conversation sera disponible dans un instant. Réessayez.");
      return false;
    }
    const draft = helperFirstMessage(firstName, helperSkills(helper.competences));
    navigate(`/messages?c=${conversationId}&draft=${encodeURIComponent(draft)}`);
    return true;
  } catch {
    toast.error("La conversation sera disponible dans un instant. Réessayez.");
    return false;
  }
}

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
  const firstName = capitalizeFirstName(publicFirstName(helper.first_name)) || "Membre";
  const skills = helperSkills(helper.competences);
  const activity = helperActivityLabel(helper.last_active_on);

  const contact = async () => {
    if (!isAuthenticated) {
      navigate(`/inscription?redirect=${encodeURIComponent(`/petites-missions?contact=${helper.id}`)}`);
      return;
    }
    if (opening) return;
    setOpening(true);
    try {
      await openHelperConversation(helper, navigate);
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
          <p className="text-xs text-muted-foreground">
            {locationLabel(helper.city, distance, showDistance)}
            {activity && <>{" · "}<span className="text-primary">{activity}</span></>}
          </p>
          <HelpCounts userId={helper.id} className="mt-1" counts={counts} />
        </div>
        <MissionBadgesReceived profileId={helper.id} variant="compact" rows={badgeRows} />
      </div>
      {skills.length > 0 && (
        <p className={`mt-3 text-sm text-foreground ${compact ? "line-clamp-2" : ""}`} data-testid="helper-skills">
          <span className="text-muted-foreground">Peut vous aider pour : </span>
          {skills.join(", ")}
        </p>
      )}
      {helper.helps_with?.trim() && <p className="mt-3 text-sm leading-relaxed text-foreground">{helper.helps_with.trim()}</p>}
      <Button type="button" size="sm" variant="outline" className="mt-4" onClick={contact} disabled={opening}>
        {opening ? "Ouverture..." : `Écrire à ${firstName}`}
      </Button>
    </article>
  );
};

