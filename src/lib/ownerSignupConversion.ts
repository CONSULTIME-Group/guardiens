import { reportSignupConversion } from "@/lib/cookieConsent";

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
  reportSignupConversion(user.id);
}