import { Check, Trash2, Lock } from "lucide-react";
import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

export interface NotificationData {
  id: string;
  type: string;
  title: string;
  body: string;
  link: string | null;
  read_at: string | null;
  created_at: string;
  actor_name: string | null;
  actor_avatar_url: string | null;
}

const typeTone: Record<string, "success" | "info" | "warning" | "destructive" | "muted"> = {
  sitter_available: "success",
  new_application: "info",
  sit_confirmed: "success",
  sit_started: "success",
  sit_completed: "success",
  sit_cancelled: "destructive",
  review_published: "info",
  new_message: "info",
  application_accepted: "success",
  application_rejected: "warning",
  application_cancelled: "muted",
  reminder_7days: "info",
  reminder_48h: "warning",
  identity_verified: "success",
  identity_rejected: "warning",
  experience_verified: "success",
  experience_rejected: "warning",
  emergency_alert: "destructive",
  mission_proposal: "info",
  mission_accepted: "success",
  mission_declined: "muted",
  mission_completed: "success",
  mission_cancelled: "muted",
  subscription_offered: "success",
  listing_hidden: "warning",
  listing_deleted: "destructive",
  admin_contact: "info",
  info: "muted",
};

const toneDot: Record<string, string> = {
  success: "bg-success",
  info: "bg-info",
  warning: "bg-warning",
  destructive: "bg-destructive",
  muted: "bg-muted-foreground/40",
};

interface Props {
  notification: NotificationData;
  hasAccess: boolean;
  onMarkRead: (id: string) => void;
  onDelete: (id: string) => void;
}

export const NotificationItem = ({ notification: n, hasAccess, onMarkRead, onDelete }: Props) => {
  const tone = typeTone[n.type] ?? "muted";
  const isLockedInvite = n.type === "sit_invitation" && !hasAccess;

  const displayTitle = isLockedInvite ? "Une invitation à garder vous attend" : n.title;
  const displayBody = isLockedInvite
    ? "Activez votre espace gardien pour découvrir l'annonce, le propriétaire et candidater."
    : n.body;
  const displayLink = isLockedInvite ? "/pricing" : n.link;
  const displayAvatar = isLockedInvite ? null : n.actor_avatar_url;
  const isUnread = !n.read_at;

  const inner = (
    <div
      className={[
        "relative rounded-xl border transition-all duration-150",
        "flex items-stretch gap-0 overflow-hidden",
        isUnread
          ? "border-primary/30 bg-accent/30 shadow-sm"
          : "border-border bg-card hover:bg-muted/30",
      ].join(" ")}
    >
      {/* Bordure gauche unread */}
      {isUnread && (
        <span
          aria-hidden
          className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl bg-primary"
        />
      )}

      <div className="flex items-start gap-3 flex-1 pl-4 pr-2 py-4 min-w-0">
        {/* Avatar / pastille */}
        {displayAvatar ? (
          <img
            src={displayAvatar}
            alt=""
            className="w-9 h-9 rounded-full object-cover shrink-0 mt-0.5"
          />
        ) : isLockedInvite ? (
          <span className="shrink-0 h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center mt-0.5">
            <Lock className="h-4 w-4 text-primary" />
          </span>
        ) : (
          <span
            aria-hidden
            className={`shrink-0 mt-[7px] h-2.5 w-2.5 rounded-full ${toneDot[tone]}`}
          />
        )}

        {/* Contenu texte */}
        <div className="flex-1 min-w-0 space-y-0.5">
          <div className="flex items-start justify-between gap-2">
            <p className={`text-sm leading-snug ${isUnread ? "font-semibold text-foreground" : "font-medium text-foreground/80"}`}>
              {displayTitle}
            </p>
            <span className="text-[11px] text-muted-foreground shrink-0 mt-0.5 tabular-nums">
              {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: fr })}
            </span>
          </div>
          <p className="text-sm text-muted-foreground line-clamp-2">{displayBody}</p>
          {isLockedInvite && (
            <p className="text-xs text-primary font-medium pt-1">
              Activer mon espace gardien
            </p>
          )}
        </div>
      </div>

      {/* Actions tactiles 44px */}
      <div className="flex flex-col border-l border-border/60 shrink-0">
        {isUnread && (
          <button
            aria-label="Marquer comme lu"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onMarkRead(n.id); }}
            className="flex-1 flex items-center justify-center w-11 min-h-[44px] text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
          >
            <Check className="h-4 w-4" strokeWidth={2.5} />
          </button>
        )}
        <button
          aria-label="Supprimer la notification"
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDelete(n.id); }}
          className={[
            "flex-1 flex items-center justify-center w-11 min-h-[44px]",
            "text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors",
            !isUnread ? "min-h-[88px]" : "",
          ].join(" ")}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );

  return displayLink ? (
    <Link to={displayLink} className="block" aria-label={displayTitle}>
      {inner}
    </Link>
  ) : (
    <div>{inner}</div>
  );
};
