/**
 * Bandeau affiché aux visiteurs arrivant depuis un WebView in-app
 * (Facebook, Instagram, TikTok…). Les WebViews cassent souvent :
 *  - l'autofill / gestionnaire de mots de passe
 *  - la confirmation email (le clic sur le lien ouvre l'app mail externe
 *    et la session de signup est perdue)
 *  - le sign-in Google OAuth (bloqué par les politiques Google)
 *
 * On propose donc de copier l'URL et d'ouvrir dans Chrome / Safari.
 */
import { forwardRef, useMemo, useState } from "react";
import { ExternalLink, Copy, Check, X } from "lucide-react";
import { isInAppBrowser } from "@/lib/inAppBrowser";

interface InAppBrowserBannerProps {
  /** URL à proposer d'ouvrir. Par défaut : URL courante. */
  url?: string;
  className?: string;
}

export const InAppBrowserBanner = forwardRef<HTMLDivElement, InAppBrowserBannerProps>(
  ({ url, className = "" }, ref) => {
    const inApp = useMemo(() => isInAppBrowser(), []);
    const [dismissed, setDismissed] = useState(false);
    const [copied, setCopied] = useState(false);

    if (!inApp || dismissed) return null;

    const targetUrl =
      url ?? (typeof window !== "undefined" ? window.location.href : "https://guardiens.fr");

    const handleCopy = async () => {
      try {
        if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(targetUrl);
        } else {
          // Fallback iOS/Android WebView
          const ta = document.createElement("textarea");
          ta.value = targetUrl;
          ta.style.position = "fixed";
          ta.style.opacity = "0";
          document.body.appendChild(ta);
          ta.select();
          document.execCommand("copy");
          document.body.removeChild(ta);
        }
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      } catch {
        // silencieux
      }
    };

    return (
      <div
        ref={ref}
        role="alert"
        className={`relative rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-amber-900 shadow-sm ${className}`}
      >
        <button
          onClick={() => setDismissed(true)}
          aria-label="Fermer"
          className="absolute right-2 top-2 rounded p-1 text-amber-700 hover:bg-amber-100"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-start gap-3 pr-6">
          <ExternalLink className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-700" />
          <div className="space-y-2 text-sm leading-relaxed">
            <p className="font-semibold">
              Pour finaliser votre inscription, ouvrez cette page dans votre navigateur.
            </p>
            <p className="text-amber-900/80 text-xs">
              Vous êtes dans le navigateur intégré de Facebook ou Instagram. La confirmation email
              et l'enregistrement du mot de passe peuvent ne pas fonctionner ici.
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex items-center gap-1.5 rounded-md bg-amber-900 px-3 py-1.5 text-xs font-medium text-amber-50 hover:bg-amber-800 transition-colors"
              >
                {copied ? (
                  <>
                    <Check className="h-3.5 w-3.5" /> Lien copié
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" /> Copier le lien
                  </>
                )}
              </button>
              <span className="inline-flex items-center text-xs text-amber-900/70">
                puis collez-le dans Chrome ou Safari
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }
);

InAppBrowserBanner.displayName = "InAppBrowserBanner";

export default InAppBrowserBanner;
