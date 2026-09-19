import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { usePwaInstall } from "@/hooks/usePwaInstall";
import { declareInstalled, firstInstallVisitDue, installPlatform, markInstallWelcome } from "@/lib/pwa-install";

/** First mobile visit, independent of Alma's frequency and install API support. */
export default function InstallAppWelcome({ paused }: { paused: boolean }) {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { standalone, knownInstalled } = usePwaInstall();
  const [dismissed, setDismissed] = useState(false);
  const [visible, setVisible] = useState(document.visibilityState === "visible");
  const firstVisit = useRef(!!user?.id && firstInstallVisitDue(user.id));
  const measured = useRef(false);
  const quietRoute = /^\/(messages|settings|onboarding)(\/|$)|\/(create|edit)(\/|$)/.test(pathname);
  const show = !!user?.id && firstVisit.current && !dismissed && !paused && visible && !quietRoute && installPlatform().mobile && !standalone && !knownInstalled;

  useEffect(() => {
    const refresh = () => setVisible(document.visibilityState === "visible");
    document.addEventListener("visibilitychange", refresh);
    return () => document.removeEventListener("visibilitychange", refresh);
  }, []);
  useEffect(() => {
    if (!show || measured.current || !user?.id) return;
    measured.current = true;
    markInstallWelcome(user.id);
  }, [show, user?.id]);

  if (!show) return null;
  return <section aria-labelledby="install-welcome-title" className="mx-4 mt-4 rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-3">
    <div>
      <h2 id="install-welcome-title" className="font-heading font-semibold">Guardiens sur votre téléphone</h2>
      <p className="text-sm text-muted-foreground mt-1">Ajoutez Guardiens à votre écran d'accueil pour retrouver vos échanges et vos gardes depuis une icône, comme une app.</p>
    </div>
    <div className="flex flex-wrap gap-2">
      <Button size="sm" onClick={() => { setDismissed(true); navigate("/settings?section=installation"); }}>Installer Guardiens</Button>
      <Button size="sm" variant="outline" onClick={() => setDismissed(true)}>Plus tard</Button>
      <Button size="sm" variant="ghost" onClick={declareInstalled}>Déjà installée</Button>
    </div>
  </section>;
}
