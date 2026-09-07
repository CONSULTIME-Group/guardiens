import { useEffect } from "react";
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
import TestimonialsSection from "@/components/landing/TestimonialsSection";
import { PRESS_ARTICLE_URL, PRESS_HIGHLIGHT_UNTIL } from "@/components/shared/PressQuote";
import { LE_PROGRES_LOGO } from "@/assets/pressLogos";

import { UsagesSection } from "@/components/landing/UsagesSection";
import { PretexteSection } from "@/components/landing/PretexteSection";
import HomeJsonLd from "@/components/landing/HomeJsonLd";
import { HowItWorksSection } from "@/components/landing/HowItWorksSection";
import { ConfianceSection } from "@/components/landing/ConfianceSection";
import { ComparatifSection } from "@/components/landing/ComparatifSection";
import { NotreHistoireSection } from "@/components/landing/NotreHistoireSection";
import { GuidesVillesSection } from "@/components/landing/GuidesVillesSection";
import { FaqSection } from "@/components/landing/FaqSection";
import { FinalCtaSection } from "@/components/landing/FinalCtaSection";
import { MidJourneyCta } from "@/components/landing/MidJourneyCta";

import PublicHeader from "@/components/layout/PublicHeader";
import { useShellMode } from "@/components/layout/useShellMode";
import { useAuth } from "@/contexts/AuthContext";

import RecentSitsItemListJsonLd from "@/components/seo/RecentSitsItemListJsonLd";

import PublicFooter from "@/components/layout/PublicFooter";
import { staticRoutes, DEFAULT_OG_IMAGE } from "@/data/siteRoutes";
// Pricing pivot : plus d'Offer JSON-LD tant que PRICING_IS_ACTIVE = false.
import { RevealSection } from "@/components/ui/RevealSection";
import { GrainOverlay } from "@/components/ui/GrainOverlay";




const HOME_ROUTE = staticRoutes.find((route) => route.path === "/");
const HOME_OG_IMAGE = HOME_ROUTE?.ogImage ?? DEFAULT_OG_IMAGE;












