import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import {
  canOfferPush, clearPushOptOut, enablePush, getPushConfig, getPushState, postponePushOffer, pushDeviceStatus,
  renewPushSilently, SILENT_RENEW_SESSION_KEY, type PushConfig, type PushPreferences,
} from "@/lib/web-push";
import { trackEvent } from "@/lib/analytics";

export const RESUBSCRIBE_SESSION_KEY = "guardiens_push_resubscribe_shown";
export const OFFER_SESSION_KEY = "guardiens_push_offer_shown";

type Mode = "resubscribe" | "offer";

/**
 * Une seule carte notifications sur le tableau de bord, jamais deux :
 * - resubscribe (lot 0) : abonnement arrêté, autorisation retirée ;
 * - offer : propriétaire sur appareil compatible, autorisation jamais
 *   demandée, aucun abonnement, aucune désactivation ni report en cours.
 * La configuration est lue d'avance : au clic, la demande d'autorisation
 * est le premier appel, dans le geste du membre.
 */
export default function PushResubscribeCard({ role }: { role?: string | null }) {
  const { user } = useAuth();
  const [mode, setMode] = useState<Mode | null>(null);
  const [prefs, setPrefs] = useState<PushPreferences | null>(null);
  const [config, setConfig] = useState<PushConfig | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [done, setDone] = useState(false);
  // Membre affiché : tout résultat arrivé pour un autre compte est ignoré.
  const owner = useRef<string | null>(null);
  owner.current = user?.id ?? null;

  useEffect(() => {
    // Changement de compte, de rôle ou déconnexion : aucune carte héritée.
    setMode(null); setPrefs(null); setConfig(null); setDone(false); setMessage(""); setBusy(false);
    if (!user?.id) return;
    const userId = user.id;
    let current = true;
    const alive = () => current && owner.current === userId;
    const flag = (key: string) => {
      try { if (sessionStorage.getItem(key)) return false; sessionStorage.setItem(key, "1"); } catch { /* rien */ }
      return true;
    };
    const preload = () => getPushConfig(userId).then((c) => { if (alive()) setConfig(c); }).catch(() => { if (alive()) setConfig({ enabled: false }); });
    const check = () => pushDeviceStatus(userId).then(async (s) => {
      if (!alive()) return;
      if (s.kind === "renewable") {
        if (!flag(SILENT_RENEW_SESSION_KEY)) return;
        const ok = await renewPushSilently(userId, s.subscriptionId);
        if (!alive()) return;
        void trackEvent("push_renewed_silently", { source: "dashboard", metadata: { ok } });
        return;
      }
      if (s.kind === "needs_gesture") {
        try { if (sessionStorage.getItem(RESUBSCRIBE_SESSION_KEY)) return; } catch { /* rien */ }
        flag(RESUBSCRIBE_SESSION_KEY);
        setPrefs(s.prefs);
        setMode("resubscribe");
        void preload();
        void trackEvent("push_resubscribe_shown", { source: "dashboard" });
        return;
      }
      if (role === "owner" && canOfferPush(userId)) {
        try { if (sessionStorage.getItem(OFFER_SESSION_KEY)) return; } catch { /* rien */ }
        flag(OFFER_SESSION_KEY);
        setPrefs({ messages: true, applications: true, nearbySits: false });
        setMode("offer");
        void preload();
        void trackEvent("push_offer_shown", { source: "dashboard" });
      }
    });
    void check();
    const onMessage = (event: MessageEvent) => {
      if (event.data?.type === "GUARDIENS_PUSH_RENEW") { void check(); }
    };
    const sw = typeof navigator !== "undefined" ? navigator.serviceWorker : undefined;
    sw?.addEventListener?.("message", onMessage);
    return () => { current = false; sw?.removeEventListener?.("message", onMessage); };
  }, [user?.id, role]);

  if (!user || !mode || !prefs) return null;
  if (mode === "offer" && config && !config.enabled) return null;

  const activate = async () => {
    if (busy || !config || !user) return;
    const userId = user.id;
    const sameMember = () => owner.current === userId;
    setBusy(true);
    setMessage("");
    void trackEvent(mode === "offer" ? "push_offer_clicked" : "push_resubscribe_clicked", { source: "dashboard" });
    try {
      // Premier await : Notification.requestPermission, dans le geste.
      await enablePush(userId, config, prefs);
      if (!sameMember()) return;
      const state = await getPushState(userId);
      if (!sameMember()) return;
      if (!state.subscribed) throw new Error("push_not_confirmed");
      clearPushOptOut(userId);
      if (mode === "offer") {
        void trackEvent("push_enabled", { source: "dashboard", metadata: { messages: prefs.messages, applications: prefs.applications, nearby_sits: false } });
        setDone(true);
      } else {
        setMode(null);
      }
    } catch (error) {
      if (!sameMember()) return;
      const denied = error instanceof Error && error.message === "push_permission_denied";
      if (denied && mode === "offer") { setMode(null); return; }
      setMessage("L'activation n'a pas abouti. Vous pouvez réessayer depuis vos réglages de notifications.");
    } finally {
      if (sameMember()) setBusy(false);
    }
  };

  const later = () => {
    postponePushOffer(user.id);
    void trackEvent("push_offer_postponed", { source: "dashboard" });
    setMode(null);
  };

  if (done) {
    return (
      <div role="status" className="mx-4 mt-4 rounded-lg border border-border bg-card p-4 text-sm text-card-foreground">
        <p>Notifications activées sur cet appareil.</p>
      </div>
    );
  }

  const offer = mode === "offer";
  return (
    <div role="status" className="mx-4 mt-4 rounded-lg border border-border bg-card p-4 text-sm text-card-foreground flex flex-col sm:flex-row sm:items-center gap-3">
      <p className="flex-1">
        {offer
          ? "Soyez prévenu dès qu'un gardien postule ou vous écrit, directement sur cet appareil."
          : "Vos notifications se sont arrêtées sur cet appareil."}
      </p>
      <Button size="sm" variant={offer ? "default" : "outline"} onClick={activate} disabled={busy || !config}>
        {offer ? "Recevoir mes candidatures sur mon téléphone" : "Les réactiver"}
      </Button>
      {offer && <Button size="sm" variant="ghost" onClick={later} disabled={busy}>Plus tard</Button>}
      {message && <p className="text-xs text-muted-foreground sm:basis-full">{message}</p>}
    </div>
  );
}
