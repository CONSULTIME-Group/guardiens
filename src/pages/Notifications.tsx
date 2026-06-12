import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscriptionAccess } from "@/hooks/useSubscriptionAccess";
import { Link } from "react-router-dom";
import { Bell, Check, CheckCheck, Trash2, Lock } from "lucide-react";
import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
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
  actor_name: string | null;
  actor_avatar_url: string | null;
}

// Catégorie sémantique → couleur de pastille (token-based, pas d'emoji)
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

const toneClasses: Record<string, string> = {
  success: "bg-success",
  info: "bg-info",
  warning: "bg-warning",
  destructive: "bg-destructive",
  muted: "bg-muted-foreground/40",
};

const Notifications = () => {
  const { user } = useAuth();
  const { hasAccess } = useSubscriptionAccess();
  const userId = user?.id;
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!userId) {
      setNotifications([]);
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50);
    setNotifications((data as Notification[]) || []);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  // Realtime
  useEffect(() => {
    if (!userId) return;
    const notificationFilter = `user_id=eq.${userId}`;
    const channel = supabase
      .channel(`notifications-page-${userId}-${safeUUID()}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "notifications",
        filter: notificationFilter,
      }, (payload) => {
        setNotifications((prev) => [payload.new as Notification, ...prev]);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userId]);

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
    <div className="p-4 md:p-10 max-w-2xl mx-auto animate-fade-in">
      <Helmet><meta name="robots" content="noindex, nofollow" /></Helmet>
      <div className="flex items-center justify-between mb-4 md:mb-6">
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
        <div className="text-center py-12 md:py-20">
          <Bell className="h-12 w-12 mx-auto mb-4 text-muted-foreground/40" />
          <p className="text-muted-foreground">Tout est calme pour le moment.</p>
          <p className="text-sm text-muted-foreground/80 mt-1">
            Vos prochaines actualités apparaîtront ici : nouvelles propositions, candidatures, messages, gardes confirmées…
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => {
            const tone = typeTone[n.type] || "muted";
            // Gating : un gardien sans accès (post-14/07 sans abonnement) reçoit
            // l'invitation mais ne peut ni voir l'expéditeur, ni lire le message,
            // ni accéder à l'annonce. Renvoi vers la page d'abonnement.
            const isLockedInvite = n.type === "sit_invitation" && !hasAccess;
            const displayTitle = isLockedInvite
              ? "Une invitation à garder vous attend"
              : n.title;
            const displayBody = isLockedInvite
              ? "Activez votre espace gardien pour découvrir l'annonce, le propriétaire et candidater."
              : n.body;
            const displayLink = isLockedInvite ? "/pricing" : n.link;
            const displayAvatar = isLockedInvite ? null : n.actor_avatar_url;

            const content = (
              <div
                className={`rounded-lg border border-border p-4 transition-colors hover:shadow-sm ${
                  !n.read_at ? "bg-primary/5 border-primary/20" : "bg-card"
                }`}
              >
                <div className="flex items-start gap-3">
                  {displayAvatar ? (
                    <img src={displayAvatar} alt="" className="w-9 h-9 rounded-full object-cover shrink-0 mt-0.5" />
                  ) : isLockedInvite ? (
                    <span className="mt-1 shrink-0 h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
                      <Lock className="h-4 w-4 text-primary" />
                    </span>
                  ) : (
                    <span
                      aria-hidden
                      className={`mt-2 shrink-0 h-2.5 w-2.5 rounded-full ${toneClasses[tone]}`}
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className={`text-sm ${!n.read_at ? "font-semibold" : "font-medium"}`}>{displayTitle}</p>
                      <span className="text-[11px] text-muted-foreground shrink-0">
                        {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: fr })}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">{displayBody}</p>
                    {isLockedInvite && (
                      <p className="text-xs text-primary mt-1.5 font-medium">
                        Activer mon espace gardien →
                      </p>
                    )}
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

            return displayLink ? (
              <Link key={n.id} to={displayLink} className="block">
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
