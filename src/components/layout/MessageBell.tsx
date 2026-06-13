import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscriptionAccess } from "@/hooks/useSubscriptionAccess";
import { MessageSquare, Lock } from "lucide-react";
import { Link } from "react-router-dom";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { safeUUID } from "@/lib/uuid";

interface ThreadPreview {
  conversation_id: string;
  other_name: string | null;
  other_avatar: string | null;
  sit_title: string | null;
  last_body: string | null;
  last_at: string | null;
  unread: number;
}

/**
 * Cloche messagerie (top bar, à côté de NotificationBell).
 * Popover avec les 5 derniers fils + compteur global non-lus.
 * Lien « Tout voir » → /messages.
 *
 * Le sitter sans abonnement voit une version cadenassée (gate premium).
 */
const MessageBell = () => {
  const { user } = useAuth();
  const { hasAccess } = useSubscriptionAccess();
  const userId = user?.id;
  const [threads, setThreads] = useState<ThreadPreview[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);

  const load = useCallback(async () => {
    if (!userId) {
      setThreads([]);
      setUnreadCount(0);
      return;
    }

    // Conversations de l'utilisateur (les 5 plus récentes au sens dernier message)
    const { data: convs } = await supabase
      .from("conversations")
      .select(`
        id, owner_id, sitter_id, sit_id,
        sit:sits(title),
        owner:profiles!conversations_owner_id_fkey(first_name, avatar_url),
        sitter:profiles!conversations_sitter_id_fkey(first_name, avatar_url),
        messages:messages(content, created_at, sender_id, read_at, is_system)
      `)
      .or(`owner_id.eq.${userId},sitter_id.eq.${userId}`)
      .order("updated_at", { ascending: false })
      .limit(8);

    if (!convs || convs.length === 0) {
      setThreads([]);
      setUnreadCount(0);
      return;
    }

    let totalUnread = 0;
    const previews: ThreadPreview[] = convs.map((c: any) => {
      const msgs = (c.messages || []).slice().sort(
        (a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      const last = msgs[0] || null;
      const unread = msgs.filter((m: any) => !m.read_at && m.sender_id !== userId).length;
      totalUnread += unread;
      const isOwner = c.owner_id === userId;
      const other = isOwner ? c.sitter : c.owner;
      return {
        conversation_id: c.id,
        other_name: other?.first_name || null,
        other_avatar: other?.avatar_url || null,
        sit_title: c.sit?.title || null,
        last_body: last?.body || null,
        last_at: last?.created_at || null,
        unread,
      };
    });

    // Tri : non-lus d'abord, puis date du dernier message
    previews.sort((a, b) => {
      if ((b.unread > 0 ? 1 : 0) !== (a.unread > 0 ? 1 : 0)) {
        return (b.unread > 0 ? 1 : 0) - (a.unread > 0 ? 1 : 0);
      }
      return new Date(b.last_at || 0).getTime() - new Date(a.last_at || 0).getTime();
    });

    setThreads(previews.slice(0, 5));
    setUnreadCount(totalUnread);
  }, [userId]);

  useEffect(() => {
    void load();
  }, [load]);

  // Realtime : nouveau message dans une conversation où je participe
  useEffect(() => {
    if (!userId) return;
    const channel = supabase.channel(`messages-bell-${userId}-${safeUUID()}`);
    channel.on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "messages" },
      () => { void load(); }
    );
    channel.on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "messages" },
      () => { void load(); }
    );
    channel.subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [userId, load]);

  // Sitter sans accès : version cadenassée, lien direct vers la page (qui gère le gate)
  if (user && user.role === "sitter" && !hasAccess) {
    return (
      <Link
        to="/messages"
        aria-label="Messagerie (abonnement requis)"
        className="relative inline-flex items-center justify-center w-9 h-9 rounded-full text-muted-foreground hover:bg-accent transition-colors"
      >
        <MessageSquare className="h-5 w-5" strokeWidth={1.8} />
        <Lock className="absolute -bottom-0.5 -right-0.5 h-3 w-3 text-amber-500" />
      </Link>
    );
  }

  if (!userId) return null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={unreadCount > 0 ? `Messagerie, ${unreadCount} non lus` : "Messagerie"}
          className="relative inline-flex items-center justify-center w-9 h-9 rounded-full text-foreground hover:bg-accent transition-colors"
        >
          <MessageSquare className="h-5 w-5" strokeWidth={1.8} />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-semibold flex items-center justify-center tabular-nums">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-[min(360px,calc(100vw-1.5rem))] p-0 overflow-hidden"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <p className="text-sm font-semibold text-foreground">Messagerie</p>
          {unreadCount > 0 && (
            <span className="text-[10px] uppercase tracking-wider font-semibold text-destructive">
              {unreadCount} non lu{unreadCount > 1 ? "s" : ""}
            </span>
          )}
        </div>

        {threads.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <p className="text-sm text-muted-foreground">
              Pas encore de conversation.
            </p>
            <p className="text-xs text-muted-foreground/80 mt-1">
              Vos échanges avec propriétaires et gardiens apparaîtront ici.
            </p>
          </div>
        ) : (
          <ul className="max-h-[60vh] overflow-y-auto divide-y divide-border">
            {threads.map((t) => (
              <li key={t.conversation_id}>
                <Link
                  to={`/messages?conv=${t.conversation_id}`}
                  onClick={() => setOpen(false)}
                  className="flex items-start gap-3 px-4 py-3 hover:bg-muted/50 transition-colors"
                >
                  <div className="shrink-0 w-9 h-9 rounded-full overflow-hidden bg-muted flex items-center justify-center ring-1 ring-border">
                    {t.other_avatar ? (
                      <img
                        src={t.other_avatar}
                        alt=""
                        loading="lazy"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-xs font-semibold text-muted-foreground">
                        {(t.other_name || "?").charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className={`text-sm truncate ${t.unread > 0 ? "font-semibold text-foreground" : "text-foreground/90"}`}>
                        {t.other_name || "Conversation"}
                      </p>
                      {t.last_at && (
                        <span className="text-[10px] text-muted-foreground shrink-0">
                          {formatDistanceToNow(new Date(t.last_at), { locale: fr, addSuffix: false })}
                        </span>
                      )}
                    </div>
                    {t.sit_title && (
                      <p className="text-[11px] text-muted-foreground truncate">
                        {t.sit_title}
                      </p>
                    )}
                    {t.last_body && (
                      <p className={`text-xs truncate mt-0.5 ${t.unread > 0 ? "text-foreground" : "text-muted-foreground"}`}>
                        {t.last_body}
                      </p>
                    )}
                  </div>
                  {t.unread > 0 && (
                    <span className="shrink-0 mt-1 min-w-[18px] h-[18px] px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-semibold flex items-center justify-center tabular-nums">
                      {t.unread > 9 ? "9+" : t.unread}
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        )}

        <div className="border-t border-border">
          <Link
            to="/messages"
            onClick={() => setOpen(false)}
            className="block px-4 py-2.5 text-center text-xs font-semibold text-primary hover:bg-primary/5 transition-colors"
          >
            Tout voir →
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default MessageBell;
