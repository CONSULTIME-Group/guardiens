import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { formatCity, ModeFilter, DURATION_LABELS } from "./constants";
import { missionSpotKey } from "@/lib/missionSpot";
import { MISSION_SPOT_LARGE } from "@/components/entraide/missionSpotImages";
import { avatarImageUrl } from "@/lib/storageImage";

const LOCALE_MAP: Record<string, string> = { fr: "fr-FR", en: "en-US" };

// Gradient teinté par catégorie pour le fallback sans photo (uniquement tokens sémantiques).
const CATEGORY_GRADIENT: Record<string, string> = {
  animals: "from-primary/90 to-primary/60",
  garden: "from-primary/80 to-primary/50",
  house: "from-primary/85 to-primary/55",
  skills: "from-primary/75 to-primary/45",
};

// Illustration gouache par catégorie et par espèce citée (lot P3,
// src/lib/missionSpot.ts), en 480 px au lieu des PNG de 1 024 px.

interface Props {
  mission: any;
  currentUserId?: string;
  isAuthenticated: boolean;
  canApplyMissions: boolean;
  mode: ModeFilter;
  onNavigateDetail: () => void;
  onPropose: () => void;
  compactBio?: boolean;
  showBio?: boolean;
}

const MissionCard = ({ mission: m, currentUserId, isAuthenticated, canApplyMissions, mode, onNavigateDetail, onPropose }: Props) => {
  const { t, i18n } = useTranslation();
  const tp = (k: string, opts?: any) => t(k, opts) as string;
  const locale = LOCALE_MAP[i18n.language?.split("-")[0]] || "fr-FR";

  const formatDateNeeded = (d?: string | null) => {
    if (!d) return null;
    try {
      return new Date(d).toLocaleDateString(locale, { day: "numeric", month: "short" });
    } catch { return null; }
  };

  const catKey = m.category in { animals: 1, garden: 1, house: 1, skills: 1 } ? m.category : "animals";
  const isCompleted = m.status === "completed";
  const isInProgress = m.status === "in_progress";
  const isMine = m.user_id === currentUserId;
  const isOffre = m.mission_type === "offre";
  const rawAuthor = (m.profiles as any)?.first_name || tp("mission_card.default_member");
  const authorLabel = isMine ? tp("mission_card.you") : rawAuthor;
  const authorInitial = (rawAuthor.charAt(0) || "?").toUpperCase();
  const avatarUrl = (m.profiles as any)?.avatar_url as string | undefined;
  const durationLabel = DURATION_LABELS[m.duration_estimate] ? tp(`mission_durations.${m.duration_estimate}`) : (m.duration_estimate || "");
  const dateStr = formatDateNeeded(m.date_needed);
  const hasPhoto = Array.isArray(m.photos) && m.photos.length > 0;
  const cover = hasPhoto ? m.photos[0] : null;

  const typeLabel = isOffre ? tp("mission_card.type_offer_label") : tp("mission_card.type_need_label");
  const categoryLabel = tp(`mission_categories.${catKey}`);

  // Badge type: sur photo → chip crème sur fond blanc translucide ; sur gradient → chip crème.
  const typeChipClass = hasPhoto
    ? "bg-background/95 backdrop-blur text-primary"
    : "bg-background text-primary shadow-sm";

  // Badge catégorie : chip primary plein.
  const catChipClass = hasPhoto
    ? "bg-primary text-primary-foreground"
    : "bg-background/20 backdrop-blur-sm text-primary-foreground";

  const ariaLabel = `${typeLabel} : ${m.title}${m.city ? `, ${formatCity(m.city)}` : ""}. Par ${authorLabel}.`;

  const handleClick = (e: React.MouseEvent | React.KeyboardEvent) => {
    if ((e.target as HTMLElement).closest("a,button")) return;
    onNavigateDetail();
  };

  return (
    <article
      role="button"
      tabIndex={0}
      aria-label={ariaLabel}
      onClick={handleClick}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onNavigateDetail(); } }}
      className={[
        "group relative flex h-full flex-col overflow-hidden rounded-2xl bg-card border border-border shadow-sm cursor-pointer",
        "transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5 hover:border-primary/20",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary",
        isCompleted ? "opacity-70" : "",
      ].join(" ")}
    >
      {/* Cover : photo mission, puis gouache catégorie, puis gradient et glyph */}
      <div className="relative h-52 overflow-hidden shrink-0">
        {cover ? (
          <img
            src={cover}
            alt=""
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
        ) : (
          <div className={`relative w-full h-full bg-gradient-to-br ${CATEGORY_GRADIENT[catKey]} overflow-hidden`}>
            <img
              src={MISSION_SPOT_LARGE[missionSpotKey(m.category, m.title, m.description)]}
              alt=""
              aria-hidden="true"
              width={480}
              height={480}
              loading="lazy"
              decoding="async"
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
          </div>
        )}
        {/* Badges type + catégorie empilés en haut à gauche */}
        <div className="absolute top-4 left-4 flex flex-col gap-2">
          <span className={`px-3 py-1 text-[10px] font-bold tracking-widest uppercase rounded-full w-fit ${catChipClass}`}>
            {categoryLabel}
          </span>
          <span className={`px-3 py-1 text-[11px] font-semibold tracking-wider uppercase rounded-full w-fit ${typeChipClass}`}>
            {typeLabel}
          </span>
        </div>
        {/* État terminé : sceau discret en haut à droite */}
        {isCompleted && (
          <div className="absolute top-4 right-4 px-3 py-1 rounded-full bg-muted text-muted-foreground text-[10px] font-bold tracking-widest uppercase">
            {tp("mission_card.found")}
          </div>
        )}
        {isInProgress && !isCompleted && (
          <div className="absolute top-4 right-4 px-3 py-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold tracking-widest uppercase">
            {tp("mission_card.in_progress")}
          </div>
        )}
      </div>

      {/* Corps */}
      <div className="p-6 flex flex-col flex-grow">
        <h3 className="font-heading text-2xl leading-tight text-primary mb-2 line-clamp-2">
          {m.title}
        </h3>

        {/* Ligne meta compacte : auteur · ville · quand */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-5 min-w-0">
          {avatarUrl ? (
            <img src={avatarImageUrl(avatarUrl, 24)} alt="" loading="lazy" className="h-6 w-6 rounded-full border border-border object-cover shrink-0" />
          ) : (
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-border bg-muted text-[10px] font-semibold text-foreground">
              {authorInitial}
            </span>
          )}
          <span className="truncate">
            {isOffre ? tp("mission_card.offer") : tp("mission_card.demand")}
            <strong className="text-foreground font-semibold">{authorLabel}</strong>
          </span>
          {m.city && (
            <>
              <span className="w-1 h-1 rounded-full bg-border shrink-0" />
              <span className="shrink-0">{formatCity(m.city)}</span>
            </>
          )}
        </div>

        {/* Contrepartie mise en valeur */}
        {m.exchange_offer && (
          <div className="mt-auto">
            <div className="bg-background rounded-xl p-3 border border-primary/10">
              <p className="text-[10px] text-primary/60 uppercase font-bold tracking-widest mb-1">
                {tp("mission_card.counterpart_label")}
              </p>
              <p className="text-sm text-primary font-medium italic line-clamp-2">
                {m.exchange_offer}
              </p>
            </div>
          </div>
        )}

        {/* Pied : durée + date + éventuel signal (déjà proposé / verrouillé) */}
        <div className="mt-4 flex items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 text-muted-foreground min-w-0">
            {durationLabel && <span className="truncate">{durationLabel}</span>}
            {durationLabel && dateStr && <span className="w-1 h-1 rounded-full bg-border shrink-0" />}
            {dateStr && <span className="shrink-0">{tp("mission_card.for_date", { date: dateStr })}</span>}
          </div>
          {!isCompleted && !isMine && (
            m.already_proposed ? (
              <span className="shrink-0 text-primary/70 font-semibold">{tp("mission_card.proposal_sent")}</span>
            ) : isAuthenticated && !canApplyMissions ? (
              <Link
                to="/profile"
                onClick={(e) => e.stopPropagation()}
                className="shrink-0 text-muted-foreground hover:text-primary underline underline-offset-2"
              >
                {tp("mission_card.complete_profile")}
              </Link>
            ) : (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onPropose(); }}
                className="shrink-0 text-primary font-semibold hover:underline underline-offset-2"
              >
                {mode === "offer" ? tp("mission_card.help_short") : tp("mission_card.propose_short")} →
              </button>
            )
          )}
          {isMine && !isCompleted && (
            <span className="shrink-0 text-muted-foreground italic">{tp("mission_card.your_mission")}</span>
          )}
        </div>
      </div>
    </article>
  );
};

export default MissionCard;
