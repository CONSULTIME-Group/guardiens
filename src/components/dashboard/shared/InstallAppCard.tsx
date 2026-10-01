import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { usePwaInstall } from "@/hooks/usePwaInstall";
import { firstInstallVisitDue, installPlatform, requestInstall } from "@/lib/pwa-install";
import { hasLocalPushSubscription, pushSupport } from "@/lib/web-push";
import { trackEvent } from "@/lib/analytics";

const TWO_WEEKS = 14 * 24 * 60 * 60 * 1000;
const MAX_DISMISSALS = 3;

type Mode = "install" | "notifications";

/** « Plus tard » : la carte revient au plus 3 fois, à 14 jours d'écart. */
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
  // Première visite : le bandeau d'accueil s'en charge, pas de double invitation.
  const welcomeVisit = useRef(!!user?.id && firstInstallVisitDue(user.id));

  const installed = standalone || knownInstalled;
  const pushReady = typeof Notification !== "undefined" && Notification.permission !== "denied"
    && pushSupport() === "supported";
  const mode: Mode | null = !user?.id || !platform.mobile || platform.embedded ? null
    : !installed ? "install"
    : pushReady && !hasLocalPushSubscription(user.id) ? "notifications" : null;
  const key = mode && user?.id ? `guardiens_${mode}_card:${user.id}` : "";
  const visible = !!mode && !hidden && !welcomeVisit.current && cardDue(key);

  useEffect(() => {
    if (!visible || !mode || shown.current === mode) return;
    shown.current = mode;
    void trackEvent(mode === "install" ? "pwa_install_cta_shown" : "push_activation_cta_shown",
      { source: "dashboard_card", metadata: { platform: platform.ios ? "ios" : "android", can_prompt: canPrompt } });
  }, [visible, mode, canPrompt, platform.ios]);

  if (!visible || !mode) return null;

  const later = () => {
    dismiss(key);
    setHidden(true);
    void trackEvent("pwa_install_cta_dismissed", { source: "dashboard_card", metadata: { mode } });
  };

  const primary = async () => {
    if (mode === "notifications") {
      void trackEvent("push_activation_cta_clicked", { source: "dashboard_card" });
      navigate("/settings?section=notifications");
      return;
    }
    void trackEvent("pwa_install_cta_clicked", { source: "dashboard_card", metadata: { can_prompt: canPrompt } });
    if (canPrompt) {
      // Vraie fenêtre du navigateur, appelée directement depuis le clic.
      const outcome = await requestInstall();
      if (outcome === "accepted") { setNote("Votre navigateur termine l'installation. L'icône Guardiens apparaîtra sur votre écran d'accueil."); return; }
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
          <li>Les nouvelles annonces, une fois les notifications activées</li>
        </ul>
        <p className="text-xs text-muted-foreground">
          {canPrompt ? "Votre navigateur vous demandera de confirmer."
            : platform.ios ? "Sur iPhone, l'ajout se fait depuis le menu de partage : nous vous montrons les étapes."
            : "Nous vous montrons où trouver l'option dans le menu de votre navigateur."}
        </p>
      </> : <>
        <div>
          <h2 id="install-card-title" className="font-heading text-base font-semibold">Activer les notifications</h2>
          <p className="mt-1 text-sm text-muted-foreground">Soyez prévenu d'un message, d'une candidature ou d'une annonce près de chez vous. Vous choisissez quoi recevoir, puis vous pouvez faire un test.</p>
        </div>
      </>}
      {note && <p role="status" className="text-sm">{note}</p>}
      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={() => void primary()}>
          {mode === "install" ? (canPrompt ? "Installer l'app" : "Voir comment installer") : "Choisir mes notifications"}
        </Button>
        <Button size="sm" variant="ghost" onClick={later}>Plus tard</Button>
      </div>
    </section>
  );
}
