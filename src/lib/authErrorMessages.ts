/**
 * Traduit les erreurs Supabase Auth en messages français explicites et actionnables.
 *
 * Source des codes : https://supabase.com/docs/guides/auth/debugging/error-codes
 * On gère à la fois `error.code` (nouveau format AuthApiError) et `error.message`
 * (ancien format / messages texte) pour rester robuste.
 */

export interface AuthErrorInfo {
  /** Message court à afficher en titre (toast) ou inline. */
  title: string;
  /** Détail/action recommandée pour l'utilisateur. Optionnel. */
  description?: string;
  /** Code normalisé pour le tracking analytics. */
  code: string;
}

const norm = (s: unknown): string =>
  typeof s === "string" ? s.toLowerCase() : "";

interface AnyAuthError {
  message?: string;
  code?: string;
  status?: number;
  error_code?: string;
  name?: string;
}

/**
 * Mappe une erreur Supabase Auth (signup, login, resend...) à un message
 * français explicite et actionnable.
 */
export function mapAuthError(err: AnyAuthError | null | undefined): AuthErrorInfo {
  const code = norm(err?.code || err?.error_code);
  const msg = norm(err?.message);
  const status = err?.status ?? 0;

  // ── Identifiants invalides (login) ──
  if (
    code === "invalid_credentials" ||
    msg.includes("invalid login credentials") ||
    msg.includes("invalid_grant")
  ) {
    return {
      code: "invalid_credentials",
      title: "Email ou mot de passe incorrect",
      description: "Vérifiez votre saisie. Si vous avez oublié votre mot de passe, utilisez le lien de réinitialisation.",
    };
  }

  // ── Email non confirmé ──
  if (
    code === "email_not_confirmed" ||
    msg.includes("email not confirmed") ||
    msg.includes("email_not_confirmed")
  ) {
    return {
      code: "email_not_confirmed",
      title: "Email non confirmé",
      description: "Vérifiez votre boîte mail (et vos spams) puis cliquez sur le lien de confirmation.",
    };
  }

  // ── Compte déjà existant (signup) ──
  if (
    code === "user_already_exists" ||
    code === "email_exists" ||
    msg.includes("already registered") ||
    msg.includes("already been registered") ||
    msg.includes("user already registered")
  ) {
    return {
      code: "user_already_exists",
      title: "Un compte existe déjà avec cet email",
      description: "Connectez-vous, ou réinitialisez votre mot de passe si vous l'avez oublié.",
    };
  }

  // ── Mot de passe faible / compromis (HIBP) ──
  if (
    code === "weak_password" ||
    msg.includes("weak_password") ||
    msg.includes("password is known to be weak") ||
    msg.includes("password should be at least") ||
    msg.includes("pwned")
  ) {
    return {
      code: "weak_password",
      title: "Mot de passe trop faible ou compromis",
      description: "Ce mot de passe est trop courant ou a été divulgué dans une fuite de données. Choisissez une phrase de passe unique avec majuscules, chiffres et symboles.",
    };
  }

  // ── Email invalide ──
  if (
    code === "validation_failed" ||
    code === "email_address_invalid" ||
    msg.includes("invalid email") ||
    msg.includes("unable to validate email address")
  ) {
    return {
      code: "invalid_email",
      title: "Adresse email invalide",
      description: "Vérifiez le format de votre email (par exemple : prenom@exemple.com).",
    };
  }

  // ── Rate-limiting (trop de tentatives ou d'envois) ──
  if (
    code === "over_request_rate_limit" ||
    code === "over_email_send_rate_limit" ||
    code === "over_sms_send_rate_limit" ||
    status === 429 ||
    msg.includes("rate limit") ||
    msg.includes("too many requests") ||
    msg.includes("for security purposes")
  ) {
    return {
      code: "rate_limited",
      title: "Trop de tentatives",
      description: "Patientez quelques minutes avant de réessayer. Cette limite protège votre compte.",
    };
  }

  // ── Utilisateur banni / suspendu ──
  if (code === "user_banned" || msg.includes("user is banned")) {
    return {
      code: "user_banned",
      title: "Compte suspendu",
      description: "Votre compte est temporairement suspendu. Contactez-nous pour en savoir plus.",
    };
  }

  // ── Inscriptions désactivées ──
  if (code === "signup_disabled" || msg.includes("signups not allowed")) {
    return {
      code: "signup_disabled",
      title: "Inscriptions temporairement fermées",
      description: "Les inscriptions sont actuellement désactivées. Réessayez plus tard.",
    };
  }

  // ── Provider OAuth ──
  if (code === "provider_email_needs_verification" || msg.includes("provider email needs verification")) {
    return {
      code: "provider_email_needs_verification",
      title: "Vérification du fournisseur requise",
      description: "Confirmez votre email auprès de votre fournisseur d'identité, puis réessayez.",
    };
  }

  // ── Token expiré / invalide (recovery, magic link) ──
  if (
    code === "otp_expired" ||
    code === "otp_disabled" ||
    msg.includes("token has expired") ||
    msg.includes("invalid token") ||
    msg.includes("expired or invalid")
  ) {
    return {
      code: "otp_expired",
      title: "Lien expiré ou invalide",
      description: "Ce lien n'est plus valide. Demandez un nouveau lien et réessayez.",
    };
  }

  // ── OAuth : utilisateur a annulé / fermé l'écran Google ──
  if (
    code === "access_denied" ||
    code === "user_cancelled" ||
    code === "oauth_cancelled" ||
    msg.includes("access_denied") ||
    msg.includes("user denied") ||
    msg.includes("user cancelled") ||
    msg.includes("user canceled") ||
    msg.includes("flow_state_expired") ||
    msg.includes("oauth flow was cancelled")
  ) {
    return {
      code: "oauth_cancelled",
      title: "Connexion Google annulée",
      description:
        "Vous avez fermé la fenêtre Google avant la fin. Réessayez et terminez la connexion en sélectionnant votre compte.",
    };
  }

  // ── OAuth : permissions refusées côté Google ──
  if (
    code === "oauth_provider_not_supported" ||
    msg.includes("scope") && msg.includes("denied") ||
    msg.includes("insufficient_scope") ||
    msg.includes("consent_required") ||
    msg.includes("permissions")
  ) {
    return {
      code: "oauth_permissions_denied",
      title: "Autorisations Google refusées",
      description:
        "Pour vous connecter, Google doit nous transmettre votre adresse email et votre nom. Réessayez et acceptez le partage de ces informations.",
    };
  }

  // ── OAuth : popup bloquée par le navigateur ──
  if (
    code === "popup_blocked" ||
    code === "popup_closed_by_user" ||
    msg.includes("popup") && (msg.includes("block") || msg.includes("closed")) ||
    msg.includes("window.open") ||
    msg.includes("blocked by browser")
  ) {
    return {
      code: "oauth_popup_blocked",
      title: "Fenêtre Google bloquée par votre navigateur",
      description:
        "Autorisez les fenêtres pop-up pour ce site dans les réglages de votre navigateur, puis réessayez. Sur mobile, désactivez le mode lecteur ou navigation privée stricte.",
    };
  }

  // ── OAuth : redirection interrompue / état invalide ──
  if (
    code === "bad_oauth_state" ||
    code === "bad_oauth_callback" ||
    code === "invalid_request" ||
    msg.includes("oauth state") ||
    msg.includes("invalid state") ||
    msg.includes("state mismatch") ||
    msg.includes("redirect_uri") ||
    msg.includes("oauth callback")
  ) {
    return {
      code: "oauth_redirect_interrupted",
      title: "Connexion Google interrompue",
      description:
        "La redirection depuis Google n'a pas abouti (onglet fermé, retour arrière ou cookies bloqués). Réessayez sans changer d'onglet, et autorisez les cookies tiers si besoin.",
    };
  }

  // ── OAuth : email déjà utilisé avec une autre méthode ──
  if (
    code === "identity_already_exists" ||
    code === "email_address_not_authorized" ||
    msg.includes("identity already exists") ||
    msg.includes("user with this email already exists") ||
    msg.includes("account exists with different credential")
  ) {
    return {
      code: "oauth_identity_conflict",
      title: "Cet email est déjà associé à un autre mode de connexion",
      description:
        "Connectez-vous d'abord avec votre email et mot de passe, puis liez votre compte Google depuis votre profil.",
    };
  }

  // ── OAuth : provider mal configuré côté serveur ──
  if (
    code === "oauth_provider_not_supported" ||
    code === "provider_disabled" ||
    msg.includes("provider is not enabled") ||
    msg.includes("unsupported_provider")
  ) {
    return {
      code: "oauth_provider_unavailable",
      title: "Connexion Google momentanément indisponible",
      description:
        "Ce mode de connexion est temporairement désactivé. Utilisez votre email et mot de passe, ou réessayez plus tard.",
    };
  }

  // ── Réseau / serveur ──
  if (
    msg === "timeout" ||
    msg.includes("network") ||
    msg.includes("failed to fetch") ||
    msg.includes("load failed") ||
    status >= 500
  ) {
    return {
      code: "network_error",
      title: "Connexion lente ou serveur indisponible",
      description: "Vérifiez votre connexion internet et réessayez dans quelques instants.",
    };
  }

  // ── Fallback : on garde le message Supabase brut s'il existe ──
  return {
    code: "unknown",
    title: "Une erreur est survenue",
    description: err?.message
      ? `Détail technique : ${err.message}`
      : "Réessayez dans quelques instants. Si le problème persiste, contactez-nous.",
  };
}
