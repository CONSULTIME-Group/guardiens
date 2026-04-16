import { normalizePathname, SITE_URL } from "@/lib/seo";

const AUTH_CONFIRM_PATH = "/auth/confirm";

const buildAuthConfirmUrl = (nextPath: string) => {
  const next = encodeURIComponent(normalizePathname(nextPath));
  return `${SITE_URL}${AUTH_CONFIRM_PATH}?next=${next}`;
};

export const getSignupRedirectUrl = () => buildAuthConfirmUrl("/dashboard");

export const getRecoveryRedirectUrl = () => buildAuthConfirmUrl("/reset-password");
