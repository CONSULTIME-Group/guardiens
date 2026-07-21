import { normalizePathname, SITE_URL } from "@/lib/seo";

const AUTH_CONFIRM_PATH = "/auth/confirm";

const buildAuthConfirmUrl = (nextPath: string) => {
  // Ne jamais accepter d'URL absolue ni de chemin protocole-relatif (garde anti open-redirect).
  const safe =
    typeof nextPath === "string" &&
    nextPath.startsWith("/") &&
    !nextPath.startsWith("//") &&
    !nextPath.startsWith("/\\")
      ? nextPath
      : "/dashboard";
  const next = encodeURIComponent(normalizePathname(safe));
  return `${SITE_URL}${AUTH_CONFIRM_PATH}?next=${next}`;
};

/**
 * URL de confirmation email post-inscription.
 * @param nextPath cible interne (chemin commençant par « / ») vers laquelle
 *   naviguer après validation. Défaut : /dashboard.
 */
export const getSignupRedirectUrl = (nextPath: string = "/dashboard") =>
  buildAuthConfirmUrl(nextPath);

export const getRecoveryRedirectUrl = () => buildAuthConfirmUrl("/reset-password");
