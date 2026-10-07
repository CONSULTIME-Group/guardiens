import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { enablePush, getPushConfig, pushDeviceStatus, renewPushSilently, SILENT_RENEW_SESSION_KEY, type PushPreferences } from "@/lib/web-push";
import { trackEvent } from "@/lib/analytics";

export const RESUBSCRIBE_SESSION_KEY = "guardiens_push_resubscribe_shown";

/**
 * Lot 0 : carte discrète, une fois par session, quand l'abonnement de cet
 * appareil s'est arrêté et que l'autorisation n'est plus accordée (lot 0b). La demande d'autorisation reste
 * déclenchée par le clic sur « Les réactiver ».
 */
export default function PushResubscribeCard() {
  const { user } = useAuth();
  const [prefs, setPrefs] = useState<PushPreferences | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!user?.id) return;
    const userId = user.id;
    let current = true;
    const flag = (key: string) => {
      try { if (sessionStorage.getItem(key)) return false; sessionStorage.setItem(key, "1"); } catch { /* rien */ }
      return true;
    };
    // Lot 0b : autorisation accordée, réabonnement silencieux, une tentative par session.
    const check = () => pushDeviceStatus(userId).then(async (s) => {
      if (!current) return;
      if (s.kind === "renewable") {
        if (!flag(SILENT_RENEW_SESSION_KEY)) return;
        const ok = await renewPushSilently(userId, s.subscriptionId);
        void trackEvent("push_renewed_silently", { source: "dashboard", metadata: { ok } });
        return;
      }
      // Lot 0 : la carte ne sert que si un geste du membre est nécessaire.
      if (s.kind === "needs_gesture" && current) {
        try { if (sessionStorage.getItem(RESUBSCRIBE_SESSION_KEY)) return; } catch { /* rien */ }
        flag(RESUBSCRIBE_SESSION_KEY);
        setPrefs(s.prefs);
        void trackEvent("push_resubscribe_shown", { source: "dashboard" });
      }
    });
    void check();
    // Le worker signale une adresse renouvelée par le service de push.
    const onMessage = (event: MessageEvent) => {
      if (event.data?.type === "GUARDIENS_PUSH_RENEW") { void check(); }
    };
    const sw = typeof navigator !== "undefined" ? navigator.serviceWorker : undefined;
    sw?.addEventListener?.("message", onMessage);
    return () => { current = false; sw?.removeEventListener?.("message", onMessage); };
  }, [user?.id]);

  if (!user || !prefs) return null;

  const reactivate = async () => {
    if (busy) return;
    setBusy(true);
    setMessage("");
    void trackEvent("push_resubscribe_clicked", { source: "dashboard" });
    try {
      const config = await getPushConfig(user.id);
      await enablePush(user.id, config, prefs);
      setPrefs(null);
    } catch {
      setMessage("La réactivation n'a pas abouti. Vous pouvez réessayer depuis vos réglages de notifications.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div role="status" className="mx-4 mt-4 rounded-lg border border-border bg-card p-4 text-sm text-card-foreground flex flex-col sm:flex-row sm:items-center gap-3">
      <p className="flex-1">Vos notifications se sont arrêtées sur cet appareil.</p>
      <Button size="sm" variant="outline" onClick={reactivate} disabled={busy}>Les réactiver</Button>
      {message && <p className="text-xs text-muted-foreground sm:basis-full">{message}</p>}
    </div>
  );
}
