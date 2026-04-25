/**
 * Détection des WebViews in-app (Facebook, Instagram, TikTok, Snapchat, LinkedIn…)
 * et utilitaires pour neutraliser l'autofill natif qui injecte du JS via des
 * bridges (setContactAutofillValuesFromBridge sur Android FB_IAB, par exemple)
 * et casse les formulaires d'authentification.
 */

const IN_APP_UA_PATTERNS: RegExp[] = [
  /FB_IAB/i,         // Facebook in-app browser (Android)
  /FBAN/i,           // Facebook iOS
  /FBAV/i,           // Facebook app version (souvent présent ensemble)
  /Instagram/i,      // Instagram in-app
  /BytedanceWebview/i,
  /TikTok/i,
  /musical_ly/i,     // Ancien UA TikTok
  /Snapchat/i,
  /LinkedInApp/i,
  /Pinterest/i,
  /Twitter/i,        // Twitter/X in-app
  /Line\//i,         // Line messenger
  /MicroMessenger/i, // WeChat
];

export function isInAppBrowser(userAgent?: string): boolean {
  const ua = userAgent ?? (typeof navigator !== "undefined" ? navigator.userAgent : "");
  if (!ua) return false;
  return IN_APP_UA_PATTERNS.some((re) => re.test(ua));
}

/**
 * Renvoie les attributs à appliquer sur un <input> pour neutraliser
 * l'autofill / le bridge natif d'un WebView in-app.
 *
 * - `autoComplete="off"` + `data-form-type="other"` : empêche les bridges FB/IG
 *   d'identifier les champs comme "contact" et de tenter de les remplir.
 * - `autoCorrect="off"` / `autoCapitalize="off"` / `spellCheck={false}` :
 *   évite les corrections natives sur les champs sensibles.
 * - `name` neutre : certains bridges ciblent par `name="email"` ou `name="password"`.
 *
 * Sur un navigateur standard, retourne les attributs d'autofill natifs
 * (UX optimale : remplissage par le gestionnaire de mots de passe).
 */
export function getAuthFieldAttrs(
  field: "email" | "password" | "new-password",
): Record<string, string | boolean> {
  const inApp = isInAppBrowser();

  if (inApp) {
    return {
      autoComplete: "off",
      autoCorrect: "off",
      autoCapitalize: "off",
      spellCheck: false,
      // Hint pour les password managers / extensions
      "data-form-type": "other",
      // Désactive l'autofill heuristique iOS / Chrome Android
      "data-lpignore": "true",
      "data-1p-ignore": "true",
    };
  }

  return {
    autoComplete:
      field === "email"
        ? "email"
        : field === "new-password"
        ? "new-password"
        : "current-password",
    autoCorrect: "off",
    autoCapitalize: "off",
    spellCheck: false,
  };
}
