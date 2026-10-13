import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Bell } from "lucide-react";
import { Link } from "react-router-dom";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { safeUUID } from "@/lib/uuid";
import { markAllNotificationsRead, markNotificationRead } from "@/lib/notificationsRead";

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  link: string | null;
  read_at: string | null;
  created_at: string;
}

interface NotificationBellProps {
  /** Remonte le nombre de non-lus au parent (pastille de synthèse). */
  onUnreadChange?: (count: number) => void;
}

const NotificationBell = ({ onUnreadChange }: NotificationBellProps = {}) => {
  const { user } = useAuth();
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
    onUnreadChange?.(unreadCount);
  }, [unreadCount, onUnreadChange]);

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

  // Lot Z : toutes les non lues du membre en base, pas seulement les 20 chargées.
  const markAllRead = async () => {
    if (!userId || unreadCount === 0) return;
    const { ok, readAt } = await markAllNotificationsRead(userId);
    if (!ok) return;
    setNotifications((prev) =>
      prev.map((n) => (n.read_at ? n : { ...n, read_at: readAt }))
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
              const inner = (
                <div
                  className={`px-4 py-3 border-b border-border/50 hover:bg-accent/50 transition-colors ${
                    !n.read_at ? "bg-primary/5" : ""
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {!n.read_at ? (
                      <span className="mt-1.5 h-2 w-2 rounded-full bg-primary shrink-0" />
                    ) : null}
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{n.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                        {n.body}
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
                setOpen(false);
                if (n.read_at) return;
                const { ok, readAt } = await markNotificationRead(n.id);
                if (!ok) return;
                setNotifications((prev) =>
                  prev.map((x) => (x.id === n.id ? { ...x, read_at: readAt } : x))
                );
                setUnreadCount((prev) => Math.max(0, prev - 1));
              };

              return n.link ? (
                <Link
                  key={n.id}
                  to={n.link}
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
        <div className="border-t border-border px-4 py-2.5 text-center">
          <Link
            to="/notifications"
            onClick={() => setOpen(false)}
            className="text-xs font-medium text-primary hover:underline"
          >
            Tout voir
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default NotificationBell;
