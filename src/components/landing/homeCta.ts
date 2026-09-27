/** Destination d'un bouton de la home : un visiteur passe d'abord par l'inscription. */
export const homeCtaTarget = (path: string, isAuthenticated: boolean) =>
  isAuthenticated ? path : `/inscription?redirect=${encodeURIComponent(path)}`;

/** Deux styles de bouton seulement sur la home. */
export const HOME_BTN_PRIMARY = "inline-flex min-h-11 items-center justify-center rounded-full bg-primary px-8 py-3 font-body text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
export const HOME_BTN_SECONDARY = "inline-flex min-h-11 items-center justify-center rounded-full border border-primary px-8 py-3 font-body text-sm font-semibold text-primary transition-colors hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
