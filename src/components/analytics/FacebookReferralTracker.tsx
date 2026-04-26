import { useEffect } from "react";
import { trackEvent } from "@/lib/analytics";

const STORAGE_KEY = "fb_ref_session";
const FLAG_KEY = "fb_ref_active"; // active pour la session courante

/**
 * Détecte les visiteurs arrivant depuis Facebook :
 *   - referrer contenant "facebook." ou "fb.me" / "l.facebook.com"
 *   - OU paramètre utm_source=facebook (recommandé pour les commentaires)
 *
 * Fire un seul event par session navigateur, et stocke un flag pour que
 * le bandeau de feedback s'affiche après quelques secondes.
 */
const FacebookReferralTracker = () => {
  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      // Déjà tracké pour cette session ?
      if (sessionStorage.getItem(STORAGE_KEY)) {
        return;
      }

      const params = new URLSearchParams(window.location.search);
      const utmSource = (params.get("utm_source") || "").toLowerCase();
      const utmMedium = (params.get("utm_medium") || "").toLowerCase();
      const utmCampaign = params.get("utm_campaign") || undefined;

      const referrer = document.referrer || "";
      const isFbReferrer = /(?:^|\.)facebook\.com|fb\.me|l\.facebook\.com|m\.facebook\.com/i.test(referrer);
      const isFbUtm = utmSource === "facebook" || utmSource === "fb";

      if (!isFbReferrer && !isFbUtm) return;

      sessionStorage.setItem(STORAGE_KEY, "1");
      sessionStorage.setItem(FLAG_KEY, "1");

      trackEvent("fb_referral_landing", {
        source: window.location.pathname,
        metadata: {
          referrer: referrer || null,
          utm_source: utmSource || null,
          utm_medium: utmMedium || null,
          utm_campaign: utmCampaign || null,
          landing_path: window.location.pathname,
          landing_search: window.location.search || null,
        },
      });
    } catch {
      // silencieux
    }
  }, []);

  return null;
};

export default FacebookReferralTracker;
