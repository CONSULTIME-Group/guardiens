/**
 * Tout ce qui se monte après le premier affichage, en un seul fichier
 * (lot P2b) : traceurs de pages et de provenance, surveillance réseau,
 * bandeau de consentement (lot C1) et mesure réelle de la vitesse.
 * Monté par App.tsx sous AfterFirstPaint : rien de tout cela ne retarde le
 * premier écran, et un visiteur ne télécharge qu'un fichier au lieu de sept.
 */
import { useEffect } from "react";
import PageViewTracker from "./PageViewTracker";
import FacebookReferralTracker from "./FacebookReferralTracker";
import AiReferralTracker from "./AiReferralTracker";
import FacebookReferralFeedback from "./FacebookReferralFeedback";
import NetworkErrorMonitor from "@/components/layout/NetworkErrorMonitor";
import CookieConsentBanner from "@/components/legal/CookieConsentBanner";
import reportWebVitals from "@/lib/webVitals";

export default function AfterPaintExtras() {
  useEffect(() => { reportWebVitals(); }, []);
  return (
    <>
      <PageViewTracker />
      <FacebookReferralTracker />
      <AiReferralTracker />
      <NetworkErrorMonitor />
      <FacebookReferralFeedback />
      <CookieConsentBanner />
    </>
  );
}
