import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Lock, Sparkles, ChevronRight, UserPen } from "lucide-react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { formatCity, ModeFilter, DURATION_LABELS } from "./constants";
import { sanitizeBioForCard } from "@/lib/sanitizeBio";
import MissionCardCover from "@/components/missions/MissionCardCover";

const LOCALE_MAP: Record<string, string> = { fr: "fr-FR", en: "en-US", es: "es-ES", it: "it-IT", de: "de-DE" };

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

const MissionCard = ({ mission: m, currentUserId, isAuthenticated, canApplyMissions, mode, onNavigateDetail, onPropose, compactBio = false, showBio = true }: Props) => {
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
  const isMine = m.user_id === currentUserId;
  const rawAuthor = (m.profiles as any)?.first_name || tp("mission_card.default_member");
  const authorLabel = isMine ? tp("mission_card.you") : rawAuthor;
  const authorInitial = rawAuthor.charAt(0).toUpperCase();
  const durationLabel = DURATION_LABELS[m.duration_estimate] ? tp(`mission_durations.${m.duration_estimate}`) : (m.duration_estimate || "");
  const dateStr = formatDateNeeded(m.date_needed);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onNavigateDetail}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onNavigateDetail(); } }}
      className="cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-lg"
    >
      <Card className={`border-border transition-colors h-full overflow-hidden ${isCompleted ? "opacity-50 grayscale" : "hover:border-primary/30"}`}>
        {Array.isArray(m.photos) && m.photos.length > 0 && (
          <MissionCardCover
            photo={m.photos[0]}
            category={catKey}
            title={m.title}
            className="rounded-none rounded-t-lg aspect-[16/9]"
          />
        )}
        <CardContent className="p-4 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{tp(`mission_categories.${catKey}`)}</span>
            {m.response_count > 0 ? (
              <span className="text-xs text-muted-foreground bg-accent px-2 py-0.5 rounded-full">
                {tp(m.response_count > 1 ? "mission_card.proposals_other" : "mission_card.proposals_one", { count: m.response_count })}
              </span>
            ) : !isCompleted && !isMine ? (
              <span className="inline-flex items-center gap-1 text-xs text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                <Sparkles className="h-3 w-3" /> {tp("mission_card.first_to_help")}
              </span>
            ) : null}
          </div>
          <p className="font-medium text-sm text-foreground">{m.title}</p>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {(m.profiles as any)?.avatar_url ? (
              <img
                src={(m.profiles as any).avatar_url}
                alt=""
                loading="lazy"
                className="h-6 w-6 rounded-full border border-border object-cover"
              />
            ) : (
              <span className="flex h-6 w-6 items-center justify-center rounded-full border border-border bg-muted text-[11px] font-semibold text-foreground">
                {authorInitial || "?"}
              </span>
            )}
            <span>
              {(m.mission_type === "offre") ? tp("mission_card.offer") : tp("mission_card.demand")}<span className="font-medium text-foreground">{authorLabel}</span>
            </span>
          </div>
          {showBio && (() => {
            const safeBio = sanitizeBioForCard((m.profiles as any)?.bio);
            if (!safeBio) {
              if (isMine) {
                return (
                  <Link
                    to="/profile?focus=bio"
                    onClick={(e) => e.stopPropagation()}
                    className="inline-flex items-center gap-1 text-xs text-primary hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
                  >
                    <UserPen className="h-3 w-3" />
                    {tp("mission_card.add_bio_cta")}
                  </Link>
                );
              }
              return (
                <p className="text-xs italic text-muted-foreground/70 leading-snug">
                  {tp("mission_card.no_bio")}
                </p>
              );
            }
            if (isMine) return null;
            const displayBio = compactBio && safeBio.length > 80
              ? `${safeBio.slice(0, 80).trimEnd()}…`
              : safeBio;
            return (
              <p className={`text-xs italic text-foreground/70 leading-snug ${compactBio ? "line-clamp-1" : "line-clamp-2"}`}>
                « {displayBio} »
              </p>
            );
          })()}
          <p className="text-xs text-muted-foreground">
            {formatCity(m.city || ",")} · {durationLabel}
            {dateStr && <> · {tp("mission_card.for_date", { date: dateStr })}</>}
          </p>
          <p className="text-xs text-muted-foreground">{tp("mission_card.exchange_label", { exchange: m.exchange_offer })}</p>
          {isCompleted ? (
            <span className="inline-block text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">{tp("mission_card.found")}</span>
          ) : m.status === "in_progress" ? (
            <span className="inline-block text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">{tp("mission_card.in_progress")}</span>
          ) : null}
          {!isCompleted && (
            isMine ? (
              <span className="inline-block text-xs text-muted-foreground text-center w-full mt-2">{tp("mission_card.your_mission")}</span>
            ) : isAuthenticated && !canApplyMissions ? (
              <Button size="sm" variant="outline" className="w-full mt-2 gap-1 text-muted-foreground" disabled>
                <Lock className="h-3 w-3" /> {tp("mission_card.complete_profile")}
              </Button>
            ) : m.already_proposed ? (
              <Button size="sm" variant="outline" className="w-full mt-2 opacity-60 cursor-not-allowed" disabled>
                {tp("mission_card.proposal_sent")}
              </Button>
            ) : (
              <Button
                size="sm"
                className="w-full mt-2"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); onPropose(); }}
              >
                {mode === "offer" ? tp("mission_card.help_name", { name: rawAuthor }) : tp("mission_card.propose_to", { name: rawAuthor })}
                <ChevronRight className="ml-1 h-3.5 w-3.5" />
              </Button>
            )
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default MissionCard;
