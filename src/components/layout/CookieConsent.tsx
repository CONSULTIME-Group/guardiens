import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Cookie } from "lucide-react";
import { getStoredConsent, setStoredConsent, loadGoogleAnalytics, disableGoogleAnalytics } from "@/lib/cookieConsent";

const CookieConsent = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Délai pour ne pas gêner le premier rendu / LCP
    const timer = setTimeout(() => {
      const stored = getStoredConsent();
      if (stored === null) setVisible(true);
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

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Bannière de consentement aux cookies"
      className="fixed bottom-0 left-0 right-0 z-[100] p-3 md:p-4 bg-card border-t border-border shadow-[0_-4px_16px_rgba(0,0,0,0.08)] animate-in slide-in-from-bottom-4 duration-500"
    >
      <div className="max-w-5xl mx-auto flex flex-col md:flex-row md:items-center gap-3 md:gap-4">
        <div className="flex items-start gap-3 flex-1">
          <Cookie className="h-5 w-5 text-primary shrink-0 mt-0.5" aria-hidden />
          <p className="text-sm text-foreground/85 leading-snug">
            Nous utilisons des cookies de mesure d'audience (Google Analytics) pour améliorer Guardiens.
            Aucune donnée n'est partagée à des fins publicitaires.{" "}
            <Link to="/confidentialite" className="underline text-primary hover:text-primary/80">
              En savoir plus
            </Link>
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            onClick={handleReject}
            className="px-4 py-2 rounded-lg border border-border text-sm text-foreground hover:bg-muted transition-colors"
          >
            Refuser
          </button>
          <button
            onClick={handleAccept}
            className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            Accepter
          </button>
        </div>
      </div>
    </div>
  );
};

export default CookieConsent;
