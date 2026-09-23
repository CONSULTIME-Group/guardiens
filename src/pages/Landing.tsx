import { Suspense, useEffect, useState } from "react";
import franceLocalNational from "@/assets/illustrations/france-local-national-462.avif";
import { useNavigate, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { trackEvent } from "@/lib/analytics";
import { supabase } from "@/integrations/supabase/client";

import PageMeta from "@/components/PageMeta";

import InternationalStrip from "@/components/landing/InternationalStrip";
import { useInternationalSitsCount } from "@/hooks/useInternationalSitsCount";
import { showInternationalSection } from "@/components/landing/internationalPlacement";
import { usePublicStats } from "@/hooks/usePublicStats";
import LiveListingsStrip from "@/components/landing/LiveListingsStrip";

import { UsagesSection } from "@/components/landing/UsagesSection";
import { ServiceAfterServiceSection } from "@/components/landing/ServiceAfterServiceSection";
import { QuickHelpSection } from "@/components/landing/QuickHelpSection";
import { HomeProximitySearch, type HomeOrigin } from "@/components/landing/HomeProximitySearch";
import { LivedItSection } from "@/components/landing/LivedItSection";
import { LandingTocBar } from "@/components/landing/LandingTocBar";
import HomeJsonLd from "@/components/landing/HomeJsonLd";
import { HowItWorksSection } from "@/components/landing/HowItWorksSection";
import { ConfianceSection } from "@/components/landing/ConfianceSection";
import { ComparatifSection } from "@/components/landing/ComparatifSection";
import { NotreHistoireSection } from "@/components/landing/NotreHistoireSection";
import { FaqSection } from "@/components/landing/FaqSection";
import { FinalCtaSection } from "@/components/landing/FinalCtaSection";
import { MidJourneyCta } from "@/components/landing/MidJourneyCta";

import PublicHeader from "@/components/layout/PublicHeader";
import { useShellMode } from "@/components/layout/useShellMode";
import { useAuth } from "@/contexts/AuthContext";
import { lazyWithRetry } from "@/lib/lazyWithRetry";

import RecentSitsItemListJsonLd from "@/components/seo/RecentSitsItemListJsonLd";

// Bloc « Autour de vous » : chargé dynamiquement, sous la ligne de flottaison,
// pour ne jamais toucher au LCP.
const LazyAroundYouSection = lazyWithRetry(
  () => import("@/components/landing/AroundYouSection").then((m) => ({ default: m.LazyAroundYouSection })),
  "landing-around-you",
);

import PublicFooter from "@/components/layout/PublicFooter";
import { staticRoutes, DEFAULT_OG_IMAGE } from "@/data/siteRoutes";
// Pricing pivot : plus d'Offer JSON-LD tant que PRICING_IS_ACTIVE = false.
import { RevealSection } from "@/components/ui/RevealSection";
import { GrainOverlay } from "@/components/ui/GrainOverlay";
import { Button } from "@/components/ui/button";




const HOME_ROUTE = staticRoutes.find((route) => route.path === "/");
const HOME_OG_IMAGE = HOME_ROUTE?.ogImage ?? DEFAULT_OG_IMAGE;












const Landing = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const shellMode = useShellMode();
  const { isAuthenticated } = useAuth();
  // Session vérifiée et profil chargé : on ne propose plus de créer un compte
  // à quelqu'un qui en a déjà un, on propose son action principale.
  const isMember = shellMode === "app";
  const { data: publicStats } = usePublicStats();
  // Sous le seuil, la vitrine internationale vit dans la FAQ.
  const { count: internationalCount } = useInternationalSitsCount();
  const hasInternationalSection = showInternationalSection(internationalCount);
  const [homeOrigin, setHomeOrigin] = useState<HomeOrigin | null>(null);

  

  // OAuth mobile fallback : si Google nous renvoie sur "/" alors qu'un flux
  // OAuth est actif (in-app browser, PWA, broker mobile), on récupère la
  // session puis on file sur /dashboard sans bloquer l'utilisateur sur la home.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const traceRaw = typeof window !== "undefined"
          ? window.sessionStorage.getItem("guardiens.oauth.trace")
          : null;
        if (!traceRaw) return;
        const { data } = await supabase.auth.getSession();
        if (cancelled) return;
        if (data.session?.user) {
          try { window.sessionStorage.removeItem("guardiens.oauth.trace"); } catch {}
          try { window.sessionStorage.removeItem("guardiens.oauth.start"); } catch {}
          navigate("/dashboard", { replace: true });
        }
      } catch {
        // silencieux : on ne casse pas la home pour autant
      }
    })();
    return () => { cancelled = true; };
  }, [navigate]);

  // Bande chiffres sous le hero : quatre compteurs dynamiques. "Maisons
  // gardées" (37) et "animaux accompagnés" (234) additionnent l'historique
  // personnel des fondateurs (raconté dans Notre histoire et la carte
  // piliers) et l'activité réelle de la plateforme. Décision produit
  // confirmée par Jérémie le 03/08/2026 : partir de ce socle vécu et cumuler
  // par-dessus au fur et à mesure que la plateforme grandit. "Inscrits" et
  // "missions d'entraide" restent des compteurs plateforme purs, sans offset.
  // Rétablissement des quatre compteurs le 06/09/2026.
  const FOUNDER_BASE_MAISONS = 37;
  const FOUNDER_BASE_ANIMAUX = 234;
  const kpiMaisons = FOUNDER_BASE_MAISONS + (publicStats?.maisons_gardees ?? 0);
  const kpiAnimaux = FOUNDER_BASE_ANIMAUX + (publicStats?.animaux_accompagnes ?? 0);
  const kpiInscrits = publicStats?.total_inscrits ?? 0;
  const kpiMissions = publicStats?.missions_entraide ?? 0;


 /* ── Idle preload of the France illustration (low priority, post-LCP) ── */
 useEffect(() => {
 if (typeof document === "undefined") return;
 // Already preloaded? skip.
 if (document.querySelector('link[data-preload="france-local-national"]')) return;

 const schedule: (cb: () => void) => number =
 (window as any).requestIdleCallback
 ? (cb) => (window as any).requestIdleCallback(cb, { timeout: 2500 })
 : (cb) => window.setTimeout(cb, 1500);

 const handle = schedule(() => {
 const link = document.createElement("link");
 link.rel = "preload";
 link.as = "image";
 link.href = franceLocalNational;
 link.type = "image/avif";
 // Low priority so it never competes with the hero / LCP resources.
 link.setAttribute("fetchpriority", "low");
 link.dataset.preload = "france-local-national";
 document.head.appendChild(link);
 });

 return () => {
 if ((window as any).cancelIdleCallback && (window as any).requestIdleCallback) {
 (window as any).cancelIdleCallback(handle);
 } else {
 window.clearTimeout(handle);
 }
 };
 }, []);


 return (
 <div className="min-h-screen bg-background text-foreground">
   <PageMeta
        title={t("landing.meta_title")}
        description={t("landing.meta_description")}
 path="/"
 image={HOME_OG_IMAGE}
 />
      <HomeJsonLd />

      {/* ItemList Schema.org des annonces récentes (Helmet, séparé du @graph). */}
      <RecentSitsItemListJsonLd limit={8} />

      {/* ═══════════════ NAVBAR ═══════════════ */}
      <PublicHeader authedVariant />

      {/* ═══════════════ MAIN LANDMARK (englobe tout le contenu) ═══════════════ */}
      <main id="main-content" className="min-w-0">
      {/* ═══════════════ SECTION 1, HERO (épuré, 3 blocs) ═══════════════ */}
      <section className="relative flex min-h-[100svh] w-full items-center overflow-hidden">
        <picture>
          <source
            type="image/avif"
            srcSet="/hero-landing-640.avif 640w, /hero-landing-960.avif 960w, /hero-landing-1280.avif 1280w, /hero-landing-1920.avif 1920w"
            sizes="100vw"
          />
          <source
            type="image/webp"
            srcSet="/hero-landing-640.webp 640w, /hero-landing-960.webp 960w, /hero-landing-1280.webp 1280w, /hero-landing-1920.webp 1920w"
            sizes="100vw"
          />
          <img
            src="/hero-landing.webp"
            alt="Golden retriever assis dans l'herbe d'un jardin ensoleillé, gueule ouverte."
            className="absolute inset-0 w-full h-full object-cover"
            loading="eager"
            {...({ fetchpriority: "high" } as any)}
            width={1920}
            height={1080}
            sizes="100vw"
            decoding="async"
          />
        </picture>
        {/* Voile renforcé sous la colonne (520 px) et qui s'efface vers le
            sujet de la photo : contraste AA sur tous les textes du hero. */}
        <div className="absolute inset-0 bg-hero-overlay" />

        <div className="relative z-10 lp-wide pb-8 pt-20 md:py-24">
          {/* Colonne resserrée à 520 px : la maison et le paysage restent
              visibles à droite. */}
          <div className="max-w-[520px]">

            {/* Une seule star typographique : l'accroche, seule en Playfair. */}
            <h1 className="font-heading text-[32px] sm:text-4xl md:text-5xl lg:text-6xl font-bold text-primary-foreground leading-[1.1] mb-2 md:mb-[18px] text-balance">
              {t("landing.hero.title_main")}
            </h1>

            {/* La ligne qui porte l'ouverture : ce qu'on trouve sans l'avoir
                cherché. Playfair italique, taille intermédiaire entre le
                titre et le paragraphe. */}
            <p className="font-heading italic text-lg md:text-2xl text-primary-foreground/95 leading-snug mb-2 md:mb-[18px] animate-hero-fade-up animation-delay-400">
              {t("landing.hero.motto")}
            </p>

            <p className="font-body text-sm md:text-base text-primary-foreground/85 leading-relaxed mb-3 md:mb-5 animate-hero-fade-up animation-delay-700">
              {t("landing.hero.lede")}
            </p>

            <div className="flex flex-wrap items-center gap-2 animate-hero-fade-up animation-delay-900">
              <Button
                size="lg"
                onClick={() => {
                  void trackEvent("cta_proprio_clicked", { metadata: { location: "hero" } });
                  navigate(isMember ? "/sits/create" : `/inscription?redirect=${encodeURIComponent("/sits/create")}`);
                }}
                className="min-h-12 px-7 text-sm sm:text-base"
              >
                {t("landing.hero.cta_owner")}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  void trackEvent("cta_aid_clicked", { metadata: { location: "hero" } });
                  navigate(isMember ? "/petites-missions/creer" : `/inscription?redirect=${encodeURIComponent("/petites-missions/creer")}`);
                }}
                className="border-primary-foreground/60 bg-transparent text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
              >
                {t("landing.hero.cta_sitter")}
              </Button>
            </div>
            <HomeProximitySearch onLocated={setHomeOrigin} />
            {!isAuthenticated && <Link to="/inscription?role=sitter" className="mt-2 inline-block text-xs text-primary-foreground/90 underline underline-offset-4">Vous voulez garder ? Créez votre profil.</Link>}
          </div>
        </div>
      </section>

       {/* ═══════════════ BANDE CHIFFRES + ENTRAIDE (hors hero, fond crème) ═══════════════
           Quatre compteurs dynamiques dans l'ordre d'origine : maisons
           gardées, animaux accompagnés (socle fondateurs inclus dans les
           deux), inscrits, missions d'entraide. Le lien entraide, sorti du
           hero, vit à droite de cette bande. */}
        {(kpiMaisons > 0 || kpiAnimaux >= 10 || kpiInscrits > 0 || kpiMissions > 0) && (
           <section className="relative overflow-hidden bg-accent border-b border-border/60">
             {/* Grain de papier à 4 % sur le grand aplat crème. */}
             <GrainOverlay />
             <div className="relative lp-wide py-4 md:py-5 flex flex-wrap items-center justify-between gap-x-10 gap-y-3">
              <dl className="flex flex-wrap items-center gap-x-8 md:gap-x-14 gap-y-2">
                {kpiMaisons > 0 && (
                  <div>
                    <dd className="font-heading text-2xl md:text-3xl font-bold text-foreground tabular-nums leading-none">{kpiMaisons}</dd>
                    <dt className="font-body text-[11px] uppercase tracking-[0.16em] text-muted-foreground mt-1">{t("landing.hero.kpi_houses")}</dt>
                  </div>
                )}
                {kpiAnimaux >= 10 && (
                  <div>
                    <dd className="font-heading text-2xl md:text-3xl font-bold text-foreground tabular-nums leading-none">{kpiAnimaux}</dd>
                    <dt className="font-body text-[11px] uppercase tracking-[0.16em] text-muted-foreground mt-1">{t("landing.hero.kpi_animals")}</dt>
                  </div>
                )}
                {kpiInscrits > 0 && (
                  <div>
                    <dd className="font-heading text-2xl md:text-3xl font-bold text-foreground tabular-nums leading-none">{kpiInscrits}</dd>
                    <dt className="font-body text-[11px] uppercase tracking-[0.16em] text-muted-foreground mt-1">{t("landing.hero.kpi_members")}</dt>
                  </div>
                )}
                {kpiMissions > 0 && (
                  <div>
                    <dd className="font-heading text-2xl md:text-3xl font-bold text-foreground tabular-nums leading-none">{kpiMissions}</dd>
                    <dt className="font-body text-[11px] uppercase tracking-[0.16em] text-muted-foreground mt-1">{t("landing.hero.kpi_missions")}</dt>
                  </div>
                )}
              </dl>
             <Link
               to="/petites-missions"
               onClick={() => {
                 trackEvent("cta_aid_clicked", { metadata: { location: "kpi_band" } });
               }}
               className="inline-flex items-center min-h-[44px] font-body text-sm font-medium text-muted-foreground underline underline-offset-4 decoration-border hover:text-foreground hover:decoration-foreground/50 transition-colors"
             >
               {t("landing.hero.cta_aid")}
             </Link>
           </div>
         </section>
       )}

      {/* ═══════════════ ANNONCES DISPONIBLES (preuve vivante, remontée en
          troisième position le 06/09/2026, agrandie à six annonces) ═══════════════ */}
       <LiveListingsStrip origin={homeOrigin} />

      {/* ═══════════════ SOMMAIRE DE PAGE, maillage interne ═══════════════ */}
      <LandingTocBar />


      {/* ═══════════════ LE PRÉTEXTE (bloc sombre signature,
          l'ADN avant les mécaniques) ═══════════════ */}
      <ServiceAfterServiceSection />

      <QuickHelpSection />

      <HowItWorksSection />

      {/* ═══════════════ CONFIANCE & PÉRIMÈTRE
          (accueille désormais la démo du score d'affinité) ═══════════════ */}
      <ConfianceSection />

      {/* ═══════════════ RAPPEL D'ACTION MI-PARCOURS (06/09/2026) ═══════════════ */}
      <MidJourneyCta />

      <Suspense fallback={<div className="border-t border-border bg-muted/20 py-14" aria-hidden="true" />}>
        <LazyAroundYouSection />
      </Suspense>

      {/* ═══════════════ DÉFINITION ET USAGES, bloc de fond ═══════════════ */}
      <UsagesSection />

      <NotreHistoireSection />

      <LivedItSection />

      {/* ═══════════════ SECTION INTERNATIONAL (au-dessus du seuil seulement) ═══════════════ */}
      {hasInternationalSection && (
        <RevealSection>
          <InternationalStrip />
        </RevealSection>
      )}

      {/* ═══════════════ SECTION COMPARATIF (extractible, GEO) ═══════════════ */}
      <ComparatifSection />

      {/* ═══════════════ SECTION 9bis, FAQ (section dédiée, miroir du JSON-LD FAQPage) ═══════════════ */}
      <FaqSection />

      {/* ═══════════════ SECTION 10, CTA FINAL (fusion Fondateur + double CTA) ═══════════════ */}
      <FinalCtaSection />

      </main>

      <PublicFooter />

      {/* Hero animation keyframes */}
      <style>{`
        @keyframes heroFadeUp {
          from { opacity: 0; transform: translate3d(0, 6px, 0); }
          to { opacity: 1; transform: translate3d(0, 0, 0); }
        }
        .animate-hero-fade-up { animation: heroFadeUp 0.55s cubic-bezier(0.22, 1, 0.36, 1) both; }
        .animation-delay-400 { animation-delay: 0.08s; }
        .animation-delay-700 { animation-delay: 0.18s; }
        .animation-delay-900 { animation-delay: 0.28s; }
        @media (prefers-reduced-motion: reduce) {
          .animate-hero-fade-up { animation: none !important; opacity: 1 !important; transform: none !important; }
        }
      `}</style>
 </div>
 );
};

export default Landing;
