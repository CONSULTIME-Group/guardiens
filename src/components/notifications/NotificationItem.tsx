import { Check, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { avatarImageUrl } from "@/lib/storageImage";
import { notificationTone } from "@/lib/notificationKinds";

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

const toneDot: Record<string, string> = {
  success: "bg-success",
  info: "bg-info",
  warning: "bg-warning",
  destructive: "bg-destructive",
  muted: "bg-muted-foreground/40",
};

interface Props {
  notification: NotificationData;
  onMarkRead: (id: string) => void;
  onDelete: (id: string) => void;
}

export const NotificationItem = ({ notification: n, onMarkRead, onDelete }: Props) => {
  const tone = notificationTone(n.type);
  const displayTitle = n.title;
  const displayBody = n.body;
  const displayLink = n.link;
  const displayAvatar = n.actor_avatar_url;
  const isUnread = !n.read_at;
  // Lot Z : ouvrir une notification la marque comme lue.
  const handleOpen = () => {
    if (isUnread) onMarkRead(n.id);
  };

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
            src={avatarImageUrl(displayAvatar, 36)}
            alt=""
            className="w-9 h-9 rounded-full object-cover shrink-0 mt-0.5"
          />
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
    <Link to={displayLink} onClick={handleOpen} className="block" aria-label={displayTitle}>
      {inner}
    </Link>
  ) : (
    <div onClick={handleOpen} className={isUnread ? "cursor-pointer" : undefined}>{inner}</div>
  );
};
