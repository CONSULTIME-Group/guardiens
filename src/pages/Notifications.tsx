import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscriptionAccess } from "@/hooks/useSubscriptionAccess";
import { Bell, CheckCheck } from "lucide-react";
import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import { isToday, isYesterday, isThisWeek } from "date-fns";
import { safeUUID } from "@/lib/uuid";

import type { NotificationData } from "@/components/notifications/NotificationItem";
import { NotificationSkeleton } from "@/components/notifications/NotificationSkeleton";
import { NotificationsEmptyState } from "@/components/notifications/NotificationsEmptyState";
import { NotificationGroup } from "@/components/notifications/NotificationGroup";
import { AlmaNotifSummaryBubble } from "@/components/ai/alma/AlmaNotifSummaryBubble";

/* ------------------------------------------------------------------ */
/* Groupement par tranche temporelle                                    */
/* ------------------------------------------------------------------ */
type GroupKey = "Aujourd'hui" | "Hier" | "Cette semaine" | "Plus ancien";

function groupByDay(notifications: NotificationData[]): { label: GroupKey; items: NotificationData[] }[] {
  const buckets: Record<GroupKey, NotificationData[]> = {
    "Aujourd'hui": [],
    "Hier": [],
    "Cette semaine": [],
    "Plus ancien": [],
  };

  for (const n of notifications) {
    const d = new Date(n.created_at);
    if (isToday(d)) {
      buckets["Aujourd'hui"].push(n);
    } else if (isYesterday(d)) {
      buckets["Hier"].push(n);
    } else if (isThisWeek(d, { weekStartsOn: 1 })) {
      buckets["Cette semaine"].push(n);
    } else {
      buckets["Plus ancien"].push(n);
    }
  }

  const order: GroupKey[] = ["Aujourd'hui", "Hier", "Cette semaine", "Plus ancien"];
  return order
    .filter((k) => buckets[k].length > 0)
    .map((k) => ({ label: k, items: buckets[k] }));
}

/* ------------------------------------------------------------------ */

const Notifications = () => {
  const { user } = useAuth();
  const { hasAccess } = useSubscriptionAccess();
  const userId = user?.id;

  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!userId) { setNotifications([]); setLoading(false); return; }
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50);
    setNotifications((data as NotificationData[]) ?? []);
    setLoading(false);
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  /* Realtime */
  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`notifications-page-${userId}-${safeUUID()}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "notifications",
        filter: `user_id=eq.${userId}`,
      }, (payload) => {
        setNotifications((prev) => [payload.new as NotificationData, ...prev]);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userId]);

  const markRead = async (id: string) => {
    const now = new Date().toISOString();
    await supabase.from("notifications").update({ read_at: now }).eq("id", id);
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read_at: now } : n));
  };

  const markAllRead = async () => {
    const ids = notifications.filter((n) => !n.read_at).map((n) => n.id);
    if (!ids.length) return;
    const now = new Date().toISOString();
    await supabase.from("notifications").update({ read_at: now }).in("id", ids);
    setNotifications((prev) => prev.map((n) => n.read_at ? n : { ...n, read_at: now }));
  };

  const deleteNotification = async (id: string) => {
    await supabase.from("notifications").delete().eq("id", id);
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const unreadCount = notifications.filter((n) => !n.read_at).length;
  const groups = groupByDay(notifications);

  return (
    <div className="relative max-w-2xl mx-auto px-4 pb-24 pt-4 md:px-6 md:pt-8 md:pb-16 animate-fade-in">
      <Helmet>
        <title>Notifications</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      {/* En-tête page */}
      <header className="flex items-center gap-3 mb-4 md:mb-6">
        <Bell className="h-5 w-5 text-foreground/70 shrink-0" aria-hidden />
        <div className="flex-1 min-w-0">
          <h1 className="font-heading text-xl md:text-2xl font-bold text-foreground leading-tight">
            Notifications
          </h1>
          {!loading && unreadCount > 0 && (
            <p className="text-xs text-muted-foreground mt-0.5">
              {unreadCount} non lue{unreadCount > 1 ? "s" : ""}
            </p>
          )}
        </div>
      </header>

      {/* CTA bulk sticky, visible mobile si non-lus */}
      {!loading && unreadCount > 0 && (
        <div className="sticky top-12 md:top-0 z-20 -mx-4 md:mx-0 mb-4 md:mb-6 px-4 md:px-0 py-2 md:py-0 bg-background/95 backdrop-blur-sm border-b border-border/50 md:bg-transparent md:backdrop-blur-none md:border-none">
          <Button
            variant="outline"
            size="sm"
            onClick={markAllRead}
            className="w-full md:w-auto gap-2 font-medium"
          >
            <CheckCheck className="h-4 w-4" />
            Tout marquer comme lu
          </Button>
        </div>
      )}

      {/* Contenu */}
      {loading ? (
        <NotificationSkeleton />
      ) : notifications.length === 0 ? (
        <NotificationsEmptyState />
      ) : (
        <div>
          {groups.map(({ label, items }) => (
            <NotificationGroup
              key={label}
              label={label}
              items={items}
              hasAccess={hasAccess}
              onMarkRead={markRead}
              onDelete={deleteNotification}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default Notifications;
