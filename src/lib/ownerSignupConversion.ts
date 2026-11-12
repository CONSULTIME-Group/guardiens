import { reportSignupConversion } from "@/lib/cookieConsent";
import { trackEvent } from "@/lib/analytics";

interface ConfirmedSignup {
  id: string;
  email_confirmed_at?: string;
  last_sign_in_at?: string;
}

/** A confirmed first sign-in, not a later login or a role switch. */
export function reportConfirmedOwnerSignup(user: ConfirmedSignup, role: string, now = Date.now()): void {
  if (role !== "owner" && role !== "both") return;
  const confirmed = Date.parse(user.email_confirmed_at ?? "");
  const signedIn = Date.parse(user.last_sign_in_at ?? "");
  if (!Number.isFinite(confirmed) || !Number.isFinite(signedIn)) return;
  // Email confirmation may happen days after account creation.
  if (now < confirmed || now - confirmed > 5 * 60 * 1000) return;
  if (Math.abs(signedIn - confirmed) > 60 * 1000) return;
  // Lot SRC1 : chaque envoi laisse une ligne, pour comparer le compteur de
  // Google Ads à la base. Les conditions d'envoi ne changent pas.
  if (reportSignupConversion(user.id)) {
    void trackEvent("ads_signup_conversion_sent", { source: "google_ads", metadata: { role } });
  }
}