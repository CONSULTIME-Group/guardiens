/**
 * Lot NOTIF1 (01/11/2026) : les notifications sur téléphone proposées au
 * moment où elles servent, et plus seulement après l'installation de l'app.
 *
 * - Android et ordinateur : la notification fonctionne depuis le site, sans
 *   installation. Le bouton demande l'autorisation dans le geste du membre.
 * - iPhone hors application installée : une ligne vers le guide d'installation
 *   (exigence d'Apple), aux mêmes moments.
 * - Rien quand le membre a déjà décidé sur cet appareil (abonné, refus,
 *   désactivation, report de moins de 30 jours) : règles de canOfferPush.
 *
 * Les gardiens activent aussi « Nouvelles annonces près de chez moi »
 * (trois au plus par jour), annoncé dans le texte, décochable sur place.
 */
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Bell } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { trackEvent } from "@/lib/analytics";
import {
  canOfferPush, clearPushOptOut, enablePush, getPushConfig, getPushState, hasLocalPushSubscription,
  postponePushOffer, pushSupport, type PushConfig,
} from "@/lib/web-push";

export type PushMoment = "sit_published" | "application_sent" | "help_offered";

const COPY: Record<PushMoment, { title: string; text: string; cta: string }> = {
  sit_published: {
    title: "Soyez prévenu sur ce téléphone dès qu'un gardien candidate",
    text: "Une notification pour chaque candidature et chaque message. Vous répondez vite, le gardien aussi.",
    cta: "Recevoir mes candidatures",
  },
  application_sent: {
    title: "Soyez prévenu sur ce téléphone dès que le propriétaire vous répond",
    text: "Une notification pour chaque message reçu.",
    cta: "Activer les notifications",
  },
  help_offered: {
    title: "Soyez prévenu sur ce téléphone dès qu'on vous répond",
    text: "Une notification pour chaque message reçu.",
    cta: "Activer les notifications",
  },
};

const IOS_LINE = "Sur iPhone, les notifications arrivent une fois Guardiens ajouté à votre écran d'accueil.";

/** Vrai quand la proposition a du sens sur cet appareil (fonction pure des états du navigateur). */
export function pushMomentMode(userId: string | null | undefined): "offer" | "ios" | null {
  if (!userId) return null;
  const support = pushSupport();
  if (support === "ios-install") return hasLocalPushSubscription(userId) ? null : "ios";
  return canOfferPush(userId) ? "offer" : null;
}

export default function PushMomentOffer({ moment, className = "" }: { moment: PushMoment; className?: string }) {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const sitterSide = moment !== "sit_published";
  const [mode] = useState(() => pushMomentMode(userId));
  const [config, setConfig] = useState<PushConfig | null>(null);
  const [nearby, setNearby] = useState(moment === "application_sent");
  const [busy, setBusy] = useState(false);
  const [state, setState] = useState<"idle" | "done" | "hidden" | "error">("idle");
  const shown = useRef(false);

  useEffect(() => {
    if (!userId || !mode || shown.current) return;
    shown.current = true;
    void trackEvent("push_offer_shown", { source: `moment_${moment}`, metadata: { mode } });
    // Configuration lue d'avance : au clic, la demande d'autorisation est le premier appel.
    if (mode === "offer") getPushConfig(userId).then(setConfig).catch(() => setConfig({ enabled: false }));
  }, [userId, mode, moment]);

  if (!userId || !mode || state === "hidden") return null;
  if (mode === "offer" && config && !config.enabled) return null;

  const box = `rounded-2xl border border-border bg-card p-4 text-sm ${className}`;

  if (mode === "ios") {
    return (
      <div className={box} data-testid="push-moment-ios">
        <p className="flex items-start gap-2 text-foreground/80">
          <Bell className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
          <span>{IOS_LINE} <Link to="/settings?section=installation" className="text-primary underline underline-offset-4"
            onClick={() => void trackEvent("push_offer_clicked", { source: `moment_${moment}`, metadata: { mode: "ios" } })}>
            Voir comment faire</Link></span>
        </p>
      </div>
    );
  }

  if (state === "done") {
    return <p role="status" className={`${box} text-foreground`} data-testid="push-moment-done">Notifications activées sur cet appareil.</p>;
  }

  const copy = COPY[moment];
  const activate = async () => {
    if (busy || !config) return;
    setBusy(true);
    void trackEvent("push_offer_clicked", { source: `moment_${moment}`, metadata: { mode: "offer", nearby } });
    try {
      await enablePush(userId, config, { messages: true, applications: true, nearbySits: sitterSide && nearby });
      const s = await getPushState(userId);
      if (!s.subscribed) throw new Error("push_not_confirmed");
      clearPushOptOut(userId);
      void trackEvent("push_enabled", { source: `moment_${moment}`, metadata: { nearby_sits: sitterSide && nearby } });
      setState("done");
    } catch (error) {
      // Refus du navigateur : la proposition s'efface, sans insister.
      setState(error instanceof Error && error.message === "push_permission_denied" ? "hidden" : "error");
    } finally {
      setBusy(false);
    }
  };
  const later = () => {
    postponePushOffer(userId);
    void trackEvent("push_offer_postponed", { source: `moment_${moment}` });
    setState("hidden");
  };

  return (
    <div className={box} data-testid="push-moment-offer">
      <p className="flex items-start gap-2 font-semibold text-foreground">
        <Bell className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
        {copy.title}
      </p>
      <p className="mt-1 pl-6 text-muted-foreground">{copy.text}</p>
      {moment === "application_sent" && (
        <label className="mt-3 flex cursor-pointer items-start gap-2 pl-6 text-foreground/90">
          <Checkbox checked={nearby} onCheckedChange={(v) => setNearby(v === true)} className="mt-0.5" aria-label="Nouvelles annonces près de chez moi" />
          <span>Et les nouvelles annonces près de chez moi, trois au plus par jour</span>
        </label>
      )}
      <div className="mt-3 flex flex-wrap items-center gap-2 pl-6">
        <Button size="sm" className="rounded-full" onClick={activate} disabled={busy || !config}>{copy.cta}</Button>
        <Button size="sm" variant="ghost" onClick={later} disabled={busy}>Plus tard</Button>
      </div>
      {state === "error" && (
        <p className="mt-2 pl-6 text-xs text-muted-foreground">L'activation n'a pas abouti. Vous pouvez la reprendre depuis vos réglages de notifications.</p>
      )}
    </div>
  );
}
