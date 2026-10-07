import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { enablePush, getPushConfig, serverDisabledPush, type PushPreferences } from "@/lib/web-push";
import { trackEvent } from "@/lib/analytics";

export const RESUBSCRIBE_SESSION_KEY = "guardiens_push_resubscribe_shown";

/**
 * Lot 0 : carte discrète, une fois par session, quand l'abonnement de cet
 * appareil a été désactivé côté serveur. La demande d'autorisation reste
 * déclenchée par le clic sur « Les réactiver ».
 */
export default function PushResubscribeCard() {
  const { user } = useAuth();
  const [prefs, setPrefs] = useState<PushPreferences | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!user?.id) return;
    try { if (sessionStorage.getItem(RESUBSCRIBE_SESSION_KEY)) return; } catch { /* rien */ }
    let current = true;
    void serverDisabledPush(user.id).then((p) => {
      if (!current || !p) return;
      try { sessionStorage.setItem(RESUBSCRIBE_SESSION_KEY, "1"); } catch { /* rien */ }
      setPrefs(p);
      void trackEvent("push_resubscribe_shown", { source: "dashboard" });
    });
    return () => { current = false; };
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
