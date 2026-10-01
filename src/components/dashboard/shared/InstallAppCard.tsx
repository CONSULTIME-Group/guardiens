import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { usePwaInstall } from "@/hooks/usePwaInstall";
import { firstInstallVisitDue, installPlatform, markInstallSuggestion, reminderDue, requestInstall } from "@/lib/pwa-install";
import { hasLocalPushSubscription, nearbySettingToDiscover, pushSupport } from "@/lib/web-push";
import { trackEvent } from "@/lib/analytics";

const TWO_WEEKS = 14 * 24 * 60 * 60 * 1000;
const MAX_DISMISSALS = 3;

type Mode = "install" | "notifications" | "nearby";

/** Étapes après installation : « Plus tard » fait revenir la carte au plus 3 fois, à 14 jours d'écart. */
export function cardDue(key: string, now = Date.now()): boolean {
  try {
    const v = JSON.parse(localStorage.getItem(key) ?? "{}");
    return (Number(v.count) || 0) < MAX_DISMISSALS && (!v.last || now - Number(v.last) >= TWO_WEEKS);
  } catch { return true; }
}
function dismiss(key: string, now = Date.now()) {
  try {
    const v = JSON.parse(localStorage.getItem(key) ?? "{}");
    localStorage.setItem(key, JSON.stringify({ last: now, count: (Number(v.count) || 0) + 1 }));
  } catch { /* stockage indisponible : la carte disparaît pour cette visite */ }
}

/**
 * Carte mobile du tableau de bord. Installer et activer les notifications
 * sont deux étapes distinctes : une fois l'app installée, la carte invite à
 * activer les notifications dans la rubrique dédiée, sans jamais demander la
 * permission d'elle-même.
 */
export default function InstallAppCard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { standalone, knownInstalled, canPrompt } = usePwaInstall();
  const platform = installPlatform();
  const [hidden, setHidden] = useState(false);
  const [note, setNote] = useState("");
  const shown = useRef<Mode | null>(null);
  // Invitation à installer : rappel partagé avec l'accueil et Alma (même compteur,
  // 3 fois au plus, 14 jours d'écart), lu une fois par visite. Jamais à la
  // première visite, où le bandeau d'accueil s'en charge.
  const installDue = useRef(!!user?.id && !firstInstallVisitDue(user.id) && reminderDue());

  const installed = standalone || knownInstalled;
  const pushReady = typeof Notification !== "undefined" && Notification.permission !== "denied"
    && pushSupport() === "supported";
  const subscribedHere = !!user?.id && hasLocalPushSubscription(user.id);
  // L'étape suivante (notifications) suit l'installation confirmée, y compris
  // pendant la même visite ; elle n'est pas soumise au rappel d'installation.
  const mode: Mode | null = !user?.id || !platform.mobile || platform.embedded ? null
    : !installed ? (installDue.current ? "install" : null)
    : !pushReady ? null
    : !subscribedHere ? "notifications"
    : nearbySettingToDiscover(user.id) ? "nearby" : null;
  const key = mode && mode !== "install" && user?.id ? `guardiens_${mode}_card:${user.id}` : "";
  const visible = !!mode && !hidden && (mode === "install" || cardDue(key));

  useEffect(() => {
    if (!visible || !mode || shown.current === mode) return;
    shown.current = mode;
    // Une exposition compte dans le rappel partagé : Alma ne la répète pas.
    if (mode === "install") markInstallSuggestion();
    void trackEvent(mode === "install" ? "pwa_install_cta_shown" : "push_activation_cta_shown",
      { source: "dashboard_card", metadata: { mode, platform: platform.ios ? "ios" : "android", can_prompt: canPrompt } });
  }, [visible, mode, canPrompt, platform.ios]);

  if (!visible || !mode) return null;

  const later = () => {
    // Installation : déjà comptée à l'affichage dans le rappel partagé.
    if (key) dismiss(key);
    setHidden(true);
    void trackEvent("pwa_install_cta_dismissed", { source: "dashboard_card", metadata: { mode } });
  };

  const primary = async () => {
    if (mode !== "install") {
      void trackEvent("push_activation_cta_clicked", { source: "dashboard_card", metadata: { mode } });
      navigate("/settings?section=notifications");
      return;
    }
    void trackEvent("pwa_install_cta_clicked", { source: "dashboard_card", metadata: { can_prompt: canPrompt } });
    if (canPrompt) {
      // Vraie fenêtre du navigateur, appelée directement depuis le clic.
      const outcome = await requestInstall();
      if (outcome === "accepted") { setNote("Votre navigateur termine l'installation. Une fois l'icône Guardiens sur votre écran d'accueil, vous pourrez activer les notifications."); return; }
      if (outcome === "dismissed") { later(); return; }
    }
    navigate("/settings?section=installation");
  };

  return (
    <section aria-labelledby="install-card-title" className="md:hidden mx-4 mt-4 rounded-2xl border border-primary/20 bg-primary/5 p-4 space-y-3">
      {mode === "install" ? <>
        <div>
          <h2 id="install-card-title" className="font-heading text-base font-semibold">Installer l'app Guardiens</h2>
          <p className="mt-1 text-sm text-muted-foreground">Une icône sur votre écran d'accueil, pour ouvrir Guardiens en un geste.</p>
        </div>
        <ul className="list-disc pl-5 text-sm space-y-1">
          <li>Accès direct, sans chercher le site</li>
          <li>Vos messages à portée de main</li>
          <li>Des alertes pour vos messages et les annonces près de chez vous, si vous activez ensuite les notifications (étape séparée)</li>
        </ul>
        <p className="text-xs text-muted-foreground">
          {canPrompt ? "Votre navigateur vous demandera de confirmer."
            : platform.ios ? "Sur iPhone, l'ajout se fait depuis le menu de partage : nous vous montrons les étapes."
            : "Nous vous montrons où trouver l'option dans le menu de votre navigateur."}
        </p>
      </> : mode === "nearby" ? <>
        <div>
          <h2 id="install-card-title" className="font-heading text-base font-semibold">Nouvelles annonces près de chez vous</h2>
          <p className="mt-1 text-sm text-muted-foreground">Vos notifications sont actives sur cet appareil. Vous pouvez aussi être prévenu des nouvelles annonces dans votre rayon de recherche, trois au plus par jour. Ce réglage reste désactivé tant que vous ne l'activez pas.</p>
        </div>
      </> : <>
        <div>
          <h2 id="install-card-title" className="font-heading text-base font-semibold">Activer les notifications</h2>
          <p className="mt-1 text-sm text-muted-foreground">Soyez prévenu d'un message, d'une candidature ou d'une annonce près de chez vous. Vous choisissez quoi recevoir, puis vous pouvez faire un test.</p>
        </div>
      </>}
      {note && <p role="status" className="text-sm">{note}</p>}
      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={() => void primary()}>
          {mode === "install" ? (canPrompt ? "Installer l'app" : "Voir comment installer") : mode === "nearby" ? "Voir le réglage" : "Choisir mes notifications"}
        </Button>
        <Button size="sm" variant="ghost" onClick={later}>Plus tard</Button>
      </div>
    </section>
  );
}