const Landing = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const shellMode = useShellMode();
  const { user, activeRole } = useAuth();
  // Session vérifiée et profil chargé : on ne propose plus de créer un compte
  // à quelqu'un qui en a déjà un, on propose son action principale.
  const isMember = shellMode === "app";
  const memberIsOwner = (user?.role === "both" ? activeRole : user?.role) === "owner";
  const { data: publicStats } = usePublicStats();
  // Sous le seuil, la vitrine internationale vit dans la FAQ.
  const { count: internationalCount } = useInternationalSitsCount();
  const hasInternationalSection = showInternationalSection(internationalCount);

  

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
  const isPressHighlighted = new Date() < PRESS_HIGHLIGHT_UNTIL;


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
      <main id="main-content">
      {/* ═══════════════ SECTION 1, HERO (épuré, 3 blocs) ═══════════════ */}
      <section className="relative w-full min-h-[100svh] flex items-center overflow-hidden">
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
        <div className="absolute inset-0 bg-gradient-to-r from-black/95 via-black/75 via-45% to-black/25" />

        <div className="relative z-10 lp-wide py-[52px] md:py-24 pb-[calc(9rem+env(safe-area-inset-bottom))] md:pb-24">
          {/* Colonne resserrée à 520 px : la maison et le paysage restent
              visibles à droite. */}
          <div className="max-w-[520px]">

            <p className="flex items-center gap-2 font-body text-xs text-white/85 tracking-[0.2em] uppercase mb-2 md:mb-[14px]">
              <span className="inline-block w-5 h-0.5 bg-[#9A6A44] align-middle" aria-hidden="true" />
              {t("landing.hero.eyebrow")}
            </p>

            {/* Une seule star typographique : l'accroche, seule en Playfair. */}
            <h1 className="font-heading text-[clamp(26px,8.4vw,38px)] sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-[1.1] mb-[12px] md:mb-[18px] text-balance">
              {t("landing.hero.title_main")}
            </h1>

            {/* La ligne qui porte l'ouverture : ce qu'on trouve sans l'avoir
                cherché. Playfair italique, taille intermédiaire entre le
                titre et le paragraphe. */}
            <p className="font-heading italic text-[clamp(17px,4.8vw,21px)] md:text-2xl text-white/95 leading-snug mb-[12px] md:mb-[18px] animate-hero-fade-up animation-delay-400">
              {t("landing.hero.motto")}
            </p>

            <p className="font-body text-sm md:text-base text-white/80 leading-relaxed mb-[20px] md:mb-[30px] animate-hero-fade-up animation-delay-700">
              {t("landing.hero.lede")}
            </p>

            <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2 sm:gap-3 animate-hero-fade-up animation-delay-900">

              {/* Arbitrage du 16/08/2026 : en session gardien, « Trouver une
                  garde » est promu en action principale et « Proposer un coup
                  de main » redescend en secondaire. États visiteur et
                  propriétaire inchangés, H1 verrouillé sans variante. */}
              <button
                onClick={() => {
                  const sitterSession = isMember && !memberIsOwner;
                  trackEvent(sitterSession ? "cta_sitter_clicked" : "cta_proprio_clicked", { metadata: { location: "hero" } });
                  if (isMember) {
                    navigate(memberIsOwner ? "/sits/create" : "/search");
                    return;
                  }
                  navigate("/inscription?role=owner");
                }}
                style={{ boxShadow: "0 6px 14px rgba(44,109,80,.24)" }}
                className="font-body text-base font-semibold tracking-wide rounded-full px-12 py-4 bg-primary text-primary-foreground hover:brightness-95 hover:scale-[1.03] transition-all duration-200 ring-2 ring-primary-foreground/10"
              >
                {isMember
                  ? memberIsOwner
                    ? t("landing.hero.cta_member_owner", "Publier une annonce")
                    : t("landing.hero.cta_member_search", "Trouver une garde")
                  : t("landing.hero.cta_owner")}
              </button>
              <button
                onClick={() => {
                  const sitterSession = isMember && !memberIsOwner;
                  trackEvent(sitterSession ? "cta_aid_clicked" : "cta_sitter_clicked", { metadata: { location: "hero" } });
                  if (isMember) {
                    navigate(memberIsOwner ? "/search" : "/petites-missions/creer?type=offre");
                    return;
                  }
                  navigate("/inscription?role=sitter");
                }}
                className="font-body text-sm font-medium tracking-wide rounded-full px-7 py-3 bg-transparent text-white border border-white/60 hover:bg-white/10 transition-all duration-200"
              >
                {isMember
                  ? memberIsOwner
                    ? t("landing.hero.cta_member_search", "Trouver une garde")
                    : t("landing.hero.cta_member_sitter", "Proposer un coup de main")
                  : t("landing.hero.cta_sitter")}
              </button>
            </div>

            {/* Réassurance en quatre pastilles : contour fin clair, fond
                légèrement voilé, Outfit 12 px, coins pleinement arrondis.
                La quatrième porte la promesse des guides de race et de ville. */}
            <ul className="flex flex-wrap items-center gap-2 mt-[14px] md:mt-[22px] animate-hero-fade-up animation-delay-1000">
              {(["chip_identity", "chip_reviews", "chip_affinity", "chip_guides"] as const).map((key) => (
                <li
                  key={key}
                  className="inline-flex items-center rounded-full border border-white/55 bg-white/10 px-3 py-1 font-body text-xs text-white/90"
                >
                  {t(`landing.hero.${key}`)}
                </li>
              ))}
            </ul>

            {/* Mention presse : ligne discrète posée sur la photo, sans cadre
                ni fond. Visible uniquement jusqu'à PRESS_HIGHLIGHT_UNTIL,
                ensuite seule la ligne discrète du pied de page subsiste. */}
            {isPressHighlighted && (
              <a
                href={PRESS_ARTICLE_URL}
                target="_blank"
                rel="noopener noreferrer"
                 className="mt-[14px] inline-flex min-h-[44px] items-center gap-2.5 opacity-90 hover:opacity-100 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-black/40 rounded-sm animate-hero-fade-up animation-delay-1100"
              >
                <span className="font-body text-[11px] uppercase tracking-[0.16em] text-white/70">
                  Vu dans
                </span>
                <img
                  src={LE_PROGRES_LOGO}
                  alt="Le Progrès"
                  width={300}
                  height={40}
                  className="h-5 w-auto object-contain opacity-90"
                  loading="lazy"
                  decoding="async"
                />
                <span className="font-body text-xs text-white/70">
                  6 septembre 2026
                </span>
              </a>
            )}
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
      <LiveListingsStrip />

      {/* ═══════════════ SOMMAIRE DE PAGE, maillage interne ═══════════════ */}
      <nav
        aria-label={t("landing.toc.aria")}
        className="border-b border-border/60 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60"
      >
        <div className="lp-wide">
          <ul className="flex items-center gap-1 overflow-x-auto scrollbar-none py-2.5 -mx-2 px-2">
            {(() => {
              const items = [
                { href: "#usages", label: t("landing.toc.care_aid"), mobile: true },
                { href: "#international", label: t("landing.toc.international"), mobile: false, hidden: !hasInternationalSection },
                { href: "#comment-ca-marche", label: t("landing.toc.how"), mobile: false },
                { href: "#entraide", label: t("landing.toc.aid"), mobile: false },
                { href: "#chiffres", label: t("landing.toc.numbers"), mobile: true },
                { href: "#confiance", label: t("landing.toc.trust"), mobile: true },
                { href: "#comparatif", label: t("landing.toc.compare", { defaultValue: "Comparatif" }), mobile: false },
                { href: "#matching", label: t("landing.toc.matching"), mobile: true },
                { href: "#temoignages", label: t("landing.toc.testimonials"), mobile: true },
                { href: "#notre-histoire", label: t("landing.toc.story"), mobile: false },
                { href: "#guides-villes", label: t("landing.toc.cities"), mobile: false },
                { href: "#faq", label: t("landing.toc.faq"), mobile: true },
              ];
              return items.filter((item) => !("hidden" in item) || !item.hidden).map((item) => (
                <li key={item.href} className={item.mobile ? "shrink-0" : "shrink-0 hidden md:list-item"}>
                <a
                  href={item.href}
                  className="inline-flex items-center min-h-[44px] px-3 py-1.5 rounded-full text-[11px] tracking-[0.14em] uppercase font-body text-foreground/75 hover:text-primary hover:bg-primary/5 transition-colors whitespace-nowrap"
                >
                  {item.label}
                </a>
              </li>
              ));
            })()}
          </ul>
        </div>
      </nav>


      {/* ═══════════════ LE PRÉTEXTE (bloc sombre signature,
          l'ADN avant les mécaniques) ═══════════════ */}
      <PretexteSection />

      {/* ═══════════════ CONFIANCE & PÉRIMÈTRE
          (accueille désormais la démo du score d'affinité) ═══════════════ */}
      <ConfianceSection />

      {/* ═══════════════ COMMENT ÇA MARCHE ═══════════════ */}
      <HowItWorksSection />

      {/* ═══════════════ NOTRE HISTOIRE ═══════════════ */}
      <NotreHistoireSection />

      {/* ═══════════════ TÉMOIGNAGES ═══════════════ */}
      <TestimonialsSection />

      {/* ═══════════════ RAPPEL D'ACTION MI-PARCOURS (06/09/2026) ═══════════════ */}
      <MidJourneyCta />

      {/* ═══════════════ DÉFINITION ET USAGES, bloc de fond ═══════════════ */}
      <UsagesSection />

      {/* ═══════════════ SECTION INTERNATIONAL (au-dessus du seuil seulement) ═══════════════ */}
      {hasInternationalSection && (
        <RevealSection>
          <InternationalStrip />
        </RevealSection>
      )}

      {/* ═══════════════ SECTION COMPARATIF (extractible, GEO) ═══════════════ */}
      <ComparatifSection />

      {/* ═══════════════ GUIDES + VILLES + INVENTAIRE ═══════════════ */}
      <GuidesVillesSection />

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
        .animation-delay-1000 { animation-delay: 0.38s; }
        .animation-delay-1100 { animation-delay: 0.48s; }
        @media (prefers-reduced-motion: reduce) {
          .animate-hero-fade-up { animation: none !important; opacity: 1 !important; transform: none !important; }
        }
      `}</style>
 </div>
 );
};

export default Landing;
