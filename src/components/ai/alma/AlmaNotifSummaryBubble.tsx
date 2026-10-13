/**
 * <AlmaNotifSummaryBubble />, Alma Pass 2 Tour 3.
 *
 * Résume les notifications quand le feed est chargé : catégorise
 * candidatures/messages/social et propose un filtre "3 urgentes".
 *
 * Audience adaptative : vouvoiement propriétaire, tutoiement gardien
 * (déterminé via activeRole du contexte Auth).
 * Respecte profiles.alma_frequency === "silent".
 */
import { useEffect, useMemo } from "react";
import { AlmaBubble } from "./AlmaBubble";
import { Button } from "@/components/ui/button";
import { trackEvent } from "@/lib/analytics";
import { useAlmaFrequency } from "@/hooks/useAlmaFrequency";
import { useAuth } from "@/contexts/AuthContext";
import type { NotificationData } from "@/components/notifications/NotificationItem";
import { isUrgentNotification, notificationCategory } from "@/lib/notificationKinds";

interface Props {
  notifications: NotificationData[];
  onFilterUrgent: () => void;
  urgentFilterActive?: boolean;
}

function categorize(notifs: NotificationData[]) {
  let applications = 0;
  let messages = 0;
  let social = 0;
  // Lot Z : familles tirées de src/lib/notificationKinds.ts (types réels).
  for (const n of notifs) {
    const category = notificationCategory(n.type);
    if (category === "applications") applications++;
    else if (category === "messages") messages++;
    else if (category === "social") social++;
  }
  return { applications, messages, social };
}

export function AlmaNotifSummaryBubble({
  notifications,
  onFilterUrgent,
  urgentFilterActive,
}: Props) {
  const { frequency } = useAlmaFrequency();
  const { activeRole } = useAuth();
  const audience = activeRole === "owner" ? "owner" : "sitter";

  const unread = useMemo(
    () => notifications.filter((n) => !n.read_at),
    [notifications],
  );
  const last20 = useMemo(() => notifications.slice(0, 20), [notifications]);
  const { applications, messages, social } = useMemo(
    () => categorize(last20),
    [last20],
  );
  const urgentCount = useMemo(
    () => unread.filter((n) => isUrgentNotification(n.type)).length,
    [unread],
  );

  const hasMixedLast20 =
    (applications > 0 && (messages > 0 || social > 0)) ||
    (messages > 0 && social > 0);
  const shouldShow = !urgentFilterActive && (unread.length >= 5 || hasMixedLast20);

  useEffect(() => {
    if (!shouldShow || frequency === "silent") return;
    void trackEvent("alma_notif_summary_seen", {
      source: "notifications_page",
      metadata: {
        audience,
        unread: unread.length,
        applications,
        messages,
        social,
        urgent: urgentCount,
      },
    });
  }, [shouldShow, frequency, audience, unread.length, applications, messages, social, urgentCount]);

  if (frequency === "silent" || !shouldShow) return null;

  const onClick = () => {
    void trackEvent("alma_notif_urgent_filter_clicked", {
      source: "notifications_page",
      metadata: { audience, urgent: urgentCount },
    });
    onFilterUrgent();
  };

  const intro = `Vous avez ${unread.length} notification${unread.length > 1 ? "s" : ""} non lue${unread.length > 1 ? "s" : ""}.`;

  const details = [
    applications > 0
      ? (applications > 1 ? `${applications} candidatures et propositions d'aide` : "1 candidature ou proposition d'aide")
      : null,
    messages > 0 ? `${messages} message${messages > 1 ? "s" : ""}` : null,
    social > 0 ? `${social} bonne${social > 1 ? "s" : ""} nouvelle${social > 1 ? "s" : ""}` : null,
  ].filter(Boolean).join(", ");

  const question = urgentCount > 1
    ? `On regarde les ${urgentCount} urgentes d'abord ?`
    : urgentCount === 1 ? "On regarde l'urgente d'abord ?" : "";

  return (
    <div className="mb-4">
      <AlmaBubble
        audience={audience}
        variant="sticky-footer"
        actions={
          urgentCount > 0 ? (
            <Button size="sm" onClick={onClick}>
              Voir les {urgentCount} urgente{urgentCount > 1 ? "s" : ""}
            </Button>
          ) : null
        }
      >
        {intro} {details && `Je vois ${details}.`} {question}
      </AlmaBubble>
    </div>
  );
}

export default AlmaNotifSummaryBubble;
