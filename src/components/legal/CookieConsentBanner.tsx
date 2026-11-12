import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  getStoredAdsConsent,
  getStoredConsent,
  setStoredConsent,
  shouldShowBanner,
  isBotUserAgent,
} from "@/lib/cookieConsent";

/** Textes du bandeau (lot C1, volet publicitaire ajouté le 31/10/2026). */
export const COOKIE_BANNER_TEXT = {
  title: "Un mot sur les cookies",
  body: "Nous mesurons l'audience du site pour l'améliorer, et l'efficacité de nos publicités, seulement avec votre accord. Les cookies nécessaires au fonctionnement, comme votre connexion, restent actifs.",
  accept: "Tout accepter",
  refuse: "Tout refuser",
  customize: "Personnaliser",
  save: "Enregistrer mon choix",
  analyticsLabel: "Mesure d'audience",
  analyticsText: "Google Analytics compte les visites et les pages vues, pour savoir ce qui vous sert et améliorer le site.",
  adsLabel: "Mesure des publicités",
  adsText: "Google Ads indique quelles publicités ont amené une inscription. Vos données ne servent pas à personnaliser les publicités.",
  necessaryLabel: "Fonctionnement du site",
  necessaryText: "Connexion, sécurité et mémorisation de ce choix. Toujours actifs.",
  more: "Tout savoir sur les cookies",
  // Lot COOK1 (12/11/2026) : bandeau compact, une phrase et trois boutons sur une ligne.
  compactBody: "Nous mesurons l'audience et nos publicités, seulement avec votre accord.",
  compactMore: "En savoir plus",
  regionLabel: "Cookies",
} as const;

/** Trois boutons de même poids : 44 px, même contour, texte sur une ligne à 360 px. */
const COMPACT_BUTTON = "h-11 w-full whitespace-nowrap rounded-full px-1 text-[13px] font-medium";

/**
 * Bandeau de consentement : en bas d'écran, sans voile ni blocage.
 * Trois boutons identiques, aucune case pré-cochée, aucune fermeture valant accord.
 * Deux volets distincts : mesure d'audience et mesure des publicités.
 */
export function CookieConsentBanner() {
  const [open, setOpen] = useState(false);
  const [customizing, setCustomizing] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [ads, setAds] = useState(false);
  const titleRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    setOpen(shouldShowBanner());
    const reopen = () => {
      if (isBotUserAgent()) return;
      setAnalytics(getStoredConsent() === "granted");
      setAds(getStoredAdsConsent() === "granted");
      setCustomizing(true);
      setOpen(true);
      setTimeout(() => titleRef.current?.focus(), 0);
    };
    window.addEventListener("open-cookie-preferences", reopen);
    return () => window.removeEventListener("open-cookie-preferences", reopen);
  }, []);

  if (!open) return null;

  const decide = (grantedAnalytics: boolean, grantedAds: boolean) => {
    setStoredConsent(grantedAnalytics ? "granted" : "denied", grantedAds ? "granted" : "denied");
    setOpen(false);
    setCustomizing(false);
  };

  const t = COOKIE_BANNER_TEXT;

  // Lot COOK1 (12/11/2026) : tant que « Personnaliser » n'est pas ouvert, le
  // bandeau tient en une phrase et trois boutons de même poids sur une ligne.
  // Mesure du 12/11 à 390 x 844 : l'ancien bandeau faisait 344 px (41 % de
  // l'écran) et recouvrait le bouton « Continuer » de l'inscription.
  if (!customizing) {
    return (
      <section
        role="region"
        aria-label={t.regionLabel}
        data-testid="cookie-banner"
        data-compact="true"
        className="fixed inset-x-0 bottom-0 z-[60] px-3 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] animate-fade-in"
      >
        <div className="mx-auto flex max-w-3xl flex-col gap-1.5 rounded-2xl border border-border bg-card p-2.5 text-card-foreground shadow-lg">
          <p className="text-[13px] leading-[18px] text-muted-foreground font-body">
            {t.compactBody}{" "}
            <Link to="/cookies" className="underline underline-offset-2 text-foreground hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm">
              {t.compactMore}
            </Link>
          </p>
          <div className="grid grid-cols-3 gap-2" data-testid="cookie-actions">
            <Button variant="outline" className={COMPACT_BUTTON} onClick={() => decide(true, true)}>{t.accept}</Button>
            <Button variant="outline" className={COMPACT_BUTTON} onClick={() => decide(false, false)}>{t.refuse}</Button>
            <Button
              variant="outline"
              className={COMPACT_BUTTON}
              onClick={() => { setCustomizing(true); setTimeout(() => titleRef.current?.focus(), 0); }}
            >
              {t.customize}
            </Button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section
      role="region"
      aria-labelledby="cookie-banner-title"
      data-testid="cookie-banner"
      className="fixed inset-x-0 bottom-0 z-[60] max-h-[100dvh] overflow-y-auto p-3 sm:p-4 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] animate-fade-in"
    >
      <div className="mx-auto max-w-3xl rounded-2xl border border-border bg-card text-card-foreground shadow-lg p-4 sm:p-5">
        <h2
          id="cookie-banner-title"
          ref={titleRef}
          tabIndex={-1}
          className="font-heading text-lg sm:text-xl font-semibold text-foreground outline-none"
        >
          {t.title}
        </h2>
        <p className="mt-1.5 text-sm text-muted-foreground font-body">
          {t.body}{" "}
          <Link to="/cookies" className="underline underline-offset-2 text-foreground hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm">
            {t.more}
          </Link>
        </p>

        {(
          <div className="mt-4 space-y-3" data-testid="cookie-customize">
            <div className="flex items-start justify-between gap-4 rounded-xl bg-muted/50 p-3">
              <div>
                <p className="text-sm font-medium text-foreground" id="cookie-necessary-label">{t.necessaryLabel}</p>
                <p className="text-xs text-muted-foreground">{t.necessaryText}</p>
              </div>
              <Switch checked disabled aria-labelledby="cookie-necessary-label" />
            </div>
            <div className="flex items-start justify-between gap-4 rounded-xl bg-muted/50 p-3">
              <div>
                <label htmlFor="cookie-analytics" className="text-sm font-medium text-foreground">{t.analyticsLabel}</label>
                <p className="text-xs text-muted-foreground">{t.analyticsText}</p>
              </div>
              <Switch id="cookie-analytics" checked={analytics} onCheckedChange={setAnalytics} />
            </div>
            <div className="flex items-start justify-between gap-4 rounded-xl bg-muted/50 p-3">
              <div>
                <label htmlFor="cookie-ads" className="text-sm font-medium text-foreground">{t.adsLabel}</label>
                <p className="text-xs text-muted-foreground">{t.adsText}</p>
              </div>
              <Switch id="cookie-ads" checked={ads} onCheckedChange={setAds} />
            </div>
          </div>
        )}

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-2" data-testid="cookie-actions">
          <Button variant="outline" className="w-full" onClick={() => decide(true, true)}>{t.accept}</Button>
          <Button variant="outline" className="w-full" onClick={() => decide(false, false)}>{t.refuse}</Button>
          <Button variant="outline" className="w-full" onClick={() => decide(analytics, ads)}>{t.save}</Button>
        </div>
      </div>
    </section>
  );
}

export default CookieConsentBanner;
