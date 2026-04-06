import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "react-router-dom";
import { Bell, Check, CheckCheck, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

interface Notification {
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

const typeIcons: Record<string, string> = {
  sitter_available: "🟢",
  new_application: "📩",
  sit_confirmed: "✅",
  sit_cancelled: "❌",
  review_published: "⭐",
  new_message: "💬",
  application_accepted: "🎉",
  application_rejected: "😔",
  application_cancelled: "↩️",
  reminder_7days: "📅",
  reminder_48h: "⏰",
  info: "ℹ️",
};

const Notifications = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);
    setNotifications((data as Notification[]) || []);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  // Realtime
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("notifs-page")
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "notifications",
        filter: `user_id=eq.${user.id}`,
      }, (payload) => {
        setNotifications((prev) => [payload.new as Notification, ...prev]);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const markRead = async (id: string) => {
    await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n))
    );
  };

  const markAllRead = async () => {
    const unreadIds = notifications.filter((n) => !n.read_at).map((n) => n.id);
    if (unreadIds.length === 0) return;
    await supabase.from("notifications").update({ read_at: new Date().toISOString() }).in("id", unreadIds);
    setNotifications((prev) =>
      prev.map((n) => (n.read_at ? n : { ...n, read_at: new Date().toISOString() }))
    );
  };

  const deleteNotification = async (id: string) => {
    await supabase.from("notifications").delete().eq("id", id);
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const unreadCount = notifications.filter((n) => !n.read_at).length;

  if (loading) return <div className="p-6 text-muted-foreground">Chargement...</div>;

  return (
    <div className="p-6 md:p-10 max-w-2xl mx-auto animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-heading text-2xl md:text-3xl font-bold flex items-center gap-2">
            <Bell className="h-6 w-6" /> Notifications
          </h1>
          {unreadCount > 0 && (
            <p className="text-sm text-muted-foreground mt-1">{unreadCount} non lue{unreadCount > 1 ? "s" : ""}</p>
          )}
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" onClick={markAllRead} className="gap-1.5">
            <CheckCheck className="h-4 w-4" /> Tout marquer lu
          </Button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <Bell className="h-12 w-12 mx-auto mb-4 opacity-30" />
          <p>Aucune notification pour le moment.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => {
            const content = (
              <div
                className={`rounded-lg border border-border p-4 transition-colors hover:shadow-sm ${
                  !n.read_at ? "bg-primary/5 border-primary/20" : "bg-card"
                }`}
              >
                <div className="flex items-start gap-3">
                  {n.actor_avatar_url ? (
                    <img src={n.actor_avatar_url} alt="" className="w-9 h-9 rounded-full object-cover shrink-0 mt-0.5" />
                  ) : (
                    <span className="text-lg mt-0.5 shrink-0">{typeIcons[n.type] || "🔔"}</span>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className={`text-sm ${!n.read_at ? "font-semibold" : "font-medium"}`}>{n.title}</p>
                      <span className="text-[11px] text-muted-foreground shrink-0">
                        {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: fr })}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">{n.body}</p>
                  </div>
                  {!n.read_at && (
                    <button
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); markRead(n.id); }}
                      className="p-1.5 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors shrink-0"
                      title="Marquer comme lu"
                    >
                      <Check className="h-4 w-4" />
                    </button>
                  )}
                  <button
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); deleteNotification(n.id); }}
                    className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors shrink-0"
                    title="Supprimer"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );

            return n.link ? (
              <Link key={n.id} to={n.link} className="block">
                {content}
              </Link>
            ) : (
              <div key={n.id}>{content}</div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Notifications;
