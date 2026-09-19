import { useEffect, useRef, useSyncExternalStore } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useAlma } from "@/contexts/AlmaContext";
import { trackEvent } from "@/lib/analytics";
import { getInstallState, subscribeInstall, installPlatform, reminderDue, markInstallSuggestion, recordAppOpen } from "@/lib/pwa-install";

export const usePwaInstall = () => useSyncExternalStore(subscribeInstall, getInstallState, getInstallState);

export function PwaInstallTracking() {
  const { user } = useAuth();
  const { standalone } = usePwaInstall();
  useEffect(() => { if (user?.id && standalone) recordAppOpen(user.id); }, [user?.id, standalone]);
  return null;
}

/** Uses Alma's existing scheduler: never overrides another tip or a quiet setting. */
export function useAlmaInstallSuggestion(enabled: boolean) {
  const { user, activeRole } = useAuth();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { canPrompt, standalone, knownInstalled } = usePwaInstall();
  const { currentWhisper, queueWhisper, canEmit, dismissCurrent } = useAlma();
  const queued = useRef(false);
  const seen = useRef<string | null>(null);
  const platform = installPlatform();
  const eligible = enabled && !!user?.id && pathname === "/dashboard" && platform.mobile && !platform.embedded && (canPrompt || platform.ios) && !standalone && !knownInstalled;

  useEffect(() => {
    if (currentWhisper?.metadata?.pwa_install !== true) return;
    if (!eligible || currentWhisper.metadata.member !== user?.id) {
      dismissCurrent("navigation");
      return;
    }
    if (seen.current === currentWhisper.id) return;
    seen.current = currentWhisper.id;
    markInstallSuggestion();
    void trackEvent("pwa_install_suggestion_shown", { source: "alma_dashboard" });
  }, [currentWhisper, eligible, user?.id, dismissCurrent]);

  useEffect(() => {
    if (!eligible || currentWhisper || queued.current || !reminderDue()) return;
    const timer = window.setTimeout(() => {
      if (document.visibilityState !== "visible" || !reminderDue() || !canEmit("usage_nudge")) return;
      queued.current = true;
      queueWhisper({
        id: `pwa-install-${user!.id}-${Date.now()}`,
        type: "usage_nudge", audience: activeRole, surface: "dashboard", priority: "P2",
        message: "Retrouvez Guardiens depuis une icône sur votre téléphone. Je vous montre comment l'ajouter ?",
        primaryAction: { label: "Installer Guardiens", actionId: "pwa_install_guide", onClick: () => navigate("/settings?section=installation") },
        allowNextTip: false, persistAcrossNavigation: false, autoDismissMs: 20_000,
        metadata: { pwa_install: true, member: user!.id },
      });
    }, 30_000);
    return () => window.clearTimeout(timer);
  }, [eligible, currentWhisper, user?.id, activeRole, navigate, canEmit, queueWhisper]);
}
