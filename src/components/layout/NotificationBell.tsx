import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscriptionAccess } from "@/hooks/useSubscriptionAccess";
import { Bell, Lock } from "lucide-react";
import { Link } from "react-router-dom";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { safeUUID } from "@/lib/uuid";

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  link: string | null;
  read_at: string | null;
  created_at: string;
}

const NotificationBell = () => {
  const { user } = useAuth();
  const { hasAccess } = useSubscriptionAccess();
  const userId = user?.id;
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);

  const load = useCallback(async () => {
    if (!userId) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(20);

    const items = (data as Notification[]) || [];
    setNotifications(items);
    setUnreadCount(items.filter((n) => !n.read_at).length);
  }, [userId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!userId) return;

    const channel = supabase.channel(`notifications-realtime-${userId}-${safeUUID()}`);
    const notificationFilter = `user_id=eq.${userId}`;

    channel.on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "notifications",
        filter: notificationFilter,
      },
      (payload) => {
        const newNotif = payload.new as Notification;
        setNotifications((prev) => [newNotif, ...prev].slice(0, 20));
        setUnreadCount((prev) => prev + 1);
      }
    );

    channel.on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "notifications",
        filter: notificationFilter,
      },
      (payload) => {
        const updated = payload.new as Notification;
        setNotifications((prev) => {
          const next = prev.map((n) => (n.id === updated.id ? updated : n));
          setUnreadCount(next.filter((n) => !n.read_at).length);
          return next;
        });
      }
    );

    channel.on(
      "postgres_changes",
      {
        event: "DELETE",
        schema: "public",
        table: "notifications",
        filter: notificationFilter,
      },
      (payload) => {
        const deletedId = (payload.old as Notification).id;
        setNotifications((prev) => {
          const next = prev.filter((n) => n.id !== deletedId);
          setUnreadCount(next.filter((n) => !n.read_at).length);
          return next;
        });
      }
    );

    channel.subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId]);

  const markAllRead = async () => {
    if (!userId || unreadCount === 0) return;
    const unreadIds = notifications.filter((n) => !n.read_at).map((n) => n.id);
    await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .in("id", unreadIds);
    setNotifications((prev) =>
      prev.map((n) => (n.read_at ? n : { ...n, read_at: new Date().toISOString() }))
    );
    setUnreadCount(0);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={unreadCount > 0 ? `Notifications (${unreadCount} non lues)` : "Notifications"}
          className="relative inline-flex items-center justify-center w-11 h-11 rounded-full hover:bg-accent transition-colors"
        >
          <Bell className="h-5 w-5 text-muted-foreground" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 bg-primary text-primary-foreground text-[10px] rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 font-semibold tabular-nums z-10">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <p className="text-sm font-semibold">Notifications</p>
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="text-xs text-primary hover:underline"
            >
              Tout marquer comme lu
            </button>
          )}
        </div>
        <div className="max-h-80 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="text-center py-8 px-4">
              <p className="text-sm text-muted-foreground">Tout est calme par ici.</p>
              <p className="text-xs text-muted-foreground/80 mt-1">Vous serez prévenu·e dès qu'il se passera quelque chose.</p>
            </div>
          ) : (
            notifications.map((n) => {
              const isLockedInvite = n.type === "sit_invitation" && !hasAccess;
              const displayTitle = isLockedInvite
                ? "Une invitation à garder vous attend"
                : n.title;
              const displayBody = isLockedInvite
                ? "Activez votre espace gardien pour découvrir l'annonce."
                : n.body;
              const displayLink = isLockedInvite ? "/pricing" : n.link;

              const inner = (
                <div
                  className={`px-4 py-3 border-b border-border/50 hover:bg-accent/50 transition-colors ${
                    !n.read_at ? "bg-primary/5" : ""
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {isLockedInvite ? (
                      <Lock className="mt-1 h-3.5 w-3.5 text-primary shrink-0" />
                    ) : !n.read_at ? (
                      <span className="mt-1.5 h-2 w-2 rounded-full bg-primary shrink-0" />
                    ) : null}
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{displayTitle}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                        {displayBody}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        {formatDistanceToNow(new Date(n.created_at), {
                          addSuffix: true,
                          locale: fr,
                        })}
                      </p>
                    </div>
                  </div>
                </div>
              );

              const handleClick = async () => {
                if (!n.read_at) {
                  await supabase
                    .from("notifications")
                    .update({ read_at: new Date().toISOString() })
                    .eq("id", n.id);
                  setNotifications((prev) =>
                    prev.map((x) =>
                      x.id === n.id ? { ...x, read_at: new Date().toISOString() } : x
                    )
                  );
                  setUnreadCount((prev) => Math.max(0, prev - 1));
                }
                setOpen(false);
              };

              return displayLink ? (
                <Link
                  key={n.id}
                  to={displayLink}
                  onClick={handleClick}
                  className="block"
                >
                  {inner}
                </Link>
              ) : (
                <div key={n.id} onClick={handleClick} className="cursor-pointer">{inner}</div>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default NotificationBell;
