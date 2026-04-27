import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Cookie, X } from "lucide-react";
import { getStoredConsent, setStoredConsent, loadGoogleAnalytics, disableGoogleAnalytics } from "@/lib/cookieConsent";

const SESSION_DISMISS_KEY = "cookie_banner_dismissed_session";

const CookieConsent = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Délai pour ne pas gêner le premier rendu / LCP
    const timer = setTimeout(() => {
      const stored = getStoredConsent();
      if (stored !== null) return;
      // Si l'utilisateur a fermé la bannière dans cette session, on ne re-montre pas
      try {
        if (sessionStorage.getItem(SESSION_DISMISS_KEY) === "1") return;
      } catch { /* silencieux */ }
      setVisible(true);
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  const handleAccept = () => {
    setStoredConsent("granted");
    loadGoogleAnalytics();
    setVisible(false);
  };

  const handleReject = () => {
    setStoredConsent("denied");
    disableGoogleAnalytics();
    setVisible(false);
  };

  const handleDismiss = () => {
    // Fermeture temporaire (réapparaît à la prochaine session) — débloque l'écran
    try {
      sessionStorage.setItem(SESSION_DISMISS_KEY, "1");
    } catch { /* silencieux */ }
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Bannière de consentement aux cookies"
      className="fixed bottom-0 left-0 right-0 z-[100] bg-card border-t border-border shadow-[0_-4px_16px_rgba(0,0,0,0.08)] animate-in slide-in-from-bottom-4 duration-500"
    >
      {/* Bouton fermer (mobile uniquement) — laisse l'utilisateur reprendre la main sans choisir */}
      <button
        onClick={handleDismiss}
        aria-label="Fermer la bannière (revenir plus tard)"
        className="md:hidden absolute top-1.5 right-1.5 p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
      >
        <X className="h-3.5 w-3.5" />
      </button>

      <div className="max-w-5xl mx-auto px-3 py-2.5 md:px-4 md:py-4 flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
        <div className="flex items-start gap-2 md:gap-3 flex-1 pr-7 md:pr-0">
          <Cookie className="h-4 w-4 md:h-5 md:w-5 text-primary shrink-0 mt-0.5" aria-hidden />
          {/* Version courte mobile / version complète desktop */}
          <p className="text-xs md:text-sm text-foreground/85 leading-snug">
            <span className="md:hidden">
              Cookies de mesure d'audience uniquement.{" "}
              <Link to="/confidentialite" className="underline text-primary">
                En savoir plus
              </Link>
            </span>
            <span className="hidden md:inline">
              Nous utilisons des cookies de mesure d'audience (Google Analytics) pour améliorer Guardiens.
              Aucune donnée n'est partagée à des fins publicitaires.{" "}
              <Link to="/confidentialite" className="underline text-primary hover:text-primary/80">
                En savoir plus
              </Link>
            </span>
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            onClick={handleReject}
            className="flex-1 md:flex-none px-3 md:px-4 py-1.5 md:py-2 rounded-lg border border-border text-xs md:text-sm text-foreground hover:bg-muted transition-colors"
          >
            Refuser
          </button>
          <button
            onClick={handleAccept}
            className="flex-1 md:flex-none px-3 md:px-4 py-1.5 md:py-2 rounded-lg bg-primary text-primary-foreground text-xs md:text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            Accepter
          </button>
        </div>
      </div>
    </div>
  );
};

export default CookieConsent;
